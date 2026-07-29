"""데이터베이스 접근의 유일한 경로.

다른 모듈은 psycopg 를 직접 import 하지 않는다.
각 구성요소는 자기 저장소만 주입받는다.
정의는 docs/permission-matrix.md 6.1을 따른다.
"""

from careersignal.repositories.assignment import AssignmentRepository
from careersignal.repositories.base import Repository, Unit, unit_of_work
from careersignal.repositories.evaluation import EvaluationRepository
from careersignal.repositories.graph_paths import (
    EvidenceSetRepository,
    GraphPathRepository,
)
from careersignal.repositories.indexing import IndexRepository
from careersignal.repositories.knowledge_graph import (
    GraphRepository,
    SemanticGraphRepository,
)
from careersignal.repositories.lineage import LineageGraphRepository
from careersignal.repositories.metrics import (
    MetricRepository,
    StatisticsAuditRepository,
)
from careersignal.repositories.profiles import DepthProfileRepository
from careersignal.repositories.promotion import PromotionRepository
from careersignal.repositories.sources import (
    IngestRepository,
    SourceRepository,
    content_hash,
)
from careersignal.repositories.saturation import SaturationRepository
from careersignal.repositories.statistics import StatisticsRepository
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
    "AssignmentRepository",
    "DepthProfileRepository",
    "EvaluationRepository",
    "EvidenceSetRepository",
    "GraphPathRepository",
    "GraphRepository",
    "IndexRepository",
    "IngestRepository",
    "LineageGraphRepository",
    "MetricRepository",
    "OrchestratorRepository",
    "PromotionRepository",
    "Repository",
    "SaturationRepository",
    "SemanticGraphRepository",
    "SourceRepository",
    "StatisticsAuditRepository",
    "StatisticsRepository",
    "TelemetryRepository",
    "Unit",
    "VerificationRepository",
    "content_hash",
    "new_order_id",
    "new_result_id",
    "unit_of_work",
]
