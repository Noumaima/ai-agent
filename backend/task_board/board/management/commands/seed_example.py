from datetime import time

from django.core.management.base import BaseCommand

from board.models import Agent, Task


class Command(BaseCommand):
    help = "Seed the database with example agents and tasks."

    def handle(self, *args, **options):
        agent, created = Agent.objects.get_or_create(
            name="Sales Email Agent",
            defaults={
                "description": "Generates professional outbound follow-up emails.",
                "agent_type": Agent.AgentType.EMAIL_ASSISTANT,
                "model_name": "openai/gpt-oss-120b:fastest",
                "system_prompt": "You write short, persuasive, professional sales emails.",
                "default_estimated_seconds": 180,
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Created agent: {agent.name}"))
        else:
            self.stdout.write(f"Agent already exists: {agent.name}")

        sample_tasks = [
            {
                "title": "Draft follow-up for Acme lead",
                "description": "Write a follow-up email for a prospect who requested pricing details last week.",
                "status": Task.Status.BACKLOG,
                "recipient_email": "prospect1@example.com",
                "priority": Task.Priority.HIGH,
                "estimated_seconds": 180,
            },
            {
                "title": "Prepare onboarding welcome email",
                "description": "Create a welcome email for a newly signed customer with next-step instructions.",
                "status": Task.Status.IN_PROGRESS,
                "recipient_email": "customer1@example.com",
                "priority": Task.Priority.MEDIUM,
                "estimated_seconds": 240,
            },
            {
                "title": "Send renewal reminder draft",
                "description": "Draft a friendly renewal reminder for a customer whose subscription expires this month.",
                "status": Task.Status.DONE,
                "recipient_email": "customer2@example.com",
                "priority": Task.Priority.MEDIUM,
                "estimated_seconds": 150,
                "actual_seconds": 95,
                "last_execution_status": "finished",
            },
            {
                "title": "Midnight daily lead digest",
                "description": "Generate a midnight follow-up email digest for the latest leads every day.",
                "status": Task.Status.BACKLOG,
                "recipient_email": "sales-ops@example.com",
                "priority": Task.Priority.MEDIUM,
                "estimated_seconds": 120,
                "is_periodic": True,
                "schedule_time": time(hour=0, minute=0),
            },
        ]

        for payload in sample_tasks:
            task, task_created = Task.objects.get_or_create(
                title=payload["title"],
                defaults={
                    **payload,
                    "assigned_agent": agent,
                },
            )
            if task_created:
                self.stdout.write(self.style.SUCCESS(f"Created task: {task.title}"))
            else:
                self.stdout.write(f"Task already exists: {task.title}")

        self.stdout.write(self.style.SUCCESS("Example seed complete."))
