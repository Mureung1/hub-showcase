"""데이터 엔지니어 직무의 생성 데모 시드 (갈래 A4).

``agent/data/demo_seed/CONTRACT.md`` 가 이 파일의 기준이다. 데이터베이스에 접속하지
않고 메모리에서 계산해 ``parts/data_engineer/<table>.csv`` 로만 낸다. 모델 호출은 0회다.

**`dataset_versions` 는 A1(backend) 만 만든다.** `ds_demo_v1` 는 아홉 직무가 함께 쓰는
한 행이라 여기서 다시 만들면 적재에서 중복 키가 된다.

CONTRACT 10.5 의 `allowed_uses` 예시값(`baseline`·`evidence`)은 `0001_initial_schema.sql`
의 `allowed_uses_known` CHECK 가 허용하지 않는다. A1 과 같은 값을 쓴다.

최근 5건이 기업군 여섯 종을 다 덮지 못한다(게임사는 이전 1년에만 있다). 덮지 못한
기업군의 최근 지표 행은 만들지 않고 `cluster_axes.rows` 에서도 뺀다.

실행: ``cd agent && python -m scripts.demo_seed.data_engineer``
"""

from __future__ import annotations

import json
import math
from collections import Counter
from typing import Any

from ._csv import demo_seed_root, sha256_hex, write_part

# ============================================================ 식별자
JOB_ROLE_ID = "data_engineer"
DATASET_VERSION = "ds_demo_v1"
TAXONOMY_ID = f"taxonomy_{JOB_ROLE_ID}"
TAXONOMY_VERSION_ID = f"tx_demo_{JOB_ROLE_ID}"
TAXONOMY_POLICY_VERSION = "tp_v1"
KNOWLEDGE_VERSION = f"kn_demo_{JOB_ROLE_ID}"
ANALYSIS_VERSION = f"an_demo_{JOB_ROLE_ID}"
ONTOLOGY_VERSION = "v1"
GRAPH_POLICY_VERSION = "gp_v1"
AGENT_VERSION_STRING = "1.0.0"

NOW = "2026-07-27T09:00:00+09:00"
FETCHED_AT = "2026-07-20T09:00:00+09:00"

# 기간 축은 달력 연도다. `0010_calendar_year_periods.sql` 의 `periods` 두 행과 이름이 같아야
# `statistics_facts.period_id` 외래키가 성립한다.
RECENT = "y2026"
PRIOR = "y2024_2025"

SEGMENT_ALL = "all"
SEGMENT_ENTRY = "entry_junior"

# 기업군 표시명. `company_clusters` 는 마이그레이션이 넣으므로 여기서는 라벨만 쓴다.
CLUSTERS: dict[str, str] = {
    "bigtech_platform": "빅테크·플랫폼",
    "startup": "스타트업",
    "b2b_saas": "B2B SaaS",
    "fintech_finance": "핀테크·금융",
    "si_enterprise": "SI·대기업",
    "game": "게임사",
}
CLUSTER_ORDER = (
    "bigtech_platform",
    "startup",
    "b2b_saas",
    "fintech_finance",
    "si_enterprise",
    "game",
)

# 지표 family 와 정책 버전의 대응. 정책 행은 `0002_seed_reference.sql` 이 넣는다.
METRIC_POLICY: dict[str, str] = {
    "posting_prevalence": "mp_v1_prevalence",
    "requiredness_ratio": "mp_v1_requiredness",
    "depth_distribution": "mp_v1_depth",
    "cluster_contrast": "mp_v1_contrast",
    "cooccurrence": "mp_v1_cooccurrence",
    "scope_expansion": "mp_v1_scope_exp",
    "entry_label_advanced_signal_rate": "mp_v1_entry_signal",
}
METRIC_FAMILIES = tuple(METRIC_POLICY)

DEPTHS = ("foundation", "application", "tradeoff")
DEPTH_RANK = {"foundation": 1, "application": 2, "tradeoff": 3}

# 스냅샷 출처 계층 A 의 허용 용도. 스키마 CHECK 가 허용하는 값만 담는다.
ALLOWED_USES = (
    "statistics",
    "interpretation_context",
    "strategy",
    "roadmap",
    "wiki_why_required",
    "wiki_depth_criteria",
    "wiki_interview_verification",
)

# ============================================================ 실행 기록
AGENTS = (
    ("stats", "통계 분석", f"obj_{JOB_ROLE_ID}_statistics", "slots_filled"),
    ("knowledge", "지식 구축", f"obj_{JOB_ROLE_ID}_knowledge", "slots_filled"),
    ("interpretation", "채용공고 해석", f"obj_{JOB_ROLE_ID}_interpretation", "slots_filled"),
    ("strategy", "합격 전략", f"obj_{JOB_ROLE_ID}_strategy", "slots_filled"),
    ("roadmap", "준비 로드맵", f"obj_{JOB_ROLE_ID}_roadmap", "slots_filled"),
    ("aggregation", "지표 집계", f"obj_{JOB_ROLE_ID}_aggregation", "no_new_evidence"),
)


def run_id(agent: str) -> str:
    return f"run_demo_{JOB_ROLE_ID}_{agent}"


# ============================================================ 1. 요구 차원 5종
# (slug, dimension_kind, 표시 라벨, 정의, 별칭, 역할 경계 여부)
# 역할 경계는 데이터 플랫폼·인프라 팀과 겹치는 요구다. 스케줄러 운영과 스트림 수집
# 운영이 그 자리에 있어 직무 외 요구 지표의 분자가 된다.
DIMENSIONS: tuple[tuple[str, str, str, str, tuple[str, ...], bool], ...] = (
    (
        "sql-analytics",
        "technology",
        "SQL 집계·쿼리 최적화",
        "대용량 테이블을 집계하고 실행 계획을 읽어 쿼리 비용을 다루는 요구.",
        ("SQL", "쿼리 튜닝", "실행 계획", "윈도우 함수"),
        False,
    ),
    (
        "spark-batch",
        "technology",
        "분산 배치 처리",
        "Spark 계열 분산 엔진으로 대량 데이터를 배치로 처리하는 요구.",
        ("Spark", "PySpark", "분산 처리", "배치 처리"),
        False,
    ),
    (
        "workflow-orchestration",
        "tooling",
        "워크플로 오케스트레이션",
        "DAG 로 배치 의존을 정의하고 스케줄과 재처리를 운영하는 요구.",
        ("Airflow", "DAG", "스케줄러", "워크플로"),
        True,
    ),
    (
        "data-warehouse",
        "technology",
        "데이터 웨어하우스 모델링",
        "분석용 테이블과 데이터 마트를 설계하고 적재하는 요구.",
        ("데이터 웨어하우스", "BigQuery", "데이터 마트", "스타 스키마"),
        False,
    ),
    (
        "streaming-ingest",
        "technology",
        "스트리밍 수집·처리",
        "메시지 브로커와 스트림 처리로 실시간 데이터를 수집하는 요구.",
        ("Kafka", "CDC", "실시간 수집", "Flink"),
        True,
    ),
)

DIM_INFO: dict[str, dict[str, Any]] = {
    slug: {
        "slug": slug,
        "dimension_id": f"dim_{JOB_ROLE_ID}_{slug}",
        "kind": kind,
        "label": label,
        "definition": definition,
        "aliases": aliases,
        "boundary": boundary,
    }
    for slug, kind, label, definition, aliases, boundary in DIMENSIONS
}
DIM_SLUGS = tuple(DIM_INFO)


def dim_id(slug: str) -> str:
    return DIM_INFO[slug]["dimension_id"]


# 상하위·관련 관계. relation_type 은 dst 가 src 에 대해 갖는 위치다.
DIMENSION_RELATIONS: tuple[tuple[str, str, str], ...] = (
    ("sql-analytics", "data-warehouse", "related"),
    ("spark-batch", "workflow-orchestration", "related"),
    ("streaming-ingest", "spark-batch", "related"),
    ("data-warehouse", "sql-analytics", "related"),
)

# ============================================================ 2. 역량 3종
CAPABILITIES: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    (
        "data-modeling",
        "분석용 데이터 모델링",
        "요구를 분석 가능한 테이블로 옮기고 집계 비용을 설명하는 능력.",
        ("sql-analytics", "data-warehouse"),
    ),
    (
        "pipeline-engineering",
        "배치 파이프라인 구축·운영",
        "분산 배치를 짜고 DAG 로 묶어 실패까지 다루는 능력.",
        ("spark-batch", "workflow-orchestration"),
    ),
    (
        "stream-processing",
        "실시간 수집·처리",
        "이벤트 스트림을 받아 순서와 중복을 다루며 적재하는 능력.",
        ("streaming-ingest",),
    ),
)

CAP_INFO: dict[str, dict[str, Any]] = {
    slug: {
        "slug": slug,
        "capability_id": f"cap_{JOB_ROLE_ID}_{slug}",
        "label": label,
        "definition": definition,
        "dimensions": dims,
    }
    for slug, label, definition, dims in CAPABILITIES
}
CAP_SLUGS = tuple(CAP_INFO)

# 선수 역량 사슬. 준비 로드맵의 순서 판정 입력이다.
CAPABILITY_PREREQUISITES: tuple[tuple[str, str], ...] = (
    ("data-modeling", "pipeline-engineering"),
    ("pipeline-engineering", "stream-processing"),
)


# ============================================================ 3. 채용공고 15건
# 한 줄은 (본문, 차원 slug 또는 None, depth_level, 주석) 이다.
# 주석은 기존 recent 공고에 붙는다. 해석 payload 의 세 종류 번호가 여기서 나온다.
#   ("base", 기준선 항목명, 해설)                  → base_n
#   ("mark", 제목, 해설, 신뢰도, 등장 비율)          → mark_n
#   ("note", 제목, 해설)                          → note_n
SECTION_REQUIREDNESS = {
    "주요업무": ("responsibility", "담당업무"),
    "자격요건": ("required", "필수"),
    "우대사항": ("preferred", "우대"),
}

POSTINGS: tuple[dict[str, Any], ...] = (
    {
        "nn": "01",
        "company_id": "co_coupang",
        "company": "쿠팡",
        "cluster": "bigtech_platform",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입~3년",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-03-10T10:00:00+09:00",
        "title": "데이터 엔지니어 (Data Platform) 신입·주니어",
        "sections": (
            ("주요업무", (
                ("커머스 로그와 주문 데이터를 모으는 배치 파이프라인을 개발하고 운영합니다.", None, "application",
                 ("note", "개발과 운영이 붙어 있습니다",
                  "만들고 끝이 아니라 매일 도는 배치를 지키는 일입니다. 자격요건의 규모 요구가 왜 붙었는지가 이 문장에서 설명됩니다.")),
                ("분석가와 머신러닝 팀이 사용하는 데이터 마트를 설계하고 제공합니다.", None, "application",
                 ("note", "사용자가 사내에 있습니다",
                  "쓰는 사람이 분석가와 모델 학습 팀입니다. 테이블을 왜 그렇게 잘랐는지 설명할 수 있어야 하는 자리입니다.")),
                ("파이프라인 실패를 감지하고 재처리하는 운영 절차를 관리합니다.", None, "application",
                 ("note", "실패는 전제입니다",
                  "배치는 멈추고 다시 돕니다. 실패를 재현하고 되돌린 기록이 있으면 이 문장 하나로 대화가 열립니다.")),
                ("적재 지연과 처리 비용을 확인하며 개선 지점을 찾습니다.", None, "foundation", None),
            )),
            ("자격요건", (
                ("SQL로 대용량 데이터를 집계하고 실행 계획을 읽을 수 있는 분", "sql-analytics", "application",
                 ("base", "SQL 집계와 실행 계획 읽기",
                  "쿼리를 쓸 줄 아는지가 아니라 왜 느린지를 말할 수 있는지를 봅니다. 실행 계획 한 장을 읽어 본 경험이면 충족됩니다.")),
                ("Spark 등 분산 처리 도구로 하루 수십억 건 규모의 배치를 다뤄 본 분", "spark-batch", "tradeoff",
                 ("mark", "규모 — 공통 기대치를 넘는 요구",
                  "수십억 건이라는 숫자가 자격요건에 있습니다. 신입에게는 그 규모의 경험이 아니라 파티셔닝과 셔플을 왜 조정했는지를 묻는 신호로 읽는 것이 합리적입니다.",
                  "high", "같은 직군 80%")),
                ("Airflow로 DAG를 작성하고 스케줄을 운영해 본 분", "workflow-orchestration", "application",
                 ("base", "워크플로 스케줄 운영",
                  "DAG 하나를 직접 짜고 하루라도 돌려 본 기록이면 충분합니다. 의존 순서를 왜 그렇게 뒀는지가 이어질 질문입니다.")),
                ("파이썬으로 데이터 처리 코드를 작성할 수 있는 분", None, "foundation",
                 ("note", "언어는 도구입니다",
                  "파이썬 자체보다 데이터 처리 코드를 남이 읽을 수 있게 쓰는지를 봅니다. 노트북이 아니라 파일과 테스트로 남기세요.")),
            )),
            ("우대사항", (
                ("BigQuery·Snowflake 등 데이터 웨어하우스를 운영해 본 경험", "data-warehouse", "application",
                 ("base", "웨어하우스 테이블 모델링",
                  "제품 이름보다 팩트와 디멘전을 나눠 본 경험이 핵심입니다. 무료 한도의 BigQuery 로도 같은 이야기를 만들 수 있습니다.")),
                ("Kafka로 실시간 이벤트 스트림을 수집해 본 경험", "streaming-ingest", "foundation",
                 ("base", "스트리밍 수집 기본 이해",
                  "우대는 우대입니다. 토픽과 파티션, 컨슈머 그룹의 개념 이해에 토이 수준 구현이면 대화가 됩니다.")),
                ("쿼리 비용과 스토리지 비용을 줄여 본 경험", None, "application",
                 ("mark", "비용 — 이 기업군의 단골 요구",
                  "규모가 큰 조직은 성능만큼 비용을 봅니다. 파티션 정리나 컬럼 정리로 스캔량을 줄인 전후 숫자 한 줄이 그대로 답이 됩니다.",
                  "mid", "같은 직군 40%")),
            )),
        ),
        "summary": "쌓는 사람보다 매일 도는 것을 지키는 사람을 찾습니다. 기준선 항목은 대체로 공통 기대치 그대로이고, 처리 규모와 비용 두 축이 이 공고의 실질 변별점입니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 4건",
    },
    {
        "nn": "02",
        "company_id": "co_viva",
        "company": "비바리퍼블리카",
        "cluster": "fintech_finance",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입/주니어",
        "career_label_raw": "경력 무관",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-02-09T10:00:00+09:00",
        "title": "데이터 엔지니어 (결제 데이터 플랫폼)",
        "sections": (
            ("주요업무", (
                ("결제·정산 데이터를 적재하는 배치 파이프라인을 개발합니다.", None, "application",
                 ("note", "도메인 신호 — 돈을 다루는 데이터",
                  "결제 데이터는 한 건이 어긋나면 장부가 어긋납니다. 자격요건의 정합성 요구가 왜 필수인지가 여기서 설명됩니다.")),
                ("지표 정합성 검증 절차를 만들고 이상 데이터를 추적합니다.", None, "application",
                 ("note", "검증이 업무의 절반입니다",
                  "적재보다 맞는지 확인하는 일이 더 많습니다. 검증 쿼리를 파이프라인 안에 넣어 본 경험이 그대로 쓰입니다.")),
                ("개인정보 비식별 처리 규칙을 파이프라인에 반영합니다.", None, "foundation",
                 ("note", "규제가 설계를 바꿉니다",
                  "마스킹과 보관 기간이 테이블 설계에 먼저 들어옵니다. 이 기업군에서만 유독 두꺼워지는 요구입니다.")),
            )),
            ("자격요건", (
                ("SQL로 집계 쿼리를 작성하고 성능을 개선할 수 있는 분", "sql-analytics", "application",
                 ("base", "SQL 집계와 실행 계획 읽기",
                  "개선까지 적었지만 신입 기준의 실질은 느린 쿼리를 보고 왜 느린지 말할 수 있는 정도입니다.")),
                ("Airflow 등 워크플로 도구로 배치를 운영해 본 분", "workflow-orchestration", "application",
                 ("base", "워크플로 스케줄 운영",
                  "도구 이름을 열어 뒀습니다. DAG 개념과 재시도 설정을 다뤄 봤다면 어느 도구든 통합니다.")),
                ("원장과 집계 결과가 어긋나지 않도록 테이블을 설계해 본 분", "data-warehouse", "tradeoff",
                 ("mark", "정합성 — 모델링에 붙은 심화 요구",
                  "테이블 설계 요구에 어긋나지 않도록이 붙었습니다. 중복 적재와 재처리에서 합계가 두 번 더해지지 않게 만드는 설계를 묻는 문장입니다.",
                  "high", "같은 직군 80%")),
            )),
            ("우대사항", (
                ("Kafka·CDC로 변경 데이터를 실시간 수집해 본 경험", "streaming-ingest", "application",
                 ("base", "스트리밍 수집 기본 이해",
                  "CDC 까지 적힌 것은 배치 지연을 줄이려는 팀이라는 뜻입니다. 개념 이해에 토이 구현이면 우대 이상으로 읽힙니다.")),
                ("Spark로 대량 데이터를 처리해 본 경험", "spark-batch", "foundation",
                 ("base", "Spark 배치 처리 구현",
                  "이 회사에서는 우대에 있습니다. 전체 흐름에서는 필수화가 진행 중인 항목이라 준비해 두면 다른 공고에서 값이 큽니다.")),
                ("금융 데이터 규정과 비식별 처리를 이해하고 계신 분", None, "application",
                 ("mark", "규제 — 이 기업군의 추가 관문",
                  "전공 지식이 아니라 왜 이 컬럼을 그대로 두면 안 되는지를 말할 수 있는지를 봅니다. 마스킹 규칙을 한 번 설계해 본 경험이면 충분합니다.",
                  "mid", "같은 직군 20%")),
            )),
        ),
        "summary": "정확한 값을 만드는 사람을 찾습니다. 기준선 항목은 그대로 통하되 정합성 설계와 규제 이해가 이 공고의 추가 요구입니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 5건",
    },
    {
        "nn": "03",
        "company_id": "co_navercloud",
        "company": "네이버클라우드",
        "cluster": "b2b_saas",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 채용",
        "career_label_raw": "신입",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-01-20T10:00:00+09:00",
        "title": "데이터 플랫폼 엔지니어 (신입)",
        "sections": (
            ("주요업무", (
                ("고객사별 사용량 데이터를 수집·집계하는 파이프라인을 운영합니다.", None, "application",
                 ("note", "고객사가 분모입니다",
                  "지표를 회사 전체가 아니라 고객사별로 나눠 봅니다. 같은 집계라도 경계가 하나 더 붙는 구조입니다.")),
                ("과금과 리포팅에 쓰이는 데이터 마트를 관리합니다.", None, "application",
                 ("note", "숫자가 청구서가 됩니다",
                  "집계 결과가 곧 돈이라 값이 틀리면 되돌리기 어렵습니다. 검증 절차를 남긴 경험이 여기서 쓰입니다.")),
                ("데이터 카탈로그와 스키마 문서를 최신 상태로 유지합니다.", None, "foundation",
                 ("note", "문서가 업무에 들어 있습니다",
                  "컬럼 의미를 문서로 남기는 일이 담당업무에 있습니다. 지표 정의서를 써 본 경험이 그대로 증거가 됩니다.")),
            )),
            ("자격요건", (
                ("SQL 기본 문법과 조인·집계에 익숙하신 분", "sql-analytics", "foundation",
                 ("base", "SQL 집계와 실행 계획 읽기",
                  "신입 공고답게 기본을 물었습니다. 조인 방식의 차이를 설명할 수 있으면 충분합니다.")),
                ("Airflow로 배치 파이프라인을 구성해 본 분", "workflow-orchestration", "application",
                 ("base", "워크플로 스케줄 운영",
                  "구성해 본 정도면 됩니다. 스케줄과 의존 순서를 직접 정해 본 DAG 하나가 이 문장을 증명합니다.")),
                ("데이터 웨어하우스의 스키마를 설계하고 관리해 본 분", "data-warehouse", "application",
                 ("base", "웨어하우스 테이블 모델링",
                  "고객사별 사용량이라 테이블 경계가 중요한 곳입니다. 왜 이렇게 나눴는지의 근거가 답이 됩니다.")),
            )),
            ("우대사항", (
                ("Terraform·Kubernetes로 실행 환경을 직접 구성해 본 경험", None, "application",
                 ("mark", "인프라 — 직무 외 요구의 대표 항목",
                  "데이터 엔지니어 공고인데 인프라 도구를 묻습니다. 플랫폼 팀과 경계가 붙어 있는 조직이라는 신호입니다.",
                  "mid", "같은 직군 40%")),
                ("고객사 요구에 맞춰 지표 정의를 문서로 남겨 본 경험", None, "foundation",
                 ("mark", "지표 정의 문서 — 이 기업군의 변별점",
                  "같은 활성 사용자라도 고객사마다 정의가 다릅니다. 정의를 합의하고 문서로 남긴 경험이 여기서 큰 값을 갖습니다.",
                  "high", "같은 직군 20%")),
                ("파이썬으로 데이터 검증 스크립트를 작성해 본 경험", None, "foundation",
                 ("note", "검증도 코드로 남깁니다",
                  "수동 확인이 아니라 매번 도는 검사로 만드는지를 봅니다. 간단한 행 수 비교 검사부터가 시작입니다.")),
            )),
        ),
        "summary": "정의를 합의하고 문서로 남기는 사람을 찾습니다. 기준선 세 항목이 그대로 자격요건에 있고, 인프라 구성과 지표 정의 문서화가 추가 요구입니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 3건",
    },
    {
        "nn": "04",
        "company_id": "co_upstage",
        "company": "업스테이지",
        "cluster": "startup",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력 2년 이상",
        "career_label_raw": "2년 이상",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-05-18T10:00:00+09:00",
        "title": "데이터 엔지니어 (학습 데이터 플랫폼)",
        "sections": (
            ("주요업무", (
                ("모델 학습에 쓰이는 대규모 데이터셋 수집 파이프라인을 만듭니다.", None, "application",
                 ("note", "쓰는 사람이 모델입니다",
                  "리포트가 아니라 학습이 소비처입니다. 같은 적재라도 중복과 누락의 기준이 더 빡빡해집니다.")),
                ("학습·평가 데이터의 버전과 품질을 관리합니다.", None, "application",
                 ("note", "데이터에도 버전이 붙습니다",
                  "어떤 데이터로 학습했는지를 되짚을 수 있어야 합니다. 스냅샷과 해시를 남긴 경험이 그대로 쓰입니다.")),
                ("파이프라인 구성부터 배포·운영까지 직접 담당합니다.", "workflow-orchestration", "application",
                 ("mark", "오너십 — 전 과정을 혼자 끕니다",
                  "인원이 적은 조직이라 담당 범위가 넓습니다. 나눠 맡은 역할이 아니라 하나를 끝까지 끌고 간 기록이 필요합니다.",
                  "high", "같은 직군 80%")),
            )),
            ("자격요건", (
                ("SQL과 파이썬으로 데이터를 자유롭게 다루는 분", "sql-analytics", "application",
                 ("base", "SQL 집계와 실행 계획 읽기",
                  "자유롭게라는 말의 실질은 막히지 않는지입니다. 집계와 조인을 손에 익혀 두면 충분합니다.")),
                ("Spark로 테라바이트급 데이터를 처리하며 병목을 개선해 본 분", "spark-batch", "tradeoff",
                 ("mark", "분산 처리 — 병목을 다뤄 본 흔적",
                  "규모보다 무엇이 느렸고 무엇을 바꿨는지를 묻습니다. 셔플과 파티션 수를 조정한 전후 실행 시간이면 답이 됩니다.",
                  "high", "같은 직군 80%")),
            )),
            ("우대사항", (
                ("Kafka 기반 실시간 수집 파이프라인을 다뤄 본 경험", "streaming-ingest", "application",
                 ("base", "스트리밍 수집 기본 이해",
                  "수집 주기를 줄이려는 팀입니다. 배치와 스트림의 차이를 설명할 수 있으면 대화가 이어집니다.")),
                ("처리 비용을 줄이며 같은 결과를 낸 경험", None, "application",
                 ("note", "적은 자원으로 버팁니다",
                  "스타트업은 비용이 곧 생존입니다. 인스턴스를 줄이고도 시간을 지킨 기록이 강한 소재가 됩니다.")),
            )),
        ),
        "summary": "혼자서 끝까지 끌고 갈 사람을 찾습니다. 기준선 항목은 그대로 통하되 오너십과 병목 개선이 이 공고의 실질 변별점입니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 2건",
    },
    {
        "nn": "05",
        "company_id": "co_samsungsds",
        "company": "삼성에스디에스",
        "cluster": "si_enterprise",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력 3년 이상",
        "career_label_raw": "3년 이상",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-04-06T10:00:00+09:00",
        "title": "데이터 엔지니어 (데이터 플랫폼 구축)",
        "sections": (
            ("주요업무", (
                ("고객사 데이터 플랫폼 구축 프로젝트를 수행합니다.", None, "application",
                 ("note", "프로젝트 단위로 일합니다",
                  "제품이 아니라 납품입니다. 요구사항과 산출물이 먼저 정해지고 개발이 뒤따르는 구조입니다.")),
                ("표준 데이터 모델과 산출물 문서를 작성합니다.", None, "application",
                 ("note", "문서가 결과물의 절반입니다",
                  "코드만큼 산출물 문서가 평가 대상입니다. 설계 근거를 남긴 기록이 그대로 증거가 됩니다.")),
                ("운영 이관을 위한 절차와 매뉴얼을 정리합니다.", None, "foundation",
                 ("note", "만든 사람이 계속 보지 않습니다",
                  "다른 팀이 이어받습니다. 남이 읽고 돌릴 수 있게 만드는 습관이 이 기업군의 기본 요구입니다.")),
            )),
            ("자격요건", (
                ("SQL로 복잡한 집계 로직을 구현할 수 있는 분", "sql-analytics", "application",
                 ("base", "SQL 집계와 실행 계획 읽기",
                  "복잡한 로직이라 적었지만 실질은 요구를 쿼리로 정확히 옮기는 능력입니다. 중간 결과를 나눠 검증하는 습관이 도움이 됩니다.")),
                ("데이터 웨어하우스 모델링(스타 스키마) 경험이 있는 분", "data-warehouse", "application",
                 ("base", "웨어하우스 테이블 모델링",
                  "모델링 방식을 이름으로 못박았습니다. 팩트와 디멘전을 나눈 근거를 말할 수 있으면 충족됩니다.")),
                ("Spark 기반 대용량 처리 경험이 있는 분", "spark-batch", "application",
                 ("base", "Spark 배치 처리 구현",
                  "이 기업군에서도 분산 처리는 자격요건 자리에 있습니다. 규모보다 흐름을 설명할 수 있으면 됩니다.")),
                ("고객 요구사항을 문서로 정리하고 합의해 본 분", None, "application",
                 ("mark", "합의 — 기술 외 관문",
                  "요구를 받아 적는 것이 아니라 범위를 좁히고 합의한 기록을 봅니다. 협업 산출물 하나가 이 문장을 증명합니다.",
                  "high", "같은 직군 20%")),
            )),
            ("우대사항", (
                ("품질 점검 규칙을 정의해 본 경험", None, "foundation",
                 ("note", "점검도 표준이 됩니다",
                  "규칙을 문서로 정의해 두면 다음 프로젝트가 그대로 씁니다. 검증 항목 목록을 만들어 본 경험이면 충분합니다.")),
                ("정보처리기사 등 관련 자격을 보유하신 분", None, "foundation",
                 ("note", "자격증이 남아 있는 기업군",
                  "다른 기업군에서는 거의 사라진 문장이 여기서는 남아 있습니다. 있으면 가점, 없다고 탈락 사유는 아닙니다.")),
            )),
        ),
        "summary": "합의하고 남기는 사람을 찾습니다. 기준선 세 항목이 자격요건에 그대로 있고, 요구사항 합의와 문서화가 이 공고의 변별점입니다.",
        "summary_ratio": "편차 1건 · 기준선 일치 3건",
    },
    {
        "nn": "06",
        "company_id": "co_kurly",
        "company": "컬리",
        "cluster": "bigtech_platform",
        "period": PRIOR,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입~2년",
        "edu_label_raw": "학사 이상",
        "posted_at": "2025-03-12T10:00:00+09:00",
        "title": "데이터 엔지니어 (신입·주니어)",
        "sections": (
            ("주요업무", (
                ("주문·물류 데이터를 수집해 분석 환경에 적재합니다.", None, "application", None),
                ("배치 실행 결과를 확인하고 이상을 팀에 공유합니다.", None, "foundation", None),
            )),
            ("자격요건", (
                ("SQL로 데이터를 조회하고 집계할 수 있는 분", "sql-analytics", "application", None),
                ("Spark 또는 유사한 분산 처리 도구를 사용해 본 분", "spark-batch", "application", None),
            )),
            ("우대사항", (
                ("Kafka 등 메시지 브로커를 사용해 본 경험", "streaming-ingest", "foundation", None),
                ("데이터 시각화 도구로 지표를 공유해 본 경험", None, "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "07",
        "company_id": "co_kakaopay",
        "company": "카카오페이",
        "cluster": "fintech_finance",
        "period": PRIOR,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입/주니어",
        "career_label_raw": "경력 무관",
        "edu_label_raw": "학력 무관",
        "posted_at": "2024-11-20T10:00:00+09:00",
        "title": "데이터 엔지니어 (결제 데이터)",
        "sections": (
            ("주요업무", (
                ("결제 거래 데이터를 집계해 분석 테이블로 제공합니다.", None, "application", None),
                ("일별 정산 지표의 값을 검증합니다.", None, "foundation", None),
            )),
            ("자격요건", (
                ("SQL 집계와 조인에 익숙하신 분", "sql-analytics", "application", None),
                ("분석용 테이블을 설계해 본 경험이 있으신 분", "data-warehouse", "application", None),
            )),
            ("우대사항", (
                ("Airflow 등 스케줄러를 사용해 본 경험", "workflow-orchestration", "foundation", None),
                ("Kafka 기반 데이터 수집 경험", "streaming-ingest", "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "08",
        "company_id": "co_neople",
        "company": "네오플",
        "cluster": "game",
        "period": PRIOR,
        "entry_label": "experienced",
        "entry_label_raw": "경력 3년 이상",
        "career_label_raw": "3년 이상",
        "edu_label_raw": "학력 무관",
        "posted_at": "2025-05-08T10:00:00+09:00",
        "title": "데이터 엔지니어 (게임 로그 플랫폼)",
        "sections": (
            ("주요업무", (
                ("게임 로그를 수집해 분석 환경에 적재합니다.", None, "application", None),
                ("지표 분석과 A/B 테스트에 필요한 데이터를 제공합니다.", None, "application", None),
            )),
            ("자격요건", (
                ("SQL로 대량 로그를 집계할 수 있는 분", "sql-analytics", "application", None),
            )),
            ("우대사항", (
                ("Spark로 로그 배치를 처리해 본 경험", "spark-batch", "application", None),
                ("Kafka로 실시간 로그를 수집해 본 경험", "streaming-ingest", "foundation", None),
                ("Airflow로 배치 의존을 관리해 본 경험", "workflow-orchestration", "application", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "09",
        "company_id": "co_channelcorp",
        "company": "주식회사 채널코퍼레이션",
        "cluster": "b2b_saas",
        "period": PRIOR,
        "entry_label": "experienced",
        "entry_label_raw": "경력 2년 이상",
        "career_label_raw": "2년 이상",
        "edu_label_raw": "학력 무관",
        "posted_at": "2024-09-25T10:00:00+09:00",
        "title": "데이터 엔지니어 (Analytics Platform)",
        "sections": (
            ("주요업무", (
                ("고객사 사용 데이터를 집계해 리포팅 환경에 제공합니다.", None, "application", None),
                ("데이터 파이프라인의 실패를 추적하고 복구합니다.", None, "application", None),
            )),
            ("자격요건", (
                ("SQL로 집계 쿼리를 작성할 수 있는 분", "sql-analytics", "application", None),
                ("데이터 웨어하우스 테이블을 설계해 본 분", "data-warehouse", "application", None),
                ("Airflow로 배치 파이프라인을 운영해 본 분", "workflow-orchestration", "application", None),
            )),
            ("우대사항", (
                ("Spark 등 분산 처리 경험", "spark-batch", "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
)


def expand_postings(
    postings: tuple[dict[str, Any], ...],
) -> tuple[dict[str, Any], ...]:
    """기존 아홉 공고를 보존하면서 기간별 9건·6건 모집단으로 확장한다."""
    recent_dates = {
        "06": "2026-03-12T10:00:00+09:00",
        "07": "2026-05-20T10:00:00+09:00",
        "08": "2026-06-08T10:00:00+09:00",
        "09": "2026-02-25T10:00:00+09:00",
    }
    recent = tuple(
        {
            **posting,
            "period": RECENT if posting["nn"] in recent_dates else posting["period"],
            "posted_at": recent_dates.get(posting["nn"], posting["posted_at"]),
        }
        for posting in postings
    )

    # 기업군마다 한 건씩 두고, 신입·주니어와 경력 공고를 각각 세 건으로 맞춘다.
    prev_specs = (
        (
            "10", "04", "entry_junior", "2024-03-18T10:00:00+09:00",
            "주니어 데이터 엔지니어 (AI 학습 데이터)",
            (
                ("주요업무", (
                    ("모델 학습용 원천 데이터를 수집하고 정제하는 배치를 개발합니다.", None, "application", None),
                    ("실험별 데이터셋 생성 이력과 품질 지표를 관리합니다.", None, "application", None),
                )),
                ("자격요건", (
                    ("SQL로 학습 데이터의 분포와 결측치를 점검할 수 있는 분", "sql-analytics", "application", None),
                    ("Airflow로 정기 데이터 작업을 구성해 본 분", "workflow-orchestration", "foundation", None),
                )),
                ("우대사항", (
                    ("Kafka 기반 이벤트 수집 구조를 이해하는 분", "streaming-ingest", "foundation", None),
                )),
            ),
            "학습 데이터의 생성 이력과 품질을 함께 관리하는 주니어 역할입니다.",
        ),
        (
            "11", "01", "experienced", "2024-07-22T10:00:00+09:00",
            "데이터 엔지니어 (대규모 물류 분석)",
            (
                ("주요업무", (
                    ("물류 이벤트를 분석 가능한 형태로 적재하는 배치 파이프라인을 운영합니다.", None, "application", None),
                    ("처리 지연과 저장 비용을 측정하고 병목을 개선합니다.", None, "tradeoff", None),
                )),
                ("자격요건", (
                    ("Spark 작업의 파티션과 셔플 병목을 개선해 본 분", "spark-batch", "tradeoff", None),
                    ("SQL 실행 계획을 근거로 대용량 집계를 최적화할 수 있는 분", "sql-analytics", "tradeoff", None),
                    ("분석용 데이터 웨어하우스 모델을 운영해 본 분", "data-warehouse", "application", None),
                )),
                ("우대사항", (
                    ("데이터 보관 주기와 비용 정책을 설계한 경험", None, "application", None),
                )),
            ),
            "대규모 배치의 성능과 비용을 함께 최적화하는 경력 역할입니다.",
        ),
        (
            "12", "03", "entry_junior", "2024-11-11T10:00:00+09:00",
            "데이터 플랫폼 엔지니어 (SaaS 지표)",
            (
                ("주요업무", (
                    ("고객사별 사용 지표를 집계하는 데이터 파이프라인을 개발합니다.", None, "application", None),
                    ("지표 정의와 테이블 변경 이력을 문서화합니다.", None, "foundation", None),
                )),
                ("자격요건", (
                    ("SQL 조인과 윈도 함수로 서비스 지표를 계산할 수 있는 분", "sql-analytics", "application", None),
                    ("Airflow DAG의 의존성과 재시도 정책을 이해하는 분", "workflow-orchestration", "foundation", None),
                )),
                ("우대사항", (
                    ("데이터 웨어하우스의 차원 모델을 설계해 본 경험", "data-warehouse", "foundation", None),
                )),
            ),
            "고객사 지표의 정의와 배치 운영을 담당하는 주니어 역할입니다.",
        ),
        (
            "13", "02", "experienced", "2025-03-24T10:00:00+09:00",
            "데이터 엔지니어 (금융 이벤트 플랫폼)",
            (
                ("주요업무", (
                    ("결제 이벤트를 실시간으로 수집하고 정합성 검증 절차를 운영합니다.", None, "tradeoff", None),
                    ("규제 보고용 데이터 마트와 접근 정책을 관리합니다.", None, "application", None),
                )),
                ("자격요건", (
                    ("Kafka 스트림의 중복과 순서 문제를 해결해 본 분", "streaming-ingest", "tradeoff", None),
                    ("데이터 웨어하우스에서 이력 테이블을 설계해 본 분", "data-warehouse", "application", None),
                    ("SQL 검증 쿼리로 원천과 집계 결과를 대조할 수 있는 분", "sql-analytics", "application", None),
                )),
                ("우대사항", (
                    ("개인정보 마스킹과 보관 정책을 운영한 경험", None, "application", None),
                )),
            ),
            "금융 이벤트의 실시간성과 규제 정합성을 책임지는 경력 역할입니다.",
        ),
        (
            "14", "05", "entry_junior", "2025-07-14T10:00:00+09:00",
            "데이터 엔지니어 (기업 데이터 구축)",
            (
                ("주요업무", (
                    ("고객사 원천 데이터를 표준 스키마로 변환하는 배치를 구현합니다.", None, "application", None),
                    ("정기 적재 작업의 성공 여부와 품질 규칙을 점검합니다.", None, "foundation", None),
                )),
                ("자격요건", (
                    ("SQL로 데이터 변환과 검증 쿼리를 작성할 수 있는 분", "sql-analytics", "application", None),
                    ("Spark 기반 분산 처리의 기본 구조를 이해하는 분", "spark-batch", "foundation", None),
                )),
                ("우대사항", (
                    ("Airflow로 배치 일정을 관리해 본 경험", "workflow-orchestration", "foundation", None),
                )),
            ),
            "고객사 데이터를 표준화하고 적재 품질을 확인하는 주니어 역할입니다.",
        ),
        (
            "15", "08", "experienced", "2025-11-17T10:00:00+09:00",
            "게임 데이터 엔지니어 (라이브 이벤트)",
            (
                ("주요업무", (
                    ("게임 플레이 이벤트를 수집해 운영 지표와 밸런스 분석에 제공합니다.", None, "application", None),
                    ("대규모 로그 배치의 처리 시간과 장애 복구 절차를 개선합니다.", None, "tradeoff", None),
                )),
                ("자격요건", (
                    ("Kafka 소비 지연과 재처리 전략을 운영해 본 분", "streaming-ingest", "tradeoff", None),
                    ("Spark로 대규모 게임 로그를 집계해 본 분", "spark-batch", "application", None),
                    ("SQL로 운영 지표를 정의하고 검증할 수 있는 분", "sql-analytics", "application", None),
                )),
                ("우대사항", (
                    ("라이브 서비스 장애 대응 경험", None, "application", None),
                )),
            ),
            "라이브 게임 이벤트의 수집 지연과 대규모 배치를 함께 다루는 경력 역할입니다.",
        ),
    )
    by_nn = {posting["nn"]: posting for posting in recent}
    prior = tuple(
        {
            **by_nn[template_nn],
            "nn": nn,
            "period": PRIOR,
            "entry_label": entry_label,
            "entry_label_raw": "신입·주니어" if entry_label == "entry_junior" else "경력직",
            "career_label_raw": "신입~3년" if entry_label == "entry_junior" else "경력 2년 이상",
            "posted_at": posted_at,
            "title": title,
            "sections": sections,
            "summary": summary,
            "summary_ratio": "",
        }
        for nn, template_nn, entry_label, posted_at, title, sections, summary in prev_specs
    )
    return recent + prior


POSTINGS = expand_postings(POSTINGS)


# ============================================================ 4. 식별자 helper
def posting_id(nn: str) -> str:
    return f"dp_{JOB_ROLE_ID}_{nn}"


def snapshot_id(nn: str) -> str:
    return f"snap_demo_{JOB_ROLE_ID}_{nn}"


def source_id(nn: str) -> str:
    return f"src_demo_{JOB_ROLE_ID}_{nn}"


def posting_version_id(nn: str) -> str:
    return f"pv_demo_{JOB_ROLE_ID}_{nn}"


def chunk_id(nn: str, k: int) -> str:
    return f"chunk_demo_{JOB_ROLE_ID}_{nn}_{k}"


def posting_url(nn: str) -> str:
    return f"https://careersignal.example/demo/{JOB_ROLE_ID}/{posting_id(nn)}"


def raw_content(posting: dict[str, Any]) -> str:
    """스냅샷 원문. 제목과 세 구간을 그대로 잇는다."""
    parts = [posting["title"], ""]
    for section, lines in posting["sections"]:
        parts.append(f"[{section}]")
        parts.extend(line[0] for line in lines)
        parts.append("")
    return "\n".join(parts).strip() + "\n"


def chunk_text(lines: tuple[Any, ...]) -> str:
    """구간 청크의 본문. 줄을 그대로 잇는다. 근거 오프셋의 기준 문자열이다."""
    return "\n".join(line[0] for line in lines)


class Mention:
    """요구 표현 하나. 청크 안의 실제 위치를 함께 갖는다."""

    __slots__ = (
        "mention_id", "assignment_id", "posting", "nn", "chunk_id", "section",
        "raw_expression", "start", "end", "dim_slug", "requiredness", "depth",
        "stated_requiredness", "ann",
    )

    def __init__(
        self,
        posting: dict[str, Any],
        k: int,
        idx: int,
        section: str,
        line: tuple[Any, ...],
        text: str,
    ) -> None:
        nn = posting["nn"]
        self.posting = posting
        self.nn = nn
        self.mention_id = f"mention_{JOB_ROLE_ID}_{nn}_{idx}"
        self.assignment_id = f"assign_{JOB_ROLE_ID}_{nn}_{idx}"
        self.chunk_id = chunk_id(nn, k)
        self.section = section
        self.raw_expression = line[0]
        # 오프셋은 손으로 적지 않는다. 청크 원문에서 실제 자리를 찾는다.
        start = text.find(line[0])
        if start < 0:  # pragma: no cover - 데이터 오류
            raise ValueError(f"청크에서 표현을 찾지 못했다: {line[0]!r}")
        if text.count(line[0]) != 1:  # pragma: no cover - 데이터 오류
            raise ValueError(f"청크 안에서 표현이 여러 번 나온다: {line[0]!r}")
        self.start = start
        self.end = start + len(line[0])
        self.dim_slug = line[1]
        self.depth = line[2]
        self.ann = line[3]
        self.requiredness, self.stated_requiredness = SECTION_REQUIREDNESS[section]


def build_mentions() -> tuple[list[Mention], dict[str, dict[str, Any]]]:
    """공고 본문에서 표현을 뽑고 청크를 만든다."""
    mentions: list[Mention] = []
    chunks: dict[str, dict[str, Any]] = {}
    for posting in POSTINGS:
        nn = posting["nn"]
        idx = 0
        for k, (section, lines) in enumerate(posting["sections"], start=1):
            text = chunk_text(lines)
            chunks[chunk_id(nn, k)] = {
                "chunk_id": chunk_id(nn, k),
                "snapshot_id": snapshot_id(nn),
                "section": section,
                "ordinal": k - 1,
                "text": text,
                "posting": posting,
            }
            for line in lines:
                if line[1] is None:
                    continue
                idx += 1
                mentions.append(Mention(posting, k, idx, section, line, text))
    return mentions, chunks


MENTIONS, CHUNKS = build_mentions()
MENTIONS_BY_POSTING: dict[str, list[Mention]] = {}
for _m in MENTIONS:
    MENTIONS_BY_POSTING.setdefault(_m.nn, []).append(_m)

POSTING_BY_NN: dict[str, dict[str, Any]] = {p["nn"]: p for p in POSTINGS}
RECENT_POSTINGS = tuple(p for p in POSTINGS if p["period"] == RECENT)
PRIOR_POSTINGS = tuple(p for p in POSTINGS if p["period"] == PRIOR)
# 최근 1년에 공고가 있는 기업군만 최근 지표와 히트맵 행을 갖는다.
RECENT_CLUSTERS = tuple(c for c in CLUSTER_ORDER if any(p["cluster"] == c for p in RECENT_POSTINGS))


def assignments_of(nn: str) -> dict[str, tuple[str, str]]:
    """한 공고의 차원별 (requiredness, depth). 중복 제거 단위는 공고 버전이다."""
    result: dict[str, tuple[str, str]] = {}
    for mention in MENTIONS_BY_POSTING.get(nn, []):
        slug = mention.dim_slug
        current = result.get(slug)
        if current is None:
            result[slug] = (mention.requiredness, mention.depth)
            continue
        requiredness = "required" if "required" in (current[0], mention.requiredness) else current[0]
        depth = current[1] if DEPTH_RANK[current[1]] >= DEPTH_RANK[mention.depth] else mention.depth
        result[slug] = (requiredness, depth)
    return result


DIMS_BY_POSTING: dict[str, dict[str, tuple[str, str]]] = {
    p["nn"]: assignments_of(p["nn"]) for p in POSTINGS
}


def population(scope_level: str, scope_id: str, segment: str, period: str) -> tuple[dict[str, Any], ...]:
    """범위·대상군·기간에 해당하는 공고 버전 모집단."""
    rows = [p for p in POSTINGS if p["period"] == period]
    if scope_level == "cluster":
        rows = [p for p in rows if p["cluster"] == scope_id]
    if segment == SEGMENT_ENTRY:
        rows = [p for p in rows if p["entry_label"] == "entry_junior"]
    return tuple(rows)


SCOPES: tuple[tuple[str, str], ...] = (("overall", JOB_ROLE_ID),) + tuple(
    ("cluster", cid) for cid in CLUSTER_ORDER
)
SEGMENTS = (SEGMENT_ALL, SEGMENT_ENTRY)
PERIODS = (RECENT, PRIOR)


def pct(numerator: int, denominator: int) -> int | None:
    return None if denominator == 0 else round(numerator / denominator * 100)


def wilson(numerator: int, denominator: int) -> dict[str, Any]:
    """Wilson 95% 구간. `metrics/policy.py` 의 구현과 같은 식이다."""
    z = 1.959964
    n = denominator
    p = numerator / n
    denom = 1 + z * z / n
    center = (p + z * z / (2 * n)) / denom
    margin = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return {
        "method": "wilson_95",
        "lower": round(max(0.0, center - margin), 6),
        "upper": round(min(1.0, center + margin), 6),
    }


# ============================================================ 5. 지표 사실
# 분자·분모는 손으로 적지 않는다. 아래 함수가 할당 행을 세어 만든다.
WILSON_MEASURES: dict[str, frozenset[str]] = {
    "posting_prevalence": frozenset({"ratio"}),
    "requiredness_ratio": frozenset({"ratio"}),
    "depth_distribution": frozenset(DEPTHS),
    "cluster_contrast": frozenset(),
    "cooccurrence": frozenset({"jaccard", "conditional_a_given_b", "conditional_b_given_a"}),
    "scope_expansion": frozenset({"ratio"}),
    "entry_label_advanced_signal_rate": frozenset({"ratio"}),
}

COOCCURRENCE_PAIRS: tuple[tuple[str, str], ...] = tuple(
    sorted(
        (a, b) if dim_id(a) < dim_id(b) else (b, a)
        for a, b in (
            ("sql-analytics", "data-warehouse"),
            ("sql-analytics", "spark-batch"),
            ("spark-batch", "workflow-orchestration"),
            ("data-warehouse", "workflow-orchestration"),
            ("streaming-ingest", "spark-batch"),
        )
    )
)

BOUNDARY_SLUGS = tuple(s for s in DIM_SLUGS if DIM_INFO[s]["boundary"])


class FactBuilder:
    """`statistics_facts` 를 만들고 조회 색인을 함께 남긴다."""

    def __init__(self) -> None:
        self.rows: list[dict[str, Any]] = []
        self.index: dict[tuple[Any, ...], dict[str, Any]] = {}
        self._seq = 0

    def add(
        self,
        *,
        family: str,
        measure: str,
        scope_level: str,
        scope_id: str,
        segment: str,
        period: str,
        numerator: int | None,
        denominator: int | None,
        sample_size: int,
        dimension: str | None = None,
        secondary: str | None = None,
        value: float | None = None,
    ) -> dict[str, Any]:
        self._seq += 1
        computed = value
        if computed is None and numerator is not None and denominator:
            computed = round(numerator / denominator, 6)
        # CONTRACT 10.3 — overall 은 analysis_ready, 기업군은 표본이 작아 low_confidence.
        status = "analysis_ready" if scope_level == "overall" else "low_confidence"
        uncertainty = None
        if measure in WILSON_MEASURES[family] and denominator and numerator is not None:
            uncertainty = wilson(numerator, denominator)
        row = {
            "fact_id": f"fact_demo_{JOB_ROLE_ID}_{self._seq:06d}",
            "analysis_version": ANALYSIS_VERSION,
            "metric_family": family,
            "metric_policy_version": METRIC_POLICY[family],
            "scope_level": scope_level,
            "scope_id": scope_id,
            "entry_segment": segment,
            "period_id": period,
            "dimension_id": dim_id(dimension) if dimension else None,
            "secondary_dimension_id": dim_id(secondary) if secondary else None,
            "measure": measure,
            "numerator": numerator,
            "denominator": denominator,
            "value": computed,
            "sample_size": sample_size,
            "sample_status": status,
            "uncertainty": uncertainty,
        }
        self.rows.append(row)
        key = (family, measure, scope_level, scope_id, segment, period, dimension, secondary)
        self.index[key] = row
        return row

    def get(
        self,
        family: str,
        measure: str,
        scope_level: str,
        scope_id: str,
        segment: str,
        period: str,
        dimension: str | None = None,
        secondary: str | None = None,
    ) -> dict[str, Any] | None:
        return self.index.get(
            (family, measure, scope_level, scope_id, segment, period, dimension, secondary)
        )


def build_statistics_facts() -> FactBuilder:
    builder = FactBuilder()

    for scope_level, scope_id in SCOPES:
        for segment in SEGMENTS:
            for period in PERIODS:
                rows = population(scope_level, scope_id, segment, period)
                total = len(rows)
                if total == 0:
                    continue  # 모집단이 없으면 계산 대상이 아니다.
                dim_sets = {p["nn"]: DIMS_BY_POSTING[p["nn"]] for p in rows}

                # --- posting_prevalence · requiredness_ratio · depth_distribution
                for slug in DIM_SLUGS:
                    present = [nn for nn, dims in dim_sets.items() if slug in dims]
                    builder.add(
                        family="posting_prevalence", measure="ratio",
                        scope_level=scope_level, scope_id=scope_id, segment=segment,
                        period=period, dimension=slug,
                        numerator=len(present), denominator=total, sample_size=total,
                    )
                    if not present:
                        continue
                    required = sum(1 for nn in present if dim_sets[nn][slug][0] == "required")
                    builder.add(
                        family="requiredness_ratio", measure="ratio",
                        scope_level=scope_level, scope_id=scope_id, segment=segment,
                        period=period, dimension=slug,
                        numerator=required, denominator=len(present), sample_size=len(present),
                    )
                    counts = Counter(dim_sets[nn][slug][1] for nn in present)
                    for depth in DEPTHS:
                        builder.add(
                            family="depth_distribution", measure=depth,
                            scope_level=scope_level, scope_id=scope_id, segment=segment,
                            period=period, dimension=slug,
                            numerator=counts.get(depth, 0), denominator=len(present),
                            sample_size=len(present),
                        )

                # --- scope_expansion (역할 경계 차원을 요구한 공고 비율)
                boundary = sum(
                    1 for dims in dim_sets.values()
                    if any(slug in dims for slug in BOUNDARY_SLUGS)
                )
                builder.add(
                    family="scope_expansion", measure="ratio",
                    scope_level=scope_level, scope_id=scope_id, segment=segment,
                    period=period, numerator=boundary, denominator=total, sample_size=total,
                )

                # --- entry_label_advanced_signal_rate (대상군 축이 entry_junior 로 고정)
                if segment == SEGMENT_ENTRY:
                    advanced = sum(
                        1 for dims in dim_sets.values()
                        if any(depth == "tradeoff" for _, depth in dims.values())
                    )
                    builder.add(
                        family="entry_label_advanced_signal_rate", measure="ratio",
                        scope_level=scope_level, scope_id=scope_id, segment=segment,
                        period=period, numerator=advanced, denominator=total, sample_size=total,
                    )

                # --- cooccurrence (전체 범위에서만 만든다)
                if scope_level == "overall":
                    for a, b in COOCCURRENCE_PAIRS:
                        set_a = {nn for nn, dims in dim_sets.items() if a in dims}
                        set_b = {nn for nn, dims in dim_sets.items() if b in dims}
                        n_ab = len(set_a & set_b)
                        n_union = len(set_a | set_b)
                        builder.add(
                            family="cooccurrence", measure="count",
                            scope_level=scope_level, scope_id=scope_id, segment=segment,
                            period=period, dimension=a, secondary=b,
                            numerator=n_ab, denominator=None, sample_size=total,
                            value=float(n_ab),
                        )
                        if n_union:
                            builder.add(
                                family="cooccurrence", measure="jaccard",
                                scope_level=scope_level, scope_id=scope_id, segment=segment,
                                period=period, dimension=a, secondary=b,
                                numerator=n_ab, denominator=n_union, sample_size=total,
                            )
                        if set_b:
                            builder.add(
                                family="cooccurrence", measure="conditional_a_given_b",
                                scope_level=scope_level, scope_id=scope_id, segment=segment,
                                period=period, dimension=a, secondary=b,
                                numerator=n_ab, denominator=len(set_b), sample_size=total,
                            )
                        if set_a:
                            builder.add(
                                family="cooccurrence", measure="conditional_b_given_a",
                                scope_level=scope_level, scope_id=scope_id, segment=segment,
                                period=period, dimension=a, secondary=b,
                                numerator=n_ab, denominator=len(set_a), sample_size=total,
                            )
                        if set_a and set_b:
                            lift = (n_ab / total) / ((len(set_a) / total) * (len(set_b) / total))
                            builder.add(
                                family="cooccurrence", measure="association_lift",
                                scope_level=scope_level, scope_id=scope_id, segment=segment,
                                period=period, dimension=a, secondary=b,
                                numerator=n_ab, denominator=total, sample_size=total,
                                value=round(lift, 6),
                            )

    # --- cluster_contrast (기업군 비율에서 직무 전체 비율을 뺀다)
    for cluster_id in CLUSTER_ORDER:
        for segment in SEGMENTS:
            for period in PERIODS:
                rows = population("cluster", cluster_id, segment, period)
                if not rows:
                    continue
                total = len(rows)
                for slug in DIM_SLUGS:
                    cluster_fact = builder.get(
                        "posting_prevalence", "ratio", "cluster", cluster_id, segment, period, slug
                    )
                    overall_fact = builder.get(
                        "posting_prevalence", "ratio", "overall", JOB_ROLE_ID, segment, period, slug
                    )
                    if cluster_fact is None or overall_fact is None:
                        continue
                    cluster_ratio = cluster_fact["value"] or 0.0
                    baseline_ratio = overall_fact["value"] or 0.0
                    builder.add(
                        family="cluster_contrast", measure="prevalence_difference",
                        scope_level="cluster", scope_id=cluster_id, segment=segment,
                        period=period, dimension=slug,
                        numerator=cluster_fact["numerator"], denominator=total,
                        sample_size=total, value=round(cluster_ratio - baseline_ratio, 6),
                    )
                    if baseline_ratio:
                        builder.add(
                            family="cluster_contrast", measure="prevalence_ratio",
                            scope_level="cluster", scope_id=cluster_id, segment=segment,
                            period=period, dimension=slug,
                            numerator=cluster_fact["numerator"], denominator=total,
                            sample_size=total, value=round(cluster_ratio / baseline_ratio, 6),
                        )
    return builder


FACTS = build_statistics_facts()


# ============================================================ 6. 통계 payload 라벨
# CONTRACT 5장 A. tag·type·id·축 라벨은 데이터 엔지니어 전용이다. 다른 직무에 쓰지 않는다.
SCOPE_EXPANSION_TAGS: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    ("platform_ops", "플랫폼·스케줄러 운영", "DAG 스케줄과 재처리 운영까지 요구",
     ("workflow-orchestration",)),
    ("realtime_ops", "실시간 수집 운영", "브로커와 스트림 수집 운영까지 요구",
     ("streaming-ingest",)),
)

ADVANCED_TYPES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("scale_volume", "처리 규모·병목", ("spark-batch",)),
    ("integrity_reconcile", "집계 정합성·대사", ("data-warehouse",)),
    ("latency_freshness", "지연·최신성 보장", ("streaming-ingest",)),
)

COMBOS: tuple[tuple[str, str, str, str, tuple[str, ...]], ...] = (
    ("warehouse", "SQL + 웨어하우스 모델링",
     "요구를 분석용 테이블로 옮기고 집계 쿼리까지 잇는 기본 조합입니다.",
     "팩트·디멘전을 나눈 근거를 말할 수 있는 수준",
     ("sql-analytics", "data-warehouse")),
    ("batch_core", "SQL + 분산 배치 + 오케스트레이션",
     "매일 도는 배치를 DAG 로 묶어 운영해 본 경험을 묻는 조합입니다.",
     "DAG 한 벌을 스케줄로 돌린 수준",
     ("sql-analytics", "spark-batch", "workflow-orchestration")),
    ("orchestrated_mart", "오케스트레이션 + 웨어하우스",
     "적재 순서와 재처리를 테이블 설계와 함께 다루는 조합입니다.",
     "재처리해도 값이 두 번 더해지지 않는 설계",
     ("workflow-orchestration", "data-warehouse")),
    ("lakehouse", "분산 배치 + 웨어하우스 + 오케스트레이션",
     "수집부터 마트까지 한 줄로 잇는 조합입니다.",
     "원천에서 마트까지 한 흐름을 완성",
     ("spark-batch", "data-warehouse", "workflow-orchestration")),
    ("streaming", "스트리밍 수집",
     "배치 주기를 줄이려는 팀이 묻는 우대 조합입니다.",
     "토픽·파티션 개념 이해와 토이 수준 구현",
     ("streaming-ingest",)),
)

REALITY_TAGS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("pipeline_project", "직접 만들어 돌려 본 파이프라인", ("spark-batch", "workflow-orchestration")),
    ("modeling_evidence", "분석용 테이블을 설계해 본 경험", ("data-warehouse",)),
    ("realtime_ingest", "실시간 수집까지 다뤄 본 경험", ("streaming-ingest",)),
)

CLUSTER_AXES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("volume_scale", "대용량·분산 처리", ("spark-batch",)),
    ("modeling_warehouse", "모델링·웨어하우스", ("data-warehouse",)),
    ("orchestration_ops", "오케스트레이션·운영", ("workflow-orchestration",)),
    ("realtime_stream", "실시간·스트리밍", ("streaming-ingest",)),
    ("query_quality", "쿼리·집계 품질", ("sql-analytics",)),
)


def axis_level(value: int | None) -> str:
    if value is None or value < 15:
        return "—"
    if value >= 60:
        return "강"
    if value >= 35:
        return "중"
    return "약"


def freq(slug: str, period: str = RECENT, segment: str = SEGMENT_ALL) -> int:
    fact = FACTS.get("posting_prevalence", "ratio", "overall", JOB_ROLE_ID, segment, period, slug)
    return 0 if fact is None else int(fact["numerator"])


def freq_pct(slug: str, period: str = RECENT) -> int | None:
    fact = FACTS.get("posting_prevalence", "ratio", "overall", JOB_ROLE_ID, SEGMENT_ALL, period, slug)
    if fact is None:
        return None
    return pct(int(fact["numerator"]), int(fact["denominator"]))


def required_pct(slug: str, period: str = RECENT) -> int | None:
    fact = FACTS.get("requiredness_ratio", "ratio", "overall", JOB_ROLE_ID, SEGMENT_ALL, period, slug)
    if fact is None:
        return None
    return pct(int(fact["numerator"]), int(fact["denominator"]))


def evidence_lines(slug: str, limit: int = 3) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for posting in RECENT_POSTINGS:
        for mention in MENTIONS_BY_POSTING[posting["nn"]]:
            if mention.dim_slug != slug:
                continue
            rows.append({
                "text": mention.raw_expression,
                "posting_id": posting_id(posting["nn"]),
                "source_url": posting_url(posting["nn"]),
            })
            break
        if len(rows) >= limit:
            break
    return rows


def build_statistics_payload() -> dict[str, Any]:
    recent_n = len(RECENT_POSTINGS)
    prev_n = len(PRIOR_POSTINGS)
    cluster_n = Counter(p["cluster"] for p in RECENT_POSTINGS)

    # --- KPI
    avg_skills = round(
        sum(len(DIMS_BY_POSTING[p["nn"]]) for p in RECENT_POSTINGS) / recent_n, 1
    )
    expansion_fact = FACTS.get(
        "scope_expansion", "ratio", "overall", JOB_ROLE_ID, SEGMENT_ALL, RECENT
    )
    entry_fact = FACTS.get(
        "entry_label_advanced_signal_rate", "ratio", "overall", JOB_ROLE_ID, SEGMENT_ENTRY, RECENT
    )
    advanced_n = sum(
        1 for p in RECENT_POSTINGS
        if any(depth == "tradeoff" for _, depth in DIMS_BY_POSTING[p["nn"]].values())
    )

    # 우대→필수 이동. 표본이 작아 최소 등장 2건으로 둔다.
    promoted: list[str] = []
    for slug in DIM_SLUGS:
        if freq(slug, RECENT) < 2 or freq(slug, PRIOR) < 2:
            continue
        prev_ratio, recent_ratio = required_pct(slug, PRIOR), required_pct(slug, RECENT)
        if prev_ratio is None or recent_ratio is None:
            continue
        if prev_ratio < 40 and recent_ratio - prev_ratio >= 20:
            promoted.append(slug)

    kpi = {
        "avg_required_skills": {"value": avg_skills, "unit": "개"},
        "out_of_role_pct": {
            "value": pct(int(expansion_fact["numerator"]), int(expansion_fact["denominator"])),
            "unit": "%",
        },
        "entry_label_gap_pct": {
            "value": pct(int(entry_fact["numerator"]), int(entry_fact["denominator"])),
            "unit": "%", "highlight": True,
        },
        "promoted_to_required_cnt": {"value": len(promoted), "unit": "개"},
        "advanced_mention_pct": {"value": pct(advanced_n, recent_n), "unit": "%"},
    }

    # --- scope_expansion
    scope_expansion = []
    for tag, label, desc, slugs in SCOPE_EXPANSION_TAGS:
        count = sum(
            1 for p in RECENT_POSTINGS
            if any(slug in DIMS_BY_POSTING[p["nn"]] for slug in slugs)
        )
        if count:
            scope_expansion.append({
                "tag": tag, "label": label, "desc": desc,
                "count": count, "pct": pct(count, recent_n),
            })
    scope_expansion.sort(key=lambda row: -row["count"])

    # --- inflation
    inflation_items = []
    for slug in DIM_SLUGS:
        if freq(slug, RECENT) < 2 or freq(slug, PRIOR) < 2:
            continue
        prev_ratio, recent_ratio = required_pct(slug, PRIOR), required_pct(slug, RECENT)
        if prev_ratio is None or recent_ratio is None:
            continue
        delta = recent_ratio - prev_ratio
        if delta >= 15:
            inflation_items.append({
                "item_id": slug, "name": DIM_INFO[slug]["label"],
                "prev_ratio": prev_ratio, "recent_ratio": recent_ratio, "delta": delta,
            })
    inflation_items.sort(key=lambda row: -row["delta"])
    inflation = {"items": inflation_items[:5], "stable": not inflation_items}

    # --- trend3
    trend_rows = []
    for slug in DIM_SLUGS:
        recent_p, prev_p = freq_pct(slug, RECENT), freq_pct(slug, PRIOR)
        if recent_p is None:
            continue
        delta = None if prev_p is None else recent_p - prev_p
        trend_rows.append({
            "item_id": slug, "name": DIM_INFO[slug]["label"],
            "prev_pct": prev_p, "recent_pct": recent_p, "delta": delta,
        })
    trend3 = {
        "increase": sorted(
            [r for r in trend_rows if r["delta"] is not None and r["delta"] >= 8],
            key=lambda r: -r["delta"])[:3],
        "stable": sorted(
            [r for r in trend_rows if r["delta"] is not None and abs(r["delta"]) < 8],
            key=lambda r: -r["recent_pct"])[:3],
        "decrease": sorted(
            [r for r in trend_rows if r["delta"] is not None and r["delta"] <= -8],
            key=lambda r: r["delta"])[:3],
    }

    # --- labels
    def dist(field: str) -> list[dict[str, Any]]:
        counts = Counter(p[field] for p in RECENT_POSTINGS)
        rows = [{"label": label, "pct": pct(n, recent_n)} for label, n in counts.items()]
        rows.sort(key=lambda r: -r["pct"])
        return rows[:3]

    labels = {"edu": dist("edu_label_raw"), "career": dist("career_label_raw")}

    # --- advanced
    advanced = []
    for type_id, label, slugs in ADVANCED_TYPES:
        hits = [
            p for p in RECENT_POSTINGS
            if any(
                slug in DIMS_BY_POSTING[p["nn"]] and DIMS_BY_POSTING[p["nn"]][slug][1] == "tradeoff"
                for slug in slugs
            )
        ]
        if not hits:
            continue
        quote = None
        for mention in MENTIONS_BY_POSTING[hits[0]["nn"]]:
            if mention.dim_slug in slugs and mention.depth == "tradeoff":
                quote = mention.raw_expression
                break
        advanced.append({
            "type": type_id, "label": label, "count": len(hits),
            "pct": pct(len(hits), recent_n), "quote": quote,
            "more_count": max(0, len(hits) - 1),
        })
    advanced.sort(key=lambda row: -row["count"])

    # --- combos
    combos = []
    for combo_id, name, desc, level, slugs in COMBOS:
        count = sum(
            1 for p in RECENT_POSTINGS
            if all(slug in DIMS_BY_POSTING[p["nn"]] for slug in slugs)
        )
        if count:
            combos.append({
                "id": combo_id, "name": name, "desc": desc, "level": level,
                "count": count, "pct": pct(count, recent_n),
                "interpretation_source": "synthetic",
            })
    combos.sort(key=lambda row: -row["count"])

    # --- reality
    reality = []
    for tag, label, slugs in REALITY_TAGS:
        count = sum(
            1 for p in RECENT_POSTINGS
            if any(slug in DIMS_BY_POSTING[p["nn"]] for slug in slugs)
        )
        value = pct(count, recent_n)
        if value:
            reality.append({"tag": tag, "label": label, "pct": value})
    reality.sort(key=lambda row: -row["pct"])

    # --- cluster_axes (최근 1년 공고가 있는 기업군만 행을 갖는다)
    axes_rows = []
    for cluster_id in CLUSTER_ORDER:
        n = cluster_n.get(cluster_id, 0)
        if not n:
            continue
        members = [p for p in RECENT_POSTINGS if p["cluster"] == cluster_id]
        cells = []
        for _axis_id, axis_label, slugs in CLUSTER_AXES:
            count = sum(
                1 for p in members
                if any(slug in DIMS_BY_POSTING[p["nn"]] for slug in slugs)
            )
            value = pct(count, n)
            cells.append({"axis": axis_label, "pct": value, "level": axis_level(value)})
        axes_rows.append({"cluster": CLUSTERS[cluster_id], "n": n, "cells": cells})
    cluster_axes = {"axes": [label for _id, label, _s in CLUSTER_AXES], "rows": axes_rows}

    # --- tech_freq
    tech_freq = []
    for slug in DIM_SLUGS:
        if DIM_INFO[slug]["kind"] not in ("technology", "tooling"):
            continue
        count = freq(slug, RECENT)
        if not count:
            continue
        tech_freq.append({
            "name": DIM_INFO[slug]["label"], "slug": slug, "count": count,
            "pct": freq_pct(slug, RECENT), "required_ratio": required_pct(slug, RECENT),
        })
    tech_freq.sort(key=lambda row: -row["count"])

    # --- items
    items = []
    for slug in DIM_SLUGS:
        count = freq(slug, RECENT)
        by_cluster: dict[str, int] = {}
        support_cluster: dict[str, int] = {}
        for cluster_id in RECENT_CLUSTERS:
            n = cluster_n.get(cluster_id, 0)
            if not n:
                continue
            hits = sum(
                1 for p in RECENT_POSTINGS
                if p["cluster"] == cluster_id and slug in DIMS_BY_POSTING[p["nn"]]
            )
            support_cluster[CLUSTERS[cluster_id]] = hits
            by_cluster[CLUSTERS[cluster_id]] = pct(hits, n)
        recent_p, prev_p = freq_pct(slug, RECENT), freq_pct(slug, PRIOR)
        delta = None if prev_p is None else recent_p - prev_p
        direction = "unknown" if delta is None else (
            "increase" if delta >= 8 else "decrease" if delta <= -8 else "stable"
        )
        depths = [
            DIMS_BY_POSTING[p["nn"]][slug][1]
            for p in RECENT_POSTINGS if slug in DIMS_BY_POSTING[p["nn"]]
        ]
        impl = max(depths, key=lambda d: DEPTH_RANK[d]) if depths else None
        items.append({
            "item_id": slug,
            "name": DIM_INFO[slug]["label"],
            "aliases": list(DIM_INFO[slug]["aliases"]),
            "category": DIM_INFO[slug]["kind"],
            "scope": "out_of_role" if DIM_INFO[slug]["boundary"] else "in_role",
            "is_advanced": impl == "tradeoff",
            "freq_overall": recent_p,
            "required_ratio": required_pct(slug, RECENT),
            "freq_by_cluster": by_cluster,
            "trend": {
                "prev_pct": prev_p, "recent_pct": recent_p, "direction": direction,
                "requirement_shift": "preferred_to_required" if slug in promoted else None,
            },
            "impl_level": impl,
            "evidence": evidence_lines(slug),
            "support": {"n_overall": count, "n_by_cluster": support_cluster},
            "confidence": "high" if count >= 4 else "medium" if count >= 2 else "low",
        })
    items.sort(key=lambda row: -(row["freq_overall"] or 0))

    return {
        "job": JOB_ROLE_ID,
        "meta": {
            "generated_at": NOW,
            "snapshots": {
                "recent": {"label": "2026년", "n": recent_n},
                "prev": {"label": "2024~2025년", "n": prev_n},
            },
            "sources": ["job_posting"],
            "disclaimer": "생성 데이터 기반 결과입니다",
            "dataset_version": DATASET_VERSION,
            "analysis_version": ANALYSIS_VERSION,
            "is_synthetic": True,
        },
        "kpi": kpi,
        "scope_expansion": scope_expansion,
        "inflation": inflation,
        "trend3": trend3,
        "labels": labels,
        "advanced": advanced,
        "combos": combos,
        "reality": reality,
        "cluster_axes": cluster_axes,
        "tech_freq": tech_freq,
        "items": items,
        "error": None,
    }


STATISTICS_PAYLOAD = build_statistics_payload()


# ============================================================ 7. 해석 payload
# 기준선 여덟 항목. 앞 다섯은 요구 차원이고 뒤 셋은 차원 밖의 공통 기대치라
# 등장 비율을 아래 술어로 따로 센다.
PSEUDO_BASELINE: dict[str, tuple[str, Any]] = {
    "pipeline-ops": ("실패 감지와 재처리 운영", lambda dims: "workflow-orchestration" in dims),
    "value-verification": ("집계 값 검증 습관", lambda dims: any(d == "tradeoff" for _, d in dims.values())),
    "volume-sense": ("데이터 규모 감각", lambda dims: "spark-batch" in dims),
}


def pseudo_pct(slug: str) -> int | None:
    """차원 밖 기준선 항목의 최근 1년 등장 비율."""
    predicate = PSEUDO_BASELINE[slug][1]
    hits = sum(1 for p in RECENT_POSTINGS if predicate(DIMS_BY_POSTING[p["nn"]]))
    return pct(hits, len(RECENT_POSTINGS))


BASELINE_ITEMS: tuple[tuple[str, str, str], ...] = (
    ("sql-analytics", "SQL 집계와 실행 계획 읽기",
     "요구를 집계 쿼리로 옮기고 왜 느린지를 말할 수 있는 능력입니다. 최근 공고 전량이 요구해 사실상 전제 조건에 해당합니다."),
    ("spark-batch", "Spark 배치 처리 구현",
     "대량 데이터를 나눠 처리하는 분산 배치 경험입니다. 규모 자체보다 파티션과 셔플을 왜 조정했는지가 기대 수준입니다."),
    ("workflow-orchestration", "워크플로 스케줄 운영",
     "DAG 로 의존을 정의하고 실패를 재처리하는 운영 경험입니다. 데이터 플랫폼 팀과 경계가 겹치지만 등장 빈도는 기본기에 가깝습니다."),
    ("data-warehouse", "웨어하우스 테이블 모델링",
     "분석용 테이블과 마트를 설계하는 능력입니다. 1년 새 등장이 뚜렷하게 늘어 기준선의 중심으로 올라온 항목입니다."),
    ("streaming-ingest", "스트리밍 수집 기본 이해",
     "토픽·파티션과 컨슈머의 개념 이해입니다. 필수율이 0에 가까워 우대의 자리를 지키고 있습니다."),
    ("pipeline-ops", "실패 감지와 재처리 운영",
     "배치가 멈췄을 때 알아채고 되돌리는 절차입니다. 공고 문장보다 담당업무 설명에서 반복되는 기대치입니다."),
    ("value-verification", "집계 값 검증 습관",
     "적재가 끝난 뒤 값이 맞는지 확인하는 절차입니다. 검증 쿼리를 파이프라인 안에 넣어 본 경험이 그대로 증거가 됩니다."),
    ("volume-sense", "데이터 규모 감각",
     "몇 건을 몇 분에 처리했는지를 숫자로 말하는 감각입니다. 규모를 경험하지 못해도 측정한 기록은 남길 수 있습니다."),
)

UNCHANGED_ITEMS: tuple[tuple[str, str, str], ...] = (
    ("sql-analytics", "SQL 집계와 실행 계획 읽기",
     "이 기업군도 요구 수준은 공통 기대치와 같습니다. 차별화 지점이 아니라 전제 조건입니다."),
    ("workflow-orchestration", "워크플로 스케줄 운영",
     "DAG 운영 요구는 기업군과 무관하게 동일합니다. 준비했다면 어디에나 통하는 항목입니다."),
    ("pipeline-ops", "실패 감지와 재처리 운영",
     "실패를 다루는 기대치는 전 기업군 공통입니다. 더 요구하지도, 덜 보지도 않습니다."),
    ("streaming-ingest", "스트리밍 수집 기본 이해",
     "스트리밍은 어느 기업군에서도 우대 자리를 지킵니다. 필수 항목을 채운 다음의 선택지입니다."),
)

# 기업군별 편차. (차원 slug, 주제, 기준선, 편차, 근거, 해석, 신뢰도, 근거 블록, 체크 개념)
CLUSTER_DEVIATIONS: dict[str, tuple[tuple[str, ...], ...]] = {
    "bigtech_platform": (
        ("spark-batch", "처리 규모", "분산 배치를 돌려 본 경험", "파티션·셔플까지 조정해 본 경험",
         '자격요건의 "하루 수십억 건 규모의 배치" 문장',
         "규모가 전제로 깔린 공고입니다. 신입에게 그 규모의 경험을 기대하는 것이 아니라 무엇이 병목이었고 무엇을 바꿨는지를 묻습니다.",
         "high", "#advanced", "spark-optimize"),
        ("sql-analytics", "쿼리 비용", "실행 계획을 읽는 정도", "스캔량과 비용을 줄여 본 경험까지",
         '우대사항의 "쿼리 비용과 스토리지 비용을 줄여 본 경험" 문장',
         "규모가 큰 조직은 성능만큼 비용을 봅니다. 파티션을 잘라 스캔량을 줄인 전후 숫자 한 줄이면 이 편차는 채워집니다.",
         "mid", "#items", "cost-optimize"),
        ("streaming-ingest", "실시간 수집", "개념 이해", "이벤트 스트림 수집 운영까지",
         '우대사항의 "Kafka로 실시간 이벤트 스트림을 수집해 본 경험" 문장',
         "서비스가 여럿이면 배치 주기로는 못 따라갑니다. 개념 이해에 토이 수준 구현이 붙으면 우대 이상으로 읽힙니다.",
         "mid", "#scope_expansion", "streaming-pipeline"),
    ),
    "fintech_finance": (
        ("data-warehouse", "정합성", "테이블 설계 기본", "재처리해도 값이 두 번 더해지지 않는 설계까지",
         '자격요건의 "원장과 집계 결과가 어긋나지 않도록" 문장',
         "돈을 다루는 데이터는 한 건이 어긋나면 장부가 어긋납니다. 멱등한 적재를 설계해 본 경험이 이 기업군의 실질 관문입니다.",
         "high", "#advanced", "reconciliation"),
        ("sql-analytics", "값 검증", "집계 쿼리 작성", "집계 결과를 원천과 대사하는 절차까지",
         '주요업무의 "지표 정합성 검증 절차를 만들고" 문장',
         "적재보다 확인하는 일이 더 많은 팀입니다. 검증 쿼리를 파이프라인 안에 넣어 본 경험이 그대로 답이 됩니다.",
         "high", "#items", "data-quality"),
        ("workflow-orchestration", "규제", "스케줄 운영", "비식별·보관 규칙을 파이프라인에 반영까지",
         '주요업무의 "개인정보 비식별 처리 규칙을 파이프라인에 반영" 문장',
         "규제가 테이블 설계보다 먼저 들어옵니다. 마스킹 규칙을 한 번 설계해 본 경험이면 대화가 됩니다.",
         "mid", "#scope_expansion", "governance-rule"),
    ),
    "b2b_saas": (
        ("data-warehouse", "지표 정의", "테이블 설계", "고객사별 지표 정의를 문서로 합의까지",
         '우대사항의 "지표 정의를 문서로 남겨 본 경험" 문장',
         "같은 활성 사용자라도 고객사마다 정의가 다릅니다. 정의를 합의하고 문서로 남긴 기록이 여기서 가장 큰 값을 갖습니다.",
         "high", "#items", "metric-doc"),
        ("workflow-orchestration", "실행 환경", "DAG 운영", "인프라 도구로 실행 환경 구성까지",
         '우대사항의 "Terraform·Kubernetes로 실행 환경을 직접 구성" 문장',
         "데이터 엔지니어 공고인데 인프라 도구를 묻습니다. 플랫폼 팀과 경계가 붙어 있는 조직이라는 신호입니다.",
         "mid", "#scope_expansion", "infra-basics"),
        ("sql-analytics", "경계", "집계 쿼리", "고객사 경계를 유지한 집계까지",
         '주요업무의 "고객사별 사용량 데이터를 수집·집계" 문장',
         "집계에 경계가 하나 더 붙습니다. 테넌트 컬럼을 빠뜨리면 남의 숫자가 섞이는 구조를 이해하는지를 봅니다.",
         "mid", "#items", "data-quality"),
    ),
    "si_enterprise": (
        ("data-warehouse", "표준 모델", "테이블 설계", "표준 데이터 모델과 산출물 문서까지",
         '주요업무의 "표준 데이터 모델과 산출물 문서를 작성" 문장',
         "제품이 아니라 납품입니다. 설계를 문서로 남겨 다음 프로젝트가 그대로 쓸 수 있게 만드는지를 봅니다.",
         "high", "#items", "standard-doc"),
        ("sql-analytics", "요구 합의", "요구를 쿼리로 옮김", "요구사항을 문서로 정리하고 합의까지",
         '자격요건의 "고객 요구사항을 문서로 정리하고 합의해 본 분" 문장',
         "받아 적는 것이 아니라 범위를 좁혀 합의한 기록을 봅니다. 협업 산출물 하나가 이 문장을 증명합니다.",
         "high", "#items", "requirement-doc"),
        ("workflow-orchestration", "운영 이관", "스케줄 운영", "이관 절차와 매뉴얼 정리까지",
         '주요업무의 "운영 이관을 위한 절차와 매뉴얼을 정리" 문장',
         "만든 사람이 계속 보지 않습니다. 남이 읽고 돌릴 수 있게 남기는 습관이 이 기업군의 기본 요구입니다.",
         "mid", "#scope_expansion", "handover-story"),
    ),
    "startup": (
        ("workflow-orchestration", "오너십", "DAG 작성", "구성부터 배포·운영까지 단독 담당",
         '주요업무의 "파이프라인 구성부터 배포·운영까지 직접 담당" 문장',
         "인원이 적어 담당 범위가 넓습니다. 나눠 맡은 역할이 아니라 하나를 끝까지 끌고 간 기록이 필요합니다.",
         "high", "#items", "ownership-story"),
        ("spark-batch", "병목 개선", "분산 배치 실행", "병목을 찾아 개선한 기록까지",
         '자격요건의 "테라바이트급 데이터를 처리하며 병목을 개선" 문장',
         "규모보다 개선의 과정을 봅니다. 실행 시간을 재고 설정을 바꾼 전후 비교가 그대로 답이 됩니다.",
         "high", "#advanced", "spark-optimize"),
        ("streaming-ingest", "학습 데이터", "수집 개념", "학습·평가 데이터셋 품질 관리까지",
         '주요업무의 "학습·평가 데이터의 버전과 품질을 관리" 문장',
         "소비처가 모델이라 중복과 누락의 기준이 더 빡빡합니다. 데이터에 버전을 붙여 본 경험이 값을 갖습니다.",
         "mid", "#combos", "ml-dataset"),
    ),
    "game": (
        ("streaming-ingest", "로그 수집", "개념 이해", "게임 로그 실시간 수집 운영까지",
         '우대사항의 "Kafka로 실시간 로그를 수집해 본 경험" 문장',
         "로그가 초 단위로 쏟아지는 도메인입니다. 유실과 중복을 어떻게 다룰지 말할 수 있으면 우대 이상으로 읽힙니다.",
         "mid", "#scope_expansion", "streaming-pipeline"),
        ("spark-batch", "로그 규모", "배치 처리", "피크 시간대 대량 로그 처리까지",
         '우대사항의 "Spark로 로그 배치를 처리해 본 경험" 문장',
         "동시 접속이 몰리는 시간대에 로그량이 몇 배로 뜁니다. 평균이 아니라 최대를 기준으로 생각해 본 흔적을 봅니다.",
         "mid", "#advanced", "volume-story"),
        ("sql-analytics", "지표 분석", "집계 쿼리", "A/B 테스트 지표 산출까지",
         '주요업무의 "지표 분석과 A/B 테스트에 필요한 데이터를 제공" 문장',
         "숫자를 만들어 주는 자리라 정의가 흔들리면 실험 결과가 흔들립니다. 지표 정의를 남긴 경험이 여기서도 쓰입니다.",
         "mid", "#items", "metric-doc"),
    ),
}

DEVIATION_KEYS = (
    "item_id", "topic", "baseline", "deviation", "evidence", "explanation",
    "confidence", "ratio", "related_stat",
)


def deviation_rows(cluster_id: str) -> list[dict[str, Any]]:
    rows = []
    for entry in CLUSTER_DEVIATIONS[cluster_id]:
        slug = entry[0]
        row = dict(zip(DEVIATION_KEYS, entry[:6] + (entry[6], "", entry[7])))
        row["ratio"] = f"같은 직군 {freq_pct(slug, RECENT) or 0}%"
        rows.append(row)
    return rows


def baseline_rows() -> list[dict[str, Any]]:
    rows = []
    for slug, title, desc in BASELINE_ITEMS:
        if slug in DIM_INFO:
            freq_value, required_value = freq_pct(slug, RECENT), required_pct(slug, RECENT)
        else:
            freq_value, required_value = pseudo_pct(slug), None
        rows.append({
            "item_id": slug, "title": title, "desc": desc,
            "freq_pct": freq_value, "required_ratio": required_value,
        })
    return rows


def unchanged_rows() -> list[dict[str, Any]]:
    return [{"item_id": s, "title": t, "note": n} for s, t, n in UNCHANGED_ITEMS]


def posting_view(posting: dict[str, Any]) -> dict[str, Any]:
    """공고 범위 해석의 원문 블록과 세 종류 주석."""
    raw_sections: list[dict[str, Any]] = []
    interpretations: list[dict[str, Any]] = []
    baseline_notes: list[dict[str, Any]] = []
    signal_notes: list[dict[str, Any]] = []
    mark_n = base_n = note_n = 0
    for section, lines in posting["sections"]:
        rows = []
        for line in lines:
            row = {"text": line[0], "mark_n": None, "note_n": None, "base_n": None, "base_ref": None}
            ann = line[3]
            if ann is not None:
                if ann[0] == "base":
                    base_n += 1
                    row["base_n"], row["base_ref"] = base_n, ann[1]
                    baseline_notes.append({"n": base_n, "base_ref": ann[1], "body": ann[2]})
                elif ann[0] == "mark":
                    mark_n += 1
                    row["mark_n"] = mark_n
                    interpretations.append({
                        "n": mark_n, "title": ann[1], "body": ann[2],
                        "confidence": ann[3], "ratio": ann[4],
                        "sources": [{"type": "posting", "url": posting_url(posting["nn"])}],
                    })
                else:
                    note_n += 1
                    row["note_n"] = note_n
                    signal_notes.append({"n": note_n, "title": ann[1], "body": ann[2]})
            rows.append(row)
        raw_sections.append({"section": section, "lines": rows})
    return {
        "posting_id": posting_id(posting["nn"]),
        "company": posting["company"],
        "title": posting["title"],
        "summary": {
            "n": None, "title": "종합 해석 — 이 공고가 찾는 사람",
            "body": posting["summary"], "confidence": "high",
            "ratio": posting["summary_ratio"],
            "sources": [{"type": "posting", "url": posting_url(posting["nn"])}],
        },
        "raw_sections": raw_sections,
        "interpretations": interpretations,
        "baseline_notes": baseline_notes,
        "signal_notes": signal_notes,
        "unchanged_note": "읽는 법 — 회색 번호는 데이터 엔지니어 공통 기대치, 파란 번호는 문장 뒤에 숨은 신호, 노란 번호는 이 회사가 유독 원하는 것입니다.",
    }


def interpretation_payload(scope_level: str, scope_id: str) -> dict[str, Any]:
    if scope_level == "overall":
        scope = {"level": "overall", "cluster_tag": None, "posting_id": None}
        deviations: list[dict[str, Any]] = []
        unchanged: list[dict[str, Any]] = []
        posting = None
    elif scope_level == "cluster":
        scope = {"level": "cluster", "cluster_tag": CLUSTERS[scope_id], "posting_id": None}
        deviations = deviation_rows(scope_id)
        unchanged = unchanged_rows()
        posting = None
    else:
        row = next(p for p in POSTINGS if posting_id(p["nn"]) == scope_id)
        scope = {
            "level": "posting", "cluster_tag": CLUSTERS[row["cluster"]], "posting_id": scope_id,
        }
        deviations = deviation_rows(row["cluster"])
        unchanged = unchanged_rows()
        posting = posting_view(row)
    return {
        "job": JOB_ROLE_ID,
        "scope": scope,
        "baseline": baseline_rows(),
        "deviations": deviations,
        "unchanged": unchanged,
        "posting": posting,
        "agent_version": AGENT_VERSION_STRING,
        "source": "stored",
    }


# ============================================================ 8. 전략·로드맵
# (slug, 제목, 부제, 이유, 증명 산출물, 채널, kind, 기본 필수 여부)
CONCEPTS: tuple[tuple[str, str, str, str, str, tuple[str, ...], str, bool], ...] = (
    ("batch-pipeline", "배치 파이프라인 프로젝트", "원천에서 마트까지 한 흐름",
     "기준선 · 최근 공고 전량이 적재와 집계를 요구합니다", "저장소 + 실행 로그 + 파이프라인 구조도",
     ("portfolio",), "project", True),
    ("sql-tuning", "SQL 집계와 실행 계획", "조인·집계·윈도우 함수",
     "기준선 · SQL 요구가 등장 100%로 전제 조건입니다", "느린 쿼리 개선 전후 실행 계획 문서",
     ("portfolio", "interview"), "project", True),
    ("airflow-dag", "DAG 스케줄 운영", "의존 순서와 재시도",
     "기준선 · 오케스트레이션 요구가 등장 80%입니다", "DAG 코드 + 실행 이력 캡처",
     ("portfolio", "interview"), "project", True),
    ("warehouse-modeling", "웨어하우스 테이블 모델링", "팩트·디멘전 분리",
     "기준선 · 1년 새 등장이 50%에서 80%로 늘었습니다", "ERD + 테이블 설계 근거 문서",
     ("portfolio", "interview"), "project", True),
    ("data-quality", "데이터 품질 검증 절차", "행 수·중복·널 검사",
     "기준선 · 값이 맞는지 확인하는 절차를 담당업무로 두는 공고가 다수입니다", "검증 규칙 목록 + 실패 시 알림 설정",
     ("portfolio", "interview"), "project", True),
    ("failure-recovery", "실패·재처리 운영 기록", "멈춘 배치를 되돌린 경험",
     "기준선 · 배치는 멈추는 것이 전제라 복구 기록이 변별점이 됩니다", "장애 재현·복구 회고 글",
     ("essay", "interview"), "story", True),
    ("distributed-basics", "분산 처리 원리", "파티션·셔플·스큐",
     "기준선 · 분산 배치 요구가 등장 80%이고 면접이 이론을 검증합니다", "개념 정리 글 + 실행 계획 해석",
     ("interview",), "study", True),
    ("modeling-theory", "차원 모델링 이론", "정규화와 스타 스키마",
     "기준선 · 테이블을 왜 그렇게 나눴는지가 반복되는 질문입니다", "설계 근거를 담은 정리 글",
     ("interview",), "study", True),
    ("spark-optimize", "분산 배치 병목 개선", "파티션 수와 셔플 조정",
     "편차 · 규모를 다루는 기업군이 개선의 과정을 묻습니다", "개선 전후 실행 시간 비교표",
     ("portfolio", "interview"), "project", False),
    ("streaming-pipeline", "스트리밍 수집 구현", "토픽·컨슈머 그룹",
     "편차 · 배치 주기를 줄이려는 조직에서 우대 이상으로 읽힙니다", "수집 파이프라인 저장소 + 지연 측정",
     ("portfolio",), "project", False),
    ("stream-semantics", "스트리밍 시맨틱스", "중복·순서·정확히 한 번",
     "편차 · 실시간 수집을 묻는 공고의 꼬리질문이 여기로 옵니다", "개념 정리 글",
     ("interview",), "study", False),
    ("cost-optimize", "처리 비용 줄이기", "스캔량과 자원 사용",
     "편차 · 규모가 큰 조직은 성능만큼 비용을 봅니다", "비용 절감 전후 숫자 한 줄",
     ("portfolio", "interview"), "study", False),
    ("volume-story", "데이터 규모를 숫자로 설명", "몇 건을 몇 분에",
     "편차 · 규모 감각을 묻는 문장이 반복됩니다", "처리량·소요 시간 측정 기록",
     ("essay", "interview"), "story", False),
    ("reconciliation", "집계 대사 파이프라인", "원천과 결과 비교",
     "편차 · 금융 데이터는 값이 어긋나면 장부가 어긋납니다", "대사 쿼리 + 불일치 처리 절차",
     ("portfolio", "interview"), "project", False),
    ("governance-rule", "비식별·보관 규칙", "마스킹과 보관 기간",
     "편차 · 규제가 테이블 설계보다 먼저 들어오는 기업군이 있습니다", "비식별 규칙 설계 문서",
     ("interview",), "study", False),
    ("metric-doc", "지표 정의 문서", "같은 이름 다른 정의",
     "편차 · 고객사·조직마다 지표 정의가 달라 합의 기록이 값을 갖습니다", "지표 정의서 1편",
     ("portfolio", "essay"), "story", False),
    ("infra-basics", "실행 환경 구성 기초", "컨테이너와 배포",
     "편차 · 데이터 팀이 실행 환경까지 맡는 조직이 있습니다", "컨테이너로 파이프라인을 띄운 기록",
     ("portfolio",), "study", False),
    ("standard-doc", "표준 설계 산출물", "다음 사람이 그대로 쓰는 문서",
     "편차 · 납품형 조직은 산출물 문서가 평가 대상입니다", "설계 산출물 문서 1벌",
     ("portfolio", "essay"), "story", False),
    ("requirement-doc", "요구 정리와 합의 기록", "범위를 좁힌 과정",
     "편차 · 요구를 받아 적는 것이 아니라 합의한 기록을 봅니다", "요구 정리표 + 합의 메모",
     ("essay", "interview"), "story", False),
    ("handover-story", "운영 이관 준비", "남이 읽고 돌릴 수 있게",
     "편차 · 만든 사람이 계속 보지 않는 조직이 있습니다", "실행 매뉴얼 + 인수인계 메모",
     ("essay",), "story", False),
    ("ownership-story", "전 과정 오너십 서사", "구성부터 운영까지 혼자",
     "편차 · 인원이 적은 조직은 담당 범위가 넓습니다", "한 파이프라인을 끝까지 끌고 간 기록",
     ("essay", "interview"), "story", False),
    ("ml-dataset", "학습 데이터셋 관리", "버전과 품질",
     "편차 · 소비처가 모델이면 중복·누락 기준이 더 빡빡합니다", "데이터셋 버전 기록 + 품질 지표",
     ("portfolio",), "project", False),
)

CONCEPT_INFO: dict[str, dict[str, Any]] = {
    slug: {
        "slug": slug, "concept_id": f"cc_{JOB_ROLE_ID}_{slug}", "title": title,
        "subtitle": subtitle, "reason": reason, "evidence_needed": evidence,
        "channels": channels, "kind": kind, "required": required,
    }
    for slug, title, subtitle, reason, evidence, channels, kind, required in CONCEPTS
}
CONCEPT_SLUGS = tuple(CONCEPT_INFO)

INTRO_ORDERS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("bigtech_platform", ("처리 규모·병목", "쿼리 비용", "실시간 수집", "운영 기록")),
    ("startup", ("전 과정 오너십", "병목 개선", "완성 속도", "비용 감각")),
    ("b2b_saas", ("지표 정의 문서", "테이블 경계", "실행 환경", "운영 안정성")),
    ("fintech_finance", ("정합성·대사", "값 검증 절차", "규제·비식별", "테이블 설계")),
    ("si_enterprise", ("표준 산출물", "요구 합의", "기본기 정확성", "운영 이관")),
    ("game", ("실시간 로그 수집", "피크 규모 처리", "지표 정의", "배치 안정성")),
)


def cluster_concepts(cluster_id: str) -> tuple[str, ...]:
    """기업군 편차가 가리키는 체크 개념. 순서가 편차 번호다."""
    return tuple(entry[8] for entry in CLUSTER_DEVIATIONS[cluster_id])


def scope_key(scope_level: str, scope_id: str) -> str:
    return "overall" if scope_level == "overall" else scope_id


def strategy_payload(scope_level: str, scope_id: str) -> dict[str, Any]:
    devs = () if scope_level == "overall" else cluster_concepts(scope_id)
    scope = {
        "level": scope_level,
        "cluster_tag": None if scope_level == "overall" else CLUSTERS[scope_id],
        "posting_id": None,
    }
    checklist = []
    for slug in CONCEPT_SLUGS:
        info = CONCEPT_INFO[slug]
        is_dev = slug in devs
        checklist.append({
            "item_id": info["concept_id"],
            "title": info["title"], "subtitle": info["subtitle"],
            "reason": (
                f"편차 {devs.index(slug) + 1} · {info['reason']}" if is_dev else info["reason"]
            ),
            "evidence_needed": info["evidence_needed"],
            "channels": list(info["channels"]),
            "kind": info["kind"],
            "is_deviation": is_dev,
            "dev_n": devs.index(slug) + 1 if is_dev else None,
            "required": True if is_dev else info["required"],
            "have": False,
        })
    orders = [
        {"cluster": CLUSTERS[cid], "steps": list(steps)}
        for cid, steps in INTRO_ORDERS
        if scope_level == "overall" or cid == scope_id
    ]
    label = "전체 기준" if scope_level == "overall" else CLUSTERS[scope_id]
    portfolio = {
        "highlights": [
            {
                "title": "한 흐름을 끝까지 이은 파이프라인 하나",
                "body": f"{label}에서도 도구를 여럿 나열한 것보다 원천에서 마트까지 한 줄로 이어 매일 돌린 결과물 하나가 강합니다. README 첫 절에 데이터가 어디서 와서 어디로 가는지를 그림 한 장으로 두세요.",
                "tips": ["구조도 1장: 원천 → 적재 → 가공 → 마트", "실행 이력 캡처로 한 번이 아니라 매일 돌았음을 보이세요"],
                "linked_item_ids": [
                    CONCEPT_INFO["batch-pipeline"]["concept_id"],
                    CONCEPT_INFO["airflow-dag"]["concept_id"],
                ],
            },
            {
                "title": "값이 맞는지 확인한 기록이 희소합니다",
                "body": "적재 성공 화면보다 행 수가 맞는지, 중복이 없는지 확인한 절차를 보여주는 문서가 신입 포트폴리오에서 드뭅니다.",
                "tips": ["검증 규칙 3개면 시작으로 충분합니다", "실패했을 때 어떻게 알았는지를 한 줄로 남기세요"],
                "linked_item_ids": [
                    CONCEPT_INFO["data-quality"]["concept_id"],
                    CONCEPT_INFO["failure-recovery"]["concept_id"],
                ],
            },
            {
                "title": "숫자로 말하는 습관",
                "body": "몇 건을 몇 분에 처리했고 무엇을 바꿔 얼마가 줄었는지를 적어 두면 규모를 경험하지 못해도 대화가 이어집니다.",
                "tips": ["처리량·소요 시간·비용 중 하나는 반드시 측정", "개선 전후를 같은 기준으로 비교"],
                "linked_item_ids": [
                    CONCEPT_INFO["volume-story"]["concept_id"],
                    CONCEPT_INFO["spark-optimize"]["concept_id"],
                ],
            },
        ],
        "intro_orders": orders,
    }
    essay = [
        {
            "kind": "deviation",
            "title": "도구 이름이 아니라 값을 지킨 과정으로 쓰기",
            "body": f"{label} 지원 글에서 강한 것은 사용한 도구 목록이 아니라 틀린 숫자를 어떻게 발견하고 되돌렸는가입니다.",
            "narrative": {
                "problem": "재처리 뒤 합계가 두 배가 되는 것을 발견",
                "solve": "원인 추적 → 멱등한 적재로 설계 변경 → 대사 쿼리로 검증",
                "growth": "파이프라인은 돌아가는 것이 아니라 맞는 값을 내는 것이라는 관점",
            },
            "sample_sentence": "\"돌아가는 배치를 만드는 것보다 두 번 돌려도 같은 값이 나오는 배치를 만드는 것이 데이터 엔지니어의 일이라고 배웠습니다.\"",
            "tips": ["숫자가 있으면 한 문장으로 붙이세요"],
            "linked_item_ids": [CONCEPT_INFO["reconciliation"]["concept_id"]],
        },
        {
            "kind": "deviation",
            "title": "혼자 끌고 간 경험을 범위로 보여주기",
            "body": "어디까지 직접 했는지를 단계로 적으면 오너십이 주장이 아니라 사실이 됩니다.",
            "narrative": {
                "problem": "수동으로 돌리던 집계가 매번 누락됨",
                "solve": "스케줄 도입 → 실패 알림 → 재처리 절차 정리",
                "growth": "만드는 일과 지키는 일이 다르다는 이해",
            },
            "sample_sentence": None,
            "tips": ["단계마다 남긴 산출물을 한 줄씩 붙이세요"],
            "linked_item_ids": [CONCEPT_INFO["ownership-story"]["concept_id"]],
        },
        {
            "kind": "narrative_polish",
            "title": "협업 경험 — 보유 소재 다듬기",
            "body": "같은 경험이라도 강조점을 기업군에 맞춰 바꾸세요. 사실 관계는 고정하고 배움의 방점만 조정합니다.",
            "narrative": None,
            "sample_sentence": None,
            "tips": ["사실 관계는 고정, 배움의 방점만 조정", "지표 정의를 합의한 장면이 있으면 앞으로"],
            "linked_item_ids": [CONCEPT_INFO["metric-doc"]["concept_id"]],
        },
    ]
    interview = [
        {
            "kicker": "쿼리 기본기",
            "question": "그 집계 쿼리가 느렸던 이유는 무엇이었나요?",
            "followups": ["실행 계획에서 무엇을 보고 판단했나요?", "바꾼 뒤 무엇이 얼마나 줄었나요?"],
            "point": "쿼리를 쓸 줄 아는지가 아니라 왜 느린지를 말할 수 있는지를 봅니다.",
            "linked_item_ids": [CONCEPT_INFO["sql-tuning"]["concept_id"]],
        },
        {
            "kicker": "설계 근거",
            "question": "테이블을 왜 그렇게 나눴나요?",
            "followups": ["컬럼을 하나 더 넣지 않은 이유는요?", "조회 패턴이 바뀌면 어떻게 바꾸겠어요?"],
            "point": "정답이 아니라 선택의 근거를 봅니다. 팩트와 디멘전을 나눈 이유 한 문장이 필요합니다.",
            "linked_item_ids": [CONCEPT_INFO["warehouse-modeling"]["concept_id"]],
        },
        {
            "kicker": "실패 대응",
            "question": "새벽에 배치가 실패하면 무엇부터 보나요?",
            "followups": ["어디까지 처리됐는지 어떻게 확인하나요?", "다시 돌려도 값이 안 어긋나나요?"],
            "point": "재처리 경험이 있으면 이 질문 전체를 제가 해봤는데요로 시작할 수 있습니다.",
            "linked_item_ids": [CONCEPT_INFO["failure-recovery"]["concept_id"]],
        },
        {
            "kicker": "분산 처리 이론",
            "question": "셔플이 왜 비싼가요?",
            "followups": ["데이터 스큐가 생기면 어떻게 알아채나요?", "파티션 수를 무엇을 보고 정했나요?"],
            "point": "써 봤다와 무엇을 해주는지 안다를 면접이 구분합니다.",
            "linked_item_ids": [CONCEPT_INFO["distributed-basics"]["concept_id"]],
        },
    ]
    return {
        "job": JOB_ROLE_ID, "scope": scope, "checklist": checklist,
        "portfolio": portfolio, "essay": essay, "interview": interview,
        "agent_version": AGENT_VERSION_STRING, "source": "stored",
    }


ROADMAP_STEPS: tuple[tuple[int, str, int, str, str, str, str, str, tuple[str, ...]], ...] = (
    (1, "STEP 01 · 3주", 3, "vhigh", "원천에서 마트까지 한 흐름 완성하기",
     "공개 데이터 하나를 골라 수집·적재·집계까지 한 줄로 이으세요. 테이블은 두 층으로 나누고 집계 쿼리의 실행 계획을 한 번 읽습니다.",
     "저장소 + 파이프라인 구조도 + 실행 계획 문서", "기준선 항목이 채워지지 않으면 다른 준비가 평가에 닿지 않습니다.",
     ("적재", "집계", "실행 계획")),
    (2, "STEP 02 · 2주", 2, "vhigh", "매일 돌게 만들고 실패를 다루기",
     "스케줄러로 의존을 묶고 하루 이상 돌리세요. 일부러 실패를 만들어 재처리 절차를 기록합니다.",
     "DAG 코드 + 실행 이력 + 장애 재현·복구 회고", "한 번 돌린 것과 매일 도는 것은 다릅니다. 실패 기록이 변별점이 됩니다.",
     ("스케줄", "재처리", "회고")),
    (3, "STEP 03 · 2주", 2, "high", "값이 맞는지 확인하는 절차 붙이기",
     "행 수·중복·널 검사를 파이프라인 안에 넣고 실패 시 알림까지 연결하세요. 마트 테이블은 설계 근거를 문서로 남깁니다.",
     "검증 규칙 목록 + 알림 설정 + ERD 와 설계 근거", "적재보다 확인이 더 오래 걸리는 것이 실무입니다.",
     ("검증", "알림", "모델링")),
    (4, "STEP 04 · 2주", 2, "mid", "기업군에 맞춰 마무리하기",
     "지원 기업군의 편차 항목을 채우고 처리량·소요 시간을 측정해 숫자로 정리하세요. 소개 순서도 다시 배치합니다.",
     "편차 항목 산출물 + 측정 기록 + 기업군 맞춤 소개 순서", "필수가 채워진 뒤의 마무리입니다. 순서만 바꿔도 읽히는 인상이 달라집니다.",
     ("편차 보강", "측정", "소개 순서")),
)

STEP_FILLS: tuple[tuple[str, ...], ...] = (
    ("batch-pipeline", "sql-tuning"),
    ("airflow-dag", "failure-recovery"),
    ("data-quality", "warehouse-modeling"),
    ("volume-story", "metric-doc"),
)

STUDY_TRACKS: tuple[tuple[str, str, str, str, str, str, tuple[str, ...]], ...] = (
    ("data-modeling", "STEP 01~03과 병행", "vhigh", "SQL·차원 모델링 이론",
     "조인 방식의 차이와 실행 계획 읽는 법, 정규화와 스타 스키마의 선택 기준을 남에게 설명할 수 있는 수준까지.",
     "설계 근거를 묻는 꼬리질문이 이 이론에서 나옵니다.", ("sql-tuning", "modeling-theory")),
    ("pipeline-engineering", "STEP 02~03과 병행", "high", "분산 처리 원리",
     "파티션과 셔플, 데이터 스큐가 생기는 이유와 알아채는 방법까지. 도구 사용법이 아니라 왜 느려지는지 중심으로.",
     "써 봤다와 무엇을 해주는지 안다를 면접이 구분합니다.", ("distributed-basics",)),
    ("stream-processing", "상시 · 주 3시간", "high", "스트리밍 시맨틱스",
     "토픽·파티션·컨슈머 그룹의 구조와 중복·순서 문제, 정확히 한 번의 의미까지.",
     "스트리밍은 우대 자리를 지키지만 물으면 반드시 깊이를 확인합니다.", ("stream-semantics",)),
)


def roadmap_payload(scope_level: str, scope_id: str) -> dict[str, Any]:
    devs = () if scope_level == "overall" else cluster_concepts(scope_id)
    scope = {
        "level": scope_level,
        "cluster_tag": None if scope_level == "overall" else CLUSTERS[scope_id],
        "posting_id": None,
    }
    label = "전체 기준" if scope_level == "overall" else CLUSTERS[scope_id]

    def fill(slug: str) -> dict[str, Any]:
        info = CONCEPT_INFO[slug]
        if slug in devs:
            kind = "dev"
            text = f"{info['title']} (편차 {devs.index(slug) + 1})"
        elif info["kind"] == "study":
            kind, text = "study", f"{info['title']} (학습)"
        else:
            kind, text = "normal", info["title"]
        return {"item_id": info["concept_id"], "label": text, "kind": kind}

    steps = []
    step_of: dict[str, str] = {}
    for i, (n, phase, weeks, priority, title, body, deliverable, reason, tags) in enumerate(ROADMAP_STEPS):
        slugs = list(STEP_FILLS[i])
        if n <= len(devs):
            dev_slug = devs[n - 1]
            if dev_slug not in slugs:
                slugs.insert(0, dev_slug)
        for slug in slugs:
            step_of.setdefault(slug, f"STEP {n:02d}")
        steps.append({
            "n": n, "phase": phase, "weeks": weeks, "priority": priority, "title": title,
            "body": body, "deliverable": deliverable,
            "fills": [fill(slug) for slug in slugs],
            "reason_title": "왜 이 순서인가요?",
            "reason": f"{label}에서 {reason}",
            "tags": list(tags),
        })

    tracks = []
    for _cap, phase, priority, title, depth, reason, slugs in STUDY_TRACKS:
        for slug in slugs:
            step_of.setdefault(slug, "병행")
        tracks.append({
            "phase": phase, "priority": priority, "title": title, "depth": depth,
            "reason_title": "왜 필요한가요?", "reason": reason,
            "fills": [fill(slug) for slug in slugs],
        })
    tracks.append({
        "phase": "상시 · 별도 트랙", "priority": "track", "title": "SQL 코딩테스트",
        "depth": "지원 시점까지 꾸준히. 공고 요구 분석의 대상이 아니라 전형 자체의 관문이라 별도 트랙으로 둡니다.",
        "reason_title": "왜 따로 두나요?",
        "reason": "요구 분석의 결과가 아니라 전형 단계입니다. 잊지 않도록 표시만 합니다.",
        "fills": [],
    })

    check_rows = []
    for slug in CONCEPT_SLUGS:
        info = CONCEPT_INFO[slug]
        is_dev = slug in devs
        check_rows.append({
            "item_id": info["concept_id"], "title": info["title"], "kind": info["kind"],
            "is_deviation": is_dev, "dev_n": devs.index(slug) + 1 if is_dev else None,
            "required": True if is_dev else info["required"],
            "source_step": step_of.get(slug, "상시"),
        })

    return {
        "job": JOB_ROLE_ID, "scope": scope, "project_steps": steps,
        "study_tracks": tracks, "check_rows": check_rows,
        "agent_version": AGENT_VERSION_STRING, "source": "stored",
    }


# ============================================================ 9. Wiki 본문
WIKI: dict[str, dict[str, Any]] = {
    "data-modeling": {
        "why": "SQL 요구가 최근 공고 전량에 있고 웨어하우스 모델링이 1년 새 50%에서 80%로 늘었습니다. 분석용 테이블을 설계하지 못하면 적재는 해도 쓰이지 않습니다.",
        "depth": {
            "foundation": "조인과 집계를 규칙대로 쓸 수 있다",
            "application": "팩트와 디멘전을 나눠 마트를 설계하고 집계 쿼리를 붙인다",
            "tradeoff": "조회 패턴과 저장 비용을 놓고 비정규화 범위를 근거와 함께 고른다",
        },
        "prereq": ["관계형 모델과 키의 의미", "실행 계획을 읽는 기본"],
        "misconceptions": [
            "테이블을 많이 나누면 항상 좋다는 오해. 조회 패턴이 기준이다",
            "인덱스를 걸면 무조건 빨라진다는 오해. 적재 비용이 함께 늘어난다",
        ],
        "interview": [
            "이 테이블을 왜 그렇게 나눴나요?",
            "컬럼을 하나 더 넣지 않은 이유는 무엇인가요?",
            "조회 패턴이 바뀌면 설계를 어떻게 바꾸겠어요?",
        ],
        "sequence": [
            "공개 데이터로 원천 테이블 적재",
            "팩트·디멘전 분리와 마트 설계",
            "집계 쿼리의 실행 계획 읽기와 개선",
        ],
    },
    "pipeline-engineering": {
        "why": "분산 배치와 오케스트레이션이 각각 등장 80%이고 두 항목 모두 우대에서 자격요건으로 올라온 이동 항목입니다. 매일 도는 것을 지키는 능력이 이 직무의 중심입니다.",
        "depth": {
            "foundation": "배치를 한 번 실행해 결과를 남긴다",
            "application": "의존을 DAG 로 묶어 스케줄로 돌리고 실패를 재처리한다",
            "tradeoff": "파티션과 셔플을 조정해 처리 시간과 자원을 함께 다룬다",
        },
        "prereq": ["파이썬으로 데이터 처리 코드 작성", "분산 처리의 파티션 개념"],
        "misconceptions": [
            "한 번 성공하면 끝이라는 오해. 배치는 멈추는 것이 전제다",
            "다시 돌리면 알아서 맞는다는 오해. 멱등하지 않으면 값이 두 번 더해진다",
        ],
        "interview": [
            "배치가 새벽에 실패하면 무엇부터 보나요?",
            "어디까지 처리됐는지 어떻게 확인하나요?",
            "셔플이 왜 비싼가요?",
        ],
        "sequence": [
            "단일 배치 스크립트 작성",
            "DAG 로 의존 묶고 스케줄 실행",
            "실패 재현과 재처리 절차 정리",
        ],
    },
    "stream-processing": {
        "why": "스트리밍 수집은 등장 60%에 필수율 0%로 우대의 자리를 지킵니다. 필수 항목을 채운 다음의 선택지이지만 물으면 반드시 깊이를 확인합니다.",
        "depth": {
            "foundation": "토픽·파티션·컨슈머 그룹의 구조를 설명한다",
            "application": "스트림을 받아 적재하고 지연을 측정한다",
            "tradeoff": "중복과 순서를 다루는 방식을 요구에 맞춰 고른다",
        },
        "prereq": ["배치와 스트림의 차이 이해", "메시지 브로커의 기본 구조"],
        "misconceptions": [
            "실시간이면 항상 좋다는 오해. 운영 비용과 복잡도가 함께 오른다",
            "메시지가 한 번만 온다는 오해. 중복은 기본 전제다",
        ],
        "interview": [
            "중복 메시지가 오면 어떻게 처리했나요?",
            "순서가 어긋나면 무엇이 문제가 되나요?",
            "배치 대신 스트림을 고른 이유는 무엇인가요?",
        ],
        "sequence": [
            "브로커 구조와 토픽 개념 정리",
            "간단한 수집 파이프라인 구현",
            "중복·순서 처리와 지연 측정",
        ],
    },
}

CLUSTER_ABBR = {
    "bigtech_platform": "bigtech", "startup": "startup", "b2b_saas": "saas",
    "fintech_finance": "fintech", "si_enterprise": "si", "game": "game",
}


def membership_id(posting: dict[str, Any]) -> str:
    slug = posting["company_id"].removeprefix("co_")
    return f"mem_{slug}_{CLUSTER_ABBR[posting['cluster']]}"


# ============================================================ 표 생성
def build() -> dict[str, list[dict[str, Any]]]:
    """테이블명 → 행 목록. 데이터베이스에 접속하지 않는다."""
    t: dict[str, list[dict[str, Any]]] = {}

    # --- 1 dataset_versions 는 A1(backend) 만 만든다. 여기서는 참조만 한다.

    # --- 2~7 출처와 공고
    sources, snapshots, observations, assessments = [], [], [], []
    postings, posting_versions = [], []
    for p in POSTINGS:
        nn = p["nn"]
        content = raw_content(p)
        sources.append({
            "source_id": source_id(nn), "source_type": "job_posting",
            "url": posting_url(nn), "publisher": p["company"], "author": None,
            "robots_policy": "allow", "license_note": "생성 데이터. 실제 공고가 아니다.",
            "job_role_ids": [JOB_ROLE_ID], "company_id": p["company_id"],
            "first_seen_at": p["posted_at"],
        })
        snapshots.append({
            "snapshot_id": snapshot_id(nn), "source_id": source_id(nn),
            "content_hash": sha256_hex(content), "raw_content": content,
            "published_at": p["posted_at"], "fetched_at": FETCHED_AT,
            "dataset_version": DATASET_VERSION, "supersedes_snapshot_id": None,
        })
        observations.append({
            "observation_id": f"obs_demo_{JOB_ROLE_ID}_{nn}", "snapshot_id": snapshot_id(nn),
            "observed_at": FETCHED_AT, "fetch_status": "ok",
            "canonical_url": posting_url(nn), "http_status": 200,
            "notes": "생성 데이터. 네트워크 호출 없이 만들었다.",
        })
        assessments.append({
            "assessment_id": f"asmt_demo_{JOB_ROLE_ID}_{nn}", "snapshot_id": snapshot_id(nn),
            "source_tier": "A", "allowed_uses": list(ALLOWED_USES),
            "reliability_score": "0.95000", "assessment_version": "sa_v1",
            "assessed_at": FETCHED_AT, "assessed_by_run_id": run_id("stats"),
        })
        postings.append({
            "posting_id": posting_id(nn), "source_id": source_id(nn),
            "company_id": p["company_id"], "job_role_id": JOB_ROLE_ID,
            "first_posted_at": p["posted_at"],
        })
        posting_versions.append({
            "posting_version_id": posting_version_id(nn), "posting_id": posting_id(nn),
            "snapshot_id": snapshot_id(nn), "title": p["title"],
            "career_label_raw": p["career_label_raw"], "edu_label_raw": p["edu_label_raw"],
            "entry_label_raw": p["entry_label_raw"], "entry_label": p["entry_label"],
            "posted_at": p["posted_at"], "closed_at": None,
            "dataset_version": DATASET_VERSION,
        })
    t["sources"] = sources
    t["source_snapshots"] = snapshots
    t["source_observations"] = observations
    t["source_assessments"] = assessments
    t["postings"] = postings
    t["posting_versions"] = posting_versions

    # --- 8 source_chunks
    chunks = []
    for cid, chunk in CHUNKS.items():
        p = chunk["posting"]
        context = {
            "source_id": source_id(p["nn"]), "source_type": "job_posting",
            "publisher": p["company"], "company_id": p["company_id"],
            "job_role_ids": [JOB_ROLE_ID], "section": chunk["section"],
        }
        head = " · ".join((p["company"], "job_posting", chunk["section"]))
        chunks.append({
            "chunk_id": cid, "snapshot_id": chunk["snapshot_id"],
            "section": chunk["section"], "ordinal": chunk["ordinal"],
            "text": chunk["text"], "context": context,
            "embedding_text": f"{head}\n{chunk['text']}",
            "token_count": max(1, math.ceil(len(chunk["text"]) / 2.2)),
            "dataset_version": DATASET_VERSION,
        })
    t["source_chunks"] = chunks

    # --- 9~10 분류체계
    t["requirement_taxonomies"] = [{"taxonomy_id": TAXONOMY_ID, "job_role_id": JOB_ROLE_ID}]
    t["requirement_taxonomy_versions"] = [{
        "taxonomy_version_id": TAXONOMY_VERSION_ID, "taxonomy_id": TAXONOMY_ID,
        "version_number": 1, "taxonomy_policy_version": TAXONOMY_POLICY_VERSION,
        "published_at": NOW, "superseded_at": None,
    }]

    # --- 11~12 분석 버전과 실행
    t["analysis_versions"] = [{
        "analysis_version": ANALYSIS_VERSION, "job_role_id": JOB_ROLE_ID,
        "dataset_version": DATASET_VERSION, "taxonomy_version_id": TAXONOMY_VERSION_ID,
        "knowledge_version": KNOWLEDGE_VERSION, "model_version": "stub-v1",
        "prompt_version": "pv_demo_v1", "retrieval_policy_version": "rp_v1",
        "metric_policy_version": "mp_v1_prevalence",
        "scope_spec": {
            "job_role_id": JOB_ROLE_ID,
            "scopes": [{"level": lvl, "id": sid} for lvl, sid in SCOPES],
            "periods": list(PERIODS), "entry_segments": list(SEGMENTS),
        },
        "status": "active", "tokens": 0, "cost": "0.0000",
        "started_at": NOW, "ended_at": NOW,
    }]
    t["agent_runs"] = [{
        "agent_run_id": run_id(agent), "analysis_version": ANALYSIS_VERSION,
        "agent_name": agent, "objective_id": objective, "iteration": 1,
        "stop_reason": stop, "tokens": 0, "cost": "0.0000",
        "started_at": NOW, "ended_at": NOW,
    } for agent, _label, objective, stop in AGENTS]

    # --- 13~16 차원
    t["requirement_dimensions"] = [{
        "dimension_id": dim_id(slug), "taxonomy_id": TAXONOMY_ID,
        "dimension_kind": DIM_INFO[slug]["kind"],
    } for slug in DIM_SLUGS]
    t["requirement_dimension_versions"] = [{
        "dimension_version_id": f"dv_{JOB_ROLE_ID}_{slug}", "dimension_id": dim_id(slug),
        "taxonomy_version_id": TAXONOMY_VERSION_ID,
        "internal_canonical_label": slug.replace("-", "_"),
        "display_label": DIM_INFO[slug]["label"], "definition": DIM_INFO[slug]["definition"],
        "lifecycle_status": "active", "standard_mapping_status": "unmapped",
        "standard_id": None, "mapping_confidence": None,
        "mapping_evidence": {"note": "생성 데이터는 표준 매핑을 하지 않는다"},
        "review_status": "approved", "role_boundary_eligible": DIM_INFO[slug]["boundary"],
    } for slug in DIM_SLUGS]
    aliases = []
    for slug in DIM_SLUGS:
        for i, text in enumerate(DIM_INFO[slug]["aliases"], start=1):
            aliases.append({
                "alias_id": f"alias_{JOB_ROLE_ID}_{slug}_{i}", "dimension_id": dim_id(slug),
                "taxonomy_version_id": TAXONOMY_VERSION_ID, "alias_text": text,
                "alias_source": "manual" if i == 1 else "discovered",
            })
    t["requirement_aliases"] = aliases
    t["requirement_dimension_relations"] = [{
        "relation_id": f"rel_{JOB_ROLE_ID}_{i:02d}", "taxonomy_version_id": TAXONOMY_VERSION_ID,
        "src_dimension_id": dim_id(src), "dst_dimension_id": dim_id(dst),
        "relation_type": kind,
    } for i, (src, dst, kind) in enumerate(DIMENSION_RELATIONS, start=1)]

    # --- 17~18 역량
    t["capabilities"] = [{
        "capability_id": CAP_INFO[slug]["capability_id"], "job_role_id": JOB_ROLE_ID,
        "canonical_label": CAP_INFO[slug]["label"], "definition": CAP_INFO[slug]["definition"],
        "is_active": True,
    } for slug in CAP_SLUGS]
    links = []
    for slug in CAP_SLUGS:
        for dim_slug in CAP_INFO[slug]["dimensions"]:
            links.append({
                "capability_id": CAP_INFO[slug]["capability_id"],
                "dimension_id": dim_id(dim_slug),
                "taxonomy_version_id": TAXONOMY_VERSION_ID,
            })
    t["capability_dimension_links"] = links

    # --- 19~21 표현과 할당
    t["requirement_mentions"] = [{
        "mention_id": m.mention_id, "posting_version_id": posting_version_id(m.nn),
        "snapshot_id": snapshot_id(m.nn), "chunk_id": m.chunk_id,
        "raw_expression": m.raw_expression, "evidence_span_start": m.start,
        "evidence_span_end": m.end, "stated_requiredness": m.stated_requiredness,
        "section": m.section, "extraction_confidence": "0.92000",
        "extraction_run_id": run_id("stats"), "dataset_version": DATASET_VERSION,
    } for m in MENTIONS]
    counts = Counter(m.chunk_id for m in MENTIONS)
    t["chunk_extractions"] = [{
        "chunk_id": cid, "dataset_version": DATASET_VERSION,
        "extraction_run_id": run_id("stats"), "mention_count": counts.get(cid, 0),
        "extracted_at": NOW,
    } for cid in CHUNKS]
    t["posting_requirement_assignments"] = [{
        "assignment_id": m.assignment_id, "mention_id": m.mention_id,
        "taxonomy_version_id": TAXONOMY_VERSION_ID, "dimension_id": dim_id(m.dim_slug),
        "normalized_label": DIM_INFO[m.dim_slug]["label"], "requiredness": m.requiredness,
        "depth_level": m.depth, "assignment_confidence": "0.90000",
        "assignment_method": "alias_exact", "verifier_status": "verified",
    } for m in MENTIONS]

    # --- 22~23 지식 버전과 적용 가능성
    t["knowledge_versions"] = [{
        "knowledge_version": KNOWLEDGE_VERSION, "job_role_id": JOB_ROLE_ID,
        "taxonomy_version_id": TAXONOMY_VERSION_ID, "published_at": NOW,
    }]
    applicability = []
    for slug in DIM_SLUGS:
        for family in METRIC_FAMILIES:
            if family == "entry_label_advanced_signal_rate":
                applicable, reason = False, "차원을 입력으로 받지 않는 범위 지표다"
            elif family == "scope_expansion":
                applicable = DIM_INFO[slug]["boundary"]
                reason = (
                    "역할 경계를 넘는 차원이라 분자에 든다" if applicable
                    else "역할 경계 차원이 아니다"
                )
            else:
                applicable, reason = True, None
            applicability.append({
                "taxonomy_version_id": TAXONOMY_VERSION_ID, "dimension_id": dim_id(slug),
                "metric_family": family, "applicable": applicable, "reason": reason,
            })
    t["dimension_metric_applicability"] = applicability

    # --- 24 지표 사실
    t["statistics_facts"] = FACTS.rows

    # --- 25 역량 깊이 프로파일
    profiles = []
    for cap_slug in CAP_SLUGS:
        cap = CAP_INFO[cap_slug]
        for scope_level, scope_id in SCOPES:
            for segment in (SEGMENT_ALL, SEGMENT_ENTRY):
                rows = population(scope_level, scope_id, segment, RECENT)
                if not rows:
                    continue
                counter: Counter[str] = Counter()
                for p in rows:
                    dims = DIMS_BY_POSTING[p["nn"]]
                    depths = [dims[s][1] for s in cap["dimensions"] if s in dims]
                    if depths:
                        counter[max(depths, key=lambda d: DEPTH_RANK[d])] += 1
                if not counter:
                    continue
                expected = max(counter, key=lambda d: (counter[d], DEPTH_RANK[d]))
                profiles.append({
                    "profile_id": f"cdp_demo_{JOB_ROLE_ID}_{cap_slug}_{scope_key(scope_level, scope_id)}_{segment}",
                    "capability_id": cap["capability_id"],
                    "taxonomy_version_id": TAXONOMY_VERSION_ID,
                    "scope_level": scope_level, "scope_id": scope_id,
                    "entry_segment": segment, "period_id": RECENT,
                    "depth_distribution": {d: counter.get(d, 0) for d in DEPTHS},
                    "expected_depth": expected, "sample_size": len(rows),
                    "evidence_support": {
                        "dimensions": [dim_id(s) for s in cap["dimensions"]],
                        "matched_postings": sum(counter.values()),
                    },
                    "confidence": "0.70000" if scope_level == "cluster" else "0.85000",
                    "analysis_version": ANALYSIS_VERSION,
                })
    t["capability_depth_profiles"] = profiles

    # --- 26 포화 관측
    saturation = []
    seen: set[str] = set()
    for i, p in enumerate(POSTINGS, start=1):
        before = len(seen)
        seen.update(DIMS_BY_POSTING[p["nn"]])
        new = len(seen) - before
        saturation.append({
            "observation_id": f"sat_demo_{JOB_ROLE_ID}_{i:02d}",
            "analysis_version": ANALYSIS_VERSION, "job_role_id": JOB_ROLE_ID,
            "scope_id": JOB_ROLE_ID, "posting_count": i, "new_candidate_count": new,
            "cumulative_dimension_count": len(seen),
            "marginal_gain": round(new / i, 6), "observed_at": NOW,
        })
    t["saturation_observations"] = saturation

    # --- 27~29 지식 그래프
    nodes: list[dict[str, Any]] = []
    node_ids: dict[tuple[str, str, str], str] = {}

    def node(layer: str, node_type: str, ref_table: str, ref_id: str, label: str) -> str:
        key = (layer, ref_table, ref_id)
        if key in node_ids:
            return node_ids[key]
        nid_value = f"nd_demo_{JOB_ROLE_ID}_{len(nodes) + 1:04d}"
        node_ids[key] = nid_value
        nodes.append({
            "node_id": nid_value, "graph_layer": layer, "node_type": node_type,
            "ref_table": ref_table, "ref_id": ref_id, "label": label,
            "ontology_version": ONTOLOGY_VERSION, "dataset_version": DATASET_VERSION,
            "taxonomy_version_id": TAXONOMY_VERSION_ID if layer == "semantic" else None,
            "analysis_version": ANALYSIS_VERSION,
        })
        return nid_value

    role_node = node("semantic", "JobRole", "job_roles", JOB_ROLE_ID, "데이터 엔지니어")
    for cid, label in CLUSTERS.items():
        node("semantic", "CompanyCluster", "company_clusters", cid, label)
    for p in POSTINGS:
        node("semantic", "Company", "companies", p["company_id"], p["company"])
        node("semantic", "Posting", "postings", posting_id(p["nn"]), p["title"])
    for slug in DIM_SLUGS:
        node(
            "semantic",
            "Technology" if DIM_INFO[slug]["kind"] == "technology" else "RequirementDimension",
            "requirement_dimensions", dim_id(slug), DIM_INFO[slug]["label"],
        )
    for slug in CAP_SLUGS:
        node("semantic", "Capability", "capabilities", CAP_INFO[slug]["capability_id"],
             CAP_INFO[slug]["label"])
    for p in POSTINGS:
        node("provenance", "SourceSnapshot", "source_snapshots", snapshot_id(p["nn"]),
             f"{p['company']} 공고 스냅샷")
    for cid, chunk in CHUNKS.items():
        node("provenance", "Chunk", "source_chunks", cid,
             f"{chunk['posting']['company']} · {chunk['section']}")
    for m in MENTIONS:
        node("provenance", "RequirementMention", "requirement_mentions", m.mention_id,
             m.raw_expression)
    t["knowledge_nodes"] = nodes

    edges: list[dict[str, Any]] = []
    edge_ids: dict[tuple[str, str, str], str] = {}

    def edge(
        layer: str, edge_type: str, src: str, dst: str,
        evidence: str | None, run: str, taxonomy: bool = False,
    ) -> str:
        key = (edge_type, src, dst)
        if key in edge_ids:
            return edge_ids[key]
        eid = f"edge_demo_{JOB_ROLE_ID}_{len(edges) + 1:05d}"
        edge_ids[key] = eid
        edges.append({
            "edge_id": eid, "graph_layer": layer, "edge_type": edge_type,
            "src_node_id": src, "dst_node_id": dst, "weight": None,
            "evidence_id": evidence, "produced_by_run_id": run,
            "verification_status": "verified", "ontology_version": ONTOLOGY_VERSION,
            "dataset_version": DATASET_VERSION,
            "taxonomy_version_id": TAXONOMY_VERSION_ID if taxonomy else None,
            "analysis_version": ANALYSIS_VERSION, "valid_from": NOW, "valid_to": None,
        })
        return eid

    def nid(layer: str, ref_table: str, ref_id: str) -> str:
        return node_ids[(layer, ref_table, ref_id)]

    requires_edge: dict[tuple[str, str], str] = {}
    for p in POSTINGS:
        pid = posting_id(p["nn"])
        edge("semantic", "POSTED_BY", nid("semantic", "postings", pid),
             nid("semantic", "companies", p["company_id"]), None, run_id("knowledge"))
        edge("semantic", "BELONGS_TO_CLUSTER", nid("semantic", "companies", p["company_id"]),
             nid("semantic", "company_clusters", p["cluster"]), membership_id(p),
             run_id("knowledge"))
        for m in MENTIONS_BY_POSTING[p["nn"]]:
            eid = edge(
                "semantic", "REQUIRES", nid("semantic", "postings", pid),
                nid("semantic", "requirement_dimensions", dim_id(m.dim_slug)),
                m.assignment_id, run_id("knowledge"), taxonomy=True,
            )
            requires_edge.setdefault((pid, m.dim_slug), eid)
    cap_edge: dict[tuple[str, str], str] = {}
    for cap_slug in CAP_SLUGS:
        cap = CAP_INFO[cap_slug]
        for dim_slug in cap["dimensions"]:
            cap_edge[(dim_slug, cap_slug)] = edge(
                "semantic", "REQUIRES_CAPABILITY",
                nid("semantic", "requirement_dimensions", dim_id(dim_slug)),
                nid("semantic", "capabilities", cap["capability_id"]),
                f"{cap['capability_id']}|{dim_id(dim_slug)}|{TAXONOMY_VERSION_ID}",
                run_id("knowledge"), taxonomy=True,
            )
    prereq_edge: dict[tuple[str, str], str] = {}
    for src_cap, dst_cap in CAPABILITY_PREREQUISITES:
        prereq_edge[(src_cap, dst_cap)] = edge(
            "semantic", "PREREQUISITE_OF",
            nid("semantic", "capabilities", CAP_INFO[src_cap]["capability_id"]),
            nid("semantic", "capabilities", CAP_INFO[dst_cap]["capability_id"]),
            f"wr_demo_{JOB_ROLE_ID}_{dst_cap}_1", run_id("knowledge"),
        )
    part_of_edge: dict[str, str] = {}
    for cid, chunk in CHUNKS.items():
        part_of_edge[cid] = edge(
            "provenance", "PART_OF", nid("provenance", "source_chunks", cid),
            nid("provenance", "source_snapshots", chunk["snapshot_id"]), None, run_id("stats"),
        )
    evidenced_edge: dict[str, str] = {}
    assigned_edge: dict[str, str] = {}
    for m in MENTIONS:
        evidenced_edge[m.mention_id] = edge(
            "provenance", "EVIDENCED_BY", nid("provenance", "requirement_mentions", m.mention_id),
            nid("provenance", "source_chunks", m.chunk_id), m.mention_id, run_id("stats"),
        )
        assigned_edge[m.mention_id] = edge(
            "provenance", "ASSIGNED_TO", nid("provenance", "requirement_mentions", m.mention_id),
            nid("semantic", "requirement_dimensions", dim_id(m.dim_slug)),
            m.assignment_id, run_id("stats"), taxonomy=True,
        )
    t["knowledge_edges"] = edges

    paths: list[dict[str, Any]] = []

    def add_path(path_type: str, node_seq: list[str], edge_seq: list[str]) -> None:
        paths.append({
            "path_id": f"gp_demo_{JOB_ROLE_ID}_{len(paths) + 1:04d}", "path_type": path_type,
            "node_sequence": node_seq, "edge_sequence": edge_seq,
            "taxonomy_version_id": TAXONOMY_VERSION_ID, "knowledge_version": KNOWLEDGE_VERSION,
            "analysis_version": ANALYSIS_VERSION, "graph_policy_version": GRAPH_POLICY_VERSION,
            "computed_at": NOW,
        })

    for p in RECENT_POSTINGS:
        pid = posting_id(p["nn"])
        for dim_slug in DIMS_BY_POSTING[p["nn"]]:
            for cap_slug in CAP_SLUGS:
                if dim_slug not in CAP_INFO[cap_slug]["dimensions"]:
                    continue
                add_path(
                    "posting_requirement_capability",
                    [nid("semantic", "postings", pid),
                     nid("semantic", "requirement_dimensions", dim_id(dim_slug)),
                     nid("semantic", "capabilities", CAP_INFO[cap_slug]["capability_id"])],
                    [requires_edge[(pid, dim_slug)], cap_edge[(dim_slug, cap_slug)]],
                )
    for src_cap, dst_cap in CAPABILITY_PREREQUISITES:
        add_path(
            "capability_prerequisite_chain",
            [nid("semantic", "capabilities", CAP_INFO[src_cap]["capability_id"]),
             nid("semantic", "capabilities", CAP_INFO[dst_cap]["capability_id"])],
            [prereq_edge[(src_cap, dst_cap)]],
        )
    for m in MENTIONS[:12]:
        add_path(
            "mention_evidence_lineage",
            [nid("provenance", "requirement_mentions", m.mention_id),
             nid("provenance", "source_chunks", m.chunk_id),
             nid("provenance", "source_snapshots", snapshot_id(m.nn))],
            [evidenced_edge[m.mention_id], part_of_edge[m.chunk_id]],
        )
        add_path(
            "mention_dimension_normalization",
            [nid("provenance", "requirement_mentions", m.mention_id),
             nid("semantic", "requirement_dimensions", dim_id(m.dim_slug))],
            [assigned_edge[m.mention_id]],
        )
    t["graph_paths"] = paths

    # --- 30~32 Wiki
    pages, revisions, wiki_evidence = [], [], []
    for cap_slug in CAP_SLUGS:
        cap = CAP_INFO[cap_slug]
        entry = WIKI[cap_slug]
        page_id = f"wp_demo_{JOB_ROLE_ID}_{cap_slug}"
        revision_id = f"wr_demo_{JOB_ROLE_ID}_{cap_slug}_1"
        pages.append({
            "page_id": page_id, "capability_id": cap["capability_id"],
            "knowledge_version": KNOWLEDGE_VERSION, "status": "published",
        })
        revisions.append({
            "revision_id": revision_id, "page_id": page_id,
            "definition": cap["definition"], "why_required": entry["why"],
            "depth_criteria": entry["depth"], "prerequisites": entry["prereq"],
            "common_misconceptions": entry["misconceptions"],
            "interview_verification": entry["interview"],
            "learning_sequence": entry["sequence"],
            "produced_by_run_id": run_id("knowledge"),
        })
        cited: list[str] = []
        for m in MENTIONS:
            if m.dim_slug in cap["dimensions"] and m.chunk_id not in cited:
                cited.append(m.chunk_id)
            if len(cited) >= 2:
                break
        for field in ("why_required", "depth_criteria", "interview_verification"):
            for cid in cited:
                wiki_evidence.append({
                    "revision_id": revision_id, "field_name": field,
                    "chunk_id": cid, "source_tier": "A",
                })
    t["wiki_pages"] = pages
    t["wiki_revisions"] = revisions
    t["wiki_evidence"] = wiki_evidence
    assert role_node in node_ids.values()
    return _build_outputs(t, paths)


def _build_outputs(
    t: dict[str, list[dict[str, Any]]], paths: list[dict[str, Any]]
) -> dict[str, list[dict[str, Any]]]:
    """33~43 산출물·주장·체크리스트·로드맵·검증."""
    # --- 33 분석 산출물 27행
    outputs: list[dict[str, Any]] = []

    def add_output(output_type: str, agent: str, scope_level: str, scope_id: str,
                   payload: dict[str, Any], suffix: str) -> str:
        short = {"statistics": "stat", "interpretation": "intp",
                 "strategy": "strat", "roadmap": "road"}[output_type]
        output_id = f"out_demo_{JOB_ROLE_ID}_{short}_{suffix}"
        outputs.append({
            "output_id": output_id, "analysis_version": ANALYSIS_VERSION,
            "job_role_id": JOB_ROLE_ID, "scope_level": scope_level, "scope_id": scope_id,
            "output_type": output_type, "payload": payload, "produced_by_agent": agent,
            "verification_status": "verified", "generated_at": NOW,
        })
        return output_id

    stat_output = add_output(
        "statistics", "aggregation", "overall", JOB_ROLE_ID, STATISTICS_PAYLOAD, "overall"
    )
    intp_outputs = {
        "overall": add_output("interpretation", "interpretation", "overall", JOB_ROLE_ID,
                              interpretation_payload("overall", JOB_ROLE_ID), "overall")
    }
    for cid in CLUSTER_ORDER:
        intp_outputs[cid] = add_output(
            "interpretation", "interpretation", "cluster", cid,
            interpretation_payload("cluster", cid), cid,
        )
    for p in RECENT_POSTINGS:
        pid = posting_id(p["nn"])
        intp_outputs[pid] = add_output(
            "interpretation", "interpretation", "posting", pid,
            interpretation_payload("posting", pid), pid,
        )
    strat_outputs = {
        "overall": add_output("strategy", "strategy", "overall", JOB_ROLE_ID,
                              strategy_payload("overall", JOB_ROLE_ID), "overall")
    }
    road_outputs = {
        "overall": add_output("roadmap", "roadmap", "overall", JOB_ROLE_ID,
                              roadmap_payload("overall", JOB_ROLE_ID), "overall")
    }
    for cid in CLUSTER_ORDER:
        strat_outputs[cid] = add_output(
            "strategy", "strategy", "cluster", cid, strategy_payload("cluster", cid), cid
        )
        road_outputs[cid] = add_output(
            "roadmap", "roadmap", "cluster", cid, roadmap_payload("cluster", cid), cid
        )
    t["analysis_outputs"] = outputs

    # --- 34~36 주장과 근거
    claims: list[dict[str, Any]] = []
    claim_evidence: list[dict[str, Any]] = []

    def components(evidence_n: int, companies_n: int, coverage: float) -> dict[str, float]:
        return {
            "evidence_count": round(min(1.0, evidence_n / 5), 5),
            "independent_companies": round(min(1.0, companies_n / 5), 5),
            "source_tier_score": 1.0,
            "sample_status_score": 0.6,
            "entailment_score": 0.0,
            "contradiction_penalty": 0.0,
            "coverage_score": round(coverage, 5),
        }

    def add_claim(output_id: str, claim_type: str, requirement_kind: str | None,
                  scope_level: str, scope_id: str, text: str, slots: dict[str, Any],
                  confidence: str, comps: dict[str, float]) -> str:
        claim_id = f"claim_demo_{JOB_ROLE_ID}_{len(claims) + 1:06d}"
        claims.append({
            "claim_id": claim_id, "analysis_version": ANALYSIS_VERSION,
            "output_id": output_id, "claim_type": claim_type,
            "requirement_kind": requirement_kind, "scope_level": scope_level,
            "scope_id": scope_id, "claim_text": text, "structured_slots": slots,
            "confidence": confidence, "confidence_components": comps,
            "verification_status": "verified",
        })
        return claim_id

    top_slugs = [row["item_id"] for row in STATISTICS_PAYLOAD["items"][:5]]
    for slug in top_slugs:
        fact = FACTS.get("posting_prevalence", "ratio", "overall", JOB_ROLE_ID,
                         SEGMENT_ALL, RECENT, slug)
        companies = {
            p["company_id"] for p in RECENT_POSTINGS if slug in DIMS_BY_POSTING[p["nn"]]
        }
        claim_id = add_claim(
            stat_output, "statistic", None, "overall", JOB_ROLE_ID,
            f"{DIM_INFO[slug]['label']} 은 최근 1년 데이터 엔지니어 공고의 {freq_pct(slug, RECENT)}% 에 나타난다.",
            {"dimension_id": dim_id(slug), "metric_family": "posting_prevalence",
             "period_id": RECENT, "entry_segment": SEGMENT_ALL},
            "0.82000", components(int(fact["numerator"]), len(companies), 1.0),
        )
        claim_evidence.append({
            "claim_id": claim_id, "support_type": "statistic_fact",
            "support_id": fact["fact_id"], "relation": "supports", "weight": "0.90000",
        })
        for row in evidence_lines(slug, 2):
            nn = row["posting_id"].rsplit("_", 1)[-1]
            claim_evidence.append({
                "claim_id": claim_id, "support_type": "chunk",
                "support_id": chunk_id(nn, 2), "relation": "supports", "weight": "0.60000",
            })

    for slug, title, _desc in BASELINE_ITEMS[:3]:
        claim_id = add_claim(
            intp_outputs["overall"], "posting_explicit", "explicit_requirement",
            "overall", JOB_ROLE_ID,
            f"{title} 은 기업군과 무관하게 반복되는 공통 기대치다.",
            {"dimension_id": dim_id(slug), "baseline_title": title},
            "0.78000", components(freq(slug, RECENT), 3, 1.0),
        )
        claim_evidence.append({
            "claim_id": claim_id, "support_type": "statistic_fact",
            "support_id": FACTS.get("requiredness_ratio", "ratio", "overall", JOB_ROLE_ID,
                                    SEGMENT_ALL, RECENT, slug)["fact_id"],
            "relation": "supports", "weight": "0.80000",
        })

    for cid in CLUSTER_ORDER:
        members = [p for p in POSTINGS if p["cluster"] == cid]
        for entry in CLUSTER_DEVIATIONS[cid]:
            slug = entry[0]
            claim_id = add_claim(
                intp_outputs[cid], "cluster_generalization", "inferred_requirement",
                "cluster", cid,
                f"{CLUSTERS[cid]} 은 {entry[1]} 에서 공통 기대치보다 높은 수준을 요구한다.",
                {"dimension_id": dim_id(slug), "cluster_id": cid,
                 "baseline": entry[2], "deviation": entry[3]},
                "0.71000" if entry[6] == "high" else "0.58000",
                components(len(members), len({m["company_id"] for m in members}), 0.8),
            )
            fact = FACTS.get("cluster_contrast", "prevalence_difference", "cluster", cid,
                             SEGMENT_ALL, RECENT, slug) or FACTS.get(
                "cluster_contrast", "prevalence_difference", "cluster", cid,
                SEGMENT_ALL, PRIOR, slug)
            if fact is not None:
                claim_evidence.append({
                    "claim_id": claim_id, "support_type": "statistic_fact",
                    "support_id": fact["fact_id"], "relation": "supports", "weight": "0.70000",
                })
            for m in MENTIONS:
                if m.dim_slug == slug and POSTING_BY_NN[m.nn]["cluster"] == cid:
                    claim_evidence.append({
                        "claim_id": claim_id, "support_type": "chunk",
                        "support_id": m.chunk_id, "relation": "supports", "weight": "0.65000",
                    })
                    break

    for slug in ("batch-pipeline", "sql-tuning"):
        info = CONCEPT_INFO[slug]
        claim_id = add_claim(
            strat_outputs["overall"], "strategy", None, "overall", JOB_ROLE_ID,
            f"{info['title']} 은 데이터 엔지니어 지원 준비에서 우선순위가 높다.",
            {"concept_id": info["concept_id"], "channels": list(info["channels"])},
            "0.75000", components(5, 5, 1.0),
        )
        claim_evidence.append({
            "claim_id": claim_id, "support_type": "graph_path",
            "support_id": paths[0]["path_id"], "relation": "supports", "weight": "0.50000",
        })

    for cid in CLUSTER_ORDER:
        claim_id = add_claim(
            road_outputs[cid], "strategy", None, "cluster", cid,
            f"{CLUSTERS[cid]} 지원자는 편차 항목을 STEP 01~03 안에서 함께 채우는 것이 유리하다.",
            {"cluster_id": cid, "concepts": [
                CONCEPT_INFO[s]["concept_id"] for s in cluster_concepts(cid)
            ]},
            "0.66000", components(3, 2, 0.8),
        )
        claim_evidence.append({
            "claim_id": claim_id, "support_type": "wiki_revision",
            "support_id": f"wr_demo_{JOB_ROLE_ID}_pipeline-engineering_1",
            "relation": "supports", "weight": "0.50000",
        })
    t["analysis_claims"] = claims
    # 같은 (claim, support_type, support_id, relation) 이 겹치면 기본키가 부딪힌다.
    seen_evidence: set[tuple[str, str, str, str]] = set()
    unique_evidence = []
    for row in claim_evidence:
        key = (row["claim_id"], row["support_type"], row["support_id"], row["relation"])
        if key in seen_evidence:
            continue
        seen_evidence.add(key)
        unique_evidence.append(row)
    t["analysis_claim_evidence"] = unique_evidence

    coverage = []
    for scope_level, scope_id in SCOPES:
        members = (
            list(POSTINGS) if scope_level == "overall"
            else [p for p in POSTINGS if p["cluster"] == scope_id]
        )
        slug = (
            "sql-analytics" if scope_level == "overall"
            else CLUSTER_DEVIATIONS[scope_id][0][0]
        )
        matched = sum(1 for p in members if slug in DIMS_BY_POSTING[p["nn"]])
        coverage.append({
            "assertion_id": f"cov_demo_{JOB_ROLE_ID}_{scope_key(scope_level, scope_id)}",
            "analysis_version": ANALYSIS_VERSION, "scope_level": scope_level,
            "scope_id": scope_id, "dimension_id": dim_id(slug),
            "population_n": len(members), "checked_n": len(members), "matched_n": matched,
            "assertion": f"{DIM_INFO[slug]['label']} 요구 여부를 모집단 전량에서 확인했다.",
            "coverage_complete": True,
        })
    t["coverage_assertions"] = coverage

    # --- 37~41 체크리스트·로드맵·학습 트랙
    t["checklist_concepts"] = [{
        "concept_id": CONCEPT_INFO[slug]["concept_id"], "job_role_id": JOB_ROLE_ID,
        "canonical_title": CONCEPT_INFO[slug]["title"], "kind": CONCEPT_INFO[slug]["kind"],
    } for slug in CONCEPT_SLUGS]

    checklist_items, roadmap_items, fills, tracks = [], [], [], []
    for scope_level, scope_id in SCOPES:
        key = scope_key(scope_level, scope_id)
        payload = strategy_payload(scope_level, scope_id)
        by_concept = {row["item_id"]: row for row in payload["checklist"]}
        for slug in CONCEPT_SLUGS:
            info = CONCEPT_INFO[slug]
            row = by_concept[info["concept_id"]]
            checklist_items.append({
                "item_id": f"ci_demo_{JOB_ROLE_ID}_{key}_{slug}",
                "concept_id": info["concept_id"], "analysis_version": ANALYSIS_VERSION,
                "scope_level": scope_level, "scope_id": scope_id, "title": row["title"],
                "subtitle": row["subtitle"], "reason": row["reason"],
                "evidence_needed": row["evidence_needed"], "channels": row["channels"],
                "required": row["required"], "is_deviation": row["is_deviation"],
            })
        road = roadmap_payload(scope_level, scope_id)
        for step in road["project_steps"]:
            item_id = f"ri_demo_{JOB_ROLE_ID}_{key}_{step['n']}"
            roadmap_items.append({
                "roadmap_item_id": item_id, "analysis_version": ANALYSIS_VERSION,
                "scope_level": scope_level, "scope_id": scope_id, "step_order": step["n"],
                "phase_label": step["phase"], "weeks": step["weeks"],
                "priority": step["priority"], "title": step["title"], "body": step["body"],
                "deliverable": step["deliverable"], "reason": step["reason"],
                "tags": step["tags"],
            })
            done: set[str] = set()
            for row in step["fills"]:
                if row["item_id"] in done:
                    continue
                done.add(row["item_id"])
                fills.append({
                    "roadmap_item_id": item_id, "concept_id": row["item_id"],
                    "fill_kind": row["kind"],
                })
        for i, (cap_slug, phase, priority, _title, _depth, _reason, _slugs) in enumerate(
            STUDY_TRACKS
        ):
            tracks.append({
                "track_id": f"st_demo_{JOB_ROLE_ID}_{key}_{cap_slug}",
                "analysis_version": ANALYSIS_VERSION, "scope_level": scope_level,
                "scope_id": scope_id, "capability_id": CAP_INFO[cap_slug]["capability_id"],
                "phase_label": phase, "priority": priority,
                "depth_reference": "tradeoff" if i == 0 else "application",
            })
    t["checklist_items"] = checklist_items
    t["roadmap_items"] = roadmap_items
    t["roadmap_item_fills"] = fills
    t["study_tracks"] = tracks

    # --- 42 검증 결과 (검사 1~4 pass, 5~7 은 판정자가 없어 적용 대상 아님)
    checks = (
        ("schema_validator", "A0", "pass", "info", None),
        ("source_policy_validator", "A0", "pass", "info", None),
        ("citation_span_validator", "A0", "pass", "info", None),
        ("numerical_consistency", "A0", "pass", "info", None),
        ("claim_evidence_entailment", "A1", "skip", "info", "CHECK_NOT_APPLICABLE"),
        ("cross_model_sample_audit", "A1", "skip", "info", "CHECK_NOT_APPLICABLE"),
        ("contradiction_detector", "A0", "skip", "info", "CHECK_NOT_APPLICABLE"),
    )
    t["verification_results"] = [{
        "result_id": f"vr_demo_{JOB_ROLE_ID}_{i:02d}", "analysis_version": ANALYSIS_VERSION,
        "target_type": "analysis_version", "target_id": ANALYSIS_VERSION,
        "check_name": name, "autonomy_level": autonomy, "verdict": verdict,
        "severity": severity, "reason_code": reason, "repair_action": None,
        "judge_model": None,
        "detail": {
            "note": "판정자를 주입하지 않아 실행하지 않았다" if verdict == "skip"
            else "생성 시드가 자기검사로 확인했다",
            "targets": len(t["analysis_outputs"]),
        },
    } for i, (name, autonomy, verdict, severity, reason) in enumerate(checks, start=1)]

    # --- 43 활성 분석 버전
    t["active_analysis_versions"] = [{
        "job_role_id": JOB_ROLE_ID, "analysis_version": ANALYSIS_VERSION,
        "activated_at": NOW,
    }]
    return t


# ============================================================ 부록 B 자기검사
PAYLOAD_KEYS: dict[str, tuple[str, ...]] = {
    "statistics": (
        "job", "meta", "kpi", "scope_expansion", "inflation", "trend3", "labels",
        "advanced", "combos", "reality", "cluster_axes", "tech_freq", "items", "error",
    ),
    "interpretation": (
        "job", "scope", "baseline", "deviations", "unchanged", "posting",
        "agent_version", "source",
    ),
    "strategy": (
        "job", "scope", "checklist", "portfolio", "essay", "interview",
        "agent_version", "source",
    ),
    "roadmap": (
        "job", "scope", "project_steps", "study_tracks", "check_rows",
        "agent_version", "source",
    ),
}

# 마이그레이션이 넣거나 다른 조각(A1)이 만드는 기준 데이터.
BASE_JOB_ROLES = frozenset({JOB_ROLE_ID})
BASE_PERIODS = frozenset(PERIODS)
BASE_CLUSTERS = frozenset(CLUSTERS)
BASE_COMPANIES = frozenset(p["company_id"] for p in POSTINGS)
BASE_METRIC_POLICIES = frozenset(METRIC_POLICY.values())
BASE_DATASET_VERSIONS = frozenset({DATASET_VERSION})  # A1 이 만든다


def check_spans(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """검사 1 — 근거 위치가 청크 원문의 실제 자리와 같은가."""
    problems: list[str] = []
    text_of = {row["chunk_id"]: row["text"] for row in tables["source_chunks"]}
    for row in tables["requirement_mentions"]:
        text = text_of.get(row["chunk_id"])
        if text is None:
            problems.append(f"{row['mention_id']}: 청크가 없다")
            continue
        sliced = text[row["evidence_span_start"]:row["evidence_span_end"]]
        if sliced != row["raw_expression"]:
            problems.append(f"{row['mention_id']}: 잘라낸 문자열이 다르다 {sliced!r}")
    return problems


def recount(row: dict[str, Any]) -> tuple[int | None, int | None] | None:
    """지표 한 행의 분자·분모를 할당에서 다시 센다. 색인을 쓰지 않는다."""
    family, measure = row["metric_family"], row["measure"]
    rows = population(row["scope_level"], row["scope_id"], row["entry_segment"], row["period_id"])
    total = len(rows)
    dims = {p["nn"]: DIMS_BY_POSTING[p["nn"]] for p in rows}
    slug = next(
        (s for s in DIM_SLUGS if dim_id(s) == row["dimension_id"]), None
    ) if row["dimension_id"] else None
    second = next(
        (s for s in DIM_SLUGS if dim_id(s) == row["secondary_dimension_id"]), None
    ) if row["secondary_dimension_id"] else None

    if family == "posting_prevalence":
        return sum(1 for d in dims.values() if slug in d), total
    if family == "cluster_contrast":
        return sum(1 for d in dims.values() if slug in d), total
    if family == "requiredness_ratio":
        present = [nn for nn, d in dims.items() if slug in d]
        return sum(1 for nn in present if dims[nn][slug][0] == "required"), len(present)
    if family == "depth_distribution":
        present = [nn for nn, d in dims.items() if slug in d]
        return sum(1 for nn in present if dims[nn][slug][1] == measure), len(present)
    if family == "scope_expansion":
        return sum(1 for d in dims.values() if any(s in d for s in BOUNDARY_SLUGS)), total
    if family == "entry_label_advanced_signal_rate":
        return sum(
            1 for d in dims.values() if any(depth == "tradeoff" for _, depth in d.values())
        ), total
    if family == "cooccurrence":
        set_a = {nn for nn, d in dims.items() if slug in d}
        set_b = {nn for nn, d in dims.items() if second in d}
        n_ab = len(set_a & set_b)
        if measure == "count":
            return n_ab, None
        if measure == "jaccard":
            return n_ab, len(set_a | set_b)
        if measure == "conditional_a_given_b":
            return n_ab, len(set_b)
        if measure == "conditional_b_given_a":
            return n_ab, len(set_a)
        return n_ab, total
    return None


def check_numbers(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """검사 2 — 분자·분모가 할당을 다시 세어 나온 값과 같은가."""
    problems: list[str] = []
    for row in tables["statistics_facts"]:
        expected = recount(row)
        if expected is None:
            problems.append(f"{row['fact_id']}: 다시 셀 수 없는 family {row['metric_family']}")
            continue
        if (row["numerator"], row["denominator"]) != expected:
            problems.append(
                f"{row['fact_id']}: {(row['numerator'], row['denominator'])} != {expected}"
            )
    return problems


def check_foreign_keys(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """검사 3 — 참조 대상이 조각 안이나 기준 데이터 안에 있는가."""
    def ids(table: str, column: str) -> frozenset[str]:
        return frozenset(str(row[column]) for row in tables.get(table, []))

    known: dict[str, frozenset[str]] = {
        "job_role_id": BASE_JOB_ROLES,
        "period_id": BASE_PERIODS,
        "company_id": BASE_COMPANIES,
        "dataset_version": BASE_DATASET_VERSIONS,
        "source_id": ids("sources", "source_id"),
        "snapshot_id": ids("source_snapshots", "snapshot_id"),
        "posting_id": ids("postings", "posting_id"),
        "posting_version_id": ids("posting_versions", "posting_version_id"),
        "chunk_id": ids("source_chunks", "chunk_id"),
        "taxonomy_id": ids("requirement_taxonomies", "taxonomy_id"),
        "taxonomy_version_id": ids("requirement_taxonomy_versions", "taxonomy_version_id"),
        "analysis_version": ids("analysis_versions", "analysis_version"),
        "knowledge_version": ids("knowledge_versions", "knowledge_version"),
        "dimension_id": ids("requirement_dimensions", "dimension_id"),
        "capability_id": ids("capabilities", "capability_id"),
        "mention_id": ids("requirement_mentions", "mention_id"),
        "agent_run_id": ids("agent_runs", "agent_run_id"),
        "node_id": ids("knowledge_nodes", "node_id"),
        "output_id": ids("analysis_outputs", "output_id"),
        "claim_id": ids("analysis_claims", "claim_id"),
        "concept_id": ids("checklist_concepts", "concept_id"),
        "roadmap_item_id": ids("roadmap_items", "roadmap_item_id"),
        "page_id": ids("wiki_pages", "page_id"),
        "revision_id": ids("wiki_revisions", "revision_id"),
        "fact_id": ids("statistics_facts", "fact_id"),
        "metric_policy_version": BASE_METRIC_POLICIES,
        "cluster_id": BASE_CLUSTERS,
    }
    refs: tuple[tuple[str, str, str], ...] = (
        ("sources", "company_id", "company_id"),
        ("source_snapshots", "source_id", "source_id"),
        ("source_snapshots", "dataset_version", "dataset_version"),
        ("source_observations", "snapshot_id", "snapshot_id"),
        ("source_assessments", "snapshot_id", "snapshot_id"),
        ("source_assessments", "assessed_by_run_id", "agent_run_id"),
        ("postings", "source_id", "source_id"),
        ("postings", "company_id", "company_id"),
        ("postings", "job_role_id", "job_role_id"),
        ("posting_versions", "posting_id", "posting_id"),
        ("posting_versions", "snapshot_id", "snapshot_id"),
        ("posting_versions", "dataset_version", "dataset_version"),
        ("source_chunks", "snapshot_id", "snapshot_id"),
        ("source_chunks", "dataset_version", "dataset_version"),
        ("requirement_taxonomies", "job_role_id", "job_role_id"),
        ("requirement_taxonomy_versions", "taxonomy_id", "taxonomy_id"),
        ("analysis_versions", "job_role_id", "job_role_id"),
        ("analysis_versions", "dataset_version", "dataset_version"),
        ("analysis_versions", "taxonomy_version_id", "taxonomy_version_id"),
        ("analysis_versions", "knowledge_version", "knowledge_version"),
        ("analysis_versions", "metric_policy_version", "metric_policy_version"),
        ("agent_runs", "analysis_version", "analysis_version"),
        ("requirement_dimensions", "taxonomy_id", "taxonomy_id"),
        ("requirement_dimension_versions", "dimension_id", "dimension_id"),
        ("requirement_dimension_versions", "taxonomy_version_id", "taxonomy_version_id"),
        ("requirement_aliases", "dimension_id", "dimension_id"),
        ("requirement_aliases", "taxonomy_version_id", "taxonomy_version_id"),
        ("requirement_dimension_relations", "src_dimension_id", "dimension_id"),
        ("requirement_dimension_relations", "dst_dimension_id", "dimension_id"),
        ("requirement_dimension_relations", "taxonomy_version_id", "taxonomy_version_id"),
        ("capabilities", "job_role_id", "job_role_id"),
        ("capability_dimension_links", "capability_id", "capability_id"),
        ("capability_dimension_links", "dimension_id", "dimension_id"),
        ("capability_dimension_links", "taxonomy_version_id", "taxonomy_version_id"),
        ("requirement_mentions", "posting_version_id", "posting_version_id"),
        ("requirement_mentions", "snapshot_id", "snapshot_id"),
        ("requirement_mentions", "chunk_id", "chunk_id"),
        ("requirement_mentions", "extraction_run_id", "agent_run_id"),
        ("requirement_mentions", "dataset_version", "dataset_version"),
        ("chunk_extractions", "chunk_id", "chunk_id"),
        ("chunk_extractions", "dataset_version", "dataset_version"),
        ("chunk_extractions", "extraction_run_id", "agent_run_id"),
        ("posting_requirement_assignments", "mention_id", "mention_id"),
        ("posting_requirement_assignments", "dimension_id", "dimension_id"),
        ("posting_requirement_assignments", "taxonomy_version_id", "taxonomy_version_id"),
        ("knowledge_versions", "job_role_id", "job_role_id"),
        ("knowledge_versions", "taxonomy_version_id", "taxonomy_version_id"),
        ("dimension_metric_applicability", "dimension_id", "dimension_id"),
        ("dimension_metric_applicability", "taxonomy_version_id", "taxonomy_version_id"),
        ("statistics_facts", "analysis_version", "analysis_version"),
        ("statistics_facts", "metric_policy_version", "metric_policy_version"),
        ("statistics_facts", "period_id", "period_id"),
        ("statistics_facts", "dimension_id", "dimension_id"),
        ("statistics_facts", "secondary_dimension_id", "dimension_id"),
        ("capability_depth_profiles", "capability_id", "capability_id"),
        ("capability_depth_profiles", "taxonomy_version_id", "taxonomy_version_id"),
        ("capability_depth_profiles", "period_id", "period_id"),
        ("capability_depth_profiles", "analysis_version", "analysis_version"),
        ("saturation_observations", "analysis_version", "analysis_version"),
        ("saturation_observations", "job_role_id", "job_role_id"),
        ("knowledge_nodes", "dataset_version", "dataset_version"),
        ("knowledge_nodes", "taxonomy_version_id", "taxonomy_version_id"),
        ("knowledge_nodes", "analysis_version", "analysis_version"),
        ("knowledge_edges", "src_node_id", "node_id"),
        ("knowledge_edges", "dst_node_id", "node_id"),
        ("knowledge_edges", "produced_by_run_id", "agent_run_id"),
        ("knowledge_edges", "dataset_version", "dataset_version"),
        ("knowledge_edges", "taxonomy_version_id", "taxonomy_version_id"),
        ("knowledge_edges", "analysis_version", "analysis_version"),
        ("graph_paths", "taxonomy_version_id", "taxonomy_version_id"),
        ("graph_paths", "knowledge_version", "knowledge_version"),
        ("graph_paths", "analysis_version", "analysis_version"),
        ("wiki_pages", "capability_id", "capability_id"),
        ("wiki_pages", "knowledge_version", "knowledge_version"),
        ("wiki_revisions", "page_id", "page_id"),
        ("wiki_revisions", "produced_by_run_id", "agent_run_id"),
        ("wiki_evidence", "revision_id", "revision_id"),
        ("wiki_evidence", "chunk_id", "chunk_id"),
        ("analysis_outputs", "analysis_version", "analysis_version"),
        ("analysis_outputs", "job_role_id", "job_role_id"),
        ("analysis_claims", "analysis_version", "analysis_version"),
        ("analysis_claims", "output_id", "output_id"),
        ("analysis_claim_evidence", "claim_id", "claim_id"),
        ("coverage_assertions", "analysis_version", "analysis_version"),
        ("coverage_assertions", "dimension_id", "dimension_id"),
        ("checklist_concepts", "job_role_id", "job_role_id"),
        ("checklist_items", "concept_id", "concept_id"),
        ("checklist_items", "analysis_version", "analysis_version"),
        ("roadmap_items", "analysis_version", "analysis_version"),
        ("roadmap_item_fills", "roadmap_item_id", "roadmap_item_id"),
        ("roadmap_item_fills", "concept_id", "concept_id"),
        ("study_tracks", "analysis_version", "analysis_version"),
        ("study_tracks", "capability_id", "capability_id"),
        ("verification_results", "analysis_version", "analysis_version"),
        ("active_analysis_versions", "job_role_id", "job_role_id"),
        ("active_analysis_versions", "analysis_version", "analysis_version"),
    )
    problems: list[str] = []
    for table, column, target in refs:
        allowed = known[target]
        for row in tables.get(table, []):
            value = row.get(column)
            if value is None:
                continue
            if isinstance(value, list):
                missing = [v for v in value if str(v) not in allowed]
                if missing:
                    problems.append(f"{table}.{column}: {missing} 없음")
                continue
            if str(value) not in allowed:
                problems.append(f"{table}.{column}: {value} 없음")
    for row in tables["analysis_outputs"]:
        scope_level, scope_id = row["scope_level"], row["scope_id"]
        pool = (
            BASE_JOB_ROLES if scope_level == "overall"
            else BASE_CLUSTERS if scope_level == "cluster"
            else known["posting_id"]
        )
        if scope_id not in pool:
            problems.append(f"analysis_outputs.scope_id: {scope_id} 없음")
    support_pool = {
        "chunk": known["chunk_id"], "statistic_fact": known["fact_id"],
        "graph_path": frozenset(row["path_id"] for row in tables["graph_paths"]),
        "wiki_revision": known["revision_id"],
    }
    for row in tables["analysis_claim_evidence"]:
        if row["support_id"] not in support_pool[row["support_type"]]:
            problems.append(f"analysis_claim_evidence: {row['support_id']} 없음")
    return problems


def check_payload_keys(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """검사 4 — payload 가 CONTRACT 5장의 키를 전부 갖는가."""
    problems: list[str] = []
    for row in tables["analysis_outputs"]:
        payload = row["payload"]
        missing = [k for k in PAYLOAD_KEYS[row["output_type"]] if k not in payload]
        if missing:
            problems.append(f"{row['output_id']}: {missing} 없음")
        if row["output_type"] == "statistics":
            meta_keys = ("generated_at", "snapshots", "sources", "disclaimer",
                         "dataset_version", "analysis_version", "is_synthetic")
            problems.extend(
                f"{row['output_id']}: meta.{k} 없음"
                for k in meta_keys if k not in payload["meta"]
            )
            kpi_keys = ("avg_required_skills", "out_of_role_pct", "entry_label_gap_pct",
                        "promoted_to_required_cnt", "advanced_mention_pct")
            problems.extend(
                f"{row['output_id']}: kpi.{k} 없음"
                for k in kpi_keys if k not in payload["kpi"]
            )
            axes = payload["cluster_axes"]["axes"]
            if len(axes) != 5:
                problems.append(f"{row['output_id']}: cluster_axes.axes 개수 {len(axes)}")
            allowed_clusters = {CLUSTERS[c] for c in RECENT_CLUSTERS}
            for cluster_row in payload["cluster_axes"]["rows"]:
                if cluster_row["cluster"] not in allowed_clusters:
                    problems.append(
                        f"{row['output_id']}: 최근 공고가 없는 기업군 행 {cluster_row['cluster']}"
                    )
        if row["output_type"] == "interpretation":
            for key in ("level", "cluster_tag", "posting_id"):
                if key not in payload["scope"]:
                    problems.append(f"{row['output_id']}: scope.{key} 없음")
            if not 7 <= len(payload["baseline"]) <= 9:
                problems.append(f"{row['output_id']}: baseline 개수 {len(payload['baseline'])}")
            if row["scope_level"] != "overall" and not 2 <= len(payload["deviations"]) <= 4:
                problems.append(f"{row['output_id']}: deviations 개수 {len(payload['deviations'])}")
            if row["scope_level"] != "overall" and not 3 <= len(payload["unchanged"]) <= 4:
                problems.append(f"{row['output_id']}: unchanged 개수 {len(payload['unchanged'])}")
    for row in tables["analysis_claims"]:
        keys = ("evidence_count", "independent_companies", "source_tier_score",
                "sample_status_score", "entailment_score", "contradiction_penalty",
                "coverage_score")
        missing = [k for k in keys if k not in row["confidence_components"]]
        if missing:
            problems.append(f"{row['claim_id']}: confidence_components {missing} 없음")
    counts = Counter(row["output_type"] for row in tables["analysis_outputs"])
    expected = {"statistics": 1, "interpretation": 16, "strategy": 7, "roadmap": 7}
    for output_type, n in expected.items():
        if counts.get(output_type, 0) != n:
            problems.append(f"analysis_outputs: {output_type} {counts.get(output_type, 0)}행 (기대 {n})")
    return problems


def check_concepts(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """검사 5 — 체크 개념 식별자와 payload 의 item_id 가 맞는가."""
    problems: list[str] = []
    concepts = {row["concept_id"] for row in tables["checklist_concepts"]}
    items: dict[tuple[str, str], set[str]] = {}
    for row in tables["checklist_items"]:
        items.setdefault((row["scope_level"], row["scope_id"]), set()).add(row["concept_id"])
    for row in tables["analysis_outputs"]:
        payload = row["payload"]
        if row["output_type"] == "strategy":
            payload_ids = {entry["item_id"] for entry in payload["checklist"]}
            stored = items.get((row["scope_level"], row["scope_id"]), set())
            if payload_ids != stored:
                problems.append(f"{row['output_id']}: 체크리스트 항목이 어긋난다")
            if payload_ids - concepts:
                problems.append(f"{row['output_id']}: 개념에 없는 item_id")
        if row["output_type"] == "roadmap":
            used = {f["item_id"] for step in payload["project_steps"] for f in step["fills"]}
            used |= {f["item_id"] for track in payload["study_tracks"] for f in track["fills"]}
            used |= {entry["item_id"] for entry in payload["check_rows"]}
            if used - concepts:
                problems.append(f"{row['output_id']}: 개념에 없는 item_id {sorted(used - concepts)}")
    fill_concepts = {row["concept_id"] for row in tables["roadmap_item_fills"]}
    if fill_concepts - concepts:
        problems.append(f"roadmap_item_fills: 개념에 없는 concept_id {sorted(fill_concepts - concepts)}")
    return problems


def check_posting_population(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """검사 6 — 공고 식별자·기간·기업군·진입 구분과 차원 표본을 확인한다."""
    problems: list[str] = []
    expected_clusters = set(CLUSTER_ORDER)
    period_spec = {
        RECENT: (9, "2026-01-01", "2026-06-30", {"entry_junior": 5, "experienced": 4}),
        PRIOR: (6, "2024-03-01", "2025-11-30", {"entry_junior": 3, "experienced": 3}),
    }
    if len(POSTINGS) != 15 or len(tables["postings"]) != 15:
        problems.append(f"공고 수 {len(POSTINGS)}/{len(tables['postings'])} != 15/15")

    expected_ids = {posting_id(f"{n:02d}") for n in range(1, 16)}
    actual_ids = {row["posting_id"] for row in tables["postings"]}
    if actual_ids != expected_ids:
        problems.append(f"공고 식별자 차이 {sorted(actual_ids ^ expected_ids)}")

    for period, (expected_n, starts_on, ends_on, expected_labels) in period_spec.items():
        group = [p for p in POSTINGS if p["period"] == period]
        if len(group) != expected_n:
            problems.append(f"{period}: 공고 {len(group)}건 != {expected_n}건")
        clusters = {p["cluster"] for p in group}
        if clusters != expected_clusters:
            problems.append(f"{period}: 기업군 차이 {sorted(clusters ^ expected_clusters)}")
        labels = {
            label: sum(1 for p in group if p["entry_label"] == label)
            for label in expected_labels
        }
        if labels != expected_labels:
            problems.append(f"{period}: entry_label {labels} != {expected_labels}")
        for posting in group:
            if not starts_on <= posting["posted_at"] <= ends_on:
                problems.append(f"{posting['nn']}: 게시일 {posting['posted_at']} 범위 밖")

    recent_clusters = Counter(p["cluster"] for p in RECENT_POSTINGS)
    if sorted(recent_clusters.values()) != [1, 1, 1, 2, 2, 2]:
        problems.append(f"recent 기업군 분포 {dict(recent_clusters)} != 2·2·2·1·1·1")
    prior_clusters = Counter(p["cluster"] for p in PRIOR_POSTINGS)
    if set(prior_clusters.values()) != {1}:
        problems.append(f"prev 기업군 분포 {dict(prior_clusters)} != 기업군별 1건")

    for slug in DIM_SLUGS:
        companies = {
            p["company_id"] for p in POSTINGS if slug in DIMS_BY_POSTING[p["nn"]]
        }
        if len(companies) < 2:
            problems.append(f"{slug}: 독립 회사 {len(companies)}곳")
    return problems


def check_output_population(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """검사 7 — 모듈 산출물 31행과 recent 공고 해석 9행을 확인한다."""
    outputs = tables["analysis_outputs"]
    problems: list[str] = []
    counts = Counter(row["output_type"] for row in outputs)
    expected = {"statistics": 1, "interpretation": 16, "strategy": 7, "roadmap": 7}
    if len(outputs) != 31 or counts != expected:
        problems.append(f"산출물 {len(outputs)}행, 종류별 {dict(counts)} != 31행, {expected}")
    posting_interpretations = {
        row["scope_id"] for row in outputs
        if row["output_type"] == "interpretation" and row["scope_level"] == "posting"
    }
    recent_ids = {posting_id(p["nn"]) for p in RECENT_POSTINGS}
    if posting_interpretations != recent_ids:
        problems.append(f"공고 해석 범위 차이 {sorted(posting_interpretations ^ recent_ids)}")
    return problems


def check_direct_contract_values(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """검사 8 — 출처·기간·세그먼트·데이터셋 직접 입력값을 확인한다."""
    problems: list[str] = []
    required_uses = {"statistics", "interpretation_context", "strategy", "roadmap"}
    allowed_uses = required_uses | {
        "wiki_definition", "wiki_why_required", "wiki_depth_criteria",
        "wiki_prerequisites", "wiki_common_misconceptions",
        "wiki_interview_verification", "wiki_learning_sequence",
    }
    for row in tables["source_assessments"]:
        uses = set(row["allowed_uses"])
        if not required_uses <= uses or not uses <= allowed_uses:
            problems.append(f"{row['assessment_id']}: allowed_uses 계약 불일치")
        if (row["source_tier"], str(row["reliability_score"]), row["assessment_version"]) != (
            "A", "0.95000", "sa_v1"
        ):
            problems.append(f"{row['assessment_id']}: 출처 평가 기본값 불일치")
    for row in tables["statistics_facts"]:
        if row["period_id"] not in {RECENT, PRIOR}:
            problems.append(f"{row['fact_id']}: 허용하지 않은 기간 {row['period_id']}")
        if row["metric_family"] == "entry_label_advanced_signal_rate" and row["entry_segment"] != SEGMENT_ENTRY:
            problems.append(f"{row['fact_id']}: entry_segment {row['entry_segment']}")
    if tables.get("dataset_versions"):
        problems.append("data_engineer 모듈은 dataset_versions 행을 만들지 않는다")
    return problems


CHECKS = (
    ("1 근거 위치", check_spans),
    ("2 지표 재계산", check_numbers),
    ("3 외래키", check_foreign_keys),
    ("4 payload 키", check_payload_keys),
    ("5 체크 개념", check_concepts),
    ("6 공고 모집단", check_posting_population),
    ("7 산출물 범위", check_output_population),
    ("8 직접 입력 계약", check_direct_contract_values),
)


def main() -> None:
    tables = build()
    failures = 0
    for label, check in CHECKS:
        problems = check(tables)
        if problems:
            failures += 1
            print(f"[실패] 자기검사 {label} — {len(problems)}건")
            for line in problems[:10]:
                print(f"       {line}")
        else:
            print(f"[통과] 자기검사 {label}")
    if failures:
        raise SystemExit(1)

    counts = write_part(demo_seed_root(), JOB_ROLE_ID, tables)
    total = sum(counts.values())
    print(f"\n{JOB_ROLE_ID}: {len(counts)}개 표 · {total}행")
    for table, n in counts.items():
        print(f"  {table:38s} {n:6d}")
    print(json.dumps({"job": JOB_ROLE_ID, "tables": len(counts), "rows": total}, ensure_ascii=False))


if __name__ == "__main__":
    main()
