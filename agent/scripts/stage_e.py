r"""Stage E(Phase 13)를 순서대로 한 번에 돌린다.

실행:
    cd agent
    .\.venv\Scripts\Activate.ps1
    python scripts/stage_e.py

계산할 조합 수만 본다. 저장소를 읽되 쓰지 않는다:
    python scripts/stage_e.py --dry-run

구간과 건수를 잘라 돌린다:
    python scripts/stage_e.py --from 1 --to 2 --limit 500

`--from` 과 `--to` 는 13-1 부터 13-6 까지의 단위 번호다. `--limit` 은 이미 저장된
것을 뺀 뒤 남은 것을 앞에서부터 자르며 13-1·13-2·13-5 에 걸린다. 한 실행이 전량을
끝내지 않으므로 남은 것이 없을 때까지 같은 명령을 다시 돌린다.

이 스크립트가 남긴 것을 되돌리는 명령은 `python scripts/reset_stage_e.py --execute` 다.

**Phase 13 에는 생성 모델 호출이 없다.** 집계는 결정적으로 수행하며 생성 모델은
수치를 산출하지 않는다(docs/statistics-model.md 5.1). 실행 전에 보여 주는 수는 예상
호출 수가 아니라 계산할 조합 수다. 외부 호출이 없어 확인할 비용이 없으므로 이
스크립트는 진행 여부를 묻지 않는다. 산출물은 결정적 식별자를 가져 같은 조합을 두 번
넣지 않으며, 되돌리는 명령이 따로 있다.

실행 순서는 13-1 → 13-2 → 13-5 → 13-6 → 13-4 이고 번호 순서가 아니다. 뒤 단계가 앞
단계의 저장된 행을 입력으로 쓰기 때문이다. 13-2 는 지표 행 두 기간을 견주고, 13-5 는
저장된 `depth_distribution` 을 합치며, 13-4 는 저장된 행 전부를 대조한다. 13-3(표본
판정과 억제)은 별도 단계가 아니라 13-1 과 13-2 의 저장 경로에 붙어 있다. 표본 상태와
불확실성을 정하지 않고는 어떤 행도 저장할 수 없기 때문이다.

| 단위 | 산출물 | 구성요소 |
| --- | --- | --- |
| 13-1 | `statistics_facts` | `pipe_aggregate` |
| 13-2 | `statistics_facts`(`temporal_delta`) | `pipe_aggregate` |
| 13-3 | 13-1·13-2 의 `sample_status`·`uncertainty` | `pipe_aggregate` |
| 13-4 | `verification_results` | `pipe_verify` |
| 13-5 | `capability_depth_profiles` | `pipe_aggregate` |
| 13-6 | `saturation_observations` | `agent_stats` |

단계마다 거래를 따로 연다. 거래마다 role 이 하나이므로 쓰기 주체가 다른 표를 한
거래에서 쓰지 않는다. 근거는 docs/permission-matrix.md 3장이다.

이어달리기는 각 실행 클래스가 이미 갖고 있다. 이 스크립트는 체크포인트 파일을 만들지
않는다. 13-1 과 13-2 는 이 분석 버전에 이미 있는 지표 행을, 13-5 는 이미 만든
프로파일을, 13-6 은 앞선 관측과 같은 누적 상태를 각각 건너뛴다. 중간에 끊겨도 같은
명령을 다시 실행하면 저장소 상태에서 이어진다.

실패를 두 갈래로 나눈다. 실행 전제가 깨진 실패만 뒤 단계를 막는다. 활성 분류체계가
없거나 봉투의 버전이 활성 버전과 어긋난 실행은 산출물이 하나도 없고, 그 위에 다음
단계를 쌓으면 없는 입력을 있는 것처럼 다룬다. 일부 조합만 실패한 실행은 막지 않는다.
계산한 조합은 그대로 쓸 수 있는 근거이며, 나머지 때문에 프로파일을 만들지 않으면 이미
센 것을 버린다. 판정은 `blocks_next_units` 가 하고 근거는 `PRECONDITION_REASONS` 다.

막지 않은 실패도 조용히 넘기지 않는다. 요약이 무엇이 덜 끝났는지 한 줄로 적고 종료
코드가 0이 아니다. 종료 코드는 0 정상, 1 전제가 깨져 뒤 단계를 돌리지 않음, 2 인자
오류, 3 끝까지 돌았으나 덜 끝난 것이 있음이다. 13-4 가 위반을 찾은 실행도 3이다.
수치가 저장되었으나 그 값이 정의와 어긋난 상태를 성공으로 셀 수 없다.

실행 앞에서 적용된 alembic 리비전이 `migrations/versions/` 의 head 와 같은지 본다.
migration 을 적용하지 않은 스키마 위에서 돌면 psycopg 의 `UndefinedColumn` 이 실행
중간에 튀어나와 앞 단계의 산출물만 남는다. 어긋나면 `alembic upgrade head` 를
안내하고 종료 코드 2로 멈춘다. `--skip-schema-check` 로 건너뛴다.
"""

from __future__ import annotations

import argparse
import re
import sys
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from itertools import combinations
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

try:
    from dotenv import load_dotenv
except ImportError:
    print("python-dotenv 가 필요하다. pip install -r requirements.txt")
    raise SystemExit(1)

load_dotenv(ROOT / ".env")

from careersignal.agents.collector import SourceManifest  # noqa: E402
from careersignal.contracts.check_result import CheckName, CheckVerdict  # noqa: E402
from careersignal.contracts.run_context import (  # noqa: E402
    Budget,
    RunContext,
    StopReason,
)
from careersignal.domain.permissions import Component  # noqa: E402
from careersignal.domain.scope import ScopeLevel  # noqa: E402
from careersignal.metrics.depth_profile import (  # noqa: E402
    NO_POLICY as DEPTH_NO_POLICY,
)
from careersignal.metrics.depth_profile import (  # noqa: E402
    CapabilityDepthProfiles,
)
from careersignal.metrics.expansion import (  # noqa: E402
    Applicability,
    DimensionRef,
    InputArity,
    MetricFamily,
    MetricTemplate,
    envelopes,
    expand,
)
from careersignal.metrics.families import REQUIRED_MEASURES  # noqa: E402
from careersignal.metrics.policy import policy_from_row, select_policy  # noqa: E402
from careersignal.metrics.runner import (  # noqa: E402
    ALL_SEGMENTS,
    NO_ACTIVE_TAXONOMY,
    NO_POLICY,
    NO_TEMPLATES,
    TAXONOMY_MISMATCH,
    MetricAggregation,
    PolicySampler,
    fact_identifier,
)
from careersignal.metrics.saturation import SaturationTracking  # noqa: E402
from careersignal.metrics.temporal import (  # noqa: E402
    Period,
    period_from_row,
    point_from_row,
    temporal_deltas,
)
from careersignal.orchestration.envelope import (  # noqa: E402
    METRIC_POLICY_VERSION,
    MODEL_VERSION,
    PROMPT_VERSION,
    RETRIEVAL_POLICY_VERSION,
    TAXONOMY_VERSION_ID,
)
from careersignal.orchestration.envelope import Envelope as RunEnvelope  # noqa: E402
from careersignal.orchestration.envelope import (  # noqa: E402
    OrchestratorStore,
    analysis_version_identifier,
    ensure_envelope,
    start_agent_run,
)
from careersignal.repositories.base import unit_of_work  # noqa: E402
from careersignal.repositories.metrics import (  # noqa: E402
    MetricRepository,
    StatisticsAuditRepository,
)
from careersignal.repositories.profiles import DepthProfileRepository  # noqa: E402
from careersignal.repositories.saturation import SaturationRepository  # noqa: E402
from careersignal.repositories.verification import (  # noqa: E402
    VerificationRepository,
)
from careersignal.verification.checks.statistics import (  # noqa: E402
    TARGET_AGGREGATION,
    numerical_consistency_check,
)
from careersignal.verification.protocol import CheckContext  # noqa: E402
from careersignal.verification.registry import CheckRegistry  # noqa: E402
from careersignal.verification.runner import CheckRunner  # noqa: E402

DEFAULT_MANIFEST = ROOT / "data" / "manifest" / "backend.json"
MIGRATION_VERSIONS = ROOT / "migrations" / "versions"

RESET_COMMAND = "python scripts/reset_stage_e.py --execute"
"""이 스크립트가 저장소에 남긴 것을 되돌리는 명령."""

FIRST_UNIT = 1
LAST_UNIT = 6

UNIT_LABEL: dict[int, str] = {
    1: "지표 집계",
    2: "시간 연산자",
    3: "표본 판정과 억제",
    4: "수치 검증",
    5: "역량별 깊이 프로파일",
    6: "표본 수렴 기록",
}

RUN_ORDER: tuple[int, ...] = (1, 2, 5, 6, 4)
"""실행 순서. 번호 순서가 아니다.

앞 단계의 저장된 행을 뒤 단계가 입력으로 쓴다. 13-3 은 이 목록에 없다. 표본 판정은
별도 실행이 아니라 13-1 과 13-2 의 저장 경로에 붙어 있다.
"""

SAMPLE_VERDICT_UNIT = 3
STORING_UNITS: frozenset[int] = frozenset({1, 2})
"""표본 판정과 그 판정이 붙어 있는 단계.

13-3 은 단독 실행이 없다. 표본 상태와 불확실성은 지표 행의 컬럼이므로 행을 저장하는
단계가 곧 판정하는 단계다. 고른 구간에 13-1 도 13-2 도 없이 13-3 만 있으면 13-1 을
돌린다. 고른 단위가 아무 단계도 돌리지 않아 조용히 끝나면, 사용자는 돌았다고 믿는
단계가 실제로는 빠진 것을 모른다.
"""

UNIT_COMPONENT: dict[int, Component] = {
    1: Component.PIPE_AGGREGATE,
    2: Component.PIPE_AGGREGATE,
    4: Component.PIPE_VERIFY,
    5: Component.PIPE_AGGREGATE,
    6: Component.AGENT_STATS,
}
"""단위마다의 쓰기 주체. 근거는 docs/permission-matrix.md 3장이다.

`saturation_observations` 는 D3a 분류체계 에이전트가 쓰고 `statistics_facts` 와
`capability_depth_profiles` 는 집계 파이프라인이 쓴다. `verification_results` 는 검증
파이프라인이 쓴다. 거래마다 role 이 하나이므로 세 묶음을 한 거래에서 쓰지 못한다.
"""

AGENT_NAME: dict[str, str] = {
    "13-1": "metric_aggregation",
    "13-2": "metric_temporal",
    "13-4": "statistics_verification",
    "13-5": "capability_depth_profile",
    "13-6": "saturation_tracking",
}
"""`agent_runs.agent_name` 에 남길 이름. 단계마다 실행 행을 따로 만든다."""

EXIT_OK = 0
EXIT_FAILED = 1
EXIT_ABORTED = 2
EXIT_INCOMPLETE = 3
"""끝까지 돌았으나 덜 끝난 것이 있다.

`EXIT_FAILED` 와 가른다. 앞은 뒤 단계를 돌리지 못한 실행이고 뒤는 뒤 단계까지 돌되
일부를 남긴 실행이다. 두 상태의 다음 할 일이 다르다.
"""

PRECONDITION_REASONS: frozenset[str] = frozenset(
    {
        NO_ACTIVE_TAXONOMY,
        TAXONOMY_MISMATCH,
        NO_TEMPLATES,
        NO_POLICY,
        DEPTH_NO_POLICY,
    }
)
"""실행 전제가 깨졌음을 알리는 사유.

각 실행 클래스가 전제 확인에 실패했을 때 `errors` 에 적는 문구다. 문구로 판정하는
이유는 결과 모델이 단계마다 다르고 공통 표식이 없기 때문이며, 문구는 각 모듈의
상수에서 그대로 가져오므로 문구가 바뀌면 이 집합도 함께 바뀐다.

- `NO_ACTIVE_TAXONOMY` 활성 분류체계 버전이 없다. 셀 할당이 없다.
- `TAXONOMY_MISMATCH` 봉투가 가리키는 버전과 활성 버전이 다르다.
- `NO_TEMPLATES` 지표 템플릿이 없다. 전개할 첫 축이 없다.
- `NO_POLICY` 지표 정책 버전이 없다. 임계값을 지어내지 않는다.
"""

LIMIT_WARNING = (
    "              --limit 은 남은 것을 앞에서부터 자른다. 13-1·13-2·13-5 에 걸리며"
    "\n              13-4 는 전수 검사라 자르지 않는다"
)
"""`--limit` 의 뜻.

13-1 과 13-5 는 이미 저장된 조합·프로파일을 먼저 뺀 뒤 남은 것을 세고, 13-2 는 이미
저장된 델타 행을 건너뛴 뒤 센다. 그래서 같은 값으로 이어 돌리면 실행마다 앞으로
나아간다. 13-4 는 산출물 전체를 대조하는 검사이므로 자르면 검사하지 않은 행이 통과로
읽힌다.
"""

NO_MODEL_CALLS = "Phase 13 은 생성 모델과 임베딩을 호출하지 않는다"
"""집계는 결정적으로 수행한다(docs/statistics-model.md 5.1)."""


# ================================================================ 순수 함수
def unit_range(start: int, end: int) -> tuple[int, ...]:
    """돌릴 단위 번호를 실행 순서로 펼친다.

    범위 밖이거나 순서가 뒤집힌 값은 받지 않는다. 잘못된 구간을 조용히 좁히면
    사용자가 돌았다고 믿는 단계가 실제로는 빠진다.

    번호 순서가 아니라 `RUN_ORDER` 로 돌려준다. 13-4 는 앞 단계가 남긴 행을 대조하므로
    `--to 4` 로 끊으면 검증이 13-1 의 결과만 보고 프로파일을 만들지 않은 상태를 본다.
    그것이 옳다. 단위 번호는 산출물의 이름이고 실행 순서는 의존 관계가 정한다.

    13-3 은 돌릴 단계가 아니라 저장 경로의 일부다. 구간에 13-1 도 13-2 도 없이 13-3 만
    들면 13-1 로 바꾼다.
    """
    if start < FIRST_UNIT or end > LAST_UNIT:
        raise ValueError(f"단위는 {FIRST_UNIT}~{LAST_UNIT} 사이다")
    if start > end:
        raise ValueError("--from 은 --to 보다 클 수 없다")
    selected = set(range(start, end + 1))
    if SAMPLE_VERDICT_UNIT in selected and not (STORING_UNITS & selected):
        selected.add(FIRST_UNIT)
    return tuple(unit for unit in RUN_ORDER if unit in selected)


def precondition_failed(errors: Sequence[tuple[str, str]]) -> bool:
    """실행 전제가 깨졌는가. 사유 문구로 판정한다.

    전제가 깨진 실행은 산출물이 하나도 없다. 조합 하나가 실패한 것과 근본이 다르다.
    """
    return any(reason in PRECONDITION_REASONS for _, reason in errors)


def blocks_next_units(
    stop_reason: StopReason, errors: Sequence[tuple[str, str]] = ()
) -> bool:
    """이 결과 위에 다음 단계를 쌓을 수 없는가.

    막는 것은 실행 전제가 깨진 실패뿐이다. 부분 성공은 성공한 만큼 정당하다. 조합
    1000개 가운데 400개를 센 실행의 400개는 정의대로 계산된 수치이며, 나머지 때문에
    프로파일과 검증을 돌리지 않으면 이미 센 것을 버린다. 뒤 단계도 이어달리기를 하므로
    남은 조합을 다음 실행이 세면 그때 프로파일이 더 만들어진다.

    전제가 깨진 실행은 부분 성공이 아니다. 활성 분류체계가 없는 실행은 0개를 셌고 그
    위의 프로파일은 빈 프로파일이 아니라 잘못된 프로파일이다.
    """
    if stop_reason is not StopReason.EXPLICIT_FAILURE:
        return False
    return precondition_failed(errors)


_REVISION_PATTERN = re.compile(r'^revision\s*=\s*["\']([^"\']+)["\']', re.MULTILINE)
_DOWN_REVISION_PATTERN = re.compile(
    r'^down_revision\s*=\s*["\']([^"\']+)["\']', re.MULTILINE
)
"""리비전 선언을 읽는 규칙.

`^revision` 은 줄머리를 잡으므로 `down_revision` 선언과 섞이지 않는다.
`down_revision = None` 은 잡지 않는다.
"""


def migration_head(versions_dir: Path = MIGRATION_VERSIONS) -> str:
    """`migrations/versions/` 가 가리키는 마지막 리비전.

    파일에 적힌 선언을 읽어, 아무도 앞 리비전으로 지목하지 않은 리비전 하나를 head 로
    본다. 사슬이 끊겨 후보가 없거나 여럿이면 판정하지 않고 예외를 던진다. 조용히 하나를
    고르면 최신이 아닌 스키마를 최신이라고 답한다.

    `scripts/stage_d.py` 가 같은 판정을 갖는다. 두 스크립트는 서로를 import 하지 않는다.
    실행 스크립트는 패키지가 아니라 각각 단독으로 도는 진입점이며, 한쪽을 import 하면
    그 모듈 수준의 `load_dotenv` 와 저장소 import 가 함께 실행된다.
    """
    revisions: set[str] = set()
    parents: set[str] = set()
    for path in sorted(versions_dir.glob("*.py")):
        text = path.read_text(encoding="utf-8")
        revision = _REVISION_PATTERN.search(text)
        if revision is None:
            continue
        revisions.add(revision.group(1))
        for parent in _DOWN_REVISION_PATTERN.findall(text):
            parents.add(parent)
    heads = revisions - parents
    if len(heads) != 1:
        raise ValueError(
            f"{versions_dir} 에서 head 를 하나로 정하지 못했다. 후보 {len(heads)}개"
        )
    return heads.pop()


def schema_is_current(applied: str | None, head: str) -> bool:
    """적용된 리비전이 head 와 같은가. 비어 있으면 적용하지 않은 것이다."""
    return applied is not None and applied == head


def planned_analysis_version(job_role_id: str, dataset_version: str) -> str:
    """이번 실행이 쓸 분석 버전. 저장소에 쓰지 않고 계산한다.

    `ensure_envelope` 가 같은 재료로 같은 식별자를 만든다. `--dry-run` 이 이미 저장된
    조합을 빼려면 버전을 알아야 하는데, 그것을 알려고 봉투를 만들면 세기만 하는 실행이
    행을 남긴다.
    """
    return analysis_version_identifier(
        job_role_id=job_role_id,
        dataset_version=dataset_version,
        taxonomy_version_id=TAXONOMY_VERSION_ID,
        model_version=MODEL_VERSION,
        prompt_version=PROMPT_VERSION,
        retrieval_policy_version=RETRIEVAL_POLICY_VERSION,
        metric_policy_version=METRIC_POLICY_VERSION,
    )


def pair_upper_bound(dimension_count: int, envelope_count: int) -> int:
    """차원 쌍 조합의 상한.

    실제 대상은 `posting_prevalence` 가 `minimum_n` 이상인 차원끼리로 좁혀지므로
    (docs/metric-spec.md 5장) 이 수보다 작다. 그 판정이 13-1 의 결과에 달렸으니 실행
    전에는 상한만 말한다.
    """
    if dimension_count < 2 or envelope_count <= 0:
        return 0
    return len(tuple(combinations(range(dimension_count), 2))) * envelope_count


def remaining_combinations(
    expanded: Sequence[Any], existing: set[tuple[str, ...]]
) -> int:
    """이미 저장된 조합을 뺀 나머지.

    판정을 `metrics/runner.py` 의 `_State.already_done` 과 같게 둔다. 조건 없이 만드는
    measure 가 모두 있으면 계산하지 않으므로, 그 규칙으로 세지 않으면 예상 수와 실제
    계산 수가 어긋난다.
    """
    return sum(
        1
        for combination in expanded
        if not all(
            combination.fact_key(measure) in existing
            for measure in REQUIRED_MEASURES[MetricFamily(combination.metric_family)]
        )
    )


def period_pairs(periods: Sequence[Period]) -> tuple[tuple[Period, Period], ...]:
    """델타를 만들 기간 쌍. 잇닿은 두 기간만 짝짓는다.

    건너뛴 쌍을 만들지 않는 이유는 저장 자리가 하나뿐이기 때문이다. 델타 행은 나중
    기간에 달리므로(docs/metric-spec.md 4장) 기간 A·B·C 에서 (A,C) 와 (B,C) 를 모두
    만들면 같은 유일 조건에 두 행이 생긴다.

    차례는 식별자가 아니라 `starts_on` 이 정한다. 겹치는 기간은 `temporal_delta` 가
    사유를 남기고 계산하지 않는다.
    """
    ordered = sorted(periods, key=lambda p: (p.starts_on, p.period_id))
    return tuple(zip(ordered, ordered[1:], strict=False))


def verification_stop_reason(results: Sequence[Any]) -> StopReason:
    """13-4 의 종료 사유. docs/agent-design.md 11.1의 조건을 판정한다.

    검사할 행이 없어 건너뛴 실행을 통과로 세지 않는다. 검사한 결과 문제가 없는 것과
    검사할 대상이 없는 것은 다른 상태다(docs/agent-design.md 9.3).
    """
    if any(result.verdict is CheckVerdict.FAIL for result in results):
        return StopReason.EXPLICIT_FAILURE
    if not results or all(
        result.verdict is CheckVerdict.SKIP for result in results
    ):
        return StopReason.FRONTIER_EXHAUSTED
    return StopReason.SLOTS_FILLED


def delta_fact_key(row: dict[str, Any]) -> tuple[str, ...]:
    """`statistics_facts` 의 유일 조건과 같은 키.

    `idx_statistics_facts_unique` 가 `COALESCE(dimension_id, '')` 로 NULL 을 접으므로
    여기서도 같게 접는다. `MetricCombination.fact_key` 와 같은 차례여야
    `existing_fact_keys` 가 돌려준 집합과 견줄 수 있다.
    """
    return (
        str(row["metric_family"]),
        str(row["measure"]),
        str(row["scope_level"]),
        str(row["scope_id"]),
        str(row["entry_segment"]),
        str(row["period_id"]),
        str(row["dimension_id"] or ""),
        str(row["secondary_dimension_id"] or ""),
    )


# ================================================================ 작업량 조회
@dataclass(frozen=True, slots=True)
class Workload:
    """저장소가 알려 준 남은 작업량."""

    analysis_version: str = ""
    taxonomy_version_id: str | None = None

    template_count: int = 0
    dimension_count: int = 0
    period_count: int = 0
    cluster_count: int = 0
    envelope_count: int = 0

    direct_combinations: int = 0
    """차원 쌍을 뺀 조합 수. 여섯 family 다."""

    remaining_direct: int = 0
    """그 가운데 이 분석 버전에 아직 없는 조합."""

    pair_bound: int = 0
    """차원 쌍 조합의 상한."""

    stored_facts: int = 0
    period_pair_count: int = 0
    capability_count: int = 0
    profile_envelopes: int = 0
    stored_profiles: int = 0

    @property
    def combination_total(self) -> int:
        """이번 실행이 셀 조합 수의 상한. 모델 호출 수가 아니다."""
        return self.remaining_direct + self.pair_bound


@dataclass(frozen=True, slots=True)
class UnitEstimate:
    """단위 하나의 예상 작업량."""

    unit: int
    targets: int = 0
    upper_bound: bool = False
    note: str = ""


def _templates(rows: Sequence[dict[str, Any]]) -> list[MetricTemplate]:
    """`metric_templates` 를 전개가 쓰는 모양으로 옮긴다. 일곱 종에 없는 것은 뺀다."""
    known = {str(family) for family in MetricFamily}
    return [
        MetricTemplate(
            metric_family=str(row["metric_family"]),
            formula_version=str(row["formula_version"]),
            input_arity=InputArity(str(row["input_arity"])),
            output_unit=str(row["output_unit"]),
        )
        for row in rows
        if str(row["metric_family"]) in known
    ]


def gather_workload(
    manifest: SourceManifest, job_role_id: str, analysis_version: str
) -> Workload:
    """저장소를 읽어 남은 작업량을 센다. 쓰지 않는다.

    건수를 상수로 두지 않는다. 이어달리기가 대상 수를 줄이므로 상수는 실행할수록
    실제와 멀어진다.

    전개는 실행이 쓰는 함수를 그대로 부른다(`metrics/expansion.py`). 세는 규칙을 따로
    적으면 예상 수와 실제 계산 수가 어긋난다.
    """
    with unit_of_work(Component.PIPE_AGGREGATE) as unit:
        metrics = MetricRepository(unit)
        profiles = DepthProfileRepository(unit)

        active = metrics.active_taxonomy_version(job_role_id)
        if active is None:
            return Workload(analysis_version=analysis_version)

        taxonomy_version_id = str(active["taxonomy_version_id"])
        templates = _templates(metrics.metric_templates())
        dimensions = [
            DimensionRef(
                dimension_id=str(row["dimension_id"]),
                role_boundary_eligible=bool(row["role_boundary_eligible"]),
            )
            for row in metrics.active_dimensions(taxonomy_version_id)
        ]
        applicability = Applicability.from_rows(
            metrics.applicability(taxonomy_version_id)
        )
        periods = metrics.periods()
        clusters = metrics.cluster_scopes(
            job_role_id, manifest.dataset_version, manifest.as_of_date
        )
        scopes = [
            (ScopeLevel.OVERALL, job_role_id),
            *((ScopeLevel.CLUSTER, cluster_id) for cluster_id in clusters),
        ]
        scope_envelopes = envelopes(scopes, ALL_SEGMENTS, periods)
        direct = expand(
            [
                template
                for template in templates
                if template.metric_family != str(MetricFamily.COOCCURRENCE)
            ],
            dimensions,
            scope_envelopes,
            applicability,
        )
        existing = metrics.existing_fact_keys(analysis_version)

        capabilities = profiles.capabilities(job_role_id)
        depth_envelopes = {
            (
                row["scope_level"],
                row["scope_id"],
                row["entry_segment"],
                row["period_id"],
            )
            for row in profiles.depth_facts(analysis_version)
        }
        return Workload(
            analysis_version=analysis_version,
            taxonomy_version_id=taxonomy_version_id,
            template_count=len(templates),
            dimension_count=len(dimensions),
            period_count=len(periods),
            cluster_count=len(clusters),
            envelope_count=len(scope_envelopes),
            direct_combinations=len(direct),
            remaining_direct=remaining_combinations(direct, existing),
            pair_bound=pair_upper_bound(len(dimensions), len(scope_envelopes)),
            stored_facts=metrics.fact_count(analysis_version),
            period_pair_count=max(len(periods) - 1, 0),
            capability_count=len(capabilities),
            profile_envelopes=len(depth_envelopes),
            stored_profiles=profiles.profile_count(analysis_version),
        )


def build_estimates(
    units: Sequence[int], workload: Workload
) -> tuple[UnitEstimate, ...]:
    """단위별 예상 작업량을 세운다. 모델 호출은 어느 단위에도 없다."""
    rows: dict[int, UnitEstimate] = {
        1: UnitEstimate(
            unit=1,
            targets=workload.combination_total,
            upper_bound=workload.pair_bound > 0,
            note=(
                f"차원 {workload.dimension_count}개 · 봉투 {workload.envelope_count}개 · "
                f"차원 쌍 상한 {workload.pair_bound}개"
            ),
        ),
        2: UnitEstimate(
            unit=2,
            targets=workload.period_pair_count,
            note="기간 쌍마다 두 기간이 모두 analysis_ready 인 지표 행만 뺀다",
        ),
        4: UnitEstimate(
            unit=4,
            targets=workload.stored_facts,
            note="저장된 지표 행을 전수 대조한다",
        ),
        5: UnitEstimate(
            unit=5,
            targets=max(
                workload.capability_count * workload.profile_envelopes
                - workload.stored_profiles,
                0,
            ),
            upper_bound=True,
            note=(
                f"역량 {workload.capability_count}개 × 지표가 있는 봉투 "
                f"{workload.profile_envelopes}개"
            ),
        ),
        6: UnitEstimate(
            unit=6,
            targets=1,
            note="관측 시점마다 한 행. 누적이 그대로면 남기지 않는다",
        ),
    }
    return tuple(rows[unit] for unit in units)


def applied_revision() -> str | None:
    """`alembic_version` 에 적힌 리비전. 표가 없거나 비어 있으면 비운다."""
    with unit_of_work(Component.ORCHESTRATOR) as unit:
        return unit.fetch_value("SELECT version_num FROM alembic_version")


SKIP_HINT = "  확인을 건너뛰려면 --skip-schema-check 를 붙인다"
UPGRADE_HINT = "  alembic upgrade head 를 먼저 돌린다"


def schema_problem(versions_dir: Path = MIGRATION_VERSIONS) -> str | None:
    """스키마가 최신이 아니면 사유와 안내를, 최신이면 비운다.

    판정할 수 없는 경우도 사유로 돌려준다. 확인하지 못한 것을 확인했다고 볼 수 없다.
    """
    try:
        head = migration_head(versions_dir)
    except (OSError, ValueError) as error:
        return f"마이그레이션 head 를 정하지 못했다: {error}\n{SKIP_HINT}"
    try:
        applied = applied_revision()
    except Exception as error:  # noqa: BLE001 - 드라이버 예외 종류를 가리지 않는다
        return f"alembic_version 을 읽지 못했다: {error}\n{UPGRADE_HINT}\n{SKIP_HINT}"
    if schema_is_current(applied, head):
        return None
    return (
        f"스키마가 최신이 아니다. 적용됨 {applied or '없음'} · 최신 {head}\n"
        f"{UPGRADE_HINT}\n{SKIP_HINT}"
    )


# ================================================================ 출력
def report_estimate(estimates: Sequence[UnitEstimate]) -> int:
    """계산할 조합 수를 찍고 합계를 돌려준다."""
    print("\n계산할 조합")
    for estimate in estimates:
        label = UNIT_LABEL[estimate.unit]
        bound = "최대 " if estimate.upper_bound else ""
        print(f"  13-{estimate.unit}  {label}")
        print(f"    대상        {bound}{estimate.targets}개")
        if estimate.note:
            print(f"    비고        {estimate.note}")
    total = sum(estimate.targets for estimate in estimates)
    print(f"\n  합계        {total}개")
    print(f"  {NO_MODEL_CALLS}")
    return total


def report_aggregation(outcome: Any) -> None:
    print("\n13-1  지표 집계")
    print(f"  분류체계     {outcome.taxonomy_version_id or '없음'}")
    print(f"  템플릿       {outcome.template_count}개")
    print(f"  차원         {outcome.dimension_count}개")
    print(f"  봉투         {outcome.envelope_count}개")
    print(f"  전개 조합    {outcome.expanded_combinations}개")
    print(f"  건너뜀       {outcome.skipped_combinations}개")
    print(f"  계산         {outcome.computed_combinations}개")
    print(f"  저장 행      {outcome.stored_facts}개  {_spread(outcome.by_family)}")
    print(f"  값 비움      {outcome.suppressed_values}개")
    print(f"  입력 없음    {len(outcome.missing_input)}건")
    _report_reasons("  입력 없음 사유", _grouped(outcome.missing_input))
    _report_reasons("  실패 사유", _grouped(outcome.errors))
    if outcome.limit_reached:
        print("  한도         닿았다. 남은 조합은 다음 실행이 집는다")
    if outcome.halted:
        print(f"  멈춘 사유    {outcome.halted_reason}")
    print(f"  종료 사유    {outcome.stop_reason}")


def report_delta(summary: DeltaSummary) -> None:
    print("\n13-2  시간 연산자")
    print(f"  기간 쌍      {summary.pairs}개")
    print(f"  대상 지표    {summary.families}종")
    print(f"  계산         {summary.computed}개")
    print(f"  건너뜀       {summary.skipped}개")
    print(f"  저장 행      {summary.stored}개")
    print(f"  만들지 않음  {summary.refused}건")
    _report_reasons("  만들지 않은 사유", _counted(summary.reasons))
    _report_reasons("  실패 사유", _grouped(summary.errors))
    if summary.limit_reached:
        print("  한도         닿았다. 남은 델타는 다음 실행이 집는다")
    print(f"  종료 사유    {summary.stop_reason}")


def report_profiles(outcome: Any) -> None:
    print("\n13-5  역량별 깊이 프로파일")
    print(f"  분류체계     {outcome.taxonomy_version_id or '없음'}")
    print(f"  역량         {outcome.capability_count}개")
    print(f"  봉투         {outcome.envelope_count}개")
    print(f"  전개         {outcome.expanded_profiles}개")
    print(f"  건너뜀       {outcome.skipped_profiles}개")
    print(f"  저장         {outcome.stored_profiles}개")
    print(f"  표본 미달    {outcome.suppressed_profiles}개")
    print(f"  입력 없음    {len(outcome.missing_input)}건")
    _report_reasons("  입력 없음 사유", _grouped(outcome.missing_input))
    _report_reasons("  실패 사유", _grouped(outcome.errors))
    if outcome.limit_reached:
        print("  한도         닿았다. 남은 프로파일은 다음 실행이 집는다")
    if outcome.halted:
        print(f"  멈춘 사유    {outcome.halted_reason}")
    print(f"  종료 사유    {outcome.stop_reason}")


def report_saturation(outcome: Any) -> None:
    print("\n13-6  표본 수렴 기록")
    print(f"  범위         {outcome.scope_id or '없음'}")
    print(f"  저장 관측    {outcome.stored_observations}건")
    print(f"  같은 관측    {outcome.repeated_observations}건")
    observation = outcome.observation
    if observation is not None:
        gain = observation.marginal_gain
        print(f"  누적 공고    {observation.posting_count}건")
        print(f"  신규 후보    {observation.new_candidate_count}개")
        print(f"  누적 차원    {observation.cumulative_dimension_count}개")
        print(f"  한계 증가량  {'없음' if gain is None else gain}")
        print(f"  첫 관측      {'예' if observation.first_observation else '아니오'}")
    _report_reasons("  실패 사유", _grouped(outcome.errors))
    if outcome.halted:
        print(f"  멈춘 사유    {outcome.halted_reason}")
    print(f"  종료 사유    {outcome.stop_reason}")


def report_verification(report: Any) -> None:
    print("\n13-4  수치 검증")
    print(f"  대상         {report.target_type} {report.target_id}")
    print(f"  실행 검사    {len(report.executed)}종")
    print(f"  실패         {len(report.failed)}건")
    print(f"  공개 차단    {len(report.blocking)}건")
    for result in report.results:
        if result.verdict is CheckVerdict.PASS:
            continue
        detail = result.detail or {}
        count = detail.get("violation_count")
        print(
            f"    {result.check:<20}{result.verdict:<6}{result.reason_code or ''}"
            f"{'' if count is None else f'  위반 {count}건'}"
        )
    print(f"  기록         {len(report.results)}건 가운데 실행한 검사만 남긴다")


def _grouped(pairs: Sequence[tuple[str, str]]) -> list[tuple[str, int]]:
    """`(대상, 사유)` 목록을 사유별 건수로 접는다. 많은 것부터다."""
    counts: dict[str, int] = {}
    for _, reason in pairs:
        counts[reason] = counts.get(reason, 0) + 1
    return sorted(counts.items(), key=lambda item: (-item[1], item[0]))


def _counted(counts: dict[str, int]) -> list[tuple[str, int]]:
    return sorted(counts.items(), key=lambda item: (-item[1], item[0]))


def _report_reasons(title: str, grouped: Sequence[tuple[str, int]]) -> None:
    """사유별 건수를 찍는다. 많은 것부터 다섯 줄까지다."""
    if not grouped:
        return
    print(title)
    for reason, count in grouped[:5]:
        print(f"    {count}건  {reason}")
    if len(grouped) > 5:
        print(f"    (사유 {len(grouped) - 5}가지 더 있다)")


def _spread(counts: dict[str, int]) -> str:
    """`{키: 수}` 를 한 줄로 편다. 비면 그렇다고 적는다."""
    if not counts:
        return "없음"
    return "  ".join(f"{key} {value}" for key, value in sorted(counts.items()))


# ================================================================ 실행
@dataclass(frozen=True, slots=True)
class UnitResult:
    """단계 하나의 결과. 요약과 종료 코드가 이 값을 읽는다."""

    step: str
    stop_reason: StopReason
    summary: str = ""
    blocking: bool = False
    incomplete: str = ""


@dataclass
class DeltaSummary:
    """13-2 실행 하나의 결과.

    시간 연산자는 실행 클래스를 갖지 않는다. `metrics/temporal.py` 는 두 기간의 값을
    받아 결과 하나를 돌려주는 순수 함수이고, 어느 기간을 짝지어 어느 지표에 적용할지는
    실행이 정한다. 그 순서를 이 스크립트가 정하므로 결과도 여기서 모은다.
    """

    pairs: int = 0
    families: int = 0
    computed: int = 0
    stored: int = 0
    skipped: int = 0
    refused: int = 0
    limit_reached: bool = False
    reasons: dict[str, int] = field(default_factory=dict)
    errors: list[tuple[str, str]] = field(default_factory=list)

    @property
    def stop_reason(self) -> StopReason:
        """docs/agent-design.md 11.1의 종료 조건을 판정한다."""
        if self.errors:
            return StopReason.EXPLICIT_FAILURE
        if not self.pairs:
            return StopReason.FRONTIER_EXHAUSTED
        if self.stored:
            return StopReason.SLOTS_FILLED
        return StopReason.NO_NEW_EVIDENCE


@dataclass
class Session:
    """한 번의 스크립트 실행이 들고 다니는 값."""

    manifest: SourceManifest
    job_role_id: str
    limit: int | None
    analysis_version: str | None
    workload: Workload
    results: list[UnitResult] = field(default_factory=list)

    def envelope(self, step: str) -> RunEnvelope:
        """단계마다 분석 버전과 실행 행을 보장한다.

        `--analysis-version` 을 주면 그 버전에 실행 행만 매단다. 없는 버전을 주면
        멈춘다. 봉투가 서지 않으면 어떤 단계도 한 줄도 저장하지 못한다.
        """
        agent_name = AGENT_NAME[step]
        if self.analysis_version is None:
            return ensure_envelope(
                job_role_id=self.job_role_id,
                dataset_version=self.manifest.dataset_version,
                agent_name=agent_name,
            )
        with unit_of_work(Component.ORCHESTRATOR) as unit:
            store = OrchestratorStore(unit)
            if store.find_analysis_version(self.analysis_version) is None:
                raise SystemExit(f"분석 버전 {self.analysis_version} 이 없다")
            agent_run_id = start_agent_run(
                store, analysis_version=self.analysis_version, agent_name=agent_name
            )
        return RunEnvelope(
            analysis_version=self.analysis_version,
            agent_run_id=agent_run_id,
            created_version=False,
        )

    def context(self, step: str) -> RunContext:
        """실행 봉투 하나.

        예산의 도구 호출 한도를 1 로 둔다. Phase 13 은 외부를 부르지 않으므로 봉투의
        한도에 걸릴 자리가 없다. 집계량은 `--limit` 이 정한다.
        """
        envelope = self.envelope(step)
        return RunContext(
            agent_run_id=envelope.agent_run_id,
            analysis_version=envelope.analysis_version,
            dataset_version=self.manifest.dataset_version,
            taxonomy_version_id=None,
            job_role_id=self.job_role_id,
            scope_level=ScopeLevel.OVERALL,
            as_of_date=self.manifest.as_of_date,
            budget=Budget(max_tool_calls=1),
        )

    def record(
        self,
        step: str,
        stop_reason: StopReason,
        summary: str = "",
        errors: Sequence[tuple[str, str]] = (),
        incomplete: str = "",
    ) -> bool:
        """단계 결과를 남기고 계속 진행할지 판정한다."""
        blocking = blocks_next_units(stop_reason, errors)
        if not incomplete and errors and not blocking:
            incomplete = f"실패 {len(errors)}건"
        self.results.append(
            UnitResult(
                step=step,
                stop_reason=stop_reason,
                summary=summary,
                blocking=blocking,
                incomplete=incomplete,
            )
        )
        return not blocking


def run_unit_1(session: Session) -> bool:
    """지표 family 를 전개해 집계한다. `pipe_aggregate` 거래다.

    표본 판정과 억제(13-3)가 이 실행의 저장 경로에 붙어 있다. `PolicySampler` 가
    `metrics/policy.py` 의 판정을 실어 나르며, 임계값은 `metric_policy_versions` 의
    행이 정한다(docs/metric-spec.md 6장).
    """
    context = session.context("13-1")
    with unit_of_work(Component.PIPE_AGGREGATE) as unit:
        outcome = MetricAggregation(
            MetricRepository(unit), PolicySampler()
        ).run(context, limit=session.limit)
    report_aggregation(outcome)
    return session.record(
        "13-1",
        outcome.stop_reason,
        f"지표 행 {outcome.stored_facts}개",
        outcome.errors,
        _aggregation_incomplete(outcome),
    )


def _aggregation_incomplete(outcome: Any) -> str:
    """13-1 이 덜 끝낸 것을 한 줄로 적는다. 다 끝났으면 빈 값이다."""
    parts: list[str] = []
    if outcome.errors:
        parts.append(f"조합 {len(outcome.errors)}개 실패")
    if outcome.missing_input:
        parts.append(f"입력 없는 조합 {len(outcome.missing_input)}개")
    if outcome.limit_reached:
        parts.append("한도에 닿아 남은 조합이 있다")
    return " · ".join(parts)


def run_unit_2(session: Session) -> bool:
    """잇닿은 두 기간의 지표 값에서 변화를 계산한다. `pipe_aggregate` 거래다.

    저장된 행만 읽는다. 다시 세지 않는 이유는 두 기간의 값이 이미 같은 분석 버전에 같은
    정의로 세어져 있기 때문이다. 다시 세면 그 사이에 적재가 늘었을 때 화면의 지표와
    델타가 서로 다른 분모를 갖는다.
    """
    context = session.context("13-2")
    summary = DeltaSummary()
    with unit_of_work(Component.PIPE_AGGREGATE) as unit:
        repository = MetricRepository(unit)
        periods = [period_from_row(row) for row in repository.period_rows()]
        pairs = period_pairs(periods)
        summary.pairs = len(pairs)
        policies = [
            policy_from_row(row) for row in repository.metric_policy_rows()
        ]
        templates = _templates(repository.metric_templates())
        summary.families = len(templates)
        existing = repository.existing_fact_keys(context.analysis_version)
        for template in templates:
            _deltas_for_template(
                repository, context, template, policies, pairs, existing, summary,
                session.limit,
            )
    report_delta(summary)
    return session.record(
        "13-2",
        summary.stop_reason,
        f"델타 행 {summary.stored}개",
        summary.errors,
        "한도에 닿아 남은 델타가 있다" if summary.limit_reached else "",
    )


def _deltas_for_template(
    repository: MetricRepository,
    context: RunContext,
    template: MetricTemplate,
    policies: Sequence[Any],
    pairs: Sequence[tuple[Period, Period]],
    existing: set[tuple[str, ...]],
    summary: DeltaSummary,
    limit: int | None,
) -> None:
    """기준 지표 하나의 델타. 정책은 그 지표의 정책 행을 쓴다.

    `temporal_delta` 전용 정책 행이 없다. `statistics_facts.metric_policy_version` 이
    `metric_policy_versions` 를 참조하므로 없는 버전을 지어낼 수 없고, 델타의 신뢰도는
    두 입력의 신뢰도에 좌우되므로 기준 지표의 정책이 그 자리에 맞다. 두 입력이 같은
    정책 버전에서 나왔는지도 `metrics/temporal.py` 가 다시 확인한다.
    """
    try:
        policy = select_policy(
            policies, template.metric_family, template.formula_version
        )
    except KeyError as error:
        summary.errors.append((template.metric_family, str(error)))
        return

    for period_a, period_b in pairs:
        rows = repository.facts_for_periods(
            context.analysis_version,
            template.metric_family,
            [period_a.period_id, period_b.period_id],
        )
        prior = [
            point_from_row(row)
            for row in rows
            if str(row["period_id"]) == period_a.period_id
        ]
        latest = [
            point_from_row(row)
            for row in rows
            if str(row["period_id"]) == period_b.period_id
        ]
        for outcome in temporal_deltas(
            policy, prior, latest, period_a=period_a, period_b=period_b
        ):
            if outcome.delta is None:
                summary.refused += 1
                reason = outcome.reason or "사유 없음"
                summary.reasons[reason] = summary.reasons.get(reason, 0) + 1
                continue
            row = outcome.delta.fact_columns()
            key = delta_fact_key(row)
            if key in existing:
                summary.skipped += 1
                continue
            if limit is not None and summary.stored >= limit:
                summary.limit_reached = True
                return
            summary.computed += 1
            try:
                repository.add_fact(
                    {
                        "fact_id": fact_identifier(context.analysis_version, key),
                        "analysis_version": context.analysis_version,
                        **row,
                    }
                )
            except Exception as error:  # noqa: BLE001 - 행 하나의 실패로 멈추지 않는다
                summary.errors.append(
                    (":".join(key), f"{type(error).__name__}: {error}")
                )
                continue
            existing.add(key)
            summary.stored += 1


def run_unit_5(session: Session) -> bool:
    """저장된 `depth_distribution` 에서 역량별 기대 깊이를 만든다.

    `pipe_aggregate` 거래다. `capability_depth_profiles` 의 쓰기 주체가 집계
    파이프라인이다(docs/permission-matrix.md 3장).
    """
    context = session.context("13-5")
    with unit_of_work(Component.PIPE_AGGREGATE) as unit:
        outcome = CapabilityDepthProfiles(DepthProfileRepository(unit)).run(
            context, limit=session.limit
        )
    report_profiles(outcome)
    return session.record(
        "13-5",
        outcome.stop_reason,
        f"프로파일 {outcome.stored_profiles}개",
        outcome.errors,
        "한도에 닿아 남은 프로파일이 있다" if outcome.limit_reached else "",
    )


def run_unit_6(session: Session) -> bool:
    """공고 누적과 차원 후보 증가를 남긴다. `agent_stats` 거래다.

    `saturation_observations` 의 쓰기 주체가 D3a 분류체계 에이전트이므로 집계와 거래를
    나눈다. 이 기록은 데이터셋 충분성의 진단 자료이며 어떤 실행의 종료 사유도 아니다
    (docs/statistics-model.md 8장).
    """
    context = session.context("13-6")
    with unit_of_work(Component.AGENT_STATS) as unit:
        outcome = SaturationTracking(SaturationRepository(unit)).run(context)
    report_saturation(outcome)
    return session.record(
        "13-6",
        outcome.stop_reason,
        f"관측 {outcome.stored_observations}건",
        outcome.errors,
    )


def run_unit_4(session: Session) -> bool:
    """저장된 지표 행을 걸러지지 않은 원자 행에서 다시 세어 대조한다.

    `pipe_verify` 거래다. 검증은 전 표를 읽고 `verification_results` 에만 쓴다
    (docs/permission-matrix.md 3장·4장).

    검사 4 하나만 등록한다. 나머지 일곱은 다른 Phase 의 몫이며, 러너가 그 자리를
    `CHECK_NOT_REGISTERED` 로 채운다. 그 판정까지 저장하면 Phase 13 이 돌리지도 않은
    검사의 결과를 이 분석 버전의 기록으로 남기게 되므로 실행한 검사만 남긴다.

    검사 결과는 실행마다 한 벌이다. 같은 판정을 두 번 남기는 것이 곧 두 번 검사했다는
    기록이며, 지표 행이 늘어난 뒤의 판정은 앞선 판정과 다를 수 있다.
    """
    context = session.context("13-4")
    registry = CheckRegistry()
    with unit_of_work(Component.PIPE_VERIFY) as unit:
        reader = StatisticsAuditRepository(unit, session.manifest.as_of_date)
        registry.register(CheckName.NUMERICAL, numerical_consistency_check(reader))
        report = CheckRunner(registry).run(
            CheckContext(
                run=context,
                target_type=TARGET_AGGREGATION,
                target_id=context.analysis_version,
            )
        )
        executed = [
            result
            for result in report.results
            if result.check is CheckName.NUMERICAL
        ]
        VerificationRepository(unit).record_results(
            context.analysis_version, executed
        )
    report_verification(report)

    failed = [result for result in executed if result.verdict is CheckVerdict.FAIL]
    stop_reason = verification_stop_reason(executed)
    return session.record(
        "13-4",
        stop_reason,
        f"검사 {len(executed)}종 · 실패 {len(failed)}건",
        (),
        f"검증이 위반 {len(failed)}건을 찾았다" if failed else "",
    )


RUNNERS: dict[int, Callable[[Session], bool]] = {
    1: run_unit_1,
    2: run_unit_2,
    4: run_unit_4,
    5: run_unit_5,
    6: run_unit_6,
}


def report_summary(session: Session) -> None:
    """단계별 결과와 덜 끝난 것을 찍는다."""
    print("\n요약")
    for result in session.results:
        if result.blocking:
            mark = "실패"
        elif result.incomplete:
            mark = "일부"
        else:
            mark = "완료"
        print(
            f"  {result.step:<8}{mark}  {result.stop_reason:<20}{result.summary}"
        )
        if result.incomplete:
            print(f"                덜 끝남  {result.incomplete}")
    if not session.results:
        print("  돌린 단계가 없다")
        return

    unfinished = [result for result in session.results if result.incomplete]
    if unfinished:
        print("\n덜 끝난 것")
        for result in unfinished:
            print(f"  {result.step:<8}{result.incomplete}")
        print("  같은 명령을 다시 돌리면 남은 것부터 집는다")


# ================================================================ 인자
def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Stage E(Phase 13)를 순서대로 돌린다. 모델을 호출하지 않는다"
    )
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--job-role", default=None, help="기본값은 매니페스트의 직무")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="13-1·13-2·13-5 가 이번 실행에 집을 최대 건수",
    )
    parser.add_argument(
        "--from",
        dest="from_unit",
        type=int,
        default=FIRST_UNIT,
        help=f"시작 단위. 13-{FIRST_UNIT}~13-{LAST_UNIT}",
    )
    parser.add_argument(
        "--to",
        dest="to_unit",
        type=int,
        default=LAST_UNIT,
        help=f"마지막 단위. 13-{FIRST_UNIT}~13-{LAST_UNIT}",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="계산할 조합 수만 센다. 저장소를 읽되 쓰지 않는다",
    )
    parser.add_argument(
        "--skip-schema-check",
        action="store_true",
        help="적용된 alembic 리비전이 최신인지 확인하지 않는다",
    )
    parser.add_argument(
        "--analysis-version",
        default=None,
        help="봉투에 쓸 분석 버전. 비우면 버전 조합으로 만든다",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)

    if args.limit is not None and args.limit < 1:
        # 저장소를 열기 전에 거른다. 0 은 아무것도 하지 않는 실행이라 뜻이 없다.
        print("--limit 은 1 이상이다")
        return EXIT_ABORTED

    try:
        units = unit_range(args.from_unit, args.to_unit)
    except ValueError as error:
        print(f"구간이 잘못되었다: {error}")
        return EXIT_ABORTED

    if not args.skip_schema_check:
        problem = schema_problem()
        if problem is not None:
            print(problem)
            return EXIT_ABORTED

    manifest = SourceManifest.load(args.manifest)
    job_role_id = args.job_role or manifest.job_role_id
    analysis_version = args.analysis_version or planned_analysis_version(
        job_role_id, manifest.dataset_version
    )

    print(f"직무          {job_role_id}")
    print(f"데이터셋      {manifest.dataset_version}  기준일 {manifest.as_of_date}")
    print(f"분석 버전     {analysis_version}")
    print(f"구간          13-{args.from_unit} ~ 13-{args.to_unit}")
    print(f"돌릴 단계     {' '.join(f'13-{unit}' for unit in units)}")
    print(f"건수 제한     {args.limit if args.limit else '없음'}")
    if args.limit:
        print(LIMIT_WARNING)

    workload = gather_workload(manifest, job_role_id, analysis_version)
    print(f"활성 분류체계 {workload.taxonomy_version_id or '없음'}")
    print(f"저장된 지표   {workload.stored_facts}행")
    report_estimate(build_estimates(units, workload))

    if args.dry_run:
        print("\n쓰지 않았다. 실제로 돌리려면 --dry-run 을 뺀다")
        return EXIT_OK

    session = Session(
        manifest=manifest,
        job_role_id=job_role_id,
        limit=args.limit,
        analysis_version=args.analysis_version,
        workload=workload,
    )

    for unit in units:
        if not RUNNERS[unit](session):
            report_summary(session)
            print(f"\n13-{unit} 의 실행 전제가 깨졌다. 뒤 단계를 돌리지 않는다")
            return EXIT_FAILED

    report_summary(session)
    print(f"\n되돌리는 명령  {RESET_COMMAND}")
    if any(result.incomplete for result in session.results):
        # 뒤 단계까지 돌았으나 남긴 것이 있다. 성공으로 세지 않는다.
        return EXIT_INCOMPLETE
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
