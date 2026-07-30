"""정보보안 직무의 생성 데모 시드 (갈래 A8).

``agent/data/demo_seed/CONTRACT.md`` 가 이 파일의 기준이다. 데이터베이스에 접속하지
않고 메모리에서 계산해 ``parts/security/<table>.csv`` 로만 낸다. 모델 호출은 0회다.

`dataset_versions` 는 A1(backend) 만 만든다. `ds_demo_v1` 는 아홉 직무가 함께 쓰는 한
행이므로 이 모듈은 그 표를 채우지 않는다.

CONTRACT 10.5 의 `allowed_uses` 예시값(`baseline`·`evidence`)은 `0001_initial_schema.sql`
의 `allowed_uses_known` CHECK 가 허용하지 않는다. A1 과 같은 값으로 담는다.

공고 본문은 실제 채용공고 수준의 일반적 직무 기술(진단 경험·인증·대응 프로세스)만
담는다. 공격 기법의 구체적 실행 방법은 담지 않는다.

실행: ``cd agent && python -m scripts.demo_seed.security``
"""

from __future__ import annotations

import json
import math
from collections import Counter
from itertools import combinations
from typing import Any

from ._csv import demo_seed_root, sha256_hex, write_part

# ============================================================ 식별자
JOB_ROLE_ID = "security"
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
    ("stats", "통계 분석", "obj_security_statistics", "slots_filled"),
    ("knowledge", "지식 구축", "obj_security_knowledge", "slots_filled"),
    ("interpretation", "채용공고 해석", "obj_security_interpretation", "slots_filled"),
    ("strategy", "합격 전략", "obj_security_strategy", "slots_filled"),
    ("roadmap", "준비 로드맵", "obj_security_roadmap", "slots_filled"),
    ("aggregation", "지표 집계", "obj_security_aggregation", "no_new_evidence"),
)


def run_id(agent: str) -> str:
    return f"run_demo_{JOB_ROLE_ID}_{agent}"


# ============================================================ 1. 요구 차원 5종
# (slug, dimension_kind, 표시 라벨, 정의, 별칭, 역할 경계 여부)
DIMENSIONS: tuple[tuple[str, str, str, str, tuple[str, ...], bool], ...] = (
    (
        "web-vuln-assessment",
        "practice",
        "웹 취약점 진단",
        "웹 애플리케이션을 점검 절차에 따라 확인하고 위험도와 조치 방안을 정리해 전달하는 요구.",
        ("웹 취약점 진단", "취약점 점검", "보안 점검", "진단 보고서"),
        False,
    ),
    (
        "soc-siem",
        "tooling",
        "보안관제·SIEM",
        "보안 로그를 모아 이상 징후를 탐지하고 탐지 정책과 사고 대응 절차를 운영하는 요구.",
        ("보안관제", "SIEM", "로그 분석", "침해 대응"),
        False,
    ),
    (
        "network-security",
        "technology",
        "네트워크 보안",
        "네트워크·서버 보안 설정과 보안 장비 운영, 트래픽 흐름 확인을 다루는 요구.",
        ("네트워크 보안", "방화벽", "보안 장비 운영", "서버 보안"),
        False,
    ),
    (
        "privacy-compliance",
        "domain",
        "개인정보·컴플라이언스",
        "개인정보 보호 법령과 정보보호 관리체계 요구사항을 업무 절차로 옮기고 준수 여부를 점검하는 요구.",
        ("개인정보 보호", "컴플라이언스", "ISMS-P", "규제 대응"),
        False,
    ),
    (
        "secure-coding",
        "practice",
        "시큐어 코딩",
        "안전한 코드 작성 원칙을 이해하고 코드 검토와 개발 가이드에 반영하는 요구.",
        ("시큐어 코딩", "개발 보안", "코드 검토", "보안 코드 리뷰"),
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
    ("soc-siem", "network-security", "related"),
    ("network-security", "soc-siem", "related"),
    ("web-vuln-assessment", "secure-coding", "related"),
    ("secure-coding", "web-vuln-assessment", "related"),
    ("privacy-compliance", "web-vuln-assessment", "related"),
)

# ============================================================ 2. 역량 3종
CAPABILITIES: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    (
        "vuln-diagnosis",
        "취약점 진단과 보고",
        "점검 절차에 따라 취약점을 확인하고 위험도와 조치 방안을 보고서로 전달하는 능력.",
        ("web-vuln-assessment", "secure-coding"),
    ),
    (
        "incident-response",
        "탐지와 사고 대응",
        "보안 로그에서 이상 징후를 찾아내고 정해진 절차에 따라 대응하고 기록하는 능력.",
        ("soc-siem", "network-security"),
    ),
    (
        "compliance-design",
        "규제 준수 점검",
        "개인정보 보호 법령과 관리체계 요구사항을 업무 절차로 옮기고 준수 여부를 점검하는 능력.",
        ("privacy-compliance",),
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
    ("vuln-diagnosis", "incident-response"),
    ("vuln-diagnosis", "compliance-design"),
)
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
        "company_id": "co_estsecurity",
        "company": "이스트시큐리티",
        "cluster": "b2b_saas",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입·주니어",
        "career_label_raw": "신입~3년",
        "edu_label_raw": "대졸 이상(2,3년제 포함)",
        "posted_at": "2026-02-03T10:00:00+09:00",
        "title": "정보보안 엔지니어(취약점 진단) 신입·주니어",
        "sections": (
            ("주요업무", (
                ("자사 제품과 고객사 웹 서비스의 보안 취약점 진단을 수행합니다.", "web-vuln-assessment", "application",
                 ("note", "고객사가 결과를 받습니다",
                  "점검 대상이 사내 서비스만이 아닙니다. 결과를 외부에 전달해야 하므로 보고서의 설득력이 함께 평가됩니다.")),
                ("진단 결과 보고서를 작성하고 개발 조직에 조치 방안을 전달합니다.", None, "foundation",
                 ("note", "전달까지가 업무입니다",
                  "찾는 것으로 끝나지 않습니다. 개발자가 읽고 바로 고칠 수 있는 문서를 쓸 수 있는지가 실질 요구입니다.")),
                ("정기 점검 주기와 진단 항목 표준을 함께 다듬습니다.", None, "foundation", None),
            )),
            ("자격요건", (
                ("웹 애플리케이션 취약점 점검 경험이 있으신 분", "web-vuln-assessment", "application",
                 ("base", "웹 취약점 점검 수행",
                  "경험이 있으신 분의 실질은 절차대로 돌려 본 사람입니다. 실습 환경에서 항목별로 결과를 남긴 기록이면 충분합니다.")),
                ("리눅스와 네트워크 기본 지식을 갖추신 분", "network-security", "foundation",
                 ("base", "네트워크·서버 보안 기본",
                  "기본 지식의 범위는 넓지 않습니다. 명령과 프로토콜의 동작을 설명할 수 있으면 이 문장은 충족됩니다.")),
                ("점검 결과를 문서로 정리해 본 경험이 있으신 분", None, "foundation",
                 ("base", "진단 결과 보고서 작성",
                  "문서 능력을 자격요건에 둔 공고입니다. 보고서 한 건을 끝까지 다듬는 편이 점검 횟수를 늘리는 것보다 낫습니다.")),
            )),
            ("우대사항", (
                ("시큐어 코딩 가이드에 따라 코드를 검토해 본 경험이 있으신 분", "secure-coding", "foundation",
                 ("mark", "시큐어 코딩 — 제품 보안의 축",
                  "제품을 파는 회사라 코드 관점의 검토를 함께 봅니다. 취약 코드와 수정 코드를 비교한 정리가 그대로 답이 됩니다.",
                  "mid", "같은 직군 80%")),
                ("개인정보 보호 관련 법령의 기본 내용을 이해하신 분", "privacy-compliance", "foundation",
                 ("note", "법령 — 기본 내용까지",
                  "심화 규제가 아니라 처리 흐름과 기본 의무 수준입니다. 점검표 한 장으로 준비 비용이 크지 않습니다.")),
                ("정보보안기사 등 관련 자격을 보유하신 분", None, "foundation",
                 ("base", "정보보안 기초 이론과 자격",
                  "자격 자체보다 그 범위의 기초 이론을 봅니다. 미보유라면 학습 노트로 대신 증명할 수 있습니다.")),
            )),
        ),
        "summary": "점검을 많이 해 본 사람보다 찾은 것을 정확히 전달하는 사람을 찾습니다. 직무 공통 기대치 항목은 대체로 공통 기대치 그대로이고, 시큐어 코딩 관점의 검토가 이 공고의 변별점입니다.",
        "summary_ratio": "추가 요구 1건 · 직무 공통 기대치 일치 4건",
    },
    {
        "nn": "02",
        "company_id": "co_kakaobank",
        "company": "카카오뱅크",
        "cluster": "fintech_finance",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "경력 4년 이상",
        "edu_label_raw": "학력무관",
        "posted_at": "2026-04-14T10:00:00+09:00",
        "title": "정보보안 담당자(보안관제)",
        "sections": (
            ("주요업무", (
                ("보안관제 체계를 운영하며 이상 징후를 탐지하고 분석합니다.", "soc-siem", "application",
                 ("note", "관제는 상시 업무입니다",
                  "프로젝트가 아니라 매일 반복되는 운영입니다. 지속 가능한 절차를 만드는 감각을 함께 봅니다.")),
                ("탐지 정책을 설계하고 오탐을 줄여 나갑니다.", None, "foundation",
                 ("note", "오탐이 실제 문제입니다",
                  "경보를 늘리는 일은 쉽습니다. 무엇을 버릴지 정하는 판단이 이 업무의 핵심입니다.")),
                ("침해 사고 대응 절차를 수립하고 유관 부서와 함께 훈련을 진행합니다.", None, "foundation",
                 ("mark", "사고 대응 — 기술이 아니라 절차",
                  "사고는 절차로 수습됩니다. 가상 시나리오라도 대응 순서를 직접 정해 본 기록이 그대로 답이 됩니다.",
                  "high", "같은 직군 80%")),
            )),
            ("자격요건", (
                ("SIEM 기반 보안관제 업무 경험이 있으신 분", "soc-siem", "tradeoff",
                 ("base", "보안 로그 확인과 이상 징후 보고",
                  "도구 이름이 붙었지만 실질은 로그를 읽고 판단하는 능력입니다. 분석 노트로 대화가 시작됩니다.")),
                ("방화벽·IPS 등 네트워크 보안 장비를 운영해 본 경험이 있으신 분", "network-security", "application",
                 ("mark", "장비 운영 — 정책 평가 순서까지",
                  "장비를 다뤄 본 적이 없어도 정책이 어떤 순서로 평가되는지를 설명할 수 있으면 대화가 됩니다.",
                  "mid", "같은 직군 100%")),
                ("전자금융 감독규정 등 금융 보안 규제를 이해하신 분", "privacy-compliance", "application",
                 ("mark", "규제 — 금융에서는 자격요건",
                  "다른 기업군에서 우대인 항목이 여기서는 자격요건입니다. 요구사항을 점검 항목으로 바꿔 본 경험을 봅니다.",
                  "high", "같은 직군 80%")),
            )),
            ("우대사항", (
                ("시큐어 코딩 가이드를 운영하고 코드 검토를 이끌어 본 경험", "secure-coding", "application",
                 ("note", "가이드 운영 — 경력 기준의 문장",
                  "신입에게 그대로 적용되는 문장은 아닙니다. 검토 기준을 문장으로 정리해 본 경험이면 충분합니다.")),
                ("클라우드 환경의 보안 로그를 분석해 본 경험", None, "foundation", None),
                ("정보보안기사 또는 CISSP 자격을 보유하신 분", None, "foundation",
                 ("base", "정보보안 기초 이론과 자격",
                  "자격 우대 표기는 기업군을 가리지 않습니다. 가점이지 변별점은 아닙니다.")),
            )),
        ),
        "summary": "규제와 절차가 업무의 형태를 정하는 팀입니다. 탐지와 장비 운영은 직무 공통 기대치의 연장이고, 금융 규제 대응과 사고 대응 절차가 실질 변별점입니다.",
        "summary_ratio": "추가 요구 3건 · 직무 공통 기대치 일치 2건",
    },
    {
        "nn": "03",
        "company_id": "co_naver",
        "company": "네이버",
        "cluster": "bigtech_platform",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입·주니어",
        "career_label_raw": "신입 또는 3년 이하",
        "edu_label_raw": "대졸 이상(2,3년제 포함)",
        "posted_at": "2026-01-13T10:00:00+09:00",
        "title": "서비스 보안 엔지니어 신입·주니어",
        "sections": (
            ("주요업무", (
                ("신규 서비스의 배포 전 보안 점검과 취약점 진단을 수행합니다.", "web-vuln-assessment", "foundation",
                 ("note", "배포 주기에 맞물린 점검",
                  "정해진 일정 안에서 반복되는 점검입니다. 항목을 표준화해 본 감각이 있으면 바로 이야깃거리가 됩니다.")),
                ("서비스 개발 조직에 시큐어 코딩 기준을 안내합니다.", "secure-coding", "foundation",
                 ("note", "개발자와 대화하는 자리",
                  "지적이 아니라 설득입니다. 원인을 코드로 설명할 수 있어야 기준이 받아들여집니다.")),
                ("보안 로그를 확인해 이상 트래픽 여부를 점검합니다.", "soc-siem", "foundation", None),
            )),
            ("자격요건", (
                ("웹 취약점 진단 도구를 사용해 점검을 수행해 본 경험이 있으신 분", "web-vuln-assessment", "application",
                 ("base", "웹 취약점 점검 수행",
                  "도구 사용을 적었지만 실질은 결과를 읽는 능력입니다. 항목별 결과와 원인을 정리한 기록이면 충족됩니다.")),
                ("시큐어 코딩 원칙을 이해하고 코드 리뷰에 반영할 수 있는 분", "secure-coding", "foundation",
                 ("base", "시큐어 코딩 기본 원칙",
                  "우대가 아니라 자격요건에 있습니다. 취약 코드와 수정 코드 비교 한 장이 이 문장을 그대로 증명합니다.")),
                ("네트워크 프로토콜의 기본 동작을 설명할 수 있는 분", "network-security", "foundation",
                 ("base", "네트워크·서버 보안 기본",
                  "설명할 수 있는 분이라는 표현이 기준입니다. 실습보다 그림으로 설명하는 연습이 효율적입니다.")),
            )),
            ("우대사항", (
                ("보안관제 또는 로그 분석 업무를 경험해 보신 분", "soc-siem", "foundation",
                 ("mark", "로그 분석 — 이 기업군의 단골 우대",
                  "서비스 규모가 크면 경보의 양 자체가 문제입니다. 정상 직무 공통 기대치을 정의해 본 기록이 있으면 우대 이상으로 읽힙니다.",
                  "mid", "같은 직군 80%")),
                ("개인정보 처리 절차에 대한 이해가 있으신 분", "privacy-compliance", "foundation",
                 ("note", "처리 절차 수준까지",
                  "심사 대응이 아니라 흐름 이해입니다. 처리 흐름도 한 장이면 준비가 끝납니다.")),
                ("보안 관련 학회·동아리 활동 경험이 있으신 분", None, "foundation", None),
            )),
        ),
        "summary": "개발 조직 옆에서 함께 일하는 보안 엔지니어를 찾습니다. 직무 공통 기대치 항목이 그대로 통하되 코드 관점의 설명력과 로그 분석이 추가 요구입니다.",
        "summary_ratio": "추가 요구 1건 · 직무 공통 기대치 일치 3건",
    },
    {
        "nn": "04",
        "company_id": "co_samsungsds",
        "company": "삼성에스디에스",
        "cluster": "si_enterprise",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입",
        "career_label_raw": "신입",
        "edu_label_raw": "대졸 이상(2,3년제 포함)",
        "posted_at": "2026-03-05T10:00:00+09:00",
        "title": "정보보안 컨설팅·인프라 보안 담당",
        "sections": (
            ("주요업무", (
                ("고객사 정보보호 관리체계 수립과 인증 심사 대응을 지원합니다.", "privacy-compliance", "application",
                 ("note", "산출물로 증명하는 조직",
                  "수주형 업무는 문서가 결과물입니다. 인증 항목과 증적의 관계를 이해하는 것이 업무의 절반입니다.")),
                ("인프라 보안 설정을 점검하고 개선안을 정리합니다.", "network-security", "foundation",
                 ("note", "여러 고객사의 같은 기준",
                  "환경은 다르고 기준은 같아야 합니다. 표준을 만들어 본 경험이 차별점이 됩니다.")),
                ("정기 취약점 진단과 조치 이행 여부를 확인합니다.", "web-vuln-assessment", "foundation", None),
            )),
            ("자격요건", (
                ("개인정보 보호법과 정보보호 관리체계 요구사항을 이해하신 분", "privacy-compliance", "tradeoff",
                 ("mark", "관리체계 — 신입 공고인데 자격요건",
                  "신입 표기 공고에 인증 요구사항이 자격요건으로 들어와 있습니다. 항목과 증적을 정리한 노트가 그대로 답이 됩니다.",
                  "high", "같은 직군 80%")),
                ("서버·네트워크 보안 설정을 점검해 본 경험이 있으신 분", "network-security", "application",
                 ("base", "네트워크·서버 보안 기본",
                  "점검 대상이 웹이 아니라 서버와 장비입니다. 실습 환경에서 설정 전후를 비교한 기록이면 충족됩니다.")),
                ("취약점 진단 결과를 보고서로 작성해 본 경험이 있으신 분", "web-vuln-assessment", "foundation",
                 ("base", "진단 결과 보고서 작성",
                  "보고서를 자격요건에 둔 공고입니다. 형식을 갖춘 문서 한 건이 여러 번의 점검보다 강합니다.")),
            )),
            ("우대사항", (
                ("보안관제 센터 운영을 경험해 보신 분", "soc-siem", "foundation",
                 ("note", "관제 — 여기서는 우대",
                  "이 조직의 주 업무는 컨설팅과 인프라입니다. 관제 경험은 있으면 좋은 정도로 읽는 것이 합리적입니다.")),
                ("정보보안기사 또는 ISMS-P 인증심사원 자격을 보유하신 분", None, "foundation",
                 ("base", "정보보안 기초 이론과 자격",
                  "심사원 자격은 신입에게 현실적이지 않습니다. 기사 범위의 기초 이론까지가 실질 직무 공통 기대치입니다.")),
                ("고객사 대상 문서 작성과 발표 경험이 있으신 분", None, "foundation", None),
            )),
        ),
        "summary": "찾는 일보다 증명하는 일의 비중이 큰 자리입니다. 진단과 보고서는 직무 공통 기대치 그대로이고, 관리체계 요구사항 이해가 이 공고의 실질 변별점입니다.",
        "summary_ratio": "추가 요구 1건 · 직무 공통 기대치 일치 4건",
    },
    {
        "nn": "05",
        "company_id": "co_ncsoft",
        "company": "엔씨소프트",
        "cluster": "game",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "경력 5년 이상",
        "edu_label_raw": "학력무관",
        "posted_at": "2026-05-19T10:00:00+09:00",
        "title": "게임 서비스 보안 담당",
        "sections": (
            ("주요업무", (
                ("게임 서비스의 보안 위협을 탐지하고 대응 절차를 운영합니다.", "soc-siem", "application",
                 ("note", "실시간 서비스의 대응",
                  "잠깐의 중단도 이용자에게 바로 보입니다. 대응 절차의 속도와 정확성을 함께 봅니다.")),
                ("서비스 트래픽과 보안 로그를 분석해 이상 행위를 식별합니다.", None, "foundation",
                 ("mark", "이상 행위 — 기준을 세우는 일",
                  "이용자 행동과 공격을 가르는 기준이 서비스마다 다릅니다. 데이터를 보고 기준을 세워 본 경험을 기대합니다.",
                  "high", "같은 직군 80%")),
                ("개발 조직과 함께 보안 취약점 조치를 진행합니다.", "web-vuln-assessment", "foundation", None),
            )),
            ("자격요건", (
                ("보안관제 또는 SIEM 로그 분석 경험이 있으신 분", "soc-siem", "tradeoff",
                 ("base", "보안 로그 확인과 이상 징후 보고",
                  "관제와 로그 분석을 한 문장에 둔 것은 도구보다 판단을 본다는 뜻입니다.")),
                ("네트워크 보안 장비 운영과 트래픽 분석 경험이 있으신 분", "network-security", "tradeoff",
                 ("mark", "트래픽 — 대량 상황의 대응까지",
                  "실시간 서비스라 트래픽이 곧 서비스 품질입니다. 흐름을 그림으로 설명할 수 있어야 합니다.",
                  "mid", "같은 직군 100%")),
                ("대규모 서비스의 보안 대응을 담당해 보신 분", None, "foundation", None),
            )),
            ("우대사항", (
                ("웹·클라이언트 취약점 진단을 경험해 보신 분", "web-vuln-assessment", "application",
                 ("base", "웹 취약점 점검 수행",
                  "게임사라도 웹 진단은 직무 공통 기대치 그대로입니다. 클라이언트가 붙었을 뿐 준비는 그대로 통합니다.")),
                ("시큐어 코딩 관점의 코드 검토 경험이 있으신 분", "secure-coding", "foundation",
                 ("note", "검토 — 개발 조직과의 협업",
                  "조치는 결국 개발 조직이 합니다. 원인을 코드로 설명하는 능력이 협업의 조건입니다.")),
                ("게임 도메인에 대한 이해가 있으신 분", None, "foundation", None),
            )),
        ),
        "summary": "실시간 서비스에서 정상과 이상을 가르는 기준을 세울 사람을 찾습니다. 진단은 직무 공통 기대치 그대로이고, 이상 행위 식별과 트래픽 대응이 변별점입니다.",
        "summary_ratio": "추가 요구 2건 · 직무 공통 기대치 일치 3건",
    },
    {
        "nn": "06",
        "company_id": "co_wantedlab",
        "company": "원티드랩",
        "cluster": "startup",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입·주니어",
        "career_label_raw": "신입~2년",
        "edu_label_raw": "학력무관",
        "posted_at": "2026-06-02T10:00:00+09:00",
        "title": "정보보안 담당자(신입·주니어)",
        "sections": (
            ("주요업무", (
                ("서비스 취약점 점검과 보안 개선 과제를 수행합니다.", "web-vuln-assessment", "foundation", None),
                ("개인정보 처리 현황을 점검하고 내부 지침을 정비합니다.", "privacy-compliance", "foundation", None),
                ("보안 문의 대응과 사내 보안 교육을 진행합니다.", None, "foundation", None),
            )),
            ("자격요건", (
                ("웹 서비스 취약점 점검을 경험해 보신 분", "web-vuln-assessment", "foundation", None),
                ("개인정보 보호 법령의 기본 내용을 이해하신 분", "privacy-compliance", "foundation", None),
            )),
            ("우대사항", (
                ("리눅스 서버와 네트워크 운영 경험이 있으신 분", "network-security", "foundation", None),
                ("정보보안 관련 자격을 보유하신 분", None, "foundation", None),
            )),
        ),
        "summary": "담당자가 한 명인 조직에서 점검부터 지침까지 맡을 사람을 찾습니다.",
        "summary_ratio": "추가 요구 2건 · 직무 공통 기대치 일치 3건",
    },
    {
        "nn": "07",
        "company_id": "co_coupang",
        "company": "쿠팡",
        "cluster": "bigtech_platform",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "경력 4년 이상",
        "edu_label_raw": "대졸 이상(2,3년제 포함)",
        "posted_at": "2026-05-07T10:00:00+09:00",
        "title": "보안 엔지니어(Security Operations)",
        "sections": (
            ("주요업무", (
                ("보안관제 체계를 운영하고 탐지 정책을 개선합니다.", "soc-siem", "application", None),
                ("침해 사고 대응과 사후 분석을 수행합니다.", None, "foundation", None),
                ("반복 업무를 줄이기 위한 보안 자동화 도구를 개발합니다.", None, "foundation", None),
            )),
            ("자격요건", (
                ("보안관제 또는 침해 대응 업무 경험이 있으신 분", "soc-siem", "application", None),
                ("네트워크와 시스템 보안에 대한 이해가 있으신 분", "network-security", "application", None),
            )),
            ("우대사항", (
                ("웹 취약점 진단을 경험해 보신 분", "web-vuln-assessment", "foundation", None),
                ("시큐어 코딩 관점에서 코드를 검토해 본 경험이 있으신 분", "secure-coding", "foundation", None),
            )),
        ),
        "summary": "관제와 대응을 자동화까지 끌고 갈 사람을 찾습니다.",
        "summary_ratio": "추가 요구 3건 · 직무 공통 기대치 일치 2건",
    },
    {
        "nn": "08",
        "company_id": "co_viva",
        "company": "비바리퍼블리카",
        "cluster": "fintech_finance",
        "period": RECENT,
        "entry_label": "entry_junior",
        "entry_label_raw": "신입",
        "career_label_raw": "신입",
        "edu_label_raw": "대졸 이상(2,3년제 포함)",
        "posted_at": "2026-04-02T10:00:00+09:00",
        "title": "정보보안 신입·주니어",
        "sections": (
            ("주요업무", (
                ("서비스 보안 점검과 취약점 조치 확인을 수행합니다.", "web-vuln-assessment", "foundation", None),
                ("금융 보안 규제 요구사항을 정리하고 준수 여부를 점검합니다.", "privacy-compliance", "foundation", None),
                ("보안 로그를 확인하고 이상 징후를 보고합니다.", "soc-siem", "foundation", None),
            )),
            ("자격요건", (
                ("웹 애플리케이션 취약점의 원인과 대응 방법을 설명할 수 있는 분", "web-vuln-assessment", "foundation", None),
                ("개인정보 보호와 금융 보안 규제에 관심이 있으신 분", "privacy-compliance", "foundation", None),
            )),
            ("우대사항", (
                ("보안 로그 분석을 경험해 보신 분", "soc-siem", "foundation", None),
                ("시큐어 코딩을 학습해 본 경험이 있으신 분", "secure-coding", "foundation", None),
            )),
        ),
        "summary": "규제를 이해하면서 점검을 수행할 신입을 찾습니다.",
        "summary_ratio": "추가 요구 2건 · 직무 공통 기대치 일치 3건",
    },
    {
        "nn": "09",
        "company_id": "co_skcnc",
        "company": "에스케이씨앤씨",
        "cluster": "si_enterprise",
        "period": RECENT,
        "entry_label": "experienced",
        "entry_label_raw": "경력",
        "career_label_raw": "경력 3년 이상",
        "edu_label_raw": "학력무관",
        "posted_at": "2026-03-24T10:00:00+09:00",
        "title": "보안 인프라 운영 담당",
        "sections": (
            ("주요업무", (
                ("고객사 보안 인프라를 운영하고 정책을 관리합니다.", "network-security", "application", None),
                ("정기 취약점 진단과 조치 이행을 관리합니다.", "web-vuln-assessment", "foundation", None),
                ("정보보호 관리체계 심사 대응을 지원합니다.", "privacy-compliance", "application", None),
            )),
            ("자격요건", (
                ("방화벽·VPN 등 네트워크 보안 장비 운영 경험이 있으신 분", "network-security", "application", None),
                ("정보보호 관리체계 인증 대응을 경험해 보신 분", "privacy-compliance", "application", None),
            )),
            ("우대사항", (
                ("보안관제 업무를 경험해 보신 분", "soc-siem", "foundation", None),
                ("취약점 진단 도구를 운용해 본 경험이 있으신 분", "web-vuln-assessment", "foundation", None),
                ("시큐어 코딩 가이드를 적용해 본 경험이 있으신 분", "secure-coding", "foundation", None),
            )),
        ),
        "summary": "여러 고객사의 보안 인프라를 같은 기준으로 운영할 사람을 찾습니다.",
        "summary_ratio": "추가 요구 3건 · 직무 공통 기대치 일치 2건",
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
        "edu_label_raw": "대졸 이상(2,3년제 포함)" if is_entry else "학력무관",
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
        "2024-03-12T10:00:00+09:00", "서비스 보안 엔지니어",
        (
            ("서비스 출시 전 웹 취약점 진단과 조치 검증을 수행합니다.", "web-vuln-assessment", "application", None),
            ("개발 조직에 시큐어 코딩 기준을 안내하고 코드 검토를 지원합니다.", "secure-coding", "application", None),
            ("보안 이벤트와 서비스 로그를 연계해 이상 징후를 분석합니다.", "soc-siem", "foundation", None),
        ),
        (
            ("웹 애플리케이션 취약점 진단과 결과 보고 경험이 있으신 분", "web-vuln-assessment", "application", None),
            ("시큐어 코딩 원칙을 코드 리뷰에 적용할 수 있는 분", "secure-coding", "application", None),
        ),
        (
            ("SIEM 기반 로그 분석 경험이 있으신 분", "soc-siem", "foundation", None),
            ("네트워크 프로토콜과 접근 제어를 이해하신 분", "network-security", "foundation", None),
        ),
        "개발 주기 안에서 진단과 코드 개선을 연결할 보안 엔지니어를 찾습니다.",
    ),
    prior_posting(
        "11", "co_upstage", "업스테이지", "startup", "entry_junior",
        "2024-06-18T10:00:00+09:00", "정보보안 담당자 신입·주니어",
        (
            ("웹 서비스 취약점 점검과 개선 과제를 관리합니다.", "web-vuln-assessment", "foundation", None),
            ("개인정보 처리 흐름을 정리하고 내부 보호 지침을 관리합니다.", "privacy-compliance", "foundation", None),
            ("클라우드 네트워크와 서버의 보안 설정을 점검합니다.", "network-security", "foundation", None),
        ),
        (
            ("웹 취약점의 원인과 대응 방법을 설명할 수 있는 분", "web-vuln-assessment", "foundation", None),
            ("개인정보 보호법의 기본 의무를 이해하신 분", "privacy-compliance", "foundation", None),
        ),
        (
            ("보안 로그를 수집하고 분석해 본 경험이 있으신 분", "soc-siem", "foundation", None),
            ("시큐어 코딩 학습 또는 코드 검토 경험이 있으신 분", "secure-coding", "foundation", None),
        ),
        "작은 조직에서 점검과 개인정보 보호 업무를 함께 맡을 주니어를 찾습니다.",
    ),
    prior_posting(
        "12", "co_navercloud", "네이버클라우드", "b2b_saas", "experienced",
        "2024-10-29T10:00:00+09:00", "클라우드 보안관제 엔지니어",
        (
            ("클라우드 보안 로그를 수집하고 SIEM 탐지 정책을 운영합니다.", "soc-siem", "application", None),
            ("고객 환경의 네트워크 보안 정책과 접근 제어를 점검합니다.", "network-security", "application", None),
            ("탐지 결과를 분석해 사고 대응 절차를 개선합니다.", None, "foundation", None),
        ),
        (
            ("SIEM 기반 탐지 정책 운영 경험이 있으신 분", "soc-siem", "tradeoff", None),
            ("방화벽과 네트워크 접근 제어 정책을 운영해 본 분", "network-security", "application", None),
        ),
        (
            ("웹 취약점 진단 결과를 해석할 수 있는 분", "web-vuln-assessment", "foundation", None),
            ("개발 보안 가이드 작성 경험이 있으신 분", "secure-coding", "foundation", None),
        ),
        "클라우드 고객 환경의 로그와 네트워크 정책을 함께 다룰 관제 엔지니어를 찾습니다.",
    ),
    prior_posting(
        "13", "co_kbank", "케이뱅크", "fintech_finance", "entry_junior",
        "2025-02-11T10:00:00+09:00", "금융 정보보안 신입",
        (
            ("전자금융 보안 규제와 개인정보 보호 요구사항의 준수 여부를 점검합니다.", "privacy-compliance", "application", None),
            ("보안 로그를 확인하고 이상 징후를 보고합니다.", "soc-siem", "foundation", None),
            ("서비스 취약점 조치 현황을 확인합니다.", "web-vuln-assessment", "foundation", None),
        ),
        (
            ("개인정보 보호와 전자금융 규제의 기본 내용을 이해하신 분", "privacy-compliance", "application", None),
            ("웹 애플리케이션 보안 취약점을 학습해 본 분", "web-vuln-assessment", "foundation", None),
        ),
        (
            ("SIEM 또는 로그 분석 실습 경험이 있으신 분", "soc-siem", "foundation", None),
            ("네트워크 보안 장비의 기본 동작을 이해하신 분", "network-security", "foundation", None),
        ),
        "금융 규제를 이해하면서 점검과 로그 분석을 수행할 신입을 찾습니다.",
    ),
    prior_posting(
        "14", "co_lgcns", "엘지씨엔에스", "si_enterprise", "experienced",
        "2025-07-15T10:00:00+09:00", "정보보호 컨설턴트",
        (
            ("고객사의 정보보호 관리체계 수립과 인증 심사 대응을 수행합니다.", "privacy-compliance", "tradeoff", None),
            ("서버와 네트워크 보안 설정을 점검해 개선안을 작성합니다.", "network-security", "application", None),
            ("정기 취약점 진단 결과와 조치 이행을 관리합니다.", "web-vuln-assessment", "application", None),
        ),
        (
            ("ISMS-P 등 정보보호 관리체계 대응 경험이 있으신 분", "privacy-compliance", "tradeoff", None),
            ("네트워크 보안 구성과 점검 기준을 이해하신 분", "network-security", "application", None),
        ),
        (
            ("시큐어 코딩 가이드 검토 경험이 있으신 분", "secure-coding", "foundation", None),
            ("보안관제 운영 절차를 이해하신 분", "soc-siem", "foundation", None),
        ),
        "고객사마다 다른 환경을 공통 관리체계와 점검 기준으로 정리할 컨설턴트를 찾습니다.",
    ),
    prior_posting(
        "15", "co_krafton", "크래프톤", "game", "entry_junior",
        "2025-11-18T10:00:00+09:00", "게임 서비스 보안 주니어",
        (
            ("게임 서비스 보안 로그와 트래픽을 분석해 이상 행위를 탐지합니다.", "soc-siem", "application", None),
            ("네트워크 보안 정책과 접근 제어 설정을 점검합니다.", "network-security", "foundation", None),
            ("개발 조직과 웹·클라이언트 취약점 조치를 진행합니다.", "web-vuln-assessment", "foundation", None),
        ),
        (
            ("로그 분석을 통해 정상과 이상 행위를 구분해 본 분", "soc-siem", "application", None),
            ("네트워크와 서버 보안의 기본 동작을 설명할 수 있는 분", "network-security", "foundation", None),
        ),
        (
            ("시큐어 코딩 관점의 코드 검토 경험이 있으신 분", "secure-coding", "foundation", None),
            ("웹 취약점 진단 도구를 실습해 본 분", "web-vuln-assessment", "foundation", None),
        ),
        "실시간 게임 서비스의 로그와 트래픽을 살필 주니어 보안 담당자를 찾습니다.",
    ),
)


def expanded_posting(
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
    expanded_posting("16", "01", RECENT, "2026-01-05T10:00:00+09:00", "entry_junior"),
    expanded_posting("17", "01", RECENT, "2026-01-26T10:00:00+09:00", "experienced"),
    expanded_posting("18", "02", RECENT, "2026-02-16T10:00:00+09:00", "entry_junior"),
    expanded_posting("19", "03", RECENT, "2026-03-09T10:00:00+09:00", "entry_junior"),
    expanded_posting("20", "04", RECENT, "2026-03-30T10:00:00+09:00", "experienced"),
    expanded_posting("21", "05", RECENT, "2026-04-20T10:00:00+09:00", "entry_junior"),
    expanded_posting("22", "05", RECENT, "2026-05-11T10:00:00+09:00", "experienced"),
    expanded_posting("23", "06", RECENT, "2026-05-25T10:00:00+09:00", "entry_junior"),
    expanded_posting("24", "06", RECENT, "2026-06-22T10:00:00+09:00", "experienced"),
    expanded_posting("25", "03", PRIOR, "2024-05-13T10:00:00+09:00", "entry_junior"),
    expanded_posting("26", "06", PRIOR, "2024-09-09T10:00:00+09:00", "experienced"),
    expanded_posting("27", "01", PRIOR, "2025-02-10T10:00:00+09:00", "entry_junior"),
    expanded_posting("28", "02", PRIOR, "2025-05-12T10:00:00+09:00", "experienced"),
    expanded_posting("29", "04", PRIOR, "2025-08-11T10:00:00+09:00", "entry_junior"),
    expanded_posting("30", "05", PRIOR, "2025-11-10T10:00:00+09:00", "experienced"),
)

_CLUSTER_READING = {
    "bigtech_platform": "서비스 변경 속도를 막지 않으면서 위험을 우선순위화하는 판단",
    "startup": "한정된 인력으로 점검·대응·지침을 끝까지 운영하는 책임 범위",
    "b2b_saas": "여러 고객 환경의 로그와 권한을 일관된 기준으로 다루는 운영력",
    "fintech_finance": "규제 증적과 사고 대응 절차를 빠짐없이 연결하는 정확성",
    "si_enterprise": "고객사별 인프라 차이를 문서와 점검표로 통제하는 능력",
    "game": "실시간 서비스의 이상 행위를 가려 내고 대응 범위를 정하는 판단",
}


def _complete_posting_content(posting: dict[str, Any]) -> dict[str, Any]:
    """빈 공고 해석을 원문·기업군·보안 요구에 맞춰 완성한다."""
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
            f"{level}는 다음 역량을 보고서·로그·대응 기록으로 보여 줘야 합니다: {_CLUSTER_READING[posting['cluster']]}."
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
                f"‘{line[0]}’는 보안 직무의 공통 기대치입니다. 사용한 도구보다 점검 절차와 판단 근거가 남은 산출물을 제시하세요.")
        elif kind == "mark":
            annotation = ("mark", f"{posting['company']}가 확인하는 {dim_label}",
                f"이 문장은 다음 역량을 확인합니다: {_CLUSTER_READING[posting['cluster']]}. ‘{line[0]}’에 대해 선택한 대응과 그 이유, 남은 위험을 설명해야 합니다.",
                "mid", f"{CLUSTERS[posting['cluster']]} 전체 기간 참고")
        else:
            annotation = ("note", f"{posting['company']} 업무에서 읽을 점",
                f"‘{line[0]}’는 발견만이 아니라 전달과 후속 확인까지 맡는다는 뜻입니다. 재현 절차와 조치 확인 결과를 기록하세요.")
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
            ("web-vuln-assessment", "secure-coding"),
            ("soc-siem", "network-security"),
            ("privacy-compliance", "web-vuln-assessment"),
            ("soc-siem", "web-vuln-assessment"),
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
# CONTRACT 5장 A. tag·type·id·축 라벨은 정보보안 전용이다. 다른 직무에 쓰지 않는다.
SCOPE_EXPANSION_TAGS: tuple[tuple[str, str, str, tuple[str, ...]], ...] = (
    ("dev_secure_coding", "개발·시큐어 코딩", "코드 검토와 개발 가이드 작성까지 요구",
     ("secure-coding",)),
    ("compliance_docs", "규제·문서", "법령 해석과 심사 대응 문서 작성까지 요구",
     ("privacy-compliance",)),
    ("infra_ops", "인프라 운영", "서버·네트워크 장비 설정과 운영까지 요구",
     ("network-security",)),
)

ADVANCED_TYPES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("siem_operations", "관제·탐지 정책 운영", ("soc-siem",)),
    ("regulation_response", "감독규정·인증 대응", ("privacy-compliance",)),
    ("large_scale_defense", "대규모 서비스 방어", ("network-security",)),
)

COMBOS: tuple[tuple[str, str, str, str, tuple[str, ...]], ...] = (
    ("diagnosis", "웹 취약점 진단 + 시큐어 코딩",
     "점검으로 문제를 찾고 코드 관점의 원인까지 짚는 기본 조합입니다.",
     "점검 항목별 원인과 조치를 설명할 수 있는 수준",
     ("web-vuln-assessment", "secure-coding")),
    ("operations", "보안관제 + 네트워크 보안",
     "로그로 이상 징후를 찾고 장비·설정으로 막아 본 경험을 묻는 조합입니다.",
     "탐지에서 차단까지의 흐름을 설명할 수 있는 수준",
     ("soc-siem", "network-security")),
    ("compliance", "개인정보·컴플라이언스 + 진단 보고",
     "법령이 요구하는 항목을 점검표로 옮기고 결과를 문서로 남기는 조합입니다.",
     "요구사항 대비 점검 결과를 정리한 문서 1건",
     ("privacy-compliance", "web-vuln-assessment")),
    ("full", "진단 + 관제 + 규제 대응",
     "찾고, 지키고, 증명하는 세 축을 모두 다루는 조합입니다.",
     "세 축을 한 사례로 잇는 설명",
     ("web-vuln-assessment", "soc-siem", "privacy-compliance")),
)

REALITY_TAGS: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("hands_on_diagnosis", "직접 점검해 본 경험", ("web-vuln-assessment",)),
    ("ops_experience", "탐지·대응까지 해 본 경험", ("soc-siem", "network-security")),
    ("regulation_reading", "법령·기준 문서를 읽어 본 경험", ("privacy-compliance",)),
)

CLUSTER_AXES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    ("assessment", "진단·점검", ("web-vuln-assessment",)),
    ("detection", "탐지·대응", ("soc-siem",)),
    ("infra", "네트워크·인프라", ("network-security",)),
    ("compliance", "규제·컴플라이언스", ("privacy-compliance",)),
    ("secure_dev", "개발·시큐어 코딩", ("secure-coding",)),
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
BASELINE_ITEMS: tuple[tuple[str, str, str, str], ...] = (
    ("web-vuln-assessment", "web-vuln-assessment", "웹 취약점 점검 수행",
     "점검 절차를 알고 실제로 돌려 본 경험입니다. 도구를 써 봤는지가 아니라 결과를 읽고 원인을 말할 수 있는지를 봅니다."),
    ("network-security", "network-security", "네트워크·서버 보안 기본",
     "리눅스와 네트워크의 기본 동작, 보안 설정의 의미입니다. 정보보안 신입에게는 사실상 전제 조건입니다."),
    ("soc-siem", "soc-siem", "보안 로그 확인과 이상 징후 보고",
     "로그를 열어 무엇이 평소와 다른지 짚는 감각입니다. 관제 경험이 없어도 실습 로그로 증명할 수 있습니다."),
    ("privacy-compliance", "privacy-compliance", "개인정보 보호 법령 이해",
     "법령이 요구하는 항목을 업무 절차로 옮길 수 있는지입니다. 조문 암기가 아니라 점검표로 옮기는 능력을 봅니다."),
    ("secure-coding", "secure-coding", "시큐어 코딩 기본 원칙",
     "취약점의 원인을 코드 관점에서 설명하는 능력입니다. 우대에서 자격요건으로 올라오는 흐름이 뚜렷합니다."),
    ("vuln-report", "web-vuln-assessment", "진단 결과 보고서 작성",
     "찾은 것을 남에게 전달하는 문서입니다. 진단 업무의 산출물이 보고서라서 점검만큼 자주 요구됩니다."),
    ("incident-process", "soc-siem", "사고 대응 절차 이해",
     "탐지 이후 무엇을 어떤 순서로 하는지입니다. 실무 경험이 없어도 절차를 설명할 수 있으면 충분합니다."),
    ("security-cert", "privacy-compliance", "정보보안 기초 이론과 자격",
     "정보보안기사 등 자격을 우대로 명시하는 공고가 꾸준합니다. 자격 자체보다 그 범위의 기초 이론이 직무 공통 기대치입니다."),
)

UNCHANGED_ITEMS: tuple[tuple[str, str, str], ...] = (
    ("web-vuln-assessment", "웹 취약점 점검 수행",
     "이 기업군도 요구 수준은 공통 기대치와 같습니다. 차별화 지점이 아니라 전제 조건입니다."),
    ("network-security", "네트워크·서버 보안 기본",
     "기본기 요구는 기업군과 무관하게 동일합니다. 준비했다면 어디에나 통하는 항목입니다."),
    ("vuln-report", "진단 결과 보고서 작성",
     "보고서 요구는 전 기업군 공통입니다. 더 요구하지도, 덜 보지도 않습니다."),
    ("security-cert", "정보보안 기초 이론과 자격",
     "자격 우대 표기는 어디에나 있습니다. 가점이지 변별점은 아닙니다."),
)

# 기업군별 추가 요구. (차원 slug, 주제, 직무 공통 기대치, 추가 요구, 근거, 해석, 신뢰도, 근거 블록, 체크 개념)
CLUSTER_DEVIATIONS: dict[str, tuple[tuple[str, ...], ...]] = {
    "bigtech_platform": (
        ("soc-siem", "탐지 운영", "로그를 읽고 보고", "탐지 정책을 설계하고 오탐을 줄이는 일까지",
         '"탐지 정책을 개선" 문장이 주요업무에 있음',
         "서비스가 크면 경보의 양 자체가 문제입니다. 무엇을 탐지 대상으로 삼고 무엇을 버릴지 정하는 판단을 기대합니다.",
         "high", "#advanced", "detection-rule"),
        ("network-security", "방어 설계", "보안 설정의 의미 이해", "대규모 트래픽 환경의 방어 구성까지",
         '"네트워크와 시스템 보안에 대한 이해" 문장이 자격요건에 있음',
         "규모가 전제로 깔린 공고입니다. 신입에게 실무 규모의 증명이 아니라 구조를 설명할 수 있는 수준을 기대합니다.",
         "mid", "#items", "network-lab"),
        ("secure-coding", "자동화", "코드 검토 참여", "반복 점검을 도구로 옮기는 일까지",
         "주요업무에 보안 자동화 도구 개발이 있음",
         "사람이 매번 확인할 수 없는 규모입니다. 간단한 스크립트라도 직접 만들어 본 경험이 그대로 신호가 됩니다.",
         "mid", "#scope_expansion", "secure-code-review"),
    ),
    "fintech_finance": (
        ("privacy-compliance", "규제", "법령의 기본 내용 이해", "금융 보안 규제 대응까지",
         '"전자금융 감독규정 등 금융 보안 규제" 문장이 자격요건에 있음',
         "금융은 규제가 업무의 형태를 정합니다. 조문을 외우는 것이 아니라 요구사항을 점검 항목으로 바꿔 본 경험을 봅니다.",
         "high", "#items", "isms-study"),
        ("soc-siem", "사고 대응", "이상 징후 보고", "대응 절차 수립과 훈련까지",
         '"침해 사고 대응 절차를 수립" 문장이 주요업무에 있음',
         "사고는 기술이 아니라 절차로 수습됩니다. 훈련 시나리오를 만들어 본 기록이 그대로 답이 됩니다.",
         "high", "#advanced", "incident-drill"),
        ("network-security", "장비 운영", "보안 설정 이해", "보안 장비 운영과 정책 관리까지",
         '"방화벽·IPS 등 네트워크 보안 장비" 문장이 자격요건에 있음',
         "장비를 다뤄 본 적이 없어도 정책이 어떤 순서로 평가되는지를 설명할 수 있으면 대화가 됩니다.",
         "mid", "#items", "network-lab"),
    ),
    "b2b_saas": (
        ("web-vuln-assessment", "진단", "점검 수행", "고객사 대상 진단과 결과 전달까지",
         '"고객사 웹 서비스의 보안 취약점 진단" 문장이 주요업무에 있음',
         "결과를 받는 사람이 사내가 아니라 고객사입니다. 위험도와 조치 우선순위를 설명하는 문서 능력이 함께 평가됩니다.",
         "high", "#items", "diagnosis-report"),
        ("secure-coding", "제품 보안", "원칙 이해", "제품 코드 검토 기준 운영까지",
         '"시큐어 코딩 가이드에 따라 코드를 검토" 문장이 우대사항에 있음',
         "제품이 곧 회사의 신뢰입니다. 검토 기준을 문장으로 정리해 본 경험이 있으면 우대 이상으로 읽힙니다.",
         "mid", "#scope_expansion", "secure-code-review"),
    ),
    "si_enterprise": (
        ("privacy-compliance", "인증 심사", "법령 이해", "관리체계 인증 심사 대응까지",
         '"정보보호 관리체계 요구사항" 문장이 자격요건에 있음',
         "수주 조직은 산출물로 증명합니다. 인증 항목과 증적의 관계를 이해하는 것이 실제 업무의 절반입니다.",
         "high", "#items", "isms-study"),
        ("network-security", "인프라 정책", "보안 설정 점검", "고객사 인프라 정책 관리까지",
         '"서버·네트워크 보안 설정을 점검" 문장이 자격요건에 있음',
         "여러 고객사의 환경을 같은 기준으로 다뤄야 합니다. 표준을 만들어 본 경험이 차별점이 됩니다.",
         "mid", "#items", "network-lab"),
        ("web-vuln-assessment", "정기 진단", "점검 수행", "정기 진단과 조치 이행 관리까지",
         '"정기 취약점 진단과 조치 이행" 문장이 주요업무에 있음',
         "한 번 찾는 것보다 조치가 끝났는지 확인하는 일이 많습니다. 이력을 관리한 기록이 설득력을 갖습니다.",
         "mid", "#items", "diagnosis-report"),
    ),
    "game": (
        ("soc-siem", "이상 행위 탐지", "로그 확인", "실시간 서비스의 이상 행위 식별까지",
         '"서비스 트래픽과 보안 로그를 분석해 이상 행위를 식별" 문장이 주요업무에 있음',
         "이용자 행동과 공격을 가르는 기준이 서비스마다 다릅니다. 데이터를 보고 기준을 세워 본 경험을 기대합니다.",
         "high", "#advanced", "log-analysis"),
        ("network-security", "트래픽 방어", "보안 장비 이해", "대량 트래픽 상황의 대응까지",
         '"네트워크 보안 장비 운영과 트래픽 분석" 문장이 자격요건에 있음',
         "실시간 서비스는 잠깐의 중단도 눈에 띕니다. 트래픽을 그림으로 설명할 수 있어야 합니다.",
         "mid", "#items", "network-lab"),
    ),
    "startup": (
        ("privacy-compliance", "내부 지침", "법령 이해", "내부 지침 정비와 사내 안내까지",
         '"개인정보 처리 현황을 점검하고 내부 지침을 정비" 문장이 주요업무에 있음',
         "담당자가 한 명뿐인 조직입니다. 규정을 남이 읽을 수 있는 문서로 만드는 일이 업무의 큰 축입니다.",
         "high", "#items", "privacy-checklist"),
        ("web-vuln-assessment", "단독 수행", "점검 수행", "점검부터 개선 과제 관리까지 단독으로",
         '"서비스 취약점 점검과 보안 개선 과제를 수행" 문장이 주요업무에 있음',
         "찾는 사람과 고치는 사람이 같습니다. 개발자와 대화가 되는 수준의 설명력이 함께 평가됩니다.",
         "mid", "#items", "web-vuln-lab"),
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
    """직무 공통 기대치 8개. 지표는 참조 차원에서 읽는다."""
    return [
        {
            "item_id": item_id, "title": title, "desc": desc,
            "freq_pct": freq_pct(ref, RECENT), "required_ratio": required_pct(ref, RECENT),
        }
        for item_id, ref, title, desc in BASELINE_ITEMS
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
        "unchanged_note": "읽는 법 — 회색 번호는 정보보안 공통 기대치, 파란 번호는 문장 뒤에 숨은 신호, 노란 번호는 이 회사가 유독 원하는 것입니다.",
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
    ("web-vuln-lab", "웹 취약점 진단 실습", "점검 환경을 직접 세우고 돌려 보기",
     "직무 공통 기대치 · 최근 공고 전량이 취약점 점검을 요구합니다", "실습 환경 구성 기록 + 점검 항목별 결과 정리",
     ("portfolio",), "project", True),
    ("diagnosis-report", "진단 보고서 작성", "위험도와 조치 우선순위까지",
     "직무 공통 기대치 · 진단 업무의 산출물이 보고서입니다", "진단 보고서 1건 + 조치 확인 이력",
     ("portfolio", "interview"), "project", True),
    ("log-analysis", "보안 로그 분석 실습", "정상과 이상을 가르는 기준 세우기",
     "직무 공통 기대치 · 로그를 읽는 감각은 전 기업군 공통입니다", "공개 로그 데이터 분석 노트 + 판단 근거",
     ("portfolio", "interview"), "project", True),
    ("detection-rule", "탐지 정책 설계 기록", "무엇을 탐지하고 무엇을 버릴지",
     "탐지 정책 운영을 요구하는 기업군의 최대 변별점입니다", "탐지 규칙 초안 + 오탐 조정 기록",
     ("portfolio", "interview"), "project", False),
    ("network-lab", "네트워크 보안 실습 환경", "구간을 나누고 정책을 적용해 보기",
     "직무 공통 기대치 · 네트워크 기본기는 사실상 전제 조건입니다", "실습 구성도 + 정책 적용 전후 확인 기록",
     ("portfolio",), "project", True),
    ("secure-code-review", "시큐어 코딩 코드 검토", "취약점의 원인을 코드로 설명하기",
     "시큐어 코딩 요구가 우대에서 자격요건으로 이동 중입니다", "취약 코드와 수정 코드 비교 정리",
     ("portfolio", "interview"), "project", True),
    ("privacy-checklist", "개인정보 점검표 작성", "법령 항목을 업무 절차로 옮기기",
     "직무 공통 기대치 · 개인정보 요구는 전 기업군에 반복됩니다", "처리 흐름도 + 항목별 점검표",
     ("portfolio",), "project", True),
    ("incident-drill", "사고 대응 훈련 서사", "탐지 이후의 순서를 직접 정해 본 경험",
     "사고 대응 절차 수립을 요구하는 기업군이 있습니다", "가상 시나리오 대응 기록 + 회고 글",
     ("essay", "interview"), "story", False),
    ("security-ethics", "보안 담당자의 책임 서사", "권한을 다루는 태도",
     "직무 공통 기대치 · 보안 직무는 태도 검증 비중이 큽니다", "권한·정보 취급 원칙을 담은 서술 준비",
     ("essay",), "story", True),
    ("isms-study", "정보보호 관리체계 학습", "인증 항목과 증적의 관계",
     "규제 대응을 요구하는 기업군에서 뚜렷합니다", "인증 항목 정리 노트 + 증적 예시",
     ("interview",), "study", True),
    ("cert-study", "정보보안 기초 이론", "정보보안기사 범위 중심",
     "자격 우대 표기가 꾸준히 반복됩니다", "면접 단골 주제 중심 정리 노트",
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
    ("fintech_finance", ("규제 대응", "사고 대응 절차", "진단·보고", "장비 운영")),
    ("bigtech_platform", ("탐지 정책", "대규모 방어", "자동화", "진단·보고")),
    ("b2b_saas", ("고객사 진단", "제품 코드 검토", "보고서 품질", "규제 이해")),
    ("startup", ("단독 수행 오너십", "내부 지침 정비", "진단·보고", "개발자와의 소통")),
    ("si_enterprise", ("인증 심사 대응", "산출물·문서", "인프라 정책", "정기 진단 관리")),
    ("game", ("이상 행위 탐지", "트래픽 방어", "로그 분석", "개발 조직 협업")),
)


def cluster_concepts(cluster_id: str) -> tuple[str, ...]:
    """기업군별 추가 요구가 가리키는 체크 개념. 순서가 추가 요구 번호다."""
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
                "title": "찾은 것을 남이 읽을 수 있게 남긴 기록",
                "body": f"{label}에서도 점검을 몇 번 했는지보다 결과를 어떻게 전달했는지가 강합니다. 보고서 한 건을 끝까지 다듬으세요.",
                "tips": ["README의 보고서 절에 재현 절차·영향 범위·판단 근거 배치", "다른 사람이 절차대로 재현하고 같은 위험도를 판단하면 완료"],
                "linked_item_ids": [CONCEPT_INFO["diagnosis-report"]["concept_id"]],
            },
            {
                "title": "판단 근거를 남긴 로그 분석이 희소합니다",
                "body": "도구 화면 캡처보다 이 로그를 왜 이상하다고 봤는지를 적은 문서가 신입 포트폴리오에서 드뭅니다.",
                "tips": ["분석 노트 첫 표에 정상·이상 로그를 나란히 비교", "샘플 로그로 탐지 규칙을 다시 실행해 탐지·오탐 결과가 재현되면 완료"],
                "linked_item_ids": [
                    CONCEPT_INFO["log-analysis"]["concept_id"],
                    CONCEPT_INFO["detection-rule"]["concept_id"],
                ],
            },
        ],
        "intro_orders": orders,
    }
    essay = [
        {
            "kind": "deviation",
            "title": "도구 나열이 아니라 판단 과정으로 쓰기",
            "body": f"{label} 지원 글에서 강한 것은 도구 목록이 아니라 무엇을 위험으로 판단했고 왜 그렇게 봤는가입니다.",
            "narrative": {
                "problem": "실습 서비스에서 점검 결과가 수십 건 쏟아진 상황",
                "solve": "영향 범위와 조치 비용으로 우선순위를 정하고 근거를 문서화",
                "growth": "보안은 다 막는 일이 아니라 무엇을 먼저 막을지 정하는 일이라는 관점",
            },
            "sample_sentence": "\"모두 고칠 수 없다면 무엇을 먼저 고쳐야 하는지 설명하는 것까지가 진단이라고 배웠습니다.\"",
            "tips": ["판단 기준을 문장으로 남기세요"],
            "linked_item_ids": [CONCEPT_INFO["diagnosis-report"]["concept_id"]],
        },
        {
            "kind": "narrative_polish",
            "title": "책임 의식 — 보유 소재 다듬기",
            "body": "보안 직무는 권한을 다루는 태도를 봅니다. 사실 관계는 고정하고 원칙을 지킨 지점에 방점을 두세요.",
            "narrative": None,
            "sample_sentence": None,
            "tips": ["권한·정보 취급 원칙을 한 문장으로", "지키기 불편했던 순간을 함께"],
            "linked_item_ids": [CONCEPT_INFO["security-ethics"]["concept_id"]],
        },
    ]
    interview = [
        {
            "kicker": "판단 검증",
            "question": "점검 결과 중 무엇을 먼저 고쳐야 한다고 보고했나요?",
            "followups": ["그 우선순위의 근거는 무엇인가요?", "고치지 않기로 한 항목은 어떻게 설명했나요?"],
            "point": "영향 범위와 조치 비용을 비교한 기준, 그 우선순위를 고른 이유, 조치 뒤 남은 위험을 차례로 답하세요.",
            "linked_item_ids": [CONCEPT_INFO["diagnosis-report"]["concept_id"]],
        },
        {
            "kicker": "탐지 검증",
            "question": "이 로그를 왜 이상하다고 판단했나요?",
            "followups": ["정상 직무 공통 기대치은 어떻게 정했나요?", "오탐을 줄이려면 무엇을 바꾸겠어요?"],
            "point": "정상 직무 공통 기대치을 정한 데이터, 탐지 조건을 고른 이유, 규칙 변경 전후의 탐지·오탐 결과를 연결해 답하세요.",
            "linked_item_ids": [CONCEPT_INFO["log-analysis"]["concept_id"]],
        },
        {
            "kicker": "기본기 검증",
            "question": "이 취약점은 코드에서 왜 생기나요?",
            "followups": ["같은 원인의 다른 사례를 들 수 있나요?"],
            "point": "취약 코드와 수정 코드를 같은 위치에서 비교하고, 수정 방식을 고른 이유와 재현 테스트가 차단된 결과를 답하세요.",
            "linked_item_ids": [CONCEPT_INFO["secure-code-review"]["concept_id"]],
        },
        {
            "kicker": "태도 검증 · 자소서 연동",
            "question": "권한이 있는데 보면 안 되는 정보가 눈앞에 있다면요?",
            "followups": ["그 원칙을 지키기 어려웠던 경험이 있나요?"],
            "point": "접근을 중단할 판단 기준, 보고 경로를 고른 이유, 정보 노출 없이 상황을 종료한 결과를 구체적으로 답하세요.",
            "linked_item_ids": [CONCEPT_INFO["security-ethics"]["concept_id"]],
        },
    ]
    return {
        "job": JOB_ROLE_ID, "scope": scope, "checklist": checklist,
        "portfolio": portfolio, "essay": essay, "interview": interview,
        "agent_version": AGENT_VERSION_STRING, "source": "stored",
    }


ROADMAP_STEPS: tuple[tuple[int, str, int, str, str, str, str, str, tuple[str, ...]], ...] = (
    (1, "STEP 01 · 3주", 3, "vhigh", "점검 환경을 직접 세우고 돌려 보기",
     "취약한 실습 애플리케이션과 격리된 네트워크를 직접 구성하고 점검 항목을 따라 결과를 기록하세요.",
     "실습 환경 구성도 + 항목별 점검 결과 기록", "직무 공통 기대치 항목이 채워지지 않으면 다른 준비가 평가에 닿지 않습니다.",
     ("실습 환경", "점검 항목", "결과 기록")),
    (2, "STEP 02 · 2주", 2, "vhigh", "찾은 것을 문서로 전달하기",
     "점검 결과에 위험도와 조치 우선순위를 붙이고, 취약 코드와 수정 코드를 나란히 정리하세요.",
     "진단 보고서 1건 + 코드 비교 정리", "진단 업무의 산출물은 보고서입니다. 전달까지가 한 벌입니다.",
     ("위험도 판단", "보고서", "코드 비교")),
    (3, "STEP 03 · 2주", 2, "high", "로그를 읽고 기준을 세우기",
     "공개 로그 데이터로 정상 직무 공통 기대치을 정의하고, 이상이라고 판단한 근거를 남기세요.",
     "로그 분석 노트 + 판단 근거 + 오탐 사례", "탐지는 도구가 아니라 기준의 문제입니다.",
     ("직무 공통 기대치 정의", "이상 판단", "오탐")),
    (4, "STEP 04 · 2주", 2, "mid", "기업군에 맞춰 마무리하기",
     "지원 기업군의 추가 요구 항목을 채우고 개인정보 점검표와 소개 순서를 다시 배치하세요.",
     "추가 요구 항목 산출물 + 기업군 맞춤 소개 순서", "필수가 채워진 뒤의 마무리입니다. 순서만 바꿔도 인상이 달라집니다.",
     ("추가 요구 보강", "점검표", "소개 순서")),
)

STEP_FILLS: tuple[tuple[str, ...], ...] = (
    ("web-vuln-lab", "network-lab"),
    ("diagnosis-report", "secure-code-review"),
    ("log-analysis", "incident-drill"),
    ("privacy-checklist", "security-ethics"),
)

STUDY_TRACKS: tuple[tuple[str, str, str, str, str, str, tuple[str, ...]], ...] = (
    ("compliance-design", "STEP 01~02와 병행", "vhigh", "개인정보 보호 법령과 관리체계",
     "법령이 요구하는 항목을 점검표의 한 줄로 옮길 수 있는 수준까지. 조문 전체가 아니라 실무 절차와 이어지는 항목 중심으로.",
     "규제는 정보보안 업무의 형태를 정합니다. 면접의 꼬리질문도 절차 이해를 검증합니다.", ("isms-study",)),
    ("vuln-diagnosis", "STEP 01~03과 병행", "high", "취약점의 원인과 대응 원리",
     "각 취약점이 왜 생기고 어떤 처리로 막히는지를 남에게 설명할 수 있는 수준까지. 공격 절차가 아니라 원인과 방어 원리 중심으로.",
     "점검해 봤다와 원인을 안다를 면접이 구분합니다.", ("cert-study",)),
    ("incident-response", "상시 · 주 3~4시간", "high", "네트워크·운영체제 기본기",
     "패킷이 오가는 흐름, 프로세스와 권한, 로그가 남는 자리까지. 과목 전체가 아니라 면접 단골 주제 중심으로.",
     "탐지와 대응 해석의 이론 바탕입니다. 전 기간에 얇게 깔리는 것이 효율적입니다.", ("detection-rule",)),
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


# ============================================================ 7. Wiki 본문
WIKI: dict[str, dict[str, Any]] = {
    "vuln-diagnosis": {
        "why": "최근 공고 전량이 취약점 점검을 요구하고 다수가 자격요건에 둡니다. 이 역량이 없으면 다른 준비가 평가에 닿지 않습니다.",
        "depth": {"foundation": "점검 항목의 의미를 안다",
                  "application": "절차에 따라 점검하고 결과를 보고서로 남긴다",
                  "tradeoff": "위험도와 조치 비용을 견줘 우선순위를 정한다"},
        "prereq": ["웹 요청과 응답의 흐름 이해", "취약점의 원인을 코드로 설명하기"],
        "misconceptions": ["도구가 찾아주면 진단이 끝났다는 생각", "전부 고쳐야 한다는 생각"],
        "interview": ["무엇을 먼저 고쳐야 하나", "고치지 않기로 한 항목은 어떻게 설명했나"],
        "sequence": ["실습 환경 구성", "항목별 점검", "원인 정리", "보고서 작성"],
    },
    "incident-response": {
        "why": "보안관제와 네트워크 요구가 전 기업군에 반복되며, 탐지 이후의 절차를 묻는 문장이 늘고 있습니다.",
        "depth": {"foundation": "로그에서 이상 징후를 찾아낸다",
                  "application": "정해진 절차에 따라 대응하고 기록한다",
                  "tradeoff": "탐지 범위와 오탐 비용을 견줘 정책을 고른다"},
        "prereq": ["네트워크 기본 동작", "운영체제 로그가 남는 자리"],
        "misconceptions": ["경보가 많을수록 안전하다는 생각", "차단하면 대응이 끝났다는 생각"],
        "interview": ["정상 직무 공통 기대치은 어떻게 정했나", "오탐을 줄이려면 무엇을 바꾸겠나"],
        "sequence": ["로그 수집", "직무 공통 기대치 정의", "탐지 규칙 초안", "대응 절차 정리"],
    },
    "compliance-design": {
        "why": "개인정보 보호 법령과 관리체계 요구가 기업군과 무관하게 반복되며, 금융·SI 에서는 자격요건으로 올라옵니다.",
        "depth": {"foundation": "법령이 요구하는 항목을 안다",
                  "application": "요구사항을 업무 절차와 점검표로 옮긴다",
                  "tradeoff": "규제 준수 비용과 서비스 편의를 견줘 절차를 고른다"},
        "prereq": ["개인정보 처리 흐름 파악", "문서로 남기는 습관"],
        "misconceptions": ["조문을 외우면 된다는 생각", "규제는 법무 부서의 일이라는 생각"],
        "interview": ["이 항목의 증적은 무엇인가", "절차를 어떻게 검증했나"],
        "sequence": ["처리 흐름도", "항목 정리", "점검표 작성", "증적 확인"],
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

    # dataset_versions 는 A1(backend) 만 만든다.

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

    role_node = node("semantic", "JobRole", "job_roles", JOB_ROLE_ID, "정보보안")
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
            f"{DIM_INFO[slug]['label']} 은 최근 1년 정보보안 공고의 {freq_pct(slug, RECENT)}% 에 나타난다.",
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

    for _item_id, slug, title, _desc in BASELINE_ITEMS[:3]:
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

    for slug in ("web-vuln-lab", "log-analysis"):
        info = CONCEPT_INFO[slug]
        claim_id = add_claim(
            strat_outputs["overall"], "strategy", None, "overall", JOB_ROLE_ID,
            f"{info['title']} 은 정보보안 지원 준비에서 우선순위가 높다.",
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
            "web-vuln-assessment" if scope_level == "overall"
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
        "dataset_version": frozenset({DATASET_VERSION}),
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
        if row["output_type"] == "interpretation":
            for key in ("level", "cluster_tag", "posting_id"):
                if key not in payload["scope"]:
                    problems.append(f"{row['output_id']}: scope.{key} 없음")
            if not 7 <= len(payload["baseline"]) <= 9:
                problems.append(f"{row['output_id']}: baseline 개수 {len(payload['baseline'])}")
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
    """6. 30건의 기간·기업군·진입 구분·상태와 차원 표본을 확인한다."""
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
        "co_estsecurity": "b2b_saas", "co_kakaobank": "fintech_finance",
        "co_naver": "bigtech_platform", "co_samsungsds": "si_enterprise",
        "co_ncsoft": "game", "co_wantedlab": "startup", "co_coupang": "bigtech_platform",
        "co_viva": "fintech_finance", "co_skcnc": "si_enterprise",
        "co_kakao": "bigtech_platform", "co_upstage": "startup",
        "co_navercloud": "b2b_saas", "co_kbank": "fintech_finance",
        "co_lgcns": "si_enterprise", "co_krafton": "game",
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
        problems.append("security 모듈이 dataset_versions 행을 만들었다")
    if len(tables["sources"]) != 30 or len(tables["source_snapshots"]) != 30:
        problems.append("공고별 출처·스냅샷이 30행이 아니다")
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
