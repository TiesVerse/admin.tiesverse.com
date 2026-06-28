from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('accounts_app', '0002_alter_userprofile_session_timeout'),
    ]

    operations = [
        migrations.AlterField(
            model_name='userprofile',
            name='theme',
            field=models.CharField(default='light', max_length=50),
        ),
        migrations.AlterField(
            model_name='userprofile',
            name='accent_color',
            field=models.CharField(default='#3525CD', max_length=50),
        ),
    ]
