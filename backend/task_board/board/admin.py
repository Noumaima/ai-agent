from django.contrib import admin

from .models import Agent, Execution, Task


@admin.register(Agent)
class AgentAdmin(admin.ModelAdmin):
    list_display = ("name", "agent_type", "status", "model_name")
    search_fields = ("name", "model_name")


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "assigned_agent", "recipient_email", "last_execution_status")
    list_filter = ("status", "priority")
    search_fields = ("title", "recipient_email")


@admin.register(Execution)
class ExecutionAdmin(admin.ModelAdmin):
    list_display = ("id", "task", "agent", "status", "queued_at", "finished_at")
    list_filter = ("status", "execution_type")
