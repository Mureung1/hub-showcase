"""AI 엔지니어 직무의 생성 데모 시드 (갈래 A3).

``agent/data/demo_seed/CONTRACT.md`` 가 이 파일의 기준이다. 데이터베이스에 접속하지
않고 메모리에서 계산해 ``parts/ai_engineer/<table>.csv`` 로만 낸다. 모델 호출은 0회다.

`dataset_versions` 는 A1(backend) 만 만든다. `ds_demo_v1` 는 아홉 직무가 함께 쓰는 한
행이므로 여기서 다시 만들면 적재에서 중복 키가 된다.

CONTRACT 10.5 의 `allowed_uses` 예시값(`baseline`·`evidence`)은 `0001_initial_schema.sql`
의 `allowed_uses_known` CHECK 가 허용하지 않는다. A1 과 같은 값으로 담는다.

최근 1년 공고 5건이 기업군 6종을 다 덮지 못한다. 덮지 못한 기업군의 최근 지표 행은
만들지 않고 `cluster_axes.rows` 에서도 뺀다. 산출물 4종은 기업군 6종 전부에 만든다.

실행: ``cd agent && python -m scripts.demo_seed.ai_engineer``
"""

from __future__ import annotations

import json
import math
from collections import Counter
from typing import Any

from ._csv import demo_seed_root, sha256_hex, write_part

# ============================================================ 식별자
JOB_ROLE_ID = "ai_engineer"
JOB_LABEL = "AI 엔지니어"
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
DIMENSIONS: tuple[tuple[str, str, str, str, tuple[str, ...], bool], ...] = (
    (
        "python",
        "technology",
        "Python 구현력",
        "데이터 처리와 학습·추론 코드를 Python 으로 직접 작성하는 요구.",
        ("Python", "파이썬", "Python 3"),
        False,
    ),
    (
        "dl-framework",
        "technology",
        "딥러닝 프레임워크",
        "PyTorch·TensorFlow 로 모델을 정의하고 학습·평가 루프를 다루는 요구.",
        ("PyTorch", "파이토치", "TensorFlow", "딥러닝 프레임워크"),
        False,
    ),
    (
        "llm-app",
        "technology",
        "LLM 응용·RAG",
        "상용·오픈 언어 모델을 프롬프트와 검색 증강으로 제품 기능에 붙이는 요구.",
        ("LLM", "RAG", "프롬프트 설계", "파인튜닝"),
        False,
    ),
    (
        "data-prep",
        "practice",
        "데이터 전처리·품질 관리",
        "학습과 평가에 쓸 데이터를 수집·정제·가공하고 품질을 관리하는 요구.",
        ("데이터 전처리", "데이터 파이프라인", "라벨링", "피처 엔지니어링"),
        False,
    ),
    (
        "model-serving",
        "tooling",
        "모델 서빙·배포",
        "학습한 모델을 추론 서버와 API 로 배포하고 지연·비용을 관리하는 요구.",
        ("모델 서빙", "추론 서버", "TorchServe", "Triton"),
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
    ("python", "dl-framework", "related"),
    ("python", "data-prep", "related"),
    ("dl-framework", "model-serving", "related"),
    ("llm-app", "data-prep", "related"),
    ("llm-app", "model-serving", "related"),
)

# ============================================================ 2. 역량 3종
CAPABILITIES: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    (
        "model-training",
        "모델 학습·실험 관리",
        "데이터를 받아 모델을 학습하고 결과를 지표로 비교해 다음 실험을 정하는 능력.",
        ("python", "dl-framework", "data-prep"),
    ),
    (
        "serving-ops",
        "모델 서빙·운영",
        "학습한 모델을 호출 가능한 형태로 배포하고 지연·비용·품질을 관찰하는 능력.",
        ("python", "model-serving"),
    ),
    (
        "llm-application",
        "LLM 응용 설계",
        "검색 증강과 프롬프트 설계로 언어 모델을 제품 기능에 연결하는 능력.",
        ("llm-app", "data-prep"),
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
    ("model-training", "serving-ops"),
    ("model-training", "llm-application"),
)


# ============================================================ 3. 채용공고 15건
# 한 줄은 (본문, 차원 slug 또는 None, depth_level, 주석) 이다.
# 주석은 상세 해석이 필요한 공고에 붙는다. 해석 payload 의 세 종류 번호가 여기서 나온다.
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
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-03-10T10:00:00+09:00",
        "title": "AI 엔지니어 (검색 품질) 신입·주니어",
        "sections": (
            ("주요업무", (
                ("검색 품질을 높이는 랭킹 모델을 학습하고 평가합니다.", None, "application",
                 ("note", "모델보다 지표가 먼저입니다",
                  "학습 뒤에 평가가 붙어 있습니다. 무엇이 좋아졌는지 숫자로 말하는 일이 업무의 절반이라는 뜻입니다.")),
                ("학습 데이터 수집과 전처리 파이프라인을 설계하고 운영합니다.", "data-prep", "application",
                 ("note", "데이터 준비가 업무에 명시되어 있습니다",
                  "정리된 데이터셋을 받아 쓰는 자리가 아니라 직접 만드는 자리입니다. 전처리 코드를 스스로 짜 본 경험이 그대로 이야깃거리가 됩니다.")),
                ("학습한 모델을 사내 추론 플랫폼에 올리고 지표를 관찰합니다.", "model-serving", "application",
                 ("note", "서빙까지 함께 봅니다",
                  "연구와 배포가 분리되지 않은 팀입니다. 노트북 밖으로 모델을 꺼내 본 경험이 있으면 협업 질문에서 바로 쓸 수 있습니다.")),
            )),
            ("자격요건", (
                ("Python으로 데이터 처리와 모델 학습 코드를 직접 작성할 수 있는 분", "python", "application",
                 ("base", "Python 구현력",
                  "직접 작성의 실질은 남의 코드를 고치는 수준이 아니라 처음부터 짜 본 사람입니다. 데이터를 읽어 학습까지 잇는 저장소 하나면 증명됩니다.")),
                ("PyTorch 또는 TensorFlow로 모델을 학습하고 평가해 본 경험이 있는 분", "dl-framework", "application",
                 ("base", "딥러닝 프레임워크",
                  "프레임워크를 둘로 열어 둔 것은 도구보다 학습 루프의 이해를 본다는 뜻입니다. 어느 쪽이든 끝까지 돌려 본 결과물 하나로 충족됩니다.")),
                ("실험 결과를 지표로 정리하고 팀에 설명할 수 있는 분", None, "application",
                 ("base", "평가 지표 설계·설명",
                  "설명할 수 있는 분이 자격요건에 있습니다. 좋아졌다가 아니라 어떤 지표가 얼마나 좋아졌는지 말할 준비가 필요합니다.")),
            )),
            ("우대사항", (
                ("대규모 학습 데이터를 다뤄 본 경험이 있는 분", "data-prep", "tradeoff",
                 ("mark", "규모 — 신입 라벨과 함께 붙은 심화 요구",
                  "신입 지원이 가능하다고 적어 두고 우대에 대규모를 넣었습니다. 실무 규모의 증명이 아니라 데이터가 커지면 무엇이 먼저 무너지는지 아는가를 묻는 신호로 읽는 것이 합리적입니다.",
                  "high", "같은 직군 80%")),
                ("학습 파이프라인을 자동화해 본 경험이 있는 분", None, "application",
                 ("note", "자동화 — 반복을 줄인 흔적",
                  "손으로 돌린 실험은 재현되지 않습니다. 스크립트 하나로 다시 돌릴 수 있게 만든 기록이면 충분합니다.")),
                ("GPU 자원을 효율적으로 사용해 본 경험이 있는 분", None, "foundation",
                 ("note", "자원 — 비용 감각을 봅니다",
                  "최적화 실무를 기대하기보다 학습 한 번에 얼마가 드는지 재 본 적이 있는지를 봅니다.")),
            )),
        ),
        "summary": "모델을 잘 쓰는 사람보다 데이터를 직접 만들고 결과를 숫자로 말하는 사람을 찾습니다. 기준선 항목은 대체로 공통 기대치 그대로이고, 대규모 데이터 감각이 이 공고의 실질 변별점입니다.",
        "summary_ratio": "편차 1건 · 기준선 일치 3건",
    },
    {
        "nn": "02",
        "company_id": "co_upstage",
        "company": "업스테이지",
        "cluster": "startup",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 환영",
        "career_label_raw": "경력 무관",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-01-19T10:00:00+09:00",
        "title": "AI 엔지니어 (문서 이해 제품) 신입·주니어",
        "sections": (
            ("주요업무", (
                ("LLM 기반 문서 이해 제품의 기능을 설계하고 구현합니다.", None, "application",
                 ("note", "제품 기능이 목적지입니다",
                  "논문 재현이 아니라 사용자가 쓰는 기능을 만듭니다. 모델 성능보다 기능이 동작하는가를 먼저 묻습니다.")),
                ("사내 파운데이션 모델을 도메인 데이터로 미세조정합니다.", None, "application",
                 ("note", "미세조정 — 데이터가 결과를 정합니다",
                  "학습 기법보다 어떤 데이터를 넣었는가가 결과를 가릅니다. 우대의 라벨링 품질 문장이 여기서 이어집니다.")),
                ("실험 결과를 분석해 다음 학습 방향을 제안합니다.", None, "application",
                 ("note", "제안까지가 업무입니다",
                  "시키는 실험을 돌리는 자리가 아닙니다. 결과를 읽고 다음을 스스로 정해 본 기록이 있으면 강합니다.")),
            )),
            ("자격요건", (
                ("Python으로 학습·평가 스크립트를 작성해 본 경험이 있는 분", "python", "application",
                 ("base", "Python 구현력",
                  "학습과 평가를 한 벌로 묶었습니다. 점수를 뽑는 코드까지 있어야 이 문장이 채워집니다.")),
                ("PyTorch로 모델을 학습하고 손실 함수를 다뤄 본 경험이 있는 분", "dl-framework", "application",
                 ("base", "딥러닝 프레임워크",
                  "손실 함수를 콕 집었습니다. 예제를 돌린 수준이 아니라 학습이 왜 안 되는지 들여다본 경험을 봅니다.")),
                ("LLM 프롬프트와 RAG 구조를 이해하고 구현해 본 경험이 있는 분", "llm-app", "application",
                 ("mark", "LLM 응용 — 우대가 아니라 자격요건입니다",
                  "다른 기업군에서 우대이던 항목이 여기서는 필수 자리에 있습니다. API 호출 경험이 아니라 검색과 프롬프트를 조합해 하나를 완성해 본 경험을 기대한다고 읽힙니다.",
                  "high", "같은 직군 60%")),
            )),
            ("우대사항", (
                ("데이터 전처리와 라벨링 품질을 관리해 본 경험이 있는 분", "data-prep", "foundation",
                 ("mark", "라벨링 품질 — 작은 팀의 실질 병목",
                  "주요업무의 미세조정과 묶어 읽으면 우대 라벨보다 비중이 큽니다. 데이터를 손으로 들여다본 사람이 결과를 바꿉니다.",
                  "mid", "같은 직군 80%")),
                ("논문을 읽고 재현해 본 경험이 있는 분", None, "application",
                 ("note", "논문 — 성과가 아니라 학습 방식을 봅니다",
                  "한 편을 끝까지 읽고 간단히 재현한 기록이면 됩니다. 새 기법을 스스로 따라가는 방식을 확인하는 문장입니다.")),
                ("실험 설정과 결과를 재현 가능하게 기록해 오신 분", None, "application",
                 ("base", "실험 기록·재현성",
                  "라벨은 우대지만 실험이 업무의 중심인 팀에서는 사실상 기본기입니다. 설정과 결과를 함께 남긴 기록이면 충분합니다.")),
            )),
        ),
        "summary": "모델을 학습시키는 사람이 아니라 제품이 되게 만드는 사람을 찾습니다. LLM 응용이 우대가 아니라 자격요건에 있는 것이 이 공고의 가장 뚜렷한 신호입니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 3건",
    },
    {
        "nn": "03",
        "company_id": "co_navercloud",
        "company": "네이버클라우드",
        "cluster": "b2b_saas",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 가능",
        "career_label_raw": "신입~2년",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-02-24T10:00:00+09:00",
        "title": "AI API 서비스 엔지니어 신입·주니어",
        "sections": (
            ("주요업무", (
                ("기업 고객에게 제공하는 AI API 서비스의 서빙 구조를 개발합니다.", "model-serving", "application",
                 ("note", "고객이 호출하는 API 입니다",
                  "실험용 엔드포인트가 아니라 남이 돈을 내고 쓰는 API 입니다. 실패 응답과 안정성이 모델 성능만큼 중요해집니다.")),
                ("고객 데이터 특성에 맞춰 전처리 규칙을 정의하고 자동화합니다.", "data-prep", "application",
                 ("note", "고객마다 데이터가 다릅니다",
                  "한 번 짜고 끝나는 전처리가 아닙니다. 규칙을 바꿔 끼울 수 있게 만드는 설계 감각을 봅니다.")),
                ("서빙 지연과 처리량을 측정해 개선안을 제안합니다.", None, "application",
                 ("note", "지연이 곧 제품 품질입니다",
                  "측정이 앞에 있습니다. 재 보지 않고 빨라졌다고 말하는 답변은 이 팀에서 통하지 않습니다.")),
            )),
            ("자격요건", (
                ("Python 문법과 표준 라이브러리를 이해하고 사용할 수 있는 분", "python", "foundation",
                 ("base", "Python 구현력",
                  "요구 수준이 기본기입니다. 화려한 프로젝트보다 정확하게 쓰는 코드가 유리한 문장입니다.")),
                ("모델을 추론 서버로 배포하고 API로 제공해 본 경험이 있는 분", "model-serving", "application",
                 ("mark", "서빙 — 자격요건 자리에 있습니다",
                  "다른 기업군에서 우대이던 서빙이 필수 요건입니다. 학습 결과를 호출 가능한 형태로 감싸 본 경험이 없으면 지원 자체가 어렵다고 읽힙니다.",
                  "high", "같은 직군 80%")),
                ("데이터 전처리 파이프라인을 코드로 작성해 본 경험이 있는 분", "data-prep", "application",
                 ("base", "데이터 전처리·품질 관리",
                  "코드로 라는 단서가 붙었습니다. 손으로 정리한 표가 아니라 다시 돌릴 수 있는 스크립트를 봅니다.")),
            )),
            ("우대사항", (
                ("LLM API를 활용한 응용 기능을 만들어 본 경험이 있는 분", "llm-app", "foundation",
                 ("note", "LLM — 여기서는 우대입니다",
                  "제품의 중심이 서빙 인프라라 응용은 보조 항목입니다. 작은 기능 하나면 충분합니다.")),
                ("추론 지연 시간을 줄이기 위해 최적화해 본 경험이 있는 분", None, "tradeoff",
                 ("mark", "지연 최적화 — 신입에게는 측정까지",
                  "주요업무의 측정 문장과 짝을 이룹니다. 최적화 실무보다 어디가 느린지 찾아 본 적이 있는가를 묻는 신호로 읽는 것이 합리적입니다.",
                  "mid", "같은 직군 40%")),
                ("컨테이너와 쿠버네티스 환경에 익숙한 분", None, "foundation",
                 ("note", "직무 밖 접점 — 인프라",
                  "AI 엔지니어 공고인데 배포 도구를 묻습니다. 직무 외 요구 가운데 서빙·인프라가 가장 자주 나타나는 이유입니다.")),
            )),
        ),
        "summary": "모델을 만드는 사람보다 모델을 서비스로 돌리는 사람을 찾습니다. 서빙이 우대가 아니라 자격요건에 있고, 전처리에도 코드로 라는 단서가 붙었습니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 3건",
    },
    {
        "nn": "04",
        "company_id": "co_kakaobank",
        "company": "카카오뱅크",
        "cluster": "fintech_finance",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "경력 3년 이상",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-05-12T10:00:00+09:00",
        "title": "AI 엔지니어 (이상거래 탐지)",
        "sections": (
            ("주요업무", (
                ("이상거래 탐지 모델을 개발하고 운영합니다.", None, "application",
                 ("note", "개발과 운영이 한 문장에 있습니다",
                  "만들고 넘기는 자리가 아닙니다. 배포한 모델이 계속 맞는지 보는 일까지가 업무입니다.")),
                ("금융 데이터 전처리와 피처 파이프라인을 설계합니다.", "data-prep", "application",
                 ("note", "피처가 성능을 정합니다",
                  "이 도메인은 모델 구조보다 어떤 피처를 만들었는가가 결과를 가릅니다.")),
                ("모델 성능 저하를 감지하고 재학습 주기를 관리합니다.", None, "application",
                 ("note", "성능은 시간이 지나면 떨어집니다",
                  "데이터 분포가 바뀌면 어제의 모델이 오늘 틀립니다. 재학습 주기를 정해 본 경험이 여기서 쓰입니다.")),
            )),
            ("자격요건", (
                ("Python으로 데이터 분석과 모델링을 수행할 수 있는 분", "python", "application",
                 ("base", "Python 구현력",
                  "분석과 모델링을 함께 적었습니다. 전 기업군 공통 기대치 그대로입니다.")),
                ("대용량 금융 데이터를 전처리하고 피처를 설계해 본 경험이 있는 분", "data-prep", "tradeoff",
                 ("mark", "데이터 — 이 기업군의 최대 변별점",
                  "대용량과 피처 설계가 필수 요건에 함께 있습니다. 정제 절차뿐 아니라 어떤 값을 만들어야 이상을 잡을 수 있는지 설명할 수 있는 수준을 기대한다고 읽힙니다.",
                  "high", "같은 직군 80%")),
                ("학습한 모델을 운영 환경에 배포하고 모니터링해 본 경험이 있는 분", "model-serving", "tradeoff",
                 ("mark", "운영 — 배포로 끝나지 않습니다",
                  "모니터링이 필수 요건에 붙었습니다. 올려 봤다가 아니라 떨어지는 것을 알아채고 대응해 본 경험을 묻습니다.",
                  "high", "같은 직군 80%")),
            )),
            ("우대사항", (
                ("딥러닝 프레임워크로 시계열 모델을 다뤄 본 경험이 있는 분", "dl-framework", "application",
                 ("base", "딥러닝 프레임워크",
                  "우대 자리에 있습니다. 이 도메인은 딥러닝보다 피처와 운영이 먼저라는 뜻으로 읽힙니다.")),
                ("금융 도메인 규제와 데이터 보호 정책을 이해하는 분", None, "foundation",
                 ("note", "규제 — 관심의 증거를 봅니다",
                  "전공 지식이 아니라 왜 이 데이터를 함부로 못 쓰는지 아는 정도면 됩니다.")),
                ("모델 판단 근거를 설명하는 방법에 익숙한 분", None, "application",
                 ("note", "설명 가능성 — 금융의 특수 요구",
                  "왜 이 거래를 막았는지 사람에게 설명해야 하는 도메인입니다. 정확도만으로는 끝나지 않습니다.")),
            )),
        ),
        "summary": "모델을 만드는 능력보다 돈이 걸린 판단을 계속 맞게 유지하는 능력을 봅니다. 데이터 피처 설계와 운영 모니터링 두 축이 이 공고의 실질 변별점입니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 2건",
    },
    {
        "nn": "05",
        "company_id": "co_ncsoft",
        "company": "엔씨소프트",
        "cluster": "game",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "경력 3년 이상",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-06-09T10:00:00+09:00",
        "title": "게임 AI 엔지니어",
        "sections": (
            ("주요업무", (
                ("게임 내 AI 기능에 사용할 모델을 설계하고 학습합니다.", None, "application",
                 ("note", "설계가 앞에 있습니다",
                  "공개 모델을 가져다 쓰는 자리가 아닙니다. 문제에 맞는 구조를 스스로 정하는 일이 업무의 시작입니다.")),
                ("게임 로그 데이터를 분석해 학습 데이터로 가공합니다.", None, "application",
                 ("note", "로그는 정제되지 않은 데이터입니다",
                  "정리된 데이터셋이 주어지지 않습니다. 원시 로그에서 라벨을 만들어 본 경험이 그대로 쓰입니다.")),
                ("클라이언트·서버 팀과 협업해 모델을 게임에 적용합니다.", None, "application",
                 ("note", "직무 밖 접점 — 게임 조직",
                  "혼자 끝나는 일이 아닙니다. 다른 직군에 모델을 설명해 본 경험이 협업 질문의 답이 됩니다.")),
            )),
            ("자격요건", (
                ("Python으로 학습 파이프라인을 구현할 수 있는 분", "python", "application",
                 ("base", "Python 구현력",
                  "파이프라인이라고 적었습니다. 스크립트 하나가 아니라 단계가 이어지는 코드를 봅니다.")),
                ("딥러닝 프레임워크의 학습 구조를 이해하고 직접 수정할 수 있는 분", "dl-framework", "tradeoff",
                 ("mark", "프레임워크 — 쓰는 수준을 넘습니다",
                  "직접 수정이 필수 요건에 있습니다. 학습 루프와 손실 계산을 열어 고쳐 본 경험을 기대한다고 읽힙니다. 이 기업군의 가장 뚜렷한 심화 요구입니다.",
                  "high", "같은 직군 80%")),
                ("모델 실험 결과를 재현 가능한 형태로 관리해 본 경험이 있는 분", None, "application",
                 ("base", "실험 기록·재현성",
                  "자격요건 자리에 있습니다. 설정과 결과를 함께 남긴 기록이 필수라는 뜻입니다.")),
            )),
            ("우대사항", (
                ("게임 서버에 모델을 서빙해 본 경험이 있는 분", "model-serving", "application",
                 ("mark", "실시간 서빙 — 지연이 사용자 경험입니다",
                  "게임은 응답이 늦으면 기능 자체가 성립하지 않습니다. 서빙이 우대에 있지만 이 도메인에서는 실질 비중이 큽니다.",
                  "mid", "같은 직군 80%")),
                ("LLM을 활용한 대화형 NPC를 만들어 본 경험이 있는 분", "llm-app", "application",
                 ("note", "LLM — 새로 붙는 요구",
                  "이전 1년 공고에는 드물던 문장입니다. 작은 데모라도 만들어 본 경험이 신선하게 읽힙니다.")),
                ("모델 경량화 도구를 사용해 본 경험이 있는 분", None, "application",
                 ("note", "경량화 — 지연과 비용의 다른 이름",
                  "큰 모델을 그대로 올릴 수 없는 환경입니다. 크기를 줄여 본 시도가 있으면 대화가 됩니다.")),
            )),
        ),
        "summary": "모델을 쓰는 사람이 아니라 학습 구조를 열어 고칠 수 있는 사람을 찾습니다. 프레임워크 내부 이해와 실시간 서빙이 이 공고의 두 축입니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 3건",
    },
    {
        "nn": "06",
        "company_id": "co_kakao",
        "company": "카카오",
        "cluster": "bigtech_platform",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입~3년",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-02-18T10:00:00+09:00",
        "title": "AI 엔지니어 (추천) 신입·주니어",
        "sections": (
            ("주요업무", (
                ("추천 모델 학습과 A/B 테스트를 담당합니다.", None, "application", None),
                ("학습 데이터셋을 구축하고 품질을 점검합니다.", "data-prep", "foundation", None),
            )),
            ("자격요건", (
                ("Python으로 데이터 처리 코드를 작성할 수 있는 분", "python", "application", None),
                ("딥러닝 프레임워크로 모델을 학습해 본 경험이 있는 분", "dl-framework", "application", None),
            )),
            ("우대사항", (
                ("추천 시스템 관련 논문을 읽어 본 분", None, "foundation", None),
                ("대규모 로그 데이터를 다뤄 본 경험이 있는 분", None, "application", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "07",
        "company_id": "co_wantedlab",
        "company": "원티드랩",
        "cluster": "startup",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입",
        "career_label_raw": "신입",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-04-08T10:00:00+09:00",
        "title": "AI 엔지니어 (신입)",
        "sections": (
            ("주요업무", (
                ("채용 매칭 서비스에 적용할 AI 기능을 개발합니다.", None, "foundation", None),
                ("모델 실험 결과를 정리해 공유합니다.", None, "foundation", None),
            )),
            ("자격요건", (
                ("Python 기본 문법과 데이터 구조를 이해하는 분", "python", "foundation", None),
                ("새로운 기술을 스스로 학습하고 정리할 수 있는 분", None, "foundation", None),
            )),
            ("우대사항", (
                ("LLM API를 사용해 기능을 만들어 본 경험이 있는 분", "llm-app", "foundation", None),
                ("데이터 전처리 경험이 있는 분", "data-prep", "foundation", None),
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
        "career_label_raw": "경력 3년 이상",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-05-26T10:00:00+09:00",
        "title": "AI 엔지니어 (고객사 프로젝트)",
        "sections": (
            ("주요업무", (
                ("고객사 업무 시스템에 적용할 AI 모델을 개발합니다.", None, "application", None),
                ("고객 데이터를 수집하고 전처리하는 절차를 문서화합니다.", None, "foundation", None),
            )),
            ("자격요건", (
                ("Python 기반 분석·모델링 업무 수행이 가능한 분", "python", "foundation", None),
                ("고객 데이터를 정제하고 전처리해 본 경험이 있는 분", "data-prep", "application", None),
            )),
            ("우대사항", (
                ("딥러닝 프레임워크 사용 경험이 있는 분", "dl-framework", "foundation", None),
                ("프로젝트 산출물 문서를 작성해 본 경험이 있는 분", None, "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "09",
        "company_id": "co_sendbird",
        "company": "센드버드",
        "cluster": "b2b_saas",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "경력 3년 이상",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-06-23T10:00:00+09:00",
        "title": "AI 엔지니어 (메시징 제품)",
        "sections": (
            ("주요업무", (
                ("메시징 제품에 적용할 AI 기능을 개발합니다.", None, "application", None),
                ("모델 API의 응답 품질을 점검합니다.", None, "application", None),
            )),
            ("자격요건", (
                ("Python으로 서비스 코드를 작성할 수 있는 분", "python", "application", None),
                ("영어 문서를 읽고 소통할 수 있는 분", None, "foundation", None),
            )),
            ("우대사항", (
                ("모델을 API 형태로 서빙해 본 경험이 있는 분", "model-serving", "application", None),
                ("LLM을 활용한 제품 기능을 만들어 본 경험이 있는 분", "llm-app", "application", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "10",
        "company_id": "co_coupang",
        "company": "쿠팡",
        "cluster": "bigtech_platform",
        "period": PRIOR,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입~2년",
        "edu_label_raw": "학사 이상",
        "posted_at": "2025-08-19T10:00:00+09:00",
        "title": "AI 엔지니어 (수요 예측) 신입·주니어",
        "sections": (
            ("주요업무", (
                ("상품 수요 예측 모델의 학습 데이터를 구축하고 품질을 점검합니다.", "data-prep", "application", None),
                ("예측 결과를 평가 지표로 비교하고 개선 실험을 수행합니다.", None, "application", None),
            )),
            ("자격요건", (
                ("Python으로 데이터 처리와 모델 학습 코드를 작성할 수 있는 분", "python", "application", None),
                ("PyTorch로 예측 모델을 학습해 본 경험이 있는 분", "dl-framework", "application", None),
            )),
            ("우대사항", (
                ("대규모 거래 데이터를 전처리해 본 경험이 있는 분", "data-prep", "tradeoff", None),
                ("실험 결과를 재현 가능한 형태로 기록해 본 분", None, "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "11",
        "company_id": "co_daangn",
        "company": "당근마켓",
        "cluster": "startup",
        "period": PRIOR,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "경력 무관",
        "edu_label_raw": "학력 무관",
        "posted_at": "2025-06-10T10:00:00+09:00",
        "title": "AI 엔지니어 (지역 추천) 신입·주니어",
        "sections": (
            ("주요업무", (
                ("지역 서비스에 적용할 추천 모델과 LLM 기능을 개발합니다.", "llm-app", "application", None),
                ("사용자 행동 로그를 학습 데이터로 정제합니다.", "data-prep", "application", None),
            )),
            ("자격요건", (
                ("Python으로 데이터 분석과 모델 실험을 수행할 수 있는 분", "python", "application", None),
                ("서비스 문제를 실험 가능한 가설로 바꿀 수 있는 분", None, "foundation", None),
            )),
            ("우대사항", (
                ("RAG 또는 프롬프트 기반 기능을 만들어 본 경험이 있는 분", "llm-app", "application", None),
                ("데이터 라벨링 기준을 설계해 본 경험이 있는 분", "data-prep", "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "12",
        "company_id": "co_channelcorp",
        "company": "채널코퍼레이션",
        "cluster": "b2b_saas",
        "period": PRIOR,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입~3년",
        "edu_label_raw": "학사 이상",
        "posted_at": "2025-10-14T10:00:00+09:00",
        "title": "AI 엔지니어 (상담 자동화) 신입·주니어",
        "sections": (
            ("주요업무", (
                ("고객 상담 문서를 검색하는 RAG 기능을 개발합니다.", "llm-app", "application", None),
                ("모델 응답 API의 지연과 오류를 관찰합니다.", "model-serving", "application", None),
            )),
            ("자격요건", (
                ("Python으로 웹 API와 데이터 처리 코드를 작성할 수 있는 분", "python", "application", None),
                ("LLM 응답 품질을 평가해 본 경험이 있는 분", "llm-app", "foundation", None),
            )),
            ("우대사항", (
                ("모델을 컨테이너 환경에 배포해 본 경험이 있는 분", "model-serving", "foundation", None),
                ("고객 피드백을 제품 개선에 반영해 본 분", None, "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "13",
        "company_id": "co_viva",
        "company": "비바리퍼블리카",
        "cluster": "fintech_finance",
        "period": PRIOR,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "경력 3년 이상",
        "edu_label_raw": "학사 이상",
        "posted_at": "2024-09-03T10:00:00+09:00",
        "title": "AI 엔지니어 (금융 위험 모델)",
        "sections": (
            ("주요업무", (
                ("금융 위험 모델에 사용할 데이터를 정제하고 피처를 설계합니다.", "data-prep", "tradeoff", None),
                ("운영 모델의 성능과 데이터 변화를 모니터링합니다.", "model-serving", "application", None),
            )),
            ("자격요건", (
                ("Python으로 대용량 데이터를 분석하고 모델링할 수 있는 분", "python", "application", None),
                ("데이터 품질 검증 절차를 설계해 본 경험이 있는 분", "data-prep", "application", None),
            )),
            ("우대사항", (
                ("모델 서빙 파이프라인을 운영해 본 경험이 있는 분", "model-serving", "application", None),
                ("금융 데이터 보호 정책을 이해하는 분", None, "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "14",
        "company_id": "co_lgcns",
        "company": "엘지씨엔에스",
        "cluster": "si_enterprise",
        "period": PRIOR,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "경력 3년 이상",
        "edu_label_raw": "학사 이상",
        "posted_at": "2024-05-21T10:00:00+09:00",
        "title": "AI 엔지니어 (제조 품질 분석)",
        "sections": (
            ("주요업무", (
                ("제조 현장 데이터를 수집하고 학습용 데이터로 전처리합니다.", "data-prep", "application", None),
                ("품질 예측 모델을 개발하고 고객사 환경에서 검증합니다.", "dl-framework", "application", None),
            )),
            ("자격요건", (
                ("Python 기반 데이터 분석과 모델 개발 경험이 있는 분", "python", "application", None),
                ("딥러닝 프레임워크로 모델을 학습해 본 경험이 있는 분", "dl-framework", "application", None),
            )),
            ("우대사항", (
                ("센서 데이터의 결측과 이상치를 처리해 본 경험이 있는 분", "data-prep", "foundation", None),
                ("고객사 프로젝트 문서를 작성해 본 경험이 있는 분", None, "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "15",
        "company_id": "co_krafton",
        "company": "크래프톤",
        "cluster": "game",
        "period": PRIOR,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "경력 3년 이상",
        "edu_label_raw": "학사 이상",
        "posted_at": "2025-03-25T10:00:00+09:00",
        "title": "게임 AI 엔지니어 (대화형 캐릭터)",
        "sections": (
            ("주요업무", (
                ("대화형 캐릭터를 위한 LLM 응용 모델을 개발합니다.", "llm-app", "application", None),
                ("게임 서버에서 사용할 추론 API를 개발하고 운영합니다.", "model-serving", "tradeoff", None),
            )),
            ("자격요건", (
                ("Python으로 모델 학습과 평가 코드를 구현할 수 있는 분", "python", "application", None),
                ("PyTorch 학습 구조를 수정하고 실험해 본 경험이 있는 분", "dl-framework", "tradeoff", None),
            )),
            ("우대사항", (
                ("LLM 프롬프트와 RAG 구조를 설계해 본 경험이 있는 분", "llm-app", "application", None),
                ("실시간 모델 서빙의 지연을 측정해 본 경험이 있는 분", "model-serving", "application", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
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
            ("python", "dl-framework"),
            ("python", "data-prep"),
            ("dl-framework", "model-serving"),
            ("llm-app", "data-prep"),
            ("model-serving", "data-prep"),
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
# CONTRACT 5장 A. tag·type·id·축 라벨은 AI 엔지니어 전용이다. 다른 직무에 쓰지 않는다.
SCOPE_EXPANSION_TAGS: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    ("mlops_serving", "MLOps·서빙", "학습으로 끝내지 않고 배포와 운영까지 요구",
     ("model-serving",)),
    ("data_engineering", "데이터 엔지니어링", "수집·전처리 파이프라인 구축까지 요구",
     ("data-prep",)),
    ("llm_product", "LLM 제품 기능", "모델 응용을 제품 기능으로 붙이는 일까지 요구",
     ("llm-app",)),
)

ADVANCED_TYPES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("large_scale_data", "대규모 데이터·분산 학습", ("data-prep",)),
    ("serving_ops", "운영 배포·품질 저하 대응", ("model-serving",)),
    ("framework_internals", "프레임워크 내부 구조", ("dl-framework",)),
)

COMBOS: tuple[tuple[str, str, str, str, tuple[str, ...]], ...] = (
    ("core", "Python + 딥러닝 프레임워크 + 데이터 전처리",
     "데이터를 직접 다듬어 모델을 학습시키고 결과를 지표로 정리하는 기본 조합입니다.",
     "한 데이터셋으로 학습과 평가를 끝까지 돌려 본 수준",
     ("python", "dl-framework", "data-prep")),
    ("serving", "기본 스택 + 모델 서빙",
     "학습으로 끝내지 않고 호출 가능한 API 로 감싸 본 경험을 묻는 조합입니다.",
     "모델을 엔드포인트로 배포해 본 수준",
     ("python", "dl-framework", "model-serving")),
    ("llm", "LLM 응용 + 데이터 전처리",
     "문서를 다듬어 색인하고 검색 증강으로 답을 만드는 조합입니다.",
     "질의응답 파이프라인 한 벌을 완성한 수준",
     ("llm-app", "data-prep")),
    ("ops", "모델 서빙 + 데이터 전처리",
     "운영 중인 모델에 새 데이터를 태워 재학습하고 다시 배포하는 조합입니다.",
     "재학습 주기를 설계해 본 수준",
     ("model-serving", "data-prep")),
)

REALITY_TAGS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("end_to_end", "학습부터 서빙까지 이어 본 경험", ("dl-framework", "model-serving")),
    ("data_handling", "데이터를 직접 다듬어 본 경험", ("data-prep",)),
    ("llm_product", "LLM 을 제품 기능으로 붙여 본 경험", ("llm-app",)),
)

CLUSTER_AXES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("modeling", "연구·모델링", ("dl-framework",)),
    ("serving_infra", "서빙·인프라", ("model-serving",)),
    ("llm_app", "LLM 응용", ("llm-app",)),
    ("data_quality", "데이터 품질", ("data-prep",)),
    ("engineering", "구현 기본기", ("python",)),
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

    # --- cluster_axes (최근 공고가 없는 기업군은 행을 만들지 않는다)
    axes_rows = []
    for cluster_id in RECENT_CLUSTERS:
        n = cluster_n[cluster_id]
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
    ("python", "python", "Python 구현력",
     "데이터를 읽어 학습과 평가까지 잇는 코드를 스스로 짜는 능력입니다. 최근 공고 전량이 요구하며 대부분 자격요건에 둡니다."),
    ("dl-framework", "dl-framework", "딥러닝 프레임워크",
     "학습 루프와 손실 계산을 다루는 능력입니다. 도구 이름보다 학습이 왜 안 되는지 들여다본 경험을 봅니다."),
    ("data-prep", "data-prep", "데이터 전처리·품질 관리",
     "정리된 데이터셋이 주어지지 않는 일입니다. 다시 돌릴 수 있는 전처리 코드가 기대치의 기준선입니다."),
    ("model-serving", "model-serving", "모델 서빙·배포",
     "학습 결과를 호출 가능한 형태로 감싸 본 경험입니다. 직무 외 요구로 분류되지만 등장 빈도는 기본기에 가깝습니다."),
    ("llm-app", "llm-app", "LLM 응용·RAG",
     "언어 모델을 제품 기능으로 붙여 본 경험입니다. 1년 사이 우대에서 자격요건으로 올라오는 흐름이 뚜렷합니다."),
    ("eval-metric", None, "평가 지표 설계·설명",
     "좋아졌다가 아니라 어떤 지표가 얼마나 좋아졌는지 말하는 능력입니다. 신입 지원자 사이에서 가장 희소한 항목입니다."),
    ("exp-repro", None, "실험 기록·재현성",
     "설정과 결과를 함께 남겨 다시 돌릴 수 있게 하는 습관입니다. 우대와 자격요건 양쪽에서 나타납니다."),
    ("collab-share", None, "협업·결과 공유",
     "다른 직군에 모델과 실험 결과를 설명해 본 기록입니다. 기업군과 무관하게 같은 수준을 요구합니다."),
)

UNCHANGED_ITEMS: tuple[tuple[str, str, str], ...] = (
    ("python", "Python 구현력",
     "이 기업군도 요구 수준은 공통 기대치와 같습니다. 차별화 지점이 아니라 전제 조건입니다."),
    ("eval-metric", "평가 지표 설계·설명",
     "지표로 말하는 능력은 전 기업군 공통입니다. 더 요구하지도, 덜 보지도 않습니다."),
    ("exp-repro", "실험 기록·재현성",
     "설정과 결과를 남기는 습관은 기업군과 무관하게 동일합니다. 준비했다면 어디에나 통합니다."),
    ("collab-share", "협업·결과 공유",
     "설명하고 공유하는 요구는 공통입니다. 심화는 다른 편차 항목이 담당합니다."),
)

# 기업군별 편차.
# (차원 slug, 주제, 기준선, 편차, 근거, 해석, 신뢰도, 근거 블록, 체크 개념 slug)
CLUSTER_DEVIATIONS: dict[str, tuple[tuple[str, ...], ...]] = {
    "bigtech_platform": (
        ("data-prep", "데이터 규모", "다시 돌릴 수 있는 전처리 코드", "대규모 데이터에서 무엇이 먼저 무너지는지 아는 수준까지",
         '우대사항의 "대규모 학습 데이터를 다뤄 본 경험" 문장',
         "신입 지원이 가능하다고 적어 두고 우대에 대규모를 넣었습니다. 실무 규모의 증명이 아니라 규모가 커질 때의 병목을 설명할 수 있는가를 봅니다.",
         "high", "#advanced", "python-data"),
        ("model-serving", "서빙", "모델을 감싸 본 경험", "사내 추론 플랫폼에 올리고 지표를 관찰하는 수준까지",
         '주요업무의 "사내 추론 플랫폼에 올리고 지표를 관찰" 문장',
         "연구와 배포가 분리되지 않은 팀입니다. 올린 뒤에 무엇을 보는지까지 준비해야 합니다.",
         "mid", "#items", "serving-api"),
        ("dl-framework", "모델링", "학습 루프를 돌려 본 경험", "평가 지표까지 함께 설계하는 수준까지",
         '자격요건의 "실험 결과를 지표로 정리하고 팀에 설명" 문장',
         "학습과 평가가 한 벌로 묶여 있습니다. 점수를 뽑는 코드가 없으면 이 문장은 채워지지 않습니다.",
         "mid", "#items", "dl-training"),
    ),
    "startup": (
        ("llm-app", "LLM 응용", "API 를 호출해 본 경험", "검색과 프롬프트를 조합해 하나를 완성한 수준까지",
         '자격요건의 "LLM 프롬프트와 RAG 구조를 이해하고 구현" 문장',
         "다른 기업군에서 우대이던 항목이 필수 자리에 있습니다. 호출 경험이 아니라 완성한 파이프라인 하나가 필요합니다.",
         "high", "#items", "rag-quality"),
        ("data-prep", "데이터 품질", "전처리 코드 작성", "라벨링 품질을 직접 관리하는 수준까지",
         '우대사항의 "데이터 전처리와 라벨링 품질을 관리" 문장',
         "작은 팀에서는 데이터 품질이 곧 모델 성능입니다. 데이터를 손으로 들여다본 사람이 결과를 바꿉니다.",
         "mid", "#items", "python-data"),
        ("dl-framework", "미세조정", "학습 루프 이해", "손실 함수를 열어 다루는 수준까지",
         '자격요건의 "손실 함수를 다뤄 본 경험" 문장',
         "예제를 돌린 수준으로는 부족합니다. 학습이 왜 안 되는지 들여다본 경험을 묻는 문장입니다.",
         "mid", "#items", "dl-training"),
    ),
    "b2b_saas": (
        ("model-serving", "서빙", "모델을 감싸 본 경험", "고객이 호출하는 API 의 안정성까지",
         '자격요건의 "모델을 추론 서버로 배포하고 API로 제공" 문장',
         "우대이던 서빙이 필수 요건입니다. 남이 돈을 내고 쓰는 API 라 실패 응답과 안정성이 모델 성능만큼 중요해집니다.",
         "high", "#items", "serving-api"),
        ("data-prep", "전처리", "데이터를 정리해 본 경험", "고객마다 바꿔 끼울 수 있는 규칙 설계까지",
         '자격요건의 "데이터 전처리 파이프라인을 코드로 작성" 문장',
         "코드로 라는 단서가 붙었습니다. 한 번 짜고 끝나는 전처리가 아니라 규칙을 갈아 끼우는 설계를 봅니다.",
         "mid", "#items", "python-data"),
        ("llm-app", "LLM 응용", "공통 기대치와 같음", "여기서는 보조 항목 · 작은 기능 하나면 충분",
         '우대사항의 "LLM API를 활용한 응용 기능" 문장',
         "제품의 중심이 서빙 인프라라 응용의 비중이 낮습니다. 다른 기업군보다 준비 부담이 작은 항목입니다.",
         "mid", "#items", "rag-quality"),
    ),
    "fintech_finance": (
        ("data-prep", "데이터", "다시 돌릴 수 있는 전처리 코드", "어떤 피처가 이상을 잡는지 설명하는 수준까지",
         '자격요건의 "대용량 금융 데이터를 전처리하고 피처를 설계" 문장',
         "이 도메인은 모델 구조보다 어떤 값을 만들었는가가 결과를 가릅니다. 절차뿐 아니라 선택의 근거를 묻습니다.",
         "high", "#items", "python-data"),
        ("model-serving", "운영", "배포해 본 경험", "성능 저하를 감지하고 재학습 주기를 관리하는 수준까지",
         '자격요건의 "운영 환경에 배포하고 모니터링해 본 경험" 문장',
         "데이터 분포가 바뀌면 어제의 모델이 오늘 틀립니다. 올려 봤다가 아니라 떨어지는 것을 알아챈 경험을 봅니다.",
         "high", "#advanced", "serving-api"),
        ("dl-framework", "모델 선택", "프레임워크로 학습해 본 경험", "우대 · 딥러닝보다 피처와 운영이 먼저",
         "우대사항 자리에 딥러닝 프레임워크가 있음",
         "딥러닝이 필수가 아닌 드문 기업군입니다. 준비 순서를 데이터와 운영 쪽으로 옮기는 편이 유리합니다.",
         "mid", "#items", "dl-training"),
    ),
    "si_enterprise": (
        ("data-prep", "데이터 정제", "전처리 코드 작성", "절차를 문서로 남겨 인수인계 가능하게 만드는 수준까지",
         '주요업무의 "전처리하는 절차를 문서화" 문장',
         "만든 사람과 운영하는 사람이 다릅니다. 남이 이어받을 수 있게 만드는 일이 요구의 핵심입니다.",
         "high", "#scope_expansion", "python-data"),
        ("python", "기본기", "Python 구현력", "정확성과 문서화까지 함께 검증",
         '자격요건의 "Python 기반 분석·모델링 업무 수행이 가능한 분" 문장',
         "심화보다 기본기의 확실함을 봅니다. 화려한 프로젝트보다 정확한 코드와 설계 근거가 유리한 기업군입니다.",
         "mid", "#items", "ml-basics"),
    ),
    "game": (
        ("dl-framework", "프레임워크", "학습 루프를 돌려 본 경험", "학습 구조를 열어 직접 수정하는 수준까지",
         '자격요건의 "학습 구조를 이해하고 직접 수정할 수 있는 분" 문장',
         "쓰는 수준을 넘습니다. 학습 루프와 손실 계산을 열어 고쳐 본 경험을 기대한다고 읽힙니다.",
         "high", "#advanced", "dl-training"),
        ("model-serving", "실시간 추론", "모델을 감싸 본 경험", "지연과 크기를 줄여 게임 서버에 올리는 수준까지",
         '우대사항의 "게임 서버에 모델을 서빙해 본 경험" 문장',
         "응답이 늦으면 기능 자체가 성립하지 않습니다. 우대 라벨이지만 이 도메인에서는 실질 비중이 큽니다.",
         "mid", "#items", "infra-cost"),
        ("llm-app", "LLM 응용", "공통 기대치와 같음", "대화형 기능으로 새로 붙는 요구",
         '우대사항의 "대화형 NPC를 만들어 본 경험" 문장',
         "이전 1년 공고에는 드물던 문장입니다. 작은 데모라도 만들어 본 경험이 신선하게 읽힙니다.",
         "mid", "#trend3", "rag-quality"),
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
        "unchanged_note": "읽는 법 — 회색 번호는 AI 엔지니어 공통 기대치, 파란 번호는 문장 뒤에 숨은 신호, 노란 번호는 이 회사가 유독 원하는 것입니다.",
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
    ("python-data", "데이터 처리 파이프라인", "수집·정제·저장까지 이어지는 코드",
     "기준선 · 최근 공고 전량이 Python 구현력을 요구합니다", "저장소 링크 + 처리 단계 설명 문서",
     ("portfolio",), "project", True),
    ("dl-training", "모델 학습·평가 루프 구현", "학습부터 점수 산출까지 한 벌",
     "기준선 · 프레임워크 요구가 전 기업군 공통입니다", "학습 스크립트 + 평가 결과표",
     ("portfolio", "interview"), "project", True),
    ("eval-harness", "평가 세트와 정량 비교", "버전별 점수를 한 표로",
     "지표로 말하는 능력이 신입 사이에서 가장 희소합니다", "평가 세트 파일 + 버전별 점수 비교표",
     ("portfolio", "interview"), "project", True),
    ("serving-api", "모델 서빙 API", "학습 결과를 호출 가능한 형태로",
     "직무 외 요구 중 서빙·인프라가 가장 자주 나타납니다", "배포된 엔드포인트 + 요청·응답 예시",
     ("portfolio",), "project", True),
    ("rag-quality", "검색 증강 응용 구현", "문서 색인과 프롬프트 조합",
     "LLM 응용을 자격요건으로 올린 기업군이 있습니다", "질의응답 파이프라인 + 검색 설정 비교 기록",
     ("portfolio", "interview"), "project", True),
    ("exp-repro", "실험 기록·재현성", "설정과 결과를 함께 남기기",
     "기준선 · 우대와 자격요건 양쪽에서 반복됩니다", "실험 로그 + 재현 절차 문서",
     ("portfolio",), "project", True),
    ("infra-cost", "지연·비용 측정", "요청당 시간과 자원 사용량 기록",
     "추론 지연을 묻는 문장이 서빙 중심 기업군에서 반복됩니다", "지연·자원 사용량 측정 표",
     ("portfolio",), "project", False),
    ("git-collab", "협업·결과 공유 서사", "다른 직군에 설명해 본 경험",
     "기준선 · 설명하고 공유하는 요구가 전 기업군 공통입니다", "PR 기록 + 공유 문서와 피드백 반영",
     ("essay",), "story", True),
    ("ml-basics", "머신러닝 기본 개념", "학습·검증·과적합 어휘의 정확한 사용",
     "기본기의 정확성을 검증하는 기업군이 있습니다", "개념 정리 노트 + 내 실험과 연결한 예시",
     ("interview",), "study", True),
    ("llm-theory", "LLM 동작 원리", "토크나이저·임베딩·문맥 길이",
     "LLM 응용 항목의 면접 검증에서 이론 이해를 묻습니다", "동작 흐름 정리 노트",
     ("interview",), "study", True),
    ("vector-search", "벡터 검색 이론", "유사도와 색인 구조, 재랭킹의 원리",
     "검색 증강 구현의 이론 바탕입니다", "검색 단계별 정리 노트",
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
    ("bigtech_platform", ("데이터 규모 감각", "평가 지표 설계", "서빙·관측", "실험 기록")),
    ("startup", ("LLM 응용 완성", "데이터 품질", "완성 속도와 오너십", "실험 기록")),
    ("b2b_saas", ("서빙 안정성", "전처리 규칙 설계", "지연·비용 측정", "문서화")),
    ("fintech_finance", ("피처 설계 근거", "운영 모니터링", "재학습 주기", "규제 이해")),
    ("si_enterprise", ("기본기 정확성", "절차 문서화", "데이터 정제", "협업 기록")),
    ("game", ("학습 구조 이해", "실시간 추론 성능", "LLM 응용", "협업 설명")),
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
                "title": "점수표를 포트폴리오의 주인공으로",
                "body": f"{label} 기준에서도 모델을 여러 개 돌린 기록보다 무엇이 얼마나 좋아졌는지 보여주는 표 하나가 강합니다. README 첫 절에 평가 세트와 버전별 점수를 두세요.",
                "tips": ["문항은 실제 데이터에서 뽑고 정답 근거를 함께 기록", "바꾸기 전후 점수를 한 표에 나란히"],
                "linked_item_ids": [
                    CONCEPT_INFO["eval-harness"]["concept_id"],
                    CONCEPT_INFO["dl-training"]["concept_id"],
                ],
            },
            {
                "title": "노트북 밖으로 꺼낸 흔적",
                "body": "학습 코드만 있는 저장소가 대다수입니다. 호출 가능한 엔드포인트와 요청·응답 예시가 있으면 서빙을 묻는 문장 전체가 준비됩니다.",
                "tips": ["엔드포인트 하나와 요청 예시 한 장", "요청당 지연 시간을 재 본 기록 한 줄"],
                "linked_item_ids": [
                    CONCEPT_INFO["serving-api"]["concept_id"],
                    CONCEPT_INFO["infra-cost"]["concept_id"],
                ],
            },
        ],
        "intro_orders": orders,
    }
    essay = [
        {
            "kind": "deviation",
            "title": "좋아 보인다를 점수로 바꾼 경험",
            "body": f"{label} 지원 글에서 강한 것은 사용한 모델 목록이 아니라 판단의 기준을 스스로 만든 과정입니다. 과정 중심으로 쓰세요.",
            "narrative": {
                "problem": "바꿀 때마다 좋아졌는지 판단할 수 없던 문제",
                "solve": "평가 세트 작성 → 버전별 점수 비교 → 기준 고정",
                "growth": "감이 아니라 기준으로 판단하는 관점",
            },
            "sample_sentence": "\"무엇이 좋아졌는지 말할 수 없다면 아직 개선한 것이 아니라고 배웠습니다.\"",
            "tips": ["수치가 있으면 한 문장으로 붙이세요"],
            "linked_item_ids": [CONCEPT_INFO["eval-harness"]["concept_id"]],
        },
        {
            "kind": "narrative_polish",
            "title": "결과 공유 경험 — 보유 소재 다듬기",
            "body": "같은 경험이라도 강조점을 기업군에 맞춰 바꾸세요. 사실 관계는 고정하고 배움의 방점만 조정합니다.",
            "narrative": None,
            "sample_sentence": None,
            "tips": ["공유한 문서의 구조를 한 줄로 설명", "피드백으로 바뀐 결론이 있으면 강조"],
            "linked_item_ids": [CONCEPT_INFO["git-collab"]["concept_id"]],
        },
    ]
    interview = [
        {
            "kicker": "평가 검증",
            "question": "그 모델이 좋아졌다는 것을 어떻게 확인했나요?",
            "followups": ["평가 세트의 문항은 어떻게 뽑았나요?", "점수는 올랐는데 체감이 나빠진 경우는 없었나요?"],
            "point": "지표의 한계까지 함께 말하면 기준선 위로 올라섭니다. 정답 암기가 아니라 내 실험의 기준을 설명하세요.",
            "linked_item_ids": [
                CONCEPT_INFO["eval-harness"]["concept_id"],
                CONCEPT_INFO["ml-basics"]["concept_id"],
            ],
        },
        {
            "kicker": "데이터 검증",
            "question": "학습 데이터를 어떻게 만들었나요?",
            "followups": ["잘못된 라벨은 어떻게 찾았나요?", "데이터가 열 배로 늘면 어디가 먼저 막히나요?"],
            "point": "정리된 데이터셋을 받아 쓴 경험만 있으면 답이 짧아집니다. 직접 만든 과정이 있어야 이야기가 이어집니다.",
            "linked_item_ids": [CONCEPT_INFO["python-data"]["concept_id"]],
        },
        {
            "kicker": "서빙 검증",
            "question": "학습한 모델을 어떻게 호출 가능하게 만들었나요?",
            "followups": ["요청 하나에 얼마나 걸리나요?", "모델이 죽으면 어떤 응답이 나가나요?"],
            "point": "배포 경험이 있으면 이 질문 전체를 제가 해봤는데요로 시작할 수 있습니다.",
            "linked_item_ids": [
                CONCEPT_INFO["serving-api"]["concept_id"],
                CONCEPT_INFO["infra-cost"]["concept_id"],
            ],
        },
        {
            "kicker": "태도 검증 · 자소서 연동",
            "question": "실험 결과를 다른 직군에 어떻게 설명했나요?",
            "followups": ["상대가 이해하지 못한 부분은 무엇이었나요?"],
            "point": "자소서 소재는 반드시 면접에서 재검증됩니다. 사실 관계를 스스로 꼬리질문해 보세요.",
            "linked_item_ids": [CONCEPT_INFO["git-collab"]["concept_id"]],
        },
    ]
    return {
        "job": JOB_ROLE_ID, "scope": scope, "checklist": checklist,
        "portfolio": portfolio, "essay": essay, "interview": interview,
        "agent_version": AGENT_VERSION_STRING, "source": "stored",
    }


ROADMAP_STEPS: tuple[tuple[int, str, int, str, str, str, str, str, tuple[str, ...]], ...] = (
    (1, "STEP 01 · 3주", 3, "vhigh", "데이터를 직접 만들어 모델 하나를 학습시키기",
     "정리된 데이터셋을 내려받지 말고 원본을 수집해 정제하고, 그 데이터로 모델을 학습해 점수를 뽑는 데까지 이어 보세요.",
     "저장소 + 전처리 단계 문서 + 학습·평가 스크립트",
     "기준선 두 항목이 채워지지 않으면 다른 준비가 평가에 닿지 않습니다.",
     ("데이터 수집", "전처리", "학습 루프")),
    (2, "STEP 02 · 2주", 2, "vhigh", "평가 세트를 만들고 점수로 비교하기",
     "실제 데이터에서 평가 문항을 뽑아 정답 근거를 기록하고, 설정을 바꿔 가며 버전별 점수를 한 표로 비교하세요.",
     "평가 세트 파일 + 버전별 점수 비교표 + 실험 로그",
     "지표로 말하는 능력이 신입 지원자 사이에서 가장 희소한 항목입니다.",
     ("평가 세트", "점수 비교", "실험 기록")),
    (3, "STEP 03 · 2주", 2, "high", "노트북 밖으로 꺼내 호출 가능하게 만들기",
     "학습한 모델을 API 로 감싸 배포하고 요청당 지연 시간과 자원 사용량을 재 두세요.",
     "배포된 엔드포인트 + 요청·응답 예시 + 지연·비용 측정 표",
     "직무 외 요구 가운데 서빙·인프라가 가장 자주 나타납니다.",
     ("서빙 API", "지연 측정", "비용 감각")),
    (4, "STEP 04 · 2주", 2, "mid", "기업군에 맞춰 마무리하기",
     "지원 기업군의 편차 항목을 채우고 README 와 자소서의 소개 순서를 다시 배치하세요.",
     "편차 항목 산출물 + 기업군 맞춤 소개 순서",
     "필수가 채워진 뒤의 마무리입니다. 순서만 바꿔도 읽히는 인상이 달라집니다.",
     ("편차 보강", "소개 순서", "문서 정리")),
)

STEP_FILLS: tuple[tuple[str, ...], ...] = (
    ("python-data", "dl-training"),
    ("eval-harness", "exp-repro"),
    ("serving-api", "infra-cost"),
    ("git-collab", "rag-quality"),
)

STUDY_TRACKS: tuple[tuple[str, str, str, str, str, str, tuple[str, ...]], ...] = (
    ("model-training", "STEP 01~02와 병행", "vhigh", "머신러닝 기본 개념",
     "학습과 검증의 분리, 과적합이 생기는 이유, 지표를 고르는 기준을 남에게 설명할 수 있는 수준까지.",
     "프로젝트에서 적용은 하지만 면접의 꼬리질문은 개념의 정확성을 검증합니다.",
     ("ml-basics",)),
    ("llm-application", "STEP 02~04와 병행", "high", "LLM 동작 원리",
     "토크나이저와 임베딩이 하는 일, 문맥 길이의 제약, 검색 증강이 필요한 이유를 그림으로 그릴 수 있는 수준까지.",
     "써 봤다와 무엇이 일어나는지 안다를 면접이 구분합니다.",
     ("llm-theory",)),
    ("serving-ops", "상시 · 주 3~4시간", "high", "벡터 검색과 추론 비용",
     "유사도와 색인 구조, 재랭킹의 원리와 요청당 비용이 어디서 생기는지까지. 과목 전체가 아니라 면접 단골 주제 중심으로.",
     "검색 증강과 지연 최적화 해석의 이론 바탕입니다. 전 기간에 얇게 깔리는 것이 효율적입니다.",
     ("vector-search",)),
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
    "model-training": {
        "why": "최근 공고 전량이 Python 구현력을 요구하고 다수가 프레임워크와 데이터 전처리를 자격요건에 둡니다. 이 역량이 없으면 다른 준비가 평가에 닿지 않습니다.",
        "depth": {"foundation": "예제를 따라 학습을 한 번 돌려 본다",
                  "application": "직접 만든 데이터로 학습하고 지표를 뽑는다",
                  "tradeoff": "학습이 안 되는 원인을 찾아 구조와 손실을 고친다"},
        "prereq": ["Python 기본 문법과 배열 연산", "학습·검증 분리의 의미"],
        "misconceptions": ["점수가 오르면 좋아진 것이라는 생각", "데이터는 주어지는 것이라는 생각"],
        "interview": ["그 지표를 왜 골랐나", "학습이 안 될 때 무엇부터 보나"],
        "sequence": ["데이터 수집·정제", "학습 루프 구현", "평가 지표 설계", "원인 분석과 수정"],
    },
    "serving-ops": {
        "why": "직무 외 요구 가운데 서빙·인프라가 가장 자주 나타나고, 일부 기업군은 자격요건에 둡니다.",
        "depth": {"foundation": "모델을 함수로 감싸 호출해 본다",
                  "application": "API 로 배포하고 요청당 지연을 잰다",
                  "tradeoff": "품질 저하를 감지하고 재학습·재배포 주기를 설계한다"},
        "prereq": ["HTTP 요청과 응답의 기본", "컨테이너로 실행하는 법"],
        "misconceptions": ["배포는 인프라 팀의 일이라는 생각", "정확도가 높으면 서비스가 된다는 생각"],
        "interview": ["요청 하나에 얼마나 걸리나", "모델이 틀리기 시작하면 어떻게 아나"],
        "sequence": ["엔드포인트 만들기", "지연·자원 측정", "모니터링 지표 정의", "재학습 주기 설계"],
    },
    "llm-application": {
        "why": "LLM 응용 요구가 1년 사이 우대에서 자격요건으로 올라오는 흐름이 뚜렷하고, 스타트업 기업군은 이미 필수로 둡니다.",
        "depth": {"foundation": "API 를 호출해 기능 하나를 만든다",
                  "application": "문서를 색인하고 검색 결과로 답을 만든다",
                  "tradeoff": "검색 단계와 프롬프트를 나눠 품질 저하의 원인을 가른다"},
        "prereq": ["임베딩과 유사도의 의미", "문서 분할과 색인의 기본"],
        "misconceptions": ["모델을 바꾸면 품질이 오른다는 생각", "프롬프트만 고치면 된다는 생각"],
        "interview": ["엉뚱한 문서를 가져올 때 무엇부터 보나", "문맥 길이를 넘으면 어떻게 하나"],
        "sequence": ["API 호출 기능", "문서 색인", "검색 품질 실험", "평가와 비용 측정"],
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

    for slug in ("python-data", "eval-harness", "serving-api"):
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
            "python" if scope_level == "overall"
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
        ("interpretation", "posting"): len(RECENT_POSTINGS),
        ("strategy", "overall"): 1,
        ("strategy", "cluster"): len(CLUSTER_ORDER),
        ("roadmap", "overall"): 1,
        ("roadmap", "cluster"): len(CLUSTER_ORDER),
    }
    for key, expected in expected_counts.items():
        if counts.get(key, 0) != expected:
            problems.append(f"analysis_outputs {key}: {counts.get(key, 0)}행 (기대 {expected})")
    if len(tables["analysis_outputs"]) != 31:
        problems.append(f"analysis_outputs 합계 {len(tables['analysis_outputs'])}행 (기대 31)")

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
        RECENT: (9, "2026-01-01", "2026-06-30", {"entry_junior": 5, "experienced": 4}),
        PRIOR: (6, "2024-03-01", "2025-11-30", {"entry_junior": 3, "experienced": 3}),
    }
    if len(POSTINGS) != 15 or len(tables["postings"]) != 15:
        problems.append(f"공고 수 {len(POSTINGS)}/{len(tables['postings'])} != 15/15")
    expected_ids = {posting_id(f"{n:02d}") for n in range(1, 16)}
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
        for p in group:
            posted_on = p["posted_at"][:10]
            if not starts_on <= posted_on <= ends_on:
                problems.append(f"{p['nn']}: 게시일 {p['posted_at']} 범위 밖")

    recent_cluster_counts = Counter(p["cluster"] for p in RECENT_POSTINGS)
    if sorted(recent_cluster_counts.values()) != [1, 1, 1, 2, 2, 2]:
        problems.append(f"recent 기업군 분포 {dict(recent_cluster_counts)} != 2·2·2·1·1·1")
    prior_cluster_counts = Counter(p["cluster"] for p in PRIOR_POSTINGS)
    if set(prior_cluster_counts.values()) != {1} or set(prior_cluster_counts) != expected_clusters:
        problems.append(f"prev 기업군 분포 {dict(prior_cluster_counts)} != 기업군별 1건")

    for slug in DIM_SLUGS:
        companies = {
            p["company_id"] for p in POSTINGS if slug in DIMS_BY_POSTING[p["nn"]]
        }
        if len(companies) < 2:
            problems.append(f"{slug}: 독립 회사 {len(companies)}곳")
    return problems


def check_output_population(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """검사 7 — 모듈 산출물 31행과 recent 공고 해석 9행이 짝을 이루는가."""
    outputs = tables["analysis_outputs"]
    problems: list[str] = []
    counts = Counter(row["output_type"] for row in outputs)
    expected = {"statistics": 1, "interpretation": 16, "strategy": 7, "roadmap": 7}
    if len(outputs) != 31 or dict(counts) != expected:
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
    if tables.get("dataset_versions"):
        problems.append("ai_engineer 모듈이 dataset_versions 행을 만들었다")
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
