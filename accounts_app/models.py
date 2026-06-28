from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
import uuid

class Setting(models.Model):
    key = models.CharField(max_length=255, unique=True, primary_key=True)
    value = models.CharField(max_length=255)

    class Meta:
        db_table = 'site_settings'

    def __str__(self):
        return f"{self.key}: {self.value}"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    display_name = models.CharField(max_length=255, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    weekly_reports = models.BooleanField(default=True)
    two_factor_enabled = models.BooleanField(default=False)
    session_timeout = models.IntegerField(default=10)  # minutes of inactivity before auto-logout
    theme = models.CharField(max_length=50, default='light')
    accent_color = models.CharField(max_length=50, default='#3525CD')

    def __str__(self):
        return f"{self.user.username}'s Profile"


class CertificateRecord(models.Model):
    SOURCE_CHOICES = [
        ('webinar', 'Webinar certificate'),
        ('offer', 'Offer letter'),
        ('manual', 'Manual'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    certificate_id = models.CharField(max_length=80, unique=True)
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    source_ref = models.CharField(max_length=255)
    person_name = models.CharField(max_length=255)
    person_email = models.EmailField(blank=True)
    subject_title = models.CharField(max_length=255)
    template_id = models.CharField(max_length=80)
    template_name = models.CharField(max_length=255)
    data_json = models.JSONField(default=dict)
    email_status = models.CharField(max_length=30, default='not_sent')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'certificate_records'
        ordering = ['-created_at']
        unique_together = [('source_type', 'source_ref', 'template_id')]

    def __str__(self):
        return f"{self.certificate_id} — {self.person_name}"


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
    else:
        # Check if profile exists before saving (for users created before this model)
        if not hasattr(instance, 'profile'):
            UserProfile.objects.create(user=instance)
        else:
            instance.profile.save()
