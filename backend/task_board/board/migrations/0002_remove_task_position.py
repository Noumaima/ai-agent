from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("board", "0001_initial"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="task",
            options={"ordering": ["status", "id"]},
        ),
        migrations.AlterUniqueTogether(
            name="task",
            unique_together=set(),
        ),
        migrations.RemoveField(
            model_name="task",
            name="position",
        ),
    ]
