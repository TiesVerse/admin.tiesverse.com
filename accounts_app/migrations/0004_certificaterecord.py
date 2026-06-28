from django.db import migrations, models
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ('accounts_app', '0003_update_default_dashboard_theme'),
    ]

    operations = [
        migrations.CreateModel(
            name='CertificateRecord',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('certificate_id', models.CharField(max_length=80, unique=True)),
                ('source_type', models.CharField(choices=[('webinar', 'Webinar certificate'), ('offer', 'Offer letter'), ('manual', 'Manual')], max_length=20)),
                ('source_ref', models.CharField(max_length=255)),
                ('person_name', models.CharField(max_length=255)),
                ('person_email', models.EmailField(blank=True, max_length=254)),
                ('subject_title', models.CharField(max_length=255)),
                ('template_id', models.CharField(max_length=80)),
                ('template_name', models.CharField(max_length=255)),
                ('data_json', models.JSONField(default=dict)),
                ('email_status', models.CharField(default='not_sent', max_length=30)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'certificate_records',
                'ordering': ['-created_at'],
                'unique_together': {('source_type', 'source_ref', 'template_id')},
            },
        ),
    ]
