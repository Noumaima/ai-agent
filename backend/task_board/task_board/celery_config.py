import os
from datetime import timedelta

import sentry_sdk
from celery import Celery
from kombu import Exchange, Queue
from sentry_sdk.integrations.celery import CeleryIntegration


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "task_board.settings")

app = Celery("task_board")
app.config_from_object("django.conf:settings", namespace="CELERY")

app.conf.task_queues = [
    Queue("agent_execution", Exchange("agent_execution"), routing_key="agent_execution", queue_arguments={"x-max-priority": 10}),
    Queue("dead_letter", Exchange("dead_letter"), routing_key="dead_letter"),
]
app.conf.task_default_queue = "agent_execution"
app.conf.task_default_exchange = "agent_execution"
app.conf.task_default_routing_key = "agent_execution"
app.conf.task_acks_late = True
app.conf.task_default_priority = 5
app.conf.worker_prefetch_multiplier = 1
app.conf.beat_schedule = {
    "schedule-periodic-tasks": {
        "task": "board.tasks.schedule_periodic_tasks",
        "schedule": timedelta(minutes=1),
    },
    "dispatch-due-executions": {
        "task": "board.tasks.dispatch_due_executions",
        "schedule": timedelta(seconds=30),
    }
}

app.autodiscover_tasks()
