"""프론트엔드 직무의 생성 데모 시드 (갈래 A2).

``agent/data/demo_seed/CONTRACT.md`` 가 이 파일의 기준이다. 데이터베이스에 접속하지
않고 메모리에서 계산해 ``parts/frontend/<table>.csv`` 로만 낸다. 모델 호출은 0회다.

`dataset_versions` 는 만들지 않는다. `ds_demo_v1` 는 아홉 직무가 함께 쓰는 한 행이라
A1(backend) 이 만든다. 여기서 같은 행을 또 만들면 적재에서 중복 키가 된다.

CONTRACT 10.5 의 `allowed_uses` 예시값(`baseline`·`evidence`)은 `0001_initial_schema.sql`
의 `allowed_uses_known` CHECK 가 허용하지 않는다. 적재가 실패하므로 스키마가 허용하는
값으로 대신 담는다. 나머지 규약(계층 A·신뢰도 0.95000·`sa_v1`)은 그대로 따른다.

통계 payload 의 `scope_expansion`·`advanced`·`combos`·`reality`·`cluster_axes.axes` 라벨은
프론트엔드 직무의 것을 새로 정한다. 백엔드 상수를 옮겨 쓰지 않는다.

실행: ``cd agent && python -m scripts.demo_seed.frontend``
"""

from __future__ import annotations

import json
import math
from collections import Counter
from typing import Any

from ._csv import demo_seed_root, sha256_hex, write_part

# ============================================================ 식별자
JOB_ROLE_ID = "frontend"
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


# ============================================================ 1. 요구 차원 8종
# (slug, dimension_kind, 표시 라벨, 정의, 별칭, 역할 경계 여부)
DIMENSIONS: tuple[tuple[str, str, str, str, tuple[str, ...], bool], ...] = (
    (
        "react-component",
        "technology",
        "React 컴포넌트 개발",
        "컴포넌트 단위로 화면을 나누고 상태와 이벤트를 다루는 요구.",
        ("React", "리액트", "컴포넌트 개발"),
        False,
    ),
    (
        "typescript-typing",
        "technology",
        "TypeScript 타입 설계",
        "타입으로 데이터 모양과 규칙을 표현해 오류를 컴파일 시점에 잡는 요구.",
        ("TypeScript", "타입스크립트", "정적 타입"),
        False,
    ),
    (
        "state-management",
        "practice",
        "상태 관리 설계",
        "화면 사이의 상태와 서버 데이터 흐름을 일관된 규칙으로 다루는 요구.",
        ("상태 관리", "Redux", "React Query"),
        False,
    ),
    (
        "css-architecture",
        "practice",
        "CSS 설계·디자인 시스템",
        "스타일을 재사용 가능한 구조로 나누고 디자인 토큰과 공통 컴포넌트로 묶는 요구.",
        ("CSS 설계", "디자인 시스템", "styled-components"),
        False,
    ),
    (
        "web-performance",
        "practice",
        "웹 성능 최적화",
        "렌더링 비용과 로딩 지표를 측정해 사용자 체감 속도를 줄이는 요구.",
        ("웹 성능", "Core Web Vitals", "렌더링 최적화"),
        False,
    ),
    (
        "web-accessibility",
        "practice",
        "웹 접근성·웹표준",
        "시맨틱 마크업과 키보드·보조기기 사용을 고려해 화면을 만드는 요구.",
        ("웹 접근성", "WCAG", "시맨틱 마크업"),
        True,
    ),
    (
        "frontend-testing",
        "practice",
        "프론트엔드 테스트",
        "컴포넌트와 사용자 흐름을 자동 테스트로 검증해 회귀를 막는 요구.",
        ("프론트엔드 테스트", "Testing Library", "E2E 테스트"),
        True,
    ),
    (
        "bundling-build",
        "tooling",
        "번들링·빌드 도구",
        "번들러와 빌드 파이프라인을 구성해 산출물 크기와 빌드 시간을 다루는 요구.",
        ("번들링", "Webpack", "Vite"),
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
    ("react-component", "state-management", "narrower"),
    ("state-management", "react-component", "broader"),
    ("react-component", "typescript-typing", "related"),
    ("web-performance", "bundling-build", "related"),
    ("web-accessibility", "css-architecture", "related"),
    ("css-architecture", "react-component", "related"),
    ("frontend-testing", "react-component", "related"),
    ("web-performance", "react-component", "related"),
)

# ============================================================ 2. 역량 4종
CAPABILITIES: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    (
        "ui-implementation",
        "화면 구현",
        "디자인 시안을 컴포넌트로 나누고 재사용 가능한 스타일 구조로 완성하는 능력.",
        ("react-component", "css-architecture"),
    ),
    (
        "state-data-flow",
        "상태·데이터 흐름 설계",
        "서버 데이터와 화면 상태의 경계를 정하고 타입으로 규칙을 고정하는 능력.",
        ("typescript-typing", "state-management"),
    ),
    (
        "experience-quality",
        "사용자 경험 품질",
        "성능 지표와 접근성 기준을 측정해 실제 사용자의 체감을 끌어올리는 능력.",
        ("web-performance", "web-accessibility"),
    ),
    (
        "frontend-engineering",
        "프론트엔드 엔지니어링 기반",
        "테스트와 빌드 도구로 변경을 안전하게 만들고 배포 산출물을 관리하는 능력.",
        ("frontend-testing", "bundling-build"),
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
    ("ui-implementation", "state-data-flow"),
    ("state-data-flow", "experience-quality"),
    ("ui-implementation", "frontend-engineering"),
    ("frontend-engineering", "experience-quality"),
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
        "company_id": "co_naver",
        "company": "네이버",
        "cluster": "bigtech_platform",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입~3년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-03-02T10:00:00+09:00",
        "title": "프론트엔드 개발자 (신입·주니어)",
        "sections": (
            ("주요업무", (
                ("검색 서비스의 웹 프론트엔드를 개발하고 운영합니다.", None, "application",
                 ("note", "규모가 전제로 깔린 문장",
                  "같은 화면 개발이라도 사용자 수가 전제로 붙으면 기준이 달라집니다. 자격요건의 성능 지표 요구가 여기서 이어집니다.")),
                ("많은 사용자가 동시에 보는 화면의 렌더링 성능을 개선합니다.", "web-performance", "tradeoff",
                 ("note", "성능은 업무 그 자체입니다",
                  "성능이 우대가 아니라 담당업무에 있습니다. 개선할 대상을 스스로 찾아야 하는 자리라는 뜻입니다.")),
                ("공통 컴포넌트 라이브러리를 유지보수하고 사용법을 문서로 남깁니다.", "css-architecture", "application",
                 ("base", "CSS 설계·컴포넌트 체계",
                  "혼자 쓰는 스타일이 아니라 남이 쓰는 컴포넌트를 만듭니다. 공통 컴포넌트를 하나라도 만들어 본 기록이면 이 문장은 충족됩니다.")),
            )),
            ("자격요건", (
                ("React로 컴포넌트를 나누어 화면을 개발한 경험이 있으신 분", "react-component", "application",
                 ("base", "React 컴포넌트로 화면 완성",
                  "경험이 있으신 분의 실질은 완성해 본 사람입니다. 배포까지 끌고 간 화면 하나면 이 문장은 충분히 증명됩니다.")),
                ("TypeScript로 타입을 정의하며 개발해 보신 분", "typescript-typing", "foundation",
                 ("base", "TypeScript 타입 설계",
                  "any 를 쓰지 않고 데이터 모양을 적어 본 정도면 됩니다. 깊은 타입 기교보다 습관을 봅니다.")),
                ("Core Web Vitals 등 성능 지표를 측정하고 개선해 본 경험이 있으신 분", "web-performance", "tradeoff",
                 ("mark", "성능 — 체감이 아니라 측정을 묻습니다",
                  "지표 이름을 명시했다는 것은 감으로 빠르게가 아니라 숫자로 얼마나를 요구한다는 뜻입니다. 신입에게는 개선 규모보다 측정하고 하나를 바꿔 본 과정을 기대합니다.",
                  "high", "같은 직군 60%")),
                ("상태 관리 라이브러리로 데이터 흐름을 설계해 보신 분", "state-management", "application",
                 ("mark", "상태 관리 — 도구 사용이 아니라 흐름 설계",
                  "라이브러리 이름을 고르지 않고 설계라고 적었습니다. 서버 데이터와 화면 상태를 어디서 나눌지 결정해 본 경험을 봅니다.",
                  "high", "같은 직군 80%")),
            )),
            ("우대사항", (
                ("Jest·Testing Library로 컴포넌트 테스트를 작성해 보신 분", "frontend-testing", "application",
                 ("mark", "테스트 — 라벨은 우대, 흐름은 필수 쪽",
                  "공통 컴포넌트를 유지보수하는 팀에서 테스트는 선택이 아닙니다. 라벨만 보고 넘기면 같은 기업군의 다른 공고에서 필수로 만나게 됩니다.",
                  "mid", "같은 직군 60%")),
                ("웹 접근성 지침(WCAG)을 고려해 마크업해 보신 분", "web-accessibility", "foundation",
                 ("note", "접근성 — 알고 쓰는지를 봅니다",
                  "인증 취득 수준이 아니라 시맨틱 태그와 키보드 이동을 의식하는지를 봅니다. 한 화면을 점검해 본 기록이면 대화가 됩니다.")),
                ("Webpack·Vite 등 번들러 설정을 다뤄 보신 분", "bundling-build", "application",
                 ("note", "번들러 — 성능 요구의 뒷면",
                  "성능 지표를 요구하는 공고는 번들 크기를 함께 묻습니다. 두 문장을 하나의 준비로 묶는 것이 효율적입니다.")),
            )),
            ("전형절차", (
                ("서류 전형 → 코딩 테스트 → 기술 면접 → 컬처핏 면접", None, "foundation", None),
                ("전형 일정은 지원자 상황에 따라 조율될 수 있습니다.", None, "foundation", None),
            )),
        ),
        "summary": "화면을 만들 줄 아는 사람 다음의 조건을 봅니다. 기준선 항목은 대체로 공통 기대치 그대로이고, 성능 측정과 상태 흐름 설계, 테스트 습관이 이 공고의 실질 변별점입니다.",
        "summary_ratio": "편차 3건 · 기준선 일치 4건",
    },
    {
        "nn": "02",
        "company_id": "co_viva",
        "company": "비바리퍼블리카",
        "cluster": "fintech_finance",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입/주니어",
        "career_label_raw": "신입~2년",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-01-12T10:00:00+09:00",
        "title": "프론트엔드 개발자 (금융 서비스 웹)",
        "sections": (
            ("주요업무", (
                ("금융 서비스의 웹 화면을 개발하고 운영합니다.", None, "application",
                 ("note", "도메인 신호 — 돈을 다루는 화면",
                  "금액이 잘못 보이면 기능이 동작해도 사고입니다. 자격요건의 상태·예외 요구가 왜 강한지가 이 문장에서 설명됩니다.")),
                ("결제·송금 플로우의 로딩·에러·재시도 화면 상태를 설계합니다.", "state-management", "tradeoff",
                 ("mark", "상태 — 성공 화면만으로는 부족합니다",
                  "결제 플로우는 성공보다 실패의 경우가 많습니다. 로딩과 에러, 재시도까지를 하나의 상태 기계로 그려 본 경험을 기대한다고 읽힙니다.",
                  "high", "같은 직군 80%")),
                ("디자인 시스템 컴포넌트를 개선하고 사용처를 정리합니다.", "css-architecture", "application",
                 ("base", "CSS 설계·컴포넌트 체계",
                  "이미 있는 체계를 고치는 일입니다. 남의 컴포넌트를 읽고 바꿔 본 경험이 이 문장에 맞닿습니다.")),
            )),
            ("자격요건", (
                ("React로 서비스 화면을 개발해 배포해 보신 분", "react-component", "application",
                 ("base", "React 컴포넌트로 화면 완성",
                  "배포까지를 묶어 물었습니다. 로컬에서 도는 결과물보다 주소가 있는 결과물 하나가 강합니다.")),
                ("TypeScript 타입으로 도메인 규칙을 표현할 수 있는 분", "typescript-typing", "application",
                 ("base", "TypeScript 타입 설계",
                  "타입을 문법이 아니라 규칙을 적는 수단으로 씁니다. 금액·통화 같은 값을 타입으로 좁혀 본 예가 있으면 좋습니다.")),
                ("숫자와 금액을 다루는 화면에서 정확성을 지켜 본 경험이 있으신 분", None, "application",
                 ("note", "정확성 — 프론트에도 해당합니다",
                  "표시 형식과 반올림, 통화 단위가 곧 신뢰입니다. 서버만의 일이 아니라는 인식을 보여주는 것이 유효합니다.")),
            )),
            ("우대사항", (
                ("테스트 코드로 결제 플로우를 검증해 보신 분", "frontend-testing", "tradeoff",
                 ("mark", "테스트 — 틀리면 안 되는 흐름이라 필수에 가깝습니다",
                  "결제 플로우는 손으로 매번 확인할 수 없습니다. 라벨은 우대지만 이 도메인에서는 준비 목록에 넣는 편이 안전합니다.",
                  "high", "같은 직군 60%")),
                ("웹 접근성 표준을 지켜 금융 화면을 만들어 보신 분", "web-accessibility", "application",
                 ("mark", "접근성 — 금융권에서는 규제와 맞물립니다",
                  "금융 서비스는 접근성이 권고가 아니라 의무에 가깝습니다. 스크린리더로 한 화면을 통과시켜 본 기록이 이 문장에 직접 답합니다.",
                  "mid", "같은 직군 80%")),
                ("번들 크기와 초기 로딩 시간을 개선해 보신 분", "web-performance", "tradeoff",
                 ("note", "로딩 — 이탈과 직결됩니다",
                  "금융 화면은 첫 진입 속도가 신뢰의 인상을 만듭니다. 번들 분석 리포트 한 장이면 이야기를 시작할 수 있습니다.")),
            )),
            ("전형절차", (
                ("서류 전형 → 과제 전형 → 기술 면접 → 최종 면접", None, "foundation", None),
            )),
        ),
        "summary": "값이 틀리지 않는 화면을 만들 사람을 찾습니다. 기준선은 공통 기대치와 같고, 상태·예외 설계와 테스트, 접근성 세 축이 이 공고의 변별점입니다.",
        "summary_ratio": "편차 3건 · 기준선 일치 3건",
    },
    {
        "nn": "03",
        "company_id": "co_daangn",
        "company": "주식회사 당근마켓",
        "cluster": "startup",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 환영",
        "career_label_raw": "경력 무관",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-02-16T10:00:00+09:00",
        "title": "프론트엔드 개발자 (웹 서비스)",
        "sections": (
            ("주요업무", (
                ("중고거래 웹 서비스의 화면을 개발하고 개선합니다.", None, "application",
                 ("note", "범위가 넓다는 신호",
                  "담당 화면이 정해져 있지 않습니다. 하나를 깊게보다 여러 개를 끝까지 끌고 가 본 경험이 잘 맞습니다.")),
                ("새로 만든 기능을 빠르게 배포하고 사용자 반응을 보며 고칩니다.", None, "application",
                 ("note", "속도 — 완성의 기준이 다릅니다",
                  "완벽한 설계보다 배포된 결과가 먼저입니다. 배포 주기를 스스로 짧게 굴려 본 기록이 그대로 근거가 됩니다.")),
                ("여러 화면에 흩어진 스타일을 공통 규칙으로 정리합니다.", "css-architecture", "application",
                 ("note", "체계가 없는 상태에서 시작합니다",
                  "잘 만들어진 디자인 시스템을 쓰는 자리가 아닙니다. 없는 것을 만들어 본 경험이 우대사항의 요구로 이어집니다.")),
            )),
            ("자격요건", (
                ("React로 화면을 완성해 배포해 본 경험이 있으신 분", "react-component", "application",
                 ("base", "React 컴포넌트로 화면 완성",
                  "요구가 완성과 배포에 걸려 있습니다. 규모가 작아도 끝까지 간 결과물이 여기서는 가장 강합니다.")),
                ("TypeScript를 사용해 보신 분", "typescript-typing", "foundation",
                 ("base", "TypeScript 타입 설계",
                  "사용해 보신 분까지만 적혀 있습니다. 기본 타입과 인터페이스를 쓰는 수준이면 충족됩니다.")),
                ("상태 관리 도구를 한 가지 이상 써 보신 분", "state-management", "foundation",
                 ("base", "상태 관리 흐름 설계",
                  "도구 이름을 열어 두었습니다. 무엇을 썼는지보다 왜 그 도구였는지 한 문장을 준비하면 됩니다.")),
            )),
            ("우대사항", (
                ("Vite 등 빌드 도구를 직접 설정해 보신 분", "bundling-build", "application",
                 ("mark", "빌드 설정 — 스타트업에서는 직접 합니다",
                  "플랫폼 팀이 대신 깔아 주는 환경이 아닙니다. 프로젝트 초기 설정을 스스로 해 본 경험이 이 기업군에서 특히 크게 읽힙니다.",
                  "high", "같은 직군 80%")),
                ("공통 컴포넌트와 디자인 토큰 체계를 만들어 보신 분", "css-architecture", "application",
                 ("mark", "스타일 체계 — 쓰는 사람이 아니라 만드는 사람",
                  "주요업무의 스타일 정리와 짝을 이루는 문장입니다. 색과 여백을 토큰으로 뽑아 본 경험이 있으면 바로 근거가 됩니다.",
                  "mid", "같은 직군 100%")),
                ("간단한 Node.js 서버나 BFF를 만들어 보신 분", None, "foundation",
                 ("note", "직무 밖 요구 — 경계가 얇습니다",
                  "프론트엔드 공고인데 서버를 묻습니다. 인원이 적은 조직에서 자주 나타나는 문장이고, 토이 수준 경험이면 충분합니다.")),
            )),
            ("전형절차", (
                ("서류 전형 → 인터뷰 2회 → 처우 협의", None, "foundation", None),
            )),
        ),
        "summary": "끝까지 만들어 본 사람을 찾습니다. 기준선 항목의 요구 수준은 오히려 낮은 편이고, 없는 것을 직접 만든 경험(빌드 설정·스타일 체계)이 이 공고의 변별점입니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 3건",
    },
    {
        "nn": "04",
        "company_id": "co_channelcorp",
        "company": "주식회사 채널코퍼레이션",
        "cluster": "b2b_saas",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력 3년 이상",
        "career_label_raw": "경력 3~7년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-04-14T10:00:00+09:00",
        "title": "프론트엔드 엔지니어 (상담 데스크 웹)",
        "sections": (
            ("주요업무", (
                ("상담 데스크 웹 애플리케이션을 개발하고 운영합니다.", None, "application",
                 ("note", "오래 켜 두는 화면입니다",
                  "상담사가 하루 종일 띄워 두는 화면입니다. 메모리와 리렌더링이 실제 문제로 나타나는 환경이라는 뜻입니다.")),
                ("실시간 상담 데이터의 상태 동기화 구조를 설계합니다.", "state-management", "tradeoff",
                 ("mark", "상태 — 실시간 동기화까지가 범위",
                  "서버에서 계속 밀려오는 데이터와 화면 상태를 맞추는 일입니다. 화면 안의 상태 관리를 넘어 충돌과 순서를 다뤄 본 경험을 기대합니다.",
                  "high", "같은 직군 80%")),
                ("디자인 시스템과 공통 컴포넌트를 설계하고 배포합니다.", "css-architecture", "tradeoff",
                 ("base", "CSS 설계·컴포넌트 체계",
                  "제품이 여럿이라 컴포넌트를 배포 단위로 다룹니다. 버전과 변경 안내까지 생각해 본 적이 있으면 이야기가 깊어집니다.")),
            )),
            ("자격요건", (
                ("React 기반 웹 애플리케이션을 설계·개발한 경험이 있으신 분", "react-component", "tradeoff",
                 ("base", "React 컴포넌트로 화면 완성",
                  "설계가 함께 붙었습니다. 폴더 구조와 컴포넌트 경계를 왜 그렇게 나눴는지 설명할 수 있어야 합니다.")),
                ("TypeScript로 규모 있는 코드베이스를 다뤄 보신 분", "typescript-typing", "tradeoff",
                 ("base", "TypeScript 타입 설계",
                  "규모가 커지면 타입이 문서 역할을 합니다. 공용 타입을 어떻게 나눴는지가 대화의 소재가 됩니다.")),
                ("컴포넌트 테스트와 회귀 테스트를 운영해 보신 분", "frontend-testing", "application",
                 ("mark", "테스트 — 자격요건에 올라와 있습니다",
                  "우대가 아니라 필수 칸에 있습니다. 고객사가 여럿인 제품은 회귀가 곧 장애라, 테스트가 개발 습관인지를 자격으로 봅니다.",
                  "high", "같은 직군 60%")),
                ("번들 구성을 분석해 빌드·로딩 시간을 줄여 보신 분", "bundling-build", "application",
                 ("mark", "번들 — 제품 규모가 커진 신호",
                  "빌드 시간을 문제로 인식하는 조직입니다. 코드 분할이나 의존성 정리로 무엇이 얼마나 줄었는지 숫자로 말할 수 있으면 강합니다.",
                  "mid", "같은 직군 80%")),
            )),
            ("우대사항", (
                ("웹 접근성 기준을 제품에 적용해 보신 분", "web-accessibility", "application",
                 ("base", "웹 접근성·웹표준 준수",
                  "B2B 제품은 고객사의 접근성 요건을 그대로 받습니다. 우대로 적혀 있어도 계약 조건으로 올라오는 항목입니다.")),
                ("렌더링 성능을 프로파일링해 개선해 보신 분", "web-performance", "tradeoff",
                 ("base", "성능 측정과 개선",
                  "프로파일러로 병목을 찾아 본 경험을 묻습니다. 개선 폭보다 무엇을 근거로 그 지점을 골랐는지가 답입니다.")),
            )),
            ("전형절차", (
                ("서류 전형 → 실무 인터뷰 → 컬처 인터뷰 → 처우 협의", None, "foundation", None),
            )),
        ),
        "summary": "제품을 오래 유지할 사람을 찾습니다. 기준선은 그대로 통하되 실시간 상태 동기화와 테스트 운영, 번들 관리가 이 공고의 추가 요구입니다.",
        "summary_ratio": "편차 3건 · 기준선 일치 5건",
    },
    {
        "nn": "05",
        "company_id": "co_lgcns",
        "company": "엘지씨엔에스",
        "cluster": "si_enterprise",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력 2년 이상",
        "career_label_raw": "경력 2~5년",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-05-26T10:00:00+09:00",
        "title": "웹 프론트엔드 개발자 (공공·금융 SI)",
        "sections": (
            ("주요업무", (
                ("공공·금융 고객 시스템의 업무 화면을 개발합니다.", None, "application",
                 ("note", "고객이 정한 요건을 받습니다",
                  "무엇을 만들지는 제안요청서가 정합니다. 표준을 지키는 능력이 창의보다 먼저 평가되는 자리입니다.")),
                ("웹 접근성 인증 기준에 맞춰 화면을 구현하고 점검합니다.", "web-accessibility", "tradeoff",
                 ("mark", "접근성 — 인증이 걸린 요구입니다",
                  "권고가 아니라 검수 항목입니다. 지침 번호를 근거로 마크업을 고쳐 본 경험이 있으면 이 기업군에서 가장 강한 무기가 됩니다.",
                  "high", "같은 직군 80%")),
                ("화면 개발 표준과 산출물 문서를 작성합니다.", None, "application",
                 ("note", "문서가 결과물의 일부입니다",
                  "코드만으로 끝나지 않습니다. 규칙을 글로 정리해 본 기록이 협업 근거로 쓰입니다.")),
            )),
            ("자격요건", (
                ("React 또는 Vue로 업무 화면을 개발한 경험이 있으신 분", "react-component", "application",
                 ("base", "React 컴포넌트로 화면 완성",
                  "프레임워크를 둘로 열어 두었습니다. 스택 일치보다 업무 화면을 완성해 본 사실 자체를 봅니다.")),
                ("TypeScript 기반 개발 경험이 있으신 분", "typescript-typing", "foundation",
                 ("base", "TypeScript 타입 설계",
                  "기본 수준을 묻습니다. 프로젝트 하나를 타입으로 옮겨 본 경험이면 충분합니다.")),
                ("웹 접근성 지침(KWCAG)을 준수해 마크업해 본 경험이 있으신 분", "web-accessibility", "application",
                 ("base", "웹 접근성·웹표준 준수",
                  "주요업무의 인증 요구와 같은 항목이 자격요건에도 있습니다. 이 회사에서 접근성은 우대가 아니라 전제입니다.")),
                ("CSS 방법론에 따라 스타일 규칙을 문서로 정리해 본 경험이 있으신 분", "css-architecture", "application",
                 ("mark", "스타일 — 규칙을 문서로 남겨야 합니다",
                  "여러 협력사가 같은 화면을 만지는 환경입니다. 개인 취향의 스타일이 아니라 합의된 규칙을 적어 본 경험을 요구합니다.",
                  "mid", "같은 직군 100%")),
            )),
            ("우대사항", (
                ("크로스 브라우저 호환성 대응 경험이 있으신 분", None, "application",
                 ("note", "구형 브라우저가 실제 요건입니다",
                  "공공 사업은 사용자 환경을 고를 수 없습니다. 폴리필과 대체 마크업을 다뤄 본 경험이 여기서는 값을 합니다.")),
                ("빌드·배포 파이프라인을 구성해 보신 분", "bundling-build", "foundation",
                 ("note", "빌드 — 인수인계까지 생각합니다",
                  "떠난 뒤에도 남이 빌드할 수 있어야 합니다. 설정과 절차를 문서로 남긴 경험이 좋게 읽힙니다.")),
            )),
            ("전형절차", (
                ("서류 전형 → 인적성 → 기술 면접 → 임원 면접", None, "foundation", None),
            )),
        ),
        "summary": "정해진 기준을 정확히 지킬 사람을 찾습니다. 기준선 항목의 요구 수준은 평이하지만 접근성 인증과 스타일 규칙 문서화가 이 공고의 실질 관문입니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 4건",
    },
    {
        "nn": "06",
        "company_id": "co_kakao",
        "company": "카카오",
        "cluster": "bigtech_platform",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입/경력",
        "career_label_raw": "신입~3년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-03-10T10:00:00+09:00",
        "title": "프론트엔드 개발자 (서비스 웹)",
        "sections": (
            ("주요업무", (
                ("서비스 웹 화면을 개발하고 개선합니다.", None, "application", None),
                ("공통 스타일과 컴포넌트를 정리합니다.", "css-architecture", "application", None),
            )),
            ("자격요건", (
                ("React로 웹 화면을 개발해 보신 분", "react-component", "application", None),
                ("상태 관리 라이브러리를 사용해 보신 분", "state-management", "foundation", None),
            )),
            ("우대사항", (
                ("TypeScript 사용 경험이 있으신 분", "typescript-typing", "foundation", None),
                ("웹 성능 개선 경험이 있으신 분", "web-performance", "application", None),
                ("테스트 코드를 작성해 보신 분", "frontend-testing", "foundation", None),
            )),
            ("전형절차", (
                ("서류 전형 → 코딩 테스트 → 면접", None, "foundation", None),
            )),
        ),
        "summary": "서비스 화면을 함께 만들 사람을 찾는 공고입니다.",
        "summary_ratio": "이전 기간 공고",
    },
    {
        "nn": "07",
        "company_id": "co_kakaopay",
        "company": "카카오페이",
        "cluster": "fintech_finance",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입~3년",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-01-05T10:00:00+09:00",
        "title": "프론트엔드 개발자 (결제 서비스)",
        "sections": (
            ("주요업무", (
                ("결제 서비스 화면의 스타일과 컴포넌트를 정리합니다.", "css-architecture", "foundation", None),
                ("서비스 화면을 개발하고 운영합니다.", None, "application", None),
            )),
            ("자격요건", (
                ("React로 화면을 개발한 경험이 있으신 분", "react-component", "application", None),
                ("TypeScript로 개발한 경험이 있으신 분", "typescript-typing", "application", None),
            )),
            ("우대사항", (
                ("상태 관리 도구로 데이터 흐름을 다뤄 보신 분", "state-management", "application", None),
                ("웹 접근성을 고려해 마크업해 보신 분", "web-accessibility", "foundation", None),
                ("테스트 코드를 작성해 보신 분", "frontend-testing", "foundation", None),
            )),
            ("전형절차", (
                ("서류 전형 → 과제 → 면접", None, "foundation", None),
            )),
        ),
        "summary": "결제 화면을 담당할 사람을 찾는 공고입니다.",
        "summary_ratio": "이전 기간 공고",
    },
    {
        "nn": "08",
        "company_id": "co_ncsoft",
        "company": "엔씨소프트",
        "cluster": "game",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력 3년 이상",
        "career_label_raw": "경력 3~8년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-04-18T10:00:00+09:00",
        "title": "웹 프론트엔드 개발자 (게임 서비스 플랫폼)",
        "sections": (
            ("주요업무", (
                ("게임 서비스 포털과 인게임 웹뷰 화면을 개발합니다.", None, "application", None),
                ("공통 UI 컴포넌트와 스타일 체계를 관리합니다.", "css-architecture", "application", None),
            )),
            ("자격요건", (
                ("React로 웹 애플리케이션을 개발한 경험이 있으신 분", "react-component", "application", None),
                ("TypeScript로 개발한 경험이 있으신 분", "typescript-typing", "application", None),
                ("많은 사용자가 몰리는 화면의 성능을 개선해 보신 분", "web-performance", "tradeoff", None),
            )),
            ("우대사항", (
                ("번들 크기를 관리해 보신 분", "bundling-build", "application", None),
                ("실시간 데이터를 화면 상태와 동기화해 보신 분", "state-management", "tradeoff", None),
            )),
            ("전형절차", (
                ("서류 전형 → 실무 면접 → 임원 면접", None, "foundation", None),
            )),
        ),
        "summary": "게임 서비스 웹을 담당할 사람을 찾는 공고입니다.",
        "summary_ratio": "이전 기간 공고",
    },
    {
        "nn": "09",
        "company_id": "co_sendbird",
        "company": "센드버드",
        "cluster": "b2b_saas",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력 2년 이상",
        "career_label_raw": "경력 2~6년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-02-20T10:00:00+09:00",
        "title": "프론트엔드 엔지니어 (SDK 대시보드)",
        "sections": (
            ("주요업무", (
                ("대시보드의 데이터 흐름과 화면 상태를 관리합니다.", "state-management", "application", None),
                ("고객사에 제공하는 웹 대시보드를 개발합니다.", None, "application", None),
            )),
            ("자격요건", (
                ("React로 웹 애플리케이션을 개발한 경험이 있으신 분", "react-component", "application", None),
                ("TypeScript로 개발한 경험이 있으신 분", "typescript-typing", "application", None),
                ("컴포넌트 테스트를 작성하고 유지해 보신 분", "frontend-testing", "application", None),
            )),
            ("우대사항", (
                ("웹 접근성 기준을 고려해 개발해 보신 분", "web-accessibility", "foundation", None),
                ("빌드 설정을 관리해 보신 분", "bundling-build", "foundation", None),
            )),
            ("전형절차", (
                ("서류 전형 → 기술 인터뷰 → 최종 인터뷰", None, "foundation", None),
            )),
        ),
        "summary": "고객사 대시보드를 담당할 사람을 찾는 공고입니다.",
        "summary_ratio": "이전 기간 공고",
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
    _historical_posting("12", "04", "2024-11-12T10:00:00+09:00", "entry_junior"),
    _historical_posting("13", "02", "2025-03-17T10:00:00+09:00", "experienced"),
    _historical_posting("14", "05", "2025-07-07T10:00:00+09:00", "experienced"),
    _historical_posting("15", "08", "2025-11-03T10:00:00+09:00", "experienced"),
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
    _expanded_posting("17", "02", RECENT, "2026-01-19T10:00:00+09:00", "entry_junior"),
    _expanded_posting("18", "03", RECENT, "2026-02-23T10:00:00+09:00", "entry_junior"),
    _expanded_posting("19", "03", RECENT, "2026-03-09T10:00:00+09:00", "experienced"),
    _expanded_posting("20", "04", RECENT, "2026-03-23T10:00:00+09:00", "experienced"),
    _expanded_posting("21", "05", RECENT, "2026-04-13T10:00:00+09:00", "entry_junior"),
    _expanded_posting("22", "05", RECENT, "2026-04-27T10:00:00+09:00", "experienced"),
    _expanded_posting("23", "08", RECENT, "2026-05-25T10:00:00+09:00", "entry_junior"),
    _expanded_posting("24", "08", RECENT, "2026-06-22T10:00:00+09:00", "experienced"),
    _expanded_posting("25", "01", PRIOR, "2024-05-13T10:00:00+09:00", "entry_junior"),
    _expanded_posting("26", "03", PRIOR, "2024-09-09T10:00:00+09:00", "entry_junior"),
    _expanded_posting("27", "04", PRIOR, "2025-02-10T10:00:00+09:00", "entry_junior"),
    _expanded_posting("28", "02", PRIOR, "2025-05-12T10:00:00+09:00", "experienced"),
    _expanded_posting("29", "05", PRIOR, "2025-08-11T10:00:00+09:00", "experienced"),
    _expanded_posting("30", "08", PRIOR, "2025-11-10T10:00:00+09:00", "experienced"),
)

# ============================================================ 4. 식별자 helper
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
    """스냅샷 원문. 제목과 구간을 그대로 잇는다."""
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
            ("react-component", "typescript-typing"),
            ("react-component", "state-management"),
            ("css-architecture", "web-accessibility"),
            ("web-performance", "bundling-build"),
            ("state-management", "frontend-testing"),
            ("typescript-typing", "frontend-testing"),
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

                # --- scope_expansion (역할 경계를 넘는 차원을 하나라도 요구한 공고)
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
# CONTRACT 5장 A. tag·type·id·축 라벨은 프론트엔드 전용이다. 백엔드 상수를 옮겨 쓰지 않는다.
SCOPE_EXPANSION_TAGS: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    ("markup_a11y", "퍼블리싱·웹표준", "시맨틱 마크업과 접근성 검수까지 요구",
     ("web-accessibility",)),
    ("qa_test", "QA·테스트", "컴포넌트·회귀 테스트 작성과 운영까지 요구",
     ("frontend-testing",)),
    ("build_env", "빌드·배포 환경", "번들러 설정과 빌드 파이프라인 구성까지 요구",
     ("bundling-build",)),
)

ADVANCED_TYPES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("render_perf", "렌더링 성능·로딩 지표", ("web-performance",)),
    ("state_sync", "실시간 상태 동기화", ("state-management",)),
    ("a11y_standard", "접근성 인증 수준", ("web-accessibility",)),
    ("design_system", "디자인 시스템 설계", ("css-architecture",)),
    ("test_ops", "테스트 운영", ("frontend-testing",)),
)

COMBOS: tuple[tuple[str, str, str, str, tuple[str, ...]], ...] = (
    ("base", "React + TypeScript + 상태 관리",
     "화면을 컴포넌트로 나누고 서버 데이터까지 흐름으로 잇는 기본 조합입니다.",
     "한 서비스 화면을 배포 가능한 수준으로 완성",
     ("react-component", "typescript-typing", "state-management")),
    ("design", "기본 스택 + CSS 설계",
     "재사용 가능한 컴포넌트와 스타일 규칙까지 다루는 조합입니다.",
     "공통 컴포넌트와 토큰을 만들어 본 수준",
     ("react-component", "css-architecture")),
    ("quality", "기본 스택 + 테스트",
     "화면 변경이 다른 화면을 깨뜨리지 않게 막는 조합입니다.",
     "컴포넌트 테스트를 습관으로 쓰는 수준",
     ("react-component", "frontend-testing")),
    ("perf", "웹 성능 + 번들링",
     "로딩과 렌더링 비용을 측정해 줄여 본 경험을 묻는 조합입니다.",
     "개선 전후 지표를 남긴 수준",
     ("web-performance", "bundling-build")),
    ("a11y", "접근성 + CSS 설계",
     "마크업 구조와 스타일을 표준에 맞춰 만드는 조합입니다.",
     "한 화면을 지침 기준으로 점검한 수준",
     ("web-accessibility", "css-architecture")),
)

REALITY_TAGS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("shipped_screen", "배포되어 쓰이는 화면을 완성한 경험",
     ("react-component", "css-architecture")),
    ("measured_quality", "성능·접근성을 수치와 기준으로 확인한 기록",
     ("web-performance", "web-accessibility")),
    ("maintainable_code", "남이 이어받을 수 있게 만든 흔적",
     ("typescript-typing", "frontend-testing", "bundling-build")),
)

CLUSTER_AXES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("render_perf", "렌더링 성능", ("web-performance",)),
    ("state_flow", "상태·데이터 흐름", ("state-management", "typescript-typing")),
    ("design_system", "디자인 시스템", ("css-architecture",)),
    ("a11y_standard", "접근성·웹표준", ("web-accessibility",)),
    ("quality_build", "테스트·빌드 품질", ("frontend-testing", "bundling-build")),
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
    """근거 인용. 실제 공고 본문의 표현을 그대로 쓴다."""
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

    # --- cluster_axes
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
    # 프론트엔드 차원은 대부분 practice 라 종류로 거르면 표가 비어 보인다.
    # 화면의 요구 빈도표는 여덟 차원을 모두 담고 정렬만 등장 수로 한다.
    tech_freq = []
    for slug in DIM_SLUGS:
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

# ============================================================ 7. 해석 payload
BASELINE_ITEMS: tuple[tuple[str, str, str], ...] = (
    ("react-component", "React 컴포넌트로 화면 완성",
     "화면을 컴포넌트로 나누고 상태와 이벤트를 연결해 배포까지 끌고 가는 경험입니다. 만들어 봤다가 아니라 돌려 봤다를 기대하는 문장이 다수입니다."),
    ("typescript-typing", "TypeScript 타입 설계",
     "데이터의 모양을 타입으로 적어 오류를 미리 잡는 습관입니다. 최근 공고에서는 선택이 아니라 전제로 적히는 경우가 대부분입니다."),
    ("state-management", "상태 관리 흐름 설계",
     "서버 데이터와 화면 상태의 경계를 정하고 로딩·에러까지 규칙으로 다루는 능력입니다. 도구 이름보다 왜 그 구조인지를 묻습니다."),
    ("css-architecture", "CSS 설계·컴포넌트 체계",
     "스타일을 재사용 가능한 단위로 나누고 공통 규칙으로 묶는 능력입니다. 혼자 쓰는 스타일과 남이 쓰는 컴포넌트는 다른 일입니다."),
    ("web-performance", "성능 측정과 개선",
     "렌더링과 로딩 비용을 지표로 확인하고 하나를 바꿔 본 경험입니다. 신입에게는 개선 규모보다 측정과 시도를 기대합니다."),
    ("web-accessibility", "웹 접근성·웹표준 준수",
     "시맨틱 마크업과 키보드 이동을 의식하며 화면을 만드는 능력입니다. 직무 경계 밖으로 분류되지만 등장 빈도는 기본기에 가깝습니다."),
    ("frontend-testing", "테스트로 회귀 막기",
     "컴포넌트와 사용자 흐름을 자동 검증해 다른 화면이 깨지는 것을 막는 습관입니다. 우대에서 자격요건으로 올라오는 흐름이 뚜렷합니다."),
    ("bundling-build", "빌드·번들 관리",
     "번들러 설정과 산출물 크기를 다루는 능력입니다. 기준선의 경계선에 걸쳐 있고 조직 규모에 따라 요구 수준이 갈립니다."),
)

# 편차가 아닌 항목의 해설. 기업군마다 편차 목록을 빼고 앞에서 네 개를 쓴다.
UNCHANGED_NOTES: dict[str, tuple[str, str]] = {
    "react-component": ("React 컴포넌트로 화면 완성",
                        "이 기업군도 요구 수준은 공통 기대치와 같습니다. 차별화 지점이 아니라 전제 조건입니다."),
    "typescript-typing": ("TypeScript 타입 설계",
                          "타입 사용 요구는 기업군과 무관하게 동일합니다. 준비했다면 어디에나 통하는 항목입니다."),
    "state-management": ("상태 관리 흐름 설계",
                         "상태 관리 요구 자체는 공통 기대치 그대로입니다. 도구를 하나 깊게 써 본 경험이면 충족됩니다."),
    "css-architecture": ("CSS 설계·컴포넌트 체계",
                         "스타일 구조화 요구는 공통 수준입니다. 심화는 다른 편차 항목이 담당합니다."),
    "web-performance": ("성능 측정과 개선",
                        "성능 요구가 특별히 높지 않습니다. 측정해 본 기록 한 장이면 이 기업군에서는 충분합니다."),
    "web-accessibility": ("웹 접근성·웹표준 준수",
                          "접근성 요구는 공통 기대치 수준입니다. 시맨틱 마크업을 의식하는 정도면 됩니다."),
    "frontend-testing": ("테스트로 회귀 막기",
                         "테스트 요구는 다른 기업군과 같은 수준입니다. 컴포넌트 테스트 몇 개가 그대로 근거가 됩니다."),
    "bundling-build": ("빌드·번들 관리",
                       "빌드 도구 요구는 공통 수준입니다. 설정 파일을 읽고 고쳐 본 경험이면 충족됩니다."),
}

# (slug, 주제, 기준선, 편차, 근거, 해설, 신뢰도, 통계 앵커, 체크 개념 slug)
CLUSTER_DEVIATIONS: dict[str, tuple[tuple[str, ...], ...]] = {
    "bigtech_platform": (
        ("web-performance", "성능", "성능을 고려한 구현", "지표 측정과 개선 전후 비교까지",
         '"Core Web Vitals 등 성능 지표를 측정하고 개선" 문장이 자격요건에 있음',
         "사용자 수가 전제로 깔린 서비스입니다. 신입에게 실무 규모의 개선을 요구하는 것이 아니라, 무엇을 어떻게 측정했고 무엇을 바꿨는지의 과정을 봅니다.",
         "high", "#advanced", "perf-budget"),
        ("state-management", "상태 관리", "상태 관리 도구 사용", "데이터 흐름 설계와 경계 결정까지",
         '"상태 관리 라이브러리로 데이터 흐름을 설계" 문장',
         "화면이 많고 서로 데이터를 주고받습니다. 도구를 써 봤다가 아니라 어디까지를 전역 상태로 둘지 결정해 본 경험을 기대합니다.",
         "high", "#items", "state-design"),
        ("frontend-testing", "테스트", "테스트 경험 있음", "공통 컴포넌트의 회귀를 막는 수준까지",
         "우대사항의 컴포넌트 테스트 문장과 공통 컴포넌트 유지보수 업무의 결합",
         "여러 서비스가 같은 컴포넌트를 씁니다. 라벨은 우대지만 실제로는 변경이 안전한지를 증명하는 수단으로 읽는 것이 맞습니다.",
         "mid", "#items", "test-habit"),
    ),
    "fintech_finance": (
        ("state-management", "상태·예외 설계", "로딩과 에러 처리", "재시도까지 포함한 상태 설계",
         '"결제·송금 플로우의 로딩·에러·재시도 화면 상태를 설계" 문장',
         "결제 플로우는 실패 경로가 성공만큼 많습니다. 화면 상태를 하나의 흐름으로 그려 본 경험이 이 기업군의 최대 변별점입니다.",
         "high", "#items", "state-design"),
        ("frontend-testing", "테스트", "테스트 작성 경험", "금액이 걸린 흐름의 자동 검증까지",
         '우대사항의 "테스트 코드로 결제 플로우를 검증" 문장',
         "손으로 매번 확인할 수 없는 흐름입니다. 라벨은 우대지만 이 도메인에서는 준비 목록에 넣는 편이 안전합니다.",
         "high", "#advanced", "test-habit"),
        ("web-accessibility", "접근성", "시맨틱 마크업 의식", "규제 수준의 접근성 준수까지",
         '"웹 접근성 표준을 지켜 금융 화면을 만들어 보신 분" 문장',
         "금융 서비스의 접근성은 권고가 아니라 의무에 가깝습니다. 한 화면을 지침 기준으로 통과시켜 본 기록이 그대로 답이 됩니다.",
         "mid", "#items", "a11y-audit"),
    ),
    "startup": (
        ("bundling-build", "빌드 환경", "번들러 설정을 읽을 수 있음", "프로젝트 초기 설정을 직접 구성까지",
         '우대사항의 "Vite 등 빌드 도구를 직접 설정" 문장',
         "환경을 깔아 주는 플랫폼 팀이 없습니다. 빈 폴더에서 시작해 본 경험이 이 기업군에서 유독 크게 읽힙니다.",
         "high", "#items", "build-tuning"),
        ("css-architecture", "스타일 체계", "기존 체계 안에서 스타일 작성", "없는 체계를 직접 만들기까지",
         '"공통 컴포넌트와 디자인 토큰 체계를 만들어 보신 분" 문장',
         "잘 정리된 디자인 시스템을 쓰는 자리가 아니라 만드는 자리입니다. 색과 여백을 토큰으로 뽑아 본 경험이 근거가 됩니다.",
         "mid", "#items", "css-system"),
    ),
    "b2b_saas": (
        ("state-management", "상태 관리", "화면 안의 상태 관리", "실시간 동기화와 충돌 처리까지",
         '"실시간 상담 데이터의 상태 동기화 구조를 설계" 문장',
         "서버에서 계속 밀려오는 데이터를 화면과 맞춥니다. 순서와 충돌을 어떻게 다룰지 고민해 본 흔적을 기대합니다.",
         "high", "#items", "state-design"),
        ("frontend-testing", "테스트", "테스트 작성 경험", "회귀 테스트를 운영하는 수준까지",
         '자격요건의 "컴포넌트 테스트와 회귀 테스트를 운영" 문장',
         "고객사가 여럿인 제품은 회귀가 곧 장애입니다. 우대가 아니라 자격요건 칸에 있다는 사실 자체가 신호입니다.",
         "high", "#items", "test-habit"),
        ("bundling-build", "번들 관리", "빌드 도구 사용", "번들 분석과 빌드 시간 개선까지",
         '자격요건의 "번들 구성을 분석해 빌드·로딩 시간을 줄여" 문장',
         "제품이 커져 빌드 시간이 문제로 인식되는 단계입니다. 코드 분할이나 의존성 정리로 무엇이 줄었는지 숫자로 말할 수 있으면 강합니다.",
         "mid", "#items", "build-tuning"),
    ),
    "si_enterprise": (
        ("web-accessibility", "접근성", "시맨틱 마크업 의식", "인증 기준 검수를 통과하는 수준까지",
         '"웹 접근성 인증 기준에 맞춰 화면을 구현하고 점검" 문장',
         "권고가 아니라 검수 항목입니다. 지침 번호를 근거로 마크업을 고쳐 본 경험이 이 기업군에서 가장 강한 무기가 됩니다.",
         "high", "#advanced", "a11y-audit"),
        ("css-architecture", "스타일 규칙", "스타일 구조화", "합의된 규칙의 문서화까지",
         '"CSS 방법론에 따라 스타일 규칙을 문서로 정리" 문장',
         "여러 협력사가 같은 화면을 만집니다. 개인 취향이 아니라 합의된 규칙을 글로 남겨 본 경험을 요구합니다.",
         "mid", "#items", "css-system"),
    ),
    "game": (
        ("web-performance", "성능", "성능을 고려한 구현", "동시 접속이 몰리는 화면의 최적화까지",
         '"많은 사용자가 몰리는 화면의 성능을 개선" 문장',
         "이벤트와 점검 공지에 트래픽이 한꺼번에 몰립니다. 순간 부하를 전제로 화면을 만들어 본 경험을 기대합니다.",
         "mid", "#advanced", "perf-budget"),
        ("state-management", "상태 관리", "화면 상태 관리", "실시간 데이터와의 동기화까지",
         '우대사항의 "실시간 데이터를 화면 상태와 동기화" 문장',
         "게임 서비스는 화면 밖에서 값이 계속 바뀝니다. 폴링이나 소켓으로 들어오는 값을 화면과 맞춰 본 경험이 변별점입니다.",
         "mid", "#items", "state-design"),
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


def unchanged_rows(cluster_id: str | None) -> list[dict[str, Any]]:
    """편차로 잡히지 않은 기준선 항목. 편차와 같은 항목을 두 번 말하지 않는다."""
    devs = () if cluster_id is None else tuple(e[0] for e in CLUSTER_DEVIATIONS[cluster_id])
    rows = []
    for slug, _title, _desc in BASELINE_ITEMS:
        if slug in devs:
            continue
        title, note = UNCHANGED_NOTES[slug]
        rows.append({"item_id": slug, "title": title, "note": note})
        if len(rows) >= 4:
            break
    return rows


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
        "unchanged_note": "읽는 법 — 회색 번호는 프론트엔드 공통 기대치, 파란 번호는 문장 뒤에 숨은 신호, 노란 번호는 이 회사가 유독 원하는 것입니다.",
    }


def interpretation_payload(scope_level: str, scope_id: str) -> dict[str, Any]:
    if scope_level == "overall":
        scope = {"level": "overall", "cluster_tag": None, "posting_id": None}
        deviations: list[dict[str, Any]] = []
        unchanged = unchanged_rows(None)
        posting = None
    elif scope_level == "cluster":
        scope = {"level": "cluster", "cluster_tag": CLUSTERS[scope_id], "posting_id": None}
        deviations = deviation_rows(scope_id)
        unchanged = unchanged_rows(scope_id)
        posting = None
    else:
        row = next(p for p in POSTINGS if posting_id(p["nn"]) == scope_id)
        scope = {
            "level": "posting", "cluster_tag": CLUSTERS[row["cluster"]], "posting_id": scope_id,
        }
        deviations = deviation_rows(row["cluster"])
        unchanged = unchanged_rows(row["cluster"])
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

# ============================================================ 8. 전략 payload
# (slug, 제목, 부제, 이유, 증명 산출물, 채널, kind, 기본 필수 여부)
CONCEPTS: tuple[tuple[str, str, str, str, str, tuple[str, ...], str, bool], ...] = (
    ("spa-project", "React 화면 프로젝트 완성", "배포까지 끌고 간 서비스 화면 하나",
     "기준선 · 최근 공고 전량이 React 화면 개발을 요구합니다", "배포 URL + README + 커밋 기록",
     ("portfolio",), "project", True),
    ("ts-typing", "TypeScript 타입 설계 경험", "데이터 모양을 타입으로 적기",
     "기준선 · 타입 사용이 선택이 아니라 전제로 적힙니다", "도메인 타입 정의 코드 + 왜 그 구조인지 메모",
     ("portfolio", "interview"), "project", True),
    ("state-design", "상태·데이터 흐름 설계", "서버 데이터와 화면 상태의 경계 정하기",
     "상태 흐름 설계는 기업군마다 요구 수준이 가장 크게 갈립니다", "상태 흐름도 + 로딩·에러·재시도 처리 코드",
     ("portfolio", "interview"), "project", True),
    ("css-system", "공통 컴포넌트·스타일 체계", "토큰과 재사용 규칙 만들기",
     "혼자 쓰는 스타일과 남이 쓰는 컴포넌트는 다른 일입니다", "공통 컴포넌트 목록 + 토큰 정의 + 사용 가이드",
     ("portfolio",), "project", True),
    ("perf-budget", "성능 측정·개선 기록", "지표를 재고 하나를 바꾸기",
     "성능은 감이 아니라 숫자로 요구됩니다", "측정 리포트 + 개선 전후 지표 비교",
     ("portfolio", "interview"), "project", True),
    ("a11y-audit", "접근성 점검·개선 기록", "한 화면을 지침 기준으로 통과시키기",
     "직무 경계 밖 요구 중 접근성이 가장 자주 나타납니다", "점검 체크리스트 + 개선 전후 마크업",
     ("portfolio", "interview"), "project", False),
    ("test-habit", "컴포넌트 테스트 습관", "변경이 다른 화면을 깨뜨리지 않게",
     "테스트 요구가 우대에서 자격요건으로 이동하는 중입니다", "테스트 코드 + 회귀를 잡은 사례 기록",
     ("portfolio", "interview"), "project", True),
    ("build-tuning", "빌드·번들 최적화 경험", "번들 분석과 코드 분할",
     "조직 규모에 따라 직접 구성해야 하는 기업군이 있습니다", "번들 분석 리포트 + 설정 변경 근거",
     ("portfolio",), "project", False),
    ("collab-story", "디자이너·기획 협업 서사", "시안과 현실 사이를 조율한 경험",
     "기준선 · 화면 작업은 언제나 남과 맞물립니다", "문제 → 조율 → 결과 서술 준비",
     ("essay",), "story", True),
    ("release-story", "배포하고 고쳐 본 오너십 서사", "내 화면을 끝까지 책임진 경험",
     "완성과 개선의 반복을 요구하는 공고가 늘고 있습니다", "배포 후 피드백 → 개선 기록",
     ("essay", "interview"), "story", False),
    ("render-theory", "브라우저 렌더링 원리 학습", "리렌더링과 리플로우가 생기는 지점",
     "성능 질문의 꼬리는 결국 원리를 묻습니다", "렌더링 흐름 정리 노트 + 실험 기록",
     ("interview",), "study", True),
    ("ts-type-theory", "타입 시스템 심화 학습", "제네릭과 유틸리티 타입의 쓸모",
     "규모 있는 코드베이스를 다루는 공고의 검증 지점입니다", "직접 만든 유틸리티 타입 예제 정리",
     ("interview",), "study", False),
    ("a11y-standard-study", "웹 접근성 지침 학습", "지침 항목과 검사 도구 사용법",
     "인증과 검수를 요구하는 기업군의 이론 바탕입니다", "지침 요약 노트 + 검사 도구 실행 기록",
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
    ("bigtech_platform", ("렌더링 성능", "상태 흐름 설계", "컴포넌트 재사용", "테스트")),
    ("startup", ("완성·배포 속도", "빌드 환경 구성", "스타일 체계", "오너십 서사")),
    ("b2b_saas", ("실시간 상태 동기화", "테스트 운영", "컴포넌트 체계", "번들 관리")),
    ("fintech_finance", ("상태·예외 설계", "테스트", "접근성", "정확한 표시")),
    ("si_enterprise", ("접근성·웹표준", "스타일 규칙 문서", "기본기 정확성", "협업 기록")),
    ("game", ("렌더링 성능", "실시간 상태", "번들 관리", "협업 기록")),
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
                "title": "화면 하나를 끝까지 끌고 간 흔적",
                "body": f"{label} 기준에서도 토이 프로젝트를 여러 개 벌이는 것보다 화면 하나를 배포까지 끌고 간 기록이 강합니다. 주소가 있는 결과물이 첫 문장이 되어야 합니다.",
                "tips": ["README 1절: 무엇을 만들었고 어디서 볼 수 있는가",
                         "화면 캡처보다 배포 주소와 커밋 이력이 먼저입니다"],
                "linked_item_ids": [CONCEPT_INFO["spa-project"]["concept_id"]],
            },
            {
                "title": "보이지 않는 품질이 희소합니다",
                "body": "예쁜 화면은 흔합니다. 로딩과 에러 화면, 키보드 이동, 리렌더링 비용처럼 눈에 잘 안 보이는 것을 다룬 기록이 신입 포트폴리오에서 드뭅니다.",
                "tips": ["로딩·빈 상태·에러 화면을 함께 캡처하세요",
                         "성능이나 접근성 점검 결과 한 장을 붙이세요"],
                "linked_item_ids": [
                    CONCEPT_INFO["state-design"]["concept_id"],
                    CONCEPT_INFO["perf-budget"]["concept_id"],
                ],
            },
        ],
        "intro_orders": orders,
    }
    essay = [
        {
            "kind": "deviation",
            "title": "도구 이름이 아니라 판단으로 쓰기",
            "body": f"{label} 지원 글에서 강한 것은 사용 기술 목록이 아니라 왜 그 구조를 골랐는지입니다. 결정과 근거 중심으로 쓰세요.",
            "narrative": {
                "problem": "화면이 늘면서 같은 데이터가 여러 곳에서 어긋남",
                "solve": "서버 데이터와 화면 상태의 경계를 정하고 흐름을 다시 그림",
                "growth": "상태 관리는 도구 선택이 아니라 경계 설계라는 관점",
            },
            "sample_sentence": "\"라이브러리를 바꾸는 대신 무엇을 전역으로 둘지부터 다시 정했습니다.\"",
            "tips": ["개선 전후를 한 문장으로 대비시키세요"],
            "linked_item_ids": [CONCEPT_INFO["state-design"]["concept_id"]],
        },
        {
            "kind": "narrative_polish",
            "title": "협업 경험 — 보유 소재 다듬기",
            "body": "디자이너·기획과 부딪힌 경험은 대부분 있습니다. 사실 관계는 고정하고 배움의 방점만 기업군에 맞춰 조정하세요.",
            "narrative": None,
            "sample_sentence": None,
            "tips": ["시안과 구현의 차이를 어떻게 좁혔는지 한 문장",
                     "결과 수치나 재작업 감소가 있으면 붙이세요"],
            "linked_item_ids": [CONCEPT_INFO["collab-story"]["concept_id"]],
        },
    ]
    interview = [
        {
            "kicker": "성능 검증",
            "question": "그 화면에서 느린 지점을 어떻게 찾았나요?",
            "followups": ["무엇을 바꿨고 얼마나 좋아졌나요?", "다시 느려지면 무엇부터 보겠어요?"],
            "point": "도구 이름보다 측정 → 원인 → 변경 → 재측정의 순서를 말할 수 있으면 꼬리질문이 두렵지 않습니다.",
            "linked_item_ids": [CONCEPT_INFO["perf-budget"]["concept_id"]],
        },
        {
            "kicker": "설계 검증",
            "question": "어떤 상태를 전역으로 두고 어떤 것을 컴포넌트 안에 두었나요?",
            "followups": ["그 경계를 다시 정한다면 무엇을 바꾸겠어요?", "서버 데이터는 어디서 캐싱했나요?"],
            "point": "정답이 있는 질문이 아닙니다. 기준을 세우고 그 기준을 지켰다는 이야기가 답입니다.",
            "linked_item_ids": [CONCEPT_INFO["state-design"]["concept_id"]],
        },
        {
            "kicker": "기본기 검증",
            "question": "이 컴포넌트를 왜 이렇게 나눴나요?",
            "followups": ["다른 화면에서 재사용할 때 무엇이 걸렸나요?"],
            "point": "기준선 항목은 깊이보다 근거를 봅니다. 재사용을 염두에 뒀다는 한 문장이 필요합니다.",
            "linked_item_ids": [CONCEPT_INFO["css-system"]["concept_id"]],
        },
        {
            "kicker": "태도 검증 · 자소서 연동",
            "question": "자소서에 쓴 협업 갈등, 상대방은 어떻게 기억할까요?",
            "followups": ["같은 상황이 다시 오면 무엇을 다르게 하겠어요?"],
            "point": "자소서 소재는 반드시 면접에서 재검증됩니다. 사실 관계를 스스로 꼬리질문해 보세요.",
            "linked_item_ids": [CONCEPT_INFO["collab-story"]["concept_id"]],
        },
    ]
    return {
        "job": JOB_ROLE_ID, "scope": scope, "checklist": checklist,
        "portfolio": portfolio, "essay": essay, "interview": interview,
        "agent_version": AGENT_VERSION_STRING, "source": "stored",
    }


# ============================================================ 9. 로드맵 payload
ROADMAP_STEPS: tuple[tuple[int, str, int, str, str, str, str, str, tuple[str, ...]], ...] = (
    (1, "STEP 01 · 3주", 3, "vhigh", "서비스 화면 하나를 배포까지 완성하기",
     "새 프로젝트를 벌이지 말고 만들던 화면 하나를 배포까지 끌고 가세요. 컴포넌트 경계와 타입 정의를 함께 정리합니다.",
     "배포 URL + 컴포넌트 구조 설명 + 도메인 타입 정의", "기준선 항목이 채워지지 않으면 다른 준비가 평가에 닿지 않습니다.",
     ("컴포넌트 설계", "타입 정의", "배포")),
    (2, "STEP 02 · 2주", 2, "vhigh", "보이지 않는 상태 채우기",
     "로딩·빈 상태·에러·재시도 화면을 만들고 상태 흐름도를 그리세요. 성공 경로만 있는 결과물은 변별력이 없습니다.",
     "상태 흐름도 + 로딩·에러 화면 캡처 + 처리 코드", "실패 경로를 다룬 기록이 신입 포트폴리오에서 가장 희소합니다.",
     ("상태 설계", "에러 화면", "흐름도")),
    (3, "STEP 03 · 2주", 2, "high", "측정하고 하나를 개선하기",
     "성능 지표와 접근성 점검을 한 번씩 돌리고 그 중 하나를 골라 개선 전후를 기록하세요.",
     "측정 리포트 + 개선 전후 비교 + 점검 체크리스트", "규모를 경험하지 못해도 측정과 시도는 보여줄 수 있습니다.",
     ("성능 측정", "접근성 점검", "지표 비교")),
    (4, "STEP 04 · 2주", 2, "mid", "기업군에 맞춰 마무리하기",
     "지원 기업군의 편차 항목을 채우고 README 와 자소서의 소개 순서를 다시 배치하세요.",
     "편차 항목 산출물 + 기업군 맞춤 소개 순서", "필수가 채워진 뒤의 마무리입니다. 순서만 바꿔도 읽히는 인상이 달라집니다.",
     ("편차 보강", "소개 순서", "문서 정리")),
)

STEP_FILLS: tuple[tuple[str, ...], ...] = (
    ("spa-project", "ts-typing"),
    ("state-design", "css-system"),
    ("perf-budget", "a11y-audit"),
    ("collab-story", "release-story"),
)

STUDY_TRACKS: tuple[tuple[str, str, str, str, str, str, tuple[str, ...]], ...] = (
    ("experience-quality", "STEP 01~03과 병행", "vhigh", "브라우저 렌더링 원리",
     "리렌더링이 언제 일어나는지, 리플로우와 리페인트가 무엇을 다시 계산하는지, 메모이제이션이 언제 손해인지까지 설명할 수 있는 수준까지.",
     "성능 질문의 꼬리는 결국 원리를 묻습니다. 도구 사용법만으로는 두 번째 질문에서 막힙니다.",
     ("render-theory", "perf-budget")),
    ("state-data-flow", "STEP 02와 병행", "high", "타입 시스템 심화",
     "제네릭과 유틸리티 타입을 직접 만들어 보고, 왜 그 타입이 실수를 막는지 예제로 설명할 수 있는 수준까지.",
     "규모 있는 코드베이스를 다루는 공고는 타입을 문서로 씁니다. 문법이 아니라 쓸모를 묻습니다.",
     ("ts-type-theory",)),
    ("frontend-engineering", "상시 · 주 3~4시간", "high", "웹 표준과 접근성 지침",
     "시맨틱 태그의 의미, 키보드 이동과 포커스 관리, 검사 도구로 한 화면을 통과시키는 절차까지.",
     "직무 경계 밖 요구 중 가장 자주 나타나고 준비 비용이 가장 낮은 항목입니다.",
     ("a11y-standard-study", "a11y-audit")),
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


# ============================================================ 10. Wiki 본문
WIKI: dict[str, dict[str, Any]] = {
    "ui-implementation": {
        "why": "최근 공고 전량이 React 화면 개발을 요구하고 대부분 자격요건에 둡니다. 이 역량이 없으면 다른 준비가 평가에 닿지 않습니다.",
        "depth": {"foundation": "시안을 컴포넌트로 나누어 화면을 만든다",
                  "application": "재사용을 염두에 두고 공통 컴포넌트를 뽑는다",
                  "tradeoff": "컴포넌트 경계와 스타일 규칙을 근거와 함께 고른다"},
        "prereq": ["HTML·CSS 기본 구조", "React 의 상태와 이벤트 흐름"],
        "misconceptions": ["화면이 그려지면 완성이라는 생각", "스타일은 마지막에 붙이면 된다는 생각"],
        "interview": ["왜 이렇게 컴포넌트를 나눴나", "다른 화면에서 재사용할 때 무엇이 걸렸나"],
        "sequence": ["화면 하나 완성", "공통 컴포넌트 추출", "스타일 규칙 정리", "배포"],
    },
    "state-data-flow": {
        "why": "상태 흐름 설계는 기업군마다 요구 수준이 가장 크게 갈리는 항목이고, 편차로 잡히는 빈도가 가장 높습니다.",
        "depth": {"foundation": "상태 관리 도구를 하나 써 본다",
                  "application": "서버 데이터와 화면 상태의 경계를 정한다",
                  "tradeoff": "실시간 동기화와 충돌·재시도까지 설계한다"},
        "prereq": ["비동기 처리와 프로미스", "React 의 렌더링 단위"],
        "misconceptions": ["전역 상태가 많을수록 편하다는 생각", "로딩과 에러는 나중 일이라는 생각"],
        "interview": ["무엇을 전역으로 두었나", "실패했을 때 화면은 어떻게 되나"],
        "sequence": ["상태 목록화", "경계 정하기", "로딩·에러 처리", "동기화 설계"],
    },
    "experience-quality": {
        "why": "성능 지표와 접근성 기준을 명시하는 공고가 늘고 있으며, 신입 공고에도 심화 신호로 나타납니다.",
        "depth": {"foundation": "지표 이름과 검사 도구를 안다",
                  "application": "측정해 병목을 찾고 하나를 고친다",
                  "tradeoff": "성능과 구현 복잡도를 견줘 선택을 설명한다"},
        "prereq": ["브라우저 렌더링 흐름", "검사 도구 사용법"],
        "misconceptions": ["빨라 보이면 빠르다는 생각", "접근성은 장애인만을 위한 것이라는 생각"],
        "interview": ["느린 지점을 어떻게 찾았나", "키보드로만 이 화면을 쓸 수 있나"],
        "sequence": ["지표 측정", "병목 찾기", "개선과 재측정", "점검 자동화"],
    },
    "frontend-engineering": {
        "why": "테스트와 빌드 요구가 우대에서 자격요건으로 이동하는 흐름이 통계에서 뚜렷합니다.",
        "depth": {"foundation": "테스트를 몇 개 써 보고 빌드 설정을 읽는다",
                  "application": "회귀를 막는 테스트를 유지하고 번들을 분석한다",
                  "tradeoff": "무엇을 테스트하지 않을지와 분할 기준을 정한다"},
        "prereq": ["테스트 도구 기본 사용", "모듈과 의존성 개념"],
        "misconceptions": ["커버리지가 품질이라는 생각", "빌드 설정은 남의 일이라는 생각"],
        "interview": ["무엇을 테스트하지 않았나", "번들에서 무엇을 덜어냈나"],
        "sequence": ["테스트 도입", "회귀 사례 기록", "번들 분석", "설정 문서화"],
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

    # `dataset_versions` 는 만들지 않는다. A1(backend) 이 아홉 직무 공용 행을 만든다.

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

    role_node = node("semantic", "JobRole", "job_roles", JOB_ROLE_ID, "프론트엔드 개발자")
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
            f"{DIM_INFO[slug]['label']} 은 최근 1년 프론트엔드 공고의 {freq_pct(slug, RECENT)}% 에 나타난다.",
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

    for slug in ("spa-project", "state-design"):
        info = CONCEPT_INFO[slug]
        claim_id = add_claim(
            strat_outputs["overall"], "strategy", None, "overall", JOB_ROLE_ID,
            f"{info['title']} 은 프론트엔드 지원 준비에서 우선순위가 높다.",
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
            "react-component" if scope_level == "overall"
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

    # --- 42 검증 결과 (검사 1~4 pass, 5~7 은 판정자가 없어 적용 대상이 아니다)
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
            "note": "판정자를 주입하지 않아 적용 대상이 아니다" if verdict == "skip"
            else "생성 시드가 자기검사로 확인했다",
            "status": "not_applicable" if verdict == "skip" else "checked",
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

# 마이그레이션이나 다른 갈래가 넣는 기준 데이터. 조각 밖의 외래키는 이 목록 안에 있어야 한다.
BASE_JOB_ROLES = frozenset({JOB_ROLE_ID})
BASE_PERIODS = frozenset(PERIODS)
BASE_CLUSTERS = frozenset(CLUSTERS)
BASE_COMPANIES = frozenset(p["company_id"] for p in POSTINGS)
BASE_METRIC_POLICIES = frozenset(METRIC_POLICY.values())
# `dataset_versions` 는 A1 이 만든다. 이 조각에는 행이 없고 값만 참조한다.
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
    counts_by_type: Counter[str] = Counter()
    for row in tables["analysis_outputs"]:
        payload = row["payload"]
        counts_by_type[row["output_type"]] += 1
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
        if row["output_type"] == "interpretation":
            for key in ("level", "cluster_tag", "posting_id"):
                if key not in payload["scope"]:
                    problems.append(f"{row['output_id']}: scope.{key} 없음")
            if not 7 <= len(payload["baseline"]) <= 9:
                problems.append(f"{row['output_id']}: baseline 개수 {len(payload['baseline'])}")
            if not 3 <= len(payload["unchanged"]) <= 4:
                problems.append(f"{row['output_id']}: unchanged 개수 {len(payload['unchanged'])}")
            if payload["scope"]["level"] != "overall" and not 2 <= len(payload["deviations"]) <= 4:
                problems.append(f"{row['output_id']}: deviations 개수 {len(payload['deviations'])}")
    # CONTRACT 4절 — 직무당 52행.
    expected = {"statistics": 1, "interpretation": 37, "strategy": 7, "roadmap": 7}
    for output_type, n in expected.items():
        if counts_by_type[output_type] != n:
            problems.append(
                f"analysis_outputs: {output_type} {counts_by_type[output_type]}행 (기대 {n})"
            )
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
        problems.append("frontend 모듈은 dataset_versions 행을 만들면 안 됩니다")
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
