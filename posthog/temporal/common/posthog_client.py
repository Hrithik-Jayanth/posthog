from dataclasses import is_dataclass
from typing import Any, Optional

from posthoganalytics import api_key, capture_exception
from temporalio import activity, workflow
from temporalio.worker import (
    ActivityInboundInterceptor,
    ExecuteActivityInput,
    ExecuteWorkflowInput,
    Interceptor,
    WorkflowInboundInterceptor,
    WorkflowInterceptorClassInput,
)


class _PostHogClientActivityInboundInterceptor(ActivityInboundInterceptor):
    async def execute_activity(self, input: ExecuteActivityInput) -> Any:
        try:
            return await super().execute_activity(input)
        except Exception as e:
            activity_info = activity.info()
            properties = {
                "temporal.execution_type": "activity",
                "module": input.fn.__module__ + "." + input.fn.__qualname__,
                "temporal.activity.attempt": activity_info.attempt,
                "temporal.activity.id": activity_info.activity_id,
                "temporal.activity.type": activity_info.activity_type,
                "temporal.activity.task_queue": activity_info.task_queue,
                "temporal.workflow.id": activity_info.workflow_id,
                "temporal.workflow.namespace": activity_info.workflow_namespace,
                "temporal.workflow.run_id": activity_info.workflow_run_id,
                "temporal.workflow.type": activity_info.workflow_type,
            }
            if len(input.args) == 1 and is_dataclass(input.args[0]):
                team_id = getattr(input.args[0], "team_id", None)
                if team_id:
                    properties["team_id"] = team_id

            if api_key:
                capture_exception(e, properties=properties)
            raise


class _PostHogClientWorkflowInterceptor(WorkflowInboundInterceptor):
    async def execute_workflow(self, input: ExecuteWorkflowInput) -> Any:
        try:
            return await super().execute_workflow(input)
        except Exception as e:
            workflow_info = workflow.info()
            properties = {
                "temporal.execution_type": "workflow",
                "module": input.run_fn.__module__ + "." + input.run_fn.__qualname__,
                "temporal.workflow.task_queue": workflow_info.task_queue,
                "temporal.workflow.namespace": workflow_info.namespace,
                "temporal.workflow.run_id": workflow_info.run_id,
                "temporal.workflow.type": workflow_info.workflow_type,
                "temporal.workflow.id": workflow_info.workflow_id,
            }
            if len(input.args) == 1 and is_dataclass(input.args[0]):
                team_id = getattr(input.args[0], "team_id", None)
                if team_id:
                    properties["team_id"] = team_id

            if api_key and not workflow.unsafe.is_replaying():
                with workflow.unsafe.sandbox_unrestricted():
                    capture_exception(e, properties=properties)
            raise


class PostHogClientInterceptor(Interceptor):
    """PostHog Interceptor class which will report workflow & activity exceptions to PostHog"""

    def intercept_activity(self, next: ActivityInboundInterceptor) -> ActivityInboundInterceptor:
        """Implementation of
        :py:meth:`temporalio.worker.Interceptor.intercept_activity`.
        """
        return _PostHogClientActivityInboundInterceptor(super().intercept_activity(next))

    def workflow_interceptor_class(
        self, input: WorkflowInterceptorClassInput
    ) -> Optional[type[WorkflowInboundInterceptor]]:
        return _PostHogClientWorkflowInterceptor
