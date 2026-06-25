from django.db import models


class Event(models.Model):
    CATEGORY_CHOICES = [
        ('Summit', 'Summit'), ('Salon', 'Salon'), ('Meetup', 'Meetup'),
        ('Workshop', 'Workshop'), ('Roundtable', 'Roundtable'), ('Other', 'Other'),
    ]
    title        = models.CharField(max_length=255)
    category     = models.CharField(max_length=50, choices=CATEGORY_CHOICES, blank=True)
    city         = models.CharField(max_length=100, blank=True)
    venue        = models.CharField(max_length=255, blank=True)
    date         = models.CharField(max_length=50)   # "Jun 28, 2026"
    time         = models.CharField(max_length=50, blank=True)
    host         = models.CharField(max_length=255, blank=True)
    price        = models.IntegerField(default=0)
    orig_price   = models.IntegerField(null=True, blank=True)
    capacity     = models.IntegerField(null=True, blank=True)
    attended     = models.CharField(max_length=100, blank=True)
    note         = models.TextField(blank=True)
    flagship     = models.BooleanField(default=False)
    past         = models.BooleanField(default=False)
    cover_url    = models.URLField(blank=True)
    register_url = models.URLField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    def to_supabase_dict(self):
        return {
            'title': self.title, 'category': self.category, 'city': self.city,
            'venue': self.venue, 'date': self.date, 'time': self.time,
            'host': self.host, 'price': self.price,
            'orig_price': self.orig_price, 'capacity': self.capacity,
            'attended': self.attended or None, 'note': self.note or None,
            'flagship': self.flagship, 'past': self.past,
            'cover_url': self.cover_url or None, 'register_url': self.register_url or None,
        }


class Article(models.Model):
    KIND_CHOICES = [
        ('Article', 'Article'), ('Report', 'Report'),
        ('Brief', 'Brief'), ('Analysis', 'Analysis'),
    ]
    slug       = models.SlugField(max_length=255, unique=True)
    title      = models.CharField(max_length=255)
    dek        = models.TextField(blank=True)
    cat        = models.CharField(max_length=100, blank=True)   # short label
    topic      = models.CharField(max_length=100, blank=True)   # filter group
    kind       = models.CharField(max_length=20, choices=KIND_CHOICES, default='Article')
    date       = models.CharField(max_length=50, blank=True)
    read_time  = models.CharField(max_length=30, blank=True)
    cover_url  = models.CharField(max_length=500)
    featured   = models.BooleanField(default=False)
    published  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    def to_supabase_dict(self):
        return {
            'slug': self.slug, 'title': self.title, 'dek': self.dek or None,
            'cat': self.cat or None, 'topic': self.topic or None,
            'kind': self.kind, 'date': self.date or None,
            'read_time': self.read_time or None, 'cover_url': self.cover_url,
            'featured': self.featured, 'published': self.published,
        }


class YouTubeVideo(models.Model):
    title        = models.CharField(max_length=255)
    video_id     = models.CharField(max_length=20)   # YouTube video ID only
    thumbnail_url = models.URLField(blank=True)
    published_at = models.CharField(max_length=50, blank=True)
    category     = models.CharField(max_length=100, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    def to_supabase_dict(self):
        return {
            'title': self.title, 'video_id': self.video_id,
            'thumbnail_url': self.thumbnail_url or None,
            'published_at': self.published_at or None,
            'category': self.category or None,
        }


class Workshop(models.Model):
    STATUS_CHOICES = [('upcoming', 'Upcoming'), ('past', 'Past')]
    title        = models.CharField(max_length=255)
    description  = models.TextField(blank=True)
    date         = models.CharField(max_length=50, blank=True)
    time_tz      = models.CharField(max_length=50, blank=True)
    host         = models.CharField(max_length=255, blank=True)
    cover_url    = models.URLField(blank=True)
    register_url = models.URLField(blank=True)
    status       = models.CharField(max_length=10, choices=STATUS_CHOICES, default='upcoming')
    created_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    def to_supabase_dict(self):
        return {
            'title': self.title, 'description': self.description or None,
            'date': self.date or None, 'time_tz': self.time_tz or None,
            'host': self.host or None, 'cover_url': self.cover_url or None,
            'register_url': self.register_url or None, 'status': self.status,
        }


class TeamMember(models.Model):
    name          = models.CharField(max_length=255)
    role          = models.CharField(max_length=255)
    bio           = models.TextField(blank=True)
    photo_url     = models.URLField(blank=True)
    department    = models.CharField(max_length=100, blank=True)
    is_founder    = models.BooleanField(default=False)
    display_order = models.IntegerField(default=0)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['display_order']

    def __str__(self):
        return self.name

    def to_supabase_dict(self):
        return {
            'name': self.name, 'role': self.role, 'bio': self.bio or None,
            'photo_url': self.photo_url or None, 'department': self.department or None,
            'is_founder': self.is_founder, 'display_order': self.display_order,
        }


class Guest(models.Model):
    name       = models.CharField(max_length=255)
    role       = models.CharField(max_length=255)
    org        = models.CharField(max_length=255, blank=True)
    photo_url  = models.URLField(blank=True)
    quote      = models.TextField(blank=True)
    featured   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    def to_supabase_dict(self):
        return {
            'name': self.name, 'role': self.role, 'org': self.org or None,
            'photo_url': self.photo_url or None, 'quote': self.quote or None,
            'featured': self.featured,
        }
