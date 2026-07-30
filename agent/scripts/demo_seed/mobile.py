"""모바일 개발자 직무의 생성 데모 시드 (갈래 A7).

``agent/data/demo_seed/CONTRACT.md`` 가 이 파일의 기준이다. 데이터베이스에 접속하지
않고 메모리에서 계산해 ``parts/mobile/<table>.csv`` 로만 낸다. 모델 호출은 0회다.

`dataset_versions` 는 A1(backend) 만 만든다. 이 모듈은 그 표를 채우지 않는다.

CONTRACT 10.5 의 `allowed_uses` 예시값(`baseline`·`evidence`)은 `0001_initial_schema.sql`
의 `allowed_uses_known` CHECK 가 허용하지 않는다. A1 과 같은 값으로 담는다.

최근 1년 공고가 없는 기업군은 최근 지표 행과 히트맵 행을 만들지 않는다.

실행: ``cd agent && python -m scripts.demo_seed.mobile``
"""

from __future__ import annotations

import json
import math
from collections import Counter
from typing import Any

from ._csv import demo_seed_root, sha256_hex, write_part

# ============================================================ 식별자
JOB_ROLE_ID = "mobile"
JOB_LABEL = "모바일 개발자"
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
    ("stats", "통계 분석", "obj_mobile_statistics", "slots_filled"),
    ("knowledge", "지식 구축", "obj_mobile_knowledge", "slots_filled"),
    ("interpretation", "채용공고 해석", "obj_mobile_interpretation", "slots_filled"),
    ("strategy", "합격 전략", "obj_mobile_strategy", "slots_filled"),
    ("roadmap", "준비 로드맵", "obj_mobile_roadmap", "slots_filled"),
    ("aggregation", "지표 집계", "obj_mobile_aggregation", "no_new_evidence"),
)


def run_id(agent: str) -> str:
    return f"run_demo_{JOB_ROLE_ID}_{agent}"


# ============================================================ 1. 요구 차원 5종
# (slug, dimension_kind, 표시 라벨, 정의, 별칭, 역할 경계 여부)
DIMENSIONS: tuple[tuple[str, str, str, str, tuple[str, ...], bool], ...] = (
    (
        "kotlin-android",
        "technology",
        "Kotlin·안드로이드",
        "Kotlin으로 안드로이드 앱의 화면과 동작을 구현하는 요구. Jetpack과 Compose를 포함한다.",
        ("Kotlin", "안드로이드", "Android", "Jetpack Compose"),
        False,
    ),
    (
        "swift-ios",
        "technology",
        "Swift·iOS",
        "Swift로 iOS 앱의 화면과 동작을 구현하는 요구. UIKit과 SwiftUI를 포함한다.",
        ("Swift", "iOS", "SwiftUI", "UIKit"),
        False,
    ),
    (
        "app-architecture",
        "practice",
        "앱 아키텍처·상태 관리",
        "화면과 로직을 분리하고 화면 상태를 예측 가능하게 다루는 요구. MVVM 과 모듈화를 포함한다.",
        ("MVVM", "클린 아키텍처", "상태 관리", "모듈화"),
        False,
    ),
    (
        "network-api",
        "technology",
        "네트워크·API 연동",
        "서버 API를 호출하고 비동기 흐름과 실패 응답을 다루는 요구.",
        ("Retrofit", "URLSession", "REST API 연동", "비동기 처리"),
        False,
    ),
    (
        "store-release",
        "tooling",
        "스토어 배포·릴리스 운영",
        "앱을 스토어에 올리고 심사·버전·단계 배포를 관리하는 요구.",
        ("스토어 배포", "앱 심사", "버전 관리", "단계 배포"),
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


# 관련 관계. relation_type 은 dst 가 src 에 대해 갖는 위치다.
DIMENSION_RELATIONS: tuple[tuple[str, str, str], ...] = (
    ("kotlin-android", "app-architecture", "related"),
    ("swift-ios", "app-architecture", "related"),
    ("app-architecture", "network-api", "related"),
    ("kotlin-android", "store-release", "related"),
    ("swift-ios", "store-release", "related"),
)

# ============================================================ 2. 역량 3종
CAPABILITIES: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    (
        "app-build",
        "앱 화면 구현",
        "한 플랫폼에서 화면·입력·네비게이션을 갖춘 앱을 스스로 완성하는 능력.",
        ("kotlin-android", "swift-ios"),
    ),
    (
        "app-structure",
        "앱 구조 설계와 서버 연동",
        "화면과 로직을 분리하고 서버 연동의 성공·실패 흐름을 설계하는 능력.",
        ("app-architecture", "network-api"),
    ),
    (
        "release-ops",
        "릴리스·운영",
        "앱을 스토어에 올리고 버전·호환·이슈를 관리하는 능력.",
        ("store-release",),
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
    ("app-build", "app-structure"),
    ("app-build", "release-ops"),
)


# ============================================================ 3. 채용공고 30건
# 한 줄은 (본문, 차원 slug 또는 None, depth_level, 주석) 이다.
# 각 공고의 주석에서 해석 payload의 세 종류 번호가 나온다.
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
        "company_id": "co_kakao",
        "company": "카카오",
        "cluster": "bigtech_platform",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입~3년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-03-11T10:00:00+09:00",
        "title": "안드로이드 앱 개발자 신입·주니어",
        "sections": (
            ("주요업무", (
                ("서비스 안드로이드 앱의 신규 기능을 개발하고 운영합니다.", None, "application",
                 ("note", "만드는 일과 운영하는 일이 붙어 있습니다",
                  "개발과 운영이 분리되지 않은 팀입니다. 출시한 뒤에 무엇을 보는지까지 말할 수 있으면 대화가 이어집니다.")),
                ("기존 View 화면을 Jetpack Compose로 점진적으로 전환합니다.", "app-architecture", "application",
                 ("note", "전환 — 새로 짜는 일이 아닙니다",
                  "이미 돌아가는 화면을 깨지 않고 바꾸는 일입니다. 화면과 로직이 분리되어 있어야 가능한 작업이라 자격요건의 구조 요구가 여기서 설명됩니다.")),
                ("백엔드 팀과 API 규격을 함께 정하고 연동합니다.", "network-api", "application",
                 ("note", "규격을 받는 것이 아니라 정합니다",
                  "직무 외 요구로 분류되는 서버 스펙 협의가 업무에 명시되어 있습니다. 응답 구조를 놓고 의견을 낸 경험이 있으면 그대로 이야깃거리가 됩니다.")),
            )),
            ("자격요건", (
                ("Kotlin으로 안드로이드 앱을 개발한 경험이 있으신 분", "kotlin-android", "application",
                 ("base", "Kotlin·안드로이드 구현",
                  "경험이 있으신 분의 실질은 완성해 본 사람입니다. 화면 여러 개가 이어지는 앱 하나면 이 문장은 충분히 증명됩니다.")),
                ("MVVM 등으로 화면과 상태를 분리해 본 경험이 있으신 분", "app-architecture", "application",
                 ("base", "앱 아키텍처·상태 관리",
                  "패턴 이름보다 화면이 다시 그려지는 이유를 설명할 수 있는지를 봅니다. 상태를 한 곳에서 다룬 코드면 충족됩니다.")),
                ("Retrofit 등으로 REST API를 연동하고 비동기 처리를 다뤄 본 경험이 있으신 분", "network-api", "application",
                 ("base", "네트워크·API 연동",
                  "붙여 봤다가 아니라 로딩과 실패를 화면에 어떻게 보여줬는지가 답이 됩니다.")),
                ("앱을 스토어에 배포하고 버전을 관리해 본 경험이 있으신 분", "store-release", "application",
                 ("mark", "배포 — 우대가 아니라 자격요건에 있습니다",
                  "이전 1년 공고에서는 우대 자리에 있던 문장이 필수로 올라왔습니다. 심사와 버전 관리까지 겪어 본 사람을 기대한다고 읽힙니다.",
                  "high", "같은 직군 80%")),
            )),
            ("우대사항", (
                ("월간 사용자 수백만 규모의 앱을 운영해 본 경험", "kotlin-android", "tradeoff",
                 ("mark", "규모 — 신입 라벨과 함께 붙은 심화 요구",
                  "신입 지원이 가능하다고 적어 두고 우대에 수백만을 넣었습니다. 실무 규모의 증명이 아니라 사용자가 늘면 어디가 먼저 느려지는지 아는가를 묻는 신호로 읽는 것이 합리적입니다.",
                  "high", "같은 직군 60%")),
                ("앱 렌더링 성능이나 메모리 사용량을 측정하고 개선해 본 경험", None, "application",
                 ("note", "성능 — 측정한 흔적을 봅니다",
                  "빨라졌다는 말보다 무엇을 어떻게 쟀는지가 필요합니다. 개선 전후 수치 한 장이면 충분합니다.")),
                ("CI로 앱 빌드와 배포를 자동화해 본 경험", "store-release", "application",
                 ("note", "자동화 — 반복을 줄인 기록",
                  "손으로 올리던 빌드를 스크립트 하나로 바꾼 기록이면 됩니다. 배포 요구와 한 묶음으로 읽힙니다.")),
            )),
        ),
        "summary": "화면을 만드는 사람보다 이미 돌아가는 앱을 깨지 않고 바꾸는 사람을 찾습니다. 기준선 항목은 대체로 공통 기대치 그대로이고, 배포 경험과 사용자 규모 감각이 이 공고의 실질 변별점입니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 3건",
    },
    {
        "nn": "02",
        "company_id": "co_viva",
        "company": "비바리퍼블리카",
        "cluster": "fintech_finance",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 환영",
        "career_label_raw": "신입~3년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-01-20T10:00:00+09:00",
        "title": "iOS 개발자 (금융 서비스) 신입·주니어",
        "sections": (
            ("주요업무", (
                ("금융 서비스 iOS 앱의 결제·인증 화면을 개발하고 운영합니다.", None, "application",
                 ("note", "도메인 신호 — 돈이 오가는 화면",
                  "결제 화면은 한 번 어긋나면 사용자가 돈을 잃습니다. 우대의 재시도 설계 요구가 왜 붙었는지가 이 문장에서 설명됩니다.")),
                ("SwiftUI로 신규 화면을 구현하고 화면 상태 구조를 설계합니다.", "app-architecture", "application",
                 ("note", "상태를 설계한다고 적었습니다",
                  "화면을 그리는 일이 아니라 금액과 진행 단계를 어디에 둘지 정하는 일입니다. 단일 출처로 상태를 관리해 본 경험이 그대로 답이 됩니다.")),
                ("결제 승인 API를 연동하고 실패 흐름을 설계합니다.", "network-api", "application",
                 ("note", "성공보다 실패를 먼저 적었습니다",
                  "승인 실패, 시간 초과, 중복 요청이 일상인 도메인입니다. 실패 화면을 만들어 본 사람이 유리합니다.")),
            )),
            ("자격요건", (
                ("Swift로 iOS 앱을 개발한 경험이 있으신 분", "swift-ios", "application",
                 ("base", "Swift·iOS 구현",
                  "언어를 콕 집었지만 실질은 완성한 앱 하나입니다. 화면 여러 개가 이어지는 결과물이면 충족됩니다.")),
                ("화면과 비즈니스 로직을 분리하는 구조를 적용해 본 경험이 있으신 분", "app-architecture", "application",
                 ("base", "앱 아키텍처·상태 관리",
                  "분리해 본 경험을 묻습니다. 왜 나눴는지 한 문장으로 말할 수 있으면 기대치를 채웁니다.")),
                ("URLSession 또는 async/await로 서버 통신을 구현해 본 경험이 있으신 분", "network-api", "application",
                 ("base", "네트워크·API 연동",
                  "도구를 둘로 열어 둔 것은 비동기 흐름의 이해를 본다는 뜻입니다. 어느 쪽이든 로딩과 실패를 다뤄 본 코드면 됩니다.")),
            )),
            ("우대사항", (
                ("결제 승인 지연과 재시도를 직접 설계해 본 경험", "network-api", "tradeoff",
                 ("mark", "재시도 — 라벨은 우대, 실질은 필수에 가까움",
                  "주요업무의 실패 흐름 설계와 함께 읽으면 다릅니다. 같은 요청이 두 번 나가도 돈이 두 번 빠지지 않게 하는 고민을 기대한다고 읽힙니다.",
                  "high", "같은 직군 80%")),
                ("민감 정보 저장과 인증 흐름을 다뤄 본 경험", None, "application",
                 ("note", "보안 — 도메인이 요구하는 기본기",
                  "암호화 구현 실무보다 무엇을 저장하면 안 되는지 아는가를 봅니다. 토큰을 어디에 뒀는지 말할 수 있으면 됩니다.")),
                ("앱을 스토어에 배포하고 심사 반려에 대응해 본 경험", "store-release", "application",
                 ("mark", "심사 반려 — 겪어 본 사람만 아는 항목",
                  "출시까지 가 본 사람만 답할 수 있는 문장입니다. 금융 앱은 심사 기준이 더 까다로워 이 경험의 가치가 큽니다.",
                  "mid", "같은 직군 80%")),
            )),
        ),
        "summary": "화면을 예쁘게 만드는 사람보다 금액이 어긋나지 않게 지키는 사람을 찾습니다. 기준선 세 항목은 공통 기대치 그대로이고, 실패·재시도 설계가 이 공고의 실질 변별점입니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 3건",
    },
    {
        "nn": "03",
        "company_id": "co_daangn",
        "company": "주식회사 당근마켓",
        "cluster": "startup",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 가능",
        "career_label_raw": "경력 무관",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-02-10T10:00:00+09:00",
        "title": "안드로이드 개발자 신입·주니어",
        "sections": (
            ("주요업무", (
                ("중고거래 앱의 새 기능을 기획 단계부터 함께 만들고 배포합니다.", None, "application",
                 ("note", "기획부터 함께합니다",
                  "받은 화면을 그리는 자리가 아닙니다. 무엇을 만들지 정하는 대화에 참여한 경험이 있으면 강합니다.")),
                ("서버 API를 연동해 목록·상세 화면을 구현합니다.", "network-api", "application",
                 ("note", "가장 흔한 화면이 가장 자주 나옵니다",
                  "목록과 상세는 모든 앱의 뼈대입니다. 페이지네이션과 새로고침을 어떻게 다뤘는지가 실제 질문이 됩니다.")),
            )),
            ("자격요건", (
                ("Kotlin으로 안드로이드 앱을 만들어 본 경험이 있으신 분", "kotlin-android", "application",
                 ("base", "Kotlin·안드로이드 구현",
                  "만들어 본 경험이라고 낮춰 적었지만 실질은 같습니다. 완성한 앱 하나가 이 문장을 채웁니다.")),
                ("REST API를 연동해 화면에 데이터를 그려 본 경험이 있으신 분", "network-api", "application",
                 ("base", "네트워크·API 연동",
                  "데이터를 그려 본 경험까지 적었습니다. 빈 목록과 오류 화면을 어떻게 처리했는지가 함께 준비되어야 합니다.")),
                ("작은 기능이라도 혼자 끝까지 완성해 본 경험이 있으신 분", None, "application",
                 ("mark", "오너십 — 이 기업군의 실질 변별점",
                  "기술 스택이 아니라 끝까지 갔는가를 자격요건에 두었습니다. 규모가 작아도 완성해 사용자에게 내보낸 기록이 가장 강한 증거입니다.",
                  "high", "같은 직군 60%")),
            )),
            ("우대사항", (
                ("화면과 로직을 분리하는 구조를 고민해 본 경험", "app-architecture", "foundation",
                 ("base", "앱 아키텍처·상태 관리",
                  "라벨은 우대지만 통계상 자격요건으로 올라오는 흐름이 뚜렷한 항목입니다. 준비 목록에 넣는 편이 안전합니다.")),
                ("본인이 만든 앱을 스토어에 출시해 본 경험", None, "foundation",
                 ("note", "출시 — 완성의 증거로 읽힙니다",
                  "다운로드 수가 아니라 끝까지 갔다는 사실이 평가 대상입니다. 링크 한 줄이면 됩니다.")),
                ("사용자 피드백을 받아 앱을 고쳐 본 경험", None, "foundation",
                 ("note", "피드백 — 고친 근거를 봅니다",
                  "리뷰를 읽고 무엇을 바꿨는지 한 문장으로 말할 수 있으면 이 문장은 채워집니다.")),
            )),
        ),
        "summary": "잘 아는 사람보다 끝까지 만들어 내보내는 사람을 찾습니다. 기준선 항목의 요구 수준은 공통 기대치와 같고, 완성과 출시의 오너십이 이 공고의 실질 변별점입니다.",
        "summary_ratio": "편차 1건 · 기준선 일치 3건",
    },
    {
        "nn": "04",
        "company_id": "co_ncsoft",
        "company": "엔씨소프트",
        "cluster": "game",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력 3년 이상",
        "career_label_raw": "3년 이상",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-04-15T10:00:00+09:00",
        "title": "모바일 클라이언트 개발자 (경력)",
        "sections": (
            ("주요업무", (
                ("모바일 게임 런처와 커뮤니티 앱의 클라이언트를 개발합니다.", None, "application",
                 ("note", "게임 옆의 앱입니다",
                  "게임 엔진이 아니라 일반 앱 개발입니다. 다만 게임 클라이언트와 붙는 지점이 있어 성능 기준이 높습니다.")),
                ("안드로이드와 iOS 두 플랫폼의 빌드와 스토어 배포를 관리합니다.", "store-release", "application",
                 ("note", "배포가 담당업무에 있습니다",
                  "두 스토어의 심사 주기와 버전 정책을 함께 관리하는 자리입니다. 배포 자동화 경험이 바로 쓰입니다.")),
            )),
            ("자격요건", (
                ("Kotlin으로 안드로이드 앱을 개발한 경험이 3년 이상이신 분", "kotlin-android", "application",
                 ("base", "Kotlin·안드로이드 구현",
                  "경력 공고라 연차가 붙었습니다. 신입 기준선과 항목은 같고 기대 깊이만 다릅니다.")),
                ("여러 기종에서 프레임 드랍 없이 동작하도록 최적화해 본 경험이 있으신 분", "kotlin-android", "tradeoff",
                 ("mark", "성능 — 이 기업군이 유독 앞세우는 요구",
                  "기종마다 다르게 동작하는 문제를 다뤄 본 사람을 찾습니다. 측정 도구로 병목을 찾고 무엇을 바꿨는지 설명할 수 있어야 합니다.",
                  "high", "같은 직군 60%")),
            )),
            ("우대사항", (
                ("Swift로 iOS 앱을 함께 개발해 본 경험", "swift-ios", "application",
                 ("mark", "두 플랫폼 — 우대지만 업무에 이미 적혀 있습니다",
                  "담당업무가 두 스토어 배포를 포함하므로 우대 라벨보다 비중이 큽니다. 한쪽이 깊고 다른 쪽은 읽고 고칠 수 있는 정도면 충분합니다.",
                  "mid", "같은 직군 60%")),
                ("게임 클라이언트와 앱을 연동해 본 경험", None, "application",
                 ("note", "도메인 접점 — 관심의 증거",
                  "게임 개발 경력이 아니라 이 도메인을 이해하려는 태도를 봅니다.")),
            )),
        ),
        "summary": "앱을 만들 줄 아는 사람보다 여러 기종에서 똑같이 동작하게 만드는 사람을 찾습니다. 성능 최적화와 두 플랫폼 대응이 이 공고의 실질 변별점입니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 1건",
    },
    {
        "nn": "05",
        "company_id": "co_sendbird",
        "company": "센드버드",
        "cluster": "b2b_saas",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "2년 이상",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-05-08T10:00:00+09:00",
        "title": "모바일 SDK 개발자 (iOS)",
        "sections": (
            ("주요업무", (
                ("기업 고객이 앱에 붙이는 채팅 SDK의 iOS 버전을 개발합니다.", None, "application",
                 ("note", "사용자가 개발자입니다",
                  "화면이 아니라 다른 개발자가 호출하는 코드를 만듭니다. 이름과 인터페이스를 정하는 감각이 평가 대상이 됩니다.")),
                ("공개 인터페이스를 설계하고 문서와 예제를 함께 관리합니다.", "app-architecture", "application",
                 ("note", "문서가 제품의 일부입니다",
                  "직무 외 요구로 보이는 문서 작업이 담당업무에 있습니다. README를 공들여 쓴 경험이 그대로 근거가 됩니다.")),
            )),
            ("자격요건", (
                ("Swift로 iOS 앱 또는 라이브러리를 개발한 경험이 있으신 분", "swift-ios", "application",
                 ("base", "Swift·iOS 구현",
                  "앱과 라이브러리를 나란히 적었습니다. 앱 경험만 있어도 지원 가능하다는 뜻으로 읽힙니다.")),
                ("네트워크 통신과 재연결 처리를 구현해 본 경험이 있으신 분", "network-api", "application",
                 ("base", "네트워크·API 연동",
                  "재연결을 콕 집었습니다. 끊겼을 때 어떻게 복구했는지가 이 문장의 실질입니다.")),
                ("SDK 배포와 버전 호환성을 관리해 본 경험이 있으신 분", "store-release", "application",
                 ("mark", "버전 호환 — 이 기업군만의 요구",
                  "고객사 앱이 이미 옛 버전을 쓰고 있어 마음대로 바꿀 수 없습니다. 무엇을 바꾸면 남의 앱이 깨지는지 아는 감각을 봅니다.",
                  "high", "같은 직군 80%")),
                ("공개 API를 설계하고 문서로 남겨 본 경험이 있으신 분", "app-architecture", "application",
                 ("mark", "인터페이스 설계 — 구조 요구가 한 단계 위입니다",
                  "화면과 로직 분리를 넘어 남이 쓰는 경계를 정하는 일입니다. 작은 라이브러리 하나를 공개해 본 경험이면 충분히 설명됩니다.",
                  "high", "같은 직군 80%")),
            )),
            ("우대사항", (
                ("여러 앱에 배포되는 SDK의 하위 호환을 유지해 본 경험", "store-release", "tradeoff",
                 ("mark", "하위 호환 — 라벨은 우대, 실질은 이 팀의 일상",
                  "자격요건의 버전 호환과 같은 축입니다. 바꾸지 못하는 제약 안에서 기능을 더해 본 경험을 기대한다고 읽힙니다.",
                  "mid", "같은 직군 80%")),
                ("실시간 통신 프로토콜을 다뤄 본 경험", None, "application",
                 ("note", "실시간 — 개념 이해면 시작할 수 있습니다",
                  "프로토콜 구현 경험보다 연결이 끊기는 상황을 상상할 수 있는지를 봅니다.")),
            )),
        ),
        "summary": "앱을 만드는 사람보다 남이 쓰는 코드를 책임지는 사람을 찾습니다. 버전 호환과 인터페이스 설계가 이 공고의 실질 변별점이고, 문서 작업이 담당업무에 포함됩니다.",
        "summary_ratio": "편차 3건 · 기준선 일치 2건",
    },
    {
        "nn": "06",
        "company_id": "co_lineplus",
        "company": "라인플러스",
        "cluster": "bigtech_platform",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입~2년",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-01-12T10:00:00+09:00",
        "title": "안드로이드 개발자 신입·주니어",
        "sections": (
            ("주요업무", (
                ("글로벌 메신저 안드로이드 앱의 기능을 개발하고 운영합니다.", None, "application", None),
                ("다국어와 기기 호환을 고려해 화면을 구현합니다.", None, "application", None),
            )),
            ("자격요건", (
                ("Kotlin으로 안드로이드 앱을 개발한 경험이 있으신 분", "kotlin-android", "application", None),
                ("Android SDK와 화면 생명주기를 이해하고 계신 분", None, "foundation", None),
            )),
            ("우대사항", (
                ("MVVM 등 아키텍처 패턴을 적용해 본 경험", "app-architecture", "foundation", None),
                ("앱을 스토어에 배포해 본 경험", "store-release", "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "07",
        "company_id": "co_kakaobank",
        "company": "카카오뱅크",
        "cluster": "fintech_finance",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입/주니어",
        "career_label_raw": "경력 무관",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-02-23T10:00:00+09:00",
        "title": "iOS 개발자 신입·주니어",
        "sections": (
            ("주요업무", (
                ("뱅킹 iOS 앱의 계좌·이체 화면을 개발합니다.", None, "application", None),
                ("서버 API를 연동해 거래 흐름을 구현합니다.", "network-api", "application", None),
            )),
            ("자격요건", (
                ("Swift로 iOS 앱을 개발한 경험이 있으신 분", "swift-ios", "application", None),
                ("REST API 연동 경험이 있으신 분", "network-api", "application", None),
            )),
            ("우대사항", (
                ("금융 도메인 앱을 개발해 본 경험", None, "foundation", None),
                ("테스트 코드를 작성해 본 경험", None, "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "08",
        "company_id": "co_samsungsds",
        "company": "삼성에스디에스",
        "cluster": "si_enterprise",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "3년 이상",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-05-18T10:00:00+09:00",
        "title": "모바일 앱 개발자 (경력)",
        "sections": (
            ("주요업무", (
                ("고객사의 사내 업무용 모바일 앱을 개발합니다.", None, "application", None),
                ("설계와 개발 절차를 문서로 남깁니다.", "app-architecture", "application", None),
            )),
            ("자격요건", (
                ("Kotlin으로 안드로이드 앱을 개발한 경험이 있으신 분", "kotlin-android", "application", None),
                ("화면과 로직을 분리한 구조로 개발해 본 경험이 있으신 분", "app-architecture", "application", None),
                ("사내 서버 API를 연동해 본 경험이 있으신 분", "network-api", "application", None),
            )),
            ("우대사항", (
                ("앱 배포와 사내 스토어 운영을 경험해 보신 분", "store-release", "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
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
        "title": "안드로이드 개발자 (경력)",
        "sections": (
            ("주요업무", (
                ("인테리어 커머스 앱의 상품·주문 화면을 개발합니다.", None, "application", None),
                ("안드로이드 앱의 배포와 버전을 관리합니다.", "store-release", "application", None),
            )),
            ("자격요건", (
                ("Kotlin으로 안드로이드 앱을 개발한 경험이 있으신 분", "kotlin-android", "application", None),
                ("서버 API 연동과 비동기 처리에 익숙하신 분", "network-api", "application", None),
            )),
            ("우대사항", (
                ("Swift로 iOS 앱을 함께 개발해 본 경험", "swift-ios", "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
)


def _historical_posting(
    nn: str,
    source_nn: str,
    posted_at: str,
    entry_label: str,
) -> dict[str, Any]:
    """기존 공고의 요구사항 구성을 재사용해 이전 기간의 독립 표본을 만든다."""
    source = next(posting for posting in POSTINGS if posting["nn"] == source_nn)
    label_source = next(
        posting for posting in POSTINGS if posting["entry_label"] == entry_label
    )
    return {
        **source,
        "nn": nn,
        "period": PRIOR,
        "posted_at": posted_at,
        "entry_label": entry_label,
        "entry_label_raw": label_source["entry_label_raw"],
        "career_label_raw": label_source["career_label_raw"],
        "title": f"{source['title']} (이전 기간 표본)",
        "summary": "",
        "summary_ratio": "",
    }


# 이전 기간은 여섯 기업군을 한 건씩 포함하고, 진입 가능 3건·경력 3건으로 구성한다.
POSTINGS += (
    _historical_posting("10", "01", "2024-03-18T10:00:00+09:00", "entry_junior"),
    _historical_posting("11", "03", "2024-07-08T10:00:00+09:00", "entry_junior"),
    _historical_posting("12", "05", "2024-11-12T10:00:00+09:00", "entry_junior"),
    _historical_posting("13", "02", "2025-03-17T10:00:00+09:00", "experienced"),
    _historical_posting("14", "08", "2025-07-07T10:00:00+09:00", "experienced"),
    _historical_posting("15", "04", "2025-11-03T10:00:00+09:00", "experienced"),
)


def _expanded_posting(
    nn: str,
    source_nn: str,
    period: str,
    posted_at: str,
    entry_label: str,
) -> dict[str, Any]:
    """기존 기업군의 요구 구성을 재사용해 16~30번 독립 표본을 만든다."""
    source = next(posting for posting in POSTINGS if posting["nn"] == source_nn)
    label_source = next(
        posting for posting in POSTINGS if posting["entry_label"] == entry_label
    )
    return {
        **source,
        "nn": nn,
        "period": period,
        "posted_at": posted_at,
        "entry_label": entry_label,
        "entry_label_raw": label_source["entry_label_raw"],
        "career_label_raw": label_source["career_label_raw"],
        "title": f"{source['title']} (확장 표본 {nn})",
        "summary": "",
        "summary_ratio": "",
    }


POSTINGS += (
    _expanded_posting("16", "01", RECENT, "2026-01-05T10:00:00+09:00", "entry_junior"),
    _expanded_posting("17", "03", RECENT, "2026-01-19T10:00:00+09:00", "entry_junior"),
    _expanded_posting("18", "02", RECENT, "2026-02-23T10:00:00+09:00", "entry_junior"),
    _expanded_posting("19", "05", RECENT, "2026-03-09T10:00:00+09:00", "entry_junior"),
    _expanded_posting("20", "05", RECENT, "2026-03-23T10:00:00+09:00", "experienced"),
    _expanded_posting("21", "08", RECENT, "2026-04-13T10:00:00+09:00", "entry_junior"),
    _expanded_posting("22", "08", RECENT, "2026-04-27T10:00:00+09:00", "experienced"),
    _expanded_posting("23", "04", RECENT, "2026-05-25T10:00:00+09:00", "experienced"),
    _expanded_posting("24", "04", RECENT, "2026-06-22T10:00:00+09:00", "experienced"),
    _expanded_posting("25", "01", PRIOR, "2024-05-13T10:00:00+09:00", "entry_junior"),
    _expanded_posting("26", "03", PRIOR, "2024-09-09T10:00:00+09:00", "entry_junior"),
    _expanded_posting("27", "05", PRIOR, "2025-02-10T10:00:00+09:00", "entry_junior"),
    _expanded_posting("28", "02", PRIOR, "2025-05-12T10:00:00+09:00", "experienced"),
    _expanded_posting("29", "08", PRIOR, "2025-08-11T10:00:00+09:00", "experienced"),
    _expanded_posting("30", "04", PRIOR, "2025-11-10T10:00:00+09:00", "experienced"),
)

_CLUSTER_READING = {
    "bigtech_platform": "기존 사용자를 깨뜨리지 않는 점진적 변경과 운영 안정성",
    "startup": "기능을 끝까지 완성하고 사용자 반응까지 확인하는 실행력",
    "b2b_saas": "외부 개발자가 쓰는 인터페이스의 호환성과 문서 품질",
    "fintech_finance": "금액·인증 흐름에서 실패와 중복 요청을 통제하는 설계",
    "si_enterprise": "여러 기종과 운영체제 버전에서 같은 동작을 보장하는 검증",
    "game": "프레임·메모리 제약 아래 두 플랫폼의 사용성을 맞추는 판단",
}


def _complete_posting_content(posting: dict[str, Any]) -> dict[str, Any]:
    """빈 공고 해석을 원문·기업군·요구 기술에 맞춰 완성한다."""
    sections = [(section, list(lines)) for section, lines in posting["sections"]]
    flat = [(si, li, section, line) for si, (section, lines) in enumerate(sections)
            for li, line in enumerate(lines)]
    focus_slugs = list(dict.fromkeys(
        line[1] for _, _, _, line in flat if line[1] is not None
    ))[:2]
    focus = " · ".join(DIM_INFO[slug]["label"] for slug in focus_slugs)
    period = "최근 공고" if posting["period"] == RECENT else "이전 기간 공고"
    level = "진입 지원자" if posting["entry_label"] == "entry_junior" else "경력 지원자"
    if not posting["summary"]:
        responsibility = next(line[0] for _, _, section, line in flat if section == "주요업무")
        posting["summary"] = (
            f"{posting['company']} | {posting['title']}. {period}이며, ‘{responsibility}’를 중심 업무로 두고 {focus} 두 항목까지 확인합니다. "
            f"{level}는 다음 역량을 보여 주는 결과물을 준비해야 합니다: {_CLUSTER_READING[posting['cluster']]}."
        )
        posting["summary_ratio"] = "직무 공통 기대치 1건 · 숨은 의미 1건 · 회사 특징 1건"

    existing = {line[3][0] for _, _, _, line in flat if line[3] is not None}
    available = [(si, li, section, line) for si, li, section, line in flat if line[3] is None]
    used: set[tuple[int, int]] = set()
    for kind in ("base", "mark", "note"):
        if kind in existing:
            continue
        candidates = [row for row in available if (row[0], row[1]) not in used]
        if kind == "base":
            target = next((row for row in candidates if row[3][1] is not None), candidates[0])
        elif kind == "mark":
            target = next((row for row in reversed(candidates) if row[3][1] is not None), candidates[-1])
        else:
            target = next((row for row in candidates if row[2] == "주요업무"), candidates[0])
        si, li, _section, line = target
        used.add((si, li))
        dim_label = DIM_INFO[line[1]]["label"] if line[1] else "업무 범위"
        if kind == "base":
            annotation = ("base", dim_label,
                f"‘{line[0]}’는 모바일 개발자의 직무 공통 기대치입니다. 포트폴리오에서 해당 기능의 코드 위치와 실행 화면을 함께 제시하세요.")
        elif kind == "mark":
            annotation = ("mark", f"{posting['company']}가 확인하는 {dim_label}",
                f"이 문장은 다음 역량을 확인합니다: {_CLUSTER_READING[posting['cluster']]}. ‘{line[0]}’를 구현한 선택 이유와 테스트 결과를 함께 설명해야 합니다.",
                "mid", f"{CLUSTERS[posting['cluster']]} 전체 기간 참고")
        else:
            annotation = ("note", f"{posting['company']} 업무에서 읽을 점",
                f"‘{line[0]}’는 기능 구현에서 끝나지 않고 운영 상태까지 맡는다는 뜻입니다. 실패 조건을 재현하고 확인한 결과를 남기세요.")
        sections[si][1][li] = (*line[:3], annotation)
    posting["sections"] = tuple((section, tuple(lines)) for section, lines in sections)
    return posting


POSTINGS = tuple(_complete_posting_content(dict(posting)) for posting in POSTINGS)

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
            ("kotlin-android", "app-architecture"),
            ("swift-ios", "app-architecture"),
            ("app-architecture", "network-api"),
            ("kotlin-android", "store-release"),
            ("network-api", "store-release"),
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
# CONTRACT 5장 A. tag·type·id·축 라벨은 모바일 개발자 전용이다. 다른 직무에 쓰지 않는다.
SCOPE_EXPANSION_TAGS: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    ("store_release", "스토어 배포·심사", "구현으로 끝내지 않고 등록·심사·버전 관리까지 요구",
     ("store-release",)),
    ("backend_api", "서버·API 스펙 협의", "규격을 받는 것이 아니라 함께 정의하는 일까지 요구",
     ("network-api",)),
)

ADVANCED_TYPES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("large_scale", "대규모 사용자 앱 운영·성능", ("kotlin-android",)),
    ("network_resilience", "네트워크 실패·재시도 설계", ("network-api",)),
    ("release_compat", "버전 호환·단계 배포", ("store-release",)),
)

COMBOS: tuple[tuple[str, str, str, str, tuple[str, ...]], ...] = (
    ("android_base", "Kotlin + 상태 분리 + API 연동",
     "목록·상세 화면을 서버와 연결하고 화면 상태를 분리해 다루는 안드로이드 기본 조합입니다.",
     "한 앱을 화면부터 끝까지 완성한 수준",
     ("kotlin-android", "app-architecture", "network-api")),
    ("ios_base", "Swift + 상태 분리 + 비동기 통신",
     "선언형 화면과 비동기 통신을 함께 다루는 iOS 기본 조합입니다.",
     "로딩과 실패를 화면에서 처리한 수준",
     ("swift-ios", "app-architecture", "network-api")),
    ("release", "앱 구조 + 스토어 배포",
     "만든 앱을 실제로 내보내고 버전을 관리해 본 경험을 묻는 조합입니다.",
     "출시 1회 이상 + 버전 관리 기록",
     ("app-architecture", "store-release")),
    ("integration", "API 연동 + 배포 운영",
     "서버와 붙인 앱을 실사용자에게 내보내고 이슈에 대응해 본 조합입니다.",
     "출시 후 이슈를 한 번이라도 고쳐 본 수준",
     ("network-api", "store-release")),
)

REALITY_TAGS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("one_platform_deep", "한 플랫폼은 깊게", ("kotlin-android", "swift-ios")),
    ("store_app", "스토어까지 내보낸 앱", ("store-release",)),
    ("server_linked", "서버와 붙여 본 경험", ("network-api",)),
)

CLUSTER_AXES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("ux_build", "화면 구현력", ("kotlin-android", "swift-ios")),
    ("architecture", "아키텍처·상태 관리", ("app-architecture",)),
    ("integration", "서버 연동·비동기", ("network-api",)),
    ("release_ops", "릴리스·운영", ("store-release",)),
    ("android_focus", "안드로이드 비중", ("kotlin-android",)),
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
        for mention in MENTIONS_BY_POSTING.get(posting["nn"], []):
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
        for mention in MENTIONS_BY_POSTING.get(hits[0]["nn"], []):
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
        for cluster_id in RECENT_CLUSTERS:
            n = cluster_n[cluster_id]
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
# (항목 식별자, 지표를 가져올 차원 slug 또는 None, 제목, 설명)
BASELINE_ITEMS: tuple[tuple[str, str | None, str, str], ...] = (
    ("kotlin-android", "kotlin-android", "Kotlin·안드로이드 구현",
     "화면 여러 개가 이어지는 안드로이드 앱을 스스로 완성하는 능력입니다. 안드로이드 공고에서는 예외 없이 자격요건에 있습니다."),
    ("swift-ios", "swift-ios", "Swift·iOS 구현",
     "iOS 앱의 화면과 동작을 구현하는 능력입니다. 한 플랫폼만 깊게 준비해도 되지만 그 한쪽은 완성 수준이어야 합니다."),
    ("app-architecture", "app-architecture", "앱 아키텍처·상태 관리",
     "화면과 로직을 나누고 상태를 한 곳에서 다루는 능력입니다. 1년 사이 우대에서 자격요건으로 올라오는 흐름이 뚜렷합니다."),
    ("network-api", "network-api", "네트워크·API 연동",
     "서버와 붙이고 로딩·실패를 화면에 표현하는 능력입니다. 붙여 봤다가 아니라 실패했을 때 무엇을 보여줬는지를 봅니다."),
    ("store-release", "store-release", "스토어 배포·릴리스",
     "만든 앱을 실제로 내보내고 버전을 관리해 본 경험입니다. 직무 외 요구로 분류되지만 등장 빈도는 기본기에 가깝습니다."),
    ("app-performance", None, "앱 성능·안정성",
     "느린 화면과 끊기는 동작의 원인을 측정해 고치는 능력입니다. 우대 자리에 자주 놓이지만 준비한 지원자가 드물어 변별력이 큽니다."),
    ("crash-quality", None, "크래시 대응·품질",
     "출시 뒤에 생기는 오류를 추적하고 재발을 막는 능력입니다. 운영을 함께 맡기는 팀에서 반복됩니다."),
    ("spec-collab", None, "디자인·기획 스펙 조율",
     "받은 화면을 그리는 것이 아니라 무엇을 만들지 함께 정하는 기록입니다. 기업군과 무관하게 같은 수준을 요구합니다."),
)

UNCHANGED_ITEMS: tuple[tuple[str, str, str], ...] = (
    ("kotlin-android", "한 플랫폼 앱 완성",
     "이 기업군도 요구 수준은 공통 기대치와 같습니다. 차별화 지점이 아니라 전제 조건입니다."),
    ("network-api", "네트워크·API 연동",
     "서버와 붙이는 기본기는 전 기업군 공통입니다. 더 요구하지도, 덜 보지도 않습니다."),
    ("crash-quality", "크래시 대응·품질",
     "오류를 추적하는 습관은 기업군과 무관하게 동일합니다. 준비했다면 어디에나 통합니다."),
    ("spec-collab", "디자인·기획 스펙 조율",
     "스펙을 함께 정하는 요구는 공통입니다. 심화는 다른 편차 항목이 담당합니다."),
)

# 기업군별 편차.
# (차원 slug, 주제, 기준선, 편차, 근거, 해석, 신뢰도, 근거 블록, 체크 개념 slug)
CLUSTER_DEVIATIONS: dict[str, tuple[tuple[str, ...], ...]] = {
    "bigtech_platform": (
        ("store-release", "배포", "스토어에 한 번 올려 본 경험", "버전 관리와 단계 배포까지 다루는 수준까지",
         '자격요건의 "앱을 스토어에 배포하고 버전을 관리해 본 경험" 문장',
         "이전 1년에는 우대이던 항목이 자격요건으로 올라왔습니다. 올려 봤다가 아니라 되돌려 본 적이 있는가까지 묻는 자리입니다.",
         "high", "#inflation", "store-release"),
        ("kotlin-android", "사용자 규모", "앱 하나를 완성한 경험", "사용자가 늘 때 무엇이 먼저 느려지는지 아는 수준까지",
         '우대사항의 "월간 사용자 수백만 규모의 앱을 운영해 본 경험" 문장',
         "신입 지원이 가능하다고 적어 두고 우대에 수백만을 넣었습니다. 실무 규모의 증명이 아니라 측정과 개선의 시도를 봅니다.",
         "high", "#advanced", "performance"),
        ("app-architecture", "화면 전환", "화면과 로직 분리", "돌아가는 화면을 깨지 않고 바꾸는 설계까지",
         '주요업무의 "기존 View 화면을 Jetpack Compose로 점진적으로 전환" 문장',
         "새로 짜는 일이 아니라 이미 있는 것을 바꾸는 일입니다. 구조가 나뉘어 있지 않으면 시작조차 못 하는 작업입니다.",
         "mid", "#items", "architecture"),
    ),
    "startup": (
        ("kotlin-android", "완성", "앱 하나를 만들어 본 경험", "혼자 기획부터 출시까지 끝내는 오너십까지",
         '자격요건의 "작은 기능이라도 혼자 끝까지 완성해 본 경험" 문장',
         "기술 스택이 아니라 끝까지 갔는가를 자격요건에 두었습니다. 규모가 작아도 사용자에게 내보낸 기록이 가장 강한 증거입니다.",
         "high", "#reality", "app-project"),
        ("network-api", "연동", "API를 붙여 본 경험", "빈 목록과 오류 화면까지 함께 설계하는 수준까지",
         '자격요건의 "REST API를 연동해 화면에 데이터를 그려 본 경험" 문장',
         "데이터를 그려 본 경험까지 적었습니다. 성공 화면만 있는 결과물로는 이 문장을 채우기 어렵습니다.",
         "mid", "#items", "network-layer"),
        ("app-architecture", "구조", "공통 기대치와 같음", "여기서는 우대 · 완성 속도가 먼저",
         "우대사항 자리에 아키텍처 패턴이 있음",
         "구조를 덜 본다는 뜻이 아니라 완성이 먼저라는 뜻입니다. 준비 순서를 출시 쪽으로 옮기는 편이 유리합니다.",
         "mid", "#items", "architecture"),
    ),
    "b2b_saas": (
        ("store-release", "버전 호환", "스토어에 올려 본 경험", "남의 앱을 깨지 않는 하위 호환까지",
         '자격요건의 "SDK 배포와 버전 호환성을 관리해 본 경험" 문장',
         "고객사 앱이 이미 옛 버전을 쓰고 있어 마음대로 바꿀 수 없습니다. 무엇을 바꾸면 남이 깨지는지 아는 감각을 봅니다.",
         "high", "#advanced", "store-release"),
        ("app-architecture", "인터페이스", "화면과 로직 분리", "남이 쓰는 공개 경계를 설계하고 문서로 남기는 수준까지",
         '자격요건의 "공개 API를 설계하고 문서로 남겨 본 경험" 문장',
         "사용자가 개발자인 제품입니다. 이름과 인자를 정하는 감각과 문서가 코드만큼 평가에 들어옵니다.",
         "high", "#items", "architecture"),
        ("swift-ios", "안정성", "iOS 앱 구현", "다른 팀이 쓰는 라이브러리 수준의 안정성까지",
         '주요업무의 "공개 인터페이스를 설계하고 문서와 예제를 함께 관리" 문장',
         "화면이 없는 코드라 눈으로 확인되지 않습니다. 테스트와 예제가 곧 품질의 증거가 됩니다.",
         "mid", "#items", "app-project"),
    ),
    "fintech_finance": (
        ("network-api", "실패 처리", "API를 붙여 본 경험", "지연·중복·재시도까지 설계하는 수준까지",
         '우대사항의 "결제 승인 지연과 재시도를 직접 설계해 본 경험" 문장',
         "라벨은 우대지만 주요업무의 실패 흐름 설계와 묶으면 실질 필수입니다. 같은 요청이 두 번 나가도 금액이 두 번 빠지지 않아야 합니다.",
         "high", "#advanced", "network-layer"),
        ("app-architecture", "상태 관리", "화면과 로직 분리", "금액 상태를 단일 출처로 다루는 수준까지",
         '주요업무의 "화면 상태 구조를 설계합니다" 문장',
         "화면 여러 곳이 같은 금액을 들고 있으면 언젠가 어긋납니다. 상태를 한 곳에서 관리한 코드가 그대로 답이 됩니다.",
         "high", "#items", "architecture"),
        ("store-release", "심사", "스토어 등록", "심사 반려에 대응해 본 수준까지",
         '우대사항의 "앱을 스토어에 배포하고 심사 반려에 대응해 본 경험" 문장',
         "금융 앱은 심사 기준이 더 까다롭습니다. 출시까지 가 본 사람만 답할 수 있는 문장입니다.",
         "mid", "#scope_expansion", "store-release"),
    ),
    "si_enterprise": (
        ("app-architecture", "문서화", "화면과 로직 분리", "설계를 문서로 남겨 인수인계 가능하게 만드는 수준까지",
         '주요업무의 "설계와 개발 절차를 문서로 남깁니다" 문장',
         "만든 사람과 운영하는 사람이 다릅니다. 남이 이어받을 수 있게 만드는 일이 요구의 핵심입니다.",
         "high", "#scope_expansion", "design-collab"),
        ("kotlin-android", "기본기", "안드로이드 앱 구현", "기기와 OS 버전 호환을 함께 검증하는 수준까지",
         '자격요건의 "Kotlin으로 안드로이드 앱을 개발한 경험" 문장',
         "심화보다 기본기의 확실함을 봅니다. 화려한 기능보다 여러 환경에서 똑같이 도는 앱이 유리한 기업군입니다.",
         "mid", "#items", "app-project"),
    ),
    "game": (
        ("kotlin-android", "성능", "앱 화면 구현", "여러 기종에서 프레임 드랍 없이 도는 수준까지",
         '자격요건의 "여러 기종에서 프레임 드랍 없이 동작하도록 최적화해 본 경험" 문장',
         "기종마다 다르게 동작하는 문제를 다뤄 본 사람을 찾습니다. 측정 도구로 병목을 찾고 무엇을 바꿨는지 말할 수 있어야 합니다.",
         "high", "#advanced", "performance"),
        ("swift-ios", "두 플랫폼", "한 플랫폼 구현", "두 플랫폼을 함께 대응하는 수준까지",
         '우대사항의 "Swift로 iOS 앱을 함께 개발해 본 경험" 문장',
         "담당업무가 두 스토어 배포를 포함하므로 우대 라벨보다 비중이 큽니다. 한쪽이 깊고 다른 쪽은 읽고 고칠 수 있으면 됩니다.",
         "mid", "#items", "app-project"),
        ("store-release", "빌드", "스토어 배포", "두 스토어의 빌드와 심사 주기를 함께 관리하는 수준까지",
         '주요업무의 "두 플랫폼의 빌드와 스토어 배포를 관리합니다" 문장',
         "배포가 담당업무에 있습니다. 빌드 자동화 경험이 바로 쓰이는 드문 자리입니다.",
         "mid", "#scope_expansion", "store-release"),
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
            "item_id": item_id, "title": title, "desc": desc,
            "freq_pct": freq_pct(slug, RECENT) if slug else None,
            "required_ratio": required_pct(slug, RECENT) if slug else None,
        }
        for item_id, slug, title, desc in BASELINE_ITEMS
    ]


def unchanged_rows() -> list[dict[str, Any]]:
    return [{"item_id": i, "title": t, "note": n} for i, t, n in UNCHANGED_ITEMS]


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
        "unchanged_note": "읽는 법 — 회색 번호는 모바일 개발자 공통 기대치, 파란 번호는 문장 뒤에 숨은 신호, 노란 번호는 이 회사가 유독 원하는 것입니다.",
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
    ("app-project", "한 플랫폼 앱 완성", "화면·입력·네비게이션이 이어지는 앱 하나",
     "기준선 · 최근 공고 전량이 한 플랫폼의 완성 경험을 요구합니다", "스토어 링크 또는 저장소 + 화면 흐름 설명",
     ("portfolio",), "project", True),
    ("architecture", "MVVM·상태 분리 구조", "화면과 로직을 나눈 근거",
     "기준선 · 구조 요구가 우대에서 자격요건으로 올라오는 흐름입니다", "구조 다이어그램 + 상태 관리 코드",
     ("portfolio", "interview"), "project", True),
    ("network-layer", "네트워크 계층과 실패 처리", "로딩·오류·빈 화면까지",
     "기준선 · 서버 연동 요구가 전 기업군 공통입니다", "실패 케이스 처리 코드 + 화면 캡처",
     ("portfolio", "interview"), "project", True),
    ("store-release", "스토어 배포 경험", "등록·심사·버전 관리",
     "직무 외 요구 중 배포·릴리스가 가장 자주 나타납니다", "출시 링크 + 버전 기록과 릴리스 노트",
     ("portfolio",), "project", True),
    ("performance", "성능 측정·개선 기록", "느린 화면을 재고 고친 흔적",
     "심화 신호 중 성능 문장이 가장 자주 나타납니다", "측정 도구 결과 + 개선 전후 수치",
     ("portfolio", "interview"), "project", True),
    ("crash-quality", "크래시 추적·안정성", "출시 뒤 오류를 좁힌 기록",
     "기준선 · 운영을 함께 맡기는 팀에서 반복됩니다", "크래시 리포트 + 원인과 수정 기록",
     ("portfolio",), "project", False),
    ("design-collab", "디자인·기획 스펙 조율 서사", "무엇을 만들지 함께 정한 경험",
     "기준선 · 스펙을 함께 정하는 요구가 전 기업군 공통입니다", "논의 기록 + 바뀐 결정과 이유",
     ("essay",), "story", True),
    ("platform-internals", "플랫폼 동작 원리", "생명주기·화면 갱신·메모리",
     "기본기의 정확성을 검증하는 면접 단골 주제입니다", "동작 흐름 정리 노트 + 내 코드와 연결한 예시",
     ("interview",), "study", True),
    ("async-cs", "비동기·네트워크 기본기", "스레드·취소·재시도의 원리",
     "실패 처리 항목의 면접 검증에서 이론 이해를 묻습니다", "개념 정리 노트",
     ("interview",), "study", True),
    ("compose-swiftui", "선언형 UI 원리", "상태가 화면을 만드는 구조",
     "Compose·SwiftUI 요구가 두 플랫폼 모두에서 늘고 있습니다", "다시 그려지는 조건 정리 노트",
     ("interview",), "study", False),
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
    ("bigtech_platform", ("배포·버전 관리", "성능 측정", "구조 분리", "협업 기록")),
    ("startup", ("완성과 출시", "오너십 서사", "API 연동", "사용자 피드백 반영")),
    ("b2b_saas", ("인터페이스 설계", "버전 호환", "문서화", "안정성")),
    ("fintech_finance", ("실패·재시도 설계", "상태 관리", "보안 기본기", "심사 대응")),
    ("si_enterprise", ("기본기 정확성", "설계 문서화", "기기 호환 검증", "협업 기록")),
    ("game", ("성능 최적화", "두 플랫폼 대응", "빌드·배포 자동화", "협업")),
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
                "title": "출시 링크를 포트폴리오의 첫 줄로",
                "body": f"{label}에서도 저장소 링크보다 실제로 내려받아 볼 수 있는 앱 하나가 강합니다. 스토어 링크와 화면 흐름 한 장을 README 최상단에 두세요.",
                "tips": ["README 최상단에 설치 링크·지원 OS·3단계 실행 절차 배치", "새 기기에서 설치와 핵심 화면 진입이 재현되면 완료"],
                "linked_item_ids": [
                    CONCEPT_INFO["app-project"]["concept_id"],
                    CONCEPT_INFO["store-release"]["concept_id"],
                ],
            },
            {
                "title": "성공 화면 말고 실패 화면",
                "body": "잘 되는 화면 캡처는 모두가 냅니다. 네트워크를 끊었을 때, 응답이 늦을 때, 데이터가 없을 때의 화면을 나란히 보여주면 실패 처리 요구가 한 번에 증명됩니다.",
                "tips": ["README의 실패 처리 절에 로딩·오류·빈 화면과 발생 조건 배치", "네트워크 차단 전후를 재현해 중복 요청 없이 복구되면 완료"],
                "linked_item_ids": [
                    CONCEPT_INFO["network-layer"]["concept_id"],
                    CONCEPT_INFO["crash-quality"]["concept_id"],
                ],
            },
        ],
        "intro_orders": orders,
    }
    essay = [
        {
            "kind": "deviation",
            "title": "끊기는 화면을 숫자로 바꾼 경험",
            "body": f"{label} 지원 글에서 강한 것은 사용한 라이브러리 목록이 아니라 느리다는 체감을 측정으로 바꾼 과정입니다. 과정 중심으로 쓰세요.",
            "narrative": {
                "problem": "목록을 내릴 때 화면이 끊기던 문제",
                "solve": "측정 도구로 병목 확인 → 이미지·리스트 처리 변경 → 다시 측정",
                "growth": "체감이 아니라 수치로 판단하는 관점",
            },
            "sample_sentence": "\"빨라진 것 같다는 말을 숫자로 바꾸지 못하면 고친 것이 아니라고 배웠습니다.\"",
            "tips": ["개선 전후 수치를 한 문장으로 붙이세요"],
            "linked_item_ids": [CONCEPT_INFO["performance"]["concept_id"]],
        },
        {
            "kind": "narrative_polish",
            "title": "스펙 조율 경험 — 보유 소재 다듬기",
            "body": "같은 경험이라도 강조점을 기업군에 맞춰 바꾸세요. 사실 관계는 고정하고 배움의 방점만 조정합니다.",
            "narrative": None,
            "sample_sentence": None,
            "tips": ["바뀐 결정과 그 이유를 한 줄로", "디자이너·기획자의 관점을 인용하면 설득력이 커집니다"],
            "linked_item_ids": [CONCEPT_INFO["design-collab"]["concept_id"]],
        },
    ]
    interview = [
        {
            "kicker": "구조 검증",
            "question": "화면과 로직을 어떻게 나눴나요?",
            "followups": ["화면이 다시 그려지는 조건은 무엇인가요?", "같은 데이터를 두 화면이 쓰면 어떻게 하나요?"],
            "point": "화면과 상태를 나눈 위치, 다른 구조를 쓰지 않은 이유, 변경 뒤 테스트 결과를 차례로 답하세요. 꼬리질문에는 선택 기준과 실제 결과를 연결합니다.",
            "linked_item_ids": [
                CONCEPT_INFO["architecture"]["concept_id"],
                CONCEPT_INFO["compose-swiftui"]["concept_id"],
            ],
        },
        {
            "kicker": "실패 검증",
            "question": "네트워크가 끊기면 그 화면은 어떻게 되나요?",
            "followups": ["같은 요청이 두 번 나가면 어떻게 되나요?", "재시도는 몇 번까지, 왜 그렇게 정했나요?"],
            "point": "재시도 횟수와 중복 방지 방식을 고른 이유를 말하고, 네트워크 차단 실험에서 복구된 결과를 덧붙이세요.",
            "linked_item_ids": [
                CONCEPT_INFO["network-layer"]["concept_id"],
                CONCEPT_INFO["async-cs"]["concept_id"],
            ],
        },
        {
            "kicker": "운영 검증",
            "question": "출시한 뒤에 생긴 오류를 어떻게 찾았나요?",
            "followups": ["재현되지 않는 크래시는 어떻게 좁혔나요?", "다음 버전에서 같은 문제가 안 생긴다는 보장은요?"],
            "point": "크래시 리포트에서 원인을 좁힌 순서, 해당 수정안을 고른 이유, 다음 버전에서 재발하지 않은 결과를 연결하세요.",
            "linked_item_ids": [
                CONCEPT_INFO["store-release"]["concept_id"],
                CONCEPT_INFO["crash-quality"]["concept_id"],
            ],
        },
        {
            "kicker": "태도 검증 · 자소서 연동",
            "question": "디자이너와 의견이 달랐을 때 어떻게 했나요?",
            "followups": ["상대는 그 상황을 어떻게 기억할까요?"],
            "point": "서로 다른 안의 판단 기준, 최종안을 고른 이유, 적용 뒤 사용자 또는 팀의 결과를 답하고 상대 관점의 꼬리질문에도 같은 사실을 유지하세요.",
            "linked_item_ids": [CONCEPT_INFO["design-collab"]["concept_id"]],
        },
    ]
    return {
        "job": JOB_ROLE_ID, "scope": scope, "checklist": checklist,
        "portfolio": portfolio, "essay": essay, "interview": interview,
        "agent_version": AGENT_VERSION_STRING, "source": "stored",
    }


ROADMAP_STEPS: tuple[tuple[int, str, int, str, str, str, str, str, tuple[str, ...]], ...] = (
    (1, "STEP 01 · 3주", 3, "vhigh", "한 플랫폼으로 앱 하나를 끝까지 완성하기",
     "예제 따라 만들기를 멈추고 화면 서너 개가 이어지는 앱을 직접 설계해 완성하세요. 화면과 로직을 나누는 구조를 처음부터 넣습니다.",
     "저장소 + 화면 흐름도 + 구조 설명 문서",
     "기준선 두 항목이 채워지지 않으면 다른 준비가 평가에 닿지 않습니다.",
     ("화면 구성", "상태 분리", "네비게이션")),
    (2, "STEP 02 · 2주", 2, "vhigh", "서버와 붙이고 실패를 다루기",
     "공개 API를 붙여 목록·상세를 만들고 로딩·오류·빈 화면을 각각 설계하세요. 네트워크를 끊은 뒤 재시도를 확인하고, 의도적으로 크래시를 발생시켜 추적 기록도 남기세요.",
     "실패 처리 코드 + 세 가지 화면 캡처 + 재시도 정책 + 크래시 재현·추적 기록",
     "서버 연동 요구가 전 기업군 공통이고 실패 처리까지 묻는 문장이 늘고 있습니다.",
     ("API 연동", "실패 화면", "재시도")),
    (3, "STEP 03 · 2주", 2, "high", "스토어에 내보내고 성능을 재기",
     "만든 앱을 실제로 배포하고, 느린 화면을 측정 도구로 찾아 하나만 개선해 전후 수치를 남기세요.",
     "출시 링크 + 버전 기록 + 개선 전후 측정 표",
     "직무 외 요구 중 배포·릴리스가 가장 자주 나타나고, 성능은 준비한 지원자가 드뭅니다.",
     ("스토어 배포", "성능 측정", "버전 관리")),
    (4, "STEP 04 · 2주", 2, "mid", "기업군에 맞춰 마무리하기",
     "지원 기업군의 편차 항목을 채우고 README와 자소서의 소개 순서를 다시 배치하세요. 스펙 조율에서 바뀐 결정과 선언형 UI의 상태 흐름을 별도 문서로 남기세요.",
     "스펙 조율 결정 기록 + 선언형 UI 상태 흐름 문서 + 기업군 맞춤 소개 순서",
     "필수가 채워진 뒤의 마무리입니다. 순서만 바꿔도 읽히는 인상이 달라집니다.",
     ("편차 보강", "소개 순서", "문서 정리")),
)

STEP_FILLS: tuple[tuple[str, ...], ...] = (
    ("app-project", "architecture"),
    ("network-layer", "crash-quality"),
    ("store-release", "performance"),
    ("design-collab", "compose-swiftui"),
)

STUDY_TRACKS: tuple[tuple[str, str, str, str, str, str, tuple[str, ...]], ...] = (
    ("app-build", "STEP 01~02와 병행", "vhigh", "플랫폼 동작 원리",
     "화면 생명주기와 다시 그려지는 조건, 메모리가 새는 대표 상황을 남에게 설명할 수 있는 수준까지.",
     "프로젝트에서 적용은 하지만 면접의 꼬리질문은 원리의 정확성을 검증합니다.",
     ("platform-internals",)),
    ("app-structure", "STEP 02~03과 병행", "high", "비동기·네트워크 기본기",
     "스레드와 취소, 타임아웃과 재시도, 같은 요청이 두 번 나갈 때의 문제까지 그림으로 그릴 수 있는 수준까지.",
     "써 봤다와 무엇이 일어나는지 안다를 면접이 구분합니다.",
     ("async-cs",)),
    ("release-ops", "상시 · 주 3~4시간", "high", "선언형 UI 원리",
     "상태가 화면을 만드는 구조와 다시 그려지는 범위까지. 과목 전체가 아니라 면접 단골 주제 중심으로.",
     "Compose·SwiftUI 요구가 두 플랫폼 모두에서 늘고 있어 전 기간에 얇게 깔리는 것이 효율적입니다.",
     ("compose-swiftui",)),
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
    "app-build": {
        "why": "최근 공고 전량이 한 플랫폼의 앱 구현을 자격요건에 둡니다. 이 역량이 없으면 다른 준비가 평가에 닿지 않습니다.",
        "depth": {"foundation": "예제를 따라 화면 하나를 만든다",
                  "application": "화면 여러 개가 이어지는 앱을 직접 설계해 완성한다",
                  "tradeoff": "여러 기종과 OS 버전에서 같은 동작을 보장한다"},
        "prereq": ["언어 기본 문법", "화면 생명주기의 의미"],
        "misconceptions": ["예제를 돌린 것을 만들어 봤다고 말하는 것", "화면이 보이면 완성이라는 생각"],
        "interview": ["화면이 다시 그려지는 조건은 무엇인가", "기종마다 다르게 보이면 무엇부터 보나"],
        "sequence": ["화면 구성", "네비게이션", "입력과 검증", "기기 대응"],
    },
    "app-structure": {
        "why": "구조 요구가 우대에서 자격요건으로 올라오는 흐름이 뚜렷하고, 서버 연동은 전 기업군 공통입니다.",
        "depth": {"foundation": "화면 코드와 데이터 호출을 파일로 나눈다",
                  "application": "상태를 한 곳에서 관리하고 로딩·실패를 화면에 표현한다",
                  "tradeoff": "재시도와 중복 요청까지 설계해 데이터가 어긋나지 않게 만든다"},
        "prereq": ["비동기 호출의 기본", "JSON 응답 다루기"],
        "misconceptions": ["패턴 이름을 아는 것이 구조라는 생각", "성공 응답만 다루면 된다는 생각"],
        "interview": ["같은 데이터를 두 화면이 쓰면 어떻게 하나", "요청이 두 번 나가면 어떻게 되나"],
        "sequence": ["계층 분리", "상태 관리", "실패 처리", "재시도 정책"],
    },
    "release-ops": {
        "why": "직무 외 요구 가운데 배포·릴리스가 가장 자주 나타나고, 일부 기업군은 자격요건에 둡니다.",
        "depth": {"foundation": "빌드해 설치 파일을 만든다",
                  "application": "스토어에 올리고 버전과 릴리스 노트를 관리한다",
                  "tradeoff": "단계 배포와 하위 호환을 관리해 기존 사용자를 깨지 않는다"},
        "prereq": ["서명과 빌드 설정의 기본", "버전 표기 규칙"],
        "misconceptions": ["배포는 회사가 알아서 해준다는 생각", "올리면 끝이라는 생각"],
        "interview": ["심사에서 반려되면 무엇부터 보나", "옛 버전 사용자는 어떻게 되나"],
        "sequence": ["빌드와 서명", "스토어 등록", "버전 관리", "단계 배포와 롤백"],
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

    # `dataset_versions` 는 A1(backend) 이 만든다. 여기서 만들지 않는다.

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
            for segment in SEGMENTS:
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
        nid_new = f"nd_demo_{JOB_ROLE_ID}_{len(nodes) + 1:04d}"
        node_ids[key] = nid_new
        nodes.append({
            "node_id": nid_new, "graph_layer": layer, "node_type": node_type,
            "ref_table": ref_table, "ref_id": ref_id, "label": label,
            "ontology_version": ONTOLOGY_VERSION, "dataset_version": DATASET_VERSION,
            "taxonomy_version_id": TAXONOMY_VERSION_ID if layer == "semantic" else None,
            "analysis_version": ANALYSIS_VERSION,
        })
        return nid_new

    role_node = node("semantic", "JobRole", "job_roles", JOB_ROLE_ID, JOB_LABEL)
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
        for m in MENTIONS_BY_POSTING.get(p["nn"], []):
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

    for row in STATISTICS_PAYLOAD["items"]:
        slug = row["item_id"]
        fact = FACTS.get("posting_prevalence", "ratio", "overall", JOB_ROLE_ID,
                         SEGMENT_ALL, RECENT, slug)
        companies = {
            p["company_id"] for p in RECENT_POSTINGS if slug in DIMS_BY_POSTING[p["nn"]]
        }
        claim_id = add_claim(
            stat_output, "statistic", None, "overall", JOB_ROLE_ID,
            f"{DIM_INFO[slug]['label']} 은 최근 1년 {JOB_LABEL} 공고의 {freq_pct(slug, RECENT)}% 에 나타난다.",
            {"dimension_id": dim_id(slug), "metric_family": "posting_prevalence",
             "period_id": RECENT, "entry_segment": SEGMENT_ALL},
            "0.82000", components(int(fact["numerator"]), len(companies), 1.0),
        )
        claim_evidence.append({
            "claim_id": claim_id, "support_type": "statistic_fact",
            "support_id": fact["fact_id"], "relation": "supports", "weight": "0.90000",
        })
        for row_e in evidence_lines(slug, 2):
            nn = row_e["posting_id"].rsplit("_", 1)[-1]
            claim_evidence.append({
                "claim_id": claim_id, "support_type": "chunk",
                "support_id": chunk_id(nn, 2), "relation": "supports", "weight": "0.60000",
            })

    for item_id, slug, title, _desc in BASELINE_ITEMS:
        if slug is None:
            continue
        claim_id = add_claim(
            intp_outputs["overall"], "posting_explicit", "explicit_requirement",
            "overall", JOB_ROLE_ID,
            f"{title} 은 기업군과 무관하게 반복되는 공통 기대치다.",
            {"dimension_id": dim_id(slug), "baseline_item_id": item_id, "baseline_title": title},
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

    for slug in ("app-project", "network-layer", "store-release"):
        info = CONCEPT_INFO[slug]
        claim_id = add_claim(
            strat_outputs["overall"], "strategy", None, "overall", JOB_ROLE_ID,
            f"{info['title']} 은 {JOB_LABEL} 지원 준비에서 우선순위가 높다.",
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
            "kotlin-android" if scope_level == "overall"
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
    assert road_outputs and strat_outputs
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

# 마이그레이션과 A1 이 넣는 기준 데이터. 조각 밖의 외래키는 이 목록 안에 있어야 한다.
BASE_JOB_ROLES = frozenset({JOB_ROLE_ID})
BASE_PERIODS = frozenset(PERIODS)
BASE_CLUSTERS = frozenset(CLUSTERS)
BASE_COMPANIES = frozenset(p["company_id"] for p in POSTINGS)
BASE_METRIC_POLICIES = frozenset(METRIC_POLICY.values())
BASE_DATASET_VERSIONS = frozenset({DATASET_VERSION})


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
        # `ds_demo_v1` 행은 A1 이 만든다. 조각 안에 없어도 적재 시점에는 있다.
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
    """30건 모집단의 기간·기업군·진입 구분·상태와 차원 표본 계약을 확인한다."""
    problems: list[str] = []
    expected_clusters = set(CLUSTER_ORDER)
    period_spec = {
        RECENT: (18, "2026-01-01", "2026-06-30", {"entry_junior": 10, "experienced": 8}),
        PRIOR: (12, "2024-03-01", "2025-11-30", {"entry_junior": 6, "experienced": 6}),
    }
    if len(POSTINGS) != 30 or len(tables["postings"]) != 30:
        problems.append(f"공고 수 {len(POSTINGS)}/{len(tables['postings'])} != 30/30")
    expected_ids = {posting_id(f"{number:02d}") for number in range(1, 31)}
    actual_ids = {row["posting_id"] for row in tables["postings"]}
    if actual_ids != expected_ids:
        problems.append(f"공고 식별자 차이 {sorted(actual_ids ^ expected_ids)}")

    for period, (expected_n, starts_on, ends_on, labels) in period_spec.items():
        group = [posting for posting in POSTINGS if posting["period"] == period]
        if len(group) != expected_n:
            problems.append(f"{period}: 공고 {len(group)}건 != {expected_n}건")
        clusters = {posting["cluster"] for posting in group}
        if clusters != expected_clusters:
            problems.append(f"{period}: 기업군 차이 {sorted(clusters ^ expected_clusters)}")
        actual_labels = {
            label: sum(1 for posting in group if posting["entry_label"] == label)
            for label in labels
        }
        if actual_labels != labels:
            problems.append(f"{period}: entry_label {actual_labels} != {labels}")
        for posting in group:
            posted_date = posting["posted_at"][:10]
            if not starts_on <= posted_date <= ends_on:
                problems.append(f"{posting['nn']}: 게시일 {posted_date} 범위 밖")

    recent_counts = Counter(posting["cluster"] for posting in RECENT_POSTINGS)
    if set(recent_counts.values()) != {3} or set(recent_counts) != expected_clusters:
        problems.append(f"recent 기업군 분포 {dict(recent_counts)} != 기업군별 3건")
    prior_counts = Counter(posting["cluster"] for posting in PRIOR_POSTINGS)
    if set(prior_counts.values()) != {2} or set(prior_counts) != expected_clusters:
        problems.append(f"prev 기업군 분포 {dict(prior_counts)} != 기업군별 2건")

    versions = tables["posting_versions"]
    ongoing = [row for row in versions if row["closed_at"] is None]
    closed = [row for row in versions if row["closed_at"] is not None]
    if len(ongoing) != 6 or len(closed) != 24:
        problems.append(f"공고 상태 진행 {len(ongoing)}건/마감 {len(closed)}건 != 6/24")
    prior_ids = {posting_version_id(posting["nn"]) for posting in PRIOR_POSTINGS}
    if any(row["posting_version_id"] in prior_ids for row in ongoing):
        problems.append("prev 공고에 진행 중 상태가 있다")
    for row in closed:
        if row["closed_at"] <= row["posted_at"]:
            problems.append(f"{row['posting_version_id']}: 마감일이 게시일 이후가 아니다")

    for slug in DIM_SLUGS:
        companies = {
            posting["company_id"]
            for posting in POSTINGS
            if slug in DIMS_BY_POSTING[posting["nn"]]
        }
        if len(companies) < 2:
            problems.append(f"{slug}: 독립 회사 {len(companies)}곳")
    return problems


def check_output_population(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """모듈 산출물 52행과 전체 공고 해석 30행을 확인한다."""
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
    posting_ids = {posting_id(posting["nn"]) for posting in POSTINGS}
    if posting_interpretations != posting_ids:
        problems.append(f"공고 해석 범위 차이 {sorted(posting_interpretations ^ posting_ids)}")
    return problems


def check_direct_contract_values(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """직접 입력하는 출처·기간·세그먼트·데이터셋 값을 확인한다."""
    problems: list[str] = []
    expected_uses = set(ALLOWED_USES)
    for row in tables["source_assessments"]:
        if set(row["allowed_uses"]) != expected_uses:
            problems.append(f"{row['assessment_id']}: allowed_uses 불일치")
        if (row["source_tier"], str(row["reliability_score"]), row["assessment_version"]) != (
            "A", "0.95000", "sa_v1"
        ):
            problems.append(f"{row['assessment_id']}: 출처 평가 기본값 불일치")
    for row in tables["statistics_facts"]:
        if row["period_id"] not in {RECENT, PRIOR}:
            problems.append(f"{row['fact_id']}: 허용되지 않은 기간 {row['period_id']}")
        if row["metric_family"] == "entry_label_advanced_signal_rate" and row["entry_segment"] != SEGMENT_ENTRY:
            problems.append(f"{row['fact_id']}: entry_segment {row['entry_segment']}")
    if tables.get("dataset_versions"):
        problems.append("mobile 모듈은 dataset_versions 행을 만들면 안 됩니다")
    if len(tables["sources"]) != 30 or len(tables["source_snapshots"]) != 30:
        problems.append("공고별 출처·스냅샷이 30행이 아닙니다")
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
