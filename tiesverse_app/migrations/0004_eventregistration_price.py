from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tiesverse_app', '0003_eventregistration_host_image_and_kind'),
    ]

    operations = [
        migrations.AddField(
            model_name='eventregistration',
            name='price',
            field=models.PositiveIntegerField(default=0),
        ),
    ]
