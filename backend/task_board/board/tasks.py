import json
from datetime import datetime

import requests
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .models import Agent, Execution, Task
from .services import update_task_actual_duration


def build_email_prompt(execution: Execution) -> str:
    task = execution.task
    return (
        "Write a concise, professional email for the following task.\n"
        f"Task title: {task.title}\n"
        f"Task description: {task.description}\n"
        f"Recipient email: {task.recipient_email or 'not provided'}\n"
        "Return the response in JSON with keys subject and body."
    )


def parse_email_response(payload: dict) -> tuple[str, str]:
    content = payload["choices"][0]["message"]["content"]
    try:
        parsed = json.loads(content)
        return parsed.get("subject", "Task Update"), parsed.get("body", content)
    except json.JSONDecodeError:
        lines = [line.strip() for line in content.splitlines() if line.strip()]
        subject = "Task Update"
        body = content
        if lines and lines[0].lower().startswith("subject:"):
            subject = lines[0].split(":", 1)[1].strip() or subject
            body = "\n".join(lines[1:]).strip() or body
        return subject, body


def send_failure_notification(execution: Execution, error_message: str) -> tuple[bool, str]:
    notification_email = settings.EMAIL_HOST_USER or settings.DEFAULT_FROM_EMAIL
    if not notification_email:
        return False, ""

    send_mail(
        subject=f"Execution failed for task: {execution.task.title}",
        message=(
            "An agent execution failed.\n\n"
            f"Execution ID: {execution.id}\n"
            f"Task: {execution.task.title}\n"
            f"Agent: {execution.agent.name}\n"
            f"Recipient: {execution.task.recipient_email or 'not provided'}\n"
            f"Scheduled for: {execution.scheduled_for.isoformat() if execution.scheduled_for else 'immediate'}\n"
            f"Error: {error_message}\n"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[notification_email],
        fail_silently=False,
    )
    return True, notification_email


def move_task_to_done(execution: Execution) -> None:
    execution.task.status = Task.Status.DONE
    execution.task.last_execution_status = Execution.Status.FINISHED
    execution.task.save(update_fields=["status", "last_execution_status", "updated_at"])


@shared_task(queue="agent_execution")
def schedule_periodic_tasks() -> int:
    now = timezone.localtime()
    current_time = now.time().replace(second=0, microsecond=0)
    current_date = now.date()

    periodic_ids = list(
        Task.objects.filter(
            is_periodic=True,
            schedule_time__isnull=False,
            assigned_agent__isnull=False,
            assigned_agent__status=Agent.Status.ACTIVE,
            schedule_time__hour=current_time.hour,
            schedule_time__minute=current_time.minute,
        ).values_list("id", flat=True)
    )

    created = 0
    for task_id in periodic_ids:
        with transaction.atomic():
            task = (
                Task.objects.select_for_update()
                .get(pk=task_id)
            )
            if task.last_scheduled_at and timezone.localtime(task.last_scheduled_at).date() == current_date:
                continue

            scheduled_for = timezone.make_aware(
                datetime.combine(current_date, task.schedule_time),
                timezone.get_current_timezone(),
            )
            Execution.objects.create(
                task=task,
                agent=task.assigned_agent,
                estimated_seconds=task.estimated_seconds or task.assigned_agent.default_estimated_seconds,
                scheduled_for=scheduled_for,
                input_payload={"source": "periodic_schedule"},
            )
            task.last_scheduled_at = now
            task.save(update_fields=["last_scheduled_at", "updated_at"])
            created += 1

    return created


@shared_task(queue="agent_execution")
def dispatch_due_executions() -> int:
    due_ids = list(
        Execution.objects.filter(
            status=Execution.Status.QUEUED,
            scheduled_for__isnull=False,
            scheduled_for__lte=timezone.now(),
            celery_task_id="",
        )
        .order_by("scheduled_for")
        .values_list("id", flat=True)
    )

    dispatched = 0
    for execution_id in due_ids:
        with transaction.atomic():
            execution = (
                Execution.objects.select_for_update()
                .select_related("task", "agent")
                .get(pk=execution_id)
            )
            if execution.celery_task_id or execution.status != Execution.Status.QUEUED:
                continue
            async_result = run_agent_execution.apply_async(
                args=[str(execution.id)],
                priority=5,
                queue="agent_execution",
            )
            execution.celery_task_id = async_result.id
            execution.save(update_fields=["celery_task_id", "updated_at"])
            dispatched += 1

    return dispatched


@shared_task(bind=True, queue="agent_execution")
def run_agent_execution(self, execution_id: str) -> dict:
    execution = Execution.objects.select_related("task", "agent").get(pk=execution_id)
    execution.status = Execution.Status.RUNNING
    execution.started_at = timezone.now()
    execution.error_message = ""
    execution.celery_task_id = self.request.id or execution.celery_task_id
    execution.save(update_fields=["status", "started_at", "error_message", "celery_task_id", "updated_at"])

    execution.task.last_execution_status = Execution.Status.RUNNING
    execution.task.save(update_fields=["last_execution_status", "updated_at"])

    try:
        if not settings.HF_TOKEN:
            raise RuntimeError("HF_TOKEN is not configured.")

        response = requests.post(
            "https://router.huggingface.co/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.HF_TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "model": execution.agent.model_name or settings.HF_MODEL_ID,
                "messages": [
                    {"role": "system", "content": execution.agent.system_prompt or "You write professional emails."},
                    {"role": "user", "content": build_email_prompt(execution)},
                ],
                "temperature": 0.2,
            },
            timeout=90,
        )
        response.raise_for_status()
        subject, body = parse_email_response(response.json())

        email_sent = False
        if settings.SEND_EMAILS and execution.task.recipient_email:
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[execution.task.recipient_email],
                fail_silently=False,
            )
            email_sent = True

        execution.output_payload = {
            "subject": subject,
            "body": body,
            "recipient_email": execution.task.recipient_email,
            "email_sent": email_sent,
        }
        execution.finished_at = timezone.now()
        execution.actual_seconds = max(int((execution.finished_at - execution.started_at).total_seconds()), 0)
        execution.status = Execution.Status.FINISHED
        execution.error_message = ""
        execution.save(
            update_fields=[
                "output_payload",
                "finished_at",
                "actual_seconds",
                "status",
                "error_message",
                "updated_at",
            ]
        )

        execution.task.last_execution_status = Execution.Status.FINISHED
        execution.task.save(update_fields=["last_execution_status", "updated_at"])
        update_task_actual_duration(execution.task)
        move_task_to_done(execution)
        return execution.output_payload
    except Exception as exc:
        error_message = str(exc)
        failure_notification_sent = False
        failure_notification_recipient = ""
        failure_notification_error = ""

        try:
            failure_notification_sent, failure_notification_recipient = send_failure_notification(
                execution, error_message
            )
        except Exception as notification_exc:
            failure_notification_error = str(notification_exc)

        execution.finished_at = timezone.now()
        execution.actual_seconds = max(int((execution.finished_at - execution.started_at).total_seconds()), 0)
        execution.status = Execution.Status.FAILED
        execution.error_message = error_message
        execution.output_payload = {
            "status": Execution.Status.FAILED,
            "error": error_message,
            "failure_notification_sent": failure_notification_sent,
            "failure_notification_recipient": failure_notification_recipient,
            "failure_notification_error": failure_notification_error,
        }
        execution.save(
            update_fields=[
                "finished_at",
                "actual_seconds",
                "status",
                "error_message",
                "output_payload",
                "updated_at",
            ]
        )
        execution.task.last_execution_status = Execution.Status.FAILED
        execution.task.save(update_fields=["last_execution_status", "updated_at"])
        raise
