import datetime
import json
import logging

from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, DjangoModelPermissions, IsAuthenticated
from rest_framework.response import Response

from .models import WebinarEvent, RegistrationForm, CalendarEvent
from .serializers import WebinarEventSerializer, RegistrationFormSerializer, CalendarEventSerializer
from . import turso_client
from . import razorpay_client
from .ses_email import send_registration_confirmation

logger = logging.getLogger(__name__)


class StaffModelPermissions(DjangoModelPermissions):
    perms_map = {
        'GET': ['%(app_label)s.view_%(model_name)s'],
        'OPTIONS': [], 'HEAD': [],
        'POST': ['%(app_label)s.add_%(model_name)s'],
        'PUT': ['%(app_label)s.change_%(model_name)s'],
        'PATCH': ['%(app_label)s.change_%(model_name)s'],
        'DELETE': ['%(app_label)s.delete_%(model_name)s'],
    }


# ── public registration endpoint ─────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register_for_event(request):
    """
    Public endpoint — no JWT required.
    Accepts: { event_id, event_title, event_type, name, email, phone, city, event_date }
    Saves to Turso, sends SES confirmation email.
    """
    data = request.data
    name = str(data.get('name') or '').strip()
    email = str(data.get('email') or '').strip().lower()
    event_title = str(data.get('event_title') or '').strip()
    event_type = str(data.get('event_type') or 'event').strip()

    if not name or not email or not event_title:
        return Response({'error': 'name, email and event_title are required'}, status=400)

    now = datetime.datetime.utcnow().isoformat()
    event_date = str(data.get('event_date') or '')

    if turso_client.is_configured():
        try:
            turso_client.setup_tables()
            turso_client.execute(
                """INSERT INTO registrations
                   (event_id, event_title, event_type, name, email, phone, city, registered_at)
                   VALUES (:event_id, :event_title, :event_type, :name, :email, :phone, :city, :registered_at)""",
                {
                    'event_id':     str(data.get('event_id') or ''),
                    'event_title':  event_title,
                    'event_type':   event_type,
                    'name':         name,
                    'email':        email,
                    'phone':        str(data.get('phone') or ''),
                    'city':         str(data.get('city') or ''),
                    'registered_at': now,
                },
            )
        except turso_client.TursoError as exc:
            logger.error('Turso registration insert failed: %s', exc)
            return Response({'error': 'Registration could not be saved. Please try again.'}, status=500)

        email_sent = send_registration_confirmation(email, name, event_title, event_type, event_date)

        if email_sent:
            try:
                row_id = turso_client.execute('SELECT last_insert_rowid() AS id')
                if row_id:
                    turso_client.execute(
                        'UPDATE registrations SET email_sent = 1 WHERE id = :id',
                        {'id': row_id[0]['id']},
                    )
            except turso_client.TursoError:
                pass
    else:
        logger.warning('Turso not configured — registration from %s not persisted', email)
        email_sent = send_registration_confirmation(email, name, event_title, event_type, event_date)

    return Response({
        'status': 'registered',
        'email_sent': email_sent,
    })


# ── admin-only registrations list (reads from Turso) ─────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_registrations(request):
    """Returns all registrations from Turso. Admin only (JWT required)."""
    if not turso_client.is_configured():
        return Response({'error': 'Turso not configured', 'rows': []}, status=503)
    try:
        rows = turso_client.execute(
            'SELECT * FROM registrations ORDER BY registered_at DESC LIMIT 500'
        )
        return Response({'rows': rows, 'count': len(rows)})
    except turso_client.TursoError as exc:
        logger.error('list_registrations failed: %s', exc)
        return Response({'error': str(exc), 'rows': []}, status=503)


# ── Django ORM–backed viewsets (webinar events, calendar) ────────────────────

class WebinarEventViewSet(viewsets.ModelViewSet):
    queryset = WebinarEvent.objects.all()
    serializer_class = WebinarEventSerializer
    permission_classes = [IsAuthenticated, StaffModelPermissions]

    @action(detail=True, methods=['post'], url_path='calendar-sync')
    def calendar_sync(self, request, pk=None):
        webinar = self.get_object()
        CalendarEvent.objects.update_or_create(
            webinar=webinar,
            defaults={'calendar_id': f'cal_{webinar.id}', 'sync_status': True},
        )
        return Response({'status': 'Synced with calendar'})


class CalendarEventViewSet(viewsets.ModelViewSet):
    queryset = CalendarEvent.objects.all()
    serializer_class = CalendarEventSerializer
    permission_classes = [IsAuthenticated, StaffModelPermissions]


# ── Razorpay: create order ─────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def create_payment_order(request):
    """
    Step 1 of paid registration.
    Called when the event has a price > 0.
    Returns a Razorpay order_id the frontend uses to open the checkout modal.
    """
    if not razorpay_client.is_configured():
        return Response({'error': 'Payment system not configured.'}, status=503)

    data = request.data
    event_id    = str(data.get('event_id') or '')
    event_title = str(data.get('event_title') or '').strip()
    amount_inr  = float(data.get('amount') or 0)
    name        = str(data.get('name') or '').strip()
    email       = str(data.get('email') or '').strip()

    if not event_title or not email or amount_inr <= 0:
        return Response({'error': 'event_title, email and amount are required.'}, status=400)

    try:
        order = razorpay_client.create_order(
            amount_inr=amount_inr,
            receipt=f'tvev-{event_id[:20]}-{email[:15]}',
            notes={'event': event_title, 'email': email, 'name': name},
        )
    except Exception as exc:
        logger.error('Razorpay create_order failed: %s', exc)
        return Response({'error': 'Could not create payment order.'}, status=500)

    # Save a pending row to Turso so we can match it on verification
    now = datetime.datetime.utcnow().isoformat()
    if turso_client.is_configured():
        try:
            turso_client.execute(
                """INSERT INTO registrations
                   (event_id, event_title, event_type, name, email,
                    phone, city, registered_at,
                    payment_required, amount, razorpay_order_id, payment_status)
                   VALUES (:event_id,:event_title,:event_type,:name,:email,
                           :phone,:city,:registered_at,
                           1,:amount,:razorpay_order_id,'pending')""",
                {
                    'event_id':          event_id,
                    'event_title':       event_title,
                    'event_type':        str(data.get('event_type') or 'event'),
                    'name':              name,
                    'email':             email,
                    'phone':             str(data.get('phone') or ''),
                    'city':              str(data.get('city') or ''),
                    'registered_at':     now,
                    'amount':            int(round(amount_inr * 100)),
                    'razorpay_order_id': order['order_id'],
                },
            )
        except turso_client.TursoError as exc:
            logger.warning('Turso pending row insert failed: %s', exc)

    return Response(order)


# ── Razorpay: verify payment ───────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_payment(request):
    """
    Step 2 of paid registration.
    Called by the frontend after the Razorpay checkout modal succeeds.
    Verifies HMAC signature, marks the registration paid, sends confirmation email.
    """
    data               = request.data
    razorpay_order_id  = str(data.get('razorpay_order_id') or '')
    razorpay_payment_id = str(data.get('razorpay_payment_id') or '')
    razorpay_signature = str(data.get('razorpay_signature') or '')

    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        return Response({'error': 'Missing payment verification fields.'}, status=400)

    if not razorpay_client.verify_payment_signature(
        razorpay_order_id, razorpay_payment_id, razorpay_signature
    ):
        logger.warning('Razorpay signature mismatch for order %s', razorpay_order_id)
        return Response({'error': 'Payment verification failed.'}, status=400)

    # Mark paid in Turso and fetch the row for the email
    row = None
    if turso_client.is_configured():
        try:
            turso_client.execute(
                """UPDATE registrations
                   SET payment_status='paid', razorpay_payment_id=:pid
                   WHERE razorpay_order_id=:oid""",
                {'pid': razorpay_payment_id, 'oid': razorpay_order_id},
            )
            rows = turso_client.execute(
                'SELECT * FROM registrations WHERE razorpay_order_id=:oid LIMIT 1',
                {'oid': razorpay_order_id},
            )
            row = rows[0] if rows else None
        except turso_client.TursoError as exc:
            logger.warning('Turso payment update failed: %s', exc)

    email_sent = False
    if row:
        email_sent = send_registration_confirmation(
            to_email=row.get('email', ''),
            name=row.get('name', 'Guest'),
            event_title=row.get('event_title', ''),
            event_type=row.get('event_type', 'event'),
        )
        if email_sent and turso_client.is_configured():
            try:
                turso_client.execute(
                    'UPDATE registrations SET email_sent=1 WHERE razorpay_order_id=:oid',
                    {'oid': razorpay_order_id},
                )
            except turso_client.TursoError:
                pass

    return Response({'status': 'paid', 'email_sent': email_sent})


# ── Razorpay: webhook ──────────────────────────────────────────────────────────
@csrf_exempt
def razorpay_webhook(request):
    """
    Receives Razorpay server-side webhooks (payment.captured, payment.failed, etc.).
    Configure the webhook URL in the Razorpay dashboard:
      https://yourdomain/api/webinar/razorpay-webhook/
    """
    from django.http import HttpResponse, HttpResponseForbidden

    if request.method != 'POST':
        return HttpResponse(status=405)

    sig = request.META.get('HTTP_X_RAZORPAY_SIGNATURE', '')
    if not razorpay_client.verify_webhook_signature(request.body, sig):
        return HttpResponseForbidden('Invalid signature')

    try:
        payload = json.loads(request.body.decode())
    except (json.JSONDecodeError, UnicodeDecodeError):
        return HttpResponse('Bad JSON', status=400)

    event   = payload.get('event', '')
    entity  = payload.get('payload', {}).get('payment', {}).get('entity', {})
    order_id   = entity.get('order_id', '')
    payment_id = entity.get('id', '')

    if event == 'payment.captured' and order_id and turso_client.is_configured():
        try:
            turso_client.execute(
                """UPDATE registrations
                   SET payment_status='paid', razorpay_payment_id=:pid
                   WHERE razorpay_order_id=:oid AND payment_status != 'paid'""",
                {'pid': payment_id, 'oid': order_id},
            )
            logger.info('Webhook: marked order %s as paid', order_id)
        except turso_client.TursoError as exc:
            logger.warning('Webhook Turso update failed: %s', exc)

    elif event == 'payment.failed' and order_id and turso_client.is_configured():
        try:
            turso_client.execute(
                "UPDATE registrations SET payment_status='failed' WHERE razorpay_order_id=:oid",
                {'oid': order_id},
            )
        except turso_client.TursoError:
            pass

    return HttpResponse('ok')
