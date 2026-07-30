"""게임 개발자(클라이언트) 직무의 생성 데모 시드 (갈래 A9).

``agent/data/demo_seed/CONTRACT.md`` 가 이 파일의 기준이다. 데이터베이스에 접속하지
않고 메모리에서 계산해 ``parts/game_client/<table>.csv`` 로만 낸다. 모델 호출은 0회다.

``dataset_versions`` 는 A1(backend) 만 만든다. 아홉 직무가 함께 쓰는 한 행이므로 이
모듈은 그 표를 채우지 않는다.

CONTRACT 10.5 의 `allowed_uses` 예시값(`baseline`·`evidence`)은 `0001_initial_schema.sql`
의 `allowed_uses_known` CHECK 가 허용하지 않는다. A1 과 같은 값을 쓴다.

실행: ``cd agent && python -m scripts.demo_seed.game_client``
"""

from __future__ import annotations

import json
import math
from collections import Counter
from typing import Any

from ._csv import demo_seed_root, sha256_hex, write_part

# ============================================================ 식별자
JOB_ROLE_ID = "game_client"
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
    ("stats", "통계 분석", "obj_game_client_statistics", "slots_filled"),
    ("knowledge", "지식 구축", "obj_game_client_knowledge", "slots_filled"),
    ("interpretation", "채용공고 해석", "obj_game_client_interpretation", "slots_filled"),
    ("strategy", "합격 전략", "obj_game_client_strategy", "slots_filled"),
    ("roadmap", "준비 로드맵", "obj_game_client_roadmap", "slots_filled"),
    ("aggregation", "지표 집계", "obj_game_client_aggregation", "no_new_evidence"),
)


def run_id(agent: str) -> str:
    return f"run_demo_{JOB_ROLE_ID}_{agent}"


# ============================================================ 1. 요구 차원 5종
# (slug, dimension_kind, 표시 라벨, 정의, 별칭, 역할 경계 여부)
DIMENSIONS: tuple[tuple[str, str, str, str, tuple[str, ...], bool], ...] = (
    (
        "unity-csharp",
        "technology",
        "Unity·C# 클라이언트 구현",
        "Unity 엔진과 C# 로 게임 화면·입력·인게임 로직을 구현하고 빌드까지 만드는 요구.",
        ("Unity", "C#", "유니티 클라이언트"),
        False,
    ),
    (
        "unreal-cpp",
        "technology",
        "Unreal·C++ 클라이언트 구현",
        "언리얼 엔진의 액터·컴포넌트 구조 위에서 C++ 로 게임플레이 기능을 구현하는 요구.",
        ("Unreal Engine", "언리얼 엔진", "C++"),
        False,
    ),
    (
        "graphics-opt",
        "practice",
        "그래픽스·렌더링 최적화",
        "드로우콜·배칭·셰이더 비용을 계측해 목표 프레임 예산 안으로 렌더링 부하를 낮추는 요구.",
        ("렌더링 최적화", "드로우콜", "프로파일링"),
        False,
    ),
    (
        "game-math",
        "domain",
        "게임 수학·물리",
        "벡터·행렬·쿼터니언과 충돌·보간 등 게임 안의 움직임을 다루는 수학적 기초 요구.",
        ("3D 게임 수학", "쿼터니언", "충돌 처리"),
        False,
    ),
    (
        "net-sync",
        "practice",
        "클라이언트 네트워크 동기화",
        "서버 상태를 화면에 맞추는 보간·예측·보정과 지연 보상의 이해 요구. 서버 경계에 걸린다.",
        ("상태 동기화", "클라이언트 예측", "지연 보상"),
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
    ("unity-csharp", "graphics-opt", "related"),
    ("unreal-cpp", "graphics-opt", "related"),
    ("game-math", "net-sync", "related"),
    ("unity-csharp", "game-math", "related"),
    ("unreal-cpp", "game-math", "related"),
)

# ============================================================ 2. 역량 3종
CAPABILITIES: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    (
        "gameplay-impl",
        "엔진 기반 게임플레이 구현",
        "선택한 엔진의 구조 위에서 조작·전투·UI 를 완성하고 플레이 가능한 빌드로 내보내는 능력.",
        ("unity-csharp", "unreal-cpp", "game-math"),
    ),
    (
        "runtime-perf",
        "런타임 성능 확보",
        "목표 단말의 프레임 예산을 정하고 계측과 개선으로 그 예산을 지키는 능력.",
        ("graphics-opt", "unity-csharp"),
    ),
    (
        "multiplay-sync",
        "멀티플레이 동기화 이해",
        "서버 상태와 화면의 차이를 보간·예측·보정으로 메우고 그 선택을 설명하는 능력.",
        ("net-sync", "game-math"),
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
    ("gameplay-impl", "runtime-perf"),
    ("gameplay-impl", "multiplay-sync"),
)


# ============================================================ 3. 채용공고 30건
# 한 줄은 (본문, 차원 slug 또는 None, depth_level, 주석) 이다.
# 주석은 recent 5건에만 붙는다. 해석 payload 의 세 종류 번호가 여기서 나온다.
#   ("base", 직무 공통 기대치 항목명, 해설)                  → base_n
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
        "company_id": "co_ncsoft",
        "company": "엔씨소프트",
        "cluster": "game",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입~3년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-03-04T10:00:00+09:00",
        "title": "MMORPG 클라이언트 개발 (신입·주니어)",
        "sections": (
            ("주요업무", (
                ("언리얼 엔진 5 기반 MMORPG 클라이언트의 전투·이동 게임플레이 로직을 구현합니다.", "unreal-cpp", "application",
                 ("base", "C++·언리얼 게임플레이 구현",
                  "엔진 위에서 기능을 붙여 본 사람을 찾는 문장입니다. 전투 하나를 C++ 로 끝까지 구현한 기록이면 이 문장은 충족됩니다.")),
                ("서버가 내려주는 캐릭터 상태 패킷을 클라이언트에서 보간해 자연스러운 움직임을 만듭니다.", "net-sync", "application",
                 ("note", "동기화 신호 — 화면과 서버의 시차",
                  "패킷을 그대로 그리면 캐릭터가 끊깁니다. 보간이라는 단어가 들어간 순간 지연을 어떻게 감출지 아는 사람을 찾는 문장이 됩니다.")),
                ("대규모 전투 구간의 프레임 저하를 프로파일링하고 개선안을 제안합니다.", "graphics-opt", "tradeoff",
                 ("mark", "성능 — 계측과 개선안까지 요구",
                  "최적화에 관심이 아니라 프로파일링과 개선안 제안입니다. 무엇이 병목이었고 무엇을 포기했는지 말할 수 있어야 합니다.",
                  "high", "같은 직군 100%")),
                ("아트·기획 직군과 협업해 인게임 연출을 다듬습니다.", None, "foundation", None),
            )),
            ("자격요건", (
                ("C++ 로 게임플레이 로직을 작성하고 언리얼 엔진의 액터·컴포넌트 구조를 이해하는 분", "unreal-cpp", "application",
                 ("base", "C++·언리얼 게임플레이 구현",
                  "언어와 엔진 구조를 함께 묻습니다. 액터와 컴포넌트가 왜 나뉘어 있는지 설명할 수 있으면 충분합니다.")),
                ("벡터·행렬·쿼터니언 등 3D 게임 수학의 기본 개념을 설명할 수 있는 분", "game-math", "foundation",
                 ("base", "벡터·쿼터니언 등 게임 수학",
                  "계산을 시키는 것이 아니라 설명을 시킵니다. 짐벌락을 왜 피하는지 한 문단으로 쓸 수 있으면 됩니다.")),
                ("직접 완성해 플레이 가능한 빌드를 하나 이상 만들어 본 경험이 있는 분", "unity-csharp", "foundation",
                 ("base", "플레이 가능한 결과물 제출",
                  "엔진을 가리지 않는 문장입니다. Unity 로 만든 빌드여도 완성했다는 사실 자체가 이 요건을 채웁니다.")),
            )),
            ("우대사항", (
                ("클라이언트 예측과 서버 보정 등 네트워크 동기화 기법을 다뤄 본 경험", "net-sync", "tradeoff",
                 ("mark", "넷코드 — 우대 표기지만 주요업무와 짝을 이룸",
                  "주요업무의 보간 문장과 함께 읽으면 다릅니다. 예측과 보정을 구분해 말할 수 있으면 이 공고에서 가장 큰 차이가 납니다.",
                  "high", "같은 직군 100%")),
                ("렌더링 파이프라인과 드로우콜 절감에 관심이 있는 분", "graphics-opt", "foundation",
                 ("note", "렌더링 — 관심은 최소선입니다",
                  "관심이라는 말이 붙었지만 주요업무는 개선안 제안을 시킵니다. 드로우콜을 실제로 줄여 본 기록 한 건이면 우대를 넘어섭니다.")),
            )),
        ),
        "summary": "엔진 위에서 기능을 붙여 본 사람 가운데 프레임과 동기화를 함께 말할 수 있는 지원자를 찾습니다. 직무 공통 기대치 항목은 공통 기대치 그대로이고, 성능 계측과 넷코드 두 축이 이 공고의 실질 변별점입니다.",
        "summary_ratio": "추가 요구 2건 · 직무 공통 기대치 일치 4건",
    },
    {
        "nn": "02",
        "company_id": "co_krafton",
        "company": "크래프톤",
        "cluster": "game",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입",
        "career_label_raw": "신입",
        "edu_label_raw": "대졸 이상",
        "posted_at": "2026-01-12T10:00:00+09:00",
        "title": "슈팅 게임 클라이언트 개발 신입 채용",
        "sections": (
            ("주요업무", (
                ("언리얼 엔진 기반 슈팅 게임의 캐릭터 조작과 사격 판정을 구현합니다.", "unreal-cpp", "application",
                 ("base", "C++·언리얼 게임플레이 구현",
                  "조작감과 판정은 게임플레이 구현의 핵심입니다. 입력에서 판정까지 흐름을 직접 짜 본 경험이 그대로 답이 됩니다.")),
                ("멀티플레이 환경에서 생기는 위치 불일치를 줄이는 보정 로직을 다듬습니다.", "net-sync", "application",
                 ("note", "위치 불일치 — 슈팅 장르의 숙제",
                  "쏜 순간과 맞은 순간이 클라이언트마다 다릅니다. 이 문장은 지연 보상을 실제 문제로 겪어 본 사람을 찾습니다.")),
                ("콘솔·PC 빌드의 프레임 예산을 지키기 위해 렌더링 비용을 계측합니다.", "graphics-opt", "tradeoff",
                 ("mark", "프레임 예산 — 숫자로 관리되는 성능",
                  "예산이라는 말은 목표 수치가 있다는 뜻입니다. 몇 ms 를 어디에 썼는지로 말하는 훈련이 필요합니다.",
                  "high", "같은 직군 100%")),
            )),
            ("자격요건", (
                ("C++ 와 언리얼 엔진으로 게임플레이 기능을 구현해 본 경험이 있는 분", "unreal-cpp", "application",
                 ("base", "C++·언리얼 게임플레이 구현",
                  "신입 공고인데 구현 경험을 자격요건에 둡니다. 학습 이력이 아니라 결과물 하나가 기준입니다.")),
                ("지연 보상과 클라이언트 예측 같은 네트워크 동기화 개념을 이해하는 분", "net-sync", "foundation",
                 ("mark", "넷코드가 자격요건에 올라온 사례",
                  "다른 기업군에서는 우대이던 항목이 여기서는 자격요건입니다. 개념 설명 수준이라도 준비 여부가 갈립니다.",
                  "high", "같은 직군 100%")),
                ("프로파일러로 병목을 찾아 렌더링 비용을 줄여 본 경험이 있는 분", "graphics-opt", "tradeoff",
                 ("base", "계측으로 병목을 찾는 습관",
                  "도구 이름이 아니라 찾아서 줄였다는 사실을 봅니다. 개선 전후 수치 한 장이 가장 강한 근거입니다.")),
            )),
            ("우대사항", (
                ("충돌 판정과 물리 시뮬레이션의 수학적 배경을 설명할 수 있는 분", "game-math", "application",
                 ("base", "벡터·쿼터니언 등 게임 수학",
                  "장르 특성상 판정의 수학이 곧 게임성입니다. 레이캐스트와 히트박스를 직접 다뤄 본 경험이면 충분합니다.")),
                ("Unity 와 C# 로 만든 개인 프로젝트를 보유한 분", "unity-csharp", "foundation",
                 ("note", "엔진을 가리지 않는 신호",
                  "주력은 언리얼이지만 Unity 결과물도 인정합니다. 엔진보다 완성 경험을 본다는 뜻으로 읽으면 됩니다.")),
            )),
        ),
        "summary": "장르가 요구하는 조작감과 동기화를 함께 이해하는 지원자를 찾습니다. 넷코드가 우대가 아니라 자격요건에 올라와 있다는 점이 이 공고를 다른 공고와 가르는 지점입니다.",
        "summary_ratio": "추가 요구 2건 · 직무 공통 기대치 일치 4건",
    },
    {
        "nn": "03",
        "company_id": "co_kakao",
        "company": "카카오",
        "cluster": "bigtech_platform",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 가능",
        "career_label_raw": "신입·주니어",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-02-24T10:00:00+09:00",
        "title": "캐주얼 게임 클라이언트 개발자 (신입)",
        "sections": (
            ("주요업무", (
                ("Unity 와 C# 로 캐주얼 게임의 UI 와 인게임 로직을 구현합니다.", "unity-csharp", "application",
                 ("base", "엔진으로 완성한 플레이 빌드",
                  "화면과 로직을 함께 맡깁니다. UI 를 붙여 본 경험이 인게임 로직만큼 평가에 들어갑니다.")),
                ("저사양 안드로이드 단말에서도 60프레임을 유지하도록 렌더링 비용을 줄입니다.", "graphics-opt", "tradeoff",
                 ("mark", "저사양 단말 — 목표 수치가 명시된 성능 요구",
                  "60프레임이라는 숫자가 문장에 있습니다. 어떤 기기에서 몇 프레임이 나왔는지로 말하는 준비가 필요합니다.",
                  "high", "같은 직군 100%")),
                ("실시간 랭킹 갱신을 위해 서버 상태를 화면에 동기화합니다.", "net-sync", "foundation",
                 ("note", "동기화 — 장르에 따라 가벼워집니다",
                  "실시간 전투가 아니라 랭킹 갱신입니다. 예측·보정까지는 아니고 서버 상태를 화면에 맞추는 수준이면 됩니다.")),
            )),
            ("자격요건", (
                ("Unity 와 C# 로 게임 화면과 로직을 만들어 본 경험이 있는 분", "unity-csharp", "application",
                 ("base", "엔진으로 완성한 플레이 빌드",
                  "신입 자격요건의 표준 문장입니다. 완성한 빌드 하나가 이 항목의 답입니다.")),
                ("드로우콜과 배칭 등 모바일 렌더링 최적화의 기본을 아는 분", "graphics-opt", "application",
                 ("base", "프레임 예산·렌더링 비용 관리",
                  "모바일이라는 단서가 붙었습니다. 배칭이 왜 드로우콜을 줄이는지 설명할 수 있으면 기본은 채워집니다.")),
            )),
            ("우대사항", (
                ("좌표 변환과 보간 등 게임 수학을 코드로 다뤄 본 경험", "game-math", "foundation",
                 ("base", "벡터·쿼터니언 등 게임 수학",
                  "라벨은 우대지만 인게임 로직을 짜면 자연히 쓰는 내용입니다. 준비해 두면 면접에서 되돌려 받습니다.")),
                ("소켓 통신으로 실시간 상태를 주고받아 본 경험", "net-sync", "foundation",
                 ("note", "서버 경계 — 직무 밖으로 조금 넘어갑니다",
                  "클라이언트 공고인데 통신 계층을 묻습니다. 직무 외 요구로 분류되지만 랭킹·랭크전 콘텐츠에서는 흔한 문장입니다.")),
            )),
        ),
        "summary": "모바일 저사양 환경에서 목표 프레임을 지키는 일이 이 공고의 중심입니다. 엔진 구현 기본기 위에 기기별 성능 수치를 말할 수 있는 준비가 붙으면 강한 지원이 됩니다.",
        "summary_ratio": "추가 요구 1건 · 직무 공통 기대치 일치 4건",
    },
    {
        "nn": "04",
        "company_id": "co_samsungsds",
        "company": "삼성에스디에스",
        "cluster": "si_enterprise",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "경력 3년 이상",
        "edu_label_raw": "대졸 이상",
        "posted_at": "2026-04-08T10:00:00+09:00",
        "title": "XR 시뮬레이션 클라이언트 개발 (경력)",
        "sections": (
            ("주요업무", (
                ("Unity 기반 산업용 XR 시뮬레이터의 인터랙션과 씬 구성을 구현합니다.", "unity-csharp", "application",
                 ("base", "엔진으로 완성한 플레이 빌드",
                  "게임이 아니라 시뮬레이터지만 요구하는 구현 능력은 같습니다. 엔진 경험은 도메인을 건너 인정됩니다.")),
                ("대형 3D 모델 씬의 렌더링 비용을 낮춰 현장 장비에서 안정적으로 동작하게 합니다.", "graphics-opt", "tradeoff",
                 ("mark", "현장 장비 — 고정된 하드웨어가 예산을 정합니다",
                  "단말을 고를 수 없는 환경입니다. LOD·컬링 같은 선택의 근거를 문서로 남긴 경험이 그대로 평가 대상이 됩니다.",
                  "high", "같은 직군 100%")),
                ("다중 사용자 세션에서 객체 상태를 동기화합니다.", "net-sync", "application",
                 ("note", "동기화 — 협업 시뮬레이션의 전제",
                  "같은 공간을 여럿이 봅니다. 게임과 용어만 다를 뿐 상태 동기화의 문제는 동일합니다.")),
            )),
            ("자격요건", (
                ("Unity 와 C# 로 상용 제품을 개발한 3년 이상의 경력을 갖춘 분", "unity-csharp", "tradeoff",
                 ("base", "엔진으로 완성한 플레이 빌드",
                  "경력 공고라 완성이 아니라 상용을 요구합니다. 신입 직무 공통 기대치의 상한선이 어디인지 보여주는 문장입니다.")),
                ("좌표계 변환과 회전 표현 등 3D 수학을 실무에서 다뤄 본 경험이 있는 분", "game-math", "application",
                 ("base", "벡터·쿼터니언 등 게임 수학",
                  "실무에서라는 단서가 붙었습니다. 개념 설명을 넘어 좌표계가 뒤틀린 버그를 잡아 본 이야기가 필요합니다.")),
            )),
            ("우대사항", (
                ("셰이더와 LOD 를 조정해 렌더링 부하를 낮춰 본 경험", "graphics-opt", "tradeoff",
                 ("mark", "테크니컬 아트 경계 — 직무 밖 요구",
                  "셰이더 조정은 아트 파이프라인에 걸칩니다. 클라이언트 개발자에게 이 영역을 함께 묻는 팀이 늘고 있습니다.",
                  "mid", "같은 직군 100%")),
                ("언리얼 엔진과 C++ 를 사용해 본 경험", "unreal-cpp", "foundation",
                 ("note", "두 엔진을 모두 두는 조직",
                  "프로젝트마다 엔진이 다릅니다. 주력 하나에 다른 엔진의 기초가 붙으면 배치 폭이 넓어집니다.")),
            )),
        ),
        "summary": "게임이 아닌 산업 도메인이지만 요구하는 클라이언트 역량은 같습니다. 고정된 현장 장비에서 성능을 맞춘 경험과 3D 수학의 실무 적용이 변별점입니다.",
        "summary_ratio": "추가 요구 2건 · 직무 공통 기대치 일치 4건",
    },
    {
        "nn": "05",
        "company_id": "co_nudgehealthcare",
        "company": "넛지헬스케어",
        "cluster": "startup",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "경력 2년 이상",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-06-02T10:00:00+09:00",
        "title": "리워드 앱 미니게임 클라이언트 개발 (경력)",
        "sections": (
            ("주요업무", (
                ("Unity 와 C# 로 앱 안에서 동작하는 미니게임 콘텐츠를 구현합니다.", "unity-csharp", "application",
                 ("base", "엔진으로 완성한 플레이 빌드",
                  "앱 안에 얹히는 콘텐츠라 규모는 작습니다. 대신 짧은 주기로 완성해 내는 속도가 평가됩니다.")),
                ("저사양 단말의 발열과 배터리를 고려해 렌더링 부하를 조절합니다.", "graphics-opt", "application",
                 ("mark", "발열·배터리 — 프레임 말고도 지켜야 할 예산",
                  "게임 전용 기기가 아니라 생활 앱입니다. 프레임을 올리는 것이 아니라 낮춰서 오래 버티게 만드는 판단이 필요합니다.",
                  "mid", "같은 직군 100%")),
            )),
            ("자격요건", (
                ("Unity 와 C# 로 상용 앱에 탑재된 콘텐츠를 개발해 본 경험이 있는 분", "unity-csharp", "application",
                 ("base", "엔진으로 완성한 플레이 빌드",
                  "앱에 실려 사용자에게 닿은 결과물을 봅니다. 스토어 링크 하나가 긴 설명을 대신합니다.")),
                ("물리 엔진과 충돌 처리의 동작 원리를 이해하는 분", "game-math", "foundation",
                 ("base", "벡터·쿼터니언 등 게임 수학",
                  "미니게임의 재미는 대부분 물리에서 나옵니다. 엔진이 대신 계산해 주더라도 원리를 알아야 값을 고칠 수 있습니다.")),
            )),
            ("우대사항", (
                ("서버와 게임 상태를 동기화하는 구조를 설계해 본 경험", "net-sync", "application",
                 ("note", "리워드 — 값이 틀리면 돈이 틀립니다",
                  "게임 상태가 리워드로 이어집니다. 동기화 실패가 곧 보상 오류라서 설계 경험을 우대에 둔 것으로 읽힙니다.")),
                ("메모리 사용량과 드로우콜을 계측해 개선해 본 경험", "graphics-opt", "application",
                 ("base", "계측으로 병목을 찾는 습관",
                  "작은 콘텐츠일수록 앱 전체 자원을 나눠 씁니다. 계측 습관이 있는 사람을 우선한다는 뜻입니다.")),
            )),
        ),
        "summary": "작은 콘텐츠를 빠르게 완성하면서도 기기 자원을 아끼는 판단을 함께 요구합니다. 프레임을 올리는 최적화가 아니라 자원을 덜 쓰는 최적화가 이 팀의 언어입니다.",
        "summary_ratio": "추가 요구 1건 · 직무 공통 기대치 일치 4건",
    },
    {
        "nn": "06",
        "company_id": "co_channelcorp",
        "company": "채널코퍼레이션",
        "cluster": "b2b_saas",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입",
        "career_label_raw": "신입",
        "edu_label_raw": "대졸 이상",
        "posted_at": "2026-05-14T10:00:00+09:00",
        "title": "온라인 게임 클라이언트 개발 신입 채용",
        "sections": (
            ("주요업무", (
                ("언리얼 엔진으로 인게임 콘텐츠와 UI 를 구현합니다.", "unreal-cpp", "foundation", None),
                ("서버에서 내려오는 캐릭터 상태를 화면에 반영합니다.", "net-sync", "foundation", None),
            )),
            ("자격요건", (
                ("C++ 와 언리얼 엔진의 기본 구조를 이해하는 분", "unreal-cpp", "foundation", None),
                ("3D 게임 수학의 기본기를 갖춘 분", "game-math", "foundation", None),
            )),
            ("우대사항", (
                ("렌더링 최적화에 관심이 있는 분", "graphics-opt", "foundation", None),
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
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입·주니어",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-04-21T10:00:00+09:00",
        "title": "모바일 게임 클라이언트 개발 신입",
        "sections": (
            ("주요업무", (
                ("Unity 와 C# 로 모바일 게임의 인게임 기능을 구현합니다.", "unity-csharp", "foundation", None),
                ("클라이언트와 서버의 상태 차이를 확인하고 화면에 반영합니다.", "net-sync", "foundation", None),
            )),
            ("자격요건", (
                ("Unity 와 C# 로 게임을 만들어 본 경험이 있는 분", "unity-csharp", "foundation", None),
                ("게임 수학의 기본 개념을 이해하는 분", "game-math", "foundation", None),
            )),
            ("우대사항", (
                ("프레임 저하 구간을 계측해 본 경험", "graphics-opt", "application", None),
            )),
        ),
        "summary": None,
        "summary_ratio": None,
    },
    {
        "nn": "08",
        "company_id": "co_navercloud",
        "company": "네이버클라우드",
        "cluster": "b2b_saas",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "경력 3년 이상",
        "edu_label_raw": "대졸 이상",
        "posted_at": "2026-03-17T10:00:00+09:00",
        "title": "클라우드 게임 스트리밍 클라이언트 개발 (경력)",
        "sections": (
            ("주요업무", (
                ("스트리밍 게임 클라이언트의 입력 지연을 줄이는 동기화 로직을 구현합니다.", "net-sync", "application", None),
                ("디코딩된 프레임의 렌더링 경로를 최적화합니다.", "graphics-opt", "application", None),
            )),
            ("자격요건", (
                ("C++ 로 실시간 클라이언트를 개발한 3년 이상의 경력을 갖춘 분", "unreal-cpp", "application", None),
                ("네트워크 지연 보상과 상태 동기화를 구현해 본 경험이 있는 분", "net-sync", "tradeoff", None),
            )),
            ("우대사항", (
                ("언리얼 엔진 또는 Unity 로 상용 프로젝트를 진행해 본 경험", "unity-csharp", "foundation", None),
            )),
        ),
        "summary": None,
        "summary_ratio": None,
    },
    {
        "nn": "09",
        "company_id": "co_kakaobank",
        "company": "카카오뱅크",
        "cluster": "fintech_finance",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "경력 3년 이상",
        "edu_label_raw": "대졸 이상",
        "posted_at": "2026-02-05T10:00:00+09:00",
        "title": "게이미피케이션 콘텐츠 클라이언트 개발 (경력)",
        "sections": (
            ("주요업무", (
                ("Unity 와 C# 로 금융 앱 안의 게이미피케이션 콘텐츠를 구현합니다.", "unity-csharp", "application", None),
                ("이벤트 진행 상태를 서버와 동기화합니다.", "net-sync", "foundation", None),
            )),
            ("자격요건", (
                ("Unity 와 C# 로 콘텐츠를 개발한 3년 이상의 경력을 갖춘 분", "unity-csharp", "application", None),
                ("애니메이션과 좌표 보간 등 기본 게임 수학을 다뤄 본 경험이 있는 분", "game-math", "foundation", None),
            )),
            ("우대사항", (
                ("저사양 단말에서 렌더링 성능을 개선해 본 경험", "graphics-opt", "foundation", None),
            )),
        ),
        "summary": None,
        "summary_ratio": None,
    },
)


def prior_posting(
    nn: str,
    company_id: str,
    company: str,
    cluster: str,
    entry_label: str,
    posted_at: str,
    title: str,
    responsibilities: tuple[tuple[str, str | None, str, None], ...],
    requirements: tuple[tuple[str, str | None, str, None], ...],
    preferences: tuple[tuple[str, str | None, str, None], ...],
    summary: str,
) -> dict[str, Any]:
    """이전 기간 공고의 공통 메타데이터를 한곳에서 고정한다."""
    is_entry = entry_label == "entry_junior"
    return {
        "nn": nn,
        "company_id": company_id,
        "company": company,
        "cluster": cluster,
        "period": PRIOR,
        "entry_label": entry_label,
        "entry_label_raw": "신입·주니어" if is_entry else "경력",
        "career_label_raw": "신입~3년" if is_entry else "경력 3년 이상",
        "edu_label_raw": "대졸 이상(2,3년제 포함)" if is_entry else "학력 무관",
        "posted_at": posted_at,
        "title": title,
        "sections": (
            ("주요업무", responsibilities),
            ("자격요건", requirements),
            ("우대사항", preferences),
        ),
        "summary": summary,
        "summary_ratio": "추가 요구 2건 · 직무 공통 기대치 일치 3건",
    }


POSTINGS += (
    prior_posting(
        "10", "co_kakao", "카카오", "bigtech_platform", "experienced",
        "2024-03-12T10:00:00+09:00", "인터랙티브 콘텐츠 클라이언트 개발",
        (
            ("실시간 인터랙티브 콘텐츠의 입력과 화면 연출을 Unity 로 구현합니다.", "unity-csharp", "application", None),
            ("다수 사용자의 상태를 서버 이벤트와 맞춰 화면에 반영합니다.", "net-sync", "application", None),
            ("복잡한 장면의 렌더링 비용을 프로파일링하고 개선합니다.", "graphics-opt", "application", None),
        ),
        (
            ("Unity 와 C# 로 상용 콘텐츠를 개발한 경험이 있으신 분", "unity-csharp", "application", None),
            ("벡터와 좌표 변환 등 게임 수학을 이해하시는 분", "game-math", "foundation", None),
        ),
        (
            ("실시간 상태 동기화와 지연 보상을 다뤄 본 분", "net-sync", "tradeoff", None),
            ("C++ 기반 클라이언트 개발 경험이 있으신 분", "unreal-cpp", "foundation", None),
        ),
        "대규모 플랫폼의 인터랙티브 콘텐츠를 구현하고 동기화할 개발자를 찾습니다.",
    ),
    prior_posting(
        "11", "co_wantedlab", "원티드랩", "startup", "entry_junior",
        "2024-06-18T10:00:00+09:00", "웹 미니게임 클라이언트 주니어",
        (
            ("Unity 와 C# 로 채용 캠페인용 미니게임을 구현합니다.", "unity-csharp", "foundation", None),
            ("다양한 단말에서 안정적인 프레임을 유지하도록 리소스를 조정합니다.", "graphics-opt", "foundation", None),
            ("게임 진행 상태를 서비스 API와 동기화합니다.", "net-sync", "foundation", None),
        ),
        (
            ("Unity 로 플레이 가능한 프로젝트를 완성해 본 분", "unity-csharp", "foundation", None),
            ("충돌과 보간에 필요한 게임 수학의 기초를 이해하는 분", "game-math", "foundation", None),
        ),
        (
            ("프로파일러를 사용해 렌더링 병목을 확인해 본 분", "graphics-opt", "foundation", None),
            ("C++ 학습 또는 언리얼 엔진 프로젝트 경험이 있는 분", "unreal-cpp", "foundation", None),
        ),
        "작은 팀에서 미니게임을 완성하고 서비스와 연결할 주니어를 찾습니다.",
    ),
    prior_posting(
        "12", "co_sendbird", "센드버드", "b2b_saas", "experienced",
        "2024-10-29T10:00:00+09:00", "메타버스 협업 클라이언트 개발",
        (
            ("언리얼 엔진으로 3D 협업 공간과 사용자 인터랙션을 구현합니다.", "unreal-cpp", "application", None),
            ("참여자 위치와 동작을 실시간으로 동기화합니다.", "net-sync", "tradeoff", None),
            ("다수 아바타 장면의 렌더링 부하를 프로파일링합니다.", "graphics-opt", "application", None),
        ),
        (
            ("C++ 와 언리얼 엔진으로 실시간 3D 클라이언트를 개발한 분", "unreal-cpp", "application", None),
            ("보간과 좌표 변환을 포함한 게임 수학을 이해하는 분", "game-math", "application", None),
        ),
        (
            ("Unity 기반 크로스 플랫폼 개발 경험이 있으신 분", "unity-csharp", "foundation", None),
            ("클라이언트 예측과 서버 보정을 설계해 본 분", "net-sync", "tradeoff", None),
        ),
        "실시간 3D 협업 공간의 화면과 참여자 상태를 안정적으로 맞출 개발자를 찾습니다.",
    ),
    prior_posting(
        "13", "co_kbank", "케이뱅크", "fintech_finance", "entry_junior",
        "2025-02-11T10:00:00+09:00", "금융 앱 게이미피케이션 클라이언트 신입",
        (
            ("Unity 와 C# 로 금융 학습용 게임 콘텐츠를 구현합니다.", "unity-csharp", "application", None),
            ("퀘스트와 보상 상태를 서버 데이터와 일치시킵니다.", "net-sync", "foundation", None),
            ("저사양 단말의 렌더링 성능과 메모리 사용량을 확인합니다.", "graphics-opt", "foundation", None),
        ),
        (
            ("Unity 와 C# 로 모바일 게임을 만들어 본 분", "unity-csharp", "foundation", None),
            ("벡터와 충돌 처리의 기본 원리를 설명할 수 있는 분", "game-math", "foundation", None),
        ),
        (
            ("네트워크 상태 동기화를 학습하거나 구현해 본 분", "net-sync", "foundation", None),
            ("C++ 또는 언리얼 엔진을 학습해 본 분", "unreal-cpp", "foundation", None),
        ),
        "금융 앱 안의 게임 콘텐츠를 구현하고 보상 상태를 안전하게 연결할 신입을 찾습니다.",
    ),
    prior_posting(
        "14", "co_lgcns", "엘지씨엔에스", "si_enterprise", "experienced",
        "2025-07-15T10:00:00+09:00", "산업용 시뮬레이션 클라이언트 개발",
        (
            ("언리얼 엔진으로 산업 설비의 3D 시뮬레이션 화면을 구현합니다.", "unreal-cpp", "application", None),
            ("설비 좌표와 충돌 결과를 시각화하고 물리 동작을 검증합니다.", "game-math", "application", None),
            ("대규모 모델의 렌더링 경로와 메모리 사용량을 최적화합니다.", "graphics-opt", "tradeoff", None),
        ),
        (
            ("C++ 와 언리얼 엔진으로 3D 클라이언트를 개발한 분", "unreal-cpp", "application", None),
            ("렌더링 병목을 계측하고 품질과 성능을 조정해 본 분", "graphics-opt", "tradeoff", None),
        ),
        (
            ("Unity 와 C# 기반 시뮬레이션 개발 경험이 있으신 분", "unity-csharp", "foundation", None),
            ("원격 설비 상태를 실시간 동기화해 본 분", "net-sync", "application", None),
        ),
        "산업 설비를 3D로 재현하고 대규모 모델의 성능을 확보할 개발자를 찾습니다.",
    ),
    prior_posting(
        "15", "co_smilegate", "스마일게이트", "game", "entry_junior",
        "2025-11-18T10:00:00+09:00", "온라인 게임 클라이언트 개발 신입",
        (
            ("언리얼 엔진으로 인게임 전투와 UI 기능을 구현합니다.", "unreal-cpp", "foundation", None),
            ("서버에서 받은 캐릭터 상태를 보간해 화면에 반영합니다.", "net-sync", "application", None),
            ("전투 장면의 프레임 저하를 프로파일링합니다.", "graphics-opt", "foundation", None),
        ),
        (
            ("C++ 와 언리얼 엔진의 액터 구조를 이해하는 분", "unreal-cpp", "foundation", None),
            ("벡터와 충돌 판정 등 3D 게임 수학의 기본기를 갖춘 분", "game-math", "foundation", None),
        ),
        (
            ("Unity 와 C# 로 완성한 개인 프로젝트가 있는 분", "unity-csharp", "foundation", None),
            ("클라이언트 예측과 서버 보정의 차이를 설명할 수 있는 분", "net-sync", "foundation", None),
        ),
        "게임플레이 구현의 기초와 온라인 동기화 개념을 갖춘 신입을 찾습니다.",
    ),
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
    _expanded_posting("17", "06", RECENT, "2026-01-19T10:00:00+09:00", "entry_junior"),
    _expanded_posting("18", "07", RECENT, "2026-02-23T10:00:00+09:00", "entry_junior"),
    _expanded_posting("19", "03", RECENT, "2026-03-09T10:00:00+09:00", "entry_junior"),
    _expanded_posting("20", "03", RECENT, "2026-03-23T10:00:00+09:00", "experienced"),
    _expanded_posting("21", "04", RECENT, "2026-04-13T10:00:00+09:00", "entry_junior"),
    _expanded_posting("22", "04", RECENT, "2026-04-27T10:00:00+09:00", "experienced"),
    _expanded_posting("23", "05", RECENT, "2026-05-25T10:00:00+09:00", "experienced"),
    _expanded_posting("24", "05", RECENT, "2026-06-22T10:00:00+09:00", "experienced"),
    _expanded_posting("25", "03", PRIOR, "2024-05-13T10:00:00+09:00", "entry_junior"),
    _expanded_posting("26", "05", PRIOR, "2024-09-09T10:00:00+09:00", "entry_junior"),
    _expanded_posting("27", "06", PRIOR, "2025-02-10T10:00:00+09:00", "entry_junior"),
    _expanded_posting("28", "07", PRIOR, "2025-05-12T10:00:00+09:00", "experienced"),
    _expanded_posting("29", "04", PRIOR, "2025-08-11T10:00:00+09:00", "experienced"),
    _expanded_posting("30", "01", PRIOR, "2025-11-10T10:00:00+09:00", "experienced"),
)

_CLUSTER_READING = {
    "game": "라이브 플레이에서 프레임과 동기화를 함께 지키는 구현 판단",
    "bigtech_platform": "여러 기기에서 입력·화면·상태를 안정적으로 이어 가는 완성도",
    "si_enterprise": "고정 장비의 성능 예산과 3D 동작을 수치로 맞추는 검증",
    "startup": "작은 콘텐츠를 빠르게 완성하면서 자원 사용량을 통제하는 실행력",
    "b2b_saas": "지연이 있는 실시간 화면에서 상태를 자연스럽게 동기화하는 설계",
    "fintech_finance": "앱 안의 콘텐츠가 서비스 상태와 어긋나지 않게 만드는 안정성",
}


def _complete_posting_content(posting: dict[str, Any]) -> dict[str, Any]:
    """빈 공고 해석을 원문·기업군·클라이언트 요구에 맞춰 완성한다."""
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
            f"{level}는 다음 역량을 실행 빌드와 측정 기록으로 보여 줘야 합니다: {_CLUSTER_READING[posting['cluster']]}."
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
                f"‘{line[0]}’는 게임 클라이언트의 직무 공통 기대치입니다. 실행 빌드에서 해당 기능의 위치와 직접 구현한 범위를 구분해 제시하세요.")
        elif kind == "mark":
            annotation = ("mark", f"{posting['company']}가 확인하는 {dim_label}",
                f"이 문장은 다음 역량을 확인합니다: {_CLUSTER_READING[posting['cluster']]}. ‘{line[0]}’에 사용한 선택과 프레임·지연 측정 결과를 함께 설명해야 합니다.",
                "mid", f"{CLUSTERS[posting['cluster']]} 전체 기간 참고")
        else:
            annotation = ("note", f"{posting['company']} 업무에서 읽을 점",
                f"‘{line[0]}’는 기능이 보이는 것뿐 아니라 플레이 조건에서 안정적으로 작동해야 한다는 뜻입니다. 재현 조건과 완료 기준을 README에 남기세요.")
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
        # 오프셋은 손으로 적지 않는다. 청크 원문에서 실제로 찾는다.
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
# recent 가 덮지 못한 기업군은 최근 지표와 히트맵에서 빠진다 (모집단이 없다).
RECENT_CLUSTERS = tuple(
    cid for cid in CLUSTER_ORDER if any(p["cluster"] == cid for p in RECENT_POSTINGS)
)


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

BOUNDARY_SLUGS = tuple(s for s in DIM_SLUGS if DIM_INFO[s]["boundary"])


def boundary_hit(dims: dict[str, tuple[str, str]]) -> bool:
    """직무 밖으로 넘어가는 요구인가.

    경계 차원이 이름만 스치는 공고까지 세면 게임 클라이언트는 전량이 직무 외가 된다.
    서버 동기화는 대부분의 공고가 한 줄씩 언급하기 때문이다. 필수로 걸렸거나 깊이가
    tradeoff 인 경우, 곧 실제로 그 영역을 맡기는 문장일 때만 분자에 넣는다.
    """
    return any(
        slug in dims and (dims[slug][0] == "required" or dims[slug][1] == "tradeoff")
        for slug in BOUNDARY_SLUGS
    )


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


def scope_key(scope_level: str, scope_id: str) -> str:
    return "overall" if scope_level == "overall" else scope_id


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


# ============================================================ 4. 지표 사실
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
            ("unity-csharp", "graphics-opt"),
            ("unreal-cpp", "game-math"),
            ("net-sync", "game-math"),
            ("unity-csharp", "game-math"),
        )
    )
)


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

                boundary = sum(1 for dims in dim_sets.values() if boundary_hit(dims))
                builder.add(
                    family="scope_expansion", measure="ratio",
                    scope_level=scope_level, scope_id=scope_id, segment=segment,
                    period=period, numerator=boundary, denominator=total, sample_size=total,
                )

                # 대상군 축이 entry_junior 로 고정된 지표다 (0009 의 CHECK).
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

    # cluster_contrast — 기업군 비율에서 직무 전체 비율을 뺀다.
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
    return builder


FACTS = build_statistics_facts()


# ============================================================ 5. 통계 payload 라벨
# CONTRACT 5장 A. tag·type·id·축 라벨은 게임 클라이언트 전용이다. 다른 직무에 쓰지 않는다.
# rule 은 그 라벨이 어떤 요구를 셀지 정한다.
#   any       — 차원이 등장하기만 하면 센다
#   tradeoff  — 깊이가 tradeoff 인 경우만 센다 (심화 신호)
#   required  — 자격요건으로 걸린 경우만 센다
#   boundary  — 직무 경계 판정 규칙을 따른다 (`boundary_hit`)
def hits(posting: dict[str, Any], slugs: tuple[str, ...], rule: str = "any") -> bool:
    dims = DIMS_BY_POSTING[posting["nn"]]
    if rule == "boundary":
        return boundary_hit(dims)
    for slug in slugs:
        entry = dims.get(slug)
        if entry is None:
            continue
        if rule == "any":
            return True
        if rule == "tradeoff" and entry[1] == "tradeoff":
            return True
        if rule == "required" and entry[0] == "required":
            return True
    return False


SCOPE_EXPANSION_TAGS: tuple[tuple[str, str, str, tuple[str, ...], str], ...] = (
    ("server_net", "서버·네트워크", "상태 동기화와 지연 보상을 클라이언트 몫으로 맡김",
     ("net-sync",), "boundary"),
    ("tech_art", "테크니컬 아트", "셰이더·LOD 등 렌더링 비용 조정을 자격요건으로 요구",
     ("graphics-opt",), "required"),
)

ADVANCED_TYPES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("frame_budget", "프레임 예산·최적화", ("graphics-opt",)),
    ("netcode", "넷코드·지연 보상", ("net-sync",)),
    ("engine_internals", "엔진 내부 구조", ("unreal-cpp", "unity-csharp")),
)

COMBOS: tuple[tuple[str, str, str, str, tuple[str, ...]], ...] = (
    ("unity_base", "Unity + C# + 게임 수학",
     "Unity 로 조작과 움직임을 만들고 좌표·보간을 직접 계산해 본 기본 조합입니다.",
     "플레이 가능한 빌드 한 편 완성",
     ("unity-csharp", "game-math")),
    ("unreal_base", "Unreal + C++ + 게임 수학",
     "언리얼의 액터·컴포넌트 구조 위에서 C++ 로 게임플레이를 구현하는 조합입니다.",
     "전투·이동 기능 하나를 C++ 로 구현",
     ("unreal-cpp", "game-math")),
    ("perf", "엔진 구현 + 렌더링 최적화",
     "만든 결과물의 프레임 저하 구간을 계측해 비용을 줄여 본 경험을 묻는 조합입니다.",
     "개선 전후 수치를 함께 제시",
     ("unity-csharp", "graphics-opt")),
    ("netsync", "상태 동기화 + 게임 수학",
     "서버 상태와 화면의 차이를 보간·예측으로 메워 본 경험을 묻는 조합입니다.",
     "2인 이상 동기화 데모 구현",
     ("net-sync", "game-math")),
)

REALITY_TAGS: tuple[tuple[str, str, tuple[str, ...], str], ...] = (
    ("playable_build", "플레이 가능한 빌드 제출", ("unity-csharp", "unreal-cpp"), "any"),
    ("perf_number", "성능을 수치로 설명", ("graphics-opt",), "any"),
    ("multiplay_demo", "멀티플레이 동기화 경험", ("net-sync",), "any"),
    ("math_explain", "움직임의 수학을 설명", ("game-math",), "any"),
)

CLUSTER_AXES: tuple[tuple[str, str, tuple[str, ...], str], ...] = (
    ("engine_impl", "엔진·게임플레이 구현", ("unity-csharp", "unreal-cpp"), "any"),
    ("perf_render", "성능·렌더링", ("graphics-opt",), "any"),
    ("math_physics", "수학·물리", ("game-math",), "any"),
    ("net_sync", "네트워크 동기화", ("net-sync",), "any"),
    ("platform_device", "플랫폼·디바이스 대응", ("graphics-opt", "unity-csharp"), "tradeoff"),
)


def axis_level(value: int | None) -> str:
    if value is None:
        return "—"
    if value >= 100:
        return "강"
    if value >= 21:
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


def group_pct(slugs: tuple[str, ...], period: str = RECENT) -> int | None:
    """여러 차원 가운데 하나라도 등장한 공고의 비율. 직무 공통 기대치 항목 표시에 쓴다."""
    rows = population("overall", JOB_ROLE_ID, SEGMENT_ALL, period)
    if not rows:
        return None
    return pct(sum(1 for p in rows if hits(p, slugs)), len(rows))


def group_required_pct(slugs: tuple[str, ...], period: str = RECENT) -> int | None:
    rows = [p for p in population("overall", JOB_ROLE_ID, SEGMENT_ALL, period) if hits(p, slugs)]
    if not rows:
        return None
    return pct(sum(1 for p in rows if hits(p, slugs, "required")), len(rows))


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

    scope_expansion = []
    for tag, label, desc, slugs, rule in SCOPE_EXPANSION_TAGS:
        count = sum(1 for p in RECENT_POSTINGS if hits(p, slugs, rule))
        if count:
            scope_expansion.append({
                "tag": tag, "label": label, "desc": desc,
                "count": count, "pct": pct(count, recent_n),
            })
    scope_expansion.sort(key=lambda row: -row["count"])

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

    def dist(field: str) -> list[dict[str, Any]]:
        counts = Counter(p[field] for p in RECENT_POSTINGS)
        rows = [{"label": label, "pct": pct(n, recent_n)} for label, n in counts.items()]
        rows.sort(key=lambda r: -r["pct"])
        return rows[:3]

    labels = {"edu": dist("edu_label_raw"), "career": dist("career_label_raw")}

    advanced = []
    for type_id, label, slugs in ADVANCED_TYPES:
        hit_rows = [p for p in RECENT_POSTINGS if hits(p, slugs, "tradeoff")]
        if not hit_rows:
            continue
        quote = None
        for mention in MENTIONS_BY_POSTING[hit_rows[0]["nn"]]:
            if mention.dim_slug in slugs and mention.depth == "tradeoff":
                quote = mention.raw_expression
                break
        advanced.append({
            "type": type_id, "label": label, "count": len(hit_rows),
            "pct": pct(len(hit_rows), recent_n), "quote": quote,
            "more_count": max(0, len(hit_rows) - 1),
        })
    advanced.sort(key=lambda row: -row["count"])

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

    reality = []
    for tag, label, slugs, rule in REALITY_TAGS:
        count = sum(1 for p in RECENT_POSTINGS if hits(p, slugs, rule))
        value = pct(count, recent_n)
        if value:
            reality.append({"tag": tag, "label": label, "pct": value})
    reality.sort(key=lambda row: -row["pct"])

    # 표본 확보를 위해 recent 와 prev 전체 기간을 합산한다.
    axes_rows = []
    for cluster_id in CLUSTER_ORDER:
        members = [p for p in POSTINGS if p["cluster"] == cluster_id]
        n = len(members)
        cells = []
        for _axis_id, axis_label, slugs, rule in CLUSTER_AXES:
            count = sum(1 for p in members if hits(p, slugs, rule))
            value = pct(count, n)
            cells.append({"axis": axis_label, "pct": value, "level": axis_level(value)})
        axes_rows.append({"cluster": CLUSTERS[cluster_id], "n": n, "cells": cells})
    cluster_axes = {"axes": [label for _id, label, _s, _r in CLUSTER_AXES], "rows": axes_rows}

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

    items = []
    for slug in DIM_SLUGS:
        count = freq(slug, RECENT)
        by_cluster: dict[str, int] = {}
        support_cluster: dict[str, int] = {}
        for cluster_id in RECENT_CLUSTERS:
            n = cluster_n[cluster_id]
            hit_n = sum(
                1 for p in RECENT_POSTINGS
                if p["cluster"] == cluster_id and slug in DIMS_BY_POSTING[p["nn"]]
            )
            support_cluster[CLUSTERS[cluster_id]] = hit_n
            by_cluster[CLUSTERS[cluster_id]] = pct(hit_n, n)
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


# ============================================================ 6. 해석 payload
# (item_id, 제목, 해설, 빈도를 세는 차원 묶음)
BASELINE_ITEMS: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    ("unity-csharp", "엔진으로 완성한 플레이 빌드",
     "Unity 와 C# 로 화면·입력·로직을 붙여 하나의 빌드를 완성한 경험입니다. 만들어 봤다가 아니라 돌아가는 것을 냈다가 기준입니다.",
     ("unity-csharp",)),
    ("unreal-cpp", "C++·언리얼 게임플레이 구현",
     "액터·컴포넌트 구조 위에서 C++ 로 기능을 붙여 본 경험입니다. 콘솔·PC 장르 공고에서 자격요건으로 올라옵니다.",
     ("unreal-cpp",)),
    ("graphics-opt", "프레임 예산·렌더링 비용 관리",
     "목표 프레임을 정하고 드로우콜·셰이더 비용을 그 안에 넣는 일입니다. 최근 공고 전량이 이 축을 언급합니다.",
     ("graphics-opt",)),
    ("game-math", "벡터·쿼터니언 등 게임 수학",
     "좌표 변환과 회전, 충돌과 보간을 코드로 다루는 기초입니다. 계산 능력이 아니라 설명 능력을 봅니다.",
     ("game-math",)),
    ("net-sync", "서버 상태 동기화 이해",
     "서버가 내려준 상태를 화면에 맞추는 보간·예측입니다. 클라이언트 직무지만 서버 경계에 걸린 요구입니다.",
     ("net-sync",)),
    ("playable-build", "플레이 가능한 결과물 제출",
     "엔진을 가리지 않고 완성한 빌드가 있는지 봅니다. 포트폴리오 심사에서 사실상 첫 관문입니다.",
     ("unity-csharp", "unreal-cpp")),
    ("profiling-habit", "계측으로 병목을 찾는 습관",
     "프로파일러로 무엇이 느린지 먼저 확인하는 습관입니다. 개선 전후 수치가 남아 있으면 그대로 근거가 됩니다.",
     ("graphics-opt",)),
    ("device-adapt", "저사양·멀티플랫폼 대응",
     "목표 기기가 정해진 상태에서 품질을 조절하는 판단입니다. 모바일·현장 장비 공고에서 반복됩니다.",
     ("graphics-opt", "unity-csharp")),
)

UNCHANGED_ITEMS: tuple[tuple[str, str, str], ...] = (
    ("playable-build", "플레이 가능한 결과물 제출",
     "이 기업군도 요구 수준은 공통 기대치와 같습니다. 차별화 지점이 아니라 전제 조건입니다."),
    ("game-math", "벡터·쿼터니언 등 게임 수학",
     "움직임의 수학은 전 기업군이 같은 수준으로 묻습니다. 준비했다면 어디에나 통합니다."),
    ("unity-csharp", "엔진으로 완성한 플레이 빌드",
     "엔진 구현 기본기는 공통 기대치 그대로입니다. 심화는 성능·동기화 추가 요구가 담당합니다."),
    ("profiling-habit", "계측으로 병목을 찾는 습관",
     "계측 습관 자체는 어느 기업군에서도 같은 무게로 읽힙니다. 더 요구하지도, 덜 보지도 않습니다."),
)

# 기업군별 추가 요구. (차원 slug, 주제, 직무 공통 기대치, 추가 요구, 근거, 해석, 신뢰도, 근거 블록, 체크 개념)
CLUSTER_DEVIATIONS: dict[str, tuple[tuple[str, ...], ...]] = {
    "game": (
        ("net-sync", "넷코드", "서버 상태 동기화 이해", "예측·보정과 지연 보상 구현까지",
         '"지연 보상과 클라이언트 예측 같은 네트워크 동기화 개념" 문장이 자격요건에 있음',
         "실시간 대전이 제품의 본체인 조직입니다. 다른 기업군에서 우대이던 항목이 자격요건으로 올라와 있어 준비 여부가 그대로 갈립니다.",
         "high", "#items", "netsync-demo"),
        ("graphics-opt", "성능", "프레임 예산 관리", "병목 계측과 개선안 제안까지",
         '"프레임 저하를 프로파일링하고 개선안을 제안" 문장',
         "대규모 전투처럼 최악의 순간이 기준입니다. 평시 프레임이 아니라 무너지는 구간을 찾아 본 경험을 묻습니다.",
         "high", "#advanced", "frame-budget"),
        ("unreal-cpp", "엔진", "엔진 구현 기본기", "C++ 로 게임플레이 프레임워크 다루기까지",
         "주요업무와 자격요건에 언리얼과 C++ 가 함께 등장",
         "엔진을 고르지 않는 다른 기업군과 달리 언리얼과 C++ 가 전제입니다. 블루프린트만으로는 이 문장을 충족하지 못합니다.",
         "high", "#tech_freq", "unreal-gameplay"),
    ),
    "bigtech_platform": (
        ("graphics-opt", "저사양 대응", "프레임 예산 관리", "목표 수치를 정한 기기별 최적화까지",
         '"저사양 안드로이드 단말에서도 60프레임을 유지" 문장',
         "숫자가 문장에 박혀 있습니다. 어떤 기기에서 몇 프레임이 나왔고 무엇을 줄여서 맞췄는지로 말해야 합니다.",
         "high", "#advanced", "device-test"),
        ("unity-csharp", "엔진", "엔진 구현 기본기", "UI 와 인게임 로직을 함께 맡는 범위까지",
         '"캐주얼 게임의 UI 와 인게임 로직을 구현" 문장',
         "분업이 얕은 대신 맡는 범위가 넓습니다. UI 를 붙여 본 경험이 인게임 로직만큼 평가에 들어갑니다.",
         "mid", "#items", "unity-build"),
        ("net-sync", "동기화", "서버 상태 동기화 이해", "실시간 랭킹 등 서버 연동 화면까지",
         '우대사항의 "소켓 통신으로 실시간 상태를 주고받아 본 경험" 문장',
         "전투 동기화가 아니라 랭킹·랭크전 갱신입니다. 요구 수준은 낮지만 통신 계층을 아예 안 다뤄 봤다면 걸립니다.",
         "mid", "#scope_expansion", "netsync-demo"),
    ),
    "si_enterprise": (
        ("graphics-opt", "고정 하드웨어", "프레임 예산 관리", "현장 장비에 맞춘 LOD·컬링 설계까지",
         '"현장 장비에서 안정적으로 동작" 문장과 셰이더·LOD 우대 문장',
         "단말을 고를 수 없는 환경입니다. 품질을 어디까지 포기했는지 근거를 문서로 남긴 경험이 그대로 평가 대상이 됩니다.",
         "high", "#advanced", "shader-cost"),
        ("game-math", "3D 수학", "벡터·쿼터니언 기초", "좌표계 변환을 실무에서 다루는 수준까지",
         '"좌표계 변환과 회전 표현 등 3D 수학을 실무에서" 문장',
         "산업 데이터는 좌표계가 제각각입니다. 개념 설명을 넘어 좌표계가 뒤틀린 버그를 잡아 본 이야기가 필요합니다.",
         "high", "#items", "math-solve"),
        ("unity-csharp", "제품 범위", "완성한 빌드", "상용 제품 개발 경력까지",
         '"상용 제품을 개발한 3년 이상의 경력" 문장',
         "경력 공고라 직무 공통 기대치의 상한이 높습니다. 신입 지원자에게는 이 기업군의 다른 공고를 함께 보는 편이 정확합니다.",
         "mid", "#labels", "unity-build"),
    ),
    "startup": (
        ("graphics-opt", "자원 예산", "프레임 예산 관리", "발열·배터리까지 포함한 자원 조절",
         '"발열과 배터리를 고려해 렌더링 부하를 조절" 문장',
         "게임 전용 기기가 아니라 생활 앱입니다. 프레임을 올리는 최적화가 아니라 자원을 덜 쓰는 최적화가 이 팀의 언어입니다.",
         "high", "#advanced", "device-test"),
        ("unity-csharp", "완성 속도", "완성한 빌드", "짧은 주기로 콘텐츠를 내는 속도까지",
         '"앱 안에서 동작하는 미니게임 콘텐츠를 구현" 문장',
         "규모는 작지만 주기가 짧습니다. 큰 프로젝트 하나보다 완성한 작은 결과물 여러 개가 유리하게 읽힙니다.",
         "mid", "#items", "unity-build"),
        ("net-sync", "보상 정합성", "서버 상태 동기화 이해", "동기화 실패가 보상 오류가 되는 설계까지",
         '우대사항의 "서버와 게임 상태를 동기화하는 구조를 설계" 문장',
         "게임 상태가 리워드로 이어집니다. 끊긴 통신에서 값을 어떻게 맞출지 고민해 본 기록이 답이 됩니다.",
         "mid", "#scope_expansion", "netsync-demo"),
    ),
    "b2b_saas": (
        ("net-sync", "입력 지연", "서버 상태 동기화 이해", "지연 보상 구현과 체감 지연 측정까지",
         '"입력 지연을 줄이는 동기화 로직을 구현" 문장',
         "화면이 서버에서 만들어져 내려옵니다. 클라이언트가 할 일은 지연을 감추는 것뿐이라 넷코드가 직무의 중심이 됩니다.",
         "high", "#items", "netsync-demo"),
        ("graphics-opt", "렌더링 경로", "프레임 예산 관리", "디코딩·표시 경로의 최적화까지",
         '"디코딩된 프레임의 렌더링 경로를 최적화" 문장',
         "게임을 그리는 것이 아니라 받은 영상을 그립니다. 렌더링 지식이 다른 방향으로 쓰이는 사례입니다.",
         "mid", "#advanced", "frame-budget"),
    ),
    "fintech_finance": (
        ("unity-csharp", "앱 내 콘텐츠", "완성한 빌드", "금융 앱에 얹히는 콘텐츠 개발까지",
         '"금융 앱 안의 게이미피케이션 콘텐츠를 구현" 문장',
         "게임사가 아니라 금융사입니다. 게임성보다 앱 전체와 어울리는 안정성과 용량이 먼저 검토됩니다.",
         "high", "#items", "unity-build"),
        ("net-sync", "이벤트 상태", "서버 상태 동기화 이해", "이벤트 진행 상태의 서버 동기화까지",
         '"이벤트 진행 상태를 서버와 동기화" 문장',
         "진행도가 곧 혜택입니다. 값이 어긋나면 고객 문의로 이어지므로 동기화 실패 처리를 함께 묻습니다.",
         "mid", "#scope_expansion", "netsync-demo"),
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
    for item_id, title, desc, slugs in BASELINE_ITEMS:
        if len(slugs) == 1 and slugs[0] == item_id:
            freq_value, required_value = freq_pct(item_id, RECENT), required_pct(item_id, RECENT)
        else:
            freq_value, required_value = group_pct(slugs, RECENT), group_required_pct(slugs, RECENT)
        rows.append({
            "item_id": item_id, "title": title, "desc": desc,
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
        "unchanged_note": "읽는 법 — 회색 번호는 게임 클라이언트 공통 기대치, 파란 번호는 문장 뒤에 숨은 신호, 노란 번호는 이 회사가 유독 원하는 것입니다.",
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


# ============================================================ 7. 전략·로드맵
# (slug, 제목, 부제, 이유, 증명 산출물, 채널, kind, 기본 필수 여부)
CONCEPTS: tuple[tuple[str, str, str, str, str, tuple[str, ...], str, bool], ...] = (
    ("unity-build", "Unity 로 완성한 플레이 빌드", "화면·입력·로직을 붙인 결과물 하나",
     "직무 공통 기대치 · 최근 공고 전량이 완성한 빌드를 전제로 합니다", "실행 파일 또는 스토어 링크 + 플레이 영상",
     ("portfolio",), "project", True),
    ("unreal-gameplay", "Unreal C++ 게임플레이 기능", "액터·컴포넌트로 만든 기능 하나",
     "콘솔·PC 장르 공고가 C++ 구현 경험을 자격요건에 둡니다", "C++ 소스 + 기능 설명 문서",
     ("portfolio", "interview"), "project", False),
    ("frame-budget", "프레임 예산 계측·개선", "프로파일러로 병목을 찾고 줄이기",
     "직무 공통 기대치 · 성능 축은 모든 기업군 공고에 등장합니다", "개선 전후 프레임·드로우콜 수치 비교표",
     ("portfolio", "interview"), "project", True),
    ("shader-cost", "셰이더·LOD 비용 조정", "품질을 어디까지 포기할지 정하기",
     "고정 하드웨어를 쓰는 기업군의 변별점입니다", "LOD·셰이더 설정 변경 기록 + 근거 메모",
     ("portfolio",), "project", False),
    ("device-test", "저사양 단말 테스트 기록", "목표 기기에서의 실측",
     "모바일·생활 앱 기업군은 기기별 수치를 묻습니다", "기기별 프레임·발열·용량 측정표",
     ("portfolio", "interview"), "project", True),
    ("math-solve", "게임 수학으로 푼 문제", "좌표 변환·회전·충돌 사례",
     "직무 공통 기대치 · 움직임의 수학은 전 기업군 공통 요구입니다", "문제 상황과 수식 풀이를 담은 글",
     ("portfolio", "interview"), "project", True),
    ("netsync-demo", "2인 동기화 데모", "보간·예측을 직접 구현한 결과물",
     "넷코드를 자격요건에 두는 기업군이 있습니다", "동기화 데모 + 지연 주입 실험 기록",
     ("portfolio", "interview"), "project", True),
    ("crash-story", "크래시·버그 추적 서사", "재현하고 원인을 좁힌 과정",
     "라이브 서비스 팀은 재현 능력을 먼저 봅니다", "재현 절차 + 원인 분석 + 수정 기록",
     ("essay", "interview"), "story", True),
    ("collab-story", "협업 문제 해결 서사", "아트·기획과 맞춘 경험",
     "게임 개발은 직군 사이 조율이 업무의 일부입니다", "문제 → 조율 → 배움 서술 준비",
     ("essay",), "story", True),
    ("engine-internals", "엔진 내부 구조 학습", "게임 루프·컴포넌트·직렬화",
     "면접의 꼬리질문이 엔진 동작 원리로 내려갑니다", "한 프레임의 처리 순서 그림 + 설명",
     ("interview",), "study", True),
    ("cs-graphics", "그래픽스 파이프라인 기초", "드로우콜·배칭·셰이더 단계",
     "최적화 이야기의 이론 바탕입니다", "파이프라인 단계별 비용 정리 노트",
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
    ("game", ("넷코드 데모", "프레임 개선 수치", "C++ 구현", "협업 기록")),
    ("bigtech_platform", ("기기별 성능 수치", "완성한 빌드", "UI 구현", "동기화 화면")),
    ("si_enterprise", ("현장 장비 최적화", "3D 수학 사례", "문서·근거", "안정성")),
    ("startup", ("빠른 완성 이력", "자원 절감 수치", "동기화 설계", "오너십")),
    ("b2b_saas", ("지연 측정", "렌더링 경로", "실시간성", "안정성")),
    ("fintech_finance", ("앱 내 콘텐츠", "용량·안정성", "진행 상태 동기화", "협업 기록")),
)


def cluster_concepts(cluster_id: str) -> tuple[str, ...]:
    """기업군별 추가 요구가 가리키는 체크 개념. 순서가 추가 요구 번호다."""
    return tuple(entry[8] for entry in CLUSTER_DEVIATIONS[cluster_id])


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
                f"추가 요구 {devs.index(slug) + 1} · {info['reason']}" if is_dev else info["reason"]
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
                "title": "플레이 영상 30초가 첫 관문입니다",
                "body": f"{label}에서도 코드보다 먼저 열리는 것은 영상입니다. 조작이 어떤 느낌인지 30초 안에 보여주고, 그 뒤에 구조 설명을 두세요.",
                "tips": ["README 최상단에 빌드 링크·조작법·30초 영상 배치", "새 PC에서 안내대로 실행해 첫 플레이 루프가 재현되면 완료"],
                "linked_item_ids": [CONCEPT_INFO["unity-build"]["concept_id"]],
            },
            {
                "title": "성능은 문장이 아니라 표로 씁니다",
                "body": "최적화했다는 서술은 거의 모든 지원자가 씁니다. 기기·해상도·프레임·드로우콜을 개선 전후로 나란히 둔 표 한 장이 그 문장을 대신합니다.",
                "tips": ["성능 절에 기기·해상도·장면별 개선 전후 표 배치", "같은 장면을 다시 측정해 목표 프레임을 재현하면 완료"],
                "linked_item_ids": [
                    CONCEPT_INFO["frame-budget"]["concept_id"],
                    CONCEPT_INFO["device-test"]["concept_id"],
                ],
            },
        ],
        "intro_orders": orders,
    }
    essay = [
        {
            "kind": "deviation",
            "title": "엔진이 해준 것과 내가 한 것을 가르기",
            "body": f"{label} 지원 글에서 강한 것은 엔진 기능 목록이 아니라 엔진이 대신해 주지 않는 부분을 어떻게 해결했는가입니다.",
            "narrative": {
                "problem": "캐릭터가 순간이동하듯 끊겨 보이는 문제를 발견",
                "solve": "패킷 주기 확인 → 보간 적용 → 지연을 주입해 재확인",
                "growth": "화면의 부드러움은 통신이 아니라 표현의 문제라는 관점",
            },
            "sample_sentence": "\"서버가 보낸 좌표를 그대로 그리는 대신, 다음 좌표까지의 시간을 나눠 그리도록 바꾸자 끊김이 사라졌습니다.\"",
            "tips": ["수치가 있으면 한 문장으로 붙이세요"],
            "linked_item_ids": [CONCEPT_INFO["netsync-demo"]["concept_id"]],
        },
        {
            "kind": "narrative_polish",
            "title": "협업 경험 — 보유 소재 다듬기",
            "body": "아트·기획과의 조율은 게임 직군 자소서에서 가장 자주 검증되는 소재입니다. 사실 관계는 고정하고 배움의 방점만 기업군에 맞춰 조정하세요.",
            "narrative": None,
            "sample_sentence": None,
            "tips": ["요구가 바뀐 이유를 함께 적기", "결과 수치가 있으면 한 문장으로"],
            "linked_item_ids": [CONCEPT_INFO["collab-story"]["concept_id"]],
        },
    ]
    interview = [
        {
            "kicker": "성능 검증",
            "question": "프레임이 떨어졌을 때 무엇부터 확인했나요?",
            "followups": ["CPU 와 GPU 중 어느 쪽이 병목이었나요?", "무엇을 포기하고 무엇을 지켰나요?"],
            "point": "계측 → 병목 가설 → 수정 선택 이유 → 같은 장면의 전후 수치 순서로 답하고, 포기한 품질과 지킨 목표를 꼬리질문에 연결하세요.",
            "linked_item_ids": [CONCEPT_INFO["frame-budget"]["concept_id"]],
        },
        {
            "kicker": "동기화 검증",
            "question": "네트워크가 끊겼다가 돌아오면 캐릭터를 어디에 그리나요?",
            "followups": ["예측이 틀렸을 때는 어떻게 되돌리나요?", "지연이 커지면 무엇을 먼저 포기하나요?"],
            "point": "보간·예측 가운데 고른 방식과 이유, 지연 주입 조건, 위치 오차와 화면 끊김이 어떻게 바뀌었는지 답하세요.",
            "linked_item_ids": [CONCEPT_INFO["netsync-demo"]["concept_id"]],
        },
        {
            "kicker": "기본기 검증",
            "question": "쿼터니언을 왜 쓰나요?",
            "followups": ["오일러각으로는 무엇이 안 되나요?", "보간은 어떻게 하나요?"],
            "point": "오일러각 대신 쿼터니언을 고른 이유를 짐벌락과 보간으로 설명하고, 데모에서 회전이 안정된 결과를 연결하세요.",
            "linked_item_ids": [CONCEPT_INFO["math-solve"]["concept_id"]],
        },
        {
            "kicker": "태도 검증 · 자소서 연동",
            "question": "재현이 안 되는 버그를 만나면 어떻게 하나요?",
            "followups": ["로그를 어디에 남겼나요?", "다시 그 상황이면 무엇을 다르게 하겠어요?"],
            "point": "로그 지점을 고른 이유, 재현 조건을 좁힌 순서, 수정 뒤 같은 절차에서 버그가 사라진 결과를 답하세요.",
            "linked_item_ids": [CONCEPT_INFO["crash-story"]["concept_id"]],
        },
    ]
    return {
        "job": JOB_ROLE_ID, "scope": scope, "checklist": checklist,
        "portfolio": portfolio, "essay": essay, "interview": interview,
        "agent_version": AGENT_VERSION_STRING, "source": "stored",
    }


ROADMAP_STEPS: tuple[tuple[int, str, int, str, str, str, str, str, tuple[str, ...]], ...] = (
    (1, "STEP 01 · 3주", 3, "vhigh", "플레이 가능한 빌드 하나를 끝내기",
     "새 프로젝트를 벌이지 말고 있는 결과물 하나를 실행 파일까지 끌고 가세요. 조작 루프와 UI, 저장까지 붙이고 아트·기획과 바꾼 결정 하나를 기록합니다.",
     "실행 파일 + 30초 플레이 영상 + README + 협업 결정 기록", "완성한 빌드가 없으면 다른 준비가 평가에 닿지 않습니다.",
     ("완성", "빌드", "플레이 영상")),
    (2, "STEP 02 · 2주", 2, "vhigh", "성능을 숫자로 만들기",
     "목표 기기와 목표 프레임을 정하고 프로파일러로 병목을 찾으세요. 드로우콜과 프레임을 개선 전후로 표에 남깁니다.",
     "개선 전후 수치 비교표 + 무엇을 포기했는지 메모", "성능은 서술이 아니라 표로 증명되는 항목입니다.",
     ("프로파일링", "드로우콜", "수치 비교")),
    (3, "STEP 03 · 2주", 2, "high", "움직임과 동기화 하나를 직접 구현하기",
     "좌표 변환이나 충돌 중 하나를 직접 계산해 보고, 2인 동기화 데모에 보간을 붙여 지연을 주입해 확인하세요.",
     "수학 풀이 글 + 동기화 데모 + 지연 실험 기록", "엔진이 대신해 주지 않는 부분을 다뤄 본 흔적이 변별점입니다.",
     ("게임 수학", "보간", "지연 실험")),
    (4, "STEP 04 · 2주", 2, "mid", "기업군에 맞춰 마무리하기",
     "지원 기업군의 추가 요구 항목을 채우세요. 크래시 하나를 재현·수정하고, LOD 또는 셰이더 설정을 바꾼 전후 비용과 품질 선택을 기록한 뒤 소개 순서를 조정합니다.",
     "크래시 재현·수정 기록 + LOD·셰이더 전후 비교 + 기업군 맞춤 소개 순서", "필수가 채워진 뒤의 마무리입니다. 순서만 바꿔도 읽히는 인상이 달라집니다.",
     ("추가 요구 보강", "소개 순서", "문서 정리")),
)

STEP_FILLS: tuple[tuple[str, ...], ...] = (
    ("unity-build", "collab-story"),
    ("frame-budget", "device-test"),
    ("math-solve", "netsync-demo"),
    ("crash-story", "shader-cost"),
)

# (역량 slug, 시기, 우선순위, 제목, 깊이 설명, 이유, 채우는 체크 개념)
STUDY_TRACKS: tuple[tuple[str, str, str, str, str, str, tuple[str, ...]], ...] = (
    ("gameplay-impl", "STEP 01~02와 병행", "vhigh", "엔진 내부 구조와 게임 루프",
     "한 프레임 안에서 입력·업데이트·렌더가 어떤 순서로 도는지, 컴포넌트가 왜 그렇게 나뉘어 있는지 그림으로 그릴 수 있는 수준까지.",
     "써 봤다와 무엇을 해주는지 안다를 면접이 구분합니다.", ("engine-internals", "unreal-gameplay")),
    ("runtime-perf", "STEP 02~03과 병행", "high", "그래픽스 파이프라인 기초",
     "드로우콜이 왜 비싼지, 배칭과 인스턴싱이 무엇을 합치는지, 셰이더 단계별 비용이 어디서 나오는지까지.",
     "최적화 이야기는 파이프라인 이해 위에서만 설득력을 갖습니다.", ("cs-graphics", "frame-budget")),
    ("multiplay-sync", "상시 · 주 3~4시간", "high", "네트워크 동기화 이론",
     "보간과 외삽의 차이, 클라이언트 예측과 서버 권한, 지연 보상이 무엇을 속이는지 설명할 수 있는 수준까지.",
     "넷코드를 자격요건에 두는 기업군에서 준비 여부가 그대로 갈립니다.", ("netsync-demo",)),
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
            text = f"{info['title']} (추가 요구 {devs.index(slug) + 1})"
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


# ============================================================ 8. Wiki 본문
WIKI: dict[str, dict[str, Any]] = {
    "gameplay-impl": {
        "why": "최근 공고 전량이 엔진으로 완성한 결과물을 전제로 합니다. 이 역량이 없으면 다른 준비가 평가에 닿지 않습니다.",
        "depth": {"foundation": "엔진의 기본 컴포넌트로 화면과 입력을 붙인다",
                  "application": "조작 루프와 UI 를 갖춘 빌드를 완성한다",
                  "tradeoff": "구조를 나누는 기준을 근거와 함께 고른다"},
        "prereq": ["언어 문법과 객체 구조 이해", "엔진 에디터의 기본 조작"],
        "misconceptions": ["튜토리얼을 따라 한 것을 완성으로 두는 생각",
                           "블루프린트만으로 C++ 요구를 충족한다는 생각"],
        "interview": ["한 프레임 안에서 무엇이 먼저 도나", "이 기능을 왜 이 구조로 나눴나"],
        "sequence": ["조작 루프 구현", "UI 와 상태 저장", "빌드 산출", "구조 정리"],
    },
    "runtime-perf": {
        "why": "프레임 예산과 렌더링 비용이 모든 기업군 공고에 등장하며, 목표 수치가 문장에 박힌 공고도 있습니다.",
        "depth": {"foundation": "프로파일러로 프레임 그래프를 읽는다",
                  "application": "병목을 찾아 드로우콜이나 셰이더 비용을 줄인다",
                  "tradeoff": "품질과 성능 사이에서 무엇을 포기할지 고른다"},
        "prereq": ["렌더링 파이프라인의 단계 이해", "측정 도구 사용"],
        "misconceptions": ["옵션을 낮추면 최적화라는 생각", "평균 프레임만 보는 습관"],
        "interview": ["CPU 와 GPU 중 어느 쪽이 병목이었나", "무엇을 포기했나"],
        "sequence": ["계측", "병목 특정", "개선", "전후 비교"],
    },
    "multiplay-sync": {
        "why": "실시간 대전과 스트리밍처럼 동기화가 제품의 본체인 기업군에서 자격요건으로 올라옵니다.",
        "depth": {"foundation": "서버 상태를 화면에 반영한다",
                  "application": "보간으로 끊김을 없애고 지연을 확인한다",
                  "tradeoff": "예측과 보정 가운데 무엇을 속일지 고른다"},
        "prereq": ["좌표와 시간 보간의 수학", "통신 지연의 개념"],
        "misconceptions": ["패킷을 자주 보내면 부드러워진다는 생각",
                           "예측이 항상 정답이라는 생각"],
        "interview": ["예측이 틀리면 어떻게 되돌리나", "지연이 커지면 무엇을 포기하나"],
        "sequence": ["상태 반영", "보간 적용", "지연 주입 실험", "예측·보정 선택"],
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

    # --- 2~7 출처와 공고 (`dataset_versions` 는 A1 이 만든다)
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

    role_node = node("semantic", "JobRole", "job_roles", JOB_ROLE_ID, "게임 개발자")
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

    for slug in [row["item_id"] for row in STATISTICS_PAYLOAD["items"][:5]]:
        fact = FACTS.get("posting_prevalence", "ratio", "overall", JOB_ROLE_ID,
                         SEGMENT_ALL, RECENT, slug)
        companies = {
            p["company_id"] for p in RECENT_POSTINGS if slug in DIMS_BY_POSTING[p["nn"]]
        }
        claim_id = add_claim(
            stat_output, "statistic", None, "overall", JOB_ROLE_ID,
            f"{DIM_INFO[slug]['label']} 은 최근 1년 게임 클라이언트 공고의 {freq_pct(slug, RECENT)}% 에 나타난다.",
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

    for item_id, title, _desc, slugs in BASELINE_ITEMS[:3]:
        claim_id = add_claim(
            intp_outputs["overall"], "posting_explicit", "explicit_requirement",
            "overall", JOB_ROLE_ID,
            f"{title} 은 기업군과 무관하게 반복되는 공통 기대치다.",
            {"dimension_id": dim_id(item_id), "baseline_title": title},
            "0.78000", components(freq(item_id, RECENT), 3, 1.0),
        )
        fact = FACTS.get("requiredness_ratio", "ratio", "overall", JOB_ROLE_ID,
                         SEGMENT_ALL, RECENT, slugs[0])
        if fact is not None:
            claim_evidence.append({
                "claim_id": claim_id, "support_type": "statistic_fact",
                "support_id": fact["fact_id"], "relation": "supports", "weight": "0.80000",
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

    for slug in ("unity-build", "netsync-demo"):
        info = CONCEPT_INFO[slug]
        claim_id = add_claim(
            strat_outputs["overall"], "strategy", None, "overall", JOB_ROLE_ID,
            f"{info['title']} 은 게임 클라이언트 지원 준비에서 우선순위가 높다.",
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
            "graphics-opt" if scope_level == "overall"
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

    # --- 42 검증 결과 (검사 1~4 pass, 5~7 은 판정자가 없어 실행하지 않는다)
    # `verification_results.verdict` 는 pass·fail·skip 만 허용한다(0008). 판정자가 없는
    # 검사는 verdict 를 skip 으로 두고 reason_code 로 not_applicable 을 남긴다.
    checks = (
        ("schema_validator", "A0", "pass", "info", None),
        ("source_policy_validator", "A0", "pass", "info", None),
        ("citation_span_validator", "A0", "pass", "info", None),
        ("numerical_consistency", "A0", "pass", "info", None),
        ("claim_evidence_entailment", "A1", "skip", "info", "not_applicable"),
        ("cross_model_sample_audit", "A1", "skip", "info", "not_applicable"),
        ("contradiction_detector", "A0", "skip", "info", "not_applicable"),
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
# `dataset_versions` 는 A1 조각에 있다. 이 조각에는 없으므로 값으로만 확인한다.
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
        if text.count(row["raw_expression"]) != 1:
            problems.append(f"{row['mention_id']}: 청크 안에서 표현이 유일하지 않다")
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

    if family in ("posting_prevalence", "cluster_contrast"):
        return sum(1 for d in dims.values() if slug in d), total
    if family == "requiredness_ratio":
        present = [nn for nn, d in dims.items() if slug in d]
        return sum(1 for nn in present if dims[nn][slug][0] == "required"), len(present)
    if family == "depth_distribution":
        present = [nn for nn, d in dims.items() if slug in d]
        return sum(1 for nn in present if dims[nn][slug][1] == measure), len(present)
    if family == "scope_expansion":
        return sum(1 for d in dims.values() if boundary_hit(d)), total
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
    # 할당 행에서 (공고, 차원) 관계를 다시 만들어 색인과 어긋나지 않았는지 본다.
    mention_of = {row["mention_id"]: row for row in tables["requirement_mentions"]}
    rebuilt: dict[str, set[str]] = {}
    for row in tables["posting_requirement_assignments"]:
        mention = mention_of[row["mention_id"]]
        nn = mention["posting_version_id"].rsplit("_", 1)[-1]
        slug = next(s for s in DIM_SLUGS if dim_id(s) == row["dimension_id"])
        rebuilt.setdefault(nn, set()).add(slug)
    for nn, slugs in rebuilt.items():
        if slugs != set(DIMS_BY_POSTING[nn]):
            problems.append(f"{nn}: 할당에서 다시 만든 차원 집합이 다르다")
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
    counts: Counter[str] = Counter()
    for row in tables["analysis_outputs"]:
        counts[row["output_type"]] += 1
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
        if row["output_type"] == "interpretation":
            for key in ("level", "cluster_tag", "posting_id"):
                if key not in payload["scope"]:
                    problems.append(f"{row['output_id']}: scope.{key} 없음")
            if not 7 <= len(payload["baseline"]) <= 9:
                problems.append(f"{row['output_id']}: baseline 개수 {len(payload['baseline'])}")
            if payload["scope"]["level"] != "overall" and not 2 <= len(payload["deviations"]) <= 4:
                problems.append(f"{row['output_id']}: deviations 개수 {len(payload['deviations'])}")
    # CONTRACT 4장 — 직무당 statistics 1 · interpretation 37 · strategy 7 · roadmap 7.
    expected_counts = {"statistics": 1, "interpretation": 37, "strategy": 7, "roadmap": 7}
    for output_type, expected in expected_counts.items():
        if counts[output_type] != expected:
            problems.append(f"{output_type} 행 수 {counts[output_type]} != {expected}")
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
    """6. 공고 수·기간·기업군·진입 구분과 차원 표본을 확인한다."""
    problems: list[str] = []
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
        if clusters != set(CLUSTERS):
            problems.append(f"{period}: 기업군 차이 {sorted(clusters ^ set(CLUSTERS))}")
        actual_labels = {
            label: sum(1 for p in group if p["entry_label"] == label)
            for label in labels
        }
        if actual_labels != labels:
            problems.append(f"{period}: entry_label {actual_labels} != {labels}")
        for posting in group:
            if not starts_on <= posting["posted_at"] <= ends_on:
                problems.append(f"{posting['nn']}: 게시일 {posting['posted_at']} 범위 밖")

    recent_cluster_counts = Counter(p["cluster"] for p in RECENT_POSTINGS)
    if set(recent_cluster_counts.values()) != {3} or set(recent_cluster_counts) != set(CLUSTERS):
        problems.append(f"recent 기업군 분포 {dict(recent_cluster_counts)} != 기업군별 3건")
    prior_cluster_counts = Counter(p["cluster"] for p in PRIOR_POSTINGS)
    if set(prior_cluster_counts.values()) != {2} or set(prior_cluster_counts) != set(CLUSTERS):
        problems.append(f"prev 기업군 분포 {dict(prior_cluster_counts)} != 기업군별 2건")

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
            p["company_id"] for p in POSTINGS if slug in DIMS_BY_POSTING[p["nn"]]
        }
        if len(companies) < 2:
            problems.append(f"{slug}: 독립 회사 {len(companies)}곳")
    return problems


def check_output_population(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """7. 모듈 산출물 52행과 전체 공고 해석 30행의 범위를 확인한다."""
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
    """8. 출처·기간·대상군·데이터셋·회사 직접 입력값을 확인한다."""
    problems: list[str] = []
    allowed_use_values = {
        "statistics", "interpretation_context", "strategy", "roadmap",
        "wiki_definition", "wiki_why_required", "wiki_depth_criteria", "wiki_prerequisites",
        "wiki_common_misconceptions", "wiki_interview_verification", "wiki_learning_sequence",
    }
    expected_company_clusters = {
        "co_ncsoft": "game", "co_krafton": "game", "co_kakao": "bigtech_platform",
        "co_samsungsds": "si_enterprise", "co_nudgehealthcare": "startup",
        "co_channelcorp": "b2b_saas", "co_kakaopay": "fintech_finance",
        "co_navercloud": "b2b_saas", "co_kakaobank": "fintech_finance",
        "co_wantedlab": "startup", "co_sendbird": "b2b_saas", "co_kbank": "fintech_finance",
        "co_lgcns": "si_enterprise", "co_smilegate": "game",
    }
    for row in tables["source_assessments"]:
        uses = set(row["allowed_uses"])
        if not uses <= allowed_use_values:
            problems.append(f"{row['assessment_id']}: 허용되지 않은 allowed_uses {sorted(uses - allowed_use_values)}")
        if uses != set(ALLOWED_USES):
            problems.append(f"{row['assessment_id']}: 데모 공고 기본 allowed_uses 아님")
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
        problems.append("game_client 모듈이 dataset_versions 행을 만들었다")
    for posting in POSTINGS:
        expected_cluster = expected_company_clusters.get(posting["company_id"])
        if expected_cluster is None:
            problems.append(f"{posting['nn']}: 기준 데이터에 없는 회사 {posting['company_id']}")
        elif posting["cluster"] != expected_cluster:
            problems.append(
                f"{posting['nn']}: 회사 기업군 {posting['cluster']} != {expected_cluster}"
            )
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
