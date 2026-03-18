from datetime import datetime, time, timedelta
from types import SimpleNamespace
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Agent, Execution, Task
from .tasks import dispatch_due_executions, run_agent_execution, schedule_periodic_tasks


REAL_LOCALTIME = timezone.localtime


class TaskExecutionApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.agent = Agent.objects.create(name="Mailer", model_name="openai/gpt-oss-120b:fastest")
        self.task = Task.objects.create(
            assigned_agent=self.agent,
            title="Email a customer",
            recipient_email="customer@example.com",
            status=Task.Status.BACKLOG,
        )

    def test_create_execution_uses_client_schedule_time(self):
        scheduled_for = timezone.now() + timedelta(hours=2)

        response = self.client.post(
            f"/api/tasks/{self.task.id}/execute/",
            {
                "scheduled_for": scheduled_for.isoformat(),
                "input_payload": {"tone": "friendly"},
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        execution = Execution.objects.get(task=self.task)
        self.assertEqual(execution.task, self.task)
        self.assertEqual(execution.agent, self.agent)
        self.assertEqual(execution.celery_task_id, "")
        self.assertEqual(execution.input_payload, {"tone": "friendly"})
        self.assertIsNotNone(execution.scheduled_for)
        self.assertAlmostEqual(execution.scheduled_for.timestamp(), scheduled_for.timestamp(), delta=1)

    def test_execute_rejects_invalid_schedule_time(self):
        response = self.client.post(
            f"/api/tasks/{self.task.id}/execute/",
            {"scheduled_for": "not-a-date"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    @patch("board.tasks.timezone.localtime")
    @patch("board.tasks.timezone.now")
    def test_schedule_periodic_tasks_creates_daily_execution_once(self, mock_now, mock_localtime):
        now = timezone.make_aware(datetime(2026, 3, 19, 0, 0, 5), timezone.get_current_timezone())
        mock_now.return_value = now
        mock_localtime.side_effect = lambda dt=None: now if dt is None else REAL_LOCALTIME(dt)

        periodic_task = Task.objects.create(
            assigned_agent=self.agent,
            title="Midnight digest",
            recipient_email="ops@example.com",
            status=Task.Status.BACKLOG,
            is_periodic=True,
            schedule_time=time(hour=0, minute=0),
        )

        created = schedule_periodic_tasks()
        periodic_task.refresh_from_db()

        self.assertEqual(created, 1)
        self.assertEqual(Execution.objects.filter(task=periodic_task).count(), 1)
        self.assertIsNotNone(periodic_task.last_scheduled_at)

        created_again = schedule_periodic_tasks()
        self.assertEqual(created_again, 0)
        self.assertEqual(Execution.objects.filter(task=periodic_task).count(), 1)

    @patch("board.tasks.run_agent_execution.apply_async")
    def test_dispatch_due_executions_enqueues_worker_job(self, mock_apply_async):
        mock_apply_async.return_value = SimpleNamespace(id="celery-job-1")
        execution = Execution.objects.create(
            task=self.task,
            agent=self.agent,
            estimated_seconds=300,
            scheduled_for=timezone.now() - timedelta(seconds=1),
        )

        dispatched = dispatch_due_executions()

        execution.refresh_from_db()
        self.assertEqual(dispatched, 1)
        self.assertEqual(execution.celery_task_id, "celery-job-1")
        mock_apply_async.assert_called_once()

    def test_transition_requires_valid_status(self):
        response = self.client.post(f"/api/tasks/{self.task.id}/transition/", {"status": "unknown"}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_transition_updates_status_without_position(self):
        response = self.client.post(
            f"/api/tasks/{self.task.id}/transition/",
            {"status": Task.Status.IN_PROGRESS},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, Task.Status.IN_PROGRESS)

    @override_settings(
        HF_TOKEN="test-token",
        DEFAULT_FROM_EMAIL="noreply@example.com",
        EMAIL_HOST_USER="ops@example.com",
    )
    @patch("board.tasks.send_mail")
    @patch("board.tasks.requests.post")
    def test_failed_execution_is_retained_and_sends_failure_email(self, mock_post, mock_send_mail):
        mock_post.side_effect = RuntimeError("Model provider unavailable")
        execution = Execution.objects.create(
            task=self.task,
            agent=self.agent,
            estimated_seconds=300,
            scheduled_for=timezone.now(),
        )

        with self.assertRaises(RuntimeError):
            run_agent_execution.run(str(execution.id))

        execution.refresh_from_db()
        self.task.refresh_from_db()

        self.assertEqual(Execution.objects.filter(pk=execution.pk).count(), 1)
        self.assertEqual(execution.status, Execution.Status.FAILED)
        self.assertEqual(self.task.last_execution_status, Execution.Status.FAILED)
        self.assertIn("Model provider unavailable", execution.error_message)
        self.assertEqual(execution.output_payload["status"], Execution.Status.FAILED)
        self.assertEqual(execution.output_payload["error"], "Model provider unavailable")
        self.assertTrue(execution.output_payload["failure_notification_sent"])
        self.assertEqual(
            execution.output_payload["failure_notification_recipient"],
            "ops@example.com",
        )
        self.assertEqual(execution.output_payload["failure_notification_error"], "")
        mock_send_mail.assert_called_once()
