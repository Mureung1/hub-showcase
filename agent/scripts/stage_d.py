r"""Stage D(Phase 8~12)를 순서대로 한 번에 돌린다.

실행:
    cd agent
    .\.venv\Scripts\Activate.ps1
    python scripts/stage_d.py

대상 건수와 예상 호출 수만 본다. 저장소를 읽되 쓰지 않는다:
    python scripts/stage_d.py --dry-run

결정적 대역으로 배선을 끝까지 확인한다. 모델은 부르지 않지만 대역이 만든 가짜
산출물이 저장소에 들어간다. `--stub` 만으로는 돌지 않고 `--stub-write` 를 함께
줘야 한다:
    python scripts/stage_d.py --stub --stub-write

`--stub --stub-write` 가 남긴 행은 분석에 쓸 수 없다. 되돌리는 명령은
`python scripts/reset_stage_d.py --execute` 다.

구간과 건수를 잘라 돌린다:
    python scripts/stage_d.py --from 10 --to 11 --limit 200

`--limit` 은 이미 처리한 건을 뺀 뒤 남은 것을 앞에서부터 자른다. 한 실행이 전량을
끝내지 않으므로 남은 것이 없을 때까지 같은 명령을 다시 돌린다.

단계 순서는 8 → 9 → 10 → 11 → 12 이고 근거는 docs/architecture.md 7장이다.
Phase 8~11 의 규칙은 docs/statistics-model.md 3장, Phase 12 의 그래프 층과 경로
캐시는 docs/knowledge-schema.md 7장이다.

이어달리기는 각 실행 클래스가 이미 갖고 있다. 이 스크립트는 체크포인트 파일을
만들지 않는다. Phase 8 은 이미 뽑은 청크를, Phase 9 는 이미 후보에 붙은 표현을,
Phase 10 은 이미 종결 판정을 받은 후보를, Phase 11 은 같은 분류체계 버전에서 이미
할당한 표현을, Phase 12 는 이미 만든 노드·엣지와 캐시 적중을 각각 건너뛴다. 중간에
끊겨도 같은 명령을 다시 실행하면 저장소 상태에서 이어진다.

실패를 두 갈래로 나눈다. 실행 전제가 깨진 실패만 뒤 단계를 막는다. 활성 분류체계가
없거나 봉투의 버전이 활성 버전과 어긋나거나 온톨로지가 등록되지 않은 실행은 산출물이
하나도 없고, 그 위에 다음 단계를 쌓으면 없는 입력을 있는 것처럼 다룬다. 일부 항목만
실패한 실행은 막지 않는다. 표현 1044개 가운데 245개를 붙인 실행의 245개는 그대로
쓸 수 있는 근거이며, 나머지 때문에 그래프를 만들지 않으면 이미 치른 비용을 버린다.
판정은 `blocks_next_phases` 가 하고 근거는 `PRECONDITION_REASONS` 다.

막지 않은 실패도 조용히 넘기지 않는다. 요약이 무엇이 덜 끝났는지 한 줄로 적고
종료 코드가 0이 아니다. 종료 코드는 0 정상, 1 전제가 깨져 뒤 단계를 돌리지 않음,
2 확인 거부와 인자 오류, 3 끝까지 돌았으나 덜 끝난 것이 있음이다.

실행 앞에서 적용된 alembic 리비전이 `migrations/versions/` 의 head 와 같은지 본다.
migration 을 적용하지 않은 스키마 위에서 돌면 psycopg 의 `UndefinedColumn` 이 실행
중간에 튀어나와 앞 단계의 산출물만 남는다. 어긋나면 `alembic upgrade head` 를
안내하고 종료 코드 2로 멈춘다. `--skip-schema-check` 로 건너뛴다.

단계마다 거래를 따로 연다. Phase 8~11 은 `agent_stats`, Phase 12-1 은
`agent_knowledge`, Phase 12-2·12-3 은 `pipe_lineage` 다. 근거는
docs/permission-matrix.md 3장이다.

봉투가 선언하는 분류체계 버전은 상수가 아니라 저장소의 활성 버전이며 단계마다 다시
읽는다. Phase 10 이 승격이 있을 때 새 버전을 발행하므로 실행 앞에서 한 번 읽어
고정하면, Phase 11·12 가 실제로 쓰는 버전과 봉투의 선언이 갈린다. 분석 버전 식별자는
분류체계 버전을 재료로 삼으므로 발행이 있었던 실행은 Phase 11 부터 다른 분석 버전에
쌓이고, 요약 앞에 그 사실을 한 줄 적는다. 앞 단계의 산출물은 이전 분석 버전에 그대로
남으며 그것이 옳다. 다른 분류체계로 계산한 결과는 다른 분석 버전이다
(docs/architecture.md 8장·docs/erd.md 11.1).

실행 앞에서 활성 분류체계 버전이 있는지 본다. 없으면, 또는 `--analysis-version` 이
가리킨 분석 버전이 선언한 분류체계와 활성 버전이 다르면 한 단계도 돌리지 않고 종료
코드 1로 멈춘다.

비용 단가(`CHAT_PRICE_PER_CALL`, `EMBEDDING_PRICE_PER_REQUEST`)는 확인 후 갱신한다.
기본값은 0이며 0인 항목은 금액 대신 "단가 미설정" 으로 표시한다. 확인하지 않은
단가로 계산한 금액은 예산 판단에 그대로 쓰이므로, 틀린 금액을 찍는 것보다 호출
수만 찍는 쪽이 안전하다.
"""

from __future__ import annotations

import argparse
import math
import re
import sys
from collections.abc import Callable, Container, Iterable, Mapping, Sequence
from dataclasses import dataclass, field
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
from careersignal.agents.statistics.agent import MentionCollector  # noqa: E402
from careersignal.agents.statistics.assigner import (  # noqa: E402
    ASSIGNMENT_TASK,
    OpenAIDimensionAssigner,
    StubDimensionAssigner,
)
from careersignal.agents.statistics.extractor import (  # noqa: E402
    EXTRACTION_TASK,
    OpenAIMentionExtractor,
    StubMentionExtractor,
)
from careersignal.agents.statistics.judge import (  # noqa: E402
    JUDGEMENT_TASK,
    OpenAIRelationJudge,
    StubRelationJudge,
)
from careersignal.contracts.run_context import (  # noqa: E402
    Budget,
    RunContext,
    StopReason,
)
from careersignal.domain.permissions import Component  # noqa: E402
from careersignal.domain.scope import ScopeLevel  # noqa: E402
from careersignal.graph.paths import GraphPathRunner  # noqa: E402
from careersignal.graph.provenance import ProvenanceGraphBuilder  # noqa: E402
from careersignal.graph.semantic import (  # noqa: E402
    NO_ONTOLOGY,
    ONTOLOGY_VERSION,
    SemanticGraphBuilder,
)
from careersignal.orchestration.envelope import (  # noqa: E402
    Envelope,
    OrchestratorStore,
    active_taxonomy_version_id,
    declared_taxonomy_mismatch,
    ensure_envelope,
    start_agent_run,
)
from careersignal.providers.concurrency import default_workers  # noqa: E402
from careersignal.providers.embeddings import (  # noqa: E402
    DEFAULT_BATCH_SIZE,
    OpenAIEmbeddingClient,
)
from careersignal.providers.models import chat_model  # noqa: E402
from careersignal.repositories.assignment import AssignmentRepository  # noqa: E402
from careersignal.repositories.base import unit_of_work  # noqa: E402
from careersignal.repositories.graph_paths import GraphPathRepository  # noqa: E402
from careersignal.repositories.knowledge_graph import (  # noqa: E402
    SemanticGraphRepository,
)
from careersignal.repositories.lineage import LineageGraphRepository  # noqa: E402
from careersignal.repositories.promotion import PromotionRepository  # noqa: E402
from careersignal.repositories.statistics import StatisticsRepository  # noqa: E402
from careersignal.taxonomy.assignment import (  # noqa: E402
    RequirementAssignment,
    group_reasons,
    unrecoverable_exception,
)
from careersignal.taxonomy.discovery import (  # noqa: E402
    NO_ACTIVE_TAXONOMY,
    REJUDGE_EXCLUDED,
    TAXONOMY_MISMATCH,
    CandidateDiscovery,
    candidate_identifier,
)
from careersignal.taxonomy.promotion import (  # noqa: E402
    UNKNOWN_POLICY,
    CandidateReview,
)
from careersignal.taxonomy.publication import TaxonomyPublication  # noqa: E402
from careersignal.taxonomy.vocabulary import (  # noqa: E402
    Vocabulary,
    normalize_expression,
)

DEFAULT_MANIFEST = ROOT / "data" / "manifest" / "backend.json"
MIGRATION_VERSIONS = ROOT / "migrations" / "versions"

RESET_COMMAND = "python scripts/reset_stage_d.py --execute"
"""이 스크립트가 저장소에 남긴 것을 되돌리는 명령. `scripts/reset_stage_d.py` 다."""

FIRST_PHASE = 8
LAST_PHASE = 12
PHASES: tuple[int, ...] = tuple(range(FIRST_PHASE, LAST_PHASE + 1))

PHASE_LABEL: dict[int, str] = {
    8: "요구 표현 추출",
    9: "차원 후보 발견",
    10: "승격 심사와 버전 발행",
    11: "할당",
    12: "그래프 구축과 경로 캐시",
}

PHASE_TASK: dict[int, str | None] = {
    8: EXTRACTION_TASK,
    9: JUDGEMENT_TASK,
    10: None,
    11: ASSIGNMENT_TASK,
    12: None,
}
"""Phase 마다 부르는 작업 이름. `providers/models.py` 의 `TASK_TIER` 가 등급을 정한다.

Phase 10 과 12 는 저장소 조회와 순수 함수만 쓰므로 부르는 작업이 없다. 모델
식별자를 여기 적지 않는다. 작업과 모델의 대응은 `TASK_TIER` 와
`OPENAI_CHAT_MODELS` 하나만 갖는다.
"""

AGENT_NAME: dict[str, str] = {
    "8": "statistics_extraction",
    "9": "taxonomy_discovery",
    "10": "taxonomy_promotion",
    "11": "taxonomy_assignment",
    "12-1": "knowledge_semantic",
    "12-2": "lineage_provenance",
    "12-3": "lineage_paths",
}
"""`agent_runs.agent_name` 에 남길 이름. 단계마다 실행 행을 따로 만든다."""

CURRENCY = "USD"

CHAT_PRICE_PER_CALL: dict[str, float] = {}
"""모델 식별자별 호출 한 번의 단가. 이 값은 확인 후 갱신한다.

비어 있거나 0 이면 금액을 계산하지 않고 "단가 미설정" 으로 표시한다. 값을 채울
때는 `providers/models.py` 의 `OPENAI_CHAT_MODELS` 식별자를 키로 쓴다.
"""

EMBEDDING_PRICE_PER_REQUEST = 0.0
"""임베딩 요청 한 번의 단가. 이 값은 확인 후 갱신한다."""

EXIT_OK = 0
EXIT_FAILED = 1
EXIT_ABORTED = 2
EXIT_INCOMPLETE = 3
"""끝까지 돌았으나 덜 끝난 것이 있다.

`EXIT_FAILED` 와 가른다. 앞은 뒤 단계를 돌리지 못한 실행이고 뒤는 뒤 단계까지 돌되
일부 항목을 남긴 실행이다. 두 상태의 다음 할 일이 다르다. 앞은 전제를 고쳐 처음부터
다시 돌려야 하고, 뒤는 남은 것만 같은 명령으로 이어 돌리면 된다. 0 이 아닌 값을 내는
이유는 자동 실행이 이 실행을 성공으로 세지 않게 하기 위해서다.
"""

PRECONDITION_REASONS: frozenset[str] = frozenset(
    {
        NO_ACTIVE_TAXONOMY,
        TAXONOMY_MISMATCH,
        UNKNOWN_POLICY,
        NO_ONTOLOGY,
    }
)
"""실행 전제가 깨졌음을 알리는 사유.

각 실행 클래스가 전제 확인에 실패했을 때 `errors` 에 적는 문구다. 사유 문구로
판정하는 이유는 결과 모델이 단계마다 다르고 공통 표식이 없기 때문이다. 문구는
각 모듈의 상수에서 그대로 가져오므로 문구가 바뀌면 이 집합도 함께 바뀐다.

- `NO_ACTIVE_TAXONOMY` 활성 분류체계 버전이 없다. 붙일 차원도 발행할 버전도 없다.
- `TAXONOMY_MISMATCH` 봉투가 가리키는 버전과 활성 버전이 다르다. 어느 버전의
  통계인지 정할 수 없다.
- `UNKNOWN_POLICY` 등록되지 않은 승격 정책 버전이다. 심사 임계값을 정할 수 없다.
- `NO_ONTOLOGY` 온톨로지 버전이 등록되어 있지 않다. 노드와 엣지의 유형을 정할 수
  없다.

실행 봉투를 세우지 못하는 경우는 여기에 없다. `Session.envelope` 가 `SystemExit`
를 던지므로 단계가 결과 모델을 만들기 전에 실행이 끝난다.
"""

UNSET_PRICE = "단가 미설정 — 호출 수만 표시"

LIMIT_WARNING = (
    "              --limit 은 남은 건을 앞에서부터 자른다. 한 실행이 전량을 끝내지"
    "\n              않으므로 남은 것이 없을 때까지 다시 돌린다"
)
"""`--limit` 의 뜻.

`chunks_to_extract`·`mentions_to_discover`·`mentions_to_assign` 이 이미 처리한 건을
`NOT EXISTS` 로 먼저 뺀 뒤 SQL 의 `LIMIT` 으로 자른다. 그래서 `--limit` 은 전체가
아니라 남은 것을 앞에서부터 집으며, 같은 값으로 이어 돌리면 실행마다 앞으로 나아간다.
"""


STUB_REFUSAL = """
대역(`--stub`)만으로는 돌리지 않는다. 대역 실행도 저장소에 쓴다.

무엇을 하려는지에 따라 하나를 고른다.
  쓰지 않고 대상 건수만 본다
      python scripts/stage_d.py --dry-run
  대역이 만든 가짜 산출물이 저장소에 들어가는 것을 알고도 배선을 끝까지 확인한다
      python scripts/stage_d.py --stub --stub-write
"""
"""`--stub` 단독 실행을 거부할 때 보여 주는 안내.

대역은 모델을 부르지 않을 뿐 저장 경로는 실제와 같다. 배선 확인이 목적인 실행이
실데이터를 오염시키면 목적보다 피해가 크므로, 쓰겠다는 뜻을 `--stub-write` 로
따로 받는다.
"""


# ================================================================ 순수 함수
def stub_needs_permission(stub: bool, stub_write: bool, dry_run: bool) -> bool:
    """`--stub` 단독 실행인가. 참이면 거부한다.

    `--dry-run` 은 저장소를 읽기만 하므로 대역과 함께 써도 오염이 없다.
    `--stub-write` 는 쓰겠다는 뜻을 밝힌 것이므로 통과시킨다.
    """
    return stub and not stub_write and not dry_run


def precondition_failed(errors: Sequence[tuple[str, str]]) -> bool:
    """실행 전제가 깨졌는가. 사유 문구로 판정한다.

    전제가 깨진 실행은 산출물이 하나도 없다. 활성 분류체계가 없으면 붙일 차원이
    없고, 온톨로지가 없으면 노드 유형이 없다. 한 항목이 실패한 것과 근본이 다르다.
    """
    return any(reason in PRECONDITION_REASONS for _, reason in errors)


def blocks_next_phases(
    stop_reason: StopReason, errors: Sequence[tuple[str, str]] = ()
) -> bool:
    """이 결과 위에 다음 단계를 쌓을 수 없는가.

    막는 것은 실행 전제가 깨진 실패뿐이다. 근거는 두 가지다.

    첫째, 부분 성공은 성공한 만큼 정당하다. 표현 1044개 가운데 245개를 붙인 실행의
    245개는 검증을 기다리는 정상 할당이며, 나머지가 실패했다는 이유로 그래프를
    만들지 않으면 이미 치른 모델 호출 비용을 버린다. 뒤 단계도 이어달리기를 하므로
    남은 표현을 다음 실행이 붙이면 그때 노드와 엣지가 더 만들어진다.

    둘째, 전제가 깨진 실행은 부분 성공이 아니다. 활성 분류체계가 없는 실행은 0개를
    붙였고 그 위의 그래프는 빈 그래프가 아니라 잘못된 그래프다. 없는 분류체계를
    가리키는 노드를 만들면 뒤 실행이 그 자국을 다시 지워야 한다.

    `explicit_failure` 가 아닌 종료 사유는 막지 않는다. `budget_exhausted` 는 한도를
    다 쓴 것이고 `no_new_evidence` 는 더할 근거가 없는 것이며, 둘 다 지금까지의
    산출물이 온전하다.
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
`down_revision = None` 은 잡지 않는다. 첫 리비전에는 앞 리비전이 없으므로 부모
집합에 넣을 값도 없다.
"""


def migration_head(versions_dir: Path) -> str:
    """`migrations/versions/` 가 가리키는 마지막 리비전.

    파일에 적힌 `revision` 과 `down_revision` 선언을 읽어, 아무도 앞 리비전으로
    지목하지 않은 리비전 하나를 head 로 본다. 사슬이 끊겨 head 후보가 없거나
    여럿이면 판정하지 않고 예외를 던진다. 조용히 하나를 고르면 최신이 아닌 스키마를
    최신이라고 답한다.

    alembic 을 import 해 `ScriptDirectory` 로 head 를 묻는 방법도 있다. 이 자리에는
    파일을 읽는 쪽을 쓴다. 세 가지 이유다. 첫째, 이 스크립트는 파이프라인 실행
    경로이고 alembic 은 스키마를 바꿀 때만 쓰는 도구다. 실행 경로가 migration
    프레임워크를 불러야 시작할 수 있게 만들지 않는다. 둘째, `ScriptDirectory` 는
    `alembic.ini` 의 `script_location` 을 현재 작업 디렉터리 기준으로 푸는데 이
    스크립트는 어디서 실행해도 `ROOT` 기준으로 동작해야 하므로 설정을 다시 짜야
    한다. 셋째, 리비전 선언만 읽는 함수는 저장소도 alembic 도 없이 임시 디렉터리로
    검사할 수 있어 이 판정 자체에 테스트가 붙는다.

    파일 이름의 번호는 보지 않는다. 이름은 사람이 붙이는 값이라 사슬과 어긋날 수
    있고, 실제 순서를 정하는 것은 `down_revision` 선언이다.
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


def phase_range(start: int, end: int) -> tuple[int, ...]:
    """돌릴 Phase 번호를 차례로 펼친다.

    범위 밖이거나 순서가 뒤집힌 값은 받지 않는다. 잘못된 구간을 조용히 좁히면
    사용자가 돌았다고 믿는 단계가 실제로는 빠진다.
    """
    if start < FIRST_PHASE or end > LAST_PHASE:
        raise ValueError(f"Phase 는 {FIRST_PHASE}~{LAST_PHASE} 사이다")
    if start > end:
        raise ValueError("--from 은 --to 보다 클 수 없다")
    return tuple(range(start, end + 1))


def phase_model(phase: int, stub: bool = False) -> str | None:
    """이 Phase 가 부르는 모델 식별자. 부르지 않으면 비운다.

    대역을 쓰면 어느 Phase 도 모델을 부르지 않는다.
    """
    task = PHASE_TASK[phase]
    if stub or task is None:
        return None
    return chat_model(task)


def embedding_requests(text_count: int, batch_size: int = DEFAULT_BATCH_SIZE) -> int:
    """문자열 묶음을 보내는 데 필요한 요청 수.

    `OpenAIEmbeddingClient` 가 `batch_size` 개씩 끊어 보내므로 요청 수는 올림이다.
    """
    if batch_size < 1:
        raise ValueError("batch_size 는 1 이상이다")
    if text_count <= 0:
        return 0
    return math.ceil(text_count / batch_size)


def discovery_call_count(
    rows: Sequence[Mapping[str, Any]],
    linked: Container[str],
    known: Callable[[str], bool],
    taxonomy_id: str,
    existing: Container[str],
) -> tuple[int, int, int]:
    """Phase 9 의 `(잔여 표현 수, 판정 호출 수, 재사용 후보 수)`.

    `CandidateDiscovery` 의 갈래를 그대로 따라 센다. 이미 후보에 붙은 표현과 기지
    어휘가 설명하는 표현은 판정을 부르지 않고, 매칭 키가 비는 표현은 후보가 되지
    않는다. 이미 있는 후보에는 근거만 더하므로 판정을 다시 부르지 않는다.
    """
    residual = 0
    fresh: set[str] = set()
    reused: set[str] = set()
    for row in rows:
        if row["mention_id"] in linked:
            continue
        expression = row["raw_expression"]
        if known(expression):
            continue
        key = normalize_expression(expression)
        if not key:
            continue
        residual += 1
        if candidate_identifier(taxonomy_id, key) in existing:
            reused.add(key)
        else:
            fresh.add(key)
    return residual, len(fresh), len(reused)


def assignment_call_count(
    rows: Sequence[Mapping[str, Any]],
    assigned: Container[str],
    known: Callable[[str], bool],
) -> tuple[int, int]:
    """Phase 11 의 `(대상 표현 수, 별칭 일치로 끝나는 표현 수)`.

    별칭 일치는 결정적 대조라 임베딩도 모델도 보지 않는다. 나머지가 벡터 근접과
    모델 판정으로 흐르며, 모델 판정 호출 수의 상한이 된다.
    """
    targets = 0
    exact = 0
    for row in rows:
        if row["mention_id"] in assigned:
            continue
        targets += 1
        if known(row["raw_expression"]):
            exact += 1
    return targets, exact


@dataclass(frozen=True, slots=True)
class PhaseEstimate:
    """Phase 하나의 예상 작업량."""

    phase: int
    targets: int = 0
    """이번 실행이 집는 대상 건수."""

    chat_model: str | None = None
    chat_calls: int = 0
    embedded_texts: int = 0
    """임베딩에 보낼 문자열 수. 요청 수는 묶음 크기로 나눈다."""

    upper_bound: bool = False
    """호출 수가 상한인가. 사슬 앞 단계가 더 걷어낼 수 있으면 참이다."""

    note: str = ""

    @property
    def embedding_calls(self) -> int:
        return embedding_requests(self.embedded_texts)


def calls_by_model(estimates: Iterable[PhaseEstimate]) -> dict[str, int]:
    """모델 식별자별 호출 수 합계. 호출이 없는 모델은 담지 않는다."""
    totals: dict[str, int] = {}
    for estimate in estimates:
        if estimate.chat_model is None or estimate.chat_calls <= 0:
            continue
        totals[estimate.chat_model] = (
            totals.get(estimate.chat_model, 0) + estimate.chat_calls
        )
    return totals


def estimate_cost(
    chat_calls: Mapping[str, int],
    embedding_calls: int = 0,
    prices: Mapping[str, float] | None = None,
    embedding_price: float | None = None,
) -> tuple[float, tuple[str, ...]]:
    """`(계산한 금액, 단가가 없는 항목 이름)`.

    단가가 0 이거나 등록되지 않은 항목은 금액에 넣지 않고 이름만 돌려준다. 확인하지
    않은 단가를 0 으로 계산하면 총액이 실제보다 작게 나와 예산 판단을 뒤집는다.
    """
    table = CHAT_PRICE_PER_CALL if prices is None else prices
    unit = EMBEDDING_PRICE_PER_REQUEST if embedding_price is None else embedding_price

    total = 0.0
    unpriced: list[str] = []
    for model, count in sorted(chat_calls.items()):
        price = table.get(model, 0.0)
        if price > 0:
            total += price * count
        elif count > 0:
            unpriced.append(model)
    if embedding_calls > 0:
        if unit > 0:
            total += unit * embedding_calls
        else:
            unpriced.append("임베딩")
    return total, tuple(unpriced)


# ================================================================ 작업량 조회
@dataclass(frozen=True, slots=True)
class Workload:
    """저장소가 알려 준 남은 작업량."""

    taxonomy_version_id: str | None = None
    vocabulary_size: int = 0

    chunks: int = 0
    """Phase 8 이 집을 청크."""

    mentions: int = 0
    """Phase 9 가 볼 표현."""

    residual: int = 0
    judgements: int = 0
    reused_candidates: int = 0

    rejudgements: int = 0
    """판정 기준 버전이 활성 버전과 달라 다시 판정할 후보.

    첫 판정과 같은 예산을 쓰므로 Phase 9 의 호출 수에 더한다. 새 분류체계 버전을
    발행한 직후에 커지고, 재판정을 마치면 다음 실행에서 0 으로 돌아간다.
    """

    candidates: int = 0
    """Phase 10 이 심사할 후보."""

    assignable: int = 0
    alias_hits: int = 0
    """Phase 11 에서 별칭 일치로 끝나는 표현."""

    def discovery_calls(self) -> int:
        """Phase 9 가 부를 모델 호출 수.

        첫 판정과 재판정을 함께 센다. 둘 다 모델 호출 하나이며 발견은 하나의 예산에서
        둘을 꺼내 쓴다(`taxonomy/discovery.py` 의 `_propose` 와 `_rejudge`).

        예상 호출 수와 실행 봉투의 예산이 **이 함수 하나에서** 나온다. 두 자리에서
        따로 더하면 한쪽만 고쳐졌을 때 값이 갈리고, 예산이 재판정을 빼먹으면 잔여
        표현이 0 인 실행이 재판정을 시작하기도 전에 `budget_exhausted` 로 끝난다.
        """
        return self.judgements + self.rejudgements

    def assignment_residual(self) -> int:
        return max(self.assignable - self.alias_hits, 0)


def build_estimates(
    phases: Sequence[int], workload: Workload, stub: bool = False
) -> tuple[PhaseEstimate, ...]:
    """Phase 별 예상 호출을 세운다.

    대역을 쓰면 외부 호출이 0 이다. 대상 건수는 그대로 두어 무엇을 처리하는지는
    보이게 한다.
    """
    residual = workload.assignment_residual()
    labels = workload.vocabulary_size if residual else 0
    rows: dict[int, PhaseEstimate] = {
        8: PhaseEstimate(
            phase=8,
            targets=workload.chunks,
            chat_model=phase_model(8, stub),
            chat_calls=0 if stub else workload.chunks,
        ),
        9: PhaseEstimate(
            phase=9,
            targets=workload.mentions,
            chat_model=phase_model(9, stub),
            chat_calls=0 if stub else workload.discovery_calls(),
            note=(
                f"잔여 {workload.residual}개 · 재사용 후보 "
                f"{workload.reused_candidates}개 · 재판정 {workload.rejudgements}개"
            ),
        ),
        10: PhaseEstimate(
            phase=10,
            targets=workload.candidates,
            note="심사 규칙은 순수 함수다",
        ),
        11: PhaseEstimate(
            phase=11,
            targets=workload.assignable,
            chat_model=phase_model(11, stub),
            chat_calls=0 if stub else residual,
            embedded_texts=0 if stub else (labels + residual),
            upper_bound=not stub and residual > 0,
            note=f"별칭 일치 {workload.alias_hits}개는 외부 호출 없이 끝난다",
        ),
        12: PhaseEstimate(
            phase=12,
            note="그래프 구축과 탐색은 저장소 조회만 쓴다",
        ),
    }
    return tuple(rows[phase] for phase in phases)


def gather_workload(
    manifest: SourceManifest, job_role_id: str, limit: int | None
) -> Workload:
    """저장소를 읽어 남은 작업량을 센다. 쓰지 않는다.

    건수를 상수로 두지 않는다. 이어달리기가 대상 수를 줄이므로 상수는 실행할수록
    실제와 멀어진다.
    """
    with unit_of_work(Component.AGENT_STATS) as unit:
        statistics = StatisticsRepository(unit)
        promotion = PromotionRepository(unit)
        assignment = AssignmentRepository(unit)

        chunk_rows = statistics.chunks_to_extract(
            manifest.dataset_version, job_role_id, limit
        )
        extracted = statistics.extracted_chunks(manifest.dataset_version)
        chunks = sum(1 for row in chunk_rows if row["chunk_id"] not in extracted)

        active = statistics.active_taxonomy_version(job_role_id)
        if active is None:
            return Workload(chunks=chunks)

        taxonomy_id = active["taxonomy_id"]
        taxonomy_version_id = active["taxonomy_version_id"]
        vocabulary = Vocabulary.from_rows(
            taxonomy_version_id,
            statistics.active_dimensions(taxonomy_version_id),
            statistics.active_aliases(taxonomy_version_id),
        )
        def known(expression: str) -> bool:
            """기지 어휘가 이 표현을 설명하는가."""
            return vocabulary.match(expression) is not None

        mention_rows = statistics.mentions_to_discover(
            manifest.dataset_version, job_role_id, limit
        )
        linked = statistics.candidate_mentions(manifest.dataset_version)
        residual, judgements, reused = discovery_call_count(
            mention_rows,
            linked,
            known,
            taxonomy_id,
            statistics.candidate_ids(taxonomy_id),
        )

        rejudgements = len(
            statistics.stale_candidates(
                taxonomy_id, taxonomy_version_id, REJUDGE_EXCLUDED, limit
            )
        )

        candidates = len(
            promotion.candidates_to_review(taxonomy_id, taxonomy_version_id, limit)
        )

        assign_rows = assignment.mentions_to_assign(
            manifest.dataset_version, job_role_id, taxonomy_version_id, limit
        )
        done = assignment.assigned_mentions(
            manifest.dataset_version, taxonomy_version_id
        )
        assignable, alias_hits = assignment_call_count(assign_rows, done, known)

    return Workload(
        taxonomy_version_id=taxonomy_version_id,
        vocabulary_size=len(vocabulary.dimensions),
        chunks=chunks,
        mentions=sum(1 for row in mention_rows if row["mention_id"] not in linked),
        residual=residual,
        judgements=judgements,
        reused_candidates=reused,
        rejudgements=rejudgements,
        candidates=candidates,
        assignable=assignable,
        alias_hits=alias_hits,
    )


def applied_revision() -> str | None:
    """`alembic_version` 에 적힌 리비전. 표가 없거나 비어 있으면 비운다.

    조회는 읽기이고 모든 구성요소 role 이 SELECT 를 갖는다
    (`0004_component_grants.sql`). 오케스트레이터 거래로 읽어 이 스크립트가
    저장소에 붙는 방식을 하나로 둔다.
    """
    with unit_of_work(Component.ORCHESTRATOR) as unit:
        return unit.fetch_value("SELECT version_num FROM alembic_version")


SKIP_HINT = "  확인을 건너뛰려면 --skip-schema-check 를 붙인다"
UPGRADE_HINT = "  alembic upgrade head 를 먼저 돌린다"

ENVELOPE_NO_TAXONOMY = "활성 분류체계 버전이 없다. 봉투가 선언할 버전이 없다"
PUBLISH_HINT = (
    "  migrations/sql/0002_seed_reference.sql 이 첫 버전을 만든다."
    " alembic upgrade head 를 먼저 돌린다"
)
MISMATCH_HINT = (
    "  --analysis-version 을 빼고 돌리면 활성 분류체계로 새 분석 버전을 만든다"
)
"""분석 버전이 선언한 분류체계 버전과 활성 버전이 어긋났을 때의 안내.

갈린 채로 돌면 Phase 11 은 활성 버전의 차원에 표현을 붙이고 봉투는 다른 버전을
선언한 채로 남는다. 그 위에서 Phase 13 이 세면 분석 버전이 선언한 버전으로 다시 세는
13-4 가 할당을 하나도 찾지 못한다. 실행을 시작하지 않는 편이 그 결과를 만들고 지우는
것보다 싸다.
"""


def envelope_problem(
    job_role_id: str, analysis_version: str | None
) -> str | None:
    """봉투를 세울 수 없으면 사유와 안내를, 세울 수 있으면 비운다.

    실행 앞에서 본다. 활성 분류체계 버전이 없으면 봉투가 선언할 버전이 없고,
    `--analysis-version` 이 가리킨 분석 버전이 다른 분류체계를 선언하고 있으면
    선언과 계산이 갈린 채로 산출물이 쌓인다. 둘 다 한 단계도 돌리기 전에 멈춘다.
    """
    active = active_taxonomy_version_id(job_role_id)
    if active is None:
        return f"{ENVELOPE_NO_TAXONOMY}\n{PUBLISH_HINT}"
    if analysis_version is None:
        return None
    mismatch = declared_taxonomy_mismatch(analysis_version, active)
    return None if mismatch is None else f"{mismatch}\n{MISMATCH_HINT}"


def schema_problem(versions_dir: Path = MIGRATION_VERSIONS) -> str | None:
    """스키마가 최신이 아니면 사유와 안내를, 최신이면 비운다.

    판정할 수 없는 경우도 사유로 돌려준다. 확인하지 못한 것을 확인했다고 볼 수
    없다. 사유마다 안내가 다르다. 스키마가 뒤처진 것과 head 를 읽지 못한 것은
    할 일이 다르므로 `alembic upgrade head` 를 한 문구로 뭉뚱그리지 않는다.
    """
    try:
        head = migration_head(versions_dir)
    except (OSError, ValueError) as error:
        return f"마이그레이션 head 를 정하지 못했다: {error}\n{SKIP_HINT}"
    try:
        applied = applied_revision()
    except Exception as error:  # noqa: BLE001 - 드라이버 예외 종류를 가리지 않는다
        return (
            f"alembic_version 을 읽지 못했다: {error}\n{UPGRADE_HINT}\n{SKIP_HINT}"
        )
    if schema_is_current(applied, head):
        return None
    return (
        f"스키마가 최신이 아니다. 적용됨 {applied or '없음'} · 최신 {head}\n"
        f"{UPGRADE_HINT}\n{SKIP_HINT}"
    )


def offline_workload(args: argparse.Namespace) -> Workload:
    """저장소에 붙지 못할 때 인자로 받은 건수로 작업량을 세운다.

    기지 어휘와 이미 만든 후보를 모르므로 호출 수가 상한이다. Phase 9 는 표현 하나
    마다 후보 하나를, Phase 11 은 표현 전부가 모델까지 흐르는 경우를 가정한다.
    """
    return Workload(
        chunks=args.offline_chunks,
        mentions=args.offline_mentions,
        residual=args.offline_mentions,
        judgements=args.offline_mentions,
        candidates=args.offline_mentions,
        assignable=args.offline_assignables,
        alias_hits=0,
    )


# ================================================================ 출력
def report_estimate(
    estimates: Sequence[PhaseEstimate], stub: bool, offline: bool
) -> tuple[int, int]:
    """예상 호출 수와 비용을 찍고 `(모델 호출 합, 임베딩 요청 합)` 을 돌려준다."""
    print("\n예상 호출")
    for estimate in estimates:
        label = PHASE_LABEL[estimate.phase]
        print(f"  Phase {estimate.phase:<3}{label}")
        print(f"    대상        {estimate.targets}건")
        if estimate.chat_model and estimate.chat_calls:
            bound = "최대 " if estimate.upper_bound else ""
            print(f"    모델        {estimate.chat_model}  {bound}{estimate.chat_calls}회")
        else:
            print("    모델        호출 없음")
        if estimate.embedding_calls:
            print(
                f"    임베딩      요청 {estimate.embedding_calls}회 "
                f"· 문자열 {estimate.embedded_texts}개"
            )
        if estimate.note:
            print(f"    비고        {estimate.note}")

    totals = calls_by_model(estimates)
    embeddings = sum(estimate.embedding_calls for estimate in estimates)
    chat_total = sum(totals.values())

    print("\n  모델별 합계")
    if totals:
        for model, count in sorted(totals.items()):
            print(f"    {model}  {count}회")
    else:
        print("    없음")
    print(f"    임베딩 요청  {embeddings}회")

    amount, unpriced = estimate_cost(totals, embeddings)
    print("\n  예상 비용")
    if unpriced:
        print(f"    {UNSET_PRICE}")
        print(f"    단가 없는 항목  {', '.join(unpriced)}")
    if amount > 0:
        print(f"    합계        {amount:,.2f} {CURRENCY}")
    elif not unpriced:
        print("    없음")

    if stub:
        print("\n  대역 실행이므로 모델과 임베딩을 호출하지 않는다")
    if offline:
        print("\n  저장소를 읽지 않았다. 위 수는 인자로 받은 건수에 대한 상한이다")
    return chat_total, embeddings


def report_extraction(outcome: Any) -> None:
    print("\nPhase 8  요구 표현 추출")
    print(f"  대상 청크    {outcome.visited_chunks}개")
    print(f"  건너뜀       {outcome.skipped_chunks}개")
    print(f"  새 mention   {outcome.created_mentions}개")
    print(f"  자리 못 찾음 {len(outcome.discarded)}개")
    print(f"  실패         {len(outcome.errors)}건")
    _report_reasons("  실패 사유", group_reasons(outcome.errors))
    print(f"  종료 사유    {outcome.stop_reason}")


def report_discovery(outcome: Any) -> None:
    print("\nPhase 9  차원 후보 발견")
    print(f"  분류체계     {outcome.taxonomy_version_id or '없음'}")
    print(f"  어휘 크기    {outcome.vocabulary_size}개")
    print(f"  방문 표현    {outcome.visited_mentions}개")
    print(f"  건너뜀       {outcome.skipped_mentions}개")
    print(f"  기지         {outcome.known_mentions}개")
    print(f"  잔여         {outcome.residual_mentions}개")
    print(f"  새 후보      {outcome.created_candidates}개")
    print(f"  재사용 후보  {outcome.reused_candidates}개")
    print(
        f"  재판정 후보  {outcome.rejudged_candidates}개"
        f" / 대상 {outcome.stale_candidates}개"
    )
    print(f"  판정 호출    {outcome.judged}회")
    print(
        f"  남은 대상    표현 묶음 {outcome.pending_groups}개 · "
        f"재판정 {outcome.pending_rejudgements}개"
    )
    print(f"  판정별       {_spread(outcome.relations)}")
    _report_reasons("  실패 사유", group_reasons(outcome.errors))
    print(f"  종료 사유    {outcome.stop_reason}")


def report_publication(outcome: Any) -> None:
    print("\nPhase 10  승격 심사와 버전 발행")
    print(f"  심사 후보    {outcome.reviewed}개")
    print(
        f"  판정         promote {outcome.promoted}  hold {outcome.held}  "
        f"reject {outcome.rejected}  merge {outcome.merged}"
    )
    if outcome.published:
        print(f"  발행 버전    {outcome.taxonomy_version_id} (v{outcome.version_number})")
        print(f"  이전 버전    {outcome.previous_taxonomy_version_id or '없음'}")
        print(f"  활성 차원    {outcome.active_dimensions}개")
        print(
            f"  신규         차원 {outcome.created_dimensions}개  "
            f"별칭 {outcome.created_aliases}개  관계 {outcome.created_relations}개"
        )
        print(
            f"  승계         차원 {outcome.carried_dimensions}개  "
            f"별칭 {outcome.carried_aliases}개  관계 {outcome.carried_relations}개"
        )
        print(f"  종류 기본값  {outcome.defaulted_dimension_kinds}개")
        print(f"  별칭 충돌    {outcome.alias_conflicts}건")
    else:
        print("  발행 버전    없음. 승격된 후보가 없다")
    print(f"  결정 기록    {outcome.recorded_decisions}건")
    _report_reasons("  실패 사유", group_reasons(outcome.errors))
    print(f"  종료 사유    {outcome.stop_reason}")


def report_assignment(outcome: Any) -> None:
    """Phase 11 결과를 찍는다.

    실패를 세 자리로 나눠 읽는다. 방법 하나가 통째로 빠진 것, 표현 하나의 판정이
    실패한 것, 되살릴 수 없는 실패로 멈춘 것이다. 같은 사유는 묶어 세므로 429 한
    줄이 수백 번 반복되지 않는다.
    """
    print("\nPhase 11  할당")
    print(f"  분류체계     {outcome.taxonomy_version_id or '없음'}")
    print(f"  실행 방식    {'전량 재할당' if outcome.full_reassignment else '증분'}")
    print(f"  어휘 크기    {outcome.vocabulary_size}개")
    print(f"  대상 표현    {outcome.visited_mentions}개")
    print(f"  건너뜀       {outcome.skipped_mentions}개")
    print(f"  할당         {outcome.assigned_mentions}개")
    print(f"  방법별       {_spread(outcome.by_method)}")
    print(f"  임베딩       표현 {outcome.embedded_expressions}개")
    print(f"  모델 판정    {outcome.judged}회")
    print(f"  못 붙임      {len(outcome.unassigned)}개")
    print(f"  실패         {len(outcome.errors)}건")
    if outcome.unavailable_methods:
        print("  못 쓴 방법")
        for method, reason in outcome.unavailable_methods:
            print(f"    {method}  {reason}")
    _report_reasons("  실패 사유", outcome.grouped_errors())
    if outcome.halted:
        print(f"  멈춘 사유    {outcome.halted_reason}")
        print(f"  남긴 표현    {outcome.halted_pending}개. 다음 실행이 다시 집는다")
    print(f"  종료 사유    {outcome.stop_reason}")


def report_graph(title: str, outcome: Any) -> None:
    print(f"\n{title}")
    print(f"  층           {outcome.graph_layer}")
    print(f"  노드 생성    {outcome.node_count}개  {_spread(outcome.created_nodes)}")
    print(f"  노드 재사용  {sum(outcome.reused_nodes.values())}개")
    print(f"  엣지 생성    {outcome.edge_count}개  {_spread(outcome.created_edges)}")
    print(f"  엣지 재사용  {sum(outcome.reused_edges.values())}개")
    print(f"  폐기         {outcome.discarded_count}건")
    for record in outcome.discarded[:5]:
        print(f"    {record.target_id}  {record.reason_code}")
    if outcome.skipped_types:
        print("  건너뛴 유형")
        for type_name, reason in outcome.skipped_types:
            print(f"    {type_name}  {reason}")
    _report_reasons("  실패 사유", group_reasons(outcome.errors))
    print(f"  종료 사유    {outcome.stop_reason}")


def report_paths(outcome: Any) -> None:
    print("\nPhase 12-3  경로 캐시")
    print(f"  정책         {outcome.graph_policy_version}")
    print(f"  캐시 적중    {outcome.hit_count}개  {_spread(outcome.hits)}")
    print(f"  캐시 미스    {outcome.miss_count}개  {_spread(outcome.misses)}")
    print(f"  방문 노드    {_spread(outcome.visited)}")
    print(f"  가지치기     {_spread(outcome.cut_counts())}")
    print(f"  무효화       {outcome.invalidated}건")
    if outcome.skipped_types:
        print("  건너뛴 유형")
        for path_type, reason in outcome.skipped_types:
            print(f"    {path_type}  {reason}")
    _report_reasons("  실패 사유", group_reasons(outcome.errors))
    print(f"  종료 사유    {outcome.stop_reason}")


def _report_reasons(title: str, grouped: Sequence[tuple[str, int]]) -> None:
    """사유별 건수를 찍는다. 많은 것부터 다섯 줄까지다."""
    if not grouped:
        return
    print(title)
    for reason, count in grouped[:5]:
        print(f"    {count}건  {reason}")
    if len(grouped) > 5:
        print(f"    (사유 {len(grouped) - 5}가지 더 있다)")


def _spread(counts: Mapping[str, int]) -> str:
    """`{키: 수}` 를 한 줄로 편다. 비면 그렇다고 적는다."""
    if not counts:
        return "없음"
    return "  ".join(f"{key} {value}" for key, value in sorted(counts.items()))


# ================================================================ 실행
@dataclass(frozen=True, slots=True)
class PhaseResult:
    """단계 하나의 결과. 요약과 종료 코드가 이 값을 읽는다."""

    step: str
    stop_reason: StopReason
    summary: str = ""

    blocking: bool = False
    """뒤 단계를 막았는가. 실행 전제가 깨진 실패만 참이다."""

    incomplete: str = ""
    """덜 끝난 것. 비어 있으면 이 단계가 남긴 것이 없다."""


@dataclass
class Session:
    """한 번의 스크립트 실행이 들고 다니는 값."""

    manifest: SourceManifest
    job_role_id: str
    limit: int | None
    stub: bool
    analysis_version: str | None
    workload: Workload
    workers: int = 1
    """동시에 보낼 모델 요청 수. Phase 8·9·11 이 함께 쓴다.

    기본값을 1 로 두어 이 값을 넘기지 않고 만든 실행이 하나씩 부르게 한다.
    실행 스크립트는 `--workers` 의 값을 넣으며 그 기본값은 공용 상수다.
    """

    results: list[PhaseResult] = field(default_factory=list)
    published_version: bool = False
    """이번 실행의 Phase 10 이 새 분류체계 버전을 발행했는가."""

    envelope_version: str = ""
    """마지막으로 세운 봉투의 분석 버전. 갈렸을 때 한 줄 알리는 데만 쓴다."""

    def refresh(self) -> None:
        """작업량을 다시 센다.

        앞 단계가 저장소를 바꾸면 뒤 단계의 대상 수가 달라진다. Phase 8 이
        mention 을 만들면 Phase 9 의 대상이 늘고, Phase 10 이 새 버전을 발행하면
        Phase 11 의 대상이 데이터셋 전체가 된다. 시작할 때 센 수로 예산을 잡으면
        뒤 단계가 `budget_exhausted` 로 끊긴다.
        """
        self.workload = gather_workload(self.manifest, self.job_role_id, self.limit)

    def envelope(self, step: str, taxonomy_version_id: str | None = None) -> Envelope:
        """단계마다 분석 버전과 실행 행을 보장한다.

        `--analysis-version` 을 주면 그 버전에 실행 행만 매단다. 없는 버전을 주면
        멈춘다. 봉투가 서지 않으면 Phase 8~12 는 한 줄도 저장하지 못한다.

        분류체계 버전을 단계마다 다시 읽는다. 실행 앞에서 한 번 읽어 고정하면 Phase
        10 이 새 버전을 발행한 순간부터 봉투의 선언과 Phase 11·12 가 실제로 쓰는
        버전이 갈린다. 봉투는 자기가 선언한 버전으로만 계산했다고 말할 수 있어야
        하므로, 새 버전이 발행되면 그 뒤 단계는 새 분석 버전 아래에 쌓인다.
        `taxonomy_version_id` 를 주는 단계(Phase 12)는 그 단계가 실제로 쓰는 값을
        그대로 넘겨 봉투의 선언과 계산이 같은 값이 되게 한다.
        """
        agent_name = AGENT_NAME[step]
        if self.analysis_version is None:
            active = taxonomy_version_id or active_taxonomy_version_id(
                self.job_role_id
            )
            if active is None:
                raise SystemExit(f"{ENVELOPE_NO_TAXONOMY}\n{PUBLISH_HINT}")
            try:
                envelope = ensure_envelope(
                    job_role_id=self.job_role_id,
                    dataset_version=self.manifest.dataset_version,
                    agent_name=agent_name,
                    taxonomy_version_id=active,
                )
            except ValueError as error:
                raise SystemExit(f"봉투를 세우지 못했다: {error}") from error
            self.note_envelope(step, envelope.analysis_version, active)
            return envelope
        with unit_of_work(Component.ORCHESTRATOR) as unit:
            store = OrchestratorStore(unit)
            if store.find_analysis_version(self.analysis_version) is None:
                raise SystemExit(f"분석 버전 {self.analysis_version} 이 없다")
            agent_run_id = start_agent_run(
                store, analysis_version=self.analysis_version, agent_name=agent_name
            )
        return Envelope(
            analysis_version=self.analysis_version,
            agent_run_id=agent_run_id,
            created_version=False,
        )

    def note_envelope(
        self, step: str, analysis_version: str, taxonomy_version_id: str
    ) -> None:
        """봉투의 분석 버전이 앞 단계와 갈리면 한 줄 알린다.

        갈리는 것은 Phase 10 이 새 분류체계 버전을 발행했다는 뜻이다. 알리지 않으면
        사용자는 한 실행의 산출물이 두 분석 버전에 나뉘어 들어간 것을 모른 채,
        Phase 8~10 의 결과를 찾을 때 Phase 11~12 의 버전만 보게 된다.
        """
        if self.envelope_version and self.envelope_version != analysis_version:
            print(
                f"\n  분석 버전이 갈렸다. Phase {step} 부터 {analysis_version}"
                f" 를 쓴다(분류체계 {taxonomy_version_id})"
            )
            print("  Phase 10 이 새 분류체계 버전을 발행했다."
                  " 앞 단계의 산출물은 이전 분석 버전에 그대로 남는다")
        self.envelope_version = analysis_version

    def context(
        self,
        step: str,
        calls: int,
        taxonomy_version_id: str | None = None,
    ) -> RunContext:
        """실행 봉투 하나.

        예산은 이 단계가 실제로 부를 호출 수에 맞춘다. 기본값 40 으로는 청크 수천
        개를 한 번에 돌지 못하고 `budget_exhausted` 로 끊긴다.
        """
        envelope = self.envelope(step, taxonomy_version_id)
        return RunContext(
            agent_run_id=envelope.agent_run_id,
            analysis_version=envelope.analysis_version,
            dataset_version=self.manifest.dataset_version,
            taxonomy_version_id=taxonomy_version_id,
            job_role_id=self.job_role_id,
            scope_level=ScopeLevel.OVERALL,
            as_of_date=self.manifest.as_of_date,
            budget=Budget(max_tool_calls=max(calls, 1)),
        )

    def record(
        self,
        step: str,
        stop_reason: StopReason,
        summary: str = "",
        errors: Sequence[tuple[str, str]] = (),
        incomplete: str = "",
    ) -> bool:
        """단계 결과를 남기고 계속 진행할지 판정한다.

        `blocks_next_phases` 가 막을 실패와 막지 않을 실패를 가른다. 막는 것은
        실행 전제가 깨진 실패뿐이며, 그 위에 다음 단계를 쌓으면 없는 입력이
        산출물에 그대로 들어간다.

        `incomplete` 는 이 단계가 덜 끝낸 것을 사람이 읽는 한 줄로 적은 값이다.
        비워 두면 실패 건수로 채운다. 요약이 이 값을 그대로 찍고 종료 코드가
        `EXIT_INCOMPLETE` 가 되므로, 막지 않은 실패가 조용히 넘어가지 않는다.
        """
        blocking = blocks_next_phases(stop_reason, errors)
        if not incomplete and errors and not blocking:
            incomplete = f"실패 {len(errors)}건"
        self.results.append(
            PhaseResult(
                step=step,
                stop_reason=stop_reason,
                summary=summary,
                blocking=blocking,
                incomplete=incomplete,
            )
        )
        return not blocking


def run_phase_8(session: Session) -> bool:
    """청크에서 요구 표현을 뽑는다. `agent_stats` 거래다."""
    context = session.context("8", session.workload.chunks)
    extractor = StubMentionExtractor() if session.stub else OpenAIMentionExtractor()
    with unit_of_work(Component.AGENT_STATS) as unit:
        outcome = MentionCollector(
            extractor,
            StatisticsRepository(unit),
            workers=session.workers,
            stop_when=unrecoverable_exception,
        ).run(context, session.limit)
    report_extraction(outcome)
    return session.record(
        "8",
        outcome.stop_reason,
        f"mention {outcome.created_mentions}개",
        outcome.errors,
    )


def run_phase_9(session: Session) -> bool:
    """잔여 표현을 묶어 차원 후보를 만든다. `agent_stats` 거래다.

    Phase 8 이 방금 만든 mention 이 이 단계의 대상이므로 예산을 다시 센다.

    예산은 `Workload.discovery_calls` 가 준다. 예상 호출 수를 세는 자리
    (`build_estimates`)와 같은 함수를 부르므로 두 값이 갈릴 수 없다. 재판정을 예산에
    넣지 않으면 잔여 표현이 0 인 실행의 예산이 0 에 가까워지고, 재판정이 시작되기도
    전에 `budget_exhausted` 로 끝난다.
    """
    session.refresh()
    context = session.context("9", session.workload.discovery_calls())
    judge = StubRelationJudge() if session.stub else OpenAIRelationJudge()
    with unit_of_work(Component.AGENT_STATS) as unit:
        outcome = CandidateDiscovery(
            judge,
            StatisticsRepository(unit),
            workers=session.workers,
            stop_when=unrecoverable_exception,
        ).run(context, session.limit)
    report_discovery(outcome)
    return session.record(
        "9",
        outcome.stop_reason,
        f"후보 {outcome.created_candidates}개 · 판정 {outcome.judged}회",
        outcome.errors,
        _discovery_incomplete(outcome),
    )


def _discovery_incomplete(outcome: Any) -> str:
    """Phase 9 가 덜 끝낸 것을 한 줄로 적는다. 다 끝났으면 빈 값이다.

    예산이 모자라 `budget_exhausted` 로 끝나는 것 자체는 정상이다. 다만 무엇이 얼마나
    남았는지가 요약에 보여야 사용자가 다시 돌릴지 예산을 올릴지 판단할 수 있다. 종료
    사유만으로는 표현이 남았는지 재판정이 남았는지 가릴 수 없다.
    """
    parts: list[str] = []
    if outcome.pending_groups:
        parts.append(f"잔여 표현 묶음 {outcome.pending_groups}개 남음")
    if outcome.pending_rejudgements:
        parts.append(f"재판정 후보 {outcome.pending_rejudgements}개 남음")
    if outcome.errors:
        parts.append(f"실패 {len(outcome.errors)}건")
    return " · ".join(parts)


def run_phase_10(session: Session) -> bool:
    """후보를 심사하고 승격이 있으면 새 분류체계 버전을 발행한다.

    `TaxonomyPublication` 이 `CandidateReview` 를 안에서 부른다. 심사를 따로 돌리면
    같은 후보를 두 번 판정하고 결정 행이 어긋난다. `agent_stats` 거래다.
    """
    session.refresh()
    context = session.context("10", session.workload.candidates)
    with unit_of_work(Component.AGENT_STATS) as unit:
        repository = PromotionRepository(unit)
        publication = TaxonomyPublication(CandidateReview(repository), repository)
        outcome = publication.run(context, session.limit)
    report_publication(outcome)
    session.published_version = outcome.published
    return session.record(
        "10",
        outcome.stop_reason,
        f"승격 {outcome.promoted}개 · 발행 {outcome.taxonomy_version_id or '없음'}",
        outcome.errors,
    )


def run_phase_11(session: Session) -> bool:
    """표현을 활성 차원에 붙인다. `agent_stats` 거래다.

    `taxonomy_version_id` 를 봉투에 넣지 않는다. Phase 10 이 새 버전을 발행하면
    실행 전에 읽어 둔 버전과 어긋나 실행이 멈춘다. 저장소가 활성 버전을 정한다.

    대역을 쓸 때는 임베딩 제공자를 주지 않는다. 벡터 근접만 비고 방법 사슬은
    별칭 일치와 모델 판정으로 이어진다.

    이번 실행의 Phase 10 이 새 버전을 발행했고 `--limit` 이 없으면 `reassign` 을
    쓴다. 새 분류체계 버전을 발행하면 데이터셋의 mention 전체를 다시 할당한다
    (docs/statistics-model.md 3.5). `--limit` 이 있으면 자르는 쪽을 우선해 `run`
    으로 나눠 돌고, 남은 표현은 다음 실행이 집는다.
    """
    session.refresh()
    residual = session.workload.assignment_residual()
    context = session.context("11", residual + embedding_requests(residual))
    assigner = StubDimensionAssigner() if session.stub else OpenAIDimensionAssigner()
    embeddings = None if session.stub else OpenAIEmbeddingClient()
    full = session.published_version and session.limit is None
    with unit_of_work(Component.AGENT_STATS) as unit:
        assignment = RequirementAssignment(
            assigner,
            AssignmentRepository(unit),
            embeddings,
            workers=session.workers,
        )
        outcome = (
            assignment.reassign(context)
            if full
            else assignment.run(context, session.limit)
        )
    report_assignment(outcome)
    return session.record(
        "11",
        outcome.stop_reason,
        f"할당 {outcome.assigned_mentions}개",
        outcome.errors,
        _assignment_incomplete(outcome),
    )


def _assignment_incomplete(outcome: Any) -> str:
    """Phase 11 이 덜 끝낸 것을 한 줄로 적는다. 다 끝났으면 빈 값이다.

    사용자가 요약만 보고 무엇을 다시 돌려야 하는지 알 수 있어야 한다. 멈춘 실행은
    남긴 표현 수가, 이어 돈 실행은 실패한 표현 수가 다음 실행의 대상이다.
    """
    parts: list[str] = []
    if outcome.errors:
        parts.append(f"표현 {len(outcome.errors)}개 실패")
    for method, _ in outcome.unavailable_methods:
        parts.append(f"{method} 못 씀")
    if outcome.halted:
        # 사유는 한 번만 적는다. 같은 문장을 방법마다 되풀이하면 요약이 길어진다.
        parts.append(f"표현 {outcome.halted_pending}개 시도 못 함")
        parts.append(f"멈춘 사유 {outcome.halted_reason}")
    return " · ".join(parts)


def run_phase_12(session: Session) -> bool:
    """의미 층, 계보 층, 경로 캐시를 차례로 만든다.

    거래를 둘로 나눈다. 의미 층은 `agent_knowledge` 의 쓰기 범위이고 계보 층과
    경로 캐시는 `pipe_lineage` 의 쓰기 범위다. 근거는 docs/permission-matrix.md
    3장이다.

    예산은 1 로 둔다. 세 실행 모두 외부를 부르지 않고 원천 행 수만큼 노드와 엣지를
    만든다. 탐색의 한도는 봉투가 아니라 `graph/policy.py` 의 정책이 정한다.

    봉투에 넣을 활성 분류체계 버전을 의미 층 거래 안에서 읽는다. Phase 10 이 새
    버전을 발행했을 수 있어 Phase 12 직전에 읽어야 하고, 그래프 저장소가 같은
    조회를 갖고 있으므로 `agent_stats` 거래를 따로 열지 않는다. 읽는 거래와 쓰는
    거래가 같아 그 사이에 활성 버전이 바뀔 틈도 없다.
    """
    with unit_of_work(Component.AGENT_KNOWLEDGE) as unit:
        repository = SemanticGraphRepository(unit)
        active = repository.active_taxonomy_version(session.job_role_id)
        if active is None:
            print("\nPhase 12  활성 분류체계 버전이 없다. 그래프를 만들지 않는다")
            return session.record(
                "12",
                StopReason.EXPLICIT_FAILURE,
                "활성 분류체계 버전 없음",
                ((session.job_role_id, NO_ACTIVE_TAXONOMY),),
            )

        taxonomy_version_id = active["taxonomy_version_id"]
        context = session.context("12-1", 1, taxonomy_version_id)
        semantic = SemanticGraphBuilder(repository).run(context, ONTOLOGY_VERSION)
    report_graph("Phase 12-1  의미 층", semantic)
    semantic_summary = f"노드 {semantic.node_count}개 · 엣지 {semantic.edge_count}개"
    if not session.record(
        "12-1", semantic.stop_reason, semantic_summary, semantic.errors
    ):
        return False

    lineage_context = session.context("12-2", 1, taxonomy_version_id)
    path_context = session.context("12-3", 1, taxonomy_version_id)
    with unit_of_work(Component.PIPE_LINEAGE) as unit:
        provenance = ProvenanceGraphBuilder(LineageGraphRepository(unit)).run(
            lineage_context, ONTOLOGY_VERSION
        )
        report_graph("Phase 12-2  계보 층", provenance)
        lineage_summary = (
            f"노드 {provenance.node_count}개 · 엣지 {provenance.edge_count}개"
        )
        if not session.record(
            "12-2", provenance.stop_reason, lineage_summary, provenance.errors
        ):
            return False

        paths = GraphPathRunner(GraphPathRepository(unit)).run(
            path_context, ONTOLOGY_VERSION
        )
    report_paths(paths)
    return session.record(
        "12-3",
        paths.stop_reason,
        f"적중 {paths.hit_count}개 · 미스 {paths.miss_count}개",
        paths.errors,
    )


RUNNERS: dict[int, Callable[[Session], bool]] = {
    8: run_phase_8,
    9: run_phase_9,
    10: run_phase_10,
    11: run_phase_11,
    12: run_phase_12,
}


def report_summary(session: Session) -> None:
    """단계별 결과와 덜 끝난 것을 찍는다.

    표시를 셋으로 가른다. `실패` 는 뒤 단계를 막은 단계이고, `일부` 는 돌긴 했으나
    남긴 것이 있는 단계이며, `완료` 는 남긴 것이 없는 단계다. 사용자가 요약만 보고
    무엇을 다시 돌려야 하는지 알 수 있어야 한다.
    """
    print("\n요약")
    for result in session.results:
        if result.blocking:
            mark = "실패"
        elif result.incomplete:
            mark = "일부"
        else:
            mark = "완료"
        print(
            f"  Phase {result.step:<6}{mark}  "
            f"{result.stop_reason:<20}{result.summary}"
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
            print(f"  Phase {result.step:<6}{result.incomplete}")
        print("  같은 명령을 다시 돌리면 남은 것부터 집는다")


# ================================================================ 인자
def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Stage D(Phase 8~12)를 순서대로 돌린다")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--job-role", default=None, help="기본값은 매니페스트의 직무")
    parser.add_argument(
        "--limit", type=int, default=None, help="각 단계가 집을 최대 건수"
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=default_workers(),
        help=(
            "동시에 보낼 모델 요청 수. Phase 8·9·11 이 함께 쓴다."
            f" 기본값 {default_workers()}. 1 이면 하나씩 부른다"
        ),
    )
    parser.add_argument(
        "--from",
        dest="from_phase",
        type=int,
        default=FIRST_PHASE,
        help=f"시작 Phase. {FIRST_PHASE}~{LAST_PHASE}",
    )
    parser.add_argument(
        "--to",
        dest="to_phase",
        type=int,
        default=LAST_PHASE,
        help=f"마지막 Phase. {FIRST_PHASE}~{LAST_PHASE}",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="대상 건수와 예상 호출 수만 계산한다. 저장소를 읽되 쓰지 않는다",
    )
    parser.add_argument(
        "--stub",
        action="store_true",
        help=(
            "결정적 대역으로 배선을 확인한다. 모델과 임베딩을 호출하지 않지만"
            " 대역이 만든 산출물은 저장소에 쓴다. --stub-write 나 --dry-run 이 필요하다"
        ),
    )
    parser.add_argument(
        "--stub-write",
        action="store_true",
        help="대역 산출물이 저장소에 들어가는 것을 알고 진행한다. --stub 과 함께 쓴다",
    )
    parser.add_argument(
        "--skip-schema-check",
        action="store_true",
        help="적용된 alembic 리비전이 최신인지 확인하지 않는다",
    )
    parser.add_argument(
        "--yes", action="store_true", help="예상 호출 수 확인을 묻지 않고 진행한다"
    )
    parser.add_argument(
        "--analysis-version",
        default=None,
        help="봉투에 쓸 분석 버전. 비우면 버전 조합으로 만든다",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="저장소에 붙지 않고 인자로 받은 건수로 예상 호출 수만 계산한다",
    )
    parser.add_argument("--offline-chunks", type=int, default=0)
    parser.add_argument("--offline-mentions", type=int, default=0)
    parser.add_argument("--offline-assignables", type=int, default=0)
    return parser.parse_args(argv)


def confirm(chat_calls: int, embedding_calls: int) -> bool:
    """진행 여부를 묻는다. 대화 입력이 없으면 진행하지 않는다."""
    if not sys.stdin.isatty():
        print("\n확인 입력을 받을 수 없다. --yes 를 붙여 실행한다")
        return False
    answer = input(
        f"\n모델 {chat_calls}회, 임베딩 {embedding_calls}회를 호출한다. 진행할까 (y/N) "
    )
    return answer.strip().lower() in {"y", "yes"}


def confirm_stub_write() -> bool:
    """대역 산출물을 저장소에 넣기 전에 한 번 더 묻는다.

    대역은 모델을 부르지 않으므로 `confirm` 의 호출 수 확인이 걸리지 않는다. 호출
    수가 0 이라는 이유로 아무 확인 없이 쓰기가 시작되면, 배선만 보려던 실행이
    신호 없이 실데이터를 덮는다.
    """
    if not sys.stdin.isatty():
        print("\n확인 입력을 받을 수 없다. --yes 를 붙여 실행한다")
        return False
    answer = input("\n대역이 만든 산출물을 저장소에 넣는다. 진행할까 (y/N) ")
    return answer.strip().lower() in {"y", "yes"}


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)

    # 저장소에 붙기 전에 판정한다. 거부할 실행이 데이터베이스를 먼저 열지 않는다.
    if stub_needs_permission(args.stub, args.stub_write, args.dry_run):
        print(STUB_REFUSAL)
        return EXIT_ABORTED
    if args.stub_write and not args.stub:
        print("--stub-write 는 --stub 과 함께 쓴다")
        return EXIT_ABORTED
    if args.workers < 1:
        # 저장소를 열기 전에 거른다. 실행 중간에 터지면 앞 단계만 저장된 채로 끝난다.
        print("--workers 는 1 이상이다")
        return EXIT_ABORTED

    try:
        phases = phase_range(args.from_phase, args.to_phase)
    except ValueError as error:
        print(f"구간이 잘못되었다: {error}")
        return EXIT_ABORTED

    if not args.offline and not args.skip_schema_check:
        problem = schema_problem()
        if problem is not None:
            print(problem)
            return EXIT_ABORTED

    manifest = SourceManifest.load(args.manifest)
    job_role_id = args.job_role or manifest.job_role_id

    print(f"직무          {job_role_id}")
    print(f"데이터셋      {manifest.dataset_version}  기준일 {manifest.as_of_date}")
    print(f"구간          Phase {phases[0]} ~ {phases[-1]}")
    print(f"건수 제한     {args.limit if args.limit else '없음'}")
    print(f"동시 호출     {args.workers}")
    if args.limit:
        print(LIMIT_WARNING)
    if args.stub and args.dry_run:
        print("\n" + "=" * 52)
        print("  대역 · 세기만 한다. 저장소를 읽되 쓰지 않는다")
        print("=" * 52)
    elif args.stub:
        print("\n" + "=" * 52)
        print("  대역 실행이 저장소에 쓴다")
        print("  모델을 부르지 않으므로 산출물은 대역이 만든 가짜다")
        print("  이 실행이 남긴 행은 분석에 쓸 수 없다")
        print("  되돌리는 명령")
        print(f"      {RESET_COMMAND}")
        print("=" * 52)

    if args.offline:
        workload = offline_workload(args)
    else:
        workload = gather_workload(manifest, job_role_id, args.limit)
        print(f"활성 분류체계 {workload.taxonomy_version_id or '없음'}")
        problem = envelope_problem(job_role_id, args.analysis_version)
        if problem is not None:
            print(f"\n{problem}")
            return EXIT_FAILED

    estimates = build_estimates(phases, workload, args.stub)
    chat_calls, embedding_calls = report_estimate(estimates, args.stub, args.offline)

    if args.offline or args.dry_run:
        return EXIT_OK

    if args.stub_write and not args.yes and not confirm_stub_write():
        print("진행하지 않는다")
        return EXIT_ABORTED

    if (chat_calls or embedding_calls) and not args.yes:
        if not confirm(chat_calls, embedding_calls):
            print("진행하지 않는다")
            return EXIT_ABORTED

    session = Session(
        manifest=manifest,
        job_role_id=job_role_id,
        limit=args.limit,
        stub=args.stub,
        analysis_version=args.analysis_version,
        workload=workload,
        workers=args.workers,
    )

    for phase in phases:
        if not RUNNERS[phase](session):
            report_summary(session)
            print(
                f"\nPhase {phase} 의 실행 전제가 깨졌다. 뒤 단계를 돌리지 않는다"
            )
            return EXIT_FAILED

    report_summary(session)
    if any(result.incomplete for result in session.results):
        # 뒤 단계까지 돌았으나 남긴 것이 있다. 성공으로 세지 않는다.
        return EXIT_INCOMPLETE
    return EXIT_OK


if __name__ == "__main__":
    raise SystemExit(main())
