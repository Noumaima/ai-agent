from rest_framework.routers import DefaultRouter

from .views import AgentViewSet, ExecutionViewSet, TaskViewSet


router = DefaultRouter()
router.register("agents", AgentViewSet)
router.register("tasks", TaskViewSet)
router.register("executions", ExecutionViewSet)

urlpatterns = router.urls
