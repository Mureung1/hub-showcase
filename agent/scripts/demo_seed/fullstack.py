"""풀스택 개발자 직무의 생성 데이터 조각 (A5).

CONTRACT.md 의 식별자·컬럼·payload 규약을 따른다.
데이터베이스에 접속하지 않는다. 메모리에서 계산하고 CSV 로만 낸다.

실행: ``cd agent && python -m scripts.demo_seed.fullstack``
"""

from __future__ import annotations

import json
import math
from typing import Any

from ._csv import demo_seed_root, sha256_hex, write_part

JOB_ROLE_ID = "fullstack"
DATASET_VERSION = "ds_demo_v1"
TAXONOMY_ID = f"taxonomy_{JOB_ROLE_ID}"
TAXONOMY_VERSION_ID = f"tx_demo_{JOB_ROLE_ID}"
KNOWLEDGE_VERSION = f"kn_demo_{JOB_ROLE_ID}"
ANALYSIS_VERSION = f"an_demo_{JOB_ROLE_ID}"
POLICY_VERSION = "tp_v1"
ONTOLOGY_VERSION = "v1"
GENERATED_AT = "2026-07-01T09:00:00+09:00"
AGENT_VERSION = "1.0.0"

# 기간 축은 달력 연도다. `0010_calendar_year_periods.sql` 의 `periods` 두 행과 이름이 같아야
# `statistics_facts.period_id` 외래키가 성립한다.
RECENT_PERIOD = "y2026"
PREV_PERIOD = "y2024_2025"

# 기업군 표시명. company_clusters 는 마이그레이션이 넣으므로 여기서는 라벨만 참조한다.
CLUSTER_DISPLAY: dict[str, str] = {
    "bigtech_platform": "빅테크·플랫폼",
    "startup": "스타트업",
    "b2b_saas": "B2B SaaS",
    "fintech_finance": "핀테크·금융",
    "si_enterprise": "SI·대기업",
    "game": "게임사",
}

COMPANY_DISPLAY: dict[str, str] = {
    "co_wantedlab": "원티드랩",
    "co_musinsa": "무신사",
    "co_channelcorp": "주식회사 채널코퍼레이션",
    "co_kakaobank": "카카오뱅크",
    "co_samsungsds": "삼성에스디에스",
    "co_smilegate": "스마일게이트",
    "co_daangn": "주식회사 당근마켓",
    "co_navercloud": "네이버클라우드",
    "co_kakaomobility": "카카오모빌리티",
}

# 스냅샷 출처 계층 A 의 허용 용도. CONTRACT 10.5 의 예시값(baseline·evidence)은
# 0001_initial_schema.sql 의 allowed_uses_known CHECK 가 허용하지 않아 적재가 실패한다.
# backend.py(A1) 와 같은 값을 쓴다.
ALLOWED_USES = (
    "statistics",
    "interpretation_context",
    "strategy",
    "roadmap",
)

# ---------------------------------------------------------------- 요구 차원 5종

DIMENSIONS: list[dict[str, Any]] = [
    {
        "key": "node_ts",
        "slug": "node-typescript",
        "kind": "technology",
        "label": "Node.js·TypeScript 서버 구현",
        "internal": "server_runtime_node_typescript",
        "definition": "Node.js 런타임과 TypeScript로 서버 로직을 작성하고 타입으로 계약을 지키는 능력.",
        "aliases": ["Node.js", "TypeScript", "NestJS", "Express"],
    },
    {
        "key": "react_ui",
        "slug": "react-ui",
        "kind": "technology",
        "label": "React 화면 구현",
        "internal": "client_ui_react",
        "definition": "React로 화면을 구성하고 상태와 데이터 흐름을 다루는 능력.",
        "aliases": ["React", "Next.js", "프론트엔드 화면", "컴포넌트"],
    },
    {
        "key": "rest_api",
        "slug": "rest-api",
        "kind": "practice",
        "label": "REST API 설계·연동",
        "internal": "api_contract_rest",
        "definition": "자원과 응답 형태를 정하고 화면과 서버가 같은 계약을 쓰도록 만드는 능력.",
        "aliases": ["REST API", "API 설계", "OpenAPI", "엔드포인트"],
    },
    {
        "key": "rdb",
        "slug": "rdb-modeling",
        "kind": "technology",
        "label": "관계형 데이터베이스 모델링",
        "internal": "data_store_rdb",
        "definition": "테이블과 관계를 설계하고 쿼리·인덱스를 다루는 능력.",
        "aliases": ["PostgreSQL", "MySQL", "RDB", "ORM"],
    },
    {
        "key": "cloud",
        "slug": "cloud-deploy",
        "kind": "practice",
        "label": "클라우드 배포·운영",
        "internal": "delivery_cloud_deploy",
        "definition": "컨테이너와 파이프라인으로 배포하고 배포 뒤의 상태를 확인하는 능력.",
        "aliases": ["AWS", "Docker", "CI/CD", "배포 파이프라인"],
    },
]
DIM_BY_KEY = {d["key"]: d for d in DIMENSIONS}
DIM_ID = {d["key"]: f"dim_{JOB_ROLE_ID}_{d['slug']}" for d in DIMENSIONS}

# ---------------------------------------------------------------- 역량 3종

CAPABILITIES: list[dict[str, Any]] = [
    {
        "key": "feature_delivery",
        "slug": "feature-delivery",
        "label": "기능 하나를 화면부터 서버까지 완성하기",
        "definition": "화면·서버·데이터를 하나의 기능으로 잇고 동작하는 상태로 만드는 능력.",
        "dims": ["react_ui", "node_ts"],
    },
    {
        "key": "contract_design",
        "slug": "contract-design",
        "label": "화면과 서버 사이 데이터 계약 설계하기",
        "definition": "요청·응답 형태와 저장 구조를 정하고 양쪽이 어긋나지 않게 유지하는 능력.",
        "dims": ["rest_api", "rdb"],
    },
    {
        "key": "ship_operate",
        "slug": "ship-operate",
        "label": "배포하고 운영 상태를 확인하기",
        "definition": "직접 배포하고 로그·지표로 동작을 확인해 문제를 되돌리는 능력.",
        "dims": ["cloud"],
    },
]
CAP_ID = {c["key"]: f"cap_{JOB_ROLE_ID}_{c['slug']}" for c in CAPABILITIES}

SECTION_REQUIREDNESS = {
    "주요업무": "responsibility",
    "자격요건": "required",
    "우대사항": "preferred",
}

# ---------------------------------------------------------------- 공고 30건
# 한 줄이 곧 요구 표현이다. (본문, 차원 키, 깊이) 로 적고 근거 위치는 실제로 계산한다.
# 절 이름이 진술된 요구도(stated_requiredness)를 정한다.

POSTINGS: list[dict[str, Any]] = [
    {
        "nn": "01",
        "company": "co_wantedlab",
        "cluster": "startup",
        "period": RECENT_PERIOD,
        "title": "풀스택 개발자 (신입·주니어)",
        "posted_at": "2026-02-10",
        "closed_at": "2026-03-31",
        "entry_label": "entry_junior",
        "career_raw": "신입·주니어",
        "edu_raw": "학력 무관",
        "entry_raw": "신입 지원 가능",
        "edu_label": "학력 무관",
        "career_label": "신입·주니어",
        "out_of_role_tags": ["infra_deploy", "plan_support"],
        "reality_tags": ["solo_e2e", "deployed_service"],
        "axis_mentions": ["e2e_delivery", "product_speed", "deploy_ops"],
        "advanced": [("arch_owner", "기능 하나의 설계와 배포까지 스스로 결정하고 책임집니다.")],
        "sections": {
            "주요업무": [
                ("채용 서비스의 신규 기능을 화면부터 서버까지 한 사람이 맡아 개발합니다.", None, None),
                ("기능 하나의 설계와 배포까지 스스로 결정하고 책임집니다.", None, None),
                ("사용자 반응을 확인하고 다음 주에 바로 고치는 주기로 일합니다.", None, None),
            ],
            "자격요건": [
                ("Node.js와 TypeScript로 서버 로직을 작성해 본 경험이 있으신 분", "node_ts", "application"),
                ("React로 화면을 만들고 상태 관리를 다뤄 보신 분", "react_ui", "application"),
                ("REST API를 설계하고 화면과 연동해 보신 분", "rest_api", "application"),
                ("PostgreSQL로 테이블을 설계하고 쿼리를 작성해 보신 분", "rdb", "foundation"),
            ],
            "우대사항": [
                ("AWS에 직접 배포하고 운영해 보신 분", "cloud", "application"),
                ("작은 팀에서 제품을 빠르게 만들어 본 경험이 있으신 분", None, None),
            ],
        },
    },
    {
        "nn": "02",
        "company": "co_musinsa",
        "cluster": "bigtech_platform",
        "period": RECENT_PERIOD,
        "title": "커머스 플랫폼 풀스택 개발자",
        "posted_at": "2026-01-20",
        "closed_at": None,
        "entry_label": "experienced",
        "career_raw": "경력 3년 이상",
        "edu_raw": "대졸 이상",
        "entry_raw": "경력직 채용",
        "edu_label": "대졸 이상",
        "career_label": "경력 3년 이상",
        "out_of_role_tags": ["data_ops", "qa_test"],
        "reality_tags": ["deployed_service", "collab_api"],
        "axis_mentions": ["e2e_delivery", "api_contract", "deploy_ops"],
        "advanced": [("scale_traffic", "월 수천만 건 요청을 처리하는 커머스 서비스의 응답 속도를 함께 개선합니다.")],
        "sections": {
            "주요업무": [
                ("월 수천만 건 요청을 처리하는 커머스 서비스의 응답 속도를 함께 개선합니다.", None, None),
                ("상품 노출 화면과 백오피스 API를 함께 개발합니다.", None, None),
                ("배포 파이프라인과 지표 대시보드를 팀과 함께 관리합니다.", None, None),
            ],
            "자격요건": [
                ("TypeScript 기반 Node.js 서버 개발 경험이 있으신 분", "node_ts", "application"),
                ("React로 사용자 트래픽이 있는 화면을 운영해 보신 분", "react_ui", "tradeoff"),
                ("REST API의 응답 구조를 팀과 합의해 정해 보신 분", "rest_api", "tradeoff"),
                ("Docker와 CI/CD로 배포 과정을 자동화해 보신 분", "cloud", "application"),
            ],
            "우대사항": [
                ("캐시나 쿼리 개선으로 응답 시간을 줄여 보신 분", None, None),
                ("지표를 보고 개선 순서를 정해 보신 분", None, None),
            ],
        },
    },
    {
        "nn": "03",
        "company": "co_channelcorp",
        "cluster": "b2b_saas",
        "period": RECENT_PERIOD,
        "title": "프로덕트 풀스택 개발자 (주니어)",
        "posted_at": "2026-04-14",
        "closed_at": "2026-05-31",
        "entry_label": "entry_junior",
        "career_raw": "신입·주니어",
        "edu_raw": "학력 무관",
        "entry_raw": "신입·주니어 환영",
        "edu_label": "학력 무관",
        "career_label": "신입·주니어",
        "out_of_role_tags": ["qa_test", "design_system"],
        "reality_tags": ["collab_api"],
        "axis_mentions": ["api_contract", "data_modeling", "e2e_delivery"],
        "advanced": [],
        "sections": {
            "주요업무": [
                ("고객사 상담 도구의 화면과 서버 기능을 함께 개발합니다.", None, None),
                ("여러 고객사 환경에서 같은 기능이 안정적으로 동작하도록 만듭니다.", None, None),
                ("기능 변경 사항을 문서로 남겨 고객 지원 팀과 공유합니다.", None, None),
            ],
            "자격요건": [
                ("Node.js와 TypeScript로 서비스 코드를 작성할 수 있으신 분", "node_ts", "application"),
                ("React 컴포넌트로 화면을 구성해 보신 분", "react_ui", "foundation"),
                ("Docker로 서비스를 빌드하고 배포해 보신 분", "cloud", "application"),
            ],
            "우대사항": [
                ("REST API 문서를 작성하고 외부 연동을 도와 보신 분", "rest_api", "application"),
                ("테스트 코드를 작성하는 습관이 있으신 분", None, None),
            ],
        },
    },
    {
        "nn": "04",
        "company": "co_kakaobank",
        "cluster": "fintech_finance",
        "period": RECENT_PERIOD,
        "title": "뱅킹 서비스 풀스택 개발자 (신입)",
        "posted_at": "2026-03-11",
        "closed_at": None,
        "entry_label": "entry_junior",
        "career_raw": "신입",
        "edu_raw": "대졸 이상",
        "entry_raw": "신입 지원 가능",
        "edu_label": "대졸 이상",
        "career_label": "신입·주니어",
        "out_of_role_tags": [],
        "reality_tags": ["deployed_service", "collab_api"],
        "axis_mentions": ["api_contract", "data_modeling", "e2e_delivery"],
        "advanced": [("realtime", "실시간으로 바뀌는 잔액 화면과 서버 데이터의 정합성을 맞춥니다.")],
        "sections": {
            "주요업무": [
                ("고객 자산 조회 화면과 조회 API를 함께 개발합니다.", None, None),
                ("실시간으로 바뀌는 잔액 화면과 서버 데이터의 정합성을 맞춥니다.", None, None),
                ("금융 규정에 맞는 기록과 검증 절차를 코드로 남깁니다.", None, None),
            ],
            "자격요건": [
                ("TypeScript로 Node.js 서버 기능을 구현해 보신 분", "node_ts", "application"),
                ("React로 조회·입력 화면을 만들어 보신 분", "react_ui", "application"),
                ("REST API의 오류 응답과 재시도 규칙을 정해 보신 분", "rest_api", "tradeoff"),
                ("관계형 데이터베이스에서 트랜잭션을 다뤄 보신 분", "rdb", "tradeoff"),
            ],
            "우대사항": [
                ("인증·인가 흐름을 구현해 보신 분", None, None),
                ("정산·결제 도메인 경험이 있으신 분", None, None),
            ],
        },
    },
    {
        "nn": "05",
        "company": "co_samsungsds",
        "cluster": "si_enterprise",
        "period": RECENT_PERIOD,
        "title": "사내 시스템 풀스택 개발자",
        "posted_at": "2026-05-08",
        "closed_at": None,
        "entry_label": "experienced",
        "career_raw": "경력 3년 이상",
        "edu_raw": "대졸 이상",
        "entry_raw": "경력직 채용",
        "edu_label": "대졸 이상",
        "career_label": "경력 3년 이상",
        "out_of_role_tags": ["plan_support", "design_system"],
        "reality_tags": ["collab_api"],
        "axis_mentions": ["e2e_delivery", "data_modeling", "deploy_ops"],
        "advanced": [("arch_owner", "여러 팀이 함께 쓰는 시스템의 구조를 정리하고 문서로 남깁니다.")],
        "sections": {
            "주요업무": [
                ("사내 업무 시스템의 React 화면을 개편하고 유지합니다.", "react_ui", "application"),
                ("업무 데이터를 담는 관계형 데이터베이스 스키마를 정리합니다.", "rdb", "application"),
                ("여러 팀이 함께 쓰는 시스템의 구조를 정리하고 문서로 남깁니다.", None, None),
            ],
            "자격요건": [
                ("Node.js 기반 서버 개발 경험이 있으신 분", "node_ts", "application"),
                ("클라우드 환경에 애플리케이션을 배포해 보신 분", "cloud", "application"),
            ],
            "우대사항": [
                ("요구사항 정의서와 산출물 문서를 작성해 보신 분", None, None),
                ("대규모 조직의 개발 표준을 따라 일해 보신 분", None, None),
            ],
        },
    },
    {
        "nn": "06",
        "company": "co_smilegate",
        "cluster": "game",
        "period": RECENT_PERIOD,
        "title": "게임 운영 도구 풀스택 개발자",
        "posted_at": "2026-06-02",
        "closed_at": "2026-06-30",
        "entry_label": "experienced",
        "career_raw": "경력 2년 이상",
        "edu_raw": "학력 무관",
        "entry_raw": "경력직 채용",
        "edu_label": "학력 무관",
        "career_label": "경력 2년 이상",
        "out_of_role_tags": ["data_ops"],
        "reality_tags": ["collab_api", "deployed_service"],
        "axis_mentions": ["e2e_delivery", "data_modeling"],
        "advanced": [],
        "sections": {
            "주요업무": [
                ("게임 운영 도구의 화면과 서버를 함께 개발합니다.", None, None),
                ("운영자가 실시간으로 상태를 확인할 수 있는 화면을 만듭니다.", None, None),
            ],
            "자격요건": [
                ("Node.js와 TypeScript로 서버를 개발해 보신 분", "node_ts", "application"),
                ("React로 운영 도구 화면을 만들어 보신 분", "react_ui", "application"),
                ("REST API를 설계해 게임 서버와 연동해 보신 분", "rest_api", "application"),
                ("관계형 데이터베이스로 운영 데이터를 관리해 보신 분", "rdb", "foundation"),
            ],
            "우대사항": [
                ("배포 자동화를 구성해 보신 분", "cloud", "application"),
            ],
        },
    },
    {
        "nn": "07",
        "company": "co_daangn",
        "cluster": "startup",
        "period": RECENT_PERIOD,
        "title": "광고 도구 풀스택 개발자 (주니어)",
        "posted_at": "2026-01-15",
        "closed_at": "2026-03-01",
        "entry_label": "entry_junior",
        "career_raw": "신입·주니어",
        "edu_raw": "학력 무관",
        "entry_raw": "신입 지원 가능",
        "edu_label": "학력 무관",
        "career_label": "신입·주니어",
        "out_of_role_tags": ["plan_support"],
        "reality_tags": ["solo_e2e"],
        "axis_mentions": ["product_speed", "e2e_delivery"],
        "advanced": [],
        "sections": {
            "주요업무": [
                ("지역 광고 도구의 React 화면을 만들고 개선합니다.", "react_ui", "application"),
                ("작은 단위로 나눠 매주 배포하는 방식으로 일합니다.", None, None),
            ],
            "자격요건": [
                ("Node.js로 서버 기능을 구현해 보신 분", "node_ts", "foundation"),
                ("관계형 데이터베이스에 데이터를 설계해 저장해 보신 분", "rdb", "foundation"),
            ],
            "우대사항": [
                ("제품 지표를 보고 스스로 개선 과제를 정해 보신 분", None, None),
            ],
        },
    },
    {
        "nn": "08",
        "company": "co_navercloud",
        "cluster": "b2b_saas",
        "period": RECENT_PERIOD,
        "title": "클라우드 콘솔 풀스택 개발자",
        "posted_at": "2026-03-04",
        "closed_at": "2026-04-30",
        "entry_label": "entry_junior",
        "career_raw": "신입·주니어",
        "edu_raw": "대졸 이상",
        "entry_raw": "신입 지원 가능",
        "edu_label": "대졸 이상",
        "career_label": "신입·주니어",
        "out_of_role_tags": ["qa_test"],
        "reality_tags": ["collab_api"],
        "axis_mentions": ["api_contract", "data_modeling"],
        "advanced": [],
        "sections": {
            "주요업무": [
                ("콘솔 화면에서 다루는 데이터 구조를 정리하고 저장 방식을 정합니다.", "rdb", "application"),
                ("클라우드 상품 콘솔의 화면과 API를 함께 개발합니다.", None, None),
            ],
            "자격요건": [
                ("TypeScript와 Node.js로 서버 코드를 작성해 보신 분", "node_ts", "application"),
                ("React로 관리 콘솔 화면을 구현해 보신 분", "react_ui", "application"),
            ],
            "우대사항": [
                ("컨테이너 환경에서 서비스를 배포해 보신 분", "cloud", "application"),
            ],
        },
    },
    {
        "nn": "09",
        "company": "co_kakaomobility",
        "cluster": "bigtech_platform",
        "period": RECENT_PERIOD,
        "title": "모빌리티 내부 도구 풀스택 개발자",
        "posted_at": "2026-05-20",
        "closed_at": "2026-06-30",
        "entry_label": "experienced",
        "career_raw": "경력 3년 이상",
        "edu_raw": "대졸 이상",
        "entry_raw": "경력직 채용",
        "edu_label": "대졸 이상",
        "career_label": "경력 3년 이상",
        "out_of_role_tags": ["data_ops", "qa_test"],
        "reality_tags": ["collab_api", "deployed_service"],
        "axis_mentions": ["api_contract", "e2e_delivery", "deploy_ops"],
        "advanced": [],
        "sections": {
            "주요업무": [
                ("이동 서비스의 운영 화면과 내부 API를 함께 개발합니다.", None, None),
                ("여러 팀이 쓰는 내부 도구의 데이터 흐름을 정리합니다.", None, None),
            ],
            "자격요건": [
                ("Node.js 기반 서버 개발 경험이 있으신 분", "node_ts", "application"),
                ("React로 내부 운영 화면을 만들어 보신 분", "react_ui", "application"),
                ("관계형 데이터베이스 설계와 쿼리 최적화 경험이 있으신 분", "rdb", "tradeoff"),
            ],
            "우대사항": [
                ("REST API 스펙을 문서로 관리해 보신 분", "rest_api", "application"),
                ("배포 파이프라인을 손봐 보신 분", "cloud", "application"),
            ],
        },
    },
    {
        "nn": "10",
        "company": "co_wantedlab",
        "cluster": "startup",
        "period": PREV_PERIOD,
        "title": "채용 제품 풀스택 개발자",
        "posted_at": "2024-03-18",
        "closed_at": "2024-05-10",
        "entry_label": "entry_junior",
        "career_raw": "신입·주니어",
        "edu_raw": "학력 무관",
        "entry_raw": "신입 지원 가능",
        "edu_label": "학력 무관",
        "career_label": "신입·주니어",
        "out_of_role_tags": ["plan_support"],
        "reality_tags": ["solo_e2e"],
        "axis_mentions": ["product_speed", "e2e_delivery"],
        "advanced": [],
        "sections": {
            "주요업무": [
                ("채용 담당자용 화면과 서버 기능을 한 흐름으로 개발합니다.", None, None),
                ("사용자 의견을 정리해 작은 기능 단위로 빠르게 배포합니다.", None, None),
            ],
            "자격요건": [
                ("Node.js와 TypeScript로 웹 서버를 구현해 보신 분", "node_ts", "application"),
                ("React로 사용자 화면을 만들어 보신 분", "react_ui", "application"),
                ("REST API를 화면과 연결해 보신 분", "rest_api", "foundation"),
            ],
            "우대사항": [
                ("관계형 데이터베이스에 서비스 데이터를 설계해 보신 분", "rdb", "foundation"),
            ],
        },
    },
    {
        "nn": "11",
        "company": "co_musinsa",
        "cluster": "bigtech_platform",
        "period": PREV_PERIOD,
        "title": "커머스 운영 플랫폼 풀스택 개발자",
        "posted_at": "2024-07-08",
        "closed_at": "2024-09-06",
        "entry_label": "experienced",
        "career_raw": "경력 3년 이상",
        "edu_raw": "대졸 이상",
        "entry_raw": "경력직 채용",
        "edu_label": "대졸 이상",
        "career_label": "경력 3년 이상",
        "out_of_role_tags": ["data_ops", "qa_test"],
        "reality_tags": ["deployed_service", "collab_api"],
        "axis_mentions": ["e2e_delivery", "api_contract", "deploy_ops"],
        "advanced": [("scale_traffic", "대규모 상품 조회 트래픽의 병목을 찾아 화면과 서버를 함께 개선합니다.")],
        "sections": {
            "주요업무": [
                ("대규모 상품 조회 트래픽의 병목을 찾아 화면과 서버를 함께 개선합니다.", None, None),
                ("운영 지표를 확인하고 장애가 반복되는 구간을 보완합니다.", None, None),
            ],
            "자격요건": [
                ("TypeScript 기반 Node.js 서비스 운영 경험이 있으신 분", "node_ts", "application"),
                ("React 화면의 성능을 측정하고 개선해 보신 분", "react_ui", "tradeoff"),
                ("REST API 계약을 여러 팀과 관리해 보신 분", "rest_api", "tradeoff"),
                ("Docker와 CI/CD로 배포 절차를 운영해 보신 분", "cloud", "application"),
            ],
            "우대사항": [
                ("관계형 데이터베이스 쿼리를 최적화해 보신 분", "rdb", "application"),
            ],
        },
    },
    {
        "nn": "12",
        "company": "co_channelcorp",
        "cluster": "b2b_saas",
        "period": PREV_PERIOD,
        "title": "고객 지원 SaaS 풀스택 개발자",
        "posted_at": "2024-11-12",
        "closed_at": "2025-01-10",
        "entry_label": "entry_junior",
        "career_raw": "신입·주니어",
        "edu_raw": "학력 무관",
        "entry_raw": "신입 지원 가능",
        "edu_label": "학력 무관",
        "career_label": "신입·주니어",
        "out_of_role_tags": ["qa_test"],
        "reality_tags": ["collab_api"],
        "axis_mentions": ["api_contract", "data_modeling", "e2e_delivery"],
        "advanced": [],
        "sections": {
            "주요업무": [
                ("고객 지원 기능의 React 화면과 Node.js 서버를 함께 개발합니다.", None, None),
                ("고객사별 설정 차이를 데이터 구조와 테스트로 관리합니다.", None, None),
            ],
            "자격요건": [
                ("Node.js와 TypeScript로 서비스 기능을 작성해 보신 분", "node_ts", "application"),
                ("React 컴포넌트를 재사용 가능한 구조로 만들어 보신 분", "react_ui", "application"),
                ("관계형 데이터베이스의 테이블 관계를 설계해 보신 분", "rdb", "application"),
            ],
            "우대사항": [
                ("REST API 문서를 기준으로 외부 시스템과 연동해 보신 분", "rest_api", "application"),
                ("컨테이너로 개발 환경과 배포 환경을 맞춰 보신 분", "cloud", "foundation"),
            ],
        },
    },
    {
        "nn": "13",
        "company": "co_kakaobank",
        "cluster": "fintech_finance",
        "period": PREV_PERIOD,
        "title": "금융 관리 서비스 풀스택 개발자",
        "posted_at": "2025-03-17",
        "closed_at": "2025-05-09",
        "entry_label": "experienced",
        "career_raw": "경력 3년 이상",
        "edu_raw": "대졸 이상",
        "entry_raw": "경력직 채용",
        "edu_label": "대졸 이상",
        "career_label": "경력 3년 이상",
        "out_of_role_tags": [],
        "reality_tags": ["deployed_service", "collab_api"],
        "axis_mentions": ["api_contract", "data_modeling", "e2e_delivery"],
        "advanced": [("realtime", "거래 상태가 바뀔 때 화면과 원장의 데이터 정합성을 검증합니다.")],
        "sections": {
            "주요업무": [
                ("거래 상태가 바뀔 때 화면과 원장의 데이터 정합성을 검증합니다.", None, None),
                ("감사 기록이 남는 금융 관리 화면과 API를 개발합니다.", None, None),
            ],
            "자격요건": [
                ("TypeScript와 Node.js로 트랜잭션 서비스를 개발해 보신 분", "node_ts", "application"),
                ("React로 복잡한 조회와 입력 화면을 운영해 보신 분", "react_ui", "application"),
                ("REST API의 인증과 오류 처리 규칙을 설계해 보신 분", "rest_api", "tradeoff"),
                ("관계형 데이터베이스 트랜잭션을 설계해 보신 분", "rdb", "tradeoff"),
            ],
            "우대사항": [
                ("클라우드 환경에 금융 서비스를 배포해 보신 분", "cloud", "application"),
            ],
        },
    },
    {
        "nn": "14",
        "company": "co_samsungsds",
        "cluster": "si_enterprise",
        "period": PREV_PERIOD,
        "title": "기업 업무 시스템 풀스택 개발자",
        "posted_at": "2025-07-07",
        "closed_at": "2025-08-29",
        "entry_label": "entry_junior",
        "career_raw": "신입·주니어",
        "edu_raw": "대졸 이상",
        "entry_raw": "신입 지원 가능",
        "edu_label": "대졸 이상",
        "career_label": "신입·주니어",
        "out_of_role_tags": ["plan_support", "design_system"],
        "reality_tags": ["collab_api"],
        "axis_mentions": ["e2e_delivery", "data_modeling", "deploy_ops"],
        "advanced": [],
        "sections": {
            "주요업무": [
                ("기업 고객의 업무 절차를 React 화면과 서버 기능으로 구현합니다.", None, None),
                ("요구사항과 데이터 변경 내역을 문서로 정리합니다.", None, None),
            ],
            "자격요건": [
                ("Node.js 기반 웹 서버를 구현해 보신 분", "node_ts", "foundation"),
                ("React로 업무용 화면을 구성해 보신 분", "react_ui", "foundation"),
                ("관계형 데이터베이스 스키마를 작성해 보신 분", "rdb", "foundation"),
            ],
            "우대사항": [
                ("클라우드 환경에 웹 애플리케이션을 배포해 보신 분", "cloud", "application"),
            ],
        },
    },
    {
        "nn": "15",
        "company": "co_smilegate",
        "cluster": "game",
        "period": PREV_PERIOD,
        "title": "게임 라이브 운영 풀스택 개발자",
        "posted_at": "2025-11-03",
        "closed_at": "2025-11-30",
        "entry_label": "experienced",
        "career_raw": "경력 2년 이상",
        "edu_raw": "학력 무관",
        "entry_raw": "경력직 채용",
        "edu_label": "학력 무관",
        "career_label": "경력 2년 이상",
        "out_of_role_tags": ["data_ops"],
        "reality_tags": ["deployed_service", "collab_api"],
        "axis_mentions": ["e2e_delivery", "data_modeling", "deploy_ops"],
        "advanced": [],
        "sections": {
            "주요업무": [
                ("게임 운영자가 쓰는 이벤트 화면과 관리 API를 함께 개발합니다.", None, None),
                ("라이브 서비스 지표와 배포 상태를 확인해 장애에 대응합니다.", None, None),
            ],
            "자격요건": [
                ("Node.js와 TypeScript로 운영 서버를 개발해 보신 분", "node_ts", "application"),
                ("React로 실시간 운영 화면을 만들어 보신 분", "react_ui", "application"),
                ("REST API로 게임 서버와 운영 도구를 연동해 보신 분", "rest_api", "application"),
                ("관계형 데이터베이스로 이벤트 데이터를 관리해 보신 분", "rdb", "application"),
            ],
            "우대사항": [
                ("CI/CD로 라이브 운영 도구를 배포해 보신 분", "cloud", "application"),
            ],
        },
    },
]


def _additional_posting(
    nn: str,
    company: str,
    cluster: str,
    period: str,
    title: str,
    product: str,
    posted_at: str,
    closed_at: str | None,
    entry_label: str,
) -> dict[str, Any]:
    """기존 01~15를 건드리지 않고 16~30 공고를 같은 계약 형태로 만든다."""
    junior = entry_label == "entry_junior"
    depth = "application" if junior else "tradeoff"
    return {
        "nn": nn,
        "company": company,
        "cluster": cluster,
        "period": period,
        "title": title,
        "posted_at": posted_at,
        "closed_at": closed_at,
        "entry_label": entry_label,
        "career_raw": "신입·주니어" if junior else "경력 3년 이상",
        "edu_raw": "학력 무관" if junior else "대졸 이상",
        "entry_raw": "신입 지원 가능" if junior else "경력직 채용",
        "edu_label": "학력 무관" if junior else "대졸 이상",
        "career_label": "신입·주니어" if junior else "경력 3년 이상",
        "out_of_role_tags": ["plan_support"] if junior else ["data_ops", "qa_test"],
        "reality_tags": ["collab_api", "deployed_service"],
        "axis_mentions": ["e2e_delivery", "api_contract", "data_modeling", "deploy_ops"],
        "advanced": [] if junior else [
            ("arch_owner", f"{product}의 화면·API·데이터 구조를 함께 검토하고 개선 방향을 정합니다.")
        ],
        "sections": {
            "주요업무": [
                (f"{product}의 사용자 화면과 서버 기능을 한 흐름으로 개발합니다.", None, None),
                (f"{product}의 배포 결과와 운영 지표를 확인해 반복되는 문제를 개선합니다.", None, None),
            ],
            "자격요건": [
                (f"Node.js와 TypeScript로 {product} 서버 로직을 구현해 보신 분", "node_ts", depth),
                (f"React로 {product} 화면과 상태 흐름을 구성해 보신 분", "react_ui", depth),
                (f"REST API 계약을 정하고 {product} 화면과 연동해 보신 분", "rest_api", depth),
                (f"관계형 데이터베이스로 {product} 데이터를 모델링해 보신 분", "rdb", depth),
            ],
            "우대사항": [
                (f"Docker와 CI/CD로 {product}를 클라우드에 배포해 보신 분", "cloud", "application"),
            ],
        },
    }


POSTINGS.extend(
    [
        _additional_posting("16", "co_daangn", "startup", RECENT_PERIOD,
                            "지역 서비스 풀스택 개발자 (주니어)", "지역 커뮤니티 기능",
                            "2026-02-03", None, "entry_junior"),
        _additional_posting("17", "co_kakaomobility", "bigtech_platform", RECENT_PERIOD,
                            "모빌리티 플랫폼 풀스택 개발자", "이동 파트너 플랫폼",
                            "2026-02-24", None, "experienced"),
        _additional_posting("18", "co_navercloud", "b2b_saas", RECENT_PERIOD,
                            "클라우드 관리 풀스택 개발자 (주니어)", "클라우드 자원 관리 콘솔",
                            "2026-03-16", None, "entry_junior"),
        _additional_posting("19", "co_kakaobank", "fintech_finance", RECENT_PERIOD,
                            "금융 상품 풀스택 개발자 (신입)", "금융 상품 가입 서비스",
                            "2026-01-28", "2026-03-20", "entry_junior"),
        _additional_posting("20", "co_kakaobank", "fintech_finance", RECENT_PERIOD,
                            "뱅킹 운영 풀스택 개발자", "뱅킹 운영 포털",
                            "2026-05-12", "2026-06-26", "experienced"),
        _additional_posting("21", "co_samsungsds", "si_enterprise", RECENT_PERIOD,
                            "기업 포털 풀스택 개발자 (주니어)", "기업 협업 포털",
                            "2026-02-18", "2026-04-10", "entry_junior"),
        _additional_posting("22", "co_samsungsds", "si_enterprise", RECENT_PERIOD,
                            "업무 자동화 풀스택 개발자", "업무 자동화 시스템",
                            "2026-05-27", "2026-06-30", "experienced"),
        _additional_posting("23", "co_smilegate", "game", RECENT_PERIOD,
                            "게임 이벤트 풀스택 개발자 (주니어)", "게임 이벤트 운영 도구",
                            "2026-03-30", "2026-05-15", "entry_junior"),
        _additional_posting("24", "co_smilegate", "game", RECENT_PERIOD,
                            "게임 커뮤니티 풀스택 개발자", "게임 커뮤니티 서비스",
                            "2026-06-15", "2026-07-31", "experienced"),
        _additional_posting("25", "co_wantedlab", "startup", PREV_PERIOD,
                            "채용 운영 풀스택 개발자 (주니어)", "채용 운영 워크스페이스",
                            "2024-05-13", "2024-07-05", "entry_junior"),
        _additional_posting("26", "co_musinsa", "bigtech_platform", PREV_PERIOD,
                            "커머스 파트너 풀스택 개발자", "커머스 파트너 센터",
                            "2024-09-23", "2024-11-15", "experienced"),
        _additional_posting("27", "co_channelcorp", "b2b_saas", PREV_PERIOD,
                            "고객 관리 풀스택 개발자 (주니어)", "고객 관리 SaaS",
                            "2025-01-20", "2025-03-14", "entry_junior"),
        _additional_posting("28", "co_kakaobank", "fintech_finance", PREV_PERIOD,
                            "자산 관리 풀스택 개발자", "자산 관리 백오피스",
                            "2025-04-21", "2025-06-13", "experienced"),
        _additional_posting("29", "co_samsungsds", "si_enterprise", PREV_PERIOD,
                            "사내 지원 풀스택 개발자 (주니어)", "사내 지원 시스템",
                            "2025-08-11", "2025-10-03", "entry_junior"),
        _additional_posting("30", "co_smilegate", "game", PREV_PERIOD,
                            "게임 정산 풀스택 개발자", "게임 정산 운영 도구",
                            "2025-10-06", "2025-11-28", "experienced"),
    ]
)

SECTION_ORDER = ("주요업무", "자격요건", "우대사항")
RECENT = [p for p in POSTINGS if p["period"] == RECENT_PERIOD]
PREV = [p for p in POSTINGS if p["period"] == PREV_PERIOD]

# ---------------------------------------------------------------- 화면 라벨 (풀스택 전용)

SCOPE_EXPANSION_LABELS: dict[str, tuple[str, str]] = {
    "infra_deploy": ("인프라·배포", "서버 환경 구성과 배포 파이프라인까지 함께 맡는다"),
    "design_system": ("디자인 시스템·퍼블리싱", "컴포넌트 스타일과 반응형 마크업을 직접 손본다"),
    "data_ops": ("데이터·지표", "지표 집계와 대시보드 운영을 곁들여 요구한다"),
    "qa_test": ("테스트·품질", "테스트 작성과 회귀 확인을 개발자 몫으로 둔다"),
    "plan_support": ("기획·고객 응대", "요구 정리와 사용자 문의 대응까지 범위에 넣는다"),
}

ADVANCED_LABELS: dict[str, str] = {
    "scale_traffic": "트래픽·응답 속도 개선",
    "realtime": "실시간 반영·정합성",
    "arch_owner": "구조 설계 주도",
}

REALITY_LABELS: dict[str, str] = {
    "solo_e2e": "혼자 화면부터 서버까지 완성한 경험",
    "deployed_service": "실제로 배포해 돌려 본 경험",
    "collab_api": "다른 역할과 API 계약을 맞춰 본 경험",
}

AXIS_LABELS: dict[str, str] = {
    "e2e_delivery": "화면~서버 일관 구현",
    "api_contract": "API 계약·타입 안정성",
    "data_modeling": "데이터 모델링",
    "deploy_ops": "배포·운영 자동화",
    "product_speed": "제품 실행 속도",
}

COMBOS: list[dict[str, Any]] = [
    {
        "id": "web_base",
        "name": "Node.js + TypeScript + React + REST",
        "dims": ["node_ts", "react_ui", "rest_api"],
        "desc": "화면과 서버를 한 언어로 잇고 그 사이를 REST 계약으로 묶는 풀스택의 기본 조합입니다.",
        "level": "기능 하나를 화면부터 API까지 완성",
    },
    {
        "id": "data_deploy",
        "name": "관계형 DB + 클라우드 배포",
        "dims": ["rdb", "cloud"],
        "desc": "저장 구조를 정하고 그 상태 그대로 배포해 운영까지 이어 본 경험을 묻는 조합입니다.",
        "level": "스키마 설계 + 배포 1회 이상",
    },
    {
        "id": "ship_stack",
        "name": "Node.js + React + 배포",
        "dims": ["node_ts", "react_ui", "cloud"],
        "desc": "만든 것을 남이 쓸 수 있는 주소로 올려 본 적이 있는지 확인하는 조합입니다.",
        "level": "배포 URL 을 가진 결과물 보유",
    },
    {
        "id": "full_five",
        "name": "다섯 축 전부",
        "dims": ["node_ts", "react_ui", "rest_api", "rdb", "cloud"],
        "desc": "화면·서버·계약·데이터·배포를 한 사람에게 모두 기대하는 공고입니다.",
        "level": "혼자 서비스 하나를 운영 가능",
    },
]

METRIC_POLICY: dict[str, str] = {
    "posting_prevalence": "mp_v1_prevalence",
    "requiredness_ratio": "mp_v1_requiredness",
    "depth_distribution": "mp_v1_depth",
    "cluster_contrast": "mp_v1_contrast",
    "cooccurrence": "mp_v1_cooccurrence",
    "scope_expansion": "mp_v1_scope_exp",
    "entry_label_advanced_signal_rate": "mp_v1_entry_signal",
}

AGENTS = (
    ("stats", "통계 분석", "slots_filled"),
    ("knowledge", "지식 구축", "slots_filled"),
    ("interpretation", "채용공고 해석", "slots_filled"),
    ("strategy", "합격 전략", "slots_filled"),
    ("roadmap", "준비 로드맵", "slots_filled"),
    ("aggregation", "지표 집계", "no_new_evidence"),
)
EXTRACTION_RUN = f"run_demo_{JOB_ROLE_ID}_stats"


# ---------------------------------------------------------------- 파생 계산


def source_id(nn: str) -> str:
    return f"src_demo_{JOB_ROLE_ID}_{nn}"


def snapshot_id(nn: str) -> str:
    return f"snap_demo_{JOB_ROLE_ID}_{nn}"


def posting_id(nn: str) -> str:
    return f"dp_{JOB_ROLE_ID}_{nn}"


def posting_version_id(nn: str) -> str:
    return f"pv_demo_{JOB_ROLE_ID}_{nn}"


def source_url(posting: dict[str, Any]) -> str:
    return f"https://seed.careersignal.invalid/{JOB_ROLE_ID}/{posting['company']}/{posting['nn']}"


def raw_content(posting: dict[str, Any]) -> str:
    """공고 원문. 절 제목과 본문 줄을 그대로 이어 붙인다."""
    parts = [f"[{posting['title']}]"]
    for section in SECTION_ORDER:
        parts.append(f"\n{section}")
        for text, _dim, _depth in posting["sections"][section]:
            parts.append(f"- {text}")
    return "\n".join(parts)


def chunk_text(posting: dict[str, Any], section: str) -> str:
    """청크 본문. 요구 표현의 오프셋은 이 문자열 기준으로 계산한다."""
    return "\n".join(text for text, _dim, _depth in posting["sections"][section])


def pct(numerator: int, denominator: int) -> int | None:
    if denominator == 0:
        return None
    return round(numerator / denominator * 100)


def wilson(numerator: int, denominator: int) -> dict[str, Any]:
    """95% 윌슨 구간. 표본이 작으므로 폭이 넓게 나오는 것이 정상이다."""
    if denominator == 0:
        return {"method": "wilson_95", "low": None, "high": None, "n": 0}
    z = 1.96
    p = numerator / denominator
    denom = 1 + z * z / denominator
    center = (p + z * z / (2 * denominator)) / denom
    margin = z * math.sqrt(p * (1 - p) / denominator + z * z / (4 * denominator * denominator)) / denom
    return {
        "method": "wilson_95",
        "low": round(max(0.0, center - margin), 6),
        "high": round(min(1.0, center + margin), 6),
        "n": denominator,
    }


def build_mention_rows() -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    """청크·표현·할당·청크 추출 기록을 한 번에 만든다. 오프셋은 str.find 로 계산한다."""
    chunks: list[dict[str, Any]] = []
    mentions: list[dict[str, Any]] = []
    assignments: list[dict[str, Any]] = []
    extractions: list[dict[str, Any]] = []
    for posting in POSTINGS:
        nn = posting["nn"]
        snap = snapshot_id(nn)
        seq = 0
        for ordinal, section in enumerate(SECTION_ORDER, start=1):
            body = chunk_text(posting, section)
            chunk_id = f"chunk_demo_{JOB_ROLE_ID}_{nn}_{ordinal}"
            chunks.append({
                "chunk_id": chunk_id,
                "snapshot_id": snap,
                "section": section,
                "ordinal": ordinal,
                "text": body,
                "context": {
                    "posting_id": posting_id(nn),
                    "company_id": posting["company"],
                    "cluster_id": posting["cluster"],
                    "section": section,
                    "job_role_id": JOB_ROLE_ID,
                },
                "embedding_text": body,
                "token_count": max(1, len(body) // 2),
                "dataset_version": DATASET_VERSION,
            })
            count = 0
            for text, dim_key, depth in posting["sections"][section]:
                if dim_key is None:
                    continue
                seq += 1
                count += 1
                start = body.find(text)
                if start < 0:  # 본문에 없는 문장을 근거로 삼지 않는다.
                    raise ValueError(f"{chunk_id} 에서 표현을 찾지 못했다: {text}")
                mention_id = f"mention_{JOB_ROLE_ID}_{nn}_{seq}"
                requiredness = SECTION_REQUIREDNESS[section]
                mentions.append({
                    "mention_id": mention_id,
                    "posting_version_id": posting_version_id(nn),
                    "snapshot_id": snap,
                    "chunk_id": chunk_id,
                    "raw_expression": text,
                    "evidence_span_start": start,
                    "evidence_span_end": start + len(text),
                    "stated_requiredness": requiredness,
                    "section": section,
                    "extraction_confidence": "0.94000",
                    "extraction_run_id": EXTRACTION_RUN,
                    "dataset_version": DATASET_VERSION,
                })
                assignments.append({
                    "assignment_id": f"assign_{JOB_ROLE_ID}_{nn}_{seq}",
                    "mention_id": mention_id,
                    "taxonomy_version_id": TAXONOMY_VERSION_ID,
                    "dimension_id": DIM_ID[dim_key],
                    "normalized_label": DIM_BY_KEY[dim_key]["label"],
                    "requiredness": requiredness,
                    "depth_level": depth,
                    "assignment_confidence": "0.92000",
                    "assignment_method": "alias_exact",
                    "verifier_status": "verified",
                })
            extractions.append({
                "chunk_id": chunk_id,
                "dataset_version": DATASET_VERSION,
                "extraction_run_id": EXTRACTION_RUN,
                "mention_count": count,
                "extracted_at": GENERATED_AT,
            })
    return chunks, mentions, assignments, extractions


CHUNKS, MENTIONS, ASSIGNMENTS, EXTRACTIONS = build_mention_rows()

# 공고 → 차원 → 요구도. 한 공고에서 한 차원은 한 번만 나온다.
POSTING_DIMS: dict[str, dict[str, str]] = {}
for _posting in POSTINGS:
    _nn = _posting["nn"]
    row: dict[str, str] = {}
    for section in SECTION_ORDER:
        for text, dim_key, _depth in _posting["sections"][section]:
            if dim_key is None:
                continue
            if dim_key in row:
                raise ValueError(f"{_nn} 공고에 {dim_key} 표현이 두 번 있다")
            row[dim_key] = SECTION_REQUIREDNESS[section]
    POSTING_DIMS[_nn] = row

RECENT_CLUSTERS = sorted({p["cluster"] for p in RECENT}, key=lambda c: list(CLUSTER_DISPLAY).index(c))
ALL_CLUSTERS = sorted({p["cluster"] for p in POSTINGS}, key=lambda c: list(CLUSTER_DISPLAY).index(c))
POSTING_BY_NN = {p["nn"]: p for p in POSTINGS}


def presence(dim_key: str, group: list[dict[str, Any]]) -> list[str]:
    return [p["nn"] for p in group if dim_key in POSTING_DIMS[p["nn"]]]


def required_count(dim_key: str, group: list[dict[str, Any]]) -> int:
    return sum(1 for p in group if POSTING_DIMS[p["nn"]].get(dim_key) == "required")


# ---------------------------------------------------------------- 지표 사실


def build_statistics_facts() -> list[dict[str, Any]]:
    """numerator·denominator 는 전부 할당 행을 파이썬에서 세어 만든다."""
    facts: list[dict[str, Any]] = []

    def add(family: str, measure: str, scope_level: str, scope_id: str, period: str,
            numerator: int, denominator: int, dimension_id: str | None = None,
            secondary_dimension_id: str | None = None,
            entry_segment: str = "all") -> None:
        seq = len(facts) + 1
        status = "analysis_ready" if scope_level == "overall" else "low_confidence"
        value = None if denominator == 0 else round(numerator / denominator, 6)
        facts.append({
            "fact_id": f"fact_demo_{JOB_ROLE_ID}_{seq:06d}",
            "analysis_version": ANALYSIS_VERSION,
            "metric_family": family,
            "metric_policy_version": METRIC_POLICY[family],
            "scope_level": scope_level,
            "scope_id": scope_id,
            "entry_segment": entry_segment,
            "period_id": period,
            "dimension_id": dimension_id,
            "secondary_dimension_id": secondary_dimension_id,
            "measure": measure,
            "numerator": numerator,
            "denominator": denominator,
            "value": value,
            "sample_size": denominator,
            "sample_status": status,
            "uncertainty": wilson(numerator, denominator),
        })

    for period, group in ((RECENT_PERIOD, RECENT), (PREV_PERIOD, PREV)):
        for dim in DIMENSIONS:
            seen = presence(dim["key"], group)
            add("posting_prevalence", "posting_share", "overall", JOB_ROLE_ID, period,
                len(seen), len(group), DIM_ID[dim["key"]])
            add("requiredness_ratio", "required_share", "overall", JOB_ROLE_ID, period,
                required_count(dim["key"], group), len(seen), DIM_ID[dim["key"]])

    # 기업군 지표는 recent 가 덮은 기업군만 만든다. 표본이 작아 low_confidence 다.
    for cluster in RECENT_CLUSTERS:
        group = [p for p in RECENT if p["cluster"] == cluster]
        for dim in DIMENSIONS:
            add("cluster_contrast", "cluster_posting_share", "cluster", cluster, RECENT_PERIOD,
                len(presence(dim["key"], group)), len(group), DIM_ID[dim["key"]])

    # 동시 출현. 조합 화면의 근거다.
    for pair in (("node_ts", "react_ui"), ("rest_api", "rdb"), ("node_ts", "cloud")):
        both = sum(1 for p in RECENT if all(k in POSTING_DIMS[p["nn"]] for k in pair))
        add("cooccurrence", "cooccurrence_share", "overall", JOB_ROLE_ID, RECENT_PERIOD,
            both, len(RECENT), DIM_ID[pair[0]], DIM_ID[pair[1]])

    # 직무 외 영역 요구. 차원이 아니라 공고 메타에서 센다.
    for tag in SCOPE_EXPANSION_LABELS:
        hits = sum(1 for p in RECENT if tag in p["out_of_role_tags"])
        add("scope_expansion", f"scope_expansion_{tag}", "overall", JOB_ROLE_ID, RECENT_PERIOD,
            hits, len(RECENT))

    # 이 지표는 분모에 이미 대상군이 반영돼 있다. `statistics_facts` 의
    # `entry_signal_rate_segment` CHECK 가 `entry_junior` 외의 대상군을 막는다.
    entry_group = [p for p in RECENT if p["entry_label"] == "entry_junior"]
    add("entry_label_advanced_signal_rate", "entry_advanced_signal_share", "overall",
        JOB_ROLE_ID, RECENT_PERIOD,
        sum(1 for p in entry_group if p["advanced"]), len(entry_group),
        entry_segment="entry_junior")
    return facts


FACTS = build_statistics_facts()
FACT_BY_KEY: dict[tuple[str, str, str, str | None], str] = {
    (f["metric_family"], f["scope_id"], f["period_id"], f["dimension_id"]): f["fact_id"] for f in FACTS
}


def prevalence_fact(dim_key: str, period: str = RECENT_PERIOD) -> str:
    return FACT_BY_KEY[("posting_prevalence", JOB_ROLE_ID, period, DIM_ID[dim_key])]


# ---------------------------------------------------------------- statistics payload


def dim_evidence(dim_key: str) -> list[dict[str, Any]]:
    """요구 표현 원문을 근거로 붙인다. 최대 3건."""
    out: list[dict[str, Any]] = []
    for mention in MENTIONS:
        assign = next(a for a in ASSIGNMENTS if a["mention_id"] == mention["mention_id"])
        if assign["dimension_id"] != DIM_ID[dim_key]:
            continue
        nn = mention["mention_id"].rsplit("_", 2)[-2]
        posting = POSTING_BY_NN[nn]
        if posting["period"] != RECENT_PERIOD:
            continue
        out.append({
            "text": mention["raw_expression"],
            "posting_id": posting_id(nn),
            "source_url": source_url(posting),
        })
        if len(out) == 3:
            break
    return out


def promoted_dims() -> list[str]:
    """이전 기간 필수율이 낮았는데 최근 크게 오른 차원. 양쪽 표본 n>=3 을 요구한다."""
    out: list[str] = []
    for dim in DIMENSIONS:
        key = dim["key"]
        prev_seen, recent_seen = presence(key, PREV), presence(key, RECENT)
        if len(prev_seen) < 3 or len(recent_seen) < 3:
            continue
        prev_ratio = pct(required_count(key, PREV), len(prev_seen)) or 0
        recent_ratio = pct(required_count(key, RECENT), len(recent_seen)) or 0
        if prev_ratio < 40 and recent_ratio - prev_ratio >= 20:
            out.append(key)
    return out


def axis_level(value: int | None) -> str:
    if value is None:
        return "—"
    if value >= 80:
        return "강"
    if value >= 21:
        return "중"
    return "약"


def build_statistics_payload() -> dict[str, Any]:
    n_recent, n_prev = len(RECENT), len(PREV)
    promoted = promoted_dims()

    entry_group = [p for p in RECENT if p["entry_label"] == "entry_junior"]
    kpi = {
        "avg_required_skills": {
            "value": round(sum(len(POSTING_DIMS[p["nn"]]) for p in RECENT) / n_recent, 1),
            "unit": "개",
        },
        "out_of_role_pct": {
            "value": pct(sum(1 for p in RECENT if p["out_of_role_tags"]), n_recent), "unit": "%",
        },
        "entry_label_gap_pct": {
            "value": pct(sum(1 for p in entry_group if p["advanced"]), len(entry_group)),
            "unit": "%", "highlight": True,
        },
        "promoted_to_required_cnt": {"value": len(promoted), "unit": "개"},
        "advanced_mention_pct": {
            "value": pct(sum(1 for p in RECENT if p["advanced"]), n_recent), "unit": "%",
        },
    }

    scope_expansion = []
    for tag, (label, desc) in SCOPE_EXPANSION_LABELS.items():
        count = sum(1 for p in RECENT if tag in p["out_of_role_tags"])
        if count == 0:
            continue
        scope_expansion.append({"tag": tag, "label": label, "desc": desc,
                                "count": count, "pct": pct(count, n_recent)})
    scope_expansion.sort(key=lambda s: -s["count"])

    inflation_items = []
    for dim in DIMENSIONS:
        key = dim["key"]
        prev_seen, recent_seen = presence(key, PREV), presence(key, RECENT)
        if len(prev_seen) < 3 or len(recent_seen) < 3:
            continue
        prev_ratio = pct(required_count(key, PREV), len(prev_seen)) or 0
        recent_ratio = pct(required_count(key, RECENT), len(recent_seen)) or 0
        if recent_ratio - prev_ratio >= 15:
            inflation_items.append({"item_id": dim["slug"], "name": dim["label"],
                                    "prev_ratio": prev_ratio, "recent_ratio": recent_ratio,
                                    "delta": recent_ratio - prev_ratio})
    inflation_items.sort(key=lambda i: -i["delta"])

    trend_rows = []
    for dim in DIMENSIONS:
        key = dim["key"]
        recent_pct = pct(len(presence(key, RECENT)), n_recent)
        prev_pct = pct(len(presence(key, PREV)), n_prev)
        trend_rows.append({"item_id": dim["slug"], "name": dim["label"],
                           "prev_pct": prev_pct, "recent_pct": recent_pct,
                           "delta": None if prev_pct is None else recent_pct - prev_pct})
    trend3 = {
        "increase": sorted([t for t in trend_rows if t["delta"] is not None and t["delta"] >= 8],
                           key=lambda t: -t["delta"])[:3],
        "stable": sorted([t for t in trend_rows if t["delta"] is not None and abs(t["delta"]) < 8],
                         key=lambda t: -t["recent_pct"])[:3],
        "decrease": sorted([t for t in trend_rows if t["delta"] is not None and t["delta"] <= -8],
                           key=lambda t: t["delta"])[:3],
    }

    def dist(field: str) -> list[dict[str, Any]]:
        counter: dict[str, int] = {}
        for p in RECENT:
            counter[p[field]] = counter.get(p[field], 0) + 1
        rows = [{"label": label, "pct": pct(n, n_recent)} for label, n in counter.items()]
        return sorted(rows, key=lambda r: -r["pct"])[:3]

    advanced = []
    for adv_type, label in ADVANCED_LABELS.items():
        hits = [p for p in RECENT if any(t == adv_type for t, _q in p["advanced"])]
        if not hits:
            continue
        quote = next(q for t, q in hits[0]["advanced"] if t == adv_type)
        advanced.append({"type": adv_type, "label": label, "count": len(hits),
                         "pct": pct(len(hits), n_recent), "quote": quote,
                         "more_count": max(0, len(hits) - 1)})
    advanced.sort(key=lambda a: -a["count"])

    combos = []
    for combo in COMBOS:
        count = sum(1 for p in RECENT if all(k in POSTING_DIMS[p["nn"]] for k in combo["dims"]))
        if count == 0:
            continue
        combos.append({"id": combo["id"], "name": combo["name"], "desc": combo["desc"],
                       "level": combo["level"], "count": count, "pct": pct(count, n_recent),
                       "interpretation_source": "synthetic"})
    combos.sort(key=lambda c: -c["count"])

    reality = []
    for tag, label in REALITY_LABELS.items():
        count = sum(1 for p in RECENT if tag in p["reality_tags"])
        if count == 0:
            continue
        reality.append({"tag": tag, "label": label, "pct": pct(count, n_recent)})
    reality.sort(key=lambda r: -r["pct"])

    cluster_rows = []
    for cluster in ALL_CLUSTERS:  # 표본 확보를 위해 recent 와 prev 전체 기간을 합산한다.
        group = [p for p in POSTINGS if p["cluster"] == cluster]
        cells = []
        for axis, axis_label in AXIS_LABELS.items():
            hit = sum(1 for p in group if axis in p["axis_mentions"])
            value = pct(hit, len(group))
            cells.append({"axis": axis_label, "pct": value, "level": axis_level(value)})
        cluster_rows.append({"cluster": CLUSTER_DISPLAY[cluster], "n": len(group), "cells": cells})

    tech_freq = []
    for dim in DIMENSIONS:
        seen = presence(dim["key"], RECENT)
        tech_freq.append({"name": dim["label"], "slug": dim["slug"], "count": len(seen),
                          "pct": pct(len(seen), n_recent),
                          "required_ratio": pct(required_count(dim["key"], RECENT), len(seen))})
    tech_freq.sort(key=lambda t: -t["count"])

    items = []
    for dim in DIMENSIONS:
        key = dim["key"]
        seen = presence(key, RECENT)
        prev_seen = presence(key, PREV)
        recent_pct = pct(len(seen), n_recent)
        prev_pct = pct(len(prev_seen), n_prev)
        delta = None if prev_pct is None else recent_pct - prev_pct
        direction = "unknown" if delta is None else (
            "increase" if delta >= 8 else "decrease" if delta <= -8 else "stable")
        by_cluster, support_by_cluster = {}, {}
        for cluster in RECENT_CLUSTERS:
            group = [p for p in RECENT if p["cluster"] == cluster]
            hit = len(presence(key, group))
            by_cluster[CLUSTER_DISPLAY[cluster]] = pct(hit, len(group))
            support_by_cluster[CLUSTER_DISPLAY[cluster]] = hit
        depths = [d for p in RECENT for t, k, d in
                  [(t, k, d) for section in SECTION_ORDER for t, k, d in p["sections"][section]]
                  if k == key]
        impl = "tradeoff" if "tradeoff" in depths else ("application" if "application" in depths else "foundation")
        items.append({
            "item_id": dim["slug"],
            "name": dim["label"],
            "aliases": dim["aliases"],
            "category": dim["kind"],
            "scope": "in_role",
            "is_advanced": key in ("cloud",),
            "freq_overall": recent_pct,
            "required_ratio": pct(required_count(key, RECENT), len(seen)),
            "freq_by_cluster": by_cluster,
            "trend": {"prev_pct": prev_pct, "recent_pct": recent_pct, "direction": direction,
                      "requirement_shift": "preferred_to_required" if key in promoted else None},
            "impl_level": impl,
            "evidence": dim_evidence(key),
            "support": {"n_overall": len(seen), "n_by_cluster": support_by_cluster},
            "confidence": "high" if len(seen) >= 5 else "medium" if len(seen) >= 3 else "low",
        })
    items.sort(key=lambda i: -i["freq_overall"])

    return {
        "job": JOB_ROLE_ID,
        "meta": {
            "generated_at": GENERATED_AT,
            "snapshots": {"recent": {"label": "2026년", "n": n_recent},
                          "prev": {"label": "2024~2025년", "n": n_prev}},
            "sources": ["job_posting"],
            "disclaimer": "생성 데이터 기반 결과입니다",
            "dataset_version": DATASET_VERSION,
            "analysis_version": ANALYSIS_VERSION,
            "is_synthetic": True,
        },
        "kpi": kpi,
        "scope_expansion": scope_expansion,
        "inflation": {"items": inflation_items, "stable": not inflation_items},
        "trend3": trend3,
        "labels": {"edu": dist("edu_label"), "career": dist("career_label")},
        "advanced": advanced,
        "combos": combos,
        "reality": reality,
        "cluster_axes": {"axes": list(AXIS_LABELS.values()), "rows": cluster_rows},
        "tech_freq": tech_freq,
        "items": items,
        "error": None,
    }


# ---------------------------------------------------------------- 직무 공통 기대치·추가 요구 어휘

BASELINE: list[dict[str, Any]] = [
    {"item_id": "e2e-feature", "title": "화면부터 서버까지 기능 하나 완성", "freq_pct": 100, "required_ratio": 100,
     "desc": "화면·서버·데이터를 한 기능으로 잇고 동작하는 상태까지 만드는 경험입니다. 최근 1년 공고 전부가 화면과 서버를 함께 요구하므로, 풀스택 지원에서는 기술 목록보다 완성된 기능 하나가 먼저 읽힙니다."},
    {"item_id": "type-contract", "title": "TypeScript 타입으로 계약 지키기", "freq_pct": 100, "required_ratio": 100,
     "desc": "요청·응답 형태를 타입으로 정하고 화면과 서버가 같은 정의를 쓰게 만드는 습관입니다. Node.js·TypeScript 요구가 100%에 필수율 100%로, 사실상 전제 조건입니다."},
    {"item_id": "api-contract", "title": "REST API 설계와 화면 연동", "freq_pct": 80, "required_ratio": 75,
     "desc": "자원을 나누고 응답 형태를 정해 화면과 붙이는 능력입니다. 등장 80%에 필수율 75%이고 이전 1년 50%에서 올라, 계약을 스스로 정해 본 경험을 묻는 흐름이 뚜렷합니다."},
    {"item_id": "rdb-schema", "title": "관계형 스키마 설계와 쿼리", "freq_pct": 60, "required_ratio": 67,
     "desc": "테이블과 관계를 정하고 필요한 쿼리를 쓰는 기본기입니다. 등장 60%로 다른 축보다 낮아 보이지만, SI·핀테크·게임 공고에서는 요구 수준이 한 단계 올라갑니다."},
    {"item_id": "deploy-pipeline", "title": "클라우드에 배포해 본 경험", "freq_pct": 80, "required_ratio": 75,
     "desc": "컨테이너로 빌드해 클라우드에 올리고 배포 뒤 상태를 확인하는 경험입니다. 필수율이 이전 1년 0%에서 75%로 뛴 우대→필수 이동 항목이라, 이제 직무 공통 기대치의 일부로 읽는 편이 안전합니다."},
    {"item_id": "error-ux", "title": "실패 처리와 사용자 피드백", "freq_pct": 60, "required_ratio": 60,
     "desc": "서버 오류를 어떤 형태로 돌려주고 화면에서 어떻게 보여줄지 정하는 설계입니다. 풀스택은 실패가 양쪽에 동시에 걸리므로 이 항목이 곧 변별점이 됩니다."},
    {"item_id": "collab-flow", "title": "협업·리뷰 기록", "freq_pct": 40, "required_ratio": 50,
     "desc": "변경 단위를 나눠 올리고 리뷰로 합의한 기록입니다. 공고 문장으로는 40%지만 포트폴리오 평가에서는 기본기로 취급됩니다."},
]

# 추가 요구 항목 식별자 → 체크리스트 개념. 직무 공통 기대치 이름과 개념 이름이 다른 항목만 적는다.
DEV_TO_CONCEPT = {"collab-flow": "collab-story", "type-contract": "ts-type-study"}
BASELINE_BY_ID = {b["item_id"]: b for b in BASELINE}

UNCHANGED: list[dict[str, Any]] = [
    {"item_id": "e2e-feature", "title": "화면부터 서버까지 기능 하나 완성",
     "note": "요구 수준이 기업군과 무관하게 같습니다. 차별화가 아니라 지원의 전제 조건입니다."},
    {"item_id": "type-contract", "title": "TypeScript 타입으로 계약 지키기",
     "note": "어느 기업군도 더 요구하지 않고 덜 보지도 않습니다. 타입 정의를 공유하는 습관이면 충분합니다."},
    {"item_id": "collab-flow", "title": "협업·리뷰 기록",
     "note": "협업 기록 요구는 전 기업군 공통입니다. 한 번 준비하면 어디에나 통합니다."},
]

# 차원 → 직무 공통 기대치 항목. 원문 줄에 직무 공통 기대치 번호를 달 때 쓴다.
DIM_TO_BASELINE = {
    "node_ts": "type-contract",
    "react_ui": "e2e-feature",
    "rest_api": "api-contract",
    "rdb": "rdb-schema",
    "cloud": "deploy-pipeline",
}

CLUSTER_SPEC: dict[str, dict[str, Any]] = {
    "bigtech_platform": {
        "extra_concept": "perf-tuning",
        "intro_steps": ["응답 속도 개선 기록", "API 계약 합의", "배포 자동화", "화면~서버 완성"],
        "deviations": [
            {"item_id": "perf-tuning", "topic": "성능", "baseline": "동작하는 화면과 API",
             "deviation": "응답 시간을 재고 하나라도 줄여 본 경험",
             "evidence_line": "월 수천만 건 요청을 처리하는 커머스 서비스의 응답 속도를 함께 개선합니다.",
             "explanation": "트래픽 숫자를 적은 공고는 규모 자랑이 아니라 측정 습관을 묻는 신호입니다. 신입에게 대규모 운영 경험을 기대하지는 않지만, 어디가 느린지 재 보고 하나를 고쳐 본 기록은 기대합니다.",
             "confidence": "high", "ratio": "같은 직군 40%", "related_stat": "#advanced"},
            {"item_id": "deploy-pipeline", "topic": "배포 자동화", "baseline": "직접 배포해 본 경험",
             "deviation": "파이프라인을 구성하고 되돌릴 수 있는 상태까지",
             "evidence_line": "Docker와 CI/CD로 배포 과정을 자동화해 보신 분",
             "explanation": "손으로 올리는 배포는 사람이 늘면 곧 사고가 됩니다. 자동화 경험을 필수로 적는 이유는 배포가 개인 작업이 아니라 팀의 절차이기 때문입니다.",
             "confidence": "mid", "ratio": "같은 직군 80%", "related_stat": "#items"},
            {"item_id": "api-contract", "topic": "API 계약", "baseline": "API 설계와 화면 연동",
             "deviation": "여러 팀과 합의해 응답 구조를 정한 경험",
             "evidence_line": "REST API의 응답 구조를 팀과 합의해 정해 보신 분",
             "explanation": "혼자 정한 계약과 합의해 정한 계약은 결과물이 다릅니다. 여러 화면이 같은 API를 쓰는 조직이라 협의 과정 자체를 능력으로 봅니다.",
             "confidence": "mid", "ratio": "같은 직군 80%", "related_stat": "#items"},
        ],
    },
    "startup": {
        "extra_concept": "ownership-ship",
        "intro_steps": ["혼자 완성·배포한 결과물", "빠른 반복 기록", "화면~서버 완성", "API 계약"],
        "deviations": [
            {"item_id": "ownership-ship", "topic": "오너십", "baseline": "맡은 기능 구현",
             "deviation": "설계와 배포까지 스스로 결정한 기록",
             "evidence_line": "기능 하나의 설계와 배포까지 스스로 결정하고 책임집니다.",
             "explanation": "결정해 줄 사람이 없다는 뜻입니다. 무엇을 만들지 고른 이유, 만들지 않기로 한 것까지 설명할 수 있으면 이 문장을 정면으로 채웁니다.",
             "confidence": "high", "ratio": "같은 직군 40%", "related_stat": "#reality"},
            {"item_id": "deploy-pipeline", "topic": "배포", "baseline": "클라우드에 배포해 본 경험",
             "deviation": "혼자 운영까지 이어 본 경험",
             "evidence_line": "AWS에 직접 배포하고 운영해 보신 분",
             "explanation": "배포 담당이 따로 없으므로 올린 뒤의 로그·비용·장애까지 같은 사람이 봅니다. 우대로 적혀 있어도 실질은 합격선에 가깝습니다.",
             "confidence": "mid", "ratio": "같은 직군 80%", "related_stat": "#items"},
            {"item_id": "e2e-feature", "topic": "반복 속도", "baseline": "기능 하나 완성",
             "deviation": "짧은 주기로 고쳐 다시 내보내는 습관",
             "evidence_line": "사용자 반응을 확인하고 다음 주에 바로 고치는 주기로 일합니다.",
             "explanation": "완성도보다 회전 속도를 봅니다. 커밋과 배포 기록이 촘촘하면 별도 설명 없이도 이 요구가 증명됩니다.",
             "confidence": "mid", "ratio": "같은 직군 40%", "related_stat": "#reality"},
        ],
    },
    "b2b_saas": {
        "extra_concept": "multi-tenant",
        "intro_steps": ["고객사별 설정 분리", "API 문서화", "화면~서버 완성", "테스트 습관"],
        "deviations": [
            {"item_id": "multi-tenant", "topic": "다중 고객사", "baseline": "기능이 동작하는 상태",
             "deviation": "환경이 달라도 같은 기능이 동작하도록 나눈 구조",
             "evidence_line": "여러 고객사 환경에서 같은 기능이 안정적으로 동작하도록 만듭니다.",
             "explanation": "고객사마다 설정과 데이터가 다릅니다. 하드코딩 대신 설정으로 갈라 본 경험이 있으면 이 기업군에서 바로 읽히는 차이가 됩니다.",
             "confidence": "high", "ratio": "같은 직군 40%", "related_stat": "#items"},
            {"item_id": "api-contract", "topic": "외부 연동", "baseline": "API 설계와 화면 연동",
             "deviation": "남이 읽고 붙일 수 있는 문서까지",
             "evidence_line": "REST API 문서를 작성하고 외부 연동을 도와 보신 분",
             "explanation": "고객사 개발자가 API를 직접 씁니다. 문서가 곧 제품의 일부라서 작성 경험을 우대가 아니라 업무로 적습니다.",
             "confidence": "mid", "ratio": "같은 직군 80%", "related_stat": "#items"},
            {"item_id": "error-ux", "topic": "안정성", "baseline": "실패 처리와 사용자 피드백",
             "deviation": "테스트로 회귀를 막는 습관",
             "evidence_line": "테스트 코드를 작성하는 습관이 있으신 분",
             "explanation": "구독 제품은 어제 되던 기능이 오늘 깨지면 해지로 이어집니다. 테스트는 품질 취향이 아니라 계약 유지 수단으로 요구됩니다.",
             "confidence": "mid", "ratio": "같은 직군 40%", "related_stat": "#items"},
        ],
    },
    "fintech_finance": {
        "extra_concept": "security-basic",
        "intro_steps": ["인증·인가 구현", "정합성 검증", "오류 응답 규칙", "화면~서버 완성"],
        "deviations": [
            {"item_id": "security-basic", "topic": "인증·인가", "baseline": "공통 항목에 없는 신규 요구",
             "deviation": "로그인과 권한 확인을 직접 구현한 경험",
             "evidence_line": "인증·인가 흐름을 구현해 보신 분",
             "explanation": "돈을 다루는 화면은 누가 무엇을 볼 수 있는지가 기능의 절반입니다. 토큰을 어디에 두고 언제 갱신할지 설명할 수 있으면 신입에게도 충분한 답이 됩니다.",
             "confidence": "high", "ratio": "같은 직군 20%", "related_stat": "#items"},
            {"item_id": "rdb-schema", "topic": "정합성", "baseline": "스키마 설계와 쿼리",
             "deviation": "트랜잭션으로 값이 어긋나지 않게 지키기",
             "evidence_line": "관계형 데이터베이스에서 트랜잭션을 다뤄 보신 분",
             "explanation": "잔액은 두 번 빠지면 안 되는 값입니다. 커밋·롤백을 언제 나누는지 자기 프로젝트 사례로 설명하는 것이 이 기업군의 최대 변별점입니다.",
             "confidence": "high", "ratio": "같은 직군 60%", "related_stat": "#items"},
            {"item_id": "error-ux", "topic": "실패 처리", "baseline": "오류를 화면에 알리기",
             "deviation": "오류 응답 형태와 재시도 규칙까지 정하기",
             "evidence_line": "REST API의 오류 응답과 재시도 규칙을 정해 보신 분",
             "explanation": "실패한 요청을 다시 보냈을 때 두 번 처리되면 사고입니다. 멱등성이라는 단어를 몰라도 같은 요청을 두 번 받으면 어떻게 되는지 답할 수 있어야 합니다.",
             "confidence": "high", "ratio": "같은 직군 80%", "related_stat": "#advanced"},
        ],
    },
    "si_enterprise": {
        "extra_concept": "spec-docs",
        "intro_steps": ["산출물 문서", "데이터 모델 정리", "표준 준수 협업", "화면~서버 완성"],
        "deviations": [
            {"item_id": "spec-docs", "topic": "산출물 문서", "baseline": "코드와 README",
             "deviation": "요구사항 정의서와 변경 이력까지",
             "evidence_line": "요구사항 정의서와 산출물 문서를 작성해 보신 분",
             "explanation": "발주처에 넘기는 것이 코드만이 아닙니다. 문서가 검수 대상이라 작성 경험 자체를 능력으로 셉니다.",
             "confidence": "high", "ratio": "같은 직군 20%", "related_stat": "#scope"},
            {"item_id": "rdb-schema", "topic": "데이터 모델", "baseline": "테이블 설계",
             "deviation": "이미 쓰이는 데이터를 건드리지 않고 정리하기",
             "evidence_line": "업무 데이터를 담는 관계형 데이터베이스 스키마를 정리합니다.",
             "explanation": "새로 만드는 것이 아니라 이미 돌아가는 시스템을 고칩니다. 마이그레이션을 어떻게 나눌지 생각해 본 흔적이 필요합니다.",
             "confidence": "mid", "ratio": "같은 직군 60%", "related_stat": "#items"},
            {"item_id": "collab-flow", "topic": "표준 준수", "baseline": "협업·리뷰 기록",
             "deviation": "정해진 규칙을 따라 일한 경험",
             "evidence_line": "대규모 조직의 개발 표준을 따라 일해 보신 분",
             "explanation": "내 방식대로 잘하는 사람보다 정해진 방식대로 어긋나지 않게 하는 사람을 찾습니다. 규칙을 지킨 협업 기록이 그대로 답이 됩니다.",
             "confidence": "mid", "ratio": "같은 직군 40%", "related_stat": "#items"},
        ],
    },
    "game": {
        "extra_concept": "realtime-sync",
        "intro_steps": ["실시간 반영 화면", "게임 서버 연동 API", "운영 데이터 모델", "화면~서버 완성"],
        "deviations": [
            {"item_id": "realtime-sync", "topic": "실시간 반영", "baseline": "새로고침하면 보이는 화면",
             "deviation": "상태가 바뀌면 화면이 따라오는 구조",
             "evidence_line": "운영자가 실시간으로 상태를 확인할 수 있는 화면을 만듭니다.",
             "explanation": "운영 도구는 사고가 났을 때 쓰는 화면입니다. 폴링과 소켓 중 무엇을 왜 골랐는지 설명할 수 있으면 충분합니다.",
             "confidence": "high", "ratio": "같은 직군 20%", "related_stat": "#items"},
            {"item_id": "api-contract", "topic": "서버 연동", "baseline": "API 설계와 화면 연동",
             "deviation": "내가 만들지 않은 서버와 규격을 맞추기",
             "evidence_line": "REST API를 설계해 게임 서버와 연동해 보신 분",
             "explanation": "게임 서버는 다른 팀의 것입니다. 남이 정한 규격에 맞춰 붙여 본 경험이 이 기업군에서 실무 신호로 읽힙니다.",
             "confidence": "mid", "ratio": "같은 직군 40%", "related_stat": "#items"},
            {"item_id": "rdb-schema", "topic": "운영 데이터", "baseline": "스키마 설계와 쿼리",
             "deviation": "쌓이는 로그성 데이터를 다루기",
             "evidence_line": "관계형 데이터베이스로 운영 데이터를 관리해 보신 분",
             "explanation": "운영 데이터는 빠르게 쌓이고 조회 조건이 자주 바뀝니다. 인덱스를 왜 그렇게 걸었는지 한 문장으로 답할 수 있어야 합니다.",
             "confidence": "mid", "ratio": "같은 직군 60%", "related_stat": "#items"},
        ],
    },
}

# 원문 줄 뒤에 붙는 신호 해석. 요구 표현이 아닌 문장에만 단다.
SIGNAL_NOTES: dict[str, tuple[str, str]] = {
    "채용 서비스의 신규 기능을 화면부터 서버까지 한 사람이 맡아 개발합니다.":
        ("'한 사람이 맡는다'는 말의 무게", "화면과 서버를 나눠 맡을 사람이 없다는 뜻입니다. 기술 목록보다 혼자 끝까지 굴려 본 결과물 하나가 먼저 읽힙니다."),
    "작은 팀에서 제품을 빠르게 만들어 본 경험이 있으신 분":
        ("속도는 태도로 읽힌다", "완성도보다 회전 속도를 봅니다. 2주 안에 만들어 배포한 기록이 있으면 이 문장을 그대로 채웁니다."),
    "상품 노출 화면과 백오피스 API를 함께 개발합니다.":
        ("함께 개발한다 = 계약을 스스로 정한다", "화면과 API를 같은 사람이 만드는 조직에서는 응답 형태를 정하는 판단까지 지원자 몫입니다."),
    "지표를 보고 개선 순서를 정해 보신 분":
        ("무엇을 먼저 고칠지 묻는 문장", "기능을 만드는 능력이 아니라 순서를 정하는 근거를 봅니다. 숫자를 보고 정했다는 한 줄이 필요합니다."),
    "고객사 상담 도구의 화면과 서버 기능을 함께 개발합니다.":
        ("고객사가 쓰는 도구라는 조건", "사내 도구가 아니라 돈을 내는 고객이 씁니다. 사소한 오류도 문의로 돌아온다는 전제가 깔려 있습니다."),
    "기능 변경 사항을 문서로 남겨 고객 지원 팀과 공유합니다.":
        ("문서가 업무에 포함된다", "개발이 끝나는 지점이 배포가 아니라 공유입니다. 변경 이력을 남겨 본 습관이 곧 증명입니다."),
    "고객 자산 조회 화면과 조회 API를 함께 개발합니다.":
        ("조회 화면이라는 표현의 범위", "단순 조회처럼 보이지만 금액을 보여주는 화면입니다. 값이 하나라도 틀리면 기능 실패로 취급됩니다."),
    "금융 규정에 맞는 기록과 검증 절차를 코드로 남깁니다.":
        ("규정이 코드로 내려온다", "요구사항의 출처가 기획이 아니라 규정입니다. 왜 이렇게 짰는지 근거를 남기는 습관을 봅니다."),
    "여러 팀이 함께 쓰는 시스템의 구조를 정리하고 문서로 남깁니다.":
        ("구조를 설명할 수 있는가", "혼자 이해하는 코드가 아니라 남에게 설명되는 구조를 요구합니다. 그림 한 장으로 설명해 본 경험이 도움이 됩니다."),
    "실시간으로 바뀌는 잔액 화면과 서버 데이터의 정합성을 맞춥니다.":
        ("정합성은 화면과 서버 양쪽 문제", "서버만 맞으면 되는 것이 아니라 화면에 보이는 값도 같아야 합니다. 풀스택에게만 던질 수 있는 요구입니다."),
}

POSTING_SUMMARY: dict[str, tuple[str, str, str]] = {
    "01": ("혼자 끝까지 굴려 본 사람을 찾습니다",
           "직무 공통 기대치 항목은 대체로 공통 기대치 그대로입니다. 차이는 결정과 배포를 스스로 했는지, 그리고 그 주기를 짧게 유지했는지에 있습니다.",
           "추가 요구 3건 · 직무 공통 기대치 일치 4건"),
    "02": ("만들 줄 아는 사람보다 재 보고 줄여 본 사람",
           "화면과 API를 함께 만드는 것은 전제이고, 응답 속도와 배포 자동화가 이 공고의 실질 변별점입니다.",
           "추가 요구 3건 · 직무 공통 기대치 일치 4건"),
    "03": ("여러 고객사 환경에서 흔들리지 않는 기능",
           "기능 완성은 직무 공통 기대치이고, 환경이 달라도 같게 동작하도록 나눈 구조와 문서·테스트가 추가 요구입니다.",
           "추가 요구 3건 · 직무 공통 기대치 일치 4건"),
    "04": ("값이 어긋나지 않게 지키는 사람",
           "화면과 서버를 함께 만드는 것은 공통 기대치이고, 인증·정합성·실패 처리 세 축이 이 공고의 변별점입니다.",
           "추가 요구 3건 · 직무 공통 기대치 일치 4건"),
    "05": ("정해진 방식대로 어긋나지 않게",
           "새로 만드는 일보다 이미 돌아가는 시스템을 고치는 일입니다. 문서와 표준 준수가 코드만큼 평가됩니다.",
           "추가 요구 3건 · 직무 공통 기대치 일치 4건"),
    "06": ("라이브 운영 흐름을 한 화면에 연결하는 사람",
           "화면과 서버의 공통 직무 공통 기대치에 더해 실시간 운영 상태와 게임 서버 연동 경험을 확인하는 공고입니다.",
           "추가 요구 3건 · 직무 공통 기대치 일치 5건"),
    "07": ("작게 만들고 자주 배포하는 제품 개발자",
           "기본 구현 능력보다 작은 팀에서 개선 과제를 고르고 빠르게 배포한 경험이 변별점입니다.",
           "추가 요구 3건 · 직무 공통 기대치 일치 3건"),
    "08": ("여러 상품을 안정적으로 연결하는 콘솔 개발자",
           "관리 화면 구현을 전제로 데이터 구조와 클라우드 배포 환경을 함께 다룬 경험을 봅니다.",
           "추가 요구 3건 · 직무 공통 기대치 일치 4건"),
    "09": ("여러 팀의 운영 흐름을 잇는 개발자",
           "내부 화면과 API를 만드는 직무 공통 기대치 위에 데이터 흐름 정리와 배포 파이프라인 경험을 요구합니다.",
           "추가 요구 3건 · 직무 공통 기대치 일치 5건"),
}


# ---------------------------------------------------------------- interpretation payload


def deviation_cards(cluster: str) -> list[dict[str, Any]]:
    """CONTRACT 5.B 의 deviations 형태로 바꾼다."""
    cards = []
    for dev in CLUSTER_SPEC[cluster]["deviations"]:
        cards.append({
            "item_id": dev["item_id"],
            "topic": dev["topic"],
            "baseline": dev["baseline"],
            "deviation": dev["deviation"],
            "evidence": f'"{dev["evidence_line"]}"',
            "explanation": dev["explanation"],
            "confidence": dev["confidence"],
            "ratio": dev["ratio"],
            "related_stat": dev["related_stat"],
        })
    return cards


def posting_view(posting: dict[str, Any]) -> dict[str, Any]:
    """원문에 세 종류 주석 번호를 단다. 번호는 실제 줄에만 붙는다."""
    cluster = posting["cluster"]
    devs = CLUSTER_SPEC[cluster]["deviations"]
    dev_by_line = {d["evidence_line"]: i + 1 for i, d in enumerate(devs)}

    sections, interpretations, baseline_notes, signal_notes = [], [], [], []
    contextual_rows: list[tuple[dict[str, Any], str]] = []
    base_n = note_n = 0
    used_base: set[str] = set()
    for section in SECTION_ORDER:
        lines = []
        for text, dim_key, _depth in posting["sections"][section]:
            line: dict[str, Any] = {"text": text, "mark_n": None, "note_n": None,
                                    "base_n": None, "base_ref": None}
            if text in dev_by_line:
                line["mark_n"] = dev_by_line[text]
            elif dim_key is not None:
                base_item = BASELINE_BY_ID[DIM_TO_BASELINE[dim_key]]
                base_n += 1
                line["base_n"] = base_n
                line["base_ref"] = base_item["title"]
                if base_item["item_id"] not in used_base:
                    used_base.add(base_item["item_id"])
                baseline_notes.append({
                    "n": base_n,
                    "base_ref": base_item["title"],
                    "body": f"{base_item['title']}: 풀스택 직무 공통 기대치입니다. 최근 1년 공고의 "
                            f"{base_item['freq_pct']}%에 나타나고 그중 {base_item['required_ratio']}%가 필수로 적었습니다. "
                            f"이 공고도 같은 수준이므로 여기서 점수를 벌기보다 빠뜨리지 않는 것이 중요합니다.",
                })
            elif text in SIGNAL_NOTES:
                note_n += 1
                line["note_n"] = note_n
                title, body = SIGNAL_NOTES[text]
                signal_notes.append({"n": note_n, "title": title, "body": body})
            if dim_key is None and text not in dev_by_line:
                contextual_rows.append((line, text))
            lines.append(line)
        sections.append({"section": section, "lines": lines})

    for i, dev in enumerate(devs, start=1):
        if dev["evidence_line"] not in dev_by_line:
            continue
        interpretations.append({
            "n": i,
            "title": f"{dev['topic']} — {dev['deviation']}",
            "body": dev["explanation"],
            "confidence": dev["confidence"],
            "ratio": dev["ratio"],
            "sources": [{"type": "posting", "url": source_url(posting)}],
        })

    if not signal_notes:
        line, source_text = contextual_rows[0]
        note_n = 1
        line["note_n"] = note_n
        if posting["out_of_role_tags"]:
            feature = SCOPE_EXPANSION_LABELS[posting["out_of_role_tags"][0]][0]
        elif posting["reality_tags"]:
            feature = REALITY_LABELS[posting["reality_tags"][0]]
        else:
            feature = AXIS_LABELS[posting["axis_mentions"][0]]
        signal_notes.append({
            "n": note_n,
            "title": f"{CLUSTER_DISPLAY[cluster]} 특징 — {feature}",
            "body": (
                f"{COMPANY_DISPLAY[posting['company']]}의 {posting['title']} 공고는 '{source_text}'라는 업무를 통해 "
                f"{feature}까지 담당 범위에 포함합니다. 포트폴리오에서는 관련 화면·API 위치와 실행 결과를 함께 연결합니다."
            ),
        })

    if posting["nn"] in POSTING_SUMMARY:
        title, body, ratio = POSTING_SUMMARY[posting["nn"]]
    else:
        dims = [DIM_BY_KEY[key]["label"] for key in POSTING_DIMS[posting["nn"]]]
        primary, secondary = dims[0], dims[1] if len(dims) > 1 else dims[0]
        title = f"{COMPANY_DISPLAY[posting['company']]}의 전체 흐름을 잇는 개발자"
        body = (
            f"{posting['title']} 공고는 {primary}와 {secondary}를 한 기능 안에서 연결하고, "
            f"{CLUSTER_DISPLAY[cluster]} 환경의 배포·운영 결과까지 확인합니다."
        )
        ratio = f"추가 요구 3건 · 직무 공통 기대치 일치 {len(dims)}건"
    return {
        "posting_id": posting_id(posting["nn"]),
        "company": COMPANY_DISPLAY[posting["company"]],
        "title": posting["title"],
        "summary": {"n": None, "title": title, "body": body, "confidence": "high",
                    "ratio": ratio, "sources": [{"type": "posting", "url": source_url(posting)}]},
        "raw_sections": sections,
        "interpretations": interpretations,
        "baseline_notes": baseline_notes,
        "signal_notes": signal_notes,
        "unchanged_note": "읽는 법 — 회색 번호는 풀스택 공통 기대치, 파란 번호는 문장 뒤에 숨은 요구, "
                          "노란 번호는 이 회사가 유독 원하는 것입니다.",
    }


def interpretation_payload(level: str, cluster: str | None = None,
                           posting: dict[str, Any] | None = None) -> dict[str, Any]:
    scope = {
        "level": level,
        "cluster_tag": CLUSTER_DISPLAY[cluster] if cluster else None,
        "posting_id": posting_id(posting["nn"]) if posting else None,
    }
    devs = deviation_cards(cluster) if cluster else []
    return {
        "job": JOB_ROLE_ID,
        "scope": scope,
        "baseline": BASELINE,
        "deviations": devs,
        "unchanged": UNCHANGED,
        "posting": posting_view(posting) if posting else None,
        "agent_version": AGENT_VERSION,
        "source": "stored",
    }


# ---------------------------------------------------------------- 체크리스트 개념

CONCEPTS: dict[str, dict[str, Any]] = {
    "e2e-feature": {
        "kind": "project", "title": "화면~서버 기능 완성 프로젝트", "subtitle": "배포까지 이어진 기능 하나",
        "reason": "직무 공통 기대치 · 최근 1년 공고 100%가 화면과 서버를 함께 요구합니다",
        "evidence_needed": "배포 URL + 저장소 + 기능 흐름 설명 문서", "channels": ["portfolio"], "required": True,
    },
    "api-contract": {
        "kind": "project", "title": "API 계약 설계", "subtitle": "요청·응답 형태를 정하고 화면과 맞춘 기록",
        "reason": "직무 공통 기대치 · 등장 80%, 필수율 75%. 이전 1년 50%에서 올랐습니다",
        "evidence_needed": "엔드포인트 명세 + 화면 연동 코드", "channels": ["portfolio", "interview"], "required": True,
    },
    "rdb-schema": {
        "kind": "project", "title": "관계형 스키마 설계", "subtitle": "테이블·관계·인덱스의 근거",
        "reason": "직무 공통 기대치 · 등장 60%, 필수율 67%", "evidence_needed": "ERD + 쿼리 개선 기록",
        "channels": ["portfolio", "interview"], "required": True,
    },
    "deploy-pipeline": {
        "kind": "project", "title": "클라우드 배포", "subtitle": "빌드부터 배포까지 한 번에",
        "reason": "우대→필수 이동 · 필수율이 0%에서 75%로 올랐습니다",
        "evidence_needed": "배포 설정 파일 + 배포 기록", "channels": ["portfolio"], "required": True,
    },
    "error-ux": {
        "kind": "project", "title": "실패 처리와 사용자 피드백", "subtitle": "오류 응답과 화면 안내를 한 쌍으로",
        "reason": "직무 공통 기대치 · 등장 60%. 풀스택은 실패가 양쪽에 동시에 걸립니다",
        "evidence_needed": "오류 응답 규칙 문서 + 화면 처리 코드", "channels": ["portfolio", "interview"], "required": True,
    },
    "collab-story": {
        "kind": "story", "title": "협업·오너십 서사", "subtitle": "문제를 끝까지 끌고 간 경험",
        "reason": "직무 공통 기대치 · 협업 기록 요구 40%이고 자소서에서 반복 검증됩니다",
        "evidence_needed": "문제 → 해결 → 배움 서술 준비", "channels": ["essay"], "required": True,
    },
    "ts-type-study": {
        "kind": "study", "title": "타입으로 계약 지키기", "subtitle": "타입 공유·좁히기를 설명할 수 있는 수준",
        "reason": "직무 공통 기대치 · TypeScript 요구 100%, 필수율 100%",
        "evidence_needed": "타입 정의 정리 노트 + 내 코드 사례", "channels": ["interview"], "required": True,
    },
    "web-fundamentals": {
        "kind": "study", "title": "웹 기본기 — HTTP·렌더링", "subtitle": "요청 한 번의 전체 흐름",
        "reason": "화면과 서버를 모두 맡으므로 경계 지식이 면접에서 검증됩니다",
        "evidence_needed": "요청 흐름 그림 + 설명 연습", "channels": ["interview"], "required": True,
    },
    "db-tx-study": {
        "kind": "study", "title": "데이터베이스 이론 — 인덱스·트랜잭션", "subtitle": "왜 빨라지고 왜 어긋나는가",
        "reason": "스키마 항목의 이론 바탕 · 꼬리질문이 여기서 나옵니다",
        "evidence_needed": "개념 노트 + 내 프로젝트 적용 사례", "channels": ["interview"], "required": False,
    },
    "perf-tuning": {
        "kind": "project", "title": "응답 속도 측정과 개선", "subtitle": "병목을 찾아 하나를 줄이기",
        "reason": "트래픽을 명시한 공고의 실질 요구",
        "evidence_needed": "개선 전후 지표 비교 문서", "channels": ["portfolio", "interview"], "required": True,
    },
    "ownership-ship": {
        "kind": "story", "title": "혼자 끝까지 배포한 서사", "subtitle": "결정과 책임의 기록",
        "reason": "설계와 배포를 스스로 결정하라고 적었습니다",
        "evidence_needed": "의사결정 기록 + 회고 글", "channels": ["essay", "interview"], "required": True,
    },
    "multi-tenant": {
        "kind": "project", "title": "고객사별 설정 분리", "subtitle": "같은 기능, 다른 환경",
        "reason": "여러 고객사 환경에서의 동작을 요구합니다",
        "evidence_needed": "설정 분리 구조 문서 + 시연", "channels": ["portfolio"], "required": True,
    },
    "security-basic": {
        "kind": "project", "title": "인증·인가 구현", "subtitle": "로그인과 권한 확인",
        "reason": "인증·인가 흐름 구현 경험을 직접 묻습니다",
        "evidence_needed": "인증 구현 코드 + 토큰 처리 설명", "channels": ["portfolio", "interview"], "required": True,
    },
    "spec-docs": {
        "kind": "project", "title": "산출물 문서 작성", "subtitle": "요구사항 정의서와 변경 이력",
        "reason": "문서가 검수 대상 산출물에 포함됩니다",
        "evidence_needed": "요구사항 정의서 1건 + 변경 이력", "channels": ["portfolio"], "required": False,
    },
    "realtime-sync": {
        "kind": "project", "title": "실시간 상태 반영", "subtitle": "폴링·소켓 중 고른 이유",
        "reason": "실시간 확인 화면을 업무로 적었습니다",
        "evidence_needed": "갱신 방식 선택 근거 + 동작 데모", "channels": ["portfolio", "interview"], "required": True,
    },
}

BASE_CONCEPTS = ["e2e-feature", "api-contract", "rdb-schema", "deploy-pipeline", "error-ux",
                 "collab-story", "ts-type-study", "web-fundamentals", "db-tx-study"]


def concept_id(slug: str) -> str:
    return f"cc_{JOB_ROLE_ID}_{slug}"


def scope_concepts(cluster: str | None) -> list[str]:
    """범위별 체크리스트 개념. 기업군 범위는 그 기업군의 추가 요구 개념을 하나 더 갖는다."""
    if cluster is None:
        return list(BASE_CONCEPTS)
    return list(BASE_CONCEPTS) + [CLUSTER_SPEC[cluster]["extra_concept"]]


# ---------------------------------------------------------------- strategy payload

INTRO_ORDERS = [{"cluster": CLUSTER_DISPLAY[c], "steps": CLUSTER_SPEC[c]["intro_steps"]}
                for c in CLUSTER_DISPLAY]


def checklist_rows(cluster: str | None) -> list[dict[str, Any]]:
    extra = CLUSTER_SPEC[cluster]["extra_concept"] if cluster else None
    rows = []
    for slug in scope_concepts(cluster):
        spec = CONCEPTS[slug]
        is_dev = slug == extra
        rows.append({
            "item_id": concept_id(slug),
            "title": spec["title"],
            "subtitle": spec["subtitle"],
            "reason": spec["reason"],
            "evidence_needed": spec["evidence_needed"],
            "channels": spec["channels"],
            "kind": spec["kind"],
            "is_deviation": is_dev,
            "dev_n": 1 if is_dev else None,
            "required": spec["required"],
            "have": False,
        })
    return rows


def strategy_payload(cluster: str | None) -> dict[str, Any]:
    scope = {"level": "cluster" if cluster else "overall",
             "cluster_tag": CLUSTER_DISPLAY[cluster] if cluster else None, "posting_id": None}
    if cluster:
        dev = CLUSTER_SPEC[cluster]["deviations"][0]
        extra = CLUSTER_SPEC[cluster]["extra_concept"]
        label = CLUSTER_DISPLAY[cluster]
        highlights = [
            {"title": f"{CONCEPTS[extra]['title']} 중심으로 결과물 구성",
             "body": f"{label} 공고가 직무 공통 기대치 위에 얹는 요구는 {dev['deviation']} 입니다. "
                      f"완성한 기능 하나에 이 주제를 적용하고 README 첫 절에서 구현 위치와 완료 기준을 먼저 말하세요.",
             "tips": [
                 f"근거 문장과 연결된 코드 경로를 README에 표시: \"{dev['evidence_line']}\"",
                 "재현 명령으로 같은 결과가 나오고 기대 조건을 통과하면 완료로 기록하기",
             ],
             "linked_item_ids": [concept_id(extra)]},
            {"title": "배포 주소와 실패 화면을 같이 보여주기",
             "body": "동작하는 화면 캡처보다 '서버가 죽으면 이 화면은 어떻게 되는가'를 보여주는 기록이 희소합니다. "
                      "배포 URL과 오류 상황 처리 한 쌍이면 직무 공통 기대치 두 항목을 동시에 확인할 수 있습니다.",
             "tips": [
                 "README 최상단에 배포 URL과 핵심 화면 경로를 함께 적기",
                 "API 연결을 끊는 재현 절차, 기대 오류 화면, 복구 뒤 정상 화면을 한 묶음으로 기록하기",
             ],
             "linked_item_ids": [concept_id("deploy-pipeline"), concept_id("error-ux")]},
        ]
        essay = [
            {"kind": "deviation", "title": f"{dev['topic']} 고민 과정을 중심으로 쓰기",
             "body": f"{label} 지원에서는 기술 나열보다 {dev['topic']}에 대한 판단이 먼저 읽힙니다. "
                     f"{dev['deviation']}에 해당하는 경험을 과정 중심으로 쓰세요.",
             "narrative": {"problem": f"{dev['baseline']} 수준에서 부딪힌 문제",
                           "solve": "원인 확인 → 방법 선택 → 적용과 검증",
                            "growth": f"{dev['topic']}을 기능이 아니라 책임으로 보게 된 관점"},
             "sample_sentence": f"\"{dev['deviation']}의 필요성을 문제를 겪고 나서야 알았습니다.\"",
             "tips": ["숫자가 있으면 한 문장으로", "실패한 시도를 지우지 마세요"],
             "linked_item_ids": [concept_id(extra)]},
            {"kind": "narrative_polish", "title": "협업 서사 — 지원 기업군에 맞춰 각도 조정",
              "body": f"같은 경험이라도 {label}에서는 {CLUSTER_SPEC[cluster]['intro_steps'][0]} 쪽으로 방점을 옮기세요. "
                     "사실 관계는 고정하고 배움의 방향만 바꿉니다.",
             "narrative": None, "sample_sentence": None,
             "tips": ["사실은 고정, 강조점만 이동", "결과 수치가 있으면 한 줄로"],
             "linked_item_ids": [concept_id("collab-story")]},
        ]
        interview = []
        for i, d in enumerate(CLUSTER_SPEC[cluster]["deviations"], start=1):
            linked = DEV_TO_CONCEPT.get(d["item_id"], d["item_id"])
            interview.append({
                "kicker": f"추가 요구 {i} 직격 · {d['topic']}",
                "question": f"{d['deviation']}에 해당하는 경험이 있나요?",
                "followups": [f"직무 공통 기대치({d['baseline']})과 비교하면 무엇이 달랐나요?",
                              "다시 한다면 무엇을 다르게 하겠어요?"],
                "point": (
                    f"{d['explanation']} 답변은 선택한 이유 → 판단 기준 → 적용 결과 순서로 구성하고, "
                    "꼬리질문에는 직무 공통 기대치와 달라진 점과 다시 선택할 조건을 설명합니다."
                ),
                "linked_item_ids": [concept_id(linked if linked in CONCEPTS else extra)],
            })
        intro_orders = [o for o in INTRO_ORDERS if o["cluster"] == CLUSTER_DISPLAY[cluster]]
    else:
        highlights = [
            {"title": "기능 하나를 끝까지 — 화면·서버·배포",
             "body": "풀스택 공고 전부가 화면과 서버를 함께 요구합니다. 얕게 여러 개보다 하나를 배포 주소까지 끌고 간 결과물이 강합니다.",
             "tips": [
                 "README 첫 줄에 배포 URL과 핵심 기능 경로를 적고 화면·API 코드 위치를 연결하기",
                 "새 환경에서 실행 명령으로 기능 흐름이 끝까지 완료되면 합격 기준으로 기록하기",
             ],
             "linked_item_ids": [concept_id("e2e-feature"), concept_id("deploy-pipeline")]},
            {"title": "화면과 서버가 같은 타입을 쓴다는 증거",
             "body": "TypeScript 요구가 100%입니다. 요청·응답 타입을 한곳에서 정의해 양쪽이 함께 쓰는 구조를 보여주면 계약 감각이 바로 읽힙니다.",
             "tips": [
                 "공유 타입 파일 위치와 양쪽 import 경로를 README에 연결하기",
                 "타입 변경 전후 오류를 같은 명령으로 재현하고 빌드가 실패를 막으면 완료로 기록하기",
             ],
             "linked_item_ids": [concept_id("api-contract"), concept_id("ts-type-study")]},
        ]
        essay = [
            {"kind": "deviation", "title": "혼자 끝까지 만든 경험을 과정으로 쓰기",
             "body": "풀스택 지원의 공통 서사는 '나눠 맡을 사람이 없을 때 어떻게 했는가' 입니다. 결정과 포기를 함께 쓰세요.",
             "narrative": {"problem": "화면과 서버를 동시에 바꿔야 하는 상황",
                           "solve": "계약을 먼저 정하고 양쪽을 순서대로 고침",
                           "growth": "경계를 정하는 일이 곧 설계라는 관점"},
             "sample_sentence": "\"양쪽을 다 만들 수 있다는 것은 양쪽의 경계를 정할 수 있다는 뜻이라고 배웠습니다.\"",
             "tips": ["기술 이름보다 결정 이유", "포기한 선택지도 한 줄"],
             "linked_item_ids": [concept_id("e2e-feature"), concept_id("collab-story")]},
            {"kind": "narrative_polish", "title": "협업 서사 — 보유 소재 다듬기",
             "body": "이미 있는 협업 경험을 지원 기업군에 맞춰 강조점만 바꾸세요. 사실 관계는 고정합니다.",
             "narrative": None, "sample_sentence": None,
             "tips": ["기업군별 소개 순서표를 참고", "결과 수치 한 줄"],
             "linked_item_ids": [concept_id("collab-story")]},
        ]
        interview = [
            {"kicker": "직무 공통 기대치 검증", "question": "이 기능의 API 응답 형태는 왜 그렇게 정했나요?",
             "followups": ["화면이 바뀌면 응답도 바꿔야 하나요?", "오류는 어떤 형태로 돌려주나요?"],
              "point": "화면 요구 → 응답 구조의 선택 이유 → 타입·테스트로 확인한 결과 순서로 답합니다. 꼬리질문에는 화면 변경 시 계약을 유지하거나 바꿀 판단 기준을 제시합니다.",
             "linked_item_ids": [concept_id("api-contract")]},
            {"kicker": "배포 검증", "question": "배포는 어떻게 하고 있고, 잘못되면 어떻게 되돌리나요?",
             "followups": ["환경 변수는 어디에 두나요?", "배포 후 정상 여부는 무엇으로 확인하나요?"],
              "point": "배포 방식을 고른 이유 → 정상 확인 기준 → 실패 시 되돌린 결과 순서로 답합니다. 꼬리질문에는 환경 변수를 분리한 판단과 복구 시간을 제시합니다.",
             "linked_item_ids": [concept_id("deploy-pipeline")]},
            {"kicker": "기본기 검증", "question": "이 화면을 열면 요청이 어디를 거쳐 무엇을 돌려주나요?",
              "followups": ["느리다면 어디부터 보겠어요?", "그 지점을 먼저 확인하는 판단 기준은 무엇인가요?"],
              "point": "브라우저 → API → 데이터베이스 흐름을 설명하고, 첫 측정 지점을 고른 이유와 확인 결과를 연결합니다.",
             "linked_item_ids": [concept_id("web-fundamentals")]},
        ]
        intro_orders = INTRO_ORDERS
    return {
        "job": JOB_ROLE_ID,
        "scope": scope,
        "checklist": checklist_rows(cluster),
        "portfolio": {"highlights": highlights, "intro_orders": intro_orders},
        "essay": essay,
        "interview": interview,
        "agent_version": AGENT_VERSION,
        "source": "stored",
    }


# ---------------------------------------------------------------- roadmap payload

STEP_OF = {
    "e2e-feature": "STEP 01", "api-contract": "STEP 01",
    "error-ux": "STEP 02", "rdb-schema": "STEP 02",
    "deploy-pipeline": "STEP 03",
    "ts-type-study": "병행", "web-fundamentals": "병행", "db-tx-study": "상시",
}

STUDY_TRACKS = [
    {"cap": "contract_design", "concept": "ts-type-study", "phase": "STEP 01~02와 병행",
     "priority": "vhigh", "title": "타입으로 계약 지키기", "depth": "application",
     "depth_text": "요청·응답 타입을 한곳에 정의해 화면과 서버가 함께 쓰게 만들고, 타입이 막아 준 실수를 예로 들 수 있는 수준까지.",
     "reason": "TypeScript 요구가 100%에 필수율 100%입니다. 계약을 타입으로 적는 습관이 곧 이 직무의 기본 문법입니다."},
    {"cap": "feature_delivery", "concept": "web-fundamentals", "phase": "STEP 01~03과 병행",
     "priority": "high", "title": "웹 기본기 — HTTP·브라우저 렌더링", "depth": "foundation",
     "depth_text": "주소를 입력한 순간부터 화면이 그려질 때까지의 흐름을 그림으로 그리고, 어디가 느려질 수 있는지 짚는 수준까지.",
     "reason": "화면과 서버를 모두 맡으므로 경계 지식이 면접의 단골 검증 지점입니다."},
    {"cap": "ship_operate", "concept": "db-tx-study", "phase": "상시 · 주 3시간", "priority": "mid",
     "title": "데이터베이스 이론 — 인덱스·트랜잭션", "depth": "foundation",
     "depth_text": "인덱스가 조회를 왜 빠르게 하는지, 트랜잭션이 무엇을 지켜 주는지 내 프로젝트 사례로 설명하는 수준까지.",
     "reason": "스키마 항목의 이론 바탕입니다. 특정 단계가 아니라 전 기간에 얇게 깔리는 편이 효율적입니다."},
]


def roadmap_steps(cluster: str | None) -> list[dict[str, Any]]:
    extra = CLUSTER_SPEC[cluster]["extra_concept"] if cluster else None
    label = CLUSTER_DISPLAY[cluster] if cluster else "전체 기준"
    steps = [
        {"n": 1, "phase": "STEP 01 · 3주", "weeks": 3, "priority": "vhigh",
         "title": "기능 하나를 화면부터 서버까지 완성하기",
         "body": "새 프로젝트를 벌이지 말고 이미 만든 화면에 서버와 데이터베이스를 붙이세요. "
                 "요청·응답 타입을 먼저 정하고 그 계약대로 양쪽을 채우면 순서가 꼬이지 않습니다.",
         "deliverable": "동작하는 기능 1건 + 엔드포인트 명세 + 공유 타입 정의",
         "fills": [("e2e-feature", "normal"), ("api-contract", "normal")],
         "reason_title": "왜 첫 번째인가요?",
         "reason": f"{label} 에서도 화면·서버 동시 요구가 100%입니다. 나머지 단계가 모두 이 결과물 위에 얹히므로 여기가 출발점입니다.",
         "tags": ["기능 완성", "타입 공유", "엔드포인트 명세"]},
        {"n": 2, "phase": "STEP 02 · 2주", "weeks": 2, "priority": "vhigh",
         "title": "실패를 다루기 — 오류 응답과 화면 피드백",
         "body": "성공 경로만 있는 기능은 절반입니다. 서버 오류 형태를 정하고 화면에서 무엇을 보여줄지 짝지어 정하세요. "
                 "저장 구조도 이때 함께 정리합니다.",
         "deliverable": "오류 응답 규칙 문서 + 화면 처리 코드 + ERD",
         "fills": [("error-ux", "normal"), ("rdb-schema", "normal")],
         "reason_title": "왜 두 번째인가요?",
         "reason": "실패 처리는 화면과 서버 양쪽에 동시에 걸리는 항목이라 풀스택 지원에서 가장 잘 드러나는 변별점입니다.",
         "tags": ["오류 응답", "화면 피드백", "스키마 정리"]},
        {"n": 3, "phase": "STEP 03 · 2주", "weeks": 2, "priority": "high",
         "title": "배포하고 되돌리기",
         "body": "컨테이너로 빌드해 클라우드에 올리고, 잘못 올렸을 때 되돌리는 절차까지 한 번 밟아 보세요. "
                 "배포 URL이 생기는 순간 포트폴리오의 설득력이 달라집니다.",
         "deliverable": "배포 URL + 배포 설정 파일 + 되돌리기 절차 메모",
         "fills": [("deploy-pipeline", "normal")],
         "reason_title": "왜 세 번째인가요?",
         "reason": "필수율이 이전 1년 0%에서 최근 75%로 오른 항목입니다. 완성된 기능이 있어야 배포할 대상이 생기므로 순서가 여기입니다.",
         "tags": ["컨테이너", "배포 자동화", "되돌리기"]},
    ]
    if extra:
        dev = CLUSTER_SPEC[cluster]["deviations"][0]
        steps.append({
            "n": 4, "phase": "STEP 04 · 2주", "weeks": 2, "priority": "high",
            "title": f"{label} 추가 요구 채우기 — {CONCEPTS[extra]['title']}",
            "body": f"{dev['deviation']}에 해당하는 작업을 완성한 결과물에 덧붙이세요. "
                    f"근거 문장은 \"{dev['evidence_line']}\" 입니다.",
            "deliverable": CONCEPTS[extra]["evidence_needed"],
            "fills": [(extra, "dev")],
            "reason_title": "왜 마지막인가요?",
            "reason": f"직무 공통 기대치 세 단계를 채운 뒤에 얹어야 {label} 지원에서 차이로 읽힙니다. 순서를 뒤집으면 기본기가 비어 보입니다.",
            "tags": [dev["topic"], "추가 요구 대응", "포트폴리오 강조"],
        })
    else:
        steps.append({
            "n": 4, "phase": "STEP 04 · 2주", "weeks": 2, "priority": "mid",
            "title": "협업 기록과 소개 순서 다듬기",
            "body": "변경 단위를 나눠 올린 기록을 정리하고, 지원할 기업군에 맞춰 소개 순서를 재배열하세요.",
            "deliverable": "정리된 커밋·리뷰 기록 + 기업군별 소개 순서 메모",
            "fills": [("collab-story", "normal")],
            "reason_title": "왜 마지막인가요?",
            "reason": "결과물이 있어야 정리할 것이 생깁니다. 기업군을 좁히면 이 단계가 추가 요구 대응으로 바뀝니다.",
            "tags": ["협업 기록", "소개 순서", "마무리"],
        })
    for step in steps:
        step_text = f"{step['title']} {step['body']} {step['deliverable']}"
        missing_titles = [CONCEPTS[slug]["title"] for slug, _kind in step["fills"]
                          if CONCEPTS[slug]["title"] not in step_text]
        if missing_titles:
            step["body"] = (
                f"{step['body']} 채워짐 항목 가운데 {', '.join(missing_titles)}도 "
                "이 단계에서 완료합니다."
            )
    return steps


def roadmap_payload(cluster: str | None) -> dict[str, Any]:
    scope = {"level": "cluster" if cluster else "overall",
             "cluster_tag": CLUSTER_DISPLAY[cluster] if cluster else None, "posting_id": None}
    extra = CLUSTER_SPEC[cluster]["extra_concept"] if cluster else None
    steps = roadmap_steps(cluster)
    project_steps = []
    for step in steps:
        project_steps.append({
            "n": step["n"], "phase": step["phase"], "weeks": step["weeks"],
            "priority": step["priority"], "title": step["title"], "body": step["body"],
            "deliverable": step["deliverable"],
            "fills": [{"item_id": concept_id(slug), "label": CONCEPTS[slug]["title"], "kind": kind}
                      for slug, kind in step["fills"]],
            "reason_title": step["reason_title"], "reason": step["reason"], "tags": step["tags"],
        })
    study = [{
        "phase": t["phase"], "priority": t["priority"], "title": t["title"],
        "depth": t["depth_text"], "reason_title": "왜 필요한가요?", "reason": t["reason"],
        "fills": [{"item_id": concept_id(t["concept"]), "label": CONCEPTS[t["concept"]]["title"],
                   "kind": "study"}],
    } for t in STUDY_TRACKS]

    step_of = dict(STEP_OF)
    if extra:
        step_of[extra] = "STEP 04"
        step_of["collab-story"] = "상시"
    else:
        step_of["collab-story"] = "STEP 04"
    check_rows = []
    for slug in scope_concepts(cluster):
        spec = CONCEPTS[slug]
        is_dev = slug == extra
        check_rows.append({
            "item_id": concept_id(slug), "title": spec["title"],
            "kind": "dev" if is_dev else ("study" if spec["kind"] == "study" else "normal"),
            "is_deviation": is_dev, "dev_n": 1 if is_dev else None,
            "required": spec["required"], "source_step": step_of.get(slug, "상시"),
        })
    return {
        "job": JOB_ROLE_ID, "scope": scope,
        "project_steps": project_steps, "study_tracks": study, "check_rows": check_rows,
        "agent_version": AGENT_VERSION, "source": "stored",
    }


# ---------------------------------------------------------------- 표 조립


def output_id(kind: str, scope: str) -> str:
    return f"out_demo_{JOB_ROLE_ID}_{kind}_{scope}"


def build() -> dict[str, list[dict[str, Any]]]:
    """테이블명 → 행 목록. 데이터베이스에 접속하지 않는다."""
    t: dict[str, list[dict[str, Any]]] = {}

    # -------- 출처·스냅샷·공고
    t["sources"] = [{
        "source_id": source_id(p["nn"]), "source_type": "job_posting", "url": source_url(p),
        "publisher": COMPANY_DISPLAY[p["company"]], "author": None,
        "robots_policy": "allow", "license_note": "생성 데이터. 실제 공고가 아니다.",
        "job_role_ids": [JOB_ROLE_ID], "company_id": p["company"],
        "first_seen_at": f"{p['posted_at']}T09:00:00+09:00",
    } for p in POSTINGS]

    t["source_snapshots"] = [{
        "snapshot_id": snapshot_id(p["nn"]), "source_id": source_id(p["nn"]),
        "content_hash": sha256_hex(raw_content(p)), "raw_content": raw_content(p),
        "published_at": f"{p['posted_at']}T09:00:00+09:00",
        "fetched_at": f"{p['posted_at']}T10:00:00+09:00",
        "dataset_version": DATASET_VERSION, "supersedes_snapshot_id": None,
    } for p in POSTINGS]

    t["source_observations"] = [{
        "observation_id": f"obs_demo_{JOB_ROLE_ID}_{p['nn']}", "snapshot_id": snapshot_id(p["nn"]),
        "observed_at": f"{p['posted_at']}T10:00:00+09:00", "fetch_status": "ok",
        "canonical_url": source_url(p), "http_status": 200, "notes": "생성 데이터",
    } for p in POSTINGS]

    t["source_assessments"] = [{
        "assessment_id": f"sa_demo_{JOB_ROLE_ID}_{p['nn']}", "snapshot_id": snapshot_id(p["nn"]),
        "source_tier": "A", "allowed_uses": list(ALLOWED_USES), "reliability_score": "0.95000",
        "assessment_version": "sa_v1", "assessed_at": f"{p['posted_at']}T10:30:00+09:00",
        "assessed_by_run_id": None,  # agent_runs 는 뒤에 적재되므로 비운다.
    } for p in POSTINGS]

    t["postings"] = [{
        "posting_id": posting_id(p["nn"]), "source_id": source_id(p["nn"]),
        "company_id": p["company"], "job_role_id": JOB_ROLE_ID,
        "first_posted_at": f"{p['posted_at']}T09:00:00+09:00",
    } for p in POSTINGS]

    t["posting_versions"] = [{
        "posting_version_id": posting_version_id(p["nn"]), "posting_id": posting_id(p["nn"]),
        "snapshot_id": snapshot_id(p["nn"]), "title": p["title"],
        "career_label_raw": p["career_raw"], "edu_label_raw": p["edu_raw"],
        "entry_label_raw": p["entry_raw"], "entry_label": p["entry_label"],
        "posted_at": f"{p['posted_at']}T09:00:00+09:00",
        "closed_at": f"{p['closed_at']}T23:59:59+09:00" if p["closed_at"] else None,
        "dataset_version": DATASET_VERSION,
    } for p in POSTINGS]

    t["source_chunks"] = CHUNKS

    # -------- 분류체계·차원·역량
    t["requirement_taxonomies"] = [{"taxonomy_id": TAXONOMY_ID, "job_role_id": JOB_ROLE_ID}]
    t["requirement_taxonomy_versions"] = [{
        "taxonomy_version_id": TAXONOMY_VERSION_ID, "taxonomy_id": TAXONOMY_ID,
        "version_number": 1, "taxonomy_policy_version": POLICY_VERSION,
        "published_at": GENERATED_AT, "superseded_at": None,
    }]
    t["analysis_versions"] = [{
        "analysis_version": ANALYSIS_VERSION, "job_role_id": JOB_ROLE_ID,
        "dataset_version": DATASET_VERSION, "taxonomy_version_id": TAXONOMY_VERSION_ID,
        "knowledge_version": None,  # knowledge_versions 는 뒤에 적재된다.
        "model_version": "stub-deterministic-1", "prompt_version": "prompt_v1",
        "retrieval_policy_version": "rp_v1", "metric_policy_version": "mp_v1_prevalence",
        "scope_spec": {"levels": ["overall", "cluster", "posting"],
                       "clusters": ALL_CLUSTERS, "periods": [RECENT_PERIOD, PREV_PERIOD]},
        "status": "active", "tokens": 0, "cost": "0.0000",
        "started_at": "2026-07-01T08:00:00+09:00", "ended_at": GENERATED_AT,
    }]
    t["agent_runs"] = [{
        "agent_run_id": f"run_demo_{JOB_ROLE_ID}_{name}", "analysis_version": ANALYSIS_VERSION,
        "agent_name": name, "objective_id": f"obj_{JOB_ROLE_ID}_{name}", "iteration": 1,
        "stop_reason": stop, "tokens": 0, "cost": "0.0000",
        "started_at": "2026-07-01T08:00:00+09:00", "ended_at": GENERATED_AT,
    } for name, _label, stop in AGENTS]

    t["requirement_dimensions"] = [{
        "dimension_id": DIM_ID[d["key"]], "taxonomy_id": TAXONOMY_ID, "dimension_kind": d["kind"],
    } for d in DIMENSIONS]
    t["requirement_dimension_versions"] = [{
        "dimension_version_id": f"dv_{JOB_ROLE_ID}_{d['slug']}", "dimension_id": DIM_ID[d["key"]],
        "taxonomy_version_id": TAXONOMY_VERSION_ID, "internal_canonical_label": d["internal"],
        "display_label": d["label"], "definition": d["definition"], "lifecycle_status": "active",
        "standard_mapping_status": "unmapped", "standard_id": None, "mapping_confidence": None,
        "mapping_evidence": {"note": "생성 데이터라 표준 매핑을 붙이지 않는다"},
        "review_status": "approved", "role_boundary_eligible": d["key"] in ("cloud", "rdb"),
    } for d in DIMENSIONS]
    t["requirement_aliases"] = [{
        "alias_id": f"alias_{JOB_ROLE_ID}_{d['slug']}_{i}", "dimension_id": DIM_ID[d["key"]],
        "taxonomy_version_id": TAXONOMY_VERSION_ID, "alias_text": alias, "alias_source": "manual",
    } for d in DIMENSIONS for i, alias in enumerate(d["aliases"], start=1)]
    t["requirement_dimension_relations"] = [{
        "relation_id": f"rel_{JOB_ROLE_ID}_{i}", "taxonomy_version_id": TAXONOMY_VERSION_ID,
        "src_dimension_id": DIM_ID[src], "dst_dimension_id": DIM_ID[dst], "relation_type": kind,
    } for i, (src, dst, kind) in enumerate([
        ("react_ui", "rest_api", "related"),
        ("node_ts", "rest_api", "related"),
        ("rest_api", "rdb", "related"),
        ("node_ts", "cloud", "related"),
    ], start=1)]

    t["capabilities"] = [{
        "capability_id": CAP_ID[c["key"]], "job_role_id": JOB_ROLE_ID,
        "canonical_label": c["label"], "definition": c["definition"], "is_active": True,
    } for c in CAPABILITIES]
    t["capability_dimension_links"] = [{
        "capability_id": CAP_ID[c["key"]], "dimension_id": DIM_ID[dim],
        "taxonomy_version_id": TAXONOMY_VERSION_ID,
    } for c in CAPABILITIES for dim in c["dims"]]

    t["requirement_mentions"] = MENTIONS
    t["chunk_extractions"] = EXTRACTIONS
    t["posting_requirement_assignments"] = ASSIGNMENTS

    t["knowledge_versions"] = [{
        "knowledge_version": KNOWLEDGE_VERSION, "job_role_id": JOB_ROLE_ID,
        "taxonomy_version_id": TAXONOMY_VERSION_ID, "published_at": GENERATED_AT,
    }]

    t["dimension_metric_applicability"] = [{
        "taxonomy_version_id": TAXONOMY_VERSION_ID, "dimension_id": DIM_ID[d["key"]],
        "metric_family": family,
        "applicable": family not in ("scope_expansion", "entry_label_advanced_signal_rate"),
        "reason": "차원 단위로 계산한다" if family not in
                  ("scope_expansion", "entry_label_advanced_signal_rate")
                  else "공고 메타에서 세는 지표라 차원에 붙지 않는다",
    } for d in DIMENSIONS for family in METRIC_POLICY]

    t["statistics_facts"] = FACTS

    t["capability_depth_profiles"] = [{
        "profile_id": f"cdp_demo_{JOB_ROLE_ID}_{c['slug']}", "capability_id": CAP_ID[c["key"]],
        "taxonomy_version_id": TAXONOMY_VERSION_ID, "scope_level": "overall",
        "scope_id": JOB_ROLE_ID, "entry_segment": "all", "period_id": RECENT_PERIOD,
        "depth_distribution": dist, "expected_depth": expected, "sample_size": len(RECENT),
        "evidence_support": {"assignments": sum(1 for a in ASSIGNMENTS
                                                if a["dimension_id"] in [DIM_ID[k] for k in c["dims"]])},
        "confidence": "0.70000", "analysis_version": ANALYSIS_VERSION,
    } for c, dist, expected in zip(
        CAPABILITIES,
        [{"foundation": 0.2, "application": 0.6, "tradeoff": 0.2},
         {"foundation": 0.3, "application": 0.4, "tradeoff": 0.3},
         {"foundation": 0.4, "application": 0.5, "tradeoff": 0.1}],
        ["application", "application", "foundation"])]

    seen_dims: set[str] = set()
    saturation = []
    for i, p in enumerate(POSTINGS, start=1):
        before = len(seen_dims)
        seen_dims |= set(POSTING_DIMS[p["nn"]])
        saturation.append({
            "observation_id": f"sat_demo_{JOB_ROLE_ID}_{p['nn']}",
            "analysis_version": ANALYSIS_VERSION, "job_role_id": JOB_ROLE_ID,
            "scope_id": JOB_ROLE_ID, "posting_count": i,
            "new_candidate_count": len(seen_dims) - before,
            "cumulative_dimension_count": len(seen_dims),
            "marginal_gain": round((len(seen_dims) - before) / i, 6),
            "observed_at": GENERATED_AT,
        })
    t["saturation_observations"] = saturation

    # -------- 그래프 (직무 전용 노드만 만든다. 회사·기업군 노드는 갈래끼리 겹친다)
    nodes, edges = [], []

    def node(node_type: str, ref_table: str, ref_id: str, label: str) -> str:
        node_id = f"kn_{JOB_ROLE_ID}_{ref_id}"
        nodes.append({
            "node_id": node_id, "graph_layer": "semantic", "node_type": node_type,
            "ref_table": ref_table, "ref_id": ref_id, "label": label,
            "ontology_version": ONTOLOGY_VERSION, "dataset_version": DATASET_VERSION,
            "taxonomy_version_id": TAXONOMY_VERSION_ID, "analysis_version": ANALYSIS_VERSION,
        })
        return node_id

    posting_node = {p["nn"]: node("Posting", "postings", posting_id(p["nn"]), p["title"])
                    for p in POSTINGS}
    dim_node = {d["key"]: node("RequirementDimension", "requirement_dimensions",
                               DIM_ID[d["key"]], d["label"]) for d in DIMENSIONS}
    cap_node = {c["key"]: node("Capability", "capabilities", CAP_ID[c["key"]], c["label"])
                for c in CAPABILITIES}

    for assign in ASSIGNMENTS:
        nn = assign["assignment_id"].rsplit("_", 2)[-2]
        dim_key = next(k for k, v in DIM_ID.items() if v == assign["dimension_id"])
        edges.append({
            "edge_id": f"ke_req_{JOB_ROLE_ID}_{assign['assignment_id']}", "graph_layer": "semantic",
            "edge_type": "REQUIRES", "src_node_id": posting_node[nn], "dst_node_id": dim_node[dim_key],
            "weight": "0.90000", "evidence_id": assign["assignment_id"],
            "produced_by_run_id": f"run_demo_{JOB_ROLE_ID}_knowledge",
            "verification_status": "verified", "ontology_version": ONTOLOGY_VERSION,
            "dataset_version": DATASET_VERSION, "taxonomy_version_id": TAXONOMY_VERSION_ID,
            "analysis_version": ANALYSIS_VERSION, "valid_from": GENERATED_AT, "valid_to": None,
        })
    for c in CAPABILITIES:
        for dim in c["dims"]:
            edges.append({
                "edge_id": f"ke_cap_{JOB_ROLE_ID}_{c['slug']}_{DIM_BY_KEY[dim]['slug']}",
                "graph_layer": "semantic", "edge_type": "REQUIRES_CAPABILITY",
                "src_node_id": dim_node[dim], "dst_node_id": cap_node[c["key"]], "weight": "0.85000",
                "evidence_id": f"{CAP_ID[c['key']]}|{DIM_ID[dim]}",
                "produced_by_run_id": f"run_demo_{JOB_ROLE_ID}_knowledge",
                "verification_status": "verified", "ontology_version": ONTOLOGY_VERSION,
                "dataset_version": DATASET_VERSION, "taxonomy_version_id": TAXONOMY_VERSION_ID,
                "analysis_version": ANALYSIS_VERSION, "valid_from": GENERATED_AT, "valid_to": None,
            })
    for src, dst in (("feature_delivery", "contract_design"), ("contract_design", "ship_operate")):
        edges.append({
            "edge_id": f"ke_pre_{JOB_ROLE_ID}_{src}_{dst}", "graph_layer": "semantic",
            "edge_type": "PREREQUISITE_OF", "src_node_id": cap_node[src], "dst_node_id": cap_node[dst],
            "weight": "0.80000", "evidence_id": f"wr_demo_{JOB_ROLE_ID}_{dict(
                (c['key'], c['slug']) for c in CAPABILITIES)[dst]}_1",
            "produced_by_run_id": f"run_demo_{JOB_ROLE_ID}_knowledge",
            "verification_status": "verified_with_warning", "ontology_version": ONTOLOGY_VERSION,
            "dataset_version": DATASET_VERSION, "taxonomy_version_id": TAXONOMY_VERSION_ID,
            "analysis_version": ANALYSIS_VERSION, "valid_from": GENERATED_AT, "valid_to": None,
        })
    t["knowledge_nodes"] = nodes
    t["knowledge_edges"] = edges

    t["graph_paths"] = [{
        "path_id": f"gp_demo_{JOB_ROLE_ID}_{i}", "path_type": "posting_to_capability",
        "node_sequence": [posting_node[nn], dim_node[dim], cap_node[cap]],
        "edge_sequence": [
            next(e["edge_id"] for e in edges if e["edge_type"] == "REQUIRES"
                 and e["src_node_id"] == posting_node[nn] and e["dst_node_id"] == dim_node[dim]),
            f"ke_cap_{JOB_ROLE_ID}_{next(c['slug'] for c in CAPABILITIES if c['key'] == cap)}"
            f"_{DIM_BY_KEY[dim]['slug']}",
        ],
        "taxonomy_version_id": TAXONOMY_VERSION_ID, "knowledge_version": KNOWLEDGE_VERSION,
        "analysis_version": ANALYSIS_VERSION, "graph_policy_version": "gp_v1",
        "computed_at": GENERATED_AT,
    } for i, (nn, dim, cap) in enumerate([
        ("01", "react_ui", "feature_delivery"),
        ("02", "cloud", "ship_operate"),
        ("04", "rdb", "contract_design"),
    ], start=1)]

    # -------- Wiki
    t["wiki_pages"] = [{
        "page_id": f"wp_demo_{JOB_ROLE_ID}_{c['slug']}", "capability_id": CAP_ID[c["key"]],
        "knowledge_version": KNOWLEDGE_VERSION, "status": "published",
    } for c in CAPABILITIES]
    t["wiki_revisions"] = [{
        "revision_id": f"wr_demo_{JOB_ROLE_ID}_{c['slug']}_1",
        "page_id": f"wp_demo_{JOB_ROLE_ID}_{c['slug']}",
        "definition": c["definition"],
        "why_required": f"최근 1년 풀스택 공고에서 {c['label']} 은 "
                        f"{', '.join(DIM_BY_KEY[d]['label'] for d in c['dims'])} 요구로 나타납니다.",
        "depth_criteria": {"foundation": "따라 해 본 수준", "application": "내 프로젝트에 적용해 설명 가능",
                           "tradeoff": "선택지를 비교해 이유를 대는 수준"},
        "prerequisites": [DIM_BY_KEY[d]["label"] for d in c["dims"]],
        "common_misconceptions": ["도구 이름을 아는 것과 계약을 정하는 것은 다르다",
                                  "동작하는 화면이 곧 완성된 기능은 아니다"],
        "interview_verification": ["왜 그 방식을 골랐는지 묻는다", "실패했을 때 어떻게 되는지 묻는다"],
        "learning_sequence": ["기본 문법·개념", "작은 기능에 적용", "선택 이유 설명"],
        "produced_by_run_id": f"run_demo_{JOB_ROLE_ID}_knowledge",
    } for c in CAPABILITIES]
    t["wiki_evidence"] = [{
        "revision_id": f"wr_demo_{JOB_ROLE_ID}_{c['slug']}_1", "field_name": field,
        "chunk_id": f"chunk_demo_{JOB_ROLE_ID}_{nn}_2", "source_tier": "A",
    } for c, nn in zip(CAPABILITIES, ["01", "04", "02"])
        for field in ("why_required", "depth_criteria", "interview_verification")]

    # -------- 산출물 4종 (52행)
    outputs: list[dict[str, Any]] = []

    def add_output(kind: str, output_type: str, agent: str, scope_level: str,
                   scope_id: str, payload: dict[str, Any], slug: str) -> str:
        oid = output_id(kind, slug)
        outputs.append({
            "output_id": oid, "analysis_version": ANALYSIS_VERSION, "job_role_id": JOB_ROLE_ID,
            "scope_level": scope_level, "scope_id": scope_id, "output_type": output_type,
            "payload": payload, "produced_by_agent": agent,
            "verification_status": "verified", "generated_at": GENERATED_AT,
        })
        return oid

    stat_output = add_output("stat", "statistics", "aggregation", "overall", JOB_ROLE_ID,
                             build_statistics_payload(), "overall")
    add_output("intp", "interpretation", "interpretation", "overall", JOB_ROLE_ID,
               interpretation_payload("overall"), "overall")
    cluster_output: dict[str, str] = {}
    for cluster in ALL_CLUSTERS:
        cluster_output[cluster] = add_output(
            "intp", "interpretation", "interpretation", "cluster", cluster,
            interpretation_payload("cluster", cluster), cluster)
    for p in POSTINGS:
        add_output("intp", "interpretation", "interpretation", "posting", posting_id(p["nn"]),
                   interpretation_payload("posting", p["cluster"], p), posting_id(p["nn"]))
    add_output("strat", "strategy", "strategy", "overall", JOB_ROLE_ID,
               strategy_payload(None), "overall")
    add_output("road", "roadmap", "roadmap", "overall", JOB_ROLE_ID,
               roadmap_payload(None), "overall")
    for cluster in ALL_CLUSTERS:
        add_output("strat", "strategy", "strategy", "cluster", cluster,
                   strategy_payload(cluster), cluster)
        add_output("road", "roadmap", "roadmap", "cluster", cluster,
                   roadmap_payload(cluster), cluster)
    t["analysis_outputs"] = outputs

    # -------- 주장과 근거
    claims, claim_evidence = [], []

    def components(evidence_count: int, companies: int, sample: float, coverage: float) -> dict[str, float]:
        return {
            "evidence_count": round(min(1.0, evidence_count / 5), 5),
            "independent_companies": round(min(1.0, companies / 3), 5),
            "source_tier_score": 0.95,
            "sample_status_score": sample,
            "entailment_score": 0.88,
            "contradiction_penalty": 0.0,
            "coverage_score": coverage,
        }

    def add_claim(output: str, claim_type: str, requirement_kind: str | None, scope_level: str,
                  scope_id: str, text: str, slots: dict[str, Any], confidence: str,
                  comps: dict[str, float], evidence: list[tuple[str, str]]) -> None:
        cid = f"claim_demo_{JOB_ROLE_ID}_{len(claims) + 1:06d}"
        claims.append({
            "claim_id": cid, "analysis_version": ANALYSIS_VERSION, "output_id": output,
            "claim_type": claim_type, "requirement_kind": requirement_kind,
            "scope_level": scope_level, "scope_id": scope_id, "claim_text": text,
            "structured_slots": slots, "confidence": confidence,
            "confidence_components": comps, "verification_status": "verified",
        })
        for support_type, support_id in evidence:
            claim_evidence.append({"claim_id": cid, "support_type": support_type,
                                   "support_id": support_id, "relation": "supports",
                                   "weight": "0.90000"})

    for dim in DIMENSIONS:
        key = dim["key"]
        seen = presence(key, RECENT)
        companies = {POSTING_BY_NN[nn]["company"] for nn in seen}
        share = pct(len(seen), len(RECENT))
        chunk_ids = [f"chunk_demo_{JOB_ROLE_ID}_{nn}_2" for nn in seen[:3]]
        add_claim(
            stat_output, "statistic", None, "overall", JOB_ROLE_ID,
            f"최근 1년 풀스택 공고의 {share}%가 {dim['label']} 을 요구한다.",
            {"dimension_id": DIM_ID[key], "period_id": RECENT_PERIOD,
             "numerator": len(seen), "denominator": len(RECENT)},
            "0.90000", components(len(seen), len(companies), 0.9, 1.0),
            [("statistic_fact", prevalence_fact(key))] + [("chunk", c) for c in chunk_ids],
        )

    for cluster in ALL_CLUSTERS:
        group = [p for p in POSTINGS if p["cluster"] == cluster]
        companies = {p["company"] for p in group}
        for dev in CLUSTER_SPEC[cluster]["deviations"]:
            owner = next(p for p in group
                         if any(dev["evidence_line"] == text
                                for section in SECTION_ORDER
                                for text, _k, _d in p["sections"][section]))
            section_idx = next(i for i, section in enumerate(SECTION_ORDER, start=1)
                               if any(text == dev["evidence_line"]
                                      for text, _k, _d in owner["sections"][section]))
            add_claim(
                cluster_output[cluster], "cluster_generalization", "inferred_requirement",
                "cluster", cluster,
                f"{CLUSTER_DISPLAY[cluster]} 공고는 {dev['baseline']} 을 넘어 {dev['deviation']} 을 기대한다.",
                {"topic": dev["topic"], "cluster_id": cluster, "evidence_line": dev["evidence_line"]},
                "0.80000" if dev["confidence"] == "high" else "0.65000",
                components(len(group), len(companies), 0.6, 0.8),
                [("chunk", f"chunk_demo_{JOB_ROLE_ID}_{owner['nn']}_{section_idx}")],
            )
    t["analysis_claims"] = claims
    t["analysis_claim_evidence"] = claim_evidence

    t["coverage_assertions"] = [{
        "assertion_id": f"cov_demo_{JOB_ROLE_ID}_{d['slug']}", "analysis_version": ANALYSIS_VERSION,
        "scope_level": "overall", "scope_id": JOB_ROLE_ID, "dimension_id": DIM_ID[d["key"]],
        "population_n": len(RECENT), "checked_n": len(RECENT),
        "matched_n": len(presence(d["key"], RECENT)),
        "assertion": f"최근 1년 공고 {len(RECENT)}건을 모두 확인했고 {len(presence(d['key'], RECENT))}건에서 "
                     f"{d['label']} 요구를 찾았다.",
        "coverage_complete": True,
    } for d in DIMENSIONS]

    # -------- 체크리스트·로드맵·학습 트랙
    t["checklist_concepts"] = [{
        "concept_id": concept_id(slug), "job_role_id": JOB_ROLE_ID,
        "canonical_title": spec["title"], "kind": spec["kind"],
    } for slug, spec in CONCEPTS.items()]

    checklist_items, roadmap_items, fills, tracks = [], [], [], []
    scopes: list[tuple[str, str, str, str | None]] = [("overall", JOB_ROLE_ID, "overall", None)]
    scopes += [("cluster", c, c, c) for c in ALL_CLUSTERS]
    for scope_level, scope_id, slug, cluster in scopes:
        extra = CLUSTER_SPEC[cluster]["extra_concept"] if cluster else None
        for concept_slug in scope_concepts(cluster):
            spec = CONCEPTS[concept_slug]
            checklist_items.append({
                "item_id": f"ci_demo_{JOB_ROLE_ID}_{slug}_{concept_slug}",
                "concept_id": concept_id(concept_slug), "analysis_version": ANALYSIS_VERSION,
                "scope_level": scope_level, "scope_id": scope_id, "title": spec["title"],
                "subtitle": spec["subtitle"], "reason": spec["reason"],
                "evidence_needed": spec["evidence_needed"], "channels": spec["channels"],
                "required": spec["required"], "is_deviation": concept_slug == extra,
            })
        for step in roadmap_steps(cluster):
            item_id = f"ri_demo_{JOB_ROLE_ID}_{slug}_{step['n']}"
            roadmap_items.append({
                "roadmap_item_id": item_id, "analysis_version": ANALYSIS_VERSION,
                "scope_level": scope_level, "scope_id": scope_id, "step_order": step["n"],
                "phase_label": step["phase"], "weeks": step["weeks"], "priority": step["priority"],
                "title": step["title"], "body": step["body"], "deliverable": step["deliverable"],
                "reason": step["reason"], "tags": step["tags"],
            })
            for concept_slug, kind in step["fills"]:
                fills.append({"roadmap_item_id": item_id, "concept_id": concept_id(concept_slug),
                              "fill_kind": kind})
        for track in STUDY_TRACKS:
            cap = next(c for c in CAPABILITIES if c["key"] == track["cap"])
            tracks.append({
                "track_id": f"st_demo_{JOB_ROLE_ID}_{slug}_{cap['slug']}",
                "analysis_version": ANALYSIS_VERSION, "scope_level": scope_level,
                "scope_id": scope_id, "capability_id": CAP_ID[cap["key"]],
                "phase_label": track["phase"], "priority": track["priority"],
                "depth_reference": track["depth"],
            })
    t["checklist_items"] = checklist_items
    t["roadmap_items"] = roadmap_items
    t["roadmap_item_fills"] = fills
    t["study_tracks"] = tracks

    # -------- 검증 결과. 검사 5·6·7 은 판정자를 주입하지 않아 실행하지 않는다.
    checks = [
        ("check_1_schema", "A0", "pass", "info", None),
        ("check_2_source_policy", "A0", "pass", "info", None),
        ("check_3_evidence_span", "A0", "pass", "info", None),
        ("check_4_numeric_recompute", "A0", "pass", "info", None),
        ("check_5_entailment", "A1", "skip", "info", "NOT_APPLICABLE"),
        ("check_6_cross_model_audit", "A1", "skip", "info", "NOT_APPLICABLE"),
        ("check_7_counterevidence", "A1", "skip", "info", "NOT_APPLICABLE"),
    ]
    t["verification_results"] = [{
        "result_id": f"vr_demo_{JOB_ROLE_ID}_{i:02d}", "analysis_version": ANALYSIS_VERSION,
        "target_type": "analysis_version", "target_id": ANALYSIS_VERSION, "check_name": name,
        "autonomy_level": autonomy, "verdict": verdict, "severity": severity,
        "reason_code": reason, "repair_action": None, "judge_model": None,
        "detail": {"note": "판정자를 주입하지 않아 실행 대상이 아니다" if verdict == "skip"
                   else "생성 데이터에서 결정적으로 재계산해 통과했다"},
    } for i, (name, autonomy, verdict, severity, reason) in enumerate(checks, start=1)]

    t["active_analysis_versions"] = [{
        "job_role_id": JOB_ROLE_ID, "analysis_version": ANALYSIS_VERSION,
        "activated_at": GENERATED_AT,
    }]
    return t


# ---------------------------------------------------------------- 자기검사 8가지


def check_spans(t: dict[str, list[dict[str, Any]]]) -> list[str]:
    """1. evidence_span 으로 자른 청크 본문이 raw_expression 과 같은가."""
    text_by_chunk = {c["chunk_id"]: c["text"] for c in t["source_chunks"]}
    problems = []
    for mention in t["requirement_mentions"]:
        body = text_by_chunk.get(mention["chunk_id"])
        if body is None:
            problems.append(f"{mention['mention_id']}: 청크 없음")
            continue
        sliced = body[mention["evidence_span_start"]:mention["evidence_span_end"]]
        if sliced != mention["raw_expression"]:
            problems.append(f"{mention['mention_id']}: {sliced!r} != {mention['raw_expression']!r}")
    return problems


def check_numbers(t: dict[str, list[dict[str, Any]]]) -> list[str]:
    """2. numerator·denominator 를 할당 행에서 다시 세어 맞춘다."""
    pv_to_posting = {r["posting_version_id"]: r["posting_id"] for r in t["posting_versions"]}
    mention_to_posting = {m["mention_id"]: pv_to_posting[m["posting_version_id"]]
                          for m in t["requirement_mentions"]}
    # (공고, 차원) → 요구도
    pairs: dict[tuple[str, str], str] = {}
    for a in t["posting_requirement_assignments"]:
        pairs[(mention_to_posting[a["mention_id"]], a["dimension_id"])] = a["requiredness"]
    meta = {posting_id(p["nn"]): p for p in POSTINGS}
    by_period = {period: [pid for pid, p in meta.items() if p["period"] == period]
                 for period in (RECENT_PERIOD, PREV_PERIOD)}

    problems = []
    for fact in t["statistics_facts"]:
        family, dim = fact["metric_family"], fact["dimension_id"]
        if family == "posting_prevalence":
            pool = by_period[fact["period_id"]]
            expected = (sum(1 for pid in pool if (pid, dim) in pairs), len(pool))
        elif family == "requiredness_ratio":
            pool = [pid for pid in by_period[fact["period_id"]] if (pid, dim) in pairs]
            expected = (sum(1 for pid in pool if pairs[(pid, dim)] == "required"), len(pool))
        elif family == "cluster_contrast":
            pool = [pid for pid in by_period[fact["period_id"]]
                    if meta[pid]["cluster"] == fact["scope_id"]]
            expected = (sum(1 for pid in pool if (pid, dim) in pairs), len(pool))
        elif family == "cooccurrence":
            pool = by_period[fact["period_id"]]
            second = fact["secondary_dimension_id"]
            expected = (sum(1 for pid in pool if (pid, dim) in pairs and (pid, second) in pairs),
                        len(pool))
        elif family == "scope_expansion":
            tag = fact["measure"].removeprefix("scope_expansion_")
            pool = by_period[fact["period_id"]]
            expected = (sum(1 for pid in pool if tag in meta[pid]["out_of_role_tags"]), len(pool))
        elif family == "entry_label_advanced_signal_rate":
            pool = [pid for pid in by_period[fact["period_id"]]
                    if meta[pid]["entry_label"] == "entry_junior"]
            expected = (sum(1 for pid in pool if meta[pid]["advanced"]), len(pool))
        else:
            problems.append(f"{fact['fact_id']}: 재계산 규칙 없는 지표 {family}")
            continue
        if (fact["numerator"], fact["denominator"]) != expected:
            problems.append(f"{fact['fact_id']}: {fact['numerator']}/{fact['denominator']} != "
                            f"{expected[0]}/{expected[1]}")
    return problems


def check_foreign_keys(t: dict[str, list[dict[str, Any]]]) -> list[str]:
    """3. 외래키 대상이 조각 안이나 마이그레이션 기준 데이터 안에 있는가."""
    ids = {table: {row[TABLE_KEY[table]] for row in rows}
           for table, rows in t.items() if table in TABLE_KEY}
    external = {
        "companies": set(COMPANY_DISPLAY),
        "job_roles": {JOB_ROLE_ID},
        "periods": {RECENT_PERIOD, PREV_PERIOD},
        "company_clusters": set(CLUSTER_DISPLAY),
        "metric_policy_versions": set(METRIC_POLICY.values()),
        "dataset_versions": {DATASET_VERSION},  # A1 이 만든다
    }
    known = {**ids, **external}
    problems = []
    for table, column, target in FOREIGN_KEYS:
        for row in t.get(table, []):
            value = row.get(column)
            if value is None:
                continue
            if value not in known.get(target, set()):
                problems.append(f"{table}.{column} = {value} → {target} 에 없음")
    return problems


def check_payload_keys(t: dict[str, list[dict[str, Any]]]) -> list[str]:
    """4. payload 가 CONTRACT 5장의 키를 전부 갖는가."""
    required = {
        "statistics": {"job", "meta", "kpi", "scope_expansion", "inflation", "trend3", "labels",
                       "advanced", "combos", "reality", "cluster_axes", "tech_freq", "items", "error"},
        "interpretation": {"job", "scope", "baseline", "deviations", "unchanged", "posting",
                           "agent_version", "source"},
        "strategy": {"job", "scope", "checklist", "portfolio", "essay", "interview",
                     "agent_version", "source"},
        "roadmap": {"job", "scope", "project_steps", "study_tracks", "check_rows",
                    "agent_version", "source"},
    }
    meta_keys = {"generated_at", "snapshots", "sources", "disclaimer", "dataset_version",
                 "analysis_version", "is_synthetic"}
    kpi_keys = {"avg_required_skills", "out_of_role_pct", "entry_label_gap_pct",
                "promoted_to_required_cnt", "advanced_mention_pct"}
    problems = []
    counts = {"statistics": 0, "interpretation": 0, "strategy": 0, "roadmap": 0}
    for output in t["analysis_outputs"]:
        payload, kind = output["payload"], output["output_type"]
        counts[kind] += 1
        missing = required[kind] - set(payload)
        if missing:
            problems.append(f"{output['output_id']}: 없는 키 {sorted(missing)}")
        if kind == "statistics":
            if meta_keys - set(payload["meta"]):
                problems.append(f"{output['output_id']}: meta 키 부족")
            if kpi_keys - set(payload["kpi"]):
                problems.append(f"{output['output_id']}: kpi 키 부족")
            axes = payload["cluster_axes"]["axes"]
            if len(axes) != 5:
                problems.append(f"{output['output_id']}: cluster_axes.axes 가 5개가 아니다")
        if kind == "interpretation":
            if not 7 <= len(payload["baseline"]) <= 9:
                problems.append(f"{output['output_id']}: baseline 개수 {len(payload['baseline'])}")
            if payload["scope"]["level"] != "overall" and not 2 <= len(payload["deviations"]) <= 4:
                problems.append(f"{output['output_id']}: deviations 개수 {len(payload['deviations'])}")
    expected_counts = {"statistics": 1, "interpretation": 37, "strategy": 7, "roadmap": 7}
    if counts != expected_counts:
        problems.append(f"산출물 개수 {counts} != {expected_counts}")
    return problems


def check_concepts(t: dict[str, list[dict[str, Any]]]) -> list[str]:
    """5. checklist_items.concept_id 와 payload 의 item_id 가 맞는가."""
    concept_ids = {c["concept_id"] for c in t["checklist_concepts"]}
    by_scope: dict[tuple[str, str], set[str]] = {}
    for item in t["checklist_items"]:
        by_scope.setdefault((item["scope_level"], item["scope_id"]), set()).add(item["concept_id"])
    problems = []
    for item in t["checklist_items"]:
        if item["concept_id"] not in concept_ids:
            problems.append(f"{item['item_id']}: 개념 {item['concept_id']} 없음")
    for output in t["analysis_outputs"]:
        key = (output["scope_level"], output["scope_id"])
        stored = by_scope.get(key, set())
        payload = output["payload"]
        if output["output_type"] == "strategy":
            used = {c["item_id"] for c in payload["checklist"]}
            if used != stored:
                problems.append(f"{output['output_id']}: 체크리스트 {sorted(used - stored)} / "
                                f"{sorted(stored - used)}")
            linked = {i for card in payload["portfolio"]["highlights"] + payload["essay"]
                      for i in card["linked_item_ids"]}
            linked |= {i for card in payload["interview"] for i in card["linked_item_ids"]}
            if linked - stored:
                problems.append(f"{output['output_id']}: 연결 항목이 범위 밖 {sorted(linked - stored)}")
        if output["output_type"] == "roadmap":
            used = {r["item_id"] for r in payload["check_rows"]}
            fills = {f["item_id"] for step in payload["project_steps"] for f in step["fills"]}
            fills |= {f["item_id"] for track in payload["study_tracks"] for f in track["fills"]}
            if used != stored:
                problems.append(f"{output['output_id']}: check_rows {sorted(used ^ stored)}")
            if fills - stored:
                problems.append(f"{output['output_id']}: fills 범위 밖 {sorted(fills - stored)}")
    stored_fill_ids = {f["concept_id"] for f in t["roadmap_item_fills"]}
    if stored_fill_ids - concept_ids:
        problems.append(f"roadmap_item_fills 개념 누락 {sorted(stored_fill_ids - concept_ids)}")
    return problems


def check_posting_population(t: dict[str, list[dict[str, Any]]]) -> list[str]:
    """6. 공고 수·기간·기업군·진입 구분과 차원 승격 표본이 계약에 맞는가."""
    problems: list[str] = []
    expected_clusters = set(CLUSTER_DISPLAY)
    period_spec = {
        RECENT_PERIOD: (18, "2026-01-01", "2026-06-30", {"entry_junior": 10, "experienced": 8}),
        PREV_PERIOD: (12, "2024-03-01", "2025-11-30", {"entry_junior": 6, "experienced": 6}),
    }
    if len(POSTINGS) != 30 or len(t["postings"]) != 30:
        problems.append(f"공고 수 {len(POSTINGS)}/{len(t['postings'])} != 30/30")
    expected_ids = {posting_id(f"{n:02d}") for n in range(1, 31)}
    actual_ids = {row["posting_id"] for row in t["postings"]}
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
            if not starts_on <= p["posted_at"] <= ends_on:
                problems.append(f"{p['nn']}: 게시일 {p['posted_at']} 범위 밖")

    recent_cluster_counts = {
        cluster: sum(1 for p in RECENT if p["cluster"] == cluster)
        for cluster in CLUSTER_DISPLAY
    }
    if set(recent_cluster_counts.values()) != {3}:
        problems.append(f"recent 기업군 분포 {recent_cluster_counts} != 기업군별 3건")
    prev_cluster_counts = {
        cluster: sum(1 for p in PREV if p["cluster"] == cluster)
        for cluster in CLUSTER_DISPLAY
    }
    if set(prev_cluster_counts.values()) != {2}:
        problems.append(f"prev 기업군 분포 {prev_cluster_counts} != 기업군별 2건")

    open_postings = [p for p in POSTINGS if p["closed_at"] is None]
    closed_postings = [p for p in POSTINGS if p["closed_at"] is not None]
    if len(open_postings) != 6 or len(closed_postings) != 24:
        problems.append(
            f"진행/마감 {len(open_postings)}/{len(closed_postings)} != 6/24"
        )
    if any(p["closed_at"] is None for p in PREV):
        problems.append("prev 공고에 진행 중 상태가 있다")
    recent_open = sum(p["closed_at"] is None for p in RECENT)
    if recent_open != 6:
        problems.append(f"recent 진행 중 {recent_open}건 != 6건")
    for p in closed_postings:
        if p["closed_at"] <= p["posted_at"]:
            problems.append(f"{p['nn']}: 마감일 {p['closed_at']} <= 게시일 {p['posted_at']}")

    for dim in DIMENSIONS:
        companies = {
            p["company"] for p in POSTINGS if dim["key"] in POSTING_DIMS[p["nn"]]
        }
        if len(companies) < 2:
            problems.append(f"{dim['key']}: 독립 회사 {len(companies)}곳")
    return problems


def check_output_population(t: dict[str, list[dict[str, Any]]]) -> list[str]:
    """7. 모듈 산출물 52행과 전체 공고 해석 30행이 정확히 짝을 이루는가."""
    outputs = t["analysis_outputs"]
    problems: list[str] = []
    counts = {
        kind: sum(1 for row in outputs if row["output_type"] == kind)
        for kind in ("statistics", "interpretation", "strategy", "roadmap")
    }
    expected = {"statistics": 1, "interpretation": 37, "strategy": 7, "roadmap": 7}
    if len(outputs) != 52 or counts != expected:
        problems.append(f"산출물 {len(outputs)}행, 종류별 {counts} != 52행, {expected}")
    posting_interpretations = {
        row["scope_id"] for row in outputs
        if row["output_type"] == "interpretation" and row["scope_level"] == "posting"
    }
    posting_ids = {posting_id(p["nn"]) for p in POSTINGS}
    if posting_interpretations != posting_ids:
        problems.append(
            f"공고 해석 범위 차이 {sorted(posting_interpretations ^ posting_ids)}"
        )
    return problems


def check_direct_contract_values(t: dict[str, list[dict[str, Any]]]) -> list[str]:
    """8. 모듈이 직접 담는 출처·기간·대상군·데이터셋·회사 값을 행마다 확인한다."""
    problems: list[str] = []
    allowed_use_values = {
        "statistics", "interpretation_context", "strategy", "roadmap",
        "wiki_definition", "wiki_why_required", "wiki_depth_criteria", "wiki_prerequisites",
        "wiki_common_misconceptions", "wiki_interview_verification", "wiki_learning_sequence",
    }
    default_uses = {"statistics", "interpretation_context", "strategy", "roadmap"}
    for row in t["source_assessments"]:
        uses = set(row["allowed_uses"])
        if not uses <= allowed_use_values:
            problems.append(f"{row['assessment_id']}: 허용되지 않은 allowed_uses {sorted(uses - allowed_use_values)}")
        if uses != default_uses:
            problems.append(f"{row['assessment_id']}: 데모 공고 기본 allowed_uses 아님")
        if (row["source_tier"], str(row["reliability_score"]), row["assessment_version"]) != (
            "A", "0.95000", "sa_v1"
        ):
            problems.append(f"{row['assessment_id']}: 출처 평가 기본값 불일치")

    for row in t["statistics_facts"]:
        if row["period_id"] not in {RECENT_PERIOD, PREV_PERIOD}:
            problems.append(f"{row['fact_id']}: 허용되지 않은 기간 {row['period_id']}")
        if row["metric_family"] == "entry_label_advanced_signal_rate":
            if row["entry_segment"] != "entry_junior":
                problems.append(f"{row['fact_id']}: entry_segment {row['entry_segment']}")

    if t.get("dataset_versions"):
        problems.append("fullstack 모듈이 dataset_versions 행을 만들었다")
    for row in t["postings"]:
        if row["company_id"] not in COMPANY_DISPLAY:
            problems.append(f"{row['posting_id']}: 기준 데이터에 없는 회사 {row['company_id']}")
    return problems


TABLE_KEY = {
    "sources": "source_id", "source_snapshots": "snapshot_id", "postings": "posting_id",
    "posting_versions": "posting_version_id", "source_chunks": "chunk_id",
    "requirement_taxonomies": "taxonomy_id",
    "requirement_taxonomy_versions": "taxonomy_version_id",
    "analysis_versions": "analysis_version", "agent_runs": "agent_run_id",
    "requirement_dimensions": "dimension_id", "capabilities": "capability_id",
    "requirement_mentions": "mention_id", "knowledge_versions": "knowledge_version",
    "statistics_facts": "fact_id", "knowledge_nodes": "node_id",
    "analysis_outputs": "output_id", "analysis_claims": "claim_id",
    "checklist_concepts": "concept_id", "roadmap_items": "roadmap_item_id",
    "wiki_pages": "page_id", "wiki_revisions": "revision_id",
}

FOREIGN_KEYS: tuple[tuple[str, str, str], ...] = (
    ("sources", "company_id", "companies"),
    ("source_snapshots", "source_id", "sources"),
    ("source_snapshots", "dataset_version", "dataset_versions"),
    ("source_observations", "snapshot_id", "source_snapshots"),
    ("source_assessments", "snapshot_id", "source_snapshots"),
    ("postings", "source_id", "sources"),
    ("postings", "company_id", "companies"),
    ("postings", "job_role_id", "job_roles"),
    ("posting_versions", "posting_id", "postings"),
    ("posting_versions", "snapshot_id", "source_snapshots"),
    ("source_chunks", "snapshot_id", "source_snapshots"),
    ("requirement_taxonomies", "job_role_id", "job_roles"),
    ("requirement_taxonomy_versions", "taxonomy_id", "requirement_taxonomies"),
    ("analysis_versions", "taxonomy_version_id", "requirement_taxonomy_versions"),
    ("analysis_versions", "metric_policy_version", "metric_policy_versions"),
    ("analysis_versions", "dataset_version", "dataset_versions"),
    ("agent_runs", "analysis_version", "analysis_versions"),
    ("requirement_dimensions", "taxonomy_id", "requirement_taxonomies"),
    ("requirement_dimension_versions", "dimension_id", "requirement_dimensions"),
    ("requirement_dimension_versions", "taxonomy_version_id", "requirement_taxonomy_versions"),
    ("requirement_aliases", "dimension_id", "requirement_dimensions"),
    ("requirement_dimension_relations", "src_dimension_id", "requirement_dimensions"),
    ("requirement_dimension_relations", "dst_dimension_id", "requirement_dimensions"),
    ("capabilities", "job_role_id", "job_roles"),
    ("capability_dimension_links", "capability_id", "capabilities"),
    ("capability_dimension_links", "dimension_id", "requirement_dimensions"),
    ("requirement_mentions", "posting_version_id", "posting_versions"),
    ("requirement_mentions", "snapshot_id", "source_snapshots"),
    ("requirement_mentions", "chunk_id", "source_chunks"),
    ("requirement_mentions", "extraction_run_id", "agent_runs"),
    ("chunk_extractions", "chunk_id", "source_chunks"),
    ("chunk_extractions", "extraction_run_id", "agent_runs"),
    ("posting_requirement_assignments", "mention_id", "requirement_mentions"),
    ("posting_requirement_assignments", "dimension_id", "requirement_dimensions"),
    ("posting_requirement_assignments", "taxonomy_version_id", "requirement_taxonomy_versions"),
    ("knowledge_versions", "taxonomy_version_id", "requirement_taxonomy_versions"),
    ("dimension_metric_applicability", "dimension_id", "requirement_dimensions"),
    ("statistics_facts", "analysis_version", "analysis_versions"),
    ("statistics_facts", "dimension_id", "requirement_dimensions"),
    ("statistics_facts", "secondary_dimension_id", "requirement_dimensions"),
    ("statistics_facts", "metric_policy_version", "metric_policy_versions"),
    ("statistics_facts", "period_id", "periods"),
    ("capability_depth_profiles", "capability_id", "capabilities"),
    ("capability_depth_profiles", "period_id", "periods"),
    ("capability_depth_profiles", "analysis_version", "analysis_versions"),
    ("saturation_observations", "analysis_version", "analysis_versions"),
    ("saturation_observations", "job_role_id", "job_roles"),
    ("knowledge_nodes", "analysis_version", "analysis_versions"),
    ("knowledge_edges", "src_node_id", "knowledge_nodes"),
    ("knowledge_edges", "dst_node_id", "knowledge_nodes"),
    ("knowledge_edges", "produced_by_run_id", "agent_runs"),
    ("graph_paths", "knowledge_version", "knowledge_versions"),
    ("graph_paths", "analysis_version", "analysis_versions"),
    ("wiki_pages", "capability_id", "capabilities"),
    ("wiki_pages", "knowledge_version", "knowledge_versions"),
    ("wiki_revisions", "page_id", "wiki_pages"),
    ("wiki_revisions", "produced_by_run_id", "agent_runs"),
    ("wiki_evidence", "revision_id", "wiki_revisions"),
    ("wiki_evidence", "chunk_id", "source_chunks"),
    ("analysis_outputs", "analysis_version", "analysis_versions"),
    ("analysis_outputs", "job_role_id", "job_roles"),
    ("analysis_claims", "analysis_version", "analysis_versions"),
    ("analysis_claims", "output_id", "analysis_outputs"),
    ("analysis_claim_evidence", "claim_id", "analysis_claims"),
    ("coverage_assertions", "analysis_version", "analysis_versions"),
    ("coverage_assertions", "dimension_id", "requirement_dimensions"),
    ("checklist_concepts", "job_role_id", "job_roles"),
    ("checklist_items", "concept_id", "checklist_concepts"),
    ("checklist_items", "analysis_version", "analysis_versions"),
    ("roadmap_items", "analysis_version", "analysis_versions"),
    ("roadmap_item_fills", "roadmap_item_id", "roadmap_items"),
    ("roadmap_item_fills", "concept_id", "checklist_concepts"),
    ("study_tracks", "analysis_version", "analysis_versions"),
    ("study_tracks", "capability_id", "capabilities"),
    ("verification_results", "analysis_version", "analysis_versions"),
    ("active_analysis_versions", "job_role_id", "job_roles"),
    ("active_analysis_versions", "analysis_version", "analysis_versions"),
)

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
