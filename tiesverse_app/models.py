import uuid
from django.db import models
from django.utils.text import slugify


class Event(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.TextField()
    date = models.TextField(blank=True, null=True)
    time = models.TextField(blank=True, null=True)
    location = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    image_url = models.TextField(blank=True, null=True)
    form_link = models.TextField(blank=True, null=True)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    type = models.TextField(blank=True, null=True)
    status = models.TextField(default='REGISTRATION OPEN', blank=True, null=True)

    class Meta:
        db_table = 'events'

    def __str__(self):
        return self.title

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
        db_table = 'articles'

    def __str__(self):
        return self.title

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
        db_table = 'youtube_videos'

    def __str__(self):
        return self.title or "Untitled Video"

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
    image_url = models.TextField(blank=True, null=True)
    date = models.TextField(blank=True, null=True)
    time = models.TextField(blank=True, null=True)
    location = models.TextField(blank=True, null=True)
    form_link = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, blank=True, null=True)
    register_link = models.TextField(blank=True, null=True)
    event_id = models.UUIDField(blank=True, null=True)

    class Meta:
        db_table = 'workshops'

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
        db_table = 'guests'

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
        db_table = 'webinars'

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
