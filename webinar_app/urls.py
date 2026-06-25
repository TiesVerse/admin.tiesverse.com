from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WebinarEventViewSet, CalendarEventViewSet,
    register_for_event, list_registrations,
    create_payment_order, verify_payment, razorpay_webhook,
)

router = DefaultRouter()
router.register(r'events', WebinarEventViewSet)
router.register(r'calendar-events', CalendarEventViewSet)

urlpatterns = [
    # Free registration
    path('register/', register_for_event, name='webinar-register'),
    path('registrations/', list_registrations, name='webinar-registrations'),
    # Paid registration (Razorpay)
    path('create-order/', create_payment_order, name='webinar-create-order'),
    path('verify-payment/', verify_payment, name='webinar-verify-payment'),
    path('razorpay-webhook/', razorpay_webhook, name='razorpay-webhook'),
    path('', include(router.urls)),
]
