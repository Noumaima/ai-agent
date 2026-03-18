from django.utils import dateparse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Agent, Execution, Task
from .serializers import AgentSerializer, ExecutionSerializer, TaskSerializer


def queue_execution(execution: Execution, scheduled_for) -> None:
    execution.scheduled_for = scheduled_for
    execution.save(update_fields=["scheduled_for", "updated_at"])


def parse_scheduled_for(value):
    if not value:
        return timezone.now()

    parsed = dateparse.parse_datetime(value)
    if parsed is None:
        return None
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


class AgentViewSet(viewsets.ModelViewSet):
    queryset = Agent.objects.all()
    serializer_class = AgentSerializer


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.select_related("assigned_agent").all()
    serializer_class = TaskSerializer

    @action(detail=True, methods=["post"])
    def assign_agent(self, request, pk=None):
        task = self.get_object()
        agent_id = request.data.get("agent_id")
        if not agent_id:
            return Response(
                {"detail": "agent_id is required."}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            agent = Agent.objects.get(pk=agent_id, status=Agent.Status.ACTIVE)
        except Agent.DoesNotExist:
            return Response(
                {"detail": "Active agent not found."}, status=status.HTTP_404_NOT_FOUND
            )

        task.assigned_agent = agent
        task.save(update_fields=["assigned_agent", "updated_at"])
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        task = self.get_object()
        target_status = request.data.get("status")
        if not target_status:
            return Response(
                {"detail": "status is required."}, status=status.HTTP_400_BAD_REQUEST
            )
        if target_status not in Task.Status.values:
            return Response(
                {"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST
            )

        task.status = target_status
        task.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(task).data)

    @action(detail=True, methods=["post"])
    def execute(self, request, pk=None):
        task = self.get_object()
        agent = task.assigned_agent
        if not agent:
            return Response(
                {"detail": "Assign an agent before creating an execution."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if agent.status != Agent.Status.ACTIVE:
            return Response(
                {"detail": "Assigned agent is disabled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            estimated_seconds = int(
                request.data.get(
                    "estimated_seconds",
                    task.estimated_seconds or agent.default_estimated_seconds,
                )
            )
        except (TypeError, ValueError):
            return Response(
                {"detail": "estimated_seconds must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        input_payload = request.data.get("input_payload", {})
        if not isinstance(input_payload, dict):
            return Response(
                {"detail": "input_payload must be a JSON object."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        scheduled_for = parse_scheduled_for(request.data.get("scheduled_for"))
        if scheduled_for is None:
            return Response(
                {"detail": "scheduled_for must be a valid ISO datetime."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        execution = Execution.objects.create(
            task=task,
            agent=agent,
            estimated_seconds=estimated_seconds,
            input_payload=input_payload,
        )
        queue_execution(execution, scheduled_for)

        return Response(
            ExecutionSerializer(execution).data, status=status.HTTP_201_CREATED
        )


class ExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Execution.objects.select_related("task", "agent").all()
    serializer_class = ExecutionSerializer

    @action(detail=True, methods=["post"])
    def retry(self, request, pk=None):
        execution = self.get_object()
        new_execution = Execution.objects.create(
            task=execution.task,
            agent=execution.agent,
            estimated_seconds=execution.estimated_seconds,
            input_payload=execution.input_payload,
        )
        scheduled_for = parse_scheduled_for(request.data.get("scheduled_for"))
        if scheduled_for is None:
            return Response(
                {"detail": "scheduled_for must be a valid ISO datetime."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        queue_execution(new_execution, scheduled_for)
        return Response(
            ExecutionSerializer(new_execution).data, status=status.HTTP_201_CREATED
        )
