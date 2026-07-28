"""차원 후보의 승격 심사와 결정 기록.

규칙은 docs/statistics-model.md 3.4 이고, 결정이 들어가는 자리는 docs/erd.md 7.9
`requirement_candidate_decisions` 다. 후보 행의 컬럼은 docs/erd.md 7.7 이며 판정
맥락 두 컬럼의 근거는 docs/adr/0011-candidate-judgment-context.md 다.

심사 규칙은 순수 함수다. `judge_candidate` 는 값 하나(`CandidateEvidence`)와 정책
하나(`PromotionPolicy`)를 받아 판정(`CandidateDecision`)을 돌려주며 저장소도 생성
모델도 부르지 않는다. 저장소는 그 값을 채워 넣는 역할만 한다. 규칙을 값 위에 두면
같은 근거에 같은 판정이 나오고, 임계값을 바꾼 뒤에도 이전 결정을 그대로 재현할 수
있다.

임계값은 상수가 아니라 `taxonomy_policy_version` 이 정한다. 근거는
docs/statistics-model.md 3.4 와 docs/adr/0001-taxonomy-promotion.md 다. 임계값을
코드 상수로 두면 값을 바꾼 순간 이전 결정의 근거가 사라진다.

승격 심사는 A 계층 자료만 센다. 독립 공고 수와 독립 회사 수의 모집단이
`posting_versions` 이므로(docs/metric-spec.md 2.1) 공고로 등록되지 않은 출처는 어느
쪽에도 들어가지 않는다. 세는 경로는 `PromotionRepository` 가 SQL 로 고정한다.

심사 단위는 후보 하나가 아니라 라벨 묶음이다. 후보는 표현의 매칭 키로 갈리고
(`taxonomy/discovery.py` 의 `candidate_identifier`), 매칭 키는 표기 변형만 모으고
개념을 합치지 않는다(`taxonomy/vocabulary.py` 의 `normalize_expression`). 그래서
`3년 이상의 Java 서버 개발 경험` 과 `Java 기반 백엔드 개발 경험` 은 서로 다른 후보이며,
후보마다 독립 공고를 세면 둘 다 1 에 머물러 영원히 보류된다.

묶는 기준은 `proposed_label` 이다. 관계 판정이 이미 개념 이름을 짓기 때문이다
(docs/statistics-model.md 3.2 와 `agents/statistics/judge.py` 의 프롬프트가 회사 이름,
연차, 우대·필수 같은 조건 표현을 이름에서 뺀다). 두 표현이 같은 개념이면 같은 이름을
받고, 그 이름을 `normalize_expression` 으로 정규화한 키가 묶음의 키가 된다.

후보 행을 지우거나 합치지 않는다. 후보는 어느 표현에서 나왔는지의 기록이며 계보다.
묶는 것은 심사 단계의 판단이고 후보마다 자기 결정 행이
`requirement_candidate_decisions` 에 남는다.

이 모듈은 판정까지 하고 `hold` 와 `reject` 결정만 기록한다. `promote` 와 `merge`
결정은 새 분류체계 버전이 있어야 성립하므로(`promoted_to_version_id`)
`careersignal.taxonomy.publication` 이 발행과 같은 거래에서 기록한다.
"""

from __future__ import annotations

import hashlib
from collections.abc import Sequence
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.repositories.promotion import PromotionRepository
from careersignal.taxonomy import lifecycle
from careersignal.taxonomy.vocabulary import normalize_expression

PROMOTE = "promote"
HOLD = "hold"
REJECT = "reject"
MERGE = "merge"

DECISIONS: tuple[str, ...] = (PROMOTE, HOLD, REJECT, MERGE)
"""docs/erd.md 7.9 의 `decision` CHECK 와 같은 집합이다."""

SYNONYM = "synonym"
"""후보가 기존 차원의 다른 표기다. 별칭으로 접는다."""

NEW_CONCEPT = "none"
"""기존 차원으로 설명되지 않는다. 신규 차원이 된다."""

RELATION_TYPES: tuple[str, ...] = ("broader", "narrower", "related")
"""docs/erd.md 7.6 의 `relation_type` CHECK 와 같은 집합이다.

`requirement_candidates.relation_judgment` 의 다섯 값 가운데 관계 테이블에 그대로
들어가는 셋이다. 나머지 둘(`synonym`·`none`)은 관계가 아니라 별칭과 신규 차원이다.
"""

UNMAPPED = "unmapped"
"""표준 연결이 없는 상태. docs/statistics-model.md 4장이 정상 상태로 규정한다."""

ROUTE_NEW_DIMENSION = "new_dimension"
"""`requirement_dimensions` 와 `requirement_dimension_versions` 에만 쓴다."""

ROUTE_RELATION = "relation"
"""신규 차원을 만들고 `requirement_dimension_relations` 에 관계를 더한다."""

ROUTE_ALIAS = "alias"
"""차원을 만들지 않고 `requirement_aliases` 에 표기만 더한다."""

ROUTE_NONE = "none"
"""아무 표에도 쓰지 않는다. `hold` 와 `reject` 의 경로다."""

EVAL_MATCHED = "matched"
"""평가 세트의 기대 차원 라벨과 같은 이름이 있다."""

EVAL_ABSENT = "absent"
"""평가 세트가 이 이름을 다루지 않는다. 대조 결과가 없는 상태다."""

EVAL_CONFLICTING = "conflicting"
"""평가 세트는 별개 차원으로 두는데 판정은 기존 차원의 동의어로 본다."""

EVAL_STATUSES: tuple[str, ...] = (EVAL_MATCHED, EVAL_ABSENT, EVAL_CONFLICTING)

DECIDED_BY_AGENT = "agent_stats"
"""승인 주체. 통계 분석 에이전트가 심사한다."""

REPRESENTATIVE_LIMIT = 5
"""결정에 남기는 대표 문장 수. 근거를 읽을 만큼만 담고 전량을 복사하지 않는다."""

REASON_NO_LABEL = "후보 라벨이 비어 있다"
REASON_DANGLING_RELATION = "관계 판정이 가리키는 기존 차원이 없다"
REASON_UNRELATED_TARGET = "관계 판정이 none 인데 기존 차원을 가리킨다"
REASON_MISSING_NEAREST = "판정이 가리킨 차원이 활성 분류체계 버전에 없다"
REASON_EVAL_CONFLICT = "평가 세트가 별개 차원으로 두는 이름이다"
REASON_NO_EVIDENCE = "대표 문장이 없다"
REASON_FEW_POSTINGS = "독립 공고 수가 임계값에 못 미친다"
REASON_SINGLE_COMPANY = "한 회사에서만 나타난다"
REASON_FEW_COMPANIES = "독립 회사 수가 임계값에 못 미친다"
REASON_ALIAS = "기존 차원의 다른 표기다"
REASON_RELATION = "기존 차원과 관계를 갖는 별개 개념이다"
REASON_NEW_DIMENSION = "기존 차원으로 설명되지 않는다"
REASON_GROUP_ALIAS = "같은 개념 이름의 대표 후보가 만든 차원에 붙인다"
REASON_ALIAS_CONFLICT = "같은 표기가 이미 다른 차원에 붙어 있다"
REASON_NO_ALIAS_TARGET = "표기를 붙일 차원이 새 버전에 없다"

UNGROUPED_PREFIX = "cand:"
"""묶이지 않는 후보의 묶음 키 접두사.

라벨을 정규화한 키가 비면 묶을 근거가 없다. 기호만 남은 이름을 한 묶음으로 모으면
서로 무관한 후보가 한 대표 아래 접힌다. 그런 후보는 후보 식별자를 키로 삼아 자기
혼자 있는 묶음이 되고 개별로 심사받는다.
"""

NO_ACTIVE_TAXONOMY = "활성 분류체계 버전이 없다"
"""직무에 발행된 분류체계 버전이 없다."""

TAXONOMY_MISMATCH = "실행 봉투의 분류체계 버전이 활성 버전과 다르다"
"""봉투가 고정한 버전과 저장소의 활성 버전이 어긋났다.

그대로 심사하면 서로 다른 버전 기준의 판정이 한 결정 집합에 섞인다. 근거는
docs/statistics-model.md 3.5 다.
"""

UNKNOWN_POLICY = "등록되지 않은 승격 정책 버전이다"
"""활성 버전이 적은 정책 버전을 코드가 모른다. 임계값을 지어내지 않는다."""


class PromotionPolicy(BaseModel):
    """승격 임계값 한 벌.

    정책 버전 하나가 임계값 전부를 정한다. 값을 바꾸려면 새 정책 버전을 등록하고
    새 분류체계 버전이 그 버전을 적는다. 이전 결정 행의
    `taxonomy_policy_version` 이 그대로 남으므로 옛 판정의 근거가 보존된다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    taxonomy_policy_version: str
    min_independent_postings: int = Field(ge=1)
    """승격에 필요한 독립 공고 수. 세는 단위는 `postings.posting_id` 다."""

    min_independent_companies: int = Field(ge=1)
    """승격에 필요한 독립 회사 수. 세는 단위는 `companies.company_id` 다."""


POLICY_V1 = PromotionPolicy(
    taxonomy_policy_version="tp_v1",
    min_independent_postings=2,
    min_independent_companies=2,
)
"""백엔드 분류체계 v1 의 정책. `0002_seed_reference.sql` 이 적은 값과 같다.

임계값을 낮게 잡는다. 공고 30건 규모에서 높은 임계값은 어휘를 하나도 승격하지
못하게 하고, 회사 둘이라는 조건이 한 회사의 특징을 차원으로 올리는 것을 막는다.
근거는 docs/statistics-model.md 3.4 다.
"""

POLICIES: dict[str, PromotionPolicy] = {POLICY_V1.taxonomy_policy_version: POLICY_V1}
"""등록된 정책 버전. 분류체계 버전이 적은 값을 여기서 찾는다."""


def policy_for(taxonomy_policy_version: str) -> PromotionPolicy:
    """분류체계 버전이 적은 정책 버전의 임계값.

    등록되지 않은 버전은 예외다. 기본값으로 넘어가면 어떤 임계값으로 심사했는지
    결정 행만 보고 알 수 없다.
    """
    policy = POLICIES.get(taxonomy_policy_version)
    if policy is None:
        raise KeyError(f"{UNKNOWN_POLICY}: {taxonomy_policy_version}")
    return policy


class EvalComparison(BaseModel):
    """평가 세트 대조 결과. `requirement_candidate_decisions.eval_set_comparison` 이다.

    평가 세트의 기대 차원은 분류체계 버전과 독립적인 사람 기준이며 승격 심사의
    채점 기준이 된다(docs/knowledge-schema.md 12장). 세트 파일의 `status` 가
    `draft` 여도 대조에 쓴다. 대조는 판정의 근거를 남기는 일이고, 릴리스 게이트
    판정은 별도 단위다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    eval_set_id: str | None = None
    status: str = EVAL_ABSENT
    matched_labels: tuple[str, ...] = ()
    is_draft: bool = True
    """세트가 아직 사람 확정 전인가. 대조를 막지 않고 기록만 한다."""

    @field_validator("status")
    @classmethod
    def _known_status(cls, v: str) -> str:
        if v not in EVAL_STATUSES:
            raise ValueError(f"평가 대조 결과가 아니다: {v!r}")
        return v

    def as_json(self) -> dict[str, Any]:
        """jsonb 컬럼에 넣을 값."""
        return {
            "eval_set_id": self.eval_set_id,
            "status": self.status,
            "matched_labels": list(self.matched_labels),
            "is_draft": self.is_draft,
        }


class CandidateEvidence(BaseModel):
    """후보 하나에 대해 심사가 읽는 값 전부.

    저장소가 채운다. 심사 규칙은 이 값만 보고 판정하며 다시 조회하지 않는다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    candidate_id: str
    proposed_label: str
    lifecycle_status: str = lifecycle.PROPOSED
    relation_judgment: str = NEW_CONCEPT
    nearest_dimension_id: str | None = None
    nearest_label: str | None = None
    """활성 버전에서 읽은 상대 차원의 표시 라벨. 비면 그 차원이 활성 버전에 없다."""

    judged_against_taxonomy_version_id: str | None = None
    """관계 판정이 어느 분류체계 버전을 기준으로 나왔는가."""

    judgment_rationale: str = ""
    """발견이 남긴 판정 근거. 심사가 읽는 문장이다."""

    proposed_dimension_kind: str | None = None
    """판정이 고른 차원 종류. 값 집합은 docs/erd.md 7.3 이며 비어 있을 수 있다."""

    independent_posting_count: int = 0
    """묶음 전체의 독립 공고 수. 후보 하나가 아니라 라벨 묶음에서 센 값이다."""

    independent_company_count: int = 0
    """묶음 전체의 독립 회사 수."""

    representative_sentences: tuple[str, ...] = ()
    standard_mapping_status: str = UNMAPPED
    eval_comparison: EvalComparison = EvalComparison()
    verification_result_id: str | None = None

    @property
    def distance_to_existing(self) -> float | None:
        """후보 라벨과 상대 차원 라벨의 표기 거리."""
        return label_distance(self.proposed_label, self.nearest_label)

    @property
    def alias_expression(self) -> str | None:
        """이 후보를 차원에 붙일 표기. 근거 문장 가운데 첫 문장이다.

        후보 이름이 아니라 공고에 실제로 쓰인 표현을 별칭으로 삼는다. 묶음 안의
        후보들은 이름이 같으므로(그래서 한 묶음이다) 이름을 별칭으로 쓰면 서로
        충돌하고, 다음 실행의 기지 추출이 원문 표기를 여전히 맞히지 못한다.

        근거 문장은 `mention_id` 순으로 고정되어 있어(`PromotionRepository` 의
        `_REPRESENTATIVE_SENTENCES`) 재실행이 같은 표기를 고른다.
        """
        return self.representative_sentences[0] if self.representative_sentences else None


class CandidateDecision(BaseModel):
    """후보 하나의 판정. 결정 행과 실행 결과 요약을 겸한다."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    candidate_id: str
    proposed_label: str
    decision: str
    reason: str
    route: str
    taxonomy_policy_version: str
    relation_judgment: str = NEW_CONCEPT
    nearest_dimension_id: str | None = None
    independent_posting_count: int = 0
    independent_company_count: int = 0
    judgment_rationale: str = ""
    judged_against_taxonomy_version_id: str | None = None
    proposed_dimension_kind: str | None = None
    """판정이 고른 차원 종류. 발행이 새 차원에 옮긴다. 비면 발행이 기본값을 쓴다."""

    group_key: str = ""
    """이 후보가 속한 라벨 묶음의 키. 어느 묶음의 심사였는지 남긴다."""

    alias_of_candidate_id: str | None = None
    """묶음의 대표 후보. 이 값이 있으면 대표가 만든 차원에 표기를 붙인다.

    대표가 신규 차원을 만들면 그 차원이 붙일 곳이고, 대표가 기존 차원의 동의어로
    접히면 `nearest_dimension_id` 가 가리키는 그 기존 차원이 붙일 곳이다. 어느 쪽인지는
    발행 시점에 갈린다.
    """

    alias_text: str | None = None
    """별칭으로 등록할 표기. 비면 후보 이름을 쓴다."""

    @field_validator("decision")
    @classmethod
    def _known_decision(cls, v: str) -> str:
        if v not in DECISIONS:
            raise ValueError(f"승격 판정 값이 아니다: {v!r}")
        return v

    @property
    def enters_taxonomy(self) -> bool:
        """새 분류체계 버전에 무언가를 쓰는 판정인가."""
        return self.decision in (PROMOTE, MERGE)

    @property
    def target_lifecycle(self) -> str:
        """이 판정이 후보를 데려가는 생명주기 상태."""
        if self.decision == PROMOTE:
            return lifecycle.ACTIVE
        if self.decision == MERGE:
            return lifecycle.MERGED
        if self.decision == REJECT:
            return lifecycle.DEPRECATED
        return lifecycle.COLLECTING_EVIDENCE


class LabelGroup(BaseModel):
    """같은 개념 이름으로 묶인 후보 한 벌.

    묶음이 심사의 단위다. 독립 공고 수와 독립 회사 수는 묶음 전체에서 세고, 대표
    후보 하나가 차원이 되며 나머지는 그 차원의 표기가 된다.
    """

    model_config = ConfigDict(frozen=True, extra="forbid")

    group_key: str
    """`proposed_label` 을 `normalize_expression` 으로 정규화한 값."""

    member_ids: tuple[str, ...]
    """묶음의 후보. 근거 mention 이 많은 차례이며 같으면 식별자 사전 순이다."""

    @property
    def representative_id(self) -> str:
        """묶음의 대표 후보. 근거가 가장 두꺼운 후보다."""
        return self.member_ids[0]

    @property
    def size(self) -> int:
        return len(self.member_ids)


# ============================================================ 순수 규칙
def label_group_key(proposed_label: str, candidate_id: str) -> str:
    """후보가 속하는 묶음의 키.

    관계 판정이 지은 개념 이름을 정규화한다. 표기 변형만 모으는 정규화이지만
    (`normalize_expression`) 이름은 이미 개념 단위이므로, 같은 개념의 두 후보가
    같은 이름을 받으면 같은 키가 된다.

    이름이 기호뿐이라 키가 비면 후보 식별자로 자기 혼자인 묶음을 만든다. 빈 키를
    공유하게 두면 서로 무관한 후보가 한 대표 아래로 접힌다.
    """
    key = normalize_expression(proposed_label)
    return key or f"{UNGROUPED_PREFIX}{candidate_id}"


def choose_representative(members: Sequence[tuple[str, int]]) -> str:
    """묶음의 대표 후보. `(candidate_id, mention_count)` 를 받는다.

    근거 mention 이 가장 많은 후보이고 같으면 `candidate_id` 사전 순으로 가른다.
    두 기준 모두 실행에 의존하지 않으므로 다시 심사해도 같은 후보가 대표가 되고,
    대표가 만드는 `dimension_id` 도 흔들리지 않는다(`dimension_identifier` 가 후보
    식별자로 차원을 만든다).
    """
    return min(members, key=lambda item: (-item[1], item[0]))[0]


def group_candidates(
    rows: Sequence[dict[str, Any]], mention_counts: dict[str, int]
) -> tuple[LabelGroup, ...]:
    """심사 대상 후보를 라벨 묶음으로 가른다. 저장소를 부르지 않는 순수 함수다.

    묶음의 차례는 키의 사전 순이고 묶음 안의 차례는 대표 규칙과 같다. 근거가 없는
    후보의 mention 수는 0 으로 본다.
    """
    grouped: dict[str, list[tuple[str, int]]] = {}
    for row in rows:
        candidate_id = row["candidate_id"]
        key = label_group_key(row.get("proposed_label") or "", candidate_id)
        grouped.setdefault(key, []).append(
            (candidate_id, mention_counts.get(candidate_id, 0))
        )
    return tuple(
        LabelGroup(
            group_key=key,
            member_ids=tuple(
                candidate_id
                for candidate_id, _ in sorted(
                    members, key=lambda item: (-item[1], item[0])
                )
            ),
        )
        for key, members in sorted(grouped.items())
    )


def _bigrams(key: str) -> frozenset[str]:
    """매칭 키의 두 글자 조각. 언어를 가리지 않는다."""
    if len(key) < 2:
        return frozenset({key}) if key else frozenset()
    return frozenset(key[i : i + 2] for i in range(len(key) - 1))


def label_distance(label: str, nearest_label: str | None) -> float | None:
    """후보 라벨과 상대 차원 라벨의 거리. `distance_to_existing` 에 넣는다.

    두 글자 조각이 겹치는 비율의 여집합이며 0 과 1 사이다. 상대 차원이 없으면
    비운다.

    표기 거리이지 의미 거리가 아니다. 판정의 기준으로 쓰지 않고 결정 행에 기록만
    한다. 같은 개념인지의 판정은 관계 판정의 몫이며 근거는
    docs/statistics-model.md 3.2 다.
    """
    if nearest_label is None:
        return None
    left = _bigrams(normalize_expression(label))
    right = _bigrams(normalize_expression(nearest_label))
    if not left or not right:
        return 1.0
    return round(1.0 - len(left & right) / len(left | right), 5)


def compare_with_eval_set(
    proposed_label: str,
    relation_judgment: str,
    expected_labels: tuple[str, ...],
    eval_set_id: str | None = None,
    is_draft: bool = True,
) -> EvalComparison:
    """후보 라벨을 평가 세트의 기대 차원 라벨과 대조한다.

    사람이 별개 차원으로 둔 이름을 판정이 기존 차원의 동의어로 접으면 대조 결과가
    어긋난다. 이 경우 별칭으로 접지 않고 보류해 사람이 본다. 어긋남을 기각으로
    두지 않는 이유는 후보 자체가 틀린 것이 아니라 판정이 틀렸을 수 있기 때문이다.

    세트에 없는 이름은 어긋남이 아니다. 평가 세트는 전량을 담지 않으며 `absent`
    가 정상 상태다.
    """
    key = normalize_expression(proposed_label)
    matched = tuple(
        text for text in expected_labels if normalize_expression(text) == key
    )
    if not matched:
        status = EVAL_ABSENT
    elif relation_judgment == SYNONYM:
        status = EVAL_CONFLICTING
    else:
        status = EVAL_MATCHED
    return EvalComparison(
        eval_set_id=eval_set_id,
        status=status,
        matched_labels=matched,
        is_draft=is_draft,
    )


def _integrity_failure(evidence: CandidateEvidence) -> str | None:
    """결정 행으로 남길 수 없는 후보를 가른다."""
    if not evidence.proposed_label.strip():
        return REASON_NO_LABEL
    if evidence.relation_judgment == NEW_CONCEPT:
        if evidence.nearest_dimension_id is not None:
            return REASON_UNRELATED_TARGET
        return None
    if not evidence.nearest_dimension_id:
        return REASON_DANGLING_RELATION
    return None


def judge_candidate(
    evidence: CandidateEvidence, policy: PromotionPolicy, group_key: str = ""
) -> CandidateDecision:
    """후보 하나를 심사한다. 저장소를 부르지 않는 순수 함수다.

    판정 차례가 의미를 갖는다.

    1. 결정 행으로 남길 수 없는 후보를 기각한다. 라벨이 비었거나 관계 판정과 상대
       차원이 짝을 이루지 못하는 행이다.
    2. 판정이 가리킨 차원이 활성 버전에 없으면 보류한다. 판정이 다른 버전을 기준으로
       나왔고 그 사이 상대 차원이 사라진 경우이며, 그대로 쓰면 외래키가 가리키는
       차원과 집계에 쓰이는 어휘가 어긋난다.
    3. 평가 세트가 별개 차원으로 두는 이름을 동의어로 접지 않고 보류한다.
    4. 대표 문장이 없으면 보류한다. 근거를 읽을 수 없는 승격을 하지 않는다.
    5. 독립 공고 수가 임계값에 못 미치면 보류한다.
    6. 독립 회사 수가 임계값에 못 미치면 보류한다. 한 회사에서만 나타나는 표현은
       차원이 아니라 그 회사의 특징이며 편차 해석이 다룬다.
    7. 임계값을 넘긴 후보를 판정별 경로로 보낸다. 동의어는 별칭(`merge`), 상하위와
       관련은 신규 차원과 관계(`promote`), 해당 없음은 신규 차원(`promote`)이다.

    보류와 기각을 가르는 기준은 근거가 더 쌓여 결론이 바뀔 수 있는지다. 임계값
    미달은 다음 데이터셋에서 채워질 수 있으므로 보류이고, 짝이 맞지 않는 판정은
    근거가 쌓여도 그대로이므로 기각이다.
    """
    failure = _integrity_failure(evidence)
    if failure is not None:
        return _decision(evidence, policy, REJECT, failure, ROUTE_NONE, group_key)

    if evidence.nearest_dimension_id and evidence.nearest_label is None:
        return _decision(
            evidence, policy, HOLD, REASON_MISSING_NEAREST, ROUTE_NONE, group_key
        )

    if evidence.eval_comparison.status == EVAL_CONFLICTING:
        return _decision(
            evidence, policy, HOLD, REASON_EVAL_CONFLICT, ROUTE_NONE, group_key
        )

    if not evidence.representative_sentences:
        return _decision(
            evidence, policy, HOLD, REASON_NO_EVIDENCE, ROUTE_NONE, group_key
        )

    if evidence.independent_posting_count < policy.min_independent_postings:
        return _decision(
            evidence, policy, HOLD, REASON_FEW_POSTINGS, ROUTE_NONE, group_key
        )

    if evidence.independent_company_count < policy.min_independent_companies:
        reason = (
            REASON_SINGLE_COMPANY
            if evidence.independent_company_count <= 1
            else REASON_FEW_COMPANIES
        )
        return _decision(evidence, policy, HOLD, reason, ROUTE_NONE, group_key)

    if evidence.relation_judgment == SYNONYM:
        return _decision(
            evidence, policy, MERGE, REASON_ALIAS, ROUTE_ALIAS, group_key
        )
    if evidence.relation_judgment in RELATION_TYPES:
        return _decision(
            evidence, policy, PROMOTE, REASON_RELATION, ROUTE_RELATION, group_key
        )
    return _decision(
        evidence,
        policy,
        PROMOTE,
        REASON_NEW_DIMENSION,
        ROUTE_NEW_DIMENSION,
        group_key,
    )


def judge_group(
    group: LabelGroup,
    evidence: dict[str, CandidateEvidence],
    policy: PromotionPolicy,
) -> tuple[CandidateDecision, ...]:
    """묶음 하나를 심사한다. 저장소를 부르지 않는 순수 함수다.

    차례가 의미를 갖는다.

    1. 결정 행으로 남길 수 없는 후보를 먼저 기각한다. 라벨이 비었거나 관계 판정과
       상대 차원이 짝을 이루지 못하는 행이며, 이것은 후보마다의 성질이라 묶음의
       판단을 기다리지 않는다.
    2. 남은 후보 가운데 첫째가 대표다. 묶음의 차례가 이미 근거 mention 수와 식별자
       사전 순으로 정해져 있으므로, 결격 후보를 뺀 뒤에도 대표는 결정적이다.
    3. 대표를 `judge_candidate` 로 심사한다. 대표가 읽는 독립 공고 수와 독립 회사
       수는 묶음 전체에서 센 값이므로, 표기가 갈린 후보들의 근거가 여기서 합쳐진다.
    4. 대표가 분류체계에 들어가지 못하면 묶음 전체가 대표와 같은 판정을 받는다.
       임계값은 묶음 전체의 값이라 후보마다 다시 견줘도 결과가 같고, 하나만 보류하고
       나머지를 승격하면 같은 개념이 차원 여럿으로 갈린다.
    5. 대표가 들어가면 나머지는 `merge` 다. 각 후보의 대표 표현이 대표 후보가
       데려간 차원의 별칭이 된다. 붙일 표기가 없는 후보는 보류한다. 별칭을 만들 수
       없는 후보를 `merged` 로 끝내면 그 후보의 근거가 어디에도 닿지 않는다.
    """
    decisions: list[CandidateDecision] = []
    sound: list[str] = []
    for candidate_id in group.member_ids:
        item = evidence[candidate_id]
        failure = _integrity_failure(item)
        if failure is not None:
            decisions.append(
                _decision(item, policy, REJECT, failure, ROUTE_NONE, group.group_key)
            )
            continue
        sound.append(candidate_id)

    if not sound:
        return tuple(decisions)

    lead_id = sound[0]
    lead = judge_candidate(evidence[lead_id], policy, group.group_key)
    decisions.insert(0, lead)

    for candidate_id in sound[1:]:
        item = evidence[candidate_id]
        if not lead.enters_taxonomy:
            decisions.append(
                _decision(
                    item, policy, lead.decision, lead.reason, ROUTE_NONE, group.group_key
                )
            )
            continue
        alias_text = item.alias_expression
        if alias_text is None:
            decisions.append(
                _decision(
                    item,
                    policy,
                    HOLD,
                    REASON_NO_EVIDENCE,
                    ROUTE_NONE,
                    group.group_key,
                )
            )
            continue
        decisions.append(
            _decision(
                item,
                policy,
                MERGE,
                REASON_GROUP_ALIAS,
                ROUTE_ALIAS,
                group.group_key,
                alias_of_candidate_id=lead_id,
                nearest_dimension_id=lead.nearest_dimension_id,
                alias_text=alias_text,
            )
        )
    return tuple(decisions)


def hold_alias(
    decision: CandidateDecision, reason: str = REASON_ALIAS_CONFLICT
) -> CandidateDecision:
    """표기를 쓰지 못한 `merge` 판정을 보류로 내린다.

    `requirement_aliases` 는 `UNIQUE (taxonomy_version_id, alias_text)` 이므로 한
    표기는 버전 안에서 한 차원에만 붙는다(docs/erd.md 7.5). 먼저 자리를 잡은 쪽이
    남고 뒤에 온 쪽은 보류다. 기각이 아닌 이유는 다음 버전에서 앞선 표기가 사라지면
    결론이 바뀔 수 있기 때문이다.

    보류로 내리면 후보의 생명주기도 `merged` 로 끝나지 않는다. 종료 상태로 보내 놓고
    별칭을 쓰지 못하면 그 후보의 근거가 어느 차원에도 닿지 않는다.
    """
    return decision.model_copy(
        update={"decision": HOLD, "reason": reason, "route": ROUTE_NONE}
    )


def _decision(
    evidence: CandidateEvidence,
    policy: PromotionPolicy,
    decision: str,
    reason: str,
    route: str,
    group_key: str = "",
    alias_of_candidate_id: str | None = None,
    nearest_dimension_id: str | None = None,
    alias_text: str | None = None,
) -> CandidateDecision:
    return CandidateDecision(
        candidate_id=evidence.candidate_id,
        proposed_label=evidence.proposed_label,
        decision=decision,
        reason=reason,
        route=route,
        taxonomy_policy_version=policy.taxonomy_policy_version,
        relation_judgment=evidence.relation_judgment,
        nearest_dimension_id=nearest_dimension_id or evidence.nearest_dimension_id,
        independent_posting_count=evidence.independent_posting_count,
        independent_company_count=evidence.independent_company_count,
        judgment_rationale=evidence.judgment_rationale,
        judged_against_taxonomy_version_id=(
            evidence.judged_against_taxonomy_version_id
        ),
        proposed_dimension_kind=evidence.proposed_dimension_kind,
        group_key=group_key,
        alias_of_candidate_id=alias_of_candidate_id,
        alias_text=alias_text,
    )


def decision_identifier(candidate_id: str, agent_run_id: str) -> str:
    """같은 실행의 같은 후보는 같은 결정이다.

    실행을 다시 돌려도 결정 행이 늘어나지 않는다. 기본키가 중복 삽입을 막는다.
    """
    material = f"{candidate_id}:{agent_run_id}".encode()
    return f"dec_{hashlib.sha256(material).hexdigest()[:24]}"


def decision_row(
    decision: CandidateDecision,
    evidence: CandidateEvidence,
    agent_run_id: str,
    promoted_to_version_id: str | None = None,
) -> dict[str, Any]:
    """저장할 결정 한 줄. 컬럼은 docs/erd.md 7.9 다.

    `promoted_to_version_id` 는 `decision` 이 `promote` 이면 반드시 있어야 한다.
    CHECK 제약이 같은 것을 강제한다.

    `decided_by` 에 실행 식별자를 붙인다. 결정 행에 실행 컬럼이 없으므로 어느
    실행이 판정했는지 남길 자리가 여기뿐이다.
    """
    return {
        "decision_id": decision_identifier(decision.candidate_id, agent_run_id),
        "candidate_id": decision.candidate_id,
        "decision": decision.decision,
        "independent_posting_count": decision.independent_posting_count,
        "independent_company_count": decision.independent_company_count,
        "representative_sentences": list(evidence.representative_sentences),
        "distance_to_existing": evidence.distance_to_existing,
        "standard_mapping_status": evidence.standard_mapping_status,
        "relation_judgment": decision.relation_judgment,
        "eval_set_comparison": evidence.eval_comparison.as_json(),
        "verification_result_id": evidence.verification_result_id,
        "decided_by": f"{DECIDED_BY_AGENT}:{agent_run_id}",
        "taxonomy_policy_version": decision.taxonomy_policy_version,
        "promoted_to_version_id": promoted_to_version_id,
    }


# ============================================================ 실행
class ReviewOutcome(BaseModel):
    """심사 실행 하나의 결과."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    agent_run_id: str
    stop_reason: StopReason
    taxonomy_version_id: str | None = None
    taxonomy_id: str | None = None
    taxonomy_policy_version: str | None = None

    reviewed: int = 0
    """이번 실행이 판정한 후보 수."""

    recorded: int = 0
    """이 실행이 저장한 결정 행 수. `promote` 와 `merge` 는 발행이 저장한다."""

    stale_judgments: int = 0
    """활성 버전이 아닌 버전을 기준으로 판정된 후보 수."""

    groups: tuple[LabelGroup, ...] = ()
    """이번 실행이 만든 라벨 묶음. 후보 수와의 차이가 묶기의 성과다."""

    counts: dict[str, int] = Field(default_factory=dict)
    """판정별 후보 수. 네 값 가운데 나온 것만 담는다."""

    decisions: tuple[CandidateDecision, ...] = ()
    evidence: tuple[CandidateEvidence, ...] = ()
    """판정마다 읽은 근거. 결정 행을 채울 때 다시 조회하지 않으려고 함께 남긴다."""

    errors: tuple[tuple[str, str], ...] = ()
    """심사 전제의 실패와 후보별 실패. `(대상, 사유)` 다."""

    @property
    def promotable(self) -> tuple[CandidateDecision, ...]:
        """새 분류체계 버전에 들어갈 판정만 추린다."""
        return tuple(d for d in self.decisions if d.enters_taxonomy)

    @property
    def evidence_by_id(self) -> dict[str, CandidateEvidence]:
        """후보 식별자로 찾는 근거."""
        return {item.candidate_id: item for item in self.evidence}

    @property
    def grouped_candidates(self) -> int:
        """묶음에 들어간 후보 수. `len(groups)` 와 견주면 묶기의 폭이 보인다."""
        return sum(group.size for group in self.groups)

    @property
    def gained_evidence(self) -> bool:
        return bool(self.promotable)


class CandidateReview:
    """후보를 라벨 묶음으로 모아 심사하고 보류·기각 결정을 기록한다.

    임계값은 활성 분류체계 버전의 `taxonomy_policy_version` 이 정한다. 실행마다
    정책을 조회하므로 정책 버전이 바뀌면 다음 실행부터 새 임계값이 적용되고 이전
    결정 행은 옛 정책 버전을 그대로 담는다.

    묶음 하나가 심사의 단위다. 독립 공고 수와 독립 회사 수를 묶음 전체에서 한 번 세고
    묶음의 후보 모두가 그 수를 읽는다. 결정 행은 후보마다 하나씩 남으므로 어느 표현이
    어떤 판정을 받았는지의 기록은 갈리지 않는다.
    """

    def __init__(self, repository: PromotionRepository) -> None:
        self._repository = repository

    def run(self, context: RunContext, limit: int | None = None) -> ReviewOutcome:
        """심사 대상을 소진할 때까지 묶음 단위로 판정한다.

        한 묶음의 실패가 나머지를 막지 않는다. 이미 종결 판정을 받은 후보는
        저장소가 대상에서 뺀다.
        """
        active = self._repository.active_taxonomy_version(context.job_role_id)
        if active is None:
            return self._halted(context, NO_ACTIVE_TAXONOMY)

        taxonomy_version_id = active["taxonomy_version_id"]
        if (
            context.taxonomy_version_id is not None
            and context.taxonomy_version_id != taxonomy_version_id
        ):
            return self._halted(context, TAXONOMY_MISMATCH, active)

        try:
            policy = policy_for(active["taxonomy_policy_version"])
        except KeyError:
            return self._halted(context, UNKNOWN_POLICY, active)

        expected = self._repository.expected_dimension_labels(context.job_role_id)
        rows = self._repository.candidates_to_review(
            active["taxonomy_id"], taxonomy_version_id, limit
        )
        by_id = {row["candidate_id"]: row for row in rows}
        groups = group_candidates(
            rows,
            self._repository.candidate_mention_counts(
                tuple(by_id), context.dataset_version
            ),
        )

        decisions: list[CandidateDecision] = []
        gathered: list[CandidateEvidence] = []
        errors: list[tuple[str, str]] = []
        counts: dict[str, int] = {}
        recorded = 0
        stale = 0

        for group in groups:
            try:
                evidence = self._group_evidence(context, group, by_id, expected)
                judged = judge_group(group, evidence, policy)
                for decision in judged:
                    if not decision.enters_taxonomy:
                        self._record(context, decision, evidence[decision.candidate_id])
                        recorded += 1
            except Exception as exc:
                errors.append((group.group_key, f"{type(exc).__name__}: {exc}"))
                continue

            for decision in judged:
                item = evidence[decision.candidate_id]
                decisions.append(decision)
                gathered.append(item)
                counts[decision.decision] = counts.get(decision.decision, 0) + 1
                judged_against = item.judged_against_taxonomy_version_id
                if judged_against is not None and judged_against != taxonomy_version_id:
                    stale += 1

        return ReviewOutcome(
            agent_run_id=context.agent_run_id,
            stop_reason=_stop_reason(
                rows=rows,
                decisions=decisions,
                errors=bool(errors),
            ),
            taxonomy_version_id=taxonomy_version_id,
            taxonomy_id=active["taxonomy_id"],
            taxonomy_policy_version=policy.taxonomy_policy_version,
            reviewed=len(decisions),
            recorded=recorded,
            stale_judgments=stale,
            groups=groups,
            counts=counts,
            decisions=tuple(decisions),
            evidence=tuple(gathered),
            errors=tuple(errors),
        )

    # ------------------------------------------------------------ 근거 수집
    def _group_evidence(
        self,
        context: RunContext,
        group: LabelGroup,
        by_id: dict[str, dict[str, Any]],
        expected: dict[str, Any],
    ) -> dict[str, CandidateEvidence]:
        """묶음의 후보마다 근거를 붙인다.

        독립 공고 수와 독립 회사 수는 묶음 전체에서 한 번만 세고 모든 후보가 같은
        값을 읽는다. 후보마다 세면 표기가 갈린 근거가 나뉘어 어느 쪽도 임계값을 넘지
        못한다. 대표 문장은 후보마다 따로 읽는다. 결정 행이 후보마다 남고, 어느
        표현에서 나온 판정인지가 그 문장에서 보인다.
        """
        counted = self._repository.group_evidence(
            group.member_ids, context.dataset_version
        )
        return {
            candidate_id: self._evidence(
                context, by_id[candidate_id], expected, counted
            )
            for candidate_id in group.member_ids
        }

    def _evidence(
        self,
        context: RunContext,
        row: dict[str, Any],
        expected: dict[str, Any],
        counted: dict[str, int],
    ) -> CandidateEvidence:
        """후보 한 줄에 근거를 붙인다. 세는 일은 전부 저장소가 SQL 로 한다."""
        sentences = self._repository.representative_sentences(
            row["candidate_id"], context.dataset_version, REPRESENTATIVE_LIMIT
        )
        relation = row.get("relation_judgment") or NEW_CONCEPT
        return CandidateEvidence(
            candidate_id=row["candidate_id"],
            proposed_label=row["proposed_label"],
            lifecycle_status=row["lifecycle_status"],
            relation_judgment=relation,
            nearest_dimension_id=row.get("nearest_dimension_id"),
            nearest_label=row.get("nearest_label"),
            judged_against_taxonomy_version_id=row.get(
                "judged_against_taxonomy_version_id"
            ),
            judgment_rationale=row.get("judgment_rationale") or "",
            proposed_dimension_kind=row.get("proposed_dimension_kind"),
            independent_posting_count=counted["independent_posting_count"],
            independent_company_count=counted["independent_company_count"],
            representative_sentences=tuple(sentences),
            eval_comparison=compare_with_eval_set(
                row["proposed_label"],
                relation,
                tuple(expected.get("labels", ())),
                expected.get("eval_set_id"),
                bool(expected.get("is_draft", True)),
            ),
        )

    def _record(
        self,
        context: RunContext,
        decision: CandidateDecision,
        evidence: CandidateEvidence,
    ) -> None:
        """보류와 기각 결정을 저장하고 후보의 생명주기를 옮긴다.

        두 판정은 분류체계 버전을 요구하지 않으므로 발행을 기다리지 않는다.
        """
        self._repository.add_decision(
            decision_row(decision, evidence, context.agent_run_id)
        )
        target = decision.target_lifecycle
        if lifecycle.path_to(evidence.lifecycle_status, target):
            self._repository.set_candidate_lifecycle(decision.candidate_id, target)

    # ------------------------------------------------------------ 실패
    def _halted(
        self,
        context: RunContext,
        reason: str,
        active: dict[str, Any] | None = None,
    ) -> ReviewOutcome:
        """심사 전제가 깨진 결과. 근거 없음과 구분한다."""
        found = active or {}
        return ReviewOutcome(
            agent_run_id=context.agent_run_id,
            stop_reason=StopReason.EXPLICIT_FAILURE,
            taxonomy_version_id=found.get("taxonomy_version_id"),
            taxonomy_id=found.get("taxonomy_id"),
            errors=((context.job_role_id, reason),),
        )


def _stop_reason(
    rows: list[dict[str, Any]],
    decisions: list[CandidateDecision],
    errors: bool,
) -> StopReason:
    """docs/agent-design.md 11.1의 종료 조건을 판정한다.

    순서가 의미를 갖는다. 심사가 깨진 실행을 근거 없음으로 볼 수 없고, 전부
    보류한 실행을 승격으로 볼 수 없다.
    """
    if errors:
        return StopReason.EXPLICIT_FAILURE
    if not rows:
        return StopReason.FRONTIER_EXHAUSTED
    if any(d.enters_taxonomy for d in decisions):
        return StopReason.SLOTS_FILLED
    return StopReason.NO_NEW_EVIDENCE


__all__ = [
    "DECIDED_BY_AGENT",
    "DECISIONS",
    "EVAL_ABSENT",
    "EVAL_CONFLICTING",
    "EVAL_MATCHED",
    "EVAL_STATUSES",
    "HOLD",
    "MERGE",
    "NEW_CONCEPT",
    "NO_ACTIVE_TAXONOMY",
    "POLICIES",
    "POLICY_V1",
    "PROMOTE",
    "REASON_ALIAS",
    "REASON_ALIAS_CONFLICT",
    "REASON_DANGLING_RELATION",
    "REASON_EVAL_CONFLICT",
    "REASON_FEW_COMPANIES",
    "REASON_FEW_POSTINGS",
    "REASON_GROUP_ALIAS",
    "REASON_MISSING_NEAREST",
    "REASON_NO_ALIAS_TARGET",
    "REASON_NEW_DIMENSION",
    "REASON_NO_EVIDENCE",
    "REASON_NO_LABEL",
    "REASON_RELATION",
    "REASON_SINGLE_COMPANY",
    "REASON_UNRELATED_TARGET",
    "REJECT",
    "RELATION_TYPES",
    "REPRESENTATIVE_LIMIT",
    "ROUTE_ALIAS",
    "ROUTE_NEW_DIMENSION",
    "ROUTE_NONE",
    "ROUTE_RELATION",
    "SYNONYM",
    "TAXONOMY_MISMATCH",
    "UNGROUPED_PREFIX",
    "UNKNOWN_POLICY",
    "UNMAPPED",
    "CandidateDecision",
    "CandidateEvidence",
    "CandidateReview",
    "EvalComparison",
    "LabelGroup",
    "PromotionPolicy",
    "ReviewOutcome",
    "choose_representative",
    "compare_with_eval_set",
    "decision_identifier",
    "decision_row",
    "group_candidates",
    "hold_alias",
    "judge_candidate",
    "judge_group",
    "label_distance",
    "label_group_key",
    "policy_for",
]
