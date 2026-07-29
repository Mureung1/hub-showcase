"""DevOps 엔지니어 직무의 생성 데모 시드 (갈래 A6).

``agent/data/demo_seed/CONTRACT.md`` 가 이 파일의 기준이다. 데이터베이스에 접속하지
않고 메모리에서 계산해 ``parts/devops/<table>.csv`` 로만 낸다. 모델 호출은 0회다.

`dataset_versions` 는 만들지 않는다. `ds_demo_v1` 는 아홉 직무가 함께 쓰는 한 행이라
A1(backend) 이 한 번만 만든다.

CONTRACT 10.5 의 `allowed_uses` 예시값(`baseline`·`evidence`)은 `0001_initial_schema.sql`
의 `allowed_uses_known` CHECK 가 허용하지 않는다. 적재가 실패하므로 A1 과 같은 값을
쓴다. 나머지 규약(계층 A·신뢰도 0.95000·`sa_v1`)은 그대로 따른다.

recent 5건이 기업군 6종을 다 덮지 못한다. recent 공고가 없는 기업군은 recent 지표 행을
만들지 않고 `cluster_axes.rows` 에서도 뺀다. 해석·전략·로드맵은 기업군 6종 전부 만든다.

실행: ``cd agent && python -m scripts.demo_seed.devops``
"""

from __future__ import annotations

import json
import math
from collections import Counter
from typing import Any

from ._csv import demo_seed_root, sha256_hex, write_part

# ============================================================ 식별자
JOB_ROLE_ID = "devops"
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
    ("stats", "통계 분석", "obj_devops_statistics", "slots_filled"),
    ("knowledge", "지식 구축", "obj_devops_knowledge", "slots_filled"),
    ("interpretation", "채용공고 해석", "obj_devops_interpretation", "slots_filled"),
    ("strategy", "합격 전략", "obj_devops_strategy", "slots_filled"),
    ("roadmap", "준비 로드맵", "obj_devops_roadmap", "slots_filled"),
    ("aggregation", "지표 집계", "obj_devops_aggregation", "no_new_evidence"),
)


def run_id(agent: str) -> str:
    return f"run_demo_{JOB_ROLE_ID}_{agent}"


# ============================================================ 1. 요구 차원 5종
# (slug, dimension_kind, 표시 라벨, 정의, 별칭, 역할 경계 여부)
# 역할 경계는 DevOps 공고가 인접 직무(네트워크·SRE·플랫폼)의 일까지 요구하는 자리다.
DIMENSIONS: tuple[tuple[str, str, str, str, tuple[str, ...], bool], ...] = (
    (
        "kubernetes",
        "technology",
        "Kubernetes 클러스터 운영",
        "컨테이너 워크로드를 Kubernetes 로 배포하고 클러스터를 운영하는 요구.",
        ("Kubernetes", "쿠버네티스", "K8s", "컨테이너 오케스트레이션"),
        False,
    ),
    (
        "iac-terraform",
        "tooling",
        "인프라 코드화(IaC·Terraform)",
        "클라우드 자원을 선언형 코드로 정의하고 변경을 이력으로 관리하는 요구.",
        ("Terraform", "IaC", "인프라 코드화", "Ansible"),
        True,
    ),
    (
        "cicd-pipeline",
        "tooling",
        "CI/CD 파이프라인",
        "빌드·검증·배포를 자동화하는 파이프라인을 만들고 개선하는 요구.",
        ("CI/CD", "배포 자동화", "GitHub Actions", "Jenkins", "ArgoCD"),
        False,
    ),
    (
        "observability",
        "practice",
        "관측성·모니터링",
        "지표·로그·추적을 모아 상태를 읽고 장애를 탐지·대응하는 요구.",
        ("모니터링", "관측성", "Prometheus", "Grafana", "SLO"),
        True,
    ),
    (
        "cloud-network",
        "technology",
        "클라우드 네트워크",
        "VPC·서브넷·로드밸런서·DNS 등 클라우드 네트워크 구성을 설계·운영하는 요구.",
        ("VPC", "로드밸런서", "네트워크 구성", "DNS", "서비스 메시"),
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
    ("kubernetes", "cloud-network", "related"),
    ("kubernetes", "observability", "related"),
    ("cicd-pipeline", "iac-terraform", "related"),
    ("iac-terraform", "cloud-network", "related"),
)

# ============================================================ 2. 역량 3종
CAPABILITIES: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    (
        "container-orchestration",
        "컨테이너 오케스트레이션 운영",
        "컨테이너 워크로드를 클러스터에 올리고 트래픽 경로까지 책임지는 능력.",
        ("kubernetes", "cloud-network"),
    ),
    (
        "delivery-automation",
        "배포 자동화",
        "빌드부터 배포까지를 코드로 선언하고 반복 가능하게 만드는 능력.",
        ("cicd-pipeline", "iac-terraform"),
    ),
    (
        "reliability-operations",
        "신뢰성 운영",
        "지표로 상태를 읽고 장애를 탐지·복구해 재발을 막는 능력.",
        ("observability", "kubernetes"),
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
    ("container-orchestration", "delivery-automation"),
    ("container-orchestration", "reliability-operations"),
    ("delivery-automation", "reliability-operations"),
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
        "company_id": "co_navercloud",
        "company": "네이버클라우드",
        "cluster": "b2b_saas",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입~3년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-03-10T10:00:00+09:00",
        "title": "클라우드 플랫폼 DevOps 엔지니어 (신입·주니어)",
        "sections": (
            ("주요업무", (
                ("고객사 서비스가 올라가는 Kubernetes 클러스터를 구축하고 운영합니다.", "kubernetes", "application",
                 ("note", "고객사 환경을 함께 봅니다",
                  "내부 서비스 하나가 아니라 여러 고객사 환경을 다룹니다. 클러스터를 만들어 본 경험보다 다시 만들 수 있게 남겨 둔 기록이 평가에 닿습니다.")),
                ("Terraform으로 클라우드 자원을 코드로 관리하고 변경 이력을 리뷰합니다.", "iac-terraform", "application",
                 ("note", "변경을 리뷰한다는 문장",
                  "인프라 변경을 코드리뷰로 합의하는 팀입니다. 콘솔에서 직접 눌러 만든 자원은 이 문장 앞에서 증거가 되지 못합니다.")),
                ("GitHub Actions 기반 배포 파이프라인을 만들고 개선합니다.", "cicd-pipeline", "application", None),
                ("VPC·서브넷·로드밸런서 구성을 설계하고 고객 문의에 대응합니다.", "cloud-network", "application",
                 ("note", "직무 외 접점 — 문의 대응",
                  "네트워크 구성이 개발팀과 고객 사이의 접점이 됩니다. 통계의 직무 경계 밖 요구가 이 공고에서도 그대로 나타납니다.")),
            )),
            ("자격요건", (
                ("리눅스 서버 운영과 셸 스크립트 작성에 익숙하신 분", None, "foundation",
                 ("base", "리눅스·셸 기본기",
                  "모든 DevOps 공고가 전제로 깔아 두는 항목입니다. 별도 준비가 아니라 다른 항목을 준비하는 과정에서 자연히 쌓입니다.")),
                ("Kubernetes의 Pod·Service·Deployment를 이해하고 직접 배포해 본 경험이 있으신 분", "kubernetes", "application",
                 ("base", "컨테이너 오케스트레이션 운영",
                  "이해와 배포를 함께 적었습니다. 개념 암기가 아니라 매니페스트를 직접 써서 올려 본 결과물 하나면 이 문장은 충족됩니다.")),
                ("Terraform 등 IaC 도구로 인프라를 코드로 관리해 본 경험이 있으신 분", "iac-terraform", "application",
                 ("mark", "IaC — 도구 경험을 넘어 모듈과 리뷰까지",
                  "고객사마다 같은 구성을 반복해 세우는 조직이라 재사용 가능한 모듈과 변경 리뷰 절차를 함께 기대합니다. 단발성 apply 경험과는 요구 수준이 다릅니다.",
                  "high", "같은 직군 80%")),
                ("CI/CD 파이프라인을 한 번 이상 구성해 본 경험이 있으신 분", "cicd-pipeline", "foundation",
                 ("base", "배포 파이프라인 구성",
                  "한 번 이상이라고 적은 것은 규모가 아니라 경험 유무를 본다는 뜻입니다. 토이 프로젝트의 워크플로 파일 하나로도 시작할 수 있습니다.")),
                ("VPC·서브넷·보안그룹 등 클라우드 네트워크 기본 개념을 설명할 수 있는 분", "cloud-network", "application",
                 ("mark", "네트워크 — 고객사 격리까지 읽히는 요구",
                  "설명할 수 있는 분이라는 표현이지만 주요업무의 고객 문의 대응과 묶으면 다릅니다. 고객사별로 트래픽이 섞이지 않게 나누는 설계까지가 실제 요구입니다.",
                  "high", "같은 직군 80%")),
            )),
            ("우대사항", (
                ("Prometheus·Grafana로 지표를 수집하고 대시보드를 만들어 본 경험", "observability", "foundation",
                 ("base", "지표·로그 기반 관측",
                  "우대에 있지만 최근 공고 전량이 관측을 요구합니다. 대시보드 한 장과 그 지표를 고른 이유를 말할 수 있으면 충분합니다.")),
                ("Git 기반 협업과 변경 이력 관리에 익숙하신 분", None, "foundation",
                 ("base", "Git 기반 협업 기록",
                  "인프라 코드도 결국 저장소에서 리뷰됩니다. 브랜치와 PR 기록이 그대로 증거가 됩니다.")),
                ("클라우드 비용 최적화를 고민해 본 경험", None, "foundation",
                 ("note", "비용 — 플랫폼 조직의 단골 주제",
                  "자원을 만드는 일과 줄이는 일이 같은 팀에 있습니다. 미사용 자원을 정리한 기록 한 줄이면 대화의 입구가 됩니다.")),
            )),
        ),
        "summary": "클러스터를 다뤄 본 사람보다 같은 구성을 반복해 세울 수 있게 코드로 남기는 사람을 찾습니다. 기준선 항목은 대체로 공통 기대치 그대로이고, IaC 모듈화와 고객사 네트워크 격리 두 축이 이 공고의 실질 변별점입니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 5건",
    },
    {
        "nn": "02",
        "company_id": "co_viva",
        "company": "비바리퍼블리카",
        "cluster": "fintech_finance",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력 3년 이상",
        "career_label_raw": "경력 3~8년",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-01-15T10:00:00+09:00",
        "title": "인프라 엔지니어 (Kubernetes·SRE)",
        "sections": (
            ("주요업무", (
                ("금융 서비스 트래픽을 받는 Kubernetes 클러스터를 설계하고 운영합니다.", "kubernetes", "tradeoff",
                 ("note", "금융 트래픽이라는 전제",
                  "같은 클러스터 운영이라도 멈추면 안 되는 서비스가 위에 있습니다. 자격요건의 스케일링·무중단 요구가 모두 이 문장에서 이어집니다.")),
                ("Terraform 모듈로 여러 계정의 인프라를 표준화합니다.", "iac-terraform", "application", None),
                ("무중단 배포와 롤백 전략을 파이프라인에 반영합니다.", "cicd-pipeline", "tradeoff", None),
                ("SLO를 정의하고 에러 버짓으로 릴리스 속도를 조율합니다.", "observability", "application",
                 ("note", "관측이 릴리스 결정에 쓰입니다",
                  "지표를 보는 데서 끝나지 않고 배포 여부를 정하는 근거로 씁니다. 대시보드를 만든 경험보다 어떤 지표로 무엇을 결정했는지가 질문됩니다.")),
            )),
            ("자격요건", (
                ("Kubernetes 클러스터 운영과 트래픽 급증 상황의 스케일링을 설계해 본 경험", "kubernetes", "tradeoff",
                 ("base", "컨테이너 오케스트레이션 운영",
                  "기준선의 클러스터 운영에 급증 상황이 붙었습니다. 오토스케일링 설정의 근거와 한계를 말할 수 있는 수준까지가 이 문장의 실질입니다.")),
                ("무중단 배포 파이프라인을 설계하고 운영한 경험", "cicd-pipeline", "tradeoff",
                 ("mark", "배포 — 파이프라인 구성이 아니라 무중단 전략",
                  "결제가 도는 중에 배포가 나갑니다. 카나리·블루그린 중 무엇을 왜 골랐고 롤백 판정을 무엇으로 하는지까지가 기대 수준입니다.",
                  "high", "같은 직군 100%")),
                ("Terraform으로 다계정 인프라를 코드로 관리한 경험", "iac-terraform", "application",
                 ("base", "인프라 코드화(IaC)",
                  "계정이 여러 개라 손으로 맞추는 순간 어긋납니다. 모듈과 변수로 같은 구성을 반복한 기록이 그대로 증거입니다.")),
                ("지표·로그·추적을 묶어 장애 원인을 좁혀 본 경험", "observability", "application",
                 ("mark", "관측 — 수집이 아니라 원인 좁히기",
                  "세 가지를 묶어 읽는다는 것은 장애 시각에 무엇을 먼저 보는지 순서가 있다는 뜻입니다. 온콜 경험이 없다면 직접 만든 장애 시나리오로라도 순서를 갖춰야 합니다.",
                  "high", "같은 직군 100%")),
                ("금융 규제 환경의 접근 통제 정책을 이해하고 계신 분", "cloud-network", "foundation",
                 ("mark", "접근 통제 — 이 기업군만의 추가 관문",
                  "네트워크를 나누는 이유가 성능이 아니라 규제입니다. 망 분리와 최소 권한, 감사 로그가 왜 필요한지 설명할 수 있으면 이 문장을 정면으로 받습니다.",
                  "mid", "같은 직군 80%")),
            )),
            ("우대사항", (
                ("멀티 리전 재해 복구 구성을 다뤄 본 경험", None, "foundation",
                 ("note", "재해 복구 — 우대는 우대로",
                  "실무 규모의 구성을 경험한 지원자는 드뭅니다. 복구 목표 시간과 목표 시점의 차이를 아는 정도면 대화가 이어집니다.")),
                ("서비스 메시나 L4·L7 트래픽 제어를 다뤄 본 경험", "cloud-network", "foundation", None),
                ("온콜 로테이션에 참여해 본 경험", "observability", "foundation",
                 ("note", "온콜 — 태도를 묻는 문장",
                  "새벽에 깨어 본 적이 있는지를 묻는 것이 아니라 알림이 울렸을 때 무엇부터 하는지를 묻습니다. 절차를 문서로 가진 사람이 강합니다.")),
            )),
        ),
        "summary": "장애가 나면 돈이 멈추는 서비스를 맡깁니다. 클러스터 운영과 IaC는 공통 기대치 그대로이고, 무중단 배포 전략과 규제에 맞춘 접근 통제가 이 공고의 실질 변별점입니다.",
        "summary_ratio": "편차 3건 · 기준선 일치 4건",
    },
    {
        "nn": "03",
        "company_id": "co_kakao",
        "company": "카카오",
        "cluster": "bigtech_platform",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입/주니어",
        "career_label_raw": "경력 무관",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-02-11T10:00:00+09:00",
        "title": "DevOps 엔지니어 (신입·주니어)",
        "sections": (
            ("주요업무", (
                ("사내 여러 서비스의 컨테이너 배포 환경을 운영합니다.", "kubernetes", "application",
                 ("note", "여러 서비스가 한 플랫폼 위에",
                  "한 서비스의 인프라가 아니라 개발팀들이 함께 쓰는 판을 만듭니다. 내 편의가 아니라 남이 쓰기 좋은 기본값을 고민한 경험이 이야깃거리가 됩니다.")),
                ("빌드·테스트·배포 파이프라인의 실패를 줄이는 일을 합니다.", "cicd-pipeline", "application", None),
                ("장애 알림 체계를 정리하고 온콜 대응에 참여합니다.", "observability", "tradeoff",
                 ("note", "신입에게도 온콜을 말합니다",
                  "참여라고 적었으므로 혼자 책임지라는 뜻은 아닙니다. 다만 알림이 울렸을 때 당황하지 않을 준비가 되어 있는지는 봅니다.")),
            )),
            ("자격요건", (
                ("Kubernetes 기반 배포 환경에서 애플리케이션을 운영해 본 경험이 있으신 분", "kubernetes", "application",
                 ("base", "컨테이너 오케스트레이션 운영",
                  "운영해 본 경험이라고 적었지만 신입 공고이므로 실습 클러스터에 직접 올려 본 결과물이면 충족됩니다. 규모보다 손으로 해 본 사실이 기준입니다.")),
                ("Jenkins·GitHub Actions 등으로 CI/CD 파이프라인을 다뤄 본 경험이 있으신 분", "cicd-pipeline", "application",
                 ("base", "배포 파이프라인 구성",
                  "도구를 둘로 열어 둔 것은 특정 도구가 아니라 파이프라인을 이해하는지 본다는 뜻입니다. 어느 쪽이든 워크플로 하나를 끝까지 만든 기록이면 됩니다.")),
                ("지표와 로그를 함께 보며 장애 원인을 좁혀 본 경험이 있으신 분", "observability", "tradeoff",
                 ("mark", "관측 — 신입에게도 SLO와 알림 설계를 기대",
                  "주요업무의 알림 체계 정리와 묶어 읽으면 대시보드 사용을 넘어섭니다. 무엇을 임계값으로 삼을지 스스로 정해 본 경험이 이 문장의 실질입니다.",
                  "high", "같은 직군 100%")),
                ("대규모 트래픽 환경의 배포를 경험해 보신 분", "kubernetes", "application",
                 ("mark", "규모 — 신입 공고에 붙은 대규모라는 단어",
                  "신입에게 실무 규모의 증명을 요구한다고 읽으면 지원할 사람이 없습니다. 노드가 늘어날 때 무엇이 먼저 병목이 되는지 설명할 수 있는 정도를 기대한다고 읽는 것이 합리적입니다.",
                  "mid", "같은 직군 100%")),
            )),
            ("우대사항", (
                ("DNS·로드밸런서 등 네트워크 구성 요소를 이해하고 계신 분", "cloud-network", "foundation",
                 ("base", "클라우드 네트워크 기본",
                  "우대이지만 클러스터 밖으로 트래픽이 어떻게 들어오는지 모르면 장애 때 손이 멈춥니다. 요청 하나의 경로를 그림으로 그릴 수 있으면 충분합니다.")),
                ("애플리케이션 코드를 직접 수정해 본 경험", None, "foundation",
                 ("note", "직무 외 요구 — 애플리케이션 코드",
                  "인프라만 다루는 자리가 아닙니다. 파이프라인을 고치다 보면 빌드 스크립트와 애플리케이션 설정을 함께 만지게 됩니다.")),
                ("장애 회고를 문서로 남겨 본 경험", None, "foundation",
                 ("base", "장애 대응 절차 이해",
                  "회고 문서는 신입 지원자에게 드문 산출물입니다. 개인 프로젝트의 장애 한 건이라도 원인과 재발 방지를 적어 두면 그대로 차별점이 됩니다.")),
            )),
        ),
        "summary": "여러 개발팀이 함께 쓰는 배포 판을 만드는 자리입니다. 클러스터와 파이프라인은 공통 기대치이고, 알림·SLO 설계와 규모에 대한 이해가 이 공고의 실질 변별점입니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 5건",
    },
    {
        "nn": "04",
        "company_id": "co_krafton",
        "company": "크래프톤",
        "cluster": "game",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력 5년 이상",
        "career_label_raw": "경력 5~10년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-04-20T10:00:00+09:00",
        "title": "게임 서비스 인프라 엔지니어",
        "sections": (
            ("주요업무", (
                ("글로벌 게임 서비스의 Kubernetes 클러스터를 운영합니다.", "kubernetes", "application", None),
                ("대규모 동시 접속 트래픽을 견디는 네트워크 구성을 설계합니다.", "cloud-network", "tradeoff",
                 ("note", "동시 접속이 설계의 전제입니다",
                  "평균 트래픽이 아니라 몰리는 순간이 기준입니다. 부하가 몰릴 때 무엇이 먼저 무너지는지 아는 사람을 찾습니다.")),
                ("게임 로그 수집 파이프라인을 운영합니다.", None, "foundation",
                 ("note", "직무 외 요구 — 데이터 파이프라인",
                  "인프라 운영자가 데이터 수집까지 맡습니다. 통계의 직무 경계 밖 요구가 게임사에서는 로그·지표 쪽으로 나타납니다.")),
            )),
            ("자격요건", (
                ("Kubernetes 환경에서 상태를 가지는 게임 서버를 운영해 본 경험", "kubernetes", "application",
                 ("mark", "상태 저장 워크로드 — 무상태 배포와 다른 문제",
                  "게임 서버는 접속 세션을 들고 있어 마음대로 재시작할 수 없습니다. 종료 유예와 세션 이전을 어떻게 다룰지가 이 문장의 실질 요구입니다.",
                  "high", "같은 직군 100%")),
                ("리전 간 지연을 고려한 글로벌 네트워크 설계 경험", "cloud-network", "tradeoff",
                 ("mark", "글로벌 지연 — 네트워크 요구의 최상단",
                  "국내 서비스의 VPC 구성과는 문제의 성격이 다릅니다. 어느 리전에 무엇을 두고 무엇을 복제할지 고른 근거를 말할 수 있어야 합니다.",
                  "high", "같은 직군 80%")),
                ("지표·경보 체계를 직접 설계하고 온콜을 운영해 본 경험", "observability", "tradeoff",
                 ("base", "지표·로그 기반 관측",
                  "기준선의 관측 요구에 설계와 운영이 붙었습니다. 무엇을 알림으로 올리고 무엇을 대시보드에만 둘지 고른 기준이 답이 됩니다.")),
            )),
            ("우대사항", (
                ("Terraform으로 게임 서버 인프라를 코드화해 본 경험", "iac-terraform", "foundation",
                 ("base", "인프라 코드화(IaC)",
                  "우대이지만 리전마다 같은 구성을 세우는 조직이라 실질 기대치는 높습니다. 반복되는 자원을 모듈로 묶어 본 기록이면 충분합니다.")),
                ("빌드·배포 자동화 도구를 개선해 본 경험", "cicd-pipeline", "foundation",
                 ("base", "배포 파이프라인 구성",
                  "만든 경험이 아니라 개선한 경험을 물었습니다. 느린 빌드를 줄인 전후 시간 한 줄이 가장 좋은 증거입니다.")),
                ("대규모 동시 접속 상황의 부하 시험 경험", None, "foundation",
                 ("note", "부하 시험 — 규모를 대신 증명하는 방법",
                  "실무 규모를 경험하지 못해도 부하를 만들어 재는 일은 개인 환경에서도 됩니다. 측정과 개선 전후 지표가 이 문장의 대체 증거입니다.")),
            )),
        ),
        "summary": "몰리는 순간을 견디는 인프라를 맡깁니다. 클러스터 운영과 관측은 공통 기대치 위에 있고, 글로벌 지연 설계와 상태를 가진 워크로드 운영이 이 공고의 실질 변별점입니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 3건",
    },
    {
        "nn": "05",
        "company_id": "co_upstage",
        "company": "업스테이지",
        "cluster": "startup",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 환영",
        "career_label_raw": "신입~2년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-06-02T10:00:00+09:00",
        "title": "DevOps 엔지니어 (신입·주니어)",
        "sections": (
            ("주요업무", (
                ("모델 학습·서빙 환경의 배포 자동화를 담당합니다.", "cicd-pipeline", "application",
                 ("note", "담당이라는 단어의 무게",
                  "지원이 아니라 담당입니다. 인원이 적은 조직이라 한 사람이 한 영역을 통째로 맡는다는 신호로 읽는 것이 맞습니다.")),
                ("개발팀의 배포 요청을 받아 파이프라인을 개선합니다.", "cicd-pipeline", "application", None),
                ("서비스 지표와 로그를 모아 볼 수 있게 정리합니다.", "observability", "foundation",
                 ("mark", "관측 — 쓰는 일이 아니라 세우는 일",
                  "이미 있는 대시보드를 보는 자리가 아니라 아직 없는 것을 처음 세우는 자리입니다. 무엇부터 모을지 스스로 고를 수 있어야 합니다.",
                  "mid", "같은 직군 100%")),
            )),
            ("자격요건", (
                ("리눅스 환경에서 스크립트로 반복 작업을 자동화해 보신 분", None, "foundation",
                 ("base", "리눅스·셸 기본기",
                  "도구 이름이 아니라 반복을 줄여 본 습관을 봅니다. 손으로 하던 일을 스크립트로 옮긴 사례 하나면 됩니다.")),
                ("CI/CD 파이프라인을 직접 구성해 본 경험이 있으신 분", "cicd-pipeline", "application",
                 ("base", "배포 파이프라인 구성",
                  "직접이라는 단어가 붙었습니다. 팀에서 만들어 둔 것을 쓴 경험과 처음부터 구성한 경험을 이 공고는 구분합니다.")),
                ("Docker로 이미지를 만들고 배포해 본 경험이 있으신 분", None, "foundation",
                 ("base", "Git 기반 협업 기록",
                  "이미지 빌드는 저장소의 변경과 함께 돌아갑니다. Dockerfile 이 커밋 이력과 함께 남아 있으면 두 항목이 한 번에 증명됩니다.")),
            )),
            ("우대사항", (
                ("Kubernetes를 학습하거나 토이 프로젝트로 다뤄 본 경험", "kubernetes", "foundation",
                 ("base", "컨테이너 오케스트레이션 운영",
                  "학습이라는 단어까지 열어 두었습니다. 신입 채용에서 클러스터 요구의 하한이 어디인지 보여주는 문장입니다.")),
                ("Terraform 등 IaC 도구를 접해 본 경험", "iac-terraform", "foundation",
                 ("mark", "IaC — 접해 본 수준이라도 혼자 세울 수 있어야",
                  "표현은 가볍지만 인프라를 세울 사람이 몇 없는 조직입니다. 작은 프로젝트라도 처음부터 끝까지 코드로 만들어 본 기록이 실질 기준입니다.",
                  "mid", "같은 직군 80%")),
                ("GPU 자원 비용을 관리해 본 경험", None, "foundation",
                 ("note", "비용 — 자원이 곧 돈인 조직",
                  "학습용 자원은 켜 두는 것만으로 비용이 됩니다. 자동으로 끄는 장치를 만들어 본 경험이 있으면 그대로 강점이 됩니다.")),
            )),
        ),
        "summary": "이미 있는 판을 운영하는 자리가 아니라 아직 없는 판을 세우는 자리입니다. 파이프라인과 리눅스 기본기는 공통 기대치이고, 혼자 인프라를 코드로 세우는 일과 관측 체계를 처음 만드는 일이 이 공고의 실질 변별점입니다.",
        "summary_ratio": "편차 2건 · 기준선 일치 4건",
    },
    {
        "nn": "06",
        "company_id": "co_samsungsds",
        "company": "삼성에스디에스",
        "cluster": "si_enterprise",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 채용",
        "career_label_raw": "신입",
        "edu_label_raw": "대졸 이상",
        "posted_at": "2026-04-10T10:00:00+09:00",
        "title": "클라우드 운영 엔지니어 신입 채용",
        "sections": (
            ("주요업무", (
                ("고객사 클라우드 시스템의 구축과 운영을 지원합니다.", None, "foundation", None),
                ("운영 문서와 변경 절차서를 작성하고 최신 상태로 유지합니다.", None, "foundation", None),
            )),
            ("자격요건", (
                ("리눅스와 네트워크 기본 지식을 갖추신 분", "cloud-network", "foundation", None),
                ("형상관리와 배포 절차를 이해하고 계신 분", "cicd-pipeline", "foundation", None),
            )),
            ("우대사항", (
                ("Kubernetes 관련 교육 이수 또는 자격증을 보유하신 분", "kubernetes", "foundation", None),
                ("정보보안 인증 심사 대응 경험이 있으신 분", None, "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "07",
        "company_id": "co_kurly",
        "company": "컬리",
        "cluster": "bigtech_platform",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력 4년 이상",
        "career_label_raw": "경력 4~9년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-02-18T10:00:00+09:00",
        "title": "플랫폼 엔지니어 (인프라·배포)",
        "sections": (
            ("주요업무", (
                ("커머스 서비스의 컨테이너 플랫폼을 운영합니다.", "kubernetes", "application", None),
                ("팀마다 다른 배포 방식을 하나의 파이프라인으로 표준화합니다.", "cicd-pipeline", "application", None),
            )),
            ("자격요건", (
                ("Kubernetes 클러스터 운영 경험이 있으신 분", "kubernetes", "application", None),
                ("CI/CD 파이프라인을 설계하고 운영한 경험이 있으신 분", "cicd-pipeline", "application", None),
            )),
            ("우대사항", (
                ("Terraform으로 인프라를 코드화해 본 경험", "iac-terraform", "foundation", None),
                ("모니터링 대시보드를 구성해 본 경험", "observability", "foundation", None),
                ("CDN·로드밸런서 설정을 다뤄 본 경험", "cloud-network", "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "08",
        "company_id": "co_kakaopay",
        "company": "카카오페이",
        "cluster": "fintech_finance",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입·주니어",
        "career_label_raw": "신입~2년",
        "edu_label_raw": "학사 이상",
        "posted_at": "2026-05-02T10:00:00+09:00",
        "title": "인프라 엔지니어 (신입·주니어)",
        "sections": (
            ("주요업무", (
                ("결제 서비스의 서버와 네트워크 운영을 지원합니다.", None, "foundation", None),
                ("반복되는 배포 절차를 스크립트로 자동화합니다.", "cicd-pipeline", "foundation", None),
            )),
            ("자격요건", (
                ("리눅스 서버와 네트워크 기본을 이해하고 계신 분", "cloud-network", "foundation", None),
                ("배포 스크립트나 파이프라인을 다뤄 본 경험이 있으신 분", "cicd-pipeline", "foundation", None),
            )),
            ("우대사항", (
                ("Kubernetes 환경을 경험해 보신 분", "kubernetes", "foundation", None),
                ("모니터링 도구를 사용해 본 경험이 있으신 분", "observability", "foundation", None),
                ("금융 보안 규정을 이해하고 계신 분", None, "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "09",
        "company_id": "co_qmit",
        "company": "큐엠아이티",
        "cluster": "startup",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력 3년 이상",
        "career_label_raw": "경력 3~7년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2026-06-15T10:00:00+09:00",
        "title": "DevOps 엔지니어",
        "sections": (
            ("주요업무", (
                ("서비스 인프라를 직접 구축하고 운영합니다.", None, "foundation", None),
                ("지표와 로그를 정리해 팀에 공유합니다.", "observability", "foundation", None),
            )),
            ("자격요건", (
                ("Kubernetes로 서비스를 배포하고 운영해 본 경험", "kubernetes", "application", None),
                ("CI/CD 파이프라인을 구성해 본 경험", "cicd-pipeline", "application", None),
            )),
            ("우대사항", (
                ("Terraform으로 인프라를 코드화해 본 경험", "iac-terraform", "foundation", None),
                ("데이터 수집 파이프라인을 운영해 본 경험", None, "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "10",
        "company_id": "co_musinsa",
        "company": "무신사",
        "cluster": "bigtech_platform",
        "period": PRIOR,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입·주니어",
        "edu_label_raw": "학력 무관",
        "posted_at": "2024-03-18T10:00:00+09:00",
        "title": "커머스 플랫폼 DevOps 엔지니어",
        "sections": (
            ("주요업무", (
                ("상품 서비스의 Kubernetes 배포 환경을 운영합니다.", "kubernetes", "application", None),
                ("서비스 지표와 로그를 대시보드로 관리합니다.", "observability", "foundation", None),
            )),
            ("자격요건", (
                ("CI/CD 파이프라인을 구성하고 개선해 본 경험", "cicd-pipeline", "application", None),
                ("VPC와 로드밸런서의 기본 구조를 이해하시는 분", "cloud-network", "foundation", None),
            )),
            ("우대사항", (
                ("Terraform으로 개발 환경을 구성해 본 경험", "iac-terraform", "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "11",
        "company_id": "co_wantedlab",
        "company": "원티드랩",
        "cluster": "startup",
        "period": PRIOR,
        "entry_label": "experienced",
        "entry_label_raw": "경력 3년 이상",
        "career_label_raw": "경력 3~7년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2024-07-08T10:00:00+09:00",
        "title": "채용 플랫폼 DevOps 엔지니어",
        "sections": (
            ("주요업무", (
                ("Kubernetes 기반 서비스 환경을 소규모 팀과 운영합니다.", "kubernetes", "application", None),
                ("배포 실패와 장애 원인을 지표와 로그로 분석합니다.", "observability", "application", None),
            )),
            ("자격요건", (
                ("Terraform 모듈로 클라우드 자원을 관리해 본 경험", "iac-terraform", "application", None),
                ("CI/CD 파이프라인의 배포 단계를 설계해 본 경험", "cicd-pipeline", "application", None),
            )),
            ("우대사항", (
                ("VPC와 DNS 장애를 분석해 본 경험", "cloud-network", "application", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "12",
        "company_id": "co_channelcorp",
        "company": "주식회사 채널코퍼레이션",
        "cluster": "b2b_saas",
        "period": PRIOR,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입·주니어",
        "edu_label_raw": "학력 무관",
        "posted_at": "2024-11-12T10:00:00+09:00",
        "title": "고객 지원 SaaS DevOps 엔지니어",
        "sections": (
            ("주요업무", (
                ("고객사별 Kubernetes 워크로드의 배포 상태를 관리합니다.", "kubernetes", "application", None),
                ("서비스 상태를 확인하는 모니터링 화면을 운영합니다.", "observability", "foundation", None),
            )),
            ("자격요건", (
                ("CI/CD 도구로 애플리케이션을 배포해 본 경험", "cicd-pipeline", "foundation", None),
                ("클라우드 네트워크의 서브넷과 보안 그룹을 이해하시는 분", "cloud-network", "foundation", None),
            )),
            ("우대사항", (
                ("Terraform 코드의 변경 내역을 리뷰해 본 경험", "iac-terraform", "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "13",
        "company_id": "co_kakaobank",
        "company": "카카오뱅크",
        "cluster": "fintech_finance",
        "period": PRIOR,
        "entry_label": "experienced",
        "entry_label_raw": "경력 3년 이상",
        "career_label_raw": "경력 3~8년",
        "edu_label_raw": "학사 이상",
        "posted_at": "2025-03-17T10:00:00+09:00",
        "title": "금융 플랫폼 인프라 엔지니어",
        "sections": (
            ("주요업무", (
                ("금융 서비스 Kubernetes 클러스터의 가용성을 관리합니다.", "kubernetes", "tradeoff", None),
                ("SLO와 경보 기준을 정하고 장애 대응 절차를 개선합니다.", "observability", "tradeoff", None),
            )),
            ("자격요건", (
                ("무중단 배포와 롤백을 포함한 CI/CD 운영 경험", "cicd-pipeline", "tradeoff", None),
                ("Terraform으로 망 분리 환경을 관리해 본 경험", "iac-terraform", "application", None),
                ("VPC 접근 통제와 감사 로그 정책을 설계해 본 경험", "cloud-network", "tradeoff", None),
            )),
            ("우대사항", (
                ("재해 복구 훈련을 수행해 본 경험", None, "application", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "14",
        "company_id": "co_samsungsds",
        "company": "삼성에스디에스",
        "cluster": "si_enterprise",
        "period": PRIOR,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입 지원 가능",
        "career_label_raw": "신입·주니어",
        "edu_label_raw": "대졸 이상",
        "posted_at": "2025-07-07T10:00:00+09:00",
        "title": "기업 클라우드 운영 엔지니어",
        "sections": (
            ("주요업무", (
                ("고객사 Kubernetes 환경의 표준 구성을 적용합니다.", "kubernetes", "foundation", None),
                ("운영 절차와 장애 처리 결과를 문서화합니다.", "observability", "foundation", None),
            )),
            ("자격요건", (
                ("CI/CD 파이프라인의 기본 단계를 이해하시는 분", "cicd-pipeline", "foundation", None),
                ("클라우드 네트워크 구성도를 읽을 수 있는 분", "cloud-network", "foundation", None),
            )),
            ("우대사항", (
                ("Terraform 템플릿을 작성해 본 경험", "iac-terraform", "foundation", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
    {
        "nn": "15",
        "company_id": "co_smilegate",
        "company": "스마일게이트",
        "cluster": "game",
        "period": PRIOR,
        "entry_label": "experienced",
        "entry_label_raw": "경력 3년 이상",
        "career_label_raw": "경력 3~7년",
        "edu_label_raw": "학력 무관",
        "posted_at": "2025-11-03T10:00:00+09:00",
        "title": "게임 라이브 인프라 엔지니어",
        "sections": (
            ("주요업무", (
                ("라이브 게임의 Kubernetes 클러스터를 운영합니다.", "kubernetes", "tradeoff", None),
                ("트래픽 급증 시 지표를 분석하고 용량을 조정합니다.", "observability", "application", None),
            )),
            ("자격요건", (
                ("게임 서버의 CI/CD와 롤백 절차를 운영해 본 경험", "cicd-pipeline", "tradeoff", None),
                ("Terraform으로 다중 리전 자원을 구성해 본 경험", "iac-terraform", "application", None),
                ("로드밸런서와 DNS 장애를 대응해 본 경험", "cloud-network", "application", None),
            )),
            ("우대사항", (
                ("대규모 이벤트의 트래픽 계획을 세워 본 경험", None, "application", None),
            )),
        ),
        "summary": "",
        "summary_ratio": "",
    },
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
    _expanded_posting("16", "03", RECENT, "2026-01-05T10:00:00+09:00", "entry_junior"),
    _expanded_posting("17", "02", RECENT, "2026-01-19T10:00:00+09:00", "entry_junior"),
    _expanded_posting("18", "05", RECENT, "2026-02-23T10:00:00+09:00", "entry_junior"),
    _expanded_posting("19", "01", RECENT, "2026-03-09T10:00:00+09:00", "entry_junior"),
    _expanded_posting("20", "01", RECENT, "2026-03-23T10:00:00+09:00", "experienced"),
    _expanded_posting("21", "04", RECENT, "2026-04-13T10:00:00+09:00", "entry_junior"),
    _expanded_posting("22", "04", RECENT, "2026-04-27T10:00:00+09:00", "experienced"),
    _expanded_posting("23", "06", RECENT, "2026-05-25T10:00:00+09:00", "experienced"),
    _expanded_posting("24", "06", RECENT, "2026-06-22T10:00:00+09:00", "experienced"),
    _expanded_posting("25", "03", PRIOR, "2024-05-13T10:00:00+09:00", "entry_junior"),
    _expanded_posting("26", "05", PRIOR, "2024-09-09T10:00:00+09:00", "entry_junior"),
    _expanded_posting("27", "01", PRIOR, "2025-02-10T10:00:00+09:00", "entry_junior"),
    _expanded_posting("28", "02", PRIOR, "2025-05-12T10:00:00+09:00", "experienced"),
    _expanded_posting("29", "06", PRIOR, "2025-08-11T10:00:00+09:00", "experienced"),
    _expanded_posting("30", "04", PRIOR, "2025-11-10T10:00:00+09:00", "experienced"),
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
# recent 공고가 있는 기업군만 recent 지표와 히트맵의 행이 된다.
RECENT_CLUSTERS = tuple(
    cid for cid in CLUSTER_ORDER if any(p["cluster"] == cid for p in RECENT_POSTINGS)
)


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


def scope_key(scope_level: str, scope_id: str) -> str:
    return "overall" if scope_level == "overall" else scope_id


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

COOCCURRENCE_PAIRS: tuple[tuple[str, str], ...] = (
    ("kubernetes", "cicd-pipeline"),
    ("kubernetes", "observability"),
    ("kubernetes", "cloud-network"),
    ("iac-terraform", "cicd-pipeline"),
    ("observability", "cicd-pipeline"),
)

# 역할 경계를 넘는 차원. `scope_expansion` 의 분자가 이 목록으로 정해진다.
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


# ============================================================ 5. 통계 payload 라벨
# CONTRACT 5장 A. tag·type·id·축 라벨은 DevOps 전용이다. 다른 직무의 상수를 쓰지 않는다.
SCOPE_EXPANSION_TAGS: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    ("network_ops", "네트워크 운영", "VPC·로드밸런서·DNS 등 네트워크 조직의 영역까지 요구",
     ("cloud-network",)),
    ("sre_oncall", "SRE·온콜", "SLO 정의와 알림 설계, 장애 당번까지 요구",
     ("observability",)),
    ("platform_iac", "플랫폼 엔지니어링", "개발팀이 쓸 인프라 표준과 코드 모듈까지 요구",
     ("iac-terraform",)),
)

ADVANCED_TYPES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("scale_cluster", "대규모 클러스터 운영", ("kubernetes",)),
    ("incident_sre", "장애 대응·온콜", ("observability",)),
    ("multi_region", "멀티 리전·글로벌 지연", ("cloud-network",)),
    ("zero_downtime", "무중단 배포", ("cicd-pipeline",)),
)

COMBOS: tuple[tuple[str, str, str, str, tuple[str, ...]], ...] = (
    ("container_base", "Kubernetes + 배포 파이프라인",
     "컨테이너를 클러스터에 올리고 그 과정을 자동화하는 기본 조합입니다.",
     "매니페스트와 워크플로를 직접 써서 배포",
     ("kubernetes", "cicd-pipeline")),
    ("iac_pipeline", "IaC + 배포 파이프라인",
     "인프라와 배포를 함께 코드로 선언해 반복 가능하게 만드는 조합입니다.",
     "같은 환경을 코드로 두 번 이상 세운 수준",
     ("iac-terraform", "cicd-pipeline")),
    ("observability_ops", "클러스터 + 관측성",
     "올린 서비스의 상태를 지표로 읽고 장애를 잡아내는 조합입니다.",
     "지표·알림을 직접 정의한 수준",
     ("kubernetes", "observability")),
    ("network_cluster", "클러스터 + 클라우드 네트워크",
     "트래픽이 클러스터 안까지 들어오는 경로를 설계하는 조합입니다.",
     "요청 경로를 그림으로 설명 가능한 수준",
     ("kubernetes", "cloud-network")),
    ("full_platform", "IaC + 클러스터 + 관측성",
     "인프라를 코드로 세우고 올린 뒤 상태까지 보는 전 구간 조합입니다.",
     "작은 서비스 하나를 처음부터 끝까지 운영",
     ("iac-terraform", "kubernetes", "observability")),
)

REALITY_TAGS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("hands_on_cluster", "직접 구축·운영해 본 경험", ("kubernetes", "cloud-network")),
    ("automation_artifact", "코드로 남은 자동화 산출물", ("iac-terraform", "cicd-pipeline")),
    ("oncall_ready", "장애를 직접 겪고 정리한 기록", ("observability",)),
)

CLUSTER_AXES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("scale_ops", "규모·확장 운영", ("kubernetes",)),
    ("automation", "자동화·인프라 코드", ("iac-terraform",)),
    ("reliability", "안정성·장애 대응", ("observability",)),
    ("network_design", "네트워크·트래픽 설계", ("cloud-network",)),
    ("delivery_process", "배포 절차·표준화", ("cicd-pipeline",)),
)


def axis_level(value: int | None) -> str:
    if value is None or value < 15:
        return "—"
    if value >= 60:
        return "강"
    if value >= 35:
        return "중"
    return "약"


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

    # --- cluster_axes (recent 공고가 없는 기업군은 행을 만들지 않는다)
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


# ============================================================ 6. 해석 payload
# (차원 slug 또는 None, item_id, 제목, 해설). 차원이 없는 항목은 빈도를 비운다.
BASELINE_ITEMS: tuple[tuple[str | None, str, str, str], ...] = (
    ("kubernetes", "kubernetes", "컨테이너 오케스트레이션 운영",
     "컨테이너를 클러스터에 올리고 문제가 생겼을 때 들여다볼 수 있는 능력입니다. DevOps 공고에서 사실상 전제 조건에 해당합니다."),
    ("cicd-pipeline", "cicd-pipeline", "배포 파이프라인 구성",
     "빌드부터 배포까지를 한 번의 실행으로 잇는 경험입니다. 도구는 회사마다 다르지만 파이프라인을 처음부터 만들어 본 사실 자체가 기준입니다."),
    ("observability", "observability", "지표·로그 기반 관측",
     "무엇이 정상인지 숫자로 말할 수 있는 상태를 만드는 일입니다. 우대 표기가 많지만 최근 공고에서는 사실상 기본기로 읽힙니다."),
    ("iac-terraform", "iac-terraform", "인프라 코드화(IaC)",
     "콘솔에서 눌러 만든 자원은 다시 만들 수 없습니다. 같은 구성을 코드로 두 번 세워 본 기록이 이 항목의 증거입니다."),
    ("cloud-network", "cloud-network", "클라우드 네트워크 기본",
     "요청 하나가 사용자에서 컨테이너까지 오는 경로를 그릴 수 있는 수준입니다. 장애 때 손이 멈추지 않으려면 필요한 기본기입니다."),
    (None, "linux-shell", "리눅스·셸 기본기",
     "모든 공고가 전제로 깔아 두는 항목이라 문장으로 잘 드러나지 않습니다. 다른 항목을 준비하는 과정에서 자연히 쌓이는 종류의 기본기입니다."),
    (None, "git-collab", "Git 기반 협업 기록",
     "인프라도 저장소에서 리뷰됩니다. 브랜치와 PR로 변경 단위를 나눈 기록이 협업 능력의 증거가 됩니다."),
    (None, "incident-basics", "장애 대응 절차 이해",
     "알림이 울린 다음의 순서를 아는지 봅니다. 개인 프로젝트의 장애 한 건이라도 원인과 재발 방지를 적어 두면 증거가 됩니다."),
)

UNCHANGED_ITEMS: tuple[tuple[str, str, str], ...] = (
    ("kubernetes", "컨테이너 오케스트레이션 운영",
     "이 기업군도 클러스터 요구 수준은 공통 기대치와 같습니다. 차별화 지점이 아니라 전제 조건입니다."),
    ("cicd-pipeline", "배포 파이프라인 구성",
     "파이프라인을 만들어 본 경험 자체는 전 기업군 공통입니다. 더 요구하지도, 덜 보지도 않습니다."),
    ("linux-shell", "리눅스·셸 기본기",
     "리눅스 기본기는 기업군과 무관하게 같은 수준입니다. 준비했다면 어디에나 통하는 항목입니다."),
    ("git-collab", "Git 기반 협업 기록",
     "변경을 저장소에 남기는 습관은 어느 기업군에서도 같은 무게로 읽힙니다."),
)

# 기업군별 편차. 순서가 편차 번호이며 recent 공고의 노랑 표시 순서와 맞춘다.
# (차원 slug, 주제, 기준선, 편차, 근거, 해석, 신뢰도, 근거 블록, 체크 개념)
CLUSTER_DEVIATIONS: dict[str, tuple[tuple[str, ...], ...]] = {
    "bigtech_platform": (
        ("observability", "관측성", "지표를 수집하고 대시보드를 본다",
         "SLO와 알림 임계값을 직접 설계하고 온콜에 참여한다",
         '"장애 알림 체계를 정리하고 온콜 대응에 참여합니다" 문장이 주요업무에 있음',
         "여러 팀이 함께 쓰는 플랫폼은 알림이 잘못 설계되면 아무도 보지 않게 됩니다. 무엇을 알림으로 올릴지 고른 기준을 말할 수 있어야 합니다.",
         "high", "#items", "slo-alerting"),
        ("kubernetes", "클러스터 규모", "클러스터에 서비스를 올려 본다",
         "노드가 늘어날 때의 병목과 멀티 클러스터 운영까지 이해한다",
         '"대규모 트래픽 환경의 배포" 문장이 신입 자격요건에 있음',
         "신입에게 실무 규모의 증명을 요구하는 것은 아닙니다. 규모가 커질 때 무엇이 먼저 한계에 닿는지 설명할 수 있으면 이 편차를 받습니다.",
         "mid", "#difficulty", "multi-cluster"),
    ),
    "fintech_finance": (
        ("cicd-pipeline", "배포 전략", "파이프라인을 구성한다",
         "무중단 배포와 롤백 판정까지 설계한다",
         '"무중단 배포 파이프라인을 설계하고 운영한 경험" 문장이 자격요건에 있음',
         "결제가 도는 중에 배포가 나갑니다. 카나리와 블루그린 중 무엇을 왜 골랐는지, 되돌릴 판단을 어떤 지표로 하는지가 질문됩니다.",
         "high", "#items", "zero-downtime"),
        ("observability", "장애 대응", "지표와 로그를 확인한다",
         "SLO와 에러 버짓으로 릴리스 속도를 조율한다",
         '"SLO를 정의하고 에러 버짓으로 릴리스 속도를 조율합니다" 문장이 주요업무에 있음',
         "관측이 보고용이 아니라 배포 결정의 근거로 쓰입니다. 어떤 지표로 무엇을 결정했는지 말할 수 있어야 합니다.",
         "high", "#items", "slo-alerting"),
        ("cloud-network", "접근 통제", "네트워크 기본 개념을 안다",
         "망 분리·최소 권한·감사 로그를 규제 관점에서 이해한다",
         '"금융 규제 환경의 접근 통제 정책" 문장이 자격요건에 있음',
         "네트워크를 나누는 이유가 성능이 아니라 규제입니다. 이 기업군에서만 나타나는 추가 관문입니다.",
         "mid", None, "access-control"),
    ),
    "startup": (
        ("iac-terraform", "자동화 범위", "IaC 도구를 접해 본다",
         "인프라 전체를 혼자 코드로 세운다",
         '"Terraform 등 IaC 도구를 접해 본 경험" 이 인원이 적은 조직의 우대에 있음',
         "표현은 가볍지만 인프라를 세울 사람이 몇 없습니다. 작은 규모라도 처음부터 끝까지 혼자 세워 본 기록이 실질 기준입니다.",
         "mid", "#items", "iac-terraform"),
        ("observability", "관측 구축", "만들어진 대시보드를 본다",
         "무엇부터 모을지 정해 관측 체계를 처음 세운다",
         '"서비스 지표와 로그를 모아 볼 수 있게 정리합니다" 문장이 주요업무에 있음',
         "이미 있는 것을 쓰는 자리가 아니라 아직 없는 것을 만드는 자리입니다. 도구 사용법보다 무엇을 재야 하는지에 대한 판단을 봅니다.",
         "mid", "#items", "observability-stack"),
    ),
    "b2b_saas": (
        ("iac-terraform", "인프라 표준화", "IaC 도구로 자원을 만든다",
         "재사용 모듈과 변경 리뷰 절차까지 갖춘다",
         '"Terraform으로 클라우드 자원을 코드로 관리하고 변경 이력을 리뷰합니다" 문장이 주요업무에 있음',
         "고객사마다 같은 구성을 반복해 세우는 조직입니다. 한 번 만든 코드가 다음 고객사에서 다시 쓰이는지가 실질 기준입니다.",
         "high", "#items", "iac-terraform"),
        ("cloud-network", "네트워크 설계", "VPC 기본 개념을 설명한다",
         "고객사별 격리와 트래픽 경로까지 설계한다",
         '"VPC·서브넷·로드밸런서 구성을 설계하고 고객 문의에 대응합니다" 문장이 주요업무에 있음',
         "고객사 트래픽이 서로 섞이면 계약 문제가 됩니다. 네트워크를 나누는 이유가 이 기업군에서는 격리입니다.",
         "high", "#items", "network-design"),
    ),
    "si_enterprise": (
        ("cicd-pipeline", "배포 절차", "파이프라인을 구성한다",
         "승인 단계와 절차 문서까지 포함한 릴리스를 만든다",
         '"형상관리와 배포 절차를 이해하고 계신 분" 과 운영 문서 작성이 함께 있음',
         "속도보다 되돌릴 수 있는 기록이 우선입니다. 변경 이력과 승인 흔적을 남기는 습관이 이 기업군의 실질 요구입니다.",
         "mid", "#items", "release-docs"),
        ("cloud-network", "폐쇄망 제약", "클라우드 네트워크 기본을 안다",
         "온프레미스·폐쇄망 제약 아래의 구성을 이해한다",
         '"리눅스와 네트워크 기본 지식" 요구가 고객사 시스템 운영과 함께 있음',
         "인터넷이 닿지 않는 구간이 있다는 전제가 깔립니다. 외부 저장소를 쓸 수 없을 때 무엇이 달라지는지 아는 것이 차이를 만듭니다.",
         "mid", None, "network-design"),
    ),
    "game": (
        ("cloud-network", "글로벌 지연", "네트워크 구성 요소를 이해한다",
         "리전 간 지연을 고려해 트래픽 경로를 고른다",
         '"리전 간 지연을 고려한 글로벌 네트워크 설계 경험" 문장이 자격요건에 있음',
         "국내 서비스의 구성과는 문제의 성격이 다릅니다. 무엇을 어디에 두고 무엇을 복제할지 고른 근거가 답이 됩니다.",
         "high", "#items", "network-design"),
        ("kubernetes", "상태 저장 워크로드", "무상태 애플리케이션을 배포한다",
         "세션과 상태를 가진 서버를 무중단으로 다룬다",
         '"상태를 가지는 게임 서버를 운영해 본 경험" 문장이 자격요건에 있음',
         "게임 서버는 마음대로 재시작할 수 없습니다. 종료 유예와 세션 이전을 어떻게 다룰지가 이 기업군의 변별점입니다.",
         "high", "#items", "stateful-workload"),
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
        for slug, item_id, title, desc in BASELINE_ITEMS
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
        "unchanged_note": "읽는 법 — 회색 번호는 DevOps 공통 기대치, 파란 번호는 문장 뒤에 숨은 신호, 노란 번호는 이 회사가 유독 원하는 것입니다.",
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


# ============================================================ 7. 전략 payload
# (slug, 제목, 부제, 이유, 증명 산출물, 채널, kind, 기본 필수 여부)
CONCEPTS: tuple[tuple[str, str, str, str, str, tuple[str, ...], str, bool], ...] = (
    ("k8s-deploy", "Kubernetes 배포 실습", "매니페스트로 직접 올린 서비스 하나",
     "기준선 · 최근 공고 전량이 클러스터 운영을 요구합니다", "클러스터에 올린 서비스 + 매니페스트 저장소",
     ("portfolio", "interview"), "project", True),
    ("cicd-pipeline", "CI/CD 파이프라인 구축", "빌드부터 배포까지 한 번에",
     "기준선 · 최근 공고 전량이 파이프라인 경험을 묻습니다", "워크플로 파일 + 실행 이력 + 실패 처리 기록",
     ("portfolio",), "project", True),
    ("iac-terraform", "인프라 코드화", "같은 환경을 코드로 두 번 세우기",
     "인프라를 코드로 관리하는 요구가 1년 새 뚜렷하게 늘었습니다", "Terraform 저장소 + 모듈 구조 설명 문서",
     ("portfolio", "interview"), "project", True),
    ("observability-stack", "관측 스택 구성", "지표·로그·알림을 직접 세우기",
     "기준선 · 관측 요구가 우대에서 자격요건으로 이동 중입니다", "대시보드 + 알림 규칙 + 지표 선택 근거",
     ("portfolio", "interview"), "project", True),
    ("network-design", "네트워크 구성 설계 기록", "요청 경로를 그림으로 남기기",
     "직무 경계 밖 요구 중 네트워크 운영이 가장 자주 나타납니다", "네트워크 구성도 + 서브넷·보안그룹 설계 근거",
     ("portfolio", "interview"), "project", True),
    ("zero-downtime", "무중단 배포 실험", "카나리·롤백 판정 기준 만들기",
     "멈추면 안 되는 서비스를 다루는 기업군의 최대 변별점입니다", "배포 전략 비교 문서 + 롤백 시나리오 실험 기록",
     ("portfolio", "interview"), "project", False),
    ("slo-alerting", "SLO·알림 설계", "무엇을 알림으로 올릴지 정하기",
     "관측을 배포 결정의 근거로 쓰는 조직이 늘고 있습니다", "SLO 정의서 + 알림 임계값 선택 근거",
     ("portfolio", "interview"), "project", False),
    ("access-control", "접근 통제·감사 기록", "최소 권한과 감사 로그",
     "규제 환경의 기업군에서 반복되는 추가 관문입니다", "권한 설계 문서 + 감사 로그 수집 설정",
     ("portfolio",), "project", False),
    ("multi-cluster", "규모 확장 이해", "노드가 늘 때의 병목 설명",
     "대규모 플랫폼 조직이 신입에게도 규모 감각을 묻습니다", "확장 실험 기록 + 병목 지점 정리 노트",
     ("interview",), "project", False),
    ("stateful-workload", "상태 저장 워크로드 다루기", "종료 유예와 세션 이전",
     "게임처럼 상태를 들고 있는 서버를 운영하는 기업군의 변별점입니다", "StatefulSet 실습 기록 + 종료 처리 설계 메모",
     ("portfolio", "interview"), "project", False),
    ("release-docs", "릴리스 절차 문서화", "변경 이력과 승인 흔적",
     "절차와 산출물을 함께 보는 기업군이 있습니다", "릴리스 절차서 + 변경 이력 정리",
     ("portfolio",), "project", False),
    ("incident-retro", "장애 대응·회고 서사", "장애를 겪고 재발을 막은 경험",
     "기준선 · 장애 대응 절차 이해가 전 기업군 공통입니다", "장애 재현·복구 기록 + 회고 글",
     ("essay", "interview"), "story", True),
    ("collab-ops", "개발팀 협업 서사", "요청을 받아 판을 고친 경험",
     "기준선 · 배포 요청과 문의 대응이 업무로 명시됩니다", "협업 문제 → 해결 → 배움 서술 준비",
     ("essay",), "story", True),
    ("k8s-internals", "쿠버네티스 동작 원리", "스케줄링·컨트롤러·네트워크 모델",
     "면접이 써 봤다와 어떻게 도는지 안다를 구분합니다", "동작 흐름 그림 + 내 클러스터 사례 연결",
     ("interview",), "study", True),
    ("iac-idempotency", "선언형 인프라와 멱등성", "같은 코드를 두 번 돌려도 같은 상태",
     "IaC 요구의 이론 바탕이며 꼬리질문의 단골입니다", "상태 파일과 드리프트 정리 노트",
     ("interview",), "study", True),
    ("sre-slo", "SRE·SLO와 장애 대응 이론", "가용성 목표와 에러 버짓",
     "관측 편차의 면접 대비가 여기서 완성됩니다", "SLO·에러 버짓 개념 정리 + 적용 사례",
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
    ("bigtech_platform", ("알림·SLO 설계", "규모 확장 이해", "클러스터 운영", "파이프라인 표준화")),
    ("startup", ("혼자 세운 인프라", "파이프라인 구축", "관측 체계 구축", "비용 관리")),
    ("b2b_saas", ("IaC 모듈화", "네트워크 격리 설계", "클러스터 운영", "문서화")),
    ("fintech_finance", ("무중단 배포", "SLO·에러 버짓", "접근 통제", "클러스터 운영")),
    ("si_enterprise", ("릴리스 절차·문서", "네트워크 기본기", "형상관리", "협업 기록")),
    ("game", ("글로벌 네트워크 설계", "상태 저장 워크로드", "부하 대응", "관측·알림")),
)


def cluster_concepts(cluster_id: str) -> tuple[str, ...]:
    """기업군 편차가 가리키는 체크 개념. 순서가 편차 번호다."""
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
                "title": "코드로 남은 인프라가 가장 강한 증거입니다",
                "body": f"{label} 기준에서도 화면 캡처보다 저장소가 강합니다. 클러스터와 자원을 코드로 세우고, 지우고 다시 세워도 같은 상태가 되는지 보여주세요.",
                "tips": ["README 1절: 무엇을 코드로 세웠는가 → 어떻게 다시 세우는가",
                         "apply 로그나 워크플로 실행 이력이 함께 남아 있으면 더 좋습니다"],
                "linked_item_ids": [
                    CONCEPT_INFO["iac-terraform"]["concept_id"],
                    CONCEPT_INFO["k8s-deploy"]["concept_id"],
                ],
            },
            {
                "title": "장애를 만들어 본 기록이 희소합니다",
                "body": "잘 도는 화면은 누구나 있습니다. 파드를 강제로 죽이거나 노드를 빼 보고 그때 지표가 어떻게 움직였는지 남긴 문서가 신입 지원자 사이에서 드뭅니다.",
                "tips": ["의도적으로 장애를 만든 실험 1건", "알림이 울리기까지 걸린 시간 한 줄"],
                "linked_item_ids": [
                    CONCEPT_INFO["observability-stack"]["concept_id"],
                    CONCEPT_INFO["incident-retro"]["concept_id"],
                ],
            },
        ],
        "intro_orders": orders,
    }
    essay = [
        {
            "kind": "deviation",
            "title": "도구 목록이 아니라 자동화한 이유로 쓰기",
            "body": f"{label} 지원 글에서 강한 것은 다뤄 본 도구의 수가 아니라 어떤 반복을 왜 없앴는가입니다. 손으로 하던 일이 코드로 옮겨간 과정을 쓰세요.",
            "narrative": {
                "problem": "배포할 때마다 손으로 맞추던 설정이 매번 달라짐",
                "solve": "구성을 코드로 옮기고 파이프라인에서 같은 절차로 실행",
                "growth": "재현 가능성이 곧 신뢰라는 관점",
            },
            "sample_sentence": "\"한 번 잘 되는 배포보다, 누가 해도 같은 결과가 나오는 배포가 인프라의 일이라고 배웠습니다.\"",
            "tips": ["줄인 시간이나 줄어든 실패 횟수를 한 문장으로 붙이세요"],
            "linked_item_ids": [CONCEPT_INFO["iac-terraform"]["concept_id"]],
        },
        {
            "kind": "narrative_polish",
            "title": "협업 경험 — 보유 소재 다듬기",
            "body": "개발팀의 요청을 받아 판을 고친 경험은 어느 기업군에서도 쓰입니다. 사실 관계는 고정하고 강조점만 지원처에 맞춰 바꾸세요.",
            "narrative": None,
            "sample_sentence": None,
            "tips": ["규제 환경이면 절차와 기록을, 스타트업이면 속도와 주도성을 앞에 두세요"],
            "linked_item_ids": [CONCEPT_INFO["collab-ops"]["concept_id"]],
        },
    ]
    interview = [
        {
            "kicker": "클러스터 검증",
            "question": "파드가 계속 재시작하면 무엇부터 확인하나요?",
            "followups": ["이벤트와 로그 중 무엇을 먼저 보나요?", "리소스 한계 설정은 어떤 기준으로 정했나요?"],
            "point": "순서가 있는 답이 필요합니다. 직접 장애를 만들어 본 사람은 이 질문에서 바로 드러납니다.",
            "linked_item_ids": [CONCEPT_INFO["k8s-deploy"]["concept_id"]],
        },
        {
            "kicker": "자동화 검증",
            "question": "같은 Terraform 코드를 두 번 실행하면 어떻게 되나요?",
            "followups": ["콘솔에서 자원을 바꾸면 그 다음 실행은 어떻게 되나요?", "상태 파일은 어디에 두었나요?"],
            "point": "멱등성과 드리프트를 아는지 묻는 질문입니다. 개념 설명이 아니라 내 저장소의 사례로 답하세요.",
            "linked_item_ids": [
                CONCEPT_INFO["iac-terraform"]["concept_id"],
                CONCEPT_INFO["iac-idempotency"]["concept_id"],
            ],
        },
        {
            "kicker": "관측 검증",
            "question": "알림을 하나만 남긴다면 무엇을 남기겠어요?",
            "followups": ["그 지표가 정상인지 어떻게 판단하나요?", "알림이 너무 자주 울리면 무엇을 바꾸나요?"],
            "point": "도구 이름이 아니라 무엇이 사용자에게 문제인지로 답해야 합니다. SLO 관점이 여기서 드러납니다.",
            "linked_item_ids": [
                CONCEPT_INFO["observability-stack"]["concept_id"],
                CONCEPT_INFO["sre-slo"]["concept_id"],
            ],
        },
        {
            "kicker": "태도 검증 · 자소서 연동",
            "question": "개발팀이 급하다고 절차를 건너뛰자고 하면 어떻게 하나요?",
            "followups": ["되돌릴 수 없는 변경이라면요?"],
            "point": "규칙을 지킨 무용담이 아니라 위험을 어떻게 설명하고 합의했는지를 봅니다.",
            "linked_item_ids": [CONCEPT_INFO["collab-ops"]["concept_id"]],
        },
    ]
    return {
        "job": JOB_ROLE_ID, "scope": scope, "checklist": checklist,
        "portfolio": portfolio, "essay": essay, "interview": interview,
        "agent_version": AGENT_VERSION_STRING, "source": "stored",
    }


# ============================================================ 8. 로드맵 payload
ROADMAP_STEPS: tuple[tuple[int, str, int, str, str, str, str, str, tuple[str, ...]], ...] = (
    (1, "STEP 01 · 3주", 3, "vhigh", "작은 서비스 하나를 클러스터에 올리고 파이프라인으로 잇기",
     "새 도구를 넓게 훑지 말고 서비스 하나를 골라 컨테이너 이미지부터 클러스터 배포까지 끝내세요. 커밋 하나가 배포까지 흘러가면 이 단계는 끝난 것입니다.",
     "클러스터에 올라간 서비스 + 매니페스트 저장소 + 배포 워크플로 실행 이력",
     "클러스터와 파이프라인이 채워지지 않으면 다른 준비가 평가에 닿지 않습니다.",
     ("매니페스트", "이미지 빌드", "워크플로")),
    (2, "STEP 02 · 3주", 3, "vhigh", "손으로 만든 자원을 코드로 옮기기",
     "STEP 01 에서 콘솔로 만든 자원을 Terraform 으로 다시 선언하세요. 전부 지우고 코드만으로 같은 상태가 복원되는지 확인하면 증거가 완성됩니다.",
     "Terraform 저장소 + 모듈 구조 설명 + 재생성 실행 기록",
     "인프라 코드화 요구가 1년 새 뚜렷하게 늘었고 면접의 꼬리질문이 여기에 몰립니다.",
     ("선언형 구성", "모듈", "재생성 검증")),
    (3, "STEP 03 · 2주", 2, "high", "지표를 세우고 일부러 장애를 내 보기",
     "지표와 로그를 모아 대시보드를 만들고, 파드를 죽이거나 노드를 빼서 알림이 실제로 울리는지 확인하세요. 그 과정을 회고로 남깁니다.",
     "대시보드 + 알림 규칙 + 장애 재현·복구 기록 + 회고 글",
     "관측 요구가 우대에서 자격요건으로 이동 중이고, 장애를 겪은 기록은 신입 사이에서 가장 희소한 산출물입니다.",
     ("지표 선택", "알림 임계값", "장애 재현")),
    (4, "STEP 04 · 2주", 2, "mid", "지원 기업군의 편차 채우고 소개 다듬기",
     "지원할 기업군의 편차 항목을 하나 골라 보강하고, 저장소 README 와 자소서의 소개 순서를 그 기업군 기준으로 다시 배치하세요.",
     "편차 항목 산출물 + 기업군 맞춤 README·소개 순서",
     "필수가 채워진 뒤의 마무리입니다. 순서만 바꿔도 읽히는 인상이 달라집니다.",
     ("편차 보강", "소개 순서", "문서 정리")),
)

STEP_FILLS: tuple[tuple[str, ...], ...] = (
    ("k8s-deploy", "cicd-pipeline"),
    ("iac-terraform", "network-design"),
    ("observability-stack", "incident-retro"),
    ("collab-ops", "release-docs"),
)

STUDY_TRACKS: tuple[tuple[str, str, str, str, str, str, tuple[str, ...]], ...] = (
    ("container-orchestration", "STEP 01~02와 병행", "vhigh", "쿠버네티스 동작 원리",
     "스케줄러가 파드를 어디에 두는지, 컨트롤러가 무엇을 되돌리는지, 서비스가 트래픽을 어떻게 보내는지를 그림으로 그릴 수 있는 수준까지.",
     "프로젝트에서 배포는 하지만 면접의 꼬리질문은 왜 그렇게 도는지를 검증합니다.",
     ("k8s-internals",)),
    ("delivery-automation", "STEP 02~03과 병행", "high", "선언형 인프라와 멱등성",
     "같은 코드를 두 번 돌렸을 때 무엇이 보장되는지, 상태 파일이 왜 필요한지, 드리프트가 생기면 무엇을 해야 하는지 설명할 수 있는 수준까지.",
     "IaC 요구는 도구 사용법보다 선언형이라는 사고방식을 검증합니다.",
     ("iac-idempotency",)),
    ("reliability-operations", "상시 · 주 3~4시간", "high", "SRE·SLO와 장애 대응 이론",
     "가용성 목표를 숫자로 정하는 법, 에러 버짓이 배포 결정에 쓰이는 방식, 알림이 지켜야 할 조건까지. 책 전체가 아니라 면접 단골 주제 중심으로.",
     "관측 편차가 여러 기업군에서 최상위입니다. 전 기간에 얇게 깔리는 것이 효율적입니다.",
     ("sre-slo",)),
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
        "phase": "상시 · 별도 트랙", "priority": "track", "title": "리눅스·네트워크 기본기",
        "depth": "명령어 암기가 아니라 프로세스와 포트, 라우팅의 기본 개념까지. 공고가 요구 항목으로 세지 않을 뿐 모든 단계의 바닥에 깔립니다.",
        "reason_title": "왜 따로 두나요?",
        "reason": "요구 분석의 결과가 아니라 전 항목의 전제입니다. 잊지 않도록 표시만 합니다.",
        "fills": [],
    })

    check_rows = []
    for slug in CONCEPT_SLUGS:
        info = CONCEPT_INFO[slug]
        is_dev = slug in devs
        check_rows.append({
            "item_id": info["concept_id"], "title": info["title"],
            "kind": "dev" if is_dev else "study" if info["kind"] == "study" else "normal",
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
    "container-orchestration": {
        "why": "최근 공고 전량이 클러스터 운영을 요구하고 다수가 자격요건에 둡니다. 이 역량이 없으면 다른 준비가 평가에 닿지 않습니다.",
        "depth": {"foundation": "매니페스트를 써서 서비스를 올릴 수 있다",
                  "application": "장애 시 이벤트와 로그로 원인을 좁힌다",
                  "tradeoff": "확장과 종료 처리를 근거와 함께 설계한다"},
        "prereq": ["컨테이너 이미지 빌드와 실행", "요청이 서비스까지 오는 네트워크 경로"],
        "misconceptions": ["올라가면 운영이 된다는 생각", "리소스 한계를 넉넉히 주면 안전하다는 생각"],
        "interview": ["파드가 계속 재시작하면 무엇부터 보나", "노드를 빼면 트래픽은 어떻게 되나"],
        "sequence": ["이미지 빌드", "매니페스트 배포", "장애 재현", "확장·종료 설계"],
    },
    "delivery-automation": {
        "why": "파이프라인 요구가 전 기업군 공통이고 인프라 코드화 요구가 1년 새 뚜렷하게 늘었습니다.",
        "depth": {"foundation": "빌드와 배포를 한 번의 실행으로 잇는다",
                  "application": "환경을 코드로 선언해 반복 가능하게 만든다",
                  "tradeoff": "무중단 전략과 롤백 판정 기준을 고른다"},
        "prereq": ["버전 관리와 브랜치 전략", "선언형 구성의 개념"],
        "misconceptions": ["한 번 돌면 자동화가 끝났다는 생각", "콘솔 수정은 나중에 코드로 옮기면 된다는 생각"],
        "interview": ["같은 코드를 두 번 돌리면 어떻게 되나", "되돌릴 판단은 무엇으로 하나"],
        "sequence": ["워크플로 구성", "인프라 코드화", "재생성 검증", "배포 전략"],
    },
    "reliability-operations": {
        "why": "관측 요구가 우대에서 자격요건으로 이동 중이고 여러 기업군이 알림 설계와 온콜을 함께 묻습니다.",
        "depth": {"foundation": "지표와 로그를 모아 볼 수 있게 만든다",
                  "application": "알림 임계값을 정하고 장애를 재현해 본다",
                  "tradeoff": "SLO와 에러 버짓으로 릴리스 속도를 조율한다"},
        "prereq": ["클러스터 기본 운영", "시계열 지표의 개념"],
        "misconceptions": ["로그를 남기면 관측이 된다는 생각", "알림은 많을수록 안전하다는 생각"],
        "interview": ["알림을 하나만 남긴다면 무엇인가", "재발을 막기 위해 무엇을 남겼나"],
        "sequence": ["지표 수집", "대시보드", "알림 설계", "회고와 재발 방지"],
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

    role_node = node("semantic", "JobRole", "job_roles", JOB_ROLE_ID, "DevOps 엔지니어")
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
        # 허용 용도(`ALLOWED_USES`) 안에 있는 필드만 근거를 붙인다.
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

    for slug in DIM_SLUGS:
        fact = FACTS.get("posting_prevalence", "ratio", "overall", JOB_ROLE_ID,
                         SEGMENT_ALL, RECENT, slug)
        if fact is None or not fact["numerator"]:
            continue
        companies = {
            p["company_id"] for p in RECENT_POSTINGS if slug in DIMS_BY_POSTING[p["nn"]]
        }
        claim_id = add_claim(
            stat_output, "statistic", None, "overall", JOB_ROLE_ID,
            f"{DIM_INFO[slug]['label']} 은 최근 1년 DevOps 공고의 {freq_pct(slug, RECENT)}% 에 나타난다.",
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

    for slug, item_id, title, _desc in BASELINE_ITEMS[:3]:
        claim_id = add_claim(
            intp_outputs["overall"], "posting_explicit", "explicit_requirement",
            "overall", JOB_ROLE_ID,
            f"{title} 은 기업군과 무관하게 반복되는 공통 기대치다.",
            {"dimension_id": dim_id(slug) if slug else None, "baseline_title": title,
             "baseline_item_id": item_id},
            "0.78000", components(freq(slug, RECENT) if slug else 3, 3, 1.0),
        )
        if slug:
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

    for slug in ("k8s-deploy", "iac-terraform"):
        info = CONCEPT_INFO[slug]
        claim_id = add_claim(
            strat_outputs["overall"], "strategy", None, "overall", JOB_ROLE_ID,
            f"{info['title']} 은 DevOps 지원 준비에서 우선순위가 높다.",
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
            "kubernetes" if scope_level == "overall"
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
                "depth_reference": "application" if i == 0 else "foundation",
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
# `dataset_versions` 는 A1 이 만든다. 이 조각은 참조만 한다.
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

    if family in ("posting_prevalence", "cluster_contrast"):
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
            if not payload["cluster_axes"]["rows"]:
                problems.append(f"{row['output_id']}: cluster_axes.rows 가 비었다")
        if row["output_type"] == "interpretation":
            for key in ("level", "cluster_tag", "posting_id"):
                if key not in payload["scope"]:
                    problems.append(f"{row['output_id']}: scope.{key} 없음")
            if not 7 <= len(payload["baseline"]) <= 9:
                problems.append(f"{row['output_id']}: baseline 개수 {len(payload['baseline'])}")
            if row["scope_level"] != "overall" and not 2 <= len(payload["deviations"]) <= 4:
                problems.append(f"{row['output_id']}: deviations 개수 {len(payload['deviations'])}")
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

    expected_clusters = set(CLUSTER_ORDER)
    for period, (expected_n, starts_on, ends_on, expected_labels) in period_spec.items():
        group = [posting for posting in POSTINGS if posting["period"] == period]
        if len(group) != expected_n:
            problems.append(f"{period}: 공고 {len(group)}건 != {expected_n}건")
        clusters = {posting["cluster"] for posting in group}
        if clusters != expected_clusters:
            problems.append(f"{period}: 기업군 차이 {sorted(clusters ^ expected_clusters)}")
        labels = {
            label: sum(1 for posting in group if posting["entry_label"] == label)
            for label in expected_labels
        }
        if labels != expected_labels:
            problems.append(f"{period}: entry_label {labels} != {expected_labels}")
        for posting in group:
            posted_on = posting["posted_at"][:10]
            if not starts_on <= posted_on <= ends_on:
                problems.append(f"{posting['nn']}: 게시일 {posted_on} 범위 밖")

    recent_counts = {
        cluster: sum(1 for posting in RECENT_POSTINGS if posting["cluster"] == cluster)
        for cluster in CLUSTER_ORDER
    }
    if set(recent_counts.values()) != {3}:
        problems.append(f"recent 기업군 분포 {recent_counts} != 기업군별 3건")
    prior_counts = {
        cluster: sum(1 for posting in PRIOR_POSTINGS if posting["cluster"] == cluster)
        for cluster in CLUSTER_ORDER
    }
    if set(prior_counts.values()) != {2}:
        problems.append(f"prev 기업군 분포 {prior_counts} != 기업군별 2건")

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
    """검사 7 — 산출물 52행과 전체 공고 해석 30행이 정확히 짝을 이루는가."""
    outputs = tables["analysis_outputs"]
    problems: list[str] = []
    counts = {
        output_type: sum(1 for row in outputs if row["output_type"] == output_type)
        for output_type in ("statistics", "interpretation", "strategy", "roadmap")
    }
    expected = {"statistics": 1, "interpretation": 37, "strategy": 7, "roadmap": 7}
    if len(outputs) != 52 or counts != expected:
        problems.append(f"산출물 {len(outputs)}행, 종류별 {counts} != 52행, {expected}")
    posting_interpretations = {
        row["scope_id"] for row in outputs
        if row["output_type"] == "interpretation" and row["scope_level"] == "posting"
    }
    posting_ids = {posting_id(posting["nn"]) for posting in POSTINGS}
    if posting_interpretations != posting_ids:
        problems.append(
            f"공고 해석 범위 차이 {sorted(posting_interpretations ^ posting_ids)}"
        )
    return problems


def check_direct_contract_values(tables: dict[str, list[dict[str, Any]]]) -> list[str]:
    """검사 8 — 출처·기간·대상군·데이터셋과 기준 회사 값을 직접 확인한다."""
    problems: list[str] = []
    catalog_companies = frozenset({
        "co_navercloud", "co_viva", "co_kakao", "co_krafton", "co_upstage",
        "co_samsungsds", "co_kurly", "co_kakaopay", "co_qmit", "co_musinsa",
        "co_wantedlab", "co_channelcorp", "co_kakaobank", "co_smilegate",
    })
    expected_uses = set(ALLOWED_USES)
    for row in tables["source_assessments"]:
        if set(row["allowed_uses"]) != expected_uses:
            problems.append(f"{row['assessment_id']}: allowed_uses 불일치")
        actual = (row["source_tier"], str(row["reliability_score"]), row["assessment_version"])
        if actual != ("A", "0.95000", "sa_v1"):
            problems.append(f"{row['assessment_id']}: 출처 평가 기본값 불일치")

    for row in tables["statistics_facts"]:
        if row["period_id"] not in {RECENT, PRIOR}:
            problems.append(f"{row['fact_id']}: 허용되지 않은 기간 {row['period_id']}")
        if row["metric_family"] == "entry_label_advanced_signal_rate":
            if row["entry_segment"] != SEGMENT_ENTRY:
                problems.append(f"{row['fact_id']}: entry_segment {row['entry_segment']}")

    if tables.get("dataset_versions"):
        problems.append("devops 모듈이 dataset_versions 행을 만들었다")
    for row in tables["postings"]:
        if row["company_id"] not in catalog_companies:
            problems.append(f"{row['posting_id']}: 기준 데이터에 없는 회사 {row['company_id']}")
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




