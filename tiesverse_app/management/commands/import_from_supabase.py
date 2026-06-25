"""
Backfill the local Django DB from Supabase.

The admin panel reads/writes its own database (routed to turso_db), while the
public sites read Supabase. Seed content that was loaded straight into Supabase
therefore never existed locally, so the admin showed empty lists.

This command pulls each Supabase row into the matching Django model and stamps
the Supabase row's `django_id` with the new PK, so that subsequent admin edits
upsert the SAME row (no duplicates) and deletes remove it cleanly.

Idempotent: a Supabase row whose `django_id` already points to an existing
Django object is skipped.

Usage:
    python manage.py import_from_supabase
    python manage.py import_from_supabase --models events team_members departments
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from tiesverse_app.models import (
    Event, Department, TeamMember, EventSpeaker, EventRegistration,
    TeamMemberSocial, WebinarListing,
)
from tiesverse_app import supabase_sync


# tab/alias name -> (Model, supabase table)
IMPORTABLE = {
    'events':              (Event,             'events'),
    'departments':         (Department,        'articles'),
    'articles':            (Department,        'articles'),
    'team_members':        (TeamMember,        'team_members'),
    'event_speakers':      (EventSpeaker,      'guests'),
    'guests':              (EventSpeaker,      'guests'),
    'event_registrations': (EventRegistration, 'workshops'),
    'workshops':           (EventRegistration, 'workshops'),
    'team_member_socials': (TeamMemberSocial,  'youtube_videos'),
    'youtube_videos':      (TeamMemberSocial,  'youtube_videos'),
    'webinars':            (WebinarListing,    'webinars'),
}

# Default set (deduped by model) when --models is not given.
DEFAULT_KEYS = ['events', 'departments', 'team_members', 'event_speakers',
                'event_registrations', 'team_member_socials', 'webinars']


class Command(BaseCommand):
    help = 'Import seed content from Supabase into the local Django DB.'

    def add_arguments(self, parser):
        parser.add_argument('--models', nargs='+', default=DEFAULT_KEYS,
                            help='Which collections to import (default: all).')

    def handle(self, *args, **opts):
        sb = supabase_sync.get_client()
        if not sb:
            self.stderr.write(self.style.ERROR(
                'Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY missing).'))
            return

        seen_models = set()
        for key in opts['models']:
            entry = IMPORTABLE.get(key)
            if not entry:
                self.stderr.write(self.style.WARNING(f'Unknown collection: {key} (skipped)'))
                continue
            Model, table = entry
            if Model in seen_models:
                continue
            seen_models.add(Model)
            self._import_one(sb, Model, table)

    def _import_one(self, sb, Model, table):
        # Field names are exactly the keys of to_supabase_dict() (1:1 columns).
        field_names = list(Model().to_supabase_dict().keys())

        try:
            rows = sb.table(table).select('*').execute().data or []
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'{table}: fetch failed — {e}'))
            return

        created = skipped = failed = 0
        for row in rows:
            sup_id = row.get('id')
            dj_id = row.get('django_id')

            # Already linked to a live Django object -> nothing to do.
            if dj_id and Model.objects.filter(pk=dj_id).exists():
                skipped += 1
                continue

            kwargs = {f: row[f] for f in field_names if row.get(f) is not None}

            # Department.slug is required + unique; derive one if Supabase lacks it.
            if Model is Department and not kwargs.get('slug'):
                base = slugify(kwargs.get('title') or 'item') or 'item'
                slug, n = base, 2
                while Department.objects.filter(slug=slug).exists():
                    slug, n = f'{base}-{n}', n + 1
                kwargs['slug'] = slug

            try:
                obj = Model.objects.create(**kwargs)
            except Exception as e:
                failed += 1
                self.stderr.write(self.style.WARNING(
                    f'  {table} #{sup_id}: create failed — {e}'))
                continue

            # Link the Supabase row back to the new Django PK.
            try:
                if sup_id is not None:
                    sb.table(table).update({'django_id': obj.pk}).eq('id', sup_id).execute()
            except Exception as e:
                self.stderr.write(self.style.WARNING(
                    f'  {table} #{sup_id}: linked locally but django_id update failed — {e}'))
            created += 1

        self.stdout.write(self.style.SUCCESS(
            f'{Model.__name__:<18} ({table}): {created} imported, {skipped} already linked, {failed} failed'))
