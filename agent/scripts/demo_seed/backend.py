"""백엔드 직무의 생성 데모 시드 (갈래 A1).

``agent/data/demo_seed/CONTRACT.md`` 가 이 파일의 기준이다. 데이터베이스에 접속하지
않고 메모리에서 계산해 ``parts/backend/<table>.csv`` 로만 낸다. 모델 호출은 0회다.

**`dataset_versions` 는 A1(backend)만 만든다.** `ds_demo_v1` 는 아홉 직무가 함께 쓰는
한 행이므로 다른 직무 모듈이 같은 행을 만들면 적재에서 중복 키가 된다. A2~A10 은 이
표를 채우지 않는다.

CONTRACT 10.5 의 `allowed_uses` 예시값(`baseline`·`evidence`)은 `0001_initial_schema.sql`
의 `allowed_uses_known` CHECK 가 허용하지 않는다. 적재가 실패하므로 스키마가 허용하는
값으로 대신 담는다. 나머지 규약(계층 A·신뢰도 0.95000·`sa_v1`)은 그대로 따른다.

실행: ``cd agent && python -m scripts.demo_seed.backend``
"""

from __future__ import annotations

import json
import math
from collections import Counter
from itertools import combinations
from typing import Any

from ._csv import demo_seed_root, sha256_hex, write_part

# ============================================================ 식별자
JOB_ROLE_ID = "backend"
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
    ("stats", "통계 분석", "obj_backend_statistics", "slots_filled"),
    ("knowledge", "지식 구축", "obj_backend_knowledge", "slots_filled"),
    ("interpretation", "채용공고 해석", "obj_backend_interpretation", "slots_filled"),
    ("strategy", "합격 전략", "obj_backend_strategy", "slots_filled"),
    ("roadmap", "준비 로드맵", "obj_backend_roadmap", "slots_filled"),
    ("aggregation", "지표 집계", "obj_backend_aggregation", "no_new_evidence"),
)


def run_id(agent: str) -> str:
    return f"run_demo_{JOB_ROLE_ID}_{agent}"


# ============================================================ 1. 요구 차원 15종
# (slug, dimension_kind, 표시 라벨, 정의, 별칭, 역할 경계 여부)
DIMENSIONS: tuple[tuple[str, str, str, str, tuple[str, ...], bool], ...] = (
    (
        "java-spring",
        "technology",
        "Java·Spring 기반 서버 개발",
        "JVM 계열 언어와 Spring 계열 프레임워크로 서버 애플리케이션을 구현하는 요구.",
        ("Java", "Spring Boot", "스프링 부트"),
        False,
    ),
    (
        "rdb-modeling",
        "technology",
        "관계형 데이터베이스 모델링",
        "테이블 설계와 조인·인덱스를 포함한 관계형 데이터베이스 사용 요구.",
        ("MySQL", "RDB 모델링", "SQL 튜닝"),
        False,
    ),
    (
        "caching-performance",
        "technology",
        "캐시·조회 성능 개선",
        "캐시 계층과 부하 측정으로 응답 지연을 줄이는 요구.",
        ("Redis", "캐시", "조회 성능 개선"),
        False,
    ),
    (
        "message-queue",
        "technology",
        "메시지 큐·이벤트 처리",
        "메시지 브로커로 비동기 이벤트를 발행·소비하는 요구.",
        ("Kafka", "메시지 큐", "이벤트 기반 처리"),
        False,
    ),
    (
        "rest-api-design",
        "practice",
        "REST API 설계",
        "자원 설계, 예외 응답, 하위 호환을 포함한 HTTP API 설계 요구.",
        ("REST API", "API 설계", "HTTP API"),
        False,
    ),
    (
        "transaction-integrity",
        "practice",
        "트랜잭션·데이터 정합성",
        "격리수준·멱등성·재처리로 데이터 정합성을 지키는 요구.",
        ("트랜잭션", "데이터 정합성", "동시성 제어"),
        False,
    ),
    (
        "test-automation",
        "practice",
        "테스트 코드 작성",
        "단위·통합 테스트로 회귀를 막는 요구.",
        ("테스트 코드", "단위 테스트", "JUnit"),
        False,
    ),
    (
        "monitoring-incident",
        "practice",
        "모니터링·장애 대응",
        "지표 수집과 장애 탐지·복구를 수행하는 요구.",
        ("모니터링", "장애 대응", "APM"),
        True,
    ),
    (
        "container-deploy",
        "tooling",
        "컨테이너 기반 배포",
        "컨테이너 이미지를 빌드해 서비스를 배포하는 요구.",
        ("Docker", "컨테이너", "이미지 빌드"),
        True,
    ),
    (
        "cloud-infra",
        "tooling",
        "클라우드 인프라 운영",
        "클라우드 자원을 구성하고 운영까지 책임지는 요구.",
        ("AWS", "클라우드 인프라", "Kubernetes"),
        True,
    ),
    (
        "cicd-automation",
        "tooling",
        "CI/CD 파이프라인",
        "빌드·검증·배포를 자동화하는 파이프라인 구성 요구.",
        ("CI/CD", "배포 자동화", "GitHub Actions"),
        True,
    ),
    (
        "payment-settlement",
        "domain",
        "결제·정산 도메인 이해",
        "결제·정산·거래 도메인의 용어와 흐름을 이해하는 요구.",
        ("결제", "정산", "금융 도메인"),
        False,
    ),
    (
        "service-domain-modeling",
        "domain",
        "서비스 도메인 모델링",
        "제품의 비즈니스 규칙을 모델과 경계로 옮기는 요구.",
        ("도메인 모델링", "커머스 도메인", "비즈니스 로직 설계"),
        False,
    ),
    (
        "code-review-collab",
        "collaboration",
        "코드리뷰·협업 커뮤니케이션",
        "코드리뷰와 유관 부서 협의로 변경을 합의하는 요구.",
        ("코드리뷰", "협업", "Git 협업"),
        False,
    ),
    (
        "tech-documentation",
        "collaboration",
        "기술 문서화",
        "API 명세와 설계 산출물을 문서로 남기는 요구.",
        ("기술 문서", "API 문서", "문서화"),
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
    ("cloud-infra", "container-deploy", "narrower"),
    ("container-deploy", "cloud-infra", "broader"),
    ("cloud-infra", "cicd-automation", "narrower"),
    ("transaction-integrity", "rdb-modeling", "related"),
    ("caching-performance", "message-queue", "related"),
    ("payment-settlement", "transaction-integrity", "related"),
    ("java-spring", "rest-api-design", "related"),
    ("tech-documentation", "code-review-collab", "related"),
)

# ============================================================ 2. 역량 6종
CAPABILITIES: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    (
        "api-implementation",
        "API 구현",
        "한 도메인의 자원을 HTTP API 로 완성해 배포까지 끌고 가는 능력.",
        ("java-spring", "rest-api-design", "service-domain-modeling"),
    ),
    (
        "data-modeling",
        "데이터 모델링",
        "요구를 테이블과 쿼리로 옮기고 조회 비용을 설명하는 능력.",
        ("rdb-modeling", "payment-settlement"),
    ),
    (
        "transaction-consistency",
        "정합성 보장",
        "동시 요청과 실패 재처리에서 데이터가 어긋나지 않게 만드는 능력.",
        ("transaction-integrity", "rdb-modeling"),
    ),
    (
        "performance-scaling",
        "성능·확장",
        "병목을 측정하고 캐시·비동기로 처리량을 늘리는 능력.",
        ("caching-performance", "message-queue"),
    ),
    (
        "operability",
        "운영·장애 대응",
        "배포와 관측을 갖추고 장애를 탐지·복구하는 능력.",
        ("container-deploy", "cloud-infra", "cicd-automation", "monitoring-incident"),
    ),
    (
        "collaboration-quality",
        "협업·품질",
        "테스트와 리뷰, 문서로 변경의 근거를 남기는 능력.",
        ("test-automation", "code-review-collab", "tech-documentation"),
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
    ("api-implementation", "data-modeling"),
    ("data-modeling", "transaction-consistency"),
    ("transaction-consistency", "performance-scaling"),
    ("api-implementation", "operability"),
    ("api-implementation", "collaboration-quality"),
)


# ============================================================ 3. 채용공고 30건
# 한 줄은 (본문, 차원 slug 또는 None, depth_level, 주석) 이다.
# 주석은 recent 5건에만 붙는다. 해석 payload 의 세 종류 번호가 여기서 나온다.
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
        "company_id": "co_viva",
        "company": "비바리퍼블리카",
        "cluster": "fintech_finance",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입~3년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-03-02T10:00:00+09:00",
        "title": "백엔드 개발자 (결제·정산 서버) 신입·주니어",
        "sections": (
            ("주요업무", (
                ("결제·정산 서비스의 서버 API를 설계하고 개발합니다.", "rest-api-design", "application",
                 ("note", "도메인 신호 — 돈을 다루는 팀",
                  "결제·정산은 값이 한 번 어긋나면 서비스 신뢰가 무너지는 도메인입니다. 자격요건의 트랜잭션 요구가 왜 필수인지가 이 문장에서 설명됩니다.")),
                ("거래 데이터를 처리하는 정산 배치와 재처리 로직을 개발합니다.", "payment-settlement", "tradeoff",
                 ("note", "배치 — 실패와 재처리의 세계",
                  "배치는 중간에 멈추고 다시 도는 일이 잦습니다. 우대사항의 장애·정합성 요구가 실질 필수로 읽히는 근거가 이 문장입니다.")),
                ("서비스 지표와 장애 알림을 확인하고 대응합니다.", "monitoring-incident", "application",
                 ("note", "운영까지 함께 봅니다",
                  "개발과 운영이 분리되지 않은 팀입니다. 모니터링 지표를 스스로 정의해 본 경험이 있으면 바로 이야깃거리가 됩니다.")),
                ("유관 부서와 정산 정책을 협의하고 요구사항을 반영합니다.", "code-review-collab", "foundation", None),
            )),
            ("자격요건", (
                ("Java와 Spring Boot로 서버를 개발한 경험이 있으신 분", "java-spring", "application",
                 ("base", "서버 프레임워크로 API 완성",
                  "경험이 있으신 분의 실질은 완성해 본 사람입니다. 한 도메인을 배포까지 끝낸 프로젝트면 이 문장은 충분히 증명됩니다.")),
                ("관계형 데이터베이스 모델링과 쿼리 작성에 익숙하신 분", "rdb-modeling", "application",
                 ("base", "RDB 설계·쿼리 기본기",
                  "정산 도메인이라 모델링 요구가 형식적이지 않습니다. 다만 기대 수준 자체는 공통 기대치와 같아 ERD와 인덱스 근거 문서로 충족됩니다.")),
                ("대용량 트랜잭션을 정확하게 처리하는 데 필요한 개념을 설명할 수 있는 분", "transaction-integrity", "tradeoff",
                 ("mark", "트랜잭션 — 공통 기대치를 넘는 요구",
                  "자격요건에 대용량과 정확성이 함께 있습니다. 격리수준·멱등성·재처리를 설명할 수 있는 수준을 기대한다고 읽힙니다.",
                  "high", "같은 직군 40%")),
                ("REST API 설계와 예외 처리 경험이 있으신 분", "rest-api-design", "application",
                 ("base", "REST API 설계",
                  "자원 설계와 에러 응답까지가 표준 기대치입니다. 정산 API의 실패 응답 설계를 예로 들 수 있으면 더 좋습니다.")),
                ("Git 기반 협업과 코드리뷰가 익숙하신 분", "code-review-collab", "foundation",
                 ("base", "코드리뷰·협업 기록",
                  "브랜치와 PR 기록이 있으면 충족됩니다. 주요업무의 정책 협의와 묶으면 소통 기록까지 함께 보여줄 수 있습니다.")),
            )),
            ("우대사항", (
                ("장애 상황에서 데이터 정합성을 지키는 방법을 고민해 보신 분", "monitoring-incident", "tradeoff",
                 ("mark", "장애·정합성 — 라벨은 우대, 실질은 필수에 가까움",
                  "우대에 있지만 주요업무의 정산 배치와 함께 읽으면 다릅니다. 배치가 실패했을 때의 복구를 고민해 본 사람을 찾는 문장입니다.",
                  "high", "같은 직군 33%")),
                ("Redis 등 캐시를 사용해 조회 성능을 개선해 보신 분", "caching-performance", "application",
                 ("note", "캐시 — 개선의 근거를 봅니다",
                  "도입 여부보다 무엇이 느렸고 무엇이 나아졌는지를 묻습니다. 개선 전후 지표 한 장이면 충분합니다.")),
                ("Kafka 등 메시지 큐로 이벤트를 처리해 보신 분", "message-queue", "foundation",
                 ("note", "메시지 큐 — 우대는 우대로",
                  "신입에게는 개념 이해와 토이 수준 경험이면 충분합니다. 필수 항목을 채운 다음의 선택지입니다.")),
                ("결제·정산 등 금융 도메인에 관심이 있으신 분", "payment-settlement", "foundation",
                 ("mark", "금융 도메인 — 관심의 증거를 봅니다",
                  "전공 지식이 아니라 관심의 증거입니다. 정산·거래 용어에 낯설지 않고 왜 이 도메인인지 말할 수 있으면 됩니다.",
                  "mid", "같은 직군 20%")),
                ("테스트 코드를 습관처럼 작성하시는 분", "test-automation", "application",
                 ("base", "테스트 작성 습관",
                  "라벨은 우대지만 통계상 필수화 추세인 항목입니다. 틀리면 안 되는 코드의 테스트가 이 회사에서는 특히 설득력 있습니다.")),
            )),
        ),
        "summary": "기능을 만드는 사람보다 값이 어긋나지 않게 지키는 사람을 찾습니다. 기준선 항목은 대체로 공통 기대치 그대로이고, 트랜잭션 정합성과 장애 복구 두 축이 이 공고의 실질 변별점입니다.",
        "summary_ratio": "편차 3건 · 기준선 일치 5건",
    },
    {
        "nn": "02",
        "company_id": "co_kakao",
        "company": "카카오",
        "cluster": "bigtech_platform",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입/주니어",
        "career_label_raw": "경력 무관",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-01-12T10:00:00+09:00",
        "title": "서버 개발자 (신입·주니어)",
        "sections": (
            ("주요업무", (
                ("대규모 트래픽을 받는 서비스 API를 개발하고 운영합니다.", "rest-api-design", "tradeoff",
                 ("note", "규모가 전제로 깔린 문장",
                  "같은 API 개발이라도 트래픽이 전제로 붙으면 설계 기준이 달라집니다. 자격요건의 성능 개선 요구가 여기서 이어집니다.")),
                ("캐시와 비동기 처리를 활용해 응답 지연을 줄입니다.", "caching-performance", "tradeoff",
                 ("note", "지연을 숫자로 다룹니다",
                  "체감이 아니라 측정된 지연을 줄이는 일입니다. 부하 테스트 도구를 한 번이라도 돌려 본 경험이 대화의 입구가 됩니다.")),
                ("서비스 지표를 수집하고 장애를 탐지·대응합니다.", "monitoring-incident", "application", None),
                ("코드리뷰를 통해 팀의 코드 품질을 함께 관리합니다.", "code-review-collab", "application", None),
            )),
            ("자격요건", (
                ("Java 또는 Kotlin과 Spring 프레임워크에 익숙하신 분", "java-spring", "application",
                 ("base", "서버 프레임워크로 API 완성",
                  "언어를 둘로 열어 둔 것은 스택보다 서버 구현 경험을 본다는 뜻입니다. 어느 쪽이든 완성한 결과물 하나면 충족됩니다.")),
                ("RDBMS 스키마 설계와 인덱스 튜닝을 해 보신 분", "rdb-modeling", "application",
                 ("base", "RDB 설계·쿼리 기본기",
                  "튜닝까지 적었지만 신입 기준의 실질은 조회 패턴을 보고 인덱스를 건 근거를 말할 수 있는 정도입니다.")),
                ("대용량 트래픽 환경에서 성능을 개선해 본 경험이 있으신 분", "caching-performance", "tradeoff",
                 ("mark", "성능 개선 — 경험보다 측정과 시도",
                  "신입 공고에서 이 문장은 실무 규모의 증명이 아니라 병목을 어떻게 찾고 무엇을 바꿨는지를 묻는 신호로 읽는 것이 합리적입니다.",
                  "high", "같은 직군 60%")),
                ("REST API 설계 원칙을 이해하고 적용하실 수 있는 분", "rest-api-design", "application",
                 ("base", "REST API 설계",
                  "원칙을 물었으므로 암기한 규칙이 아니라 내 프로젝트에서 왜 그 자원 구조였는지가 답이 됩니다.")),
                ("단위 테스트를 작성해 보신 분", "test-automation", "application",
                 ("base", "테스트 작성 습관",
                  "우대가 아니라 자격요건에 있습니다. 테스트가 있는 저장소 하나가 이 문장을 그대로 증명합니다.")),
            )),
            ("우대사항", (
                ("Kafka 기반 이벤트 파이프라인을 다뤄 보신 분", "message-queue", "application",
                 ("mark", "이벤트 파이프라인 — 이 기업군의 단골 우대",
                  "서비스가 여럿이면 동기 호출로 묶을 수 없습니다. 발행과 소비, 중복 처리에 대한 이해까지 있으면 우대 이상으로 읽힙니다.",
                  "mid", "같은 직군 40%")),
                ("Docker와 Kubernetes로 서비스를 배포해 보신 분", "container-deploy", "application",
                 ("mark", "배포 — 직무 외 요구의 대표 항목",
                  "백엔드 공고인데 배포 도구를 묻습니다. 통계의 직무 외 요구 항목 중 인프라·배포가 가장 자주 나타나는 이유가 이런 문장입니다.",
                  "mid", "같은 직군 60%")),
                ("AWS 등 클라우드 환경 운영 경험이 있으신 분", "cloud-infra", "foundation",
                 ("note", "클라우드 — 배포의 연장선",
                  "별도 역량이 아니라 배포 경험의 연장으로 읽으면 됩니다. 토이 프로젝트를 클라우드에 한 번 올린 경험이면 대화가 됩니다.")),
                ("기술 문서를 꾸준히 남기신 분", "tech-documentation", "foundation",
                 ("note", "문서 — 협업의 증거",
                  "글솜씨가 아니라 결정을 남기는 습관을 봅니다. README 의 설계 결정 한 절이면 충분한 증거입니다.")),
            )),
        ),
        "summary": "규모를 다뤄 본 흔적을 봅니다. 기준선 항목은 그대로 통하되 성능 개선과 이벤트 처리, 배포까지가 이 공고의 추가 요구입니다.",
        "summary_ratio": "편차 3건 · 기준선 일치 5건",
    },
    {
        "nn": "03",
        "company_id": "co_channelcorp",
        "company": "주식회사 채널코퍼레이션",
        "cluster": "b2b_saas",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "주니어 환영",
        "career_label_raw": "1~4년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-02-17T10:00:00+09:00",
        "title": "백엔드 엔지니어 (주니어)",
        "sections": (
            ("주요업무", (
                ("B2B 고객사가 사용하는 제품 API를 설계하고 개발합니다.", "rest-api-design", "application",
                 ("note", "고객사가 쓰는 API 입니다",
                  "내부용이 아니라 남이 붙여 쓰는 API 입니다. 자격요건의 하위 호환 요구가 여기서 나옵니다.")),
                ("고객사별 데이터 모델을 확장하고 마이그레이션을 수행합니다.", "rdb-modeling", "tradeoff",
                 ("note", "스키마를 살아 있는 채로 바꿉니다",
                  "이미 데이터가 있는 테이블을 바꾸는 일입니다. 마이그레이션을 한 번이라도 해 본 경험이면 이 문장에 답할 수 있습니다.")),
                ("API 명세와 변경 이력을 문서로 관리합니다.", "tech-documentation", "application",
                 ("note", "문서가 업무입니다",
                  "문서화가 우대가 아니라 주요업무에 있습니다. 이 기업군에서 문서는 부수 작업이 아니라 제품의 일부입니다.")),
                ("장애 알림을 받고 원인을 추적해 재발을 막습니다.", "monitoring-incident", "application", None),
            )),
            ("자격요건", (
                ("Java·Spring 또는 동등한 서버 스택 개발 경험이 있으신 분", "java-spring", "application",
                 ("base", "서버 프레임워크로 API 완성",
                  "스택을 열어 두었으므로 언어보다 완성 경험을 봅니다. 기준선 준비 그대로 통하는 문장입니다.")),
                ("관계형 데이터베이스 설계와 쿼리 최적화 경험이 있으신 분", "rdb-modeling", "application",
                 ("base", "RDB 설계·쿼리 기본기",
                  "설계와 최적화를 함께 적었지만 기대 수준은 공통 기대치와 같습니다. 근거를 말할 수 있는 인덱스 하나면 됩니다.")),
                ("REST API를 설계하고 하위 호환을 고려해 변경해 보신 분", "rest-api-design", "tradeoff",
                 ("mark", "하위 호환 — 이 기업군의 진짜 변별점",
                  "만드는 것보다 바꾸는 것을 묻습니다. 버전 정책이나 필드 추가·삭제의 원칙을 설명할 수 있으면 이 문장을 정면으로 채웁니다.",
                  "high", "같은 직군 20%")),
                ("테스트 코드로 회귀를 막아 본 경험이 있으신 분", "test-automation", "application",
                 ("mark", "테스트 — 회귀 방지가 목적입니다",
                  "테스트를 써 봤는지가 아니라 바꿔도 안 깨지는 상태를 만들어 봤는지를 묻습니다. 고객사가 붙어 있는 제품이라 회귀 비용이 큽니다.",
                  "high", "같은 직군 80%")),
                ("동료와 코드리뷰로 협업해 보신 분", "code-review-collab", "foundation",
                 ("base", "코드리뷰·협업 기록",
                  "PR 기록이 있으면 충족됩니다. 리뷰에서 의견이 갈렸던 사례 하나를 준비하면 면접까지 이어집니다.")),
            )),
            ("우대사항", (
                ("API 문서와 변경 가이드를 직접 작성해 보신 분", "tech-documentation", "application",
                 ("mark", "문서화 — 우대 라벨이지만 주요업무와 겹칩니다",
                  "같은 요구가 주요업무에도 있습니다. 라벨은 우대지만 실질은 기대치이며, 문서 한 편이 준비 비용 대비 효과가 큰 항목입니다.",
                  "high", "같은 직군 40%")),
                ("CI/CD 파이프라인을 구성해 보신 분", "cicd-automation", "application",
                 ("note", "자동화 — 작은 팀의 생존 도구",
                  "배포가 잦은 제품이라 수동 배포가 병목이 됩니다. 워크플로 파일 하나를 직접 써 본 경험이면 충분합니다.")),
                ("Docker 기반 개발 환경을 다뤄 보신 분", "container-deploy", "foundation",
                 ("note", "컨테이너 — 개발 환경부터",
                  "운영 규모의 오케스트레이션이 아니라 개발 환경을 맞추는 수준을 묻습니다.")),
                ("제품 도메인을 모델로 옮기는 설계에 관심이 있으신 분", "service-domain-modeling", "application",
                 ("note", "도메인 모델링 — 관심의 언어",
                  "관심이 있으신 분이라는 표현은 지금 잘하라는 뜻이 아닙니다. 용어와 경계를 정리해 본 경험이면 대화가 성립합니다.")),
            )),
        ),
        "summary": "만드는 능력보다 바꾸는 능력을 봅니다. 하위 호환·테스트·문서가 한 묶음으로 이 공고의 변별점을 이룹니다.",
        "summary_ratio": "편차 3건 · 기준선 일치 4건",
    },
    {
        "nn": "04",
        "company_id": "co_daangn",
        "company": "주식회사 당근마켓",
        "cluster": "startup",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력 3년 이상",
        "career_label_raw": "3년 이상",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-04-21T10:00:00+09:00",
        "title": "백엔드 개발자 (Backend Developer)",
        "sections": (
            ("주요업무", (
                ("지역 커뮤니티 서비스의 도메인 로직과 API를 개발합니다.", "service-domain-modeling", "application",
                 ("note", "도메인이 곧 제품입니다",
                  "기술 스택보다 서비스 규칙이 앞에 나옵니다. 이 팀에서 설계 논의는 대부분 도메인 언어로 이뤄집니다.")),
                ("서비스 성장에 맞춰 데이터 모델과 쿼리를 개선합니다.", "rdb-modeling", "tradeoff", None),
                ("배포 파이프라인과 운영 환경을 팀이 직접 관리합니다.", "cicd-automation", "tradeoff",
                 ("note", "전담 조직이 없습니다",
                  "인프라를 맡아 줄 팀이 따로 없다는 선언입니다. 자격요건의 배포·운영 책임 문장이 여기서 나옵니다.")),
                ("제품 팀과 함께 문제를 정의하고 빠르게 실험합니다.", "code-review-collab", "foundation",
                 ("note", "실행 속도를 봅니다",
                  "완성도보다 먼저 굴려 보는 태도를 요구합니다. 스스로 범위를 잘라 완성한 경험이 서사로 쓰입니다.")),
            )),
            ("자격요건", (
                ("Java·Kotlin 또는 Go 기반 서버 개발 경험이 있으신 분", "java-spring", "application",
                 ("base", "서버 프레임워크로 API 완성",
                  "언어를 셋으로 열어 두었습니다. 스택 일치보다 서버를 완성해 본 경험 자체가 기준입니다.")),
                ("REST API 설계와 운영 경험이 있으신 분", "rest-api-design", "application",
                 ("base", "REST API 설계",
                  "설계 뒤에 운영이 붙습니다. 배포한 뒤 겪은 문제를 하나라도 말할 수 있으면 이 문장이 채워집니다.")),
                ("직접 배포하고 운영까지 책임져 보신 분", "cloud-infra", "tradeoff",
                 ("mark", "운영 책임 — 이 기업군의 최대 변별점",
                  "만들어 넘기는 것이 아니라 끝까지 들고 가는 사람을 찾습니다. 배포와 장애 대응의 오너십이 평가의 중심입니다.",
                  "high", "같은 직군 40%")),
                ("관계형 데이터베이스 성능 문제를 해결해 보신 분", "rdb-modeling", "tradeoff",
                 ("base", "RDB 설계·쿼리 기본기",
                  "기본기의 연장이지만 요구 수준이 문제 해결까지 올라갔습니다. 느린 쿼리를 고친 사례 하나를 준비하세요.")),
                ("동시성 문제를 다뤄 보신 분", "transaction-integrity", "application",
                 ("mark", "동시성 — 규모가 아니라 상황에서 옵니다",
                  "거래액이 크지 않아도 인기 게시물 하나에 요청이 몰립니다. 재고·중복 처리 같은 구체적 상황을 준비하면 강합니다.",
                  "mid", "같은 직군 40%")),
            )),
            ("우대사항", (
                ("Docker·Kubernetes 환경을 운영해 보신 분", "container-deploy", "application",
                 ("mark", "컨테이너 운영 — 우대지만 실질은 필수에 가까움",
                  "자격요건의 배포·운영 책임과 같은 요구입니다. 라벨만 우대일 뿐 준비 목록에서 빼기 어렵습니다.",
                  "mid", "같은 직군 60%")),
                ("모니터링 지표를 직접 설계해 보신 분", "monitoring-incident", "application",
                 ("note", "지표를 고르는 일도 설계입니다",
                  "도구 사용이 아니라 무엇을 볼지 정한 경험을 묻습니다. 대시보드 한 장의 선택 근거면 됩니다.")),
                ("캐시로 조회 성능을 개선해 보신 분", "caching-performance", "application", None),
                ("테스트 자동화를 도입해 보신 분", "test-automation", "application", None),
            )),
        ),
        "summary": "끝까지 들고 가는 사람을 찾습니다. 기준선은 공통 기대치 그대로이고 배포·운영 오너십이 이 공고의 실질 관문입니다.",
        "summary_ratio": "편차 3건 · 기준선 일치 4건",
    },
    {
        "nn": "05",
        "company_id": "co_krafton",
        "company": "크래프톤",
        "cluster": "game",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "3년 이상",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-05-11T10:00:00+09:00",
        "title": "게임 플랫폼 서버 개발자",
        "sections": (
            ("주요업무", (
                ("게임 플랫폼의 실시간 요청을 처리하는 서버를 개발합니다.", "rest-api-design", "tradeoff",
                 ("note", "실시간이 붙으면 기준이 달라집니다",
                  "평균 응답이 아니라 최악의 지연을 봅니다. 자격요건의 동시 접속 요구가 여기서 이어집니다.")),
                ("동시 접속 급증 상황에서도 안정적인 처리 구조를 설계합니다.", "caching-performance", "tradeoff",
                 ("note", "부하는 갑자기 옵니다",
                  "점진적 성장이 아니라 이벤트 시점에 몰리는 부하입니다. 평시 성능이 아니라 급증 대응이 설계의 전제입니다.")),
                ("이벤트 메시지를 처리하는 파이프라인을 운영합니다.", "message-queue", "application", None),
                ("장애를 탐지하고 원인을 분석해 재발을 막습니다.", "monitoring-incident", "tradeoff", None),
            )),
            ("자격요건", (
                ("Java·Spring 기반 서버 개발 경험이 있으신 분", "java-spring", "application",
                 ("base", "서버 프레임워크로 API 완성",
                  "게임사라도 플랫폼 서버는 일반 백엔드 스택입니다. 기준선 준비가 그대로 통합니다.")),
                ("대규모 동시 접속 환경의 성능 문제를 해결해 보신 분", "caching-performance", "tradeoff",
                 ("mark", "동시 접속 — 이 기업군의 첫 번째 관문",
                  "처리량과 지연을 함께 다뤄 본 경험을 묻습니다. 측정 도구와 개선 전후 수치가 답의 뼈대입니다.",
                  "high", "같은 직군 60%")),
                ("메시지 큐를 이용한 비동기 처리 경험이 있으신 분", "message-queue", "application",
                 ("mark", "비동기 — 우대가 아니라 자격요건입니다",
                  "다른 기업군에서는 우대에 있던 항목이 여기서는 자격요건으로 올라왔습니다. 개념 이해로는 부족하고 구현 경험이 필요합니다.",
                  "high", "같은 직군 40%")),
                ("데이터 정합성을 지키는 설계를 해 보신 분", "transaction-integrity", "tradeoff",
                 ("mark", "정합성 — 재화가 걸린 도메인",
                  "게임 재화와 아이템은 어긋나면 되돌리기 어렵습니다. 금융과 다른 맥락이지만 요구 수준은 비슷합니다.",
                  "mid", "같은 직군 40%")),
                ("관계형 데이터베이스 튜닝 경험이 있으신 분", "rdb-modeling", "application",
                 ("base", "RDB 설계·쿼리 기본기",
                  "튜닝까지 적혀 있지만 근거를 말할 수 있는 인덱스 설계면 기준선을 충족합니다.")),
            )),
            ("우대사항", (
                ("AWS 등 클라우드에서 서비스를 운영해 보신 분", "cloud-infra", "application",
                 ("note", "운영 — 규모가 큰 환경",
                  "자원을 늘리고 줄이는 판단까지 포함합니다. 신입·주니어 기준이라면 배포 경험으로 충분합니다.")),
                ("장애 대응 프로세스를 정리해 보신 분", "monitoring-incident", "application",
                 ("note", "프로세스 — 개인기가 아니라 절차",
                  "혼자 고친 경험보다 다음 사람이 같은 장애를 빨리 고치게 만든 기록을 봅니다.")),
                ("게임 도메인에 관심이 있으신 분", "service-domain-modeling", "foundation", None),
                ("코드리뷰 문화를 이끌어 보신 분", "code-review-collab", "application", None),
            )),
        ),
        "summary": "급증하는 부하와 재화 정합성을 함께 다룰 사람을 찾습니다. 다른 기업군에서 우대이던 비동기 처리가 여기서는 자격요건입니다.",
        "summary_ratio": "편차 3건 · 기준선 일치 3건",
    },
    {
        "nn": "06",
        "company_id": "co_samsungsds",
        "company": "삼성에스디에스",
        "cluster": "si_enterprise",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입",
        "career_label_raw": "신입",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-01-26T10:00:00+09:00",
        "title": "클라우드 서비스 백엔드 개발 (신입)",
        "sections": (
            ("주요업무", (
                ("기업 고객용 클라우드 서비스의 백엔드 기능을 개발합니다.", "rest-api-design", "foundation", None),
                ("요구사항과 설계 산출물을 문서로 정리합니다.", "tech-documentation", "application", None),
                ("운영 이관을 위해 배포 절차를 표준화합니다.", "cicd-automation", "foundation", None),
            )),
            ("자격요건", (
                ("Java와 Spring 프레임워크 이해가 있으신 분", "java-spring", "foundation", None),
                ("관계형 데이터베이스와 SQL 기본기를 갖추신 분", "rdb-modeling", "foundation", None),
                ("REST API 개발 경험이 있으신 분", "rest-api-design", "foundation", None),
                ("산출물 문서 작성에 거부감이 없으신 분", "tech-documentation", "foundation", None),
            )),
            ("우대사항", (
                ("Docker 기반 배포 경험이 있으신 분", "container-deploy", "foundation", None),
                ("클라우드 인프라에 관심이 있으신 분", "cloud-infra", "foundation", None),
                ("코드리뷰 경험이 있으신 분", "code-review-collab", "foundation", None),
                ("단위 테스트를 작성해 보신 분", "test-automation", "foundation", None),
            )),
        ),
        "summary": None,
        "summary_ratio": None,
    },
    {
        "nn": "07",
        "company_id": "co_kakaopay",
        "company": "카카오페이",
        "cluster": "fintech_finance",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입·주니어",
        "career_label_raw": "0~3년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-02-09T10:00:00+09:00",
        "title": "결제 서비스 백엔드 개발자 (신입·주니어)",
        "sections": (
            ("주요업무", (
                ("결제와 정산 서비스의 서버 기능을 개발합니다.", "payment-settlement", "application", None),
                ("거래 데이터를 안전하게 저장하고 조회하는 기능을 만듭니다.", "rdb-modeling", "application", None),
                ("서비스 지표를 확인하고 이상 징후에 대응합니다.", "monitoring-incident", "foundation", None),
            )),
            ("자격요건", (
                ("Java·Spring 기반 개발 경험이 있으신 분", "java-spring", "application", None),
                ("트랜잭션 개념을 이해하고 계신 분", "transaction-integrity", "foundation", None),
                ("REST API 개발 경험이 있으신 분", "rest-api-design", "application", None),
                ("관계형 데이터베이스 사용 경험이 있으신 분", "rdb-modeling", "foundation", None),
            )),
            ("우대사항", (
                ("금융·결제 도메인 경험이 있으신 분", "payment-settlement", "foundation", None),
                ("테스트 코드 작성 경험이 있으신 분", "test-automation", "foundation", None),
                ("Redis 사용 경험이 있으신 분", "caching-performance", "foundation", None),
                ("코드리뷰에 익숙하신 분", "code-review-collab", "foundation", None),
            )),
        ),
        "summary": None,
        "summary_ratio": None,
    },
    {
        "nn": "08",
        "company_id": "co_woowahan",
        "company": "주식회사 우아한형제들",
        "cluster": "bigtech_platform",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "3년 이상",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-04-06T10:00:00+09:00",
        "title": "배달 서비스 백엔드 개발자",
        "sections": (
            ("주요업무", (
                ("주문·배달 도메인의 서버 시스템을 개발하고 운영합니다.", "service-domain-modeling", "application", None),
                ("트래픽 증가에 대응해 시스템 구조를 개선합니다.", "caching-performance", "tradeoff", None),
                ("이벤트 기반으로 시스템 간 결합도를 낮춥니다.", "message-queue", "application", None),
            )),
            ("자격요건", (
                ("Java·Spring 기반 서버 개발 경험이 있으신 분", "java-spring", "application", None),
                ("대용량 트래픽 서비스를 개발해 보신 분", "caching-performance", "tradeoff", None),
                ("관계형 데이터베이스 설계와 튜닝 경험이 있으신 분", "rdb-modeling", "application", None),
                ("REST API 설계 경험이 있으신 분", "rest-api-design", "application", None),
            )),
            ("우대사항", (
                ("Kafka 등 메시지 큐 운영 경험이 있으신 분", "message-queue", "application", None),
                ("Docker·Kubernetes 사용 경험이 있으신 분", "container-deploy", "application", None),
                ("모니터링과 장애 대응 경험이 있으신 분", "monitoring-incident", "application", None),
                ("테스트 코드 문화를 만들어 보신 분", "test-automation", "application", None),
            )),
        ),
        "summary": None,
        "summary_ratio": None,
    },
    {
        "nn": "09",
        "company_id": "co_bucketplace",
        "company": "주식회사 버킷플레이스",
        "cluster": "startup",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "2년 이상",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-06-08T10:00:00+09:00",
        "title": "백엔드 개발자 (커머스)",
        "sections": (
            ("주요업무", (
                ("커머스 주문·결제 흐름의 서버 기능을 개발합니다.", "service-domain-modeling", "application", None),
                ("상품·주문 데이터 모델을 설계하고 개선합니다.", "rdb-modeling", "application", None),
                ("배포와 운영을 직접 수행합니다.", "cicd-automation", "application", None),
            )),
            ("자격요건", (
                ("Java·Spring 또는 Python 기반 서버 개발 경험이 있으신 분", "java-spring", "application", None),
                ("REST API 설계·개발 경험이 있으신 분", "rest-api-design", "application", None),
                ("주문·결제 흐름의 정합성을 고민해 보신 분", "transaction-integrity", "application", None),
                ("클라우드 환경에서 서비스를 운영해 보신 분", "cloud-infra", "application", None),
            )),
            ("우대사항", (
                ("결제 연동 경험이 있으신 분", "payment-settlement", "foundation", None),
                ("캐시를 활용해 성능을 개선해 보신 분", "caching-performance", "application", None),
                ("테스트 자동화 경험이 있으신 분", "test-automation", "application", None),
                ("코드리뷰로 품질을 관리해 보신 분", "code-review-collab", "application", None),
            )),
        ),
        "summary": None,
        "summary_ratio": None,
    },
    {
        "nn": "10", "company_id": "co_naver", "company": "네이버",
        "cluster": "bigtech_platform", "period": PRIOR,
        "entry_label": "entry_junior", "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입~3년", "edu_label_raw": "학사 이상",
        "posted_at": "2024-04-15T10:00:00+09:00",
        "title": "플랫폼 백엔드 개발자 (신입·주니어)",
        "sections": (
            ("주요업무", (
                ("대규모 사용자가 이용하는 플랫폼 API를 개발하고 운영합니다.", "rest-api-design", "application", None),
                ("캐시와 비동기 처리를 활용해 응답 지연을 개선합니다.", "caching-performance", "application", None),
                ("서비스 지표를 관찰하고 장애 원인을 분석합니다.", "monitoring-incident", "application", None),
            )),
            ("자격요건", (
                ("Java와 Spring Boot 기반 서버 개발 경험이 있으신 분", "java-spring", "application", None),
                ("관계형 데이터베이스 모델링과 SQL에 익숙하신 분", "rdb-modeling", "application", None),
                ("테스트 코드로 변경의 안정성을 확인해 보신 분", "test-automation", "application", None),
            )),
            ("우대사항", (
                ("Kafka 기반 이벤트 처리 경험이 있으신 분", "message-queue", "application", None),
                ("Docker 기반 배포 경험이 있으신 분", "container-deploy", "foundation", None),
                ("API 변경 이력을 기술 문서로 남겨 보신 분", "tech-documentation", "foundation", None),
            )),
        ), "summary": None, "summary_ratio": None,
    },
    {
        "nn": "11", "company_id": "co_daangn", "company": "주식회사 당근마켓",
        "cluster": "startup", "period": PRIOR,
        "entry_label": "entry_junior", "entry_label_raw": "주니어 지원 가능",
        "career_label_raw": "0~3년", "edu_label_raw": "학력 무관",
        "posted_at": "2024-08-19T10:00:00+09:00",
        "title": "커뮤니티 서비스 백엔드 개발자 (주니어)",
        "sections": (
            ("주요업무", (
                ("지역 커뮤니티의 도메인 로직과 API를 개발합니다.", "service-domain-modeling", "application", None),
                ("사용량 증가에 맞춰 데이터 모델과 조회 성능을 개선합니다.", "rdb-modeling", "application", None),
                ("배포 이후 서비스 지표와 오류를 직접 확인합니다.", "monitoring-incident", "application", None),
            )),
            ("자격요건", (
                ("Java·Kotlin과 Spring 기반 개발 경험이 있으신 분", "java-spring", "application", None),
                ("REST API를 설계하고 구현해 보신 분", "rest-api-design", "application", None),
                ("트랜잭션과 동시성의 기본 개념을 이해하시는 분", "transaction-integrity", "foundation", None),
            )),
            ("우대사항", (
                ("클라우드 환경에 서비스를 배포해 보신 분", "cloud-infra", "foundation", None),
                ("CI/CD 파이프라인을 구성해 보신 분", "cicd-automation", "foundation", None),
                ("동료와 코드리뷰로 협업해 보신 분", "code-review-collab", "foundation", None),
            )),
        ), "summary": None, "summary_ratio": None,
    },
    {
        "nn": "12", "company_id": "co_channelcorp", "company": "주식회사 채널코퍼레이션",
        "cluster": "b2b_saas", "period": PRIOR,
        "entry_label": "entry_junior", "entry_label_raw": "신입·주니어",
        "career_label_raw": "신입~3년", "edu_label_raw": "학력 무관",
        "posted_at": "2025-01-20T10:00:00+09:00",
        "title": "B2B SaaS 백엔드 엔지니어 (신입·주니어)",
        "sections": (
            ("주요업무", (
                ("고객사가 사용하는 제품 API를 설계하고 개발합니다.", "rest-api-design", "application", None),
                ("고객별 데이터 구조와 마이그레이션을 관리합니다.", "rdb-modeling", "application", None),
                ("API 명세와 변경 이력을 문서로 남깁니다.", "tech-documentation", "application", None),
            )),
            ("자격요건", (
                ("Java·Spring 기반 서버 개발 경험이 있으신 분", "java-spring", "application", None),
                ("회귀를 막는 단위 테스트를 작성해 보신 분", "test-automation", "application", None),
                ("Git 기반 코드리뷰에 익숙하신 분", "code-review-collab", "foundation", None),
            )),
            ("우대사항", (
                ("Redis로 조회 성능을 개선해 보신 분", "caching-performance", "application", None),
                ("Docker 기반 개발 환경을 구성해 보신 분", "container-deploy", "foundation", None),
                ("CI/CD로 배포를 자동화해 보신 분", "cicd-automation", "foundation", None),
            )),
        ), "summary": None, "summary_ratio": None,
    },
    {
        "nn": "13", "company_id": "co_kakaopay", "company": "카카오페이",
        "cluster": "fintech_finance", "period": PRIOR,
        "entry_label": "experienced", "entry_label_raw": "경력",
        "career_label_raw": "3년 이상", "edu_label_raw": "학력 무관",
        "posted_at": "2025-04-07T10:00:00+09:00",
        "title": "결제·정산 플랫폼 백엔드 개발자",
        "sections": (
            ("주요업무", (
                ("결제와 정산 서비스의 서버 API를 개발합니다.", "payment-settlement", "application", None),
                ("거래 데이터의 정합성과 재처리 흐름을 설계합니다.", "transaction-integrity", "tradeoff", None),
                ("장애 알림을 확인하고 복구 절차를 개선합니다.", "monitoring-incident", "application", None),
            )),
            ("자격요건", (
                ("Java와 Spring 기반 서버 개발 경험이 있으신 분", "java-spring", "application", None),
                ("관계형 데이터베이스 설계와 튜닝 경험이 있으신 분", "rdb-modeling", "application", None),
                ("REST API의 오류와 멱등성을 설계해 보신 분", "rest-api-design", "tradeoff", None),
            )),
            ("우대사항", (
                ("Kafka 기반 비동기 처리 경험이 있으신 분", "message-queue", "application", None),
                ("테스트 자동화 경험이 있으신 분", "test-automation", "application", None),
                ("금융 서비스 도메인을 모델링해 보신 분", "service-domain-modeling", "foundation", None),
            )),
        ), "summary": None, "summary_ratio": None,
    },
    {
        "nn": "14", "company_id": "co_samsungsds", "company": "삼성에스디에스",
        "cluster": "si_enterprise", "period": PRIOR,
        "entry_label": "experienced", "entry_label_raw": "경력",
        "career_label_raw": "3년 이상", "edu_label_raw": "학사 이상",
        "posted_at": "2025-07-14T10:00:00+09:00",
        "title": "엔터프라이즈 클라우드 백엔드 개발자",
        "sections": (
            ("주요업무", (
                ("기업 고객용 업무 시스템의 백엔드 기능을 개발합니다.", "service-domain-modeling", "application", None),
                ("배포 절차와 운영 산출물을 표준화합니다.", "cicd-automation", "application", None),
                ("설계와 API 명세를 기술 문서로 관리합니다.", "tech-documentation", "application", None),
            )),
            ("자격요건", (
                ("Java·Spring 기반 서버 개발 경험이 있으신 분", "java-spring", "application", None),
                ("관계형 데이터베이스와 SQL에 익숙하신 분", "rdb-modeling", "application", None),
                ("REST API 설계와 연동 경험이 있으신 분", "rest-api-design", "application", None),
            )),
            ("우대사항", (
                ("Docker와 Kubernetes 운영 경험이 있으신 분", "container-deploy", "application", None),
                ("AWS 등 클라우드 인프라 경험이 있으신 분", "cloud-infra", "application", None),
                ("테스트 자동화 경험이 있으신 분", "test-automation", "application", None),
            )),
        ), "summary": None, "summary_ratio": None,
    },
    {
        "nn": "15", "company_id": "co_krafton", "company": "크래프톤",
        "cluster": "game", "period": PRIOR,
        "entry_label": "experienced", "entry_label_raw": "경력",
        "career_label_raw": "3년 이상", "edu_label_raw": "학사 이상",
        "posted_at": "2025-10-13T10:00:00+09:00",
        "title": "게임 플랫폼 서버 개발자",
        "sections": (
            ("주요업무", (
                ("게임 플랫폼의 실시간 요청을 처리하는 서버를 개발합니다.", "rest-api-design", "tradeoff", None),
                ("이벤트 메시지를 처리하는 파이프라인을 운영합니다.", "message-queue", "application", None),
                ("동시 접속 급증에 맞춰 성능을 개선합니다.", "caching-performance", "tradeoff", None),
            )),
            ("자격요건", (
                ("Java와 Spring 기반 서버 개발 경험이 있으신 분", "java-spring", "application", None),
                ("관계형 데이터베이스 튜닝 경험이 있으신 분", "rdb-modeling", "application", None),
                ("동시성 상황에서 데이터 정합성을 지켜 보신 분", "transaction-integrity", "tradeoff", None),
            )),
            ("우대사항", (
                ("클라우드에서 서비스를 운영해 보신 분", "cloud-infra", "application", None),
                ("장애 대응 과정을 문서로 정리해 보신 분", "monitoring-incident", "application", None),
                ("코드리뷰로 팀의 품질을 관리해 보신 분", "code-review-collab", "application", None),
            )),
        ), "summary": None, "summary_ratio": None,
    },
)


def _scaled_posting(
    nn: str,
    company_id: str,
    company: str,
    cluster: str,
    period: str,
    entry_label: str,
    posted_at: str,
) -> dict[str, Any]:
    """16~30번 확장 공고를 같은 밀도의 결정적 본문으로 만든다."""
    cluster_lines = {
        "bigtech_platform": (
            ("캐시로 대규모 조회 요청의 응답 지연을 줄입니다.", "caching-performance", "tradeoff", None),
            ("Kafka 기반 이벤트 파이프라인을 개발합니다.", "message-queue", "application", None),
        ),
        "startup": (
            ("클라우드 환경의 서비스를 직접 배포하고 운영합니다.", "cloud-infra", "application", None),
            ("CI/CD 파이프라인으로 변경을 빠르게 배포합니다.", "cicd-automation", "application", None),
        ),
        "b2b_saas": (
            ("고객사가 참고할 API 변경 문서를 관리합니다.", "tech-documentation", "application", None),
            ("Docker 기반 개발·배포 환경을 표준화합니다.", "container-deploy", "application", None),
        ),
        "fintech_finance": (
            ("결제와 정산 흐름의 서버 기능을 개발합니다.", "payment-settlement", "application", None),
            ("재시도에도 거래 정합성이 유지되도록 설계합니다.", "transaction-integrity", "tradeoff", None),
        ),
        "si_enterprise": (
            ("설계와 운영 절차를 기술 문서로 관리합니다.", "tech-documentation", "application", None),
            ("검증과 배포 절차를 CI/CD로 자동화합니다.", "cicd-automation", "application", None),
        ),
        "game": (
            ("메시지 큐로 게임 이벤트를 비동기 처리합니다.", "message-queue", "application", None),
            ("동시 접속 급증에 맞춰 캐시 전략을 조정합니다.", "caching-performance", "tradeoff", None),
        ),
    }[cluster]
    is_entry = entry_label == "entry_junior"
    return {
        "nn": nn,
        "company_id": company_id,
        "company": company,
        "cluster": cluster,
        "period": period,
        "entry_label": entry_label,
        "entry_label_raw": "신입·주니어" if is_entry else "경력",
        "career_label_raw": "신입~3년" if is_entry else "3년 이상",
        "edu_label_raw": "학력 무관",
        "posted_at": posted_at,
        "title": f"{company} 백엔드 개발자 ({nn})",
        "sections": (
            ("주요업무", (
                ("서비스 도메인 로직과 REST API를 개발합니다.", "service-domain-modeling", "application", None),
                cluster_lines[0],
                ("서비스 지표를 관찰하고 장애 원인을 분석합니다.", "monitoring-incident", "application", None),
            )),
            ("자격요건", (
                ("Java와 Spring Boot 기반 서버 개발 경험이 있으신 분", "java-spring", "application", None),
                ("관계형 데이터베이스 모델링과 SQL에 익숙하신 분", "rdb-modeling", "application", None),
                ("REST API의 오류 응답을 설계해 보신 분", "rest-api-design", "application", None),
            )),
            ("우대사항", (
                cluster_lines[1],
                ("테스트 코드로 회귀를 막아 보신 분", "test-automation", "application", None),
                ("동료와 코드리뷰로 협업해 보신 분", "code-review-collab", "foundation", None),
            )),
        ),
        "summary": None,
        "summary_ratio": None,
    }


POSTINGS += (
    _scaled_posting("16", "co_kakao", "카카오", "bigtech_platform", RECENT, "entry_junior", "2026-01-05T10:00:00+09:00"),
    _scaled_posting("17", "co_daangn", "주식회사 당근마켓", "startup", RECENT, "entry_junior", "2026-01-19T10:00:00+09:00"),
    _scaled_posting("18", "co_kakaopay", "카카오페이", "fintech_finance", RECENT, "entry_junior", "2026-02-23T10:00:00+09:00"),
    _scaled_posting("19", "co_channelcorp", "주식회사 채널코퍼레이션", "b2b_saas", RECENT, "entry_junior", "2026-03-09T10:00:00+09:00"),
    _scaled_posting("20", "co_channelcorp", "주식회사 채널코퍼레이션", "b2b_saas", RECENT, "experienced", "2026-03-23T10:00:00+09:00"),
    _scaled_posting("21", "co_samsungsds", "삼성에스디에스", "si_enterprise", RECENT, "entry_junior", "2026-04-13T10:00:00+09:00"),
    _scaled_posting("22", "co_samsungsds", "삼성에스디에스", "si_enterprise", RECENT, "experienced", "2026-04-27T10:00:00+09:00"),
    _scaled_posting("23", "co_krafton", "크래프톤", "game", RECENT, "experienced", "2026-05-25T10:00:00+09:00"),
    _scaled_posting("24", "co_krafton", "크래프톤", "game", RECENT, "experienced", "2026-06-22T10:00:00+09:00"),
    _scaled_posting("25", "co_naver", "네이버", "bigtech_platform", PRIOR, "entry_junior", "2024-05-13T10:00:00+09:00"),
    _scaled_posting("26", "co_daangn", "주식회사 당근마켓", "startup", PRIOR, "entry_junior", "2024-09-09T10:00:00+09:00"),
    _scaled_posting("27", "co_channelcorp", "주식회사 채널코퍼레이션", "b2b_saas", PRIOR, "entry_junior", "2025-02-10T10:00:00+09:00"),
    _scaled_posting("28", "co_kakaopay", "카카오페이", "fintech_finance", PRIOR, "experienced", "2025-05-12T10:00:00+09:00"),
    _scaled_posting("29", "co_samsungsds", "삼성에스디에스", "si_enterprise", PRIOR, "experienced", "2025-08-11T10:00:00+09:00"),
    _scaled_posting("30", "co_krafton", "크래프톤", "game", PRIOR, "experienced", "2025-11-10T10:00:00+09:00"),
)


# ============================================================ 파생 구조
def posting_id(nn: str) -> str:
    return f"dp_{JOB_ROLE_ID}_{nn}"


def snapshot_id(nn: str) -> str:
    return f"snap_demo_{JOB_ROLE_ID}_{nn}"


def source_id(nn: str) -> str:
    return f"src_demo_{JOB_ROLE_ID}_{nn}"


def posting_version_id(nn: str) -> str:
    return f"pv_demo_{JOB_ROLE_ID}_{nn}"


def closed_at(posting: dict[str, Any]) -> str | None:
    """2026년 진행 중 6건을 제외한 공고의 결정적 마감 시각."""
    if posting["nn"] in {"01", "02", "03", "04", "05", "06"}:
        return None
    if posting["period"] == RECENT:
        return "2026-07-01T18:00:00+09:00"
    return "2025-12-01T18:00:00+09:00"


def chunk_id(nn: str, k: int) -> str:
    return f"chunk_demo_{JOB_ROLE_ID}_{nn}_{k}"


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
        start = text.find(line[0])
        if start < 0:  # pragma: no cover - 데이터 오류
            raise ValueError(f"청크에서 표현을 찾지 못했다: {line[0]!r}")
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
# 최근 1년 공고가 있는 기업군만 최근 지표와 히트맵 행의 대상이다.
RECENT_CLUSTERS = tuple(c for c in CLUSTER_ORDER if any(p["cluster"] == c for p in RECENT_POSTINGS))


def assignments_of(nn: str) -> dict[str, tuple[str, str]]:
    """한 공고의 차원별 (requiredness, depth). 중복 제거 단위는 공고 버전이다."""
    result: dict[str, tuple[str, str]] = {}
    for mention in MENTIONS_BY_POSTING[nn]:
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


# ============================================================ 6. 지표 사실
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
            ("java-spring", "rdb-modeling"),
            ("java-spring", "rest-api-design"),
            ("rdb-modeling", "transaction-integrity"),
            ("caching-performance", "message-queue"),
            ("container-deploy", "cloud-infra"),
            ("test-automation", "code-review-collab"),
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

                # --- scope_expansion
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


# ============================================================ 통계 payload 라벨
# CONTRACT 5장 A. tag·type·id·축 라벨은 백엔드 전용이다. 다른 직무에 쓰지 않는다.
SCOPE_EXPANSION_TAGS: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    ("infra_deploy", "인프라·배포", "컨테이너·클라우드·배포 자동화까지 요구",
     ("container-deploy", "cloud-infra", "cicd-automation")),
    ("ops_monitoring", "운영·모니터링", "지표 수집과 장애 대응까지 요구",
     ("monitoring-incident",)),
    ("docs", "문서화", "API 명세와 설계 산출물 작성까지 요구",
     ("tech-documentation",)),
)

ADVANCED_TYPES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("traffic", "대용량 트래픽", ("caching-performance",)),
    ("concurrency", "동시성·정합성", ("transaction-integrity",)),
    ("incident", "장애 대응·모니터링", ("monitoring-incident",)),
)

COMBOS: tuple[tuple[str, str, str, str, tuple[str, ...]], ...] = (
    ("base", "Java·Spring + RDB + REST API",
     "한 도메인의 자원을 데이터베이스와 연결해 API로 완성하는 기본 조합입니다.",
     "한 도메인을 배포 가능한 API로 완성",
     ("java-spring", "rdb-modeling", "rest-api-design")),
    ("integrity", "기본 스택 + 트랜잭션 정합성",
     "동시 요청과 재처리에서 값이 어긋나지 않게 만드는 조합입니다.",
     "격리수준·멱등성을 설명할 수 있는 수준",
     ("java-spring", "transaction-integrity")),
    ("cache", "기본 스택 + 캐시",
     "조회 성능을 캐시로 개선해 본 경험을 묻는 조합입니다.",
     "개선 전후 지표를 남긴 수준",
     ("java-spring", "caching-performance")),
    ("deploy", "컨테이너 + 클라우드",
     "빌드부터 배포까지 직접 굴려 본 경험을 묻는 조합입니다.",
     "배포 파이프라인 1회 이상 구성",
     ("container-deploy", "cloud-infra")),
    ("event", "메시지 큐 이벤트 처리",
     "서비스 사이를 비동기로 잇는 구조의 이해를 묻는 조합입니다.",
     "발행·소비와 중복 처리 이해",
     ("message-queue",)),
)

REALITY_TAGS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("project_experience", "완성된 프로젝트 경험", ("rest-api-design", "java-spring")),
    ("deploy_ops", "배포·운영까지 해 본 경험", ("container-deploy", "cloud-infra", "cicd-automation")),
    ("domain_understanding", "도메인 이해와 관심", ("payment-settlement", "service-domain-modeling")),
)

CLUSTER_AXES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("performance", "성능·트래픽", ("caching-performance", "message-queue")),
    ("integrity", "트랜잭션·정합성", ("transaction-integrity", "payment-settlement")),
    ("api_domain", "API·도메인", ("rest-api-design", "service-domain-modeling")),
    ("ops_automation", "운영·자동화", ("container-deploy", "cloud-infra", "cicd-automation", "monitoring-incident")),
    ("collab_docs", "협업·문서", ("code-review-collab", "tech-documentation", "test-automation")),
)


def axis_level(value: int | None) -> str:
    if value is None:
        return "—"
    if value >= 70:
        return "강"
    if value >= 31:
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


def posting_url(nn: str) -> str:
    return f"https://careersignal.example/demo/{JOB_ROLE_ID}/{posting_id(nn)}"


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
        recent_hits, prev_hits = freq(slug, RECENT), freq(slug, PRIOR)
        if recent_hits < 2 or prev_hits < 2:
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

    # --- cluster_axes (표본 확보를 위해 recent 와 prev 전체 기간을 합산한다)
    axes_rows = []
    for cluster_id in CLUSTER_ORDER:
        members = [p for p in POSTINGS if p["cluster"] == cluster_id]
        n = len(members)
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
        for cluster_id in CLUSTER_ORDER:
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


# ============================================================ 해석 payload
BASELINE_ITEMS: tuple[tuple[str, str, str], ...] = (
    ("rest-api-design", "REST API 설계·완성",
     "한 도메인의 자원을 설계하고 예외 응답까지 갖춰 배포하는 경험입니다. 만들어 봤다가 아니라 돌려 봤다를 기대하는 문장이 다수입니다."),
    ("java-spring", "서버 프레임워크로 API 완성",
     "언어를 여럿 열어 둔 공고가 많습니다. 스택 일치보다 서버를 하나 완성해 본 사실 자체가 기준입니다."),
    ("rdb-modeling", "RDB 설계·쿼리 기본기",
     "테이블 설계와 조인·인덱스의 기본입니다. 백엔드 신입에게는 사실상 전제 조건에 해당합니다."),
    ("code-review-collab", "코드리뷰·협업 기록",
     "브랜치와 PR로 변경 단위를 나눠 협업한 기록입니다. 기업군과 무관하게 같은 수준을 요구합니다."),
    ("test-automation", "테스트 작성 습관",
     "단위 테스트를 습관처럼 쓰는지 봅니다. 우대에서 자격요건으로 올라오는 흐름이 뚜렷합니다."),
    ("monitoring-incident", "운영·장애 대응 감각",
     "지표를 보고 장애를 알아채는 감각입니다. 직무 외 요구로 분류되지만 등장 빈도는 기본기에 가깝습니다."),
    ("container-deploy", "컨테이너 배포 경험",
     "이미지를 빌드해 서비스를 올려 본 경험입니다. 기준선의 경계선에 걸쳐 있는 항목입니다."),
    ("transaction-integrity", "트랜잭션 기본 이해",
     "커밋·롤백과 격리수준의 개념 이해입니다. 전체에서는 기본 이해지만 기업군에 따라 심화로 올라갑니다."),
)

UNCHANGED_ITEMS: tuple[tuple[str, str, str], ...] = (
    ("java-spring", "서버 프레임워크로 API 완성",
     "이 기업군도 요구 수준은 공통 기대치와 같습니다. 차별화 지점이 아니라 전제 조건입니다."),
    ("rdb-modeling", "RDB 설계·쿼리 기본기",
     "스키마 설계 기본기는 공통 기대치 그대로입니다. 심화는 다른 편차 항목이 담당합니다."),
    ("code-review-collab", "코드리뷰·협업 기록",
     "협업 기록 요구는 기업군과 무관하게 동일합니다. 준비했다면 어디에나 통하는 항목입니다."),
    ("rest-api-design", "REST API 설계·완성",
     "자원 설계와 예외 응답까지가 전 기업군 공통입니다. 더 요구하지도, 덜 보지도 않습니다."),
)

# 기업군별 편차. (차원 slug, 주제, 기준선, 편차, 근거, 해석, 신뢰도, 근거 블록, 체크 개념)
CLUSTER_DEVIATIONS: dict[str, tuple[tuple[str, ...], ...]] = {
    "fintech_finance": (
        ("transaction-integrity", "트랜잭션", "트랜잭션 개념 이해", "동시성·재처리·정합성 보장까지",
         '"대용량 트랜잭션을 정확하게 처리" 문장이 자격요건에 있음',
         "돈을 다루는 도메인은 값의 정확성이 곧 신뢰입니다. 신입에게도 격리수준과 재처리 시나리오를 설명할 수 있는 수준을 기대합니다.",
         "high", "#items", "tx-integrity"),
        ("monitoring-incident", "장애 대응", "지표를 보는 감각", "실패한 배치의 복구 설계까지",
         '우대사항의 "장애 상황에서 데이터 정합성" 문장',
         "라벨은 우대지만 주요업무의 정산 배치와 묶어 읽으면 실질 필수에 가깝습니다. 장애를 재현하고 복구해 본 기록이 그대로 답이 됩니다.",
         "high", "#advanced", "incident-recovery"),
        ("payment-settlement", "도메인", "공통 항목에 없음", "신규 · 결제·정산 용어와 흐름 이해",
         '"금융 도메인에 관심이 있으신 분" 문장',
         "전공 지식이 아니라 관심의 증거를 봅니다. 용어에 낯설지 않고 지원 이유를 말할 수 있으면 충분합니다.",
         "mid", "#items", "domain-study"),
    ),
    "bigtech_platform": (
        ("caching-performance", "성능", "성능을 고려한 설계", "부하 측정과 개선 전후 지표까지",
         '"대용량 트래픽 환경에서 성능을 개선" 문장',
         "규모가 전제로 깔린 공고입니다. 신입에게는 실무 규모의 증명이 아니라 병목을 찾고 바꿔 본 과정을 기대합니다.",
         "high", "#advanced", "performance"),
        ("message-queue", "비동기 처리", "공통 항목에 없음", "신규 · 이벤트 발행·소비와 중복 처리",
         '우대사항의 "Kafka 기반 이벤트 파이프라인" 문장',
         "서비스가 여럿이면 동기 호출로 묶을 수 없습니다. 개념 이해에 토이 수준 구현이 붙으면 우대 이상으로 읽힙니다.",
         "mid", "#combos", "event-pipeline"),
        ("container-deploy", "배포", "컨테이너 배포 경험", "오케스트레이션 환경 운영까지",
         '우대사항의 "Docker와 Kubernetes로 서비스를 배포" 문장',
         "백엔드 공고인데 배포 도구를 묻습니다. 직무 외 요구 중 인프라·배포가 가장 자주 나타나는 이유가 이런 문장입니다.",
         "mid", "#scope_expansion", "deploy-pipeline"),
    ),
    "b2b_saas": (
        ("rest-api-design", "API", "자원 설계와 예외 응답", "하위 호환을 고려한 변경까지",
         '"하위 호환을 고려해 변경해 보신 분" 문장',
         "고객사가 붙여 쓰는 API 입니다. 만드는 것보다 바꾸는 것의 원칙을 설명할 수 있어야 합니다.",
         "high", "#items", "crud-api"),
        ("test-automation", "테스트", "단위 테스트 작성", "회귀를 막는 테스트 전략까지",
         '"테스트 코드로 회귀를 막아 본 경험" 문장',
         "고객사가 이미 붙어 있어 회귀 비용이 큽니다. 테스트를 써 봤는지가 아니라 바꿔도 안 깨지는 상태를 만들었는지를 묻습니다.",
         "high", "#items", "test-habit"),
        ("tech-documentation", "문서화", "공통 항목에 없음", "신규 · API 명세와 변경 가이드 작성",
         "주요업무와 우대사항에 문서화가 함께 등장",
         "문서가 부수 작업이 아니라 제품의 일부입니다. 문서 한 편이 준비 비용 대비 효과가 가장 큰 항목입니다.",
         "high", "#scope_expansion", "docs-habit"),
    ),
    "startup": (
        ("cloud-infra", "운영 책임", "배포해 본 경험", "배포부터 운영까지 오너십",
         '"직접 배포하고 운영까지 책임져 보신 분" 문장',
         "인프라를 맡아 줄 조직이 따로 없습니다. 만들어 넘기는 사람이 아니라 끝까지 들고 가는 사람을 찾습니다.",
         "high", "#scope_expansion", "deploy-pipeline"),
        ("transaction-integrity", "동시성", "트랜잭션 개념 이해", "동시 요청 상황의 처리 설계까지",
         '"동시성 문제를 다뤄 보신 분" 문장',
         "거래액이 크지 않아도 인기 게시물 하나에 요청이 몰립니다. 재고·중복 처리 같은 구체적 상황이 답이 됩니다.",
         "mid", "#items", "tx-integrity"),
        ("monitoring-incident", "관측", "지표를 보는 감각", "볼 지표를 직접 고르는 설계까지",
         '우대사항의 "모니터링 지표를 직접 설계" 문장',
         "도구 사용이 아니라 무엇을 볼지 정한 경험을 묻습니다. 대시보드 한 장의 선택 근거면 대화가 성립합니다.",
         "mid", "#advanced", "incident-recovery"),
    ),
    "si_enterprise": (
        ("tech-documentation", "문서화", "공통 항목에 없음", "신규 · 요구사항·설계 산출물 문서",
         '주요업무의 "설계 산출물을 문서로 정리" 문장',
         "산출물 문서가 업무의 한 축입니다. 글솜씨가 아니라 결정을 남기는 습관을 봅니다.",
         "high", "#scope_expansion", "docs-habit"),
        ("cicd-automation", "표준화", "배포 파이프라인 구성", "운영 이관을 위한 절차 표준화까지",
         '"운영 이관을 위해 배포 절차를 표준화" 문장',
         "만든 사람과 운영하는 사람이 다릅니다. 남이 이어받을 수 있게 만드는 일이 요구의 핵심입니다.",
         "mid", "#items", "deploy-pipeline"),
        ("rdb-modeling", "데이터", "RDB 설계·쿼리 기본기", "SQL 기본기의 정확성 검증까지",
         '"관계형 데이터베이스와 SQL 기본기" 문장',
         "심화보다 기본기의 확실함을 봅니다. 화려한 프로젝트보다 정확한 쿼리와 설계 근거가 유리한 기업군입니다.",
         "mid", "#items", "rdb-schema"),
    ),
    "game": (
        ("caching-performance", "동시 접속", "성능을 고려한 설계", "급증 부하의 처리 구조 설계까지",
         '"대규모 동시 접속 환경의 성능 문제를 해결" 문장',
         "점진적 성장이 아니라 이벤트 시점에 몰리는 부하입니다. 평시 성능이 아니라 급증 대응이 설계의 전제입니다.",
         "high", "#advanced", "performance"),
        ("message-queue", "비동기 처리", "공통 항목에 없음", "신규 · 메시지 큐 구현 경험 (자격요건)",
         "다른 기업군에서 우대이던 항목이 자격요건에 있음",
         "우대와 자격요건의 차이가 이 기업군의 특징을 보여줍니다. 개념 이해로는 부족하고 구현 경험이 필요합니다.",
         "high", "#combos", "event-pipeline"),
        ("transaction-integrity", "정합성", "트랜잭션 개념 이해", "재화·아이템 정합성 설계까지",
         '"데이터 정합성을 지키는 설계" 문장',
         "게임 재화는 어긋나면 되돌리기 어렵습니다. 금융과 맥락은 달라도 요구 수준은 비슷합니다.",
         "mid", "#items", "tx-integrity"),
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
    return [
        {
            "item_id": slug, "title": title, "desc": desc,
            "freq_pct": freq_pct(slug, RECENT), "required_ratio": required_pct(slug, RECENT),
        }
        for slug, title, desc in BASELINE_ITEMS
    ]


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
        "unchanged_note": "읽는 법 — 회색 번호는 백엔드 공통 기대치, 파란 번호는 문장 뒤에 숨은 신호, 노란 번호는 이 회사가 유독 원하는 것입니다.",
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


# ============================================================ 전략·로드맵
# (slug, 제목, 부제, 이유, 증명 산출물, 채널, kind, 기본 필수 여부)
CONCEPTS: tuple[tuple[str, str, str, str, str, tuple[str, ...], str, bool], ...] = (
    ("crud-api", "CRUD REST API 프로젝트", "배포까지 완성한 한 도메인",
     "기준선 · 최근 공고 전량이 API 개발을 요구합니다", "배포 URL + README + 커밋 기록",
     ("portfolio",), "project", True),
    ("rdb-schema", "RDB 설계·쿼리 기본기", "스키마·조인·인덱스",
     "기준선 · 관계형 데이터베이스 요구가 전 기업군 공통입니다", "ERD + 인덱스 설계 근거 문서",
     ("portfolio", "interview"), "project", True),
    ("error-handling", "예외·에러 응답 설계", "실패 케이스 처리와 문서화",
     "기준선 · 자격요건의 예외 처리 문장과 연결됩니다", "실패 케이스 처리 코드 + 응답 규약 문서",
     ("portfolio", "interview"), "project", True),
    ("tx-integrity", "트랜잭션·동시성 심화", "격리수준·멱등성·재처리 설명",
     "정합성을 요구하는 기업군의 최대 변별점입니다", "동시 요청 시나리오 구현 + 설계 설명 글",
     ("portfolio", "interview"), "project", True),
    ("performance", "부하 측정·성능 개선", "병목 탐색과 개선 전후 지표",
     "대용량 트래픽 문장이 반복되는 기업군의 핵심입니다", "부하 테스트 결과 + 개선 전후 지표",
     ("portfolio", "interview"), "project", True),
    ("deploy-pipeline", "배포 파이프라인 구성", "컨테이너 빌드부터 배포까지",
     "직무 외 요구 중 인프라·배포가 가장 자주 나타납니다", "Dockerfile + 배포 워크플로 + 실행 기록",
     ("portfolio",), "project", True),
    ("event-pipeline", "이벤트 처리 경험", "메시지 큐로 비동기 흐름 만들기",
     "이벤트 기반 처리를 우대·필수로 요구하는 기업군이 있습니다", "메시지 발행·소비 예제 + 재처리 설계 메모",
     ("portfolio", "interview"), "project", False),
    ("incident-recovery", "장애·복구 대응 경험", "실패를 재현하고 복구한 흔적",
     "운영까지 함께 보는 팀이 늘고 있습니다", "장애 재현·복구 실험 기록 + 회고 글",
     ("essay", "interview"), "story", True),
    ("collab-story", "협업 문제 해결 서사", "갈등·문제를 해결한 경험",
     "기준선 · 코드리뷰·협업 요구가 전 기업군 공통입니다", "문제 → 해결 → 배움 서술 준비",
     ("essay",), "story", True),
    ("test-habit", "테스트 작성 습관", "회귀를 막는 단위 테스트",
     "테스트 요구가 우대에서 자격요건으로 이동하는 중입니다", "테스트 코드 + 실패 사례 기록",
     ("portfolio", "interview"), "project", True),
    ("docs-habit", "기술 문서화 습관", "API 명세와 변경 가이드",
     "문서화 요구는 특정 기업군에서 뚜렷합니다", "API 문서 + 변경 이력 정리",
     ("portfolio",), "project", False),
    ("domain-study", "도메인 이해 정리", "지원 도메인의 용어와 흐름",
     "도메인 관심을 우대로 명시하는 공고가 있습니다", "도메인 용어 정리 노트 + 지원 이유",
     ("essay", "interview"), "study", False),
    ("cs-basics", "CS 기본기 — 네트워크·운영체제", "HTTP·프로세스와 스레드·동시성 원인",
     "면접 검증의 이론 바탕입니다", "면접 단골 주제 중심 정리 노트",
     ("interview",), "study", True),
    ("spring-internals", "Spring 동작 원리", "DI·프록시·요청 흐름",
     "프레임워크 이해 깊이는 단골 검증 지점입니다", "동작 흐름 그림 + @Transactional 원리 설명",
     ("interview",), "study", True),
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
    ("fintech_finance", ("정합성·트랜잭션", "장애 복구", "API 설계", "도메인 이해")),
    ("bigtech_platform", ("성능·캐시", "이벤트 처리", "배포·운영", "코드 품질")),
    ("b2b_saas", ("API 호환성", "테스트 전략", "문서화", "도메인 모델링")),
    ("startup", ("배포·운영 오너십", "완성 속도", "동시성", "관측 설계")),
    ("si_enterprise", ("문서·산출물", "표준 절차", "기본기 정확성", "협업 기록")),
    ("game", ("동시 접속 성능", "비동기 처리", "재화 정합성", "장애 대응")),
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
                "title": "결과물 하나를 끝까지 끌고 간 흔적",
                "body": f"{label} 기준에서도 새 프로젝트를 여러 개 벌이는 것보다 하나를 배포까지 끌고 간 기록이 강합니다. README 첫 절에 무엇을 해결했는지 선언하세요.",
                "tips": ["README 1절: 문제 정의 → 해결 → 검증", "커밋 이력에 실패와 수정이 남아 있으면 더 좋습니다"],
                "linked_item_ids": [CONCEPT_INFO["crud-api"]["concept_id"]],
            },
            {
                "title": "실패를 다룬 기록이 희소합니다",
                "body": "성공 화면 캡처보다 데이터베이스가 죽었을 때 이 API가 어떻게 응답하는가를 보여주는 문서가 신입 포트폴리오에서 드뭅니다.",
                "tips": ["의도적으로 장애를 만든 실험 1건", "재시도·타임아웃 설정의 근거 한 줄"],
                "linked_item_ids": [
                    CONCEPT_INFO["error-handling"]["concept_id"],
                    CONCEPT_INFO["incident-recovery"]["concept_id"],
                ],
            },
        ],
        "intro_orders": orders,
    }
    essay = [
        {
            "kind": "deviation",
            "title": "기술 나열이 아니라 고민한 과정으로 쓰기",
            "body": f"{label} 지원 글에서 강한 것은 도구 목록이 아니라 어긋나면 안 되는 값을 어떻게 지켰는가입니다. 과정 중심으로 쓰세요.",
            "narrative": {
                "problem": "동시 요청으로 값이 어긋나는 문제를 발견",
                "solve": "원인 분석 → 격리수준·멱등성 학습 → 적용과 검증",
                "growth": "정확성은 기능이 아니라 신뢰라는 관점",
            },
            "sample_sentence": "\"버그를 고치는 것보다 같은 버그가 다시 생길 수 없는 구조를 만드는 것이 백엔드의 일이라고 배웠습니다.\"",
            "tips": ["수치가 있으면 한 문장으로 붙이세요"],
            "linked_item_ids": [CONCEPT_INFO["tx-integrity"]["concept_id"]],
        },
        {
            "kind": "narrative_polish",
            "title": "협업 경험 — 보유 소재 다듬기",
            "body": "같은 경험이라도 강조점을 기업군에 맞춰 바꾸세요. 사실 관계는 고정하고 배움의 방점만 조정합니다.",
            "narrative": None,
            "sample_sentence": None,
            "tips": ["사실 관계는 고정, 배움의 방점만 조정", "결과 수치가 있으면 한 문장으로"],
            "linked_item_ids": [CONCEPT_INFO["collab-story"]["concept_id"]],
        },
    ]
    interview = [
        {
            "kicker": "정합성 검증",
            "question": "트랜잭션 격리 수준을 왜 그렇게 선택했나요?",
            "followups": ["그 수준에서 생길 수 있는 문제는 어떻게 막았나요?", "같은 요청이 두 번 오면 어떻게 되나요?"],
            "point": "정답 암기가 아니라 내 프로젝트에서 왜 이 선택이었는지로 답하면 꼬리질문이 두렵지 않습니다.",
            "linked_item_ids": [CONCEPT_INFO["tx-integrity"]["concept_id"]],
        },
        {
            "kicker": "실패 대응",
            "question": "배포한 서비스가 새벽에 죽으면 무엇부터 보나요?",
            "followups": ["어떤 지표를 먼저 확인하나요?", "재발을 막기 위해 무엇을 남겼나요?"],
            "point": "장애 재현·복구 기록이 있으면 이 질문 전체를 제가 해봤는데요로 시작할 수 있습니다.",
            "linked_item_ids": [CONCEPT_INFO["incident-recovery"]["concept_id"]],
        },
        {
            "kicker": "기본기 검증",
            "question": "인덱스를 어떤 기준으로 걸었나요?",
            "followups": ["그 인덱스 때문에 느려지는 작업은 없나요?"],
            "point": "기준선 항목은 깊이보다 근거를 봅니다. 조회 패턴을 보고 걸었다는 한 문장이 필요합니다.",
            "linked_item_ids": [CONCEPT_INFO["rdb-schema"]["concept_id"]],
        },
        {
            "kicker": "태도 검증 · 자소서 연동",
            "question": "자소서에 쓴 협업 문제, 상대방은 어떻게 기억할까요?",
            "followups": ["다시 그 상황이 오면 무엇을 다르게 하겠어요?"],
            "point": "자소서 소재는 반드시 면접에서 재검증됩니다. 사실 관계를 스스로 꼬리질문해 보세요.",
            "linked_item_ids": [CONCEPT_INFO["collab-story"]["concept_id"]],
        },
    ]
    return {
        "job": JOB_ROLE_ID, "scope": scope, "checklist": checklist,
        "portfolio": portfolio, "essay": essay, "interview": interview,
        "agent_version": AGENT_VERSION_STRING, "source": "stored",
    }


ROADMAP_STEPS: tuple[tuple[int, str, int, str, str, str, str, str, tuple[str, ...]], ...] = (
    (1, "STEP 01 · 3주", 3, "vhigh", "한 도메인을 배포까지 완성하기",
     "새 프로젝트를 벌이지 말고 기존 결과물 하나를 배포까지 끌고 가세요. 자원 설계와 예외 응답, 스키마 근거를 함께 정리합니다.",
     "배포 URL + ERD + 인덱스 설계 근거 문서", "기준선 항목이 채워지지 않으면 다른 준비가 평가에 닿지 않습니다.",
     ("자원 설계", "인덱스 근거", "배포")),
    (2, "STEP 02 · 2주", 2, "vhigh", "실패를 다루기 — 에러 응답과 장애 복구 실험",
     "요청 검증과 에러 응답을 정리하고 의도적으로 장애를 만들어 복구 과정을 기록하세요.",
     "실패 케이스 처리 코드 + 장애 재현·복구 기록 + 회고 글", "성공 경로만 있는 결과물은 신입 사이에서 변별력이 없습니다.",
     ("에러 응답 설계", "장애 재현", "회고")),
    (3, "STEP 03 · 2주", 2, "high", "측정하고 하나를 개선하기",
     "부하 테스트로 병목을 찾고 인덱스나 캐시 중 하나를 골라 개선 전후 지표를 남기세요.",
     "부하 테스트 결과 + 개선 전후 지표 비교 문서", "규모를 경험하지 못해도 측정과 시도는 보여줄 수 있습니다.",
     ("부하 테스트", "캐시", "지표 비교")),
    (4, "STEP 04 · 2주", 2, "mid", "기업군에 맞춰 마무리하기",
     "지원 기업군의 편차 항목을 채우고 README 와 자소서의 소개 순서를 다시 배치하세요.",
     "편차 항목 산출물 + 기업군 맞춤 소개 순서", "필수가 채워진 뒤의 마무리입니다. 순서만 바꿔도 읽히는 인상이 달라집니다.",
     ("편차 보강", "소개 순서", "문서 정리")),
)

STEP_FILLS: tuple[tuple[str, ...], ...] = (
    ("crud-api", "rdb-schema"),
    ("error-handling", "incident-recovery"),
    ("performance", "test-habit"),
    ("collab-story", "docs-habit"),
)

STUDY_TRACKS: tuple[tuple[str, str, str, str, str, str, tuple[str, ...]], ...] = (
    ("transaction-consistency", "STEP 01~02와 병행", "vhigh", "트랜잭션·DB 이론",
     "격리수준 네 단계와 각각의 문제, 락과 MVCC 의 차이, 인덱스가 쿼리를 빠르게 하는 원리를 남에게 설명할 수 있는 수준까지.",
     "프로젝트에서 적용은 하지만 면접의 꼬리질문은 이론 이해를 검증합니다.", ("tx-integrity", "cs-basics")),
    ("api-implementation", "STEP 01~03과 병행", "high", "Spring 동작 원리",
     "DI 컨테이너가 하는 일, @Transactional 의 프록시 동작, 요청 하나가 컨트롤러까지 오는 흐름을 그림으로 그릴 수 있는 수준까지.",
     "써 봤다와 무엇을 해주는지 안다를 면접이 구분합니다.", ("spring-internals",)),
    ("operability", "상시 · 주 3~4시간", "high", "CS 기본기 — 네트워크·운영체제",
     "HTTP 와 TCP 의 기본 흐름, 프로세스와 스레드, 경쟁 상태의 원인까지. 과목 전체가 아니라 면접 단골 주제 중심으로.",
     "동시성과 장애 해석의 이론 바탕입니다. 전 기간에 얇게 깔리는 것이 효율적입니다.", ("cs-basics",)),
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
        "phase": "상시 · 별도 트랙", "priority": "track", "title": "알고리즘·코딩테스트",
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


# ============================================================ 7. Wiki 본문
WIKI: dict[str, dict[str, Any]] = {
    "api-implementation": {
        "why": "최근 공고 전량이 API 개발을 요구하고 다수가 자격요건에 둡니다. 이 역량이 없으면 다른 준비가 평가에 닿지 않습니다.",
        "depth": {"foundation": "자원과 메서드를 규칙대로 고를 수 있다",
                  "application": "예외 응답과 검증까지 갖춰 배포한다",
                  "tradeoff": "하위 호환과 버전 정책을 근거와 함께 고른다"},
        "prereq": ["서버 프레임워크의 요청 흐름 이해", "HTTP 상태 코드와 헤더의 의미"],
        "misconceptions": ["동작하면 완성이라는 생각", "예외 응답을 문서 밖의 일로 두는 습관"],
        "interview": ["왜 이 자원 구조인가", "필드를 지울 때 무엇을 먼저 하나"],
        "sequence": ["한 도메인 CRUD", "예외·검증 정리", "배포", "변경과 호환"],
    },
    "data-modeling": {
        "why": "관계형 데이터베이스 요구가 전 기업군 공통이며 필수 표기 비율이 높습니다.",
        "depth": {"foundation": "정규화와 기본 조인을 쓸 수 있다",
                  "application": "조회 패턴을 보고 인덱스를 고른다",
                  "tradeoff": "쓰기 비용과 조회 비용을 견줘 설계를 고른다"},
        "prereq": ["SQL 기본 문법", "실행 계획을 읽는 법"],
        "misconceptions": ["인덱스를 많이 걸수록 빠르다는 생각", "정규화가 항상 옳다는 생각"],
        "interview": ["이 인덱스의 근거는 무엇인가", "느려지는 작업은 없나"],
        "sequence": ["스키마 설계", "실행 계획 읽기", "인덱스 실험", "비용 견주기"],
    },
    "transaction-consistency": {
        "why": "금융·게임처럼 값이 어긋나면 되돌리기 어려운 도메인이 신입에게도 설명 가능한 수준을 요구합니다.",
        "depth": {"foundation": "커밋과 롤백, 격리수준의 이름을 안다",
                  "application": "동시 요청 시나리오를 만들어 막아 본다",
                  "tradeoff": "멱등성과 재처리 설계를 근거와 함께 고른다"},
        "prereq": ["관계형 데이터베이스 기본기", "경쟁 상태의 원인"],
        "misconceptions": ["트랜잭션을 걸면 동시성 문제가 사라진다는 생각", "재시도가 항상 안전하다는 생각"],
        "interview": ["그 격리수준에서 생기는 문제는", "같은 요청이 두 번 오면"],
        "sequence": ["개념 정리", "동시 요청 재현", "락·격리수준 적용", "멱등성 설계"],
    },
    "performance-scaling": {
        "why": "트래픽이 전제로 깔린 기업군에서 자격요건으로 올라오는 항목입니다.",
        "depth": {"foundation": "지연과 처리량의 차이를 안다",
                  "application": "부하를 측정하고 병목을 찾는다",
                  "tradeoff": "캐시 일관성과 비동기 복잡도를 견준다"},
        "prereq": ["측정 도구 사용", "데이터베이스 조회 비용 이해"],
        "misconceptions": ["캐시를 붙이면 빨라진다는 생각", "평균 응답만 보는 습관"],
        "interview": ["무엇이 병목이었나", "캐시가 틀린 값을 주면"],
        "sequence": ["측정", "병목 특정", "개선", "전후 비교"],
    },
    "operability": {
        "why": "직무 외 요구 가운데 인프라·배포와 운영·모니터링이 가장 자주 나타납니다.",
        "depth": {"foundation": "컨테이너로 빌드해 올려 본다",
                  "application": "파이프라인과 지표를 갖춘다",
                  "tradeoff": "장애 복구 절차를 설계하고 재발을 막는다"},
        "prereq": ["리눅스 기본 명령", "빌드와 실행의 분리 이해"],
        "misconceptions": ["배포는 인프라 팀의 일이라는 생각", "로그를 남기면 관측이 된다는 생각"],
        "interview": ["새벽에 죽으면 무엇부터 보나", "재발을 막기 위해 무엇을 남겼나"],
        "sequence": ["컨테이너 빌드", "배포 자동화", "지표 정의", "장애 실험"],
    },
    "collaboration-quality": {
        "why": "코드리뷰와 문서 요구가 기업군과 무관하게 반복되며, 테스트는 우대에서 자격요건으로 이동 중입니다.",
        "depth": {"foundation": "변경 단위를 나눠 리뷰를 받는다",
                  "application": "테스트로 회귀를 막고 결정을 문서로 남긴다",
                  "tradeoff": "테스트 범위와 유지 비용을 견준다"},
        "prereq": ["버전 관리 기본", "테스트 도구 사용"],
        "misconceptions": ["커버리지가 품질이라는 생각", "문서는 나중 일이라는 생각"],
        "interview": ["무엇을 테스트하지 않았나", "이 결정을 어디에 남겼나"],
        "sequence": ["작은 PR", "테스트 도입", "결정 기록", "범위 조정"],
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

    # --- 1 dataset_versions (A1 만 만든다)
    t["dataset_versions"] = [{
        "dataset_version": DATASET_VERSION, "job_role_id": None,
        "as_of_date": "2026-07-27",
        "note": "아홉 직무 공용 생성 데모 데이터셋. A1(backend) 이 한 행만 만든다.",
        "sealed_at": NOW,
    }]

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
            "posted_at": p["posted_at"], "closed_at": closed_at(p),
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
        nid = f"nd_demo_{JOB_ROLE_ID}_{len(nodes) + 1:04d}"
        node_ids[key] = nid
        nodes.append({
            "node_id": nid, "graph_layer": layer, "node_type": node_type,
            "ref_table": ref_table, "ref_id": ref_id, "label": label,
            "ontology_version": ONTOLOGY_VERSION, "dataset_version": DATASET_VERSION,
            "taxonomy_version_id": TAXONOMY_VERSION_ID if layer == "semantic" else None,
            "analysis_version": ANALYSIS_VERSION,
        })
        return nid

    role_node = node("semantic", "JobRole", "job_roles", JOB_ROLE_ID, "백엔드 개발자")
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

    # --- 33 분석 산출물 52행
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
    for p in POSTINGS:
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
            f"{DIM_INFO[slug]['label']} 은 최근 1년 백엔드 공고의 {freq_pct(slug, RECENT)}% 에 나타난다.",
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

    for slug, title, desc in BASELINE_ITEMS[:3]:
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

    for slug in ("crud-api", "tx-integrity"):
        info = CONCEPT_INFO[slug]
        claim_id = add_claim(
            strat_outputs["overall"], "strategy", None, "overall", JOB_ROLE_ID,
            f"{info['title']} 은 백엔드 지원 준비에서 우선순위가 높다.",
            {"concept_id": info["concept_id"], "channels": list(info["channels"])},
            "0.75000", components(5, 5, 1.0),
        )
        claim_evidence.append({
            "claim_id": claim_id, "support_type": "graph_path",
            "support_id": paths[0]["path_id"], "relation": "supports", "weight": "0.50000",
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
            "rest-api-design" if scope_level == "overall"
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

    # --- 42 검증 결과 (검사 1~4 pass, 5~7 은 판정자가 없어 not_applicable)
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

    # `role_node` 는 그래프의 시작점으로 남긴다. 사용하지 않는 이름 경고를 막는다.
    assert role_node in node_ids.values()
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

# 마이그레이션이 넣는 기준 데이터. 조각 밖의 외래키는 이 목록 안에 있어야 한다.
BASE_JOB_ROLES = frozenset({JOB_ROLE_ID})
BASE_PERIODS = frozenset(PERIODS)
BASE_CLUSTERS = frozenset(CLUSTERS)
BASE_COMPANIES = frozenset(p["company_id"] for p in POSTINGS)
BASE_METRIC_POLICIES = frozenset(METRIC_POLICY.values())


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
        return sum(
            1 for d in dims.values() if any(s in d for s in BOUNDARY_SLUGS)
        ), total
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
        "dataset_version": ids("dataset_versions", "dataset_version"),
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
    # (테이블, 컬럼, 참조 대상 키). NULL 은 통과한다.
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
    # 산출물 범위 식별자도 기준 데이터 안에 있어야 한다.
    for row in tables["analysis_outputs"]:
        scope_level, scope_id = row["scope_level"], row["scope_id"]
        pool = (
            BASE_JOB_ROLES if scope_level == "overall"
            else BASE_CLUSTERS if scope_level == "cluster"
            else known["posting_id"]
        )
        if scope_id not in pool:
            problems.append(f"analysis_outputs.scope_id: {scope_id} 없음")
    # 근거 참조도 조각 안을 가리켜야 한다.
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
    counts = Counter(
        (row["output_type"], row["scope_level"]) for row in tables["analysis_outputs"]
    )
    expected_counts = {
        ("statistics", "overall"): 1,
        ("interpretation", "overall"): 1,
        ("interpretation", "cluster"): len(CLUSTER_ORDER),
        ("interpretation", "posting"): len(POSTINGS),
        ("strategy", "overall"): 1,
        ("strategy", "cluster"): len(CLUSTER_ORDER),
        ("roadmap", "overall"): 1,
        ("roadmap", "cluster"): len(CLUSTER_ORDER),
    }
    for key, expected in expected_counts.items():
        if counts.get(key, 0) != expected:
            problems.append(f"analysis_outputs {key}: {counts.get(key, 0)}행 (기대 {expected})")
    if len(tables["analysis_outputs"]) != 52:
        problems.append(f"analysis_outputs 합계 {len(tables['analysis_outputs'])}행 (기대 52)")

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
            if len(payload["cluster_axes"]["axes"]) != 5:
                problems.append(f"{row['output_id']}: cluster_axes.axes 가 5개가 아니다")
            recent_labels = {CLUSTERS[c] for c in RECENT_CLUSTERS}
            rows_labels = {r["cluster"] for r in payload["cluster_axes"]["rows"]}
            if rows_labels != recent_labels:
                problems.append(f"{row['output_id']}: cluster_axes.rows 가 최근 기업군과 다르다")
        if row["output_type"] == "interpretation":
            for key in ("level", "cluster_tag", "posting_id"):
                if key not in payload["scope"]:
                    problems.append(f"{row['output_id']}: scope.{key} 없음")
            if not 7 <= len(payload["baseline"]) <= 9:
                problems.append(f"{row['output_id']}: baseline 개수 {len(payload['baseline'])}")
            if row["scope_level"] != "overall":
                if not 2 <= len(payload["deviations"]) <= 4:
                    problems.append(f"{row['output_id']}: deviations 개수 {len(payload['deviations'])}")
                if not 3 <= len(payload["unchanged"]) <= 4:
                    problems.append(f"{row['output_id']}: unchanged 개수 {len(payload['unchanged'])}")
    for row in tables["analysis_claims"]:
        keys = ("evidence_count", "independent_companies", "source_tier_score",
                "sample_status_score", "entailment_score", "contradiction_penalty",
                "coverage_score")
        missing = [k for k in keys if k not in row["confidence_components"]]
        if missing:
            problems.append(f"{row['claim_id']}: confidence_components {missing} 없음")
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
    """검사 6 — 공고 수·기간·기업군·진입 구분과 차원 표본이 계약에 맞는가."""
    problems: list[str] = []
    expected_clusters = set(CLUSTERS)
    period_spec = {
        RECENT: (18, "2026-01-01", "2026-06-30", {"entry_junior": 10, "experienced": 8}),
        PRIOR: (12, "2024-03-01", "2025-11-30", {"entry_junior": 6, "experienced": 6}),
    }
    if len(POSTINGS) != 30 or len(tables["postings"]) != 30:
        problems.append(f"공고 수 {len(POSTINGS)}/{len(tables['postings'])} != 30/30")
    expected_ids = {posting_id(f"{n:02d}") for n in range(1, 31)}
    actual_ids = {row["posting_id"] for row in tables["postings"]}
    if actual_ids != expected_ids:
        problems.append(f"공고 식별자 차이 {sorted(actual_ids ^ expected_ids)}")

    for period, (expected_n, starts_on, ends_on, labels) in period_spec.items():
        group = [p for p in POSTINGS if p["period"] == period]
        if len(group) != expected_n:
            problems.append(f"{period}: 공고 {len(group)}건 != {expected_n}건")
        clusters = {p["cluster"] for p in group}
        if clusters != expected_clusters:
            problems.append(f"{period}: 기업군 차이 {sorted(clusters ^ expected_clusters)}")
        actual_labels = {
            label: sum(1 for p in group if p["entry_label"] == label)
            for label in labels
        }
        if actual_labels != labels:
            problems.append(f"{period}: entry_label {actual_labels} != {labels}")
        for posting in group:
            posted_on = posting["posted_at"][:10]
            if not starts_on <= posted_on <= ends_on:
                problems.append(f"{posting['nn']}: 게시일 {posting['posted_at']} 범위 밖")

    recent_cluster_counts = Counter(p["cluster"] for p in RECENT_POSTINGS)
    if set(recent_cluster_counts.values()) != {3} or set(recent_cluster_counts) != expected_clusters:
        problems.append(f"recent 기업군 분포 {dict(recent_cluster_counts)} != 기업군별 3건")
    prior_cluster_counts = Counter(p["cluster"] for p in PRIOR_POSTINGS)
    if set(prior_cluster_counts.values()) != {2} or set(prior_cluster_counts) != expected_clusters:
        problems.append(f"prev 기업군 분포 {dict(prior_cluster_counts)} != 기업군별 2건")

    versions = tables["posting_versions"]
    ongoing = [row for row in versions if row["closed_at"] is None]
    closed = [row for row in versions if row["closed_at"] is not None]
    if len(ongoing) != 6 or len(closed) != 24:
        problems.append(f"공고 상태 진행 {len(ongoing)}건/마감 {len(closed)}건 != 6/24")
    prior_ids = {posting_version_id(p["nn"]) for p in PRIOR_POSTINGS}
    if any(row["posting_version_id"] in prior_ids for row in ongoing):
        problems.append("prev 공고에 진행 중 상태가 있다")
    for row in closed:
        if row["closed_at"] <= row["posted_at"]:
            problems.append(f"{row['posting_version_id']}: 마감일이 게시일 이후가 아니다")

    for slug in DIM_SLUGS:
        companies = {
            p["company_id"] for p in POSTINGS if slug in DIMS_BY_POSTING[p["nn"]]
        }
        if len(companies) < 2:
            problems.append(f"{slug}: 독립 회사 {len(companies)}곳")
    return problems


def check_output_population(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """검사 7 — 모듈 산출물 52행과 전체 공고 해석 30행이 짝을 이루는가."""
    outputs = tables["analysis_outputs"]
    problems: list[str] = []
    counts = Counter(row["output_type"] for row in outputs)
    expected = {"statistics": 1, "interpretation": 37, "strategy": 7, "roadmap": 7}
    if len(outputs) != 52 or dict(counts) != expected:
        problems.append(f"산출물 {len(outputs)}행, 종류별 {dict(counts)} != 52행, {expected}")
    posting_interpretations = {
        row["scope_id"] for row in outputs
        if row["output_type"] == "interpretation" and row["scope_level"] == "posting"
    }
    posting_ids = {posting_id(p["nn"]) for p in POSTINGS}
    if posting_interpretations != posting_ids:
        problems.append(f"공고 해석 범위 차이 {sorted(posting_interpretations ^ posting_ids)}")
    return problems


def check_direct_contract_values(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """검사 8 — 출처·기간·진입 대상군·데이터셋 값을 행마다 확인한다."""
    problems: list[str] = []
    allowed_use_values = {
        "statistics", "interpretation_context", "strategy", "roadmap",
        "wiki_definition", "wiki_why_required", "wiki_depth_criteria", "wiki_prerequisites",
        "wiki_common_misconceptions", "wiki_interview_verification", "wiki_learning_sequence",
    }
    for row in tables["source_assessments"]:
        uses = set(row["allowed_uses"])
        if not uses <= allowed_use_values:
            problems.append(
                f"{row['assessment_id']}: 허용되지 않은 allowed_uses {sorted(uses - allowed_use_values)}"
            )
        if uses != set(ALLOWED_USES):
            problems.append(f"{row['assessment_id']}: 데모 공고 기본 allowed_uses 아님")
        if (row["source_tier"], str(row["reliability_score"]), row["assessment_version"]) != (
            "A", "0.95000", "sa_v1"
        ):
            problems.append(f"{row['assessment_id']}: 출처 평가 기본값 불일치")

    for row in tables["statistics_facts"]:
        if row["period_id"] not in {RECENT, PRIOR}:
            problems.append(f"{row['fact_id']}: 허용되지 않은 기간 {row['period_id']}")
        if row["metric_family"] == "entry_label_advanced_signal_rate":
            if row["entry_segment"] != SEGMENT_ENTRY:
                problems.append(f"{row['fact_id']}: entry_segment {row['entry_segment']}")
    if len(tables.get("dataset_versions", [])) != 1:
        problems.append(f"backend 모듈 dataset_versions {len(tables.get('dataset_versions', []))}행 != 1")
    elif tables["dataset_versions"][0]["dataset_version"] != DATASET_VERSION:
        problems.append("backend 모듈 dataset_versions 식별자 불일치")
    return problems


CHECKS = (
    ("1 근거 위치", check_spans),
    ("2 지표 재계산", check_numbers),
    ("3 외래키", check_foreign_keys),
    ("4 payload 키", check_payload_keys),
    ("5 체크 개념", check_concepts),
    ("6 공고 모집단", check_posting_population),
    ("7 산출물 모집단", check_output_population),
    ("8 직접 계약값", check_direct_contract_values),
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
