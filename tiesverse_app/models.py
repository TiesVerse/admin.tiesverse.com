from django.db import models
from django.utils.text import slugify


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'departments'

    def __str__(self):
        return self.name

    def to_supabase_dict(self):
        status = self.status or 'upcoming'
        if status.upper() in ('REGISTRATION OPEN', 'OPEN'):
            status = 'upcoming'
        elif status.upper() in ('CLOSED', 'PAST', 'COMPLETED'):
            status = 'past'
        return {
            'title':         self.title,
            'date':          self.date,
            'time_tz':       self.time,
            'location':      self.location,
            'description':   self.description,
            'cover_url':     self.image_url,
            'register_link': self.form_link,
            'featured':      bool(self.is_featured),
            'kind':          self.type or 'summit',
            'status':        status,
        }


class Article(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.TextField()
    excerpt = models.TextField(blank=True, null=True)
    category = models.TextField(blank=True, null=True)
    type = models.TextField(blank=True, null=True)
    display_id = models.TextField(blank=True, null=True)
    image_url = models.TextField(blank=True, null=True)
    redirect_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    date = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'team_members'

    def __str__(self):
        return self.name

    def to_supabase_dict(self):
        slug = self.display_id or slugify(self.title) or str(self.pk)
        return {
            'title':     self.title,
            'slug':      slug,
            'dek':       self.excerpt,
            'topic':     self.category,
            'kind':      self.type or 'Article',
            'cover_url': self.image_url,
            'date':      self.date,
            'published': True,
        }


class YouTubeVideo(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.TextField(blank=True, null=True)
    video_id = models.TextField(blank=True, null=True)
    thumbnail_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    category = models.TextField(blank=True, null=True)
    episode_id = models.TextField(blank=True, null=True)
    video_url = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'team_member_socials'
        constraints = [
            models.UniqueConstraint(fields=['team_member', 'platform'], name='unique_team_member_platform')
        ]

    def __str__(self):
        return f"{self.team_member.name} - {self.platform}"

    def to_supabase_dict(self):
        return {
            'title':         self.title,
            'video_id':      self.video_id,
            'thumbnail_url': self.thumbnail_url,
            'channel_id':    self.category,
        }


class Workshop(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.TextField()
    category = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')
    cover_image_url = models.CharField(max_length=500, blank=True, null=True)
    venue_name = models.CharField(max_length=255, blank=True, null=True)
    venue_address = models.TextField(blank=True, null=True)
    meeting_link = models.CharField(max_length=500, blank=True, null=True)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField(blank=True, null=True)
    registration_deadline = models.DateTimeField(blank=True, null=True)
    capacity = models.IntegerField(blank=True, null=True)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'events'

    def __str__(self):
        return self.title

    def to_supabase_dict(self):
        return {
            'title':         self.title,
            'description':   self.description,
            'date':          self.date,
            'time_tz':       self.time,
            'location':      self.location,
            'register_link': self.register_link or self.form_link,
            'kind':          self.category or 'workshop',
        }


class TeamMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.TextField()
    role = models.TextField(blank=True, null=True)
    image_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)

    class Meta:
        db_table = 'team_members'

    def __str__(self):
        return self.name

    def to_supabase_dict(self):
        return {
            'name':      self.name,
            'role':      self.role,
            'photo_url': self.image_url,
        }


class Guest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.TextField()
    role = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    image_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)

    class Meta:
        db_table = 'event_speakers'

    def __str__(self):
        return self.name

    def to_supabase_dict(self):
        return {
            'name':      self.name,
            'role':      self.role,
            'org':       self.description,
            'photo_url': self.image_url,
        }


class WebinarListing(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.TextField()
    speaker = models.TextField(blank=True, null=True)
    date = models.TextField(blank=True, null=True)
    registration_link = models.TextField(blank=True, null=True)
    status = models.TextField(default='upcoming', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)

    class Meta:
        db_table = 'event_registrations'
        constraints = [
            models.UniqueConstraint(fields=['event', 'email'], name='unique_event_email_registration')
        ]

    def __str__(self):
        return self.title

    def to_supabase_dict(self):
        return {
            'title':             self.title,
            'speaker':           self.speaker,
            'date':              self.date,
            'registration_link': self.registration_link,
            'status':            self.status or 'upcoming',
        }
