from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tiesverse_app', '0002_webinarlisting_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='eventregistration',
            name='host_image_url',
            field=models.URLField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name='eventregistration',
            name='kind',
            field=models.CharField(
                choices=[('webinar', 'Webinar'), ('workshop', 'Workshop')],
                default='workshop',
                max_length=20,
            ),
        ),
    ]
