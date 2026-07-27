"""실행 궤적 기록.

전 실행 구성요소가 사용한다. 기록만 하고 실행 결말만 갱신한다.
정의는 docs/permission-matrix.md 3.1을 따른다.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from careersignal.contracts.check_result import AutonomyLevel
from careersignal.domain.permissions import Component
from careersignal.repositories.base import Repository, Unit


class TelemetryRepository:
    """구성요소 제한이 없다. 어느 거래에서나 쓸 수 있다."""

    def __init__(self, unit: Unit) -> None:
        self.unit = unit

    def start_run(
        self,
        agent_run_id: str,
        analysis_version: str,
        agent_name: str,
        iteration: int,
        objective_id: str | None = None,
        started_at: datetime | None = None,
    ) -> None:
        self.unit.insert(
            "agent_runs",
            {
                "agent_run_id": agent_run_id,
                "analysis_version": analysis_version,
                "agent_name": agent_name,
                "objective_id": objective_id,
                "iteration": iteration,
                "started_at": started_at or datetime.now(),
            },
        )

    def finish_run(
        self,
        agent_run_id: str,
        stop_reason: str,
        tokens: int | None = None,
        cost: float | None = None,
        ended_at: datetime | None = None,
    ) -> None:
        """식별자와 시작 시각은 트리거가 변경을 막는다."""
        self.unit.update(
            "agent_runs",
            {
                "stop_reason": stop_reason,
                "tokens": tokens,
                "cost": cost,
                "ended_at": ended_at or datetime.now(),
            },
            "agent_run_id = %(agent_run_id)s",
            {"agent_run_id": agent_run_id},
        )

    def record_step(
        self,
        step_id: str,
        agent_run_id: str,
        step_name: str,
        autonomy_level: AutonomyLevel,
        started_at: datetime | None = None,
    ) -> None:
        self.unit.insert(
            "agent_run_steps",
            {
                "step_id": step_id,
                "agent_run_id": agent_run_id,
                "step_name": step_name,
                "autonomy_level": str(autonomy_level),
                "started_at": started_at or datetime.now(),
            },
        )

    def record_tool_call(
        self,
        call_id: str,
        agent_run_id: str,
        tool_name: str,
        arguments: dict[str, Any] | None = None,
        latency: int | None = None,
        error: str | None = None,
    ) -> None:
        import json

        self.unit.insert(
            "tool_calls",
            {
                "call_id": call_id,
                "agent_run_id": agent_run_id,
                "tool_name": tool_name,
                "arguments": json.dumps(arguments) if arguments else None,
                "latency": latency,
                "error": error,
            },
        )


class OrchestratorRepository(Repository):
    """분석 버전 생성과 활성화."""

    component = Component.ORCHESTRATOR

    def create_analysis_version(self, values: dict[str, Any]) -> None:
        self.unit.insert("analysis_versions", values)

    def set_status(self, analysis_version: str, status: str) -> int:
        return self.unit.update(
            "analysis_versions",
            {"status": status},
            "analysis_version = %(av)s",
            {"av": analysis_version},
        )

    def activate(self, job_role_id: str, analysis_version: str) -> None:
        """직무마다 한 행이므로 전환이 원자적이다."""
        self.unit.execute(
            """
            INSERT INTO active_analysis_versions (job_role_id, analysis_version, activated_at)
            VALUES (%(job)s, %(av)s, now())
            ON CONFLICT (job_role_id)
            DO UPDATE SET analysis_version = EXCLUDED.analysis_version,
                          activated_at = EXCLUDED.activated_at
            """,
            {"job": job_role_id, "av": analysis_version},
        )

    def active_version(self, job_role_id: str) -> str | None:
        return self.unit.fetch_value(
            "SELECT analysis_version FROM active_analysis_versions WHERE job_role_id = %s",
            (job_role_id,),
        )
