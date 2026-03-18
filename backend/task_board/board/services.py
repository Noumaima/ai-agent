from .models import Execution, Task


def update_task_actual_duration(task: Task) -> None:
    total = task.executions.filter(status=Execution.Status.FINISHED).values_list("actual_seconds", flat=True)
    task.actual_seconds = sum(total)
    task.save(update_fields=["actual_seconds", "updated_at"])
