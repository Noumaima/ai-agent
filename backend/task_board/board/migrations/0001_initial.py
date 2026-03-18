import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Agent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("active", "Active"), ("disabled", "Disabled")], default="active", max_length=20)),
                (
                    "agent_type",
                    models.CharField(
                        choices=[("email_assistant", "Email Assistant"), ("general", "General")],
                        default="email_assistant",
                        max_length=30,
                    ),
                ),
                ("model_name", models.CharField(default="openai/gpt-oss-120b:fastest", max_length=120)),
                (
                    "system_prompt",
                    models.TextField(
                        blank=True,
                        default="You are an assistant that writes concise, professional outbound emails.",
                    ),
                ),
                ("default_estimated_seconds", models.PositiveIntegerField(default=300)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="Task",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True)),
                ("priority", models.CharField(choices=[("low", "Low"), ("medium", "Medium"), ("high", "High")], default="medium", max_length=20)),
                ("status", models.CharField(choices=[("backlog", "Backlog"), ("in_progress", "In Progress"), ("done", "Done")], default="backlog", max_length=20)),
                ("position", models.PositiveIntegerField(default=0)),
                ("recipient_email", models.EmailField(blank=True, max_length=254)),
                ("estimated_seconds", models.PositiveIntegerField(default=300)),
                ("actual_seconds", models.PositiveIntegerField(default=0)),
                ("is_periodic", models.BooleanField(default=False)),
                ("schedule_time", models.TimeField(blank=True, null=True)),
                ("last_scheduled_at", models.DateTimeField(blank=True, null=True)),
                ("last_execution_status", models.CharField(blank=True, default="", max_length=20)),
                (
                    "assigned_agent",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="tasks", to="board.agent"),
                ),
            ],
            options={"ordering": ["status", "position", "id"], "unique_together": {("status", "position")}},
        ),
        migrations.CreateModel(
            name="Execution",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("status", models.CharField(choices=[("queued", "Queued"), ("running", "Running"), ("finished", "Finished"), ("failed", "Failed")], default="queued", max_length=20)),
                ("execution_type", models.CharField(choices=[("email_generation", "Email Generation")], default="email_generation", max_length=30)),
                ("queued_at", models.DateTimeField(auto_now_add=True)),
                ("scheduled_for", models.DateTimeField(blank=True, null=True)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("estimated_seconds", models.PositiveIntegerField(default=300)),
                ("actual_seconds", models.PositiveIntegerField(default=0)),
                ("celery_task_id", models.CharField(blank=True, default="", max_length=255)),
                ("input_payload", models.JSONField(blank=True, default=dict)),
                ("output_payload", models.JSONField(blank=True, default=dict)),
                ("error_message", models.TextField(blank=True, default="")),
                ("agent", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="executions", to="board.agent")),
                ("task", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="executions", to="board.task")),
            ],
            options={"ordering": ["-queued_at"]},
        ),
    ]
