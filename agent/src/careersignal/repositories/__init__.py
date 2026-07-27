"""데이터베이스 접근의 유일한 경로.

다른 모듈은 psycopg 를 직접 import 하지 않는다.
각 구성요소는 자기 저장소만 주입받는다.
정의는 docs/permission-matrix.md 6.1을 따른다.
"""

from careersignal.repositories.base import Repository, Unit, unit_of_work
from careersignal.repositories.sources import (
    IngestRepository,
    SourceRepository,
    content_hash,
)
from careersignal.repositories.telemetry import (
    OrchestratorRepository,
    TelemetryRepository,
)
from careersignal.repositories.verification import (
    VerificationRepository,
    new_order_id,
    new_result_id,
)

__all__ = [
    "IngestRepository",
    "OrchestratorRepository",
    "Repository",
    "SourceRepository",
    "TelemetryRepository",
    "Unit",
    "VerificationRepository",
    "content_hash",
    "new_order_id",
    "new_result_id",
    "unit_of_work",
]
