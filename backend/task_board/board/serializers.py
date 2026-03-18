from rest_framework import serializers

from .models import Agent, Execution, Task


class AgentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agent
        fields = "__all__"


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = "__all__"

    def validate(self, attrs):
        attrs = super().validate(attrs)
        is_periodic = attrs.get("is_periodic", getattr(self.instance, "is_periodic", False))
        schedule_time = attrs.get("schedule_time", getattr(self.instance, "schedule_time", None))
        if is_periodic and schedule_time is None:
            raise serializers.ValidationError({"schedule_time": "schedule_time is required when is_periodic is true."})
        return attrs


class ExecutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Execution
        fields = "__all__"
        read_only_fields = (
            "id",
            "status",
            "queued_at",
            "scheduled_for",
            "started_at",
            "finished_at",
            "actual_seconds",
            "celery_task_id",
            "output_payload",
            "error_message",
            "created_at",
            "updated_at",
        )
