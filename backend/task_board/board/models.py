import uuid

from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Agent(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        DISABLED = "disabled", "Disabled"

    class AgentType(models.TextChoices):
        EMAIL_ASSISTANT = "email_assistant", "Email Assistant"
        GENERAL = "general", "General"

    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    agent_type = models.CharField(max_length=30, choices=AgentType.choices, default=AgentType.EMAIL_ASSISTANT)
    model_name = models.CharField(max_length=120, default="openai/gpt-oss-120b:fastest")
    system_prompt = models.TextField(
        blank=True,
        default="You are an assistant that writes concise, professional outbound emails.",
    )
    default_estimated_seconds = models.PositiveIntegerField(default=300)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Task(TimeStampedModel):
    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class Status(models.TextChoices):
        BACKLOG = "backlog", "Backlog"
        IN_PROGRESS = "in_progress", "In Progress"
        DONE = "done", "Done"

    assigned_agent = models.ForeignKey(
        Agent,
        on_delete=models.SET_NULL,
        related_name="tasks",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.BACKLOG)
    recipient_email = models.EmailField(blank=True)
    estimated_seconds = models.PositiveIntegerField(default=300)
    actual_seconds = models.PositiveIntegerField(default=0)
    is_periodic = models.BooleanField(default=False)
    schedule_time = models.TimeField(null=True, blank=True)
    last_scheduled_at = models.DateTimeField(null=True, blank=True)
    last_execution_status = models.CharField(max_length=20, blank=True, default="")

    class Meta:
        ordering = ["status", "id"]

    def __str__(self) -> str:
        return self.title


class Execution(TimeStampedModel):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        FINISHED = "finished", "Finished"
        FAILED = "failed", "Failed"

    class ExecutionType(models.TextChoices):
        EMAIL_GENERATION = "email_generation", "Email Generation"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="executions")
    agent = models.ForeignKey(Agent, on_delete=models.PROTECT, related_name="executions")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED)
    execution_type = models.CharField(max_length=30, choices=ExecutionType.choices, default=ExecutionType.EMAIL_GENERATION)
    queued_at = models.DateTimeField(auto_now_add=True)
    scheduled_for = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    estimated_seconds = models.PositiveIntegerField(default=300)
    actual_seconds = models.PositiveIntegerField(default=0)
    celery_task_id = models.CharField(max_length=255, blank=True, default="")
    input_payload = models.JSONField(default=dict, blank=True)
    output_payload = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-queued_at"]

    def __str__(self) -> str:
        return f"{self.task.title} - {self.status}"
