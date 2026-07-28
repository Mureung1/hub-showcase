"""분류체계 버전 발행과 차원 생명주기.

절차는 docs/statistics-model.md 3.3·3.4·3.5 이고, 저장 자리는 docs/erd.md 7.2~7.6
이다. 승격 심사는 `careersignal.taxonomy.promotion` 이 하고 이 모듈은 그 판정을
분류체계 버전 하나로 굳힌다.

발행은 이전 활성 버전을 supersede 하고 새 버전을 넣는 한 거래다. 부분 유니크
인덱스가 직무마다 활성 버전을 하나로 강제하므로(docs/erd.md 7.2) 두 문장의 차례가
의미를 갖고, 거래가 끊기면 둘 다 되돌아간다.

승계가 발행의 절반이다. `requirement_dimension_versions` 는
`(dimension_id, taxonomy_version_id)` 가 UNIQUE 이므로 버전마다 행이 하나씩 있어야
한다. 이전 버전에서 이어지는 차원에 새 버전 행을 만들지 않으면 그 차원이 활성
어휘에서 사라지고, 다음 발견이 이미 확정된 차원을 다시 후보로 만든다. 별칭과 관계도
버전을 갖는 행이므로 같은 규칙을 따른다.

차원의 정체성(`requirement_dimensions`)은 버전을 갖지 않는다. 라벨이 바뀌어도
`dimension_id` 는 유지되며 버전마다 달라지는 것은
`requirement_dimension_versions` 의 라벨·정의·생명주기다.

`standard_mapping_status` 는 `unmapped` 으로 시작한다. 표준 문서가 최신 기술 어휘를
담지 못하므로 이 상태가 정상이다(docs/statistics-model.md 4장). `standard_id` 를
비운 채 다른 상태를 적으면 CHECK 제약을 어긴다.
"""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict

from careersignal.contracts.run_context import RunContext, StopReason
from careersignal.repositories.promotion import PromotionRepository
from careersignal.taxonomy import lifecycle
from careersignal.taxonomy.promotion import (
    ROUTE_ALIAS,
    ROUTE_RELATION,
    UNMAPPED,
    CandidateDecision,
    CandidateReview,
    ReviewOutcome,
    decision_row,
)
from careersignal.taxonomy.vocabulary import normalize_expression

DEFAULT_DIMENSION_KIND = "practice"
"""승격이 만드는 차원의 종류. docs/erd.md 7.3 의 CHECK 값 가운데 하나다.

후보 행은 종류를 담지 않는다. 다섯 값 가운데 요구의 성격을 가장 적게 특정하는
값으로 시작하고, 종류 판정은 별도 단위로 둔다. 종류를 지어내 `technology` 로 적으면
`Technology` 그래프 노드가 기술이 아닌 요구에서 만들어진다.
"""

REVIEW_STATUS = "promoted"
"""`requirement_dimension_versions.review_status`. 승격 심사를 통과했다는 기록이다.

이 컬럼에는 CHECK 가 없다(docs/erd.md 7.4). 값의 집합은 사람이 검토를 붙이는
시점에 정한다.
"""

ALIAS_SOURCE = "discovered"
"""`requirement_aliases.alias_source`. 자료에서 발견한 표기다."""

DISCOVERED_DEFINITION = "발견 근거에서 확인한 요구다. 정의는 검토에서 다듬는다"
"""정의가 없는 차원의 `definition`. NOT NULL 컬럼을 빈 문자열로 채우지 않는다."""


def taxonomy_version_identifier(taxonomy_id: str, version_number: int) -> str:
    """새 분류체계 버전 식별자. 접두사는 `tx_` 다(docs/erd.md 2.2).

    분류체계 식별자의 `tax_` 를 떼어 붙인다. `tax_backend` 의 두 번째 버전이
    `tx_backend_v2` 이며 시드가 만든 `tx_backend_v1` 과 같은 규칙이다.
    """
    slug = taxonomy_id[4:] if taxonomy_id.startswith("tax_") else taxonomy_id
    return f"tx_{slug}_v{version_number}"


def dimension_identifier(taxonomy_id: str, candidate_id: str) -> str:
    """후보 하나가 만드는 차원의 정체성. 접두사는 `dim_` 다.

    후보로 식별한다. 같은 후보를 두 번 승격해도 같은 차원이 되고, 라벨을 바꾼
    다음 버전도 이 값을 유지한다.
    """
    material = f"{taxonomy_id}:{candidate_id}".encode()
    return f"dim_{hashlib.sha256(material).hexdigest()[:24]}"


def dimension_version_identifier(dimension_id: str, taxonomy_version_id: str) -> str:
    """차원 하나의 버전 행 식별자.

    `(dimension_id, taxonomy_version_id)` 가 UNIQUE 이므로 두 값이 식별자를
    결정한다. 발행을 다시 돌려도 행이 늘어나지 않는다.
    """
    material = f"{dimension_id}:{taxonomy_version_id}".encode()
    return f"dimv_{hashlib.sha256(material).hexdigest()[:24]}"


def alias_identifier(taxonomy_version_id: str, alias_text: str) -> str:
    """별칭 행 식별자. `UNIQUE (taxonomy_version_id, alias_text)` 와 같은 재료다."""
    material = f"{taxonomy_version_id}:{alias_text}".encode()
    return f"alias_{hashlib.sha256(material).hexdigest()[:24]}"


def relation_identifier(
    taxonomy_version_id: str, src: str, dst: str, relation_type: str
) -> str:
    """관계 행 식별자. UNIQUE 제약과 같은 네 값으로 만든다."""
    material = f"{taxonomy_version_id}:{src}:{dst}:{relation_type}".encode()
    return f"rel_{hashlib.sha256(material).hexdigest()[:24]}"


class PublicationOutcome(BaseModel):
    """발행 실행 하나의 결과."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    agent_run_id: str
    stop_reason: StopReason
    taxonomy_id: str | None = None
    previous_taxonomy_version_id: str | None = None
    """supersede 한 이전 활성 버전. 첫 발행이면 비운다."""

    taxonomy_version_id: str | None = None
    """발행한 새 버전. 발행하지 않았으면 비운다."""

    version_number: int = 0
    taxonomy_policy_version: str | None = None

    reviewed: int = 0
    promoted: int = 0
    merged: int = 0
    held: int = 0
    rejected: int = 0

    superseded: int = 0
    """supersede 한 행 수. 부분 유니크 인덱스 때문에 0 아니면 1 이다."""

    carried_dimensions: int = 0
    """이전 버전에서 새 버전으로 넘긴 차원 수."""

    carried_aliases: int = 0
    carried_relations: int = 0
    created_dimensions: int = 0
    created_aliases: int = 0
    created_relations: int = 0
    recorded_decisions: int = 0
    """이 실행이 저장한 결정 행 수. 심사가 저장한 보류·기각은 세지 않는다."""

    decisions: tuple[CandidateDecision, ...] = ()
    errors: tuple[tuple[str, str], ...] = ()

    @property
    def published(self) -> bool:
        return self.taxonomy_version_id is not None

    @property
    def gained_evidence(self) -> bool:
        return self.created_dimensions > 0 or self.created_aliases > 0

    @property
    def active_dimensions(self) -> int:
        """새 버전의 차원 수. 승계와 신규를 합친 값이다."""
        return self.carried_dimensions + self.created_dimensions


class TaxonomyPublication:
    """승격된 후보를 새 분류체계 버전으로 발행한다.

    심사는 주입받은 `CandidateReview` 가 하고 이 클래스는 판정을 표에 옮긴다.
    승격할 후보가 하나도 없으면 버전을 발행하지 않는다. 내용이 같은 버전을 발행하면
    `taxonomy_version_id` 가 달라 이전 버전의 할당과 통계를 재사용할 수 없게 되고,
    데이터셋 전체 재할당만 늘어난다(docs/statistics-model.md 3.5).
    """

    def __init__(
        self, review: CandidateReview, repository: PromotionRepository
    ) -> None:
        self._review = review
        self._repository = repository

    def run(
        self,
        context: RunContext,
        limit: int | None = None,
        published_at: datetime | None = None,
    ) -> PublicationOutcome:
        """심사하고, 승격이 있으면 새 버전을 발행한다."""
        review = self._review.run(context, limit)
        if review.stop_reason is StopReason.EXPLICIT_FAILURE:
            return self._halted(context, review)

        promotable = review.promotable
        if not promotable:
            return self._unpublished(context, review)

        moment = published_at or datetime.now(UTC)
        state = _State(context, review, moment)
        self._publish(state)
        self._carry_over(state)
        self._apply(state)
        return state.outcome()

    # ------------------------------------------------------------ 발행
    def _publish(self, state: _State) -> None:
        """새 버전 행을 만들고 이전 활성 버전을 supersede 한다."""
        taxonomy_id = state.taxonomy_id
        state.version_number = self._repository.next_version_number(taxonomy_id)
        state.taxonomy_version_id = taxonomy_version_identifier(
            taxonomy_id, state.version_number
        )
        state.superseded = self._repository.publish_version(
            {
                "taxonomy_version_id": state.taxonomy_version_id,
                "taxonomy_id": taxonomy_id,
                "version_number": state.version_number,
                "taxonomy_policy_version": state.policy_version,
                "published_at": state.published_at,
            },
            state.published_at,
        )

    # ------------------------------------------------------------ 승계
    def _carry_over(self, state: _State) -> None:
        """이전 버전의 차원·별칭·관계를 새 버전으로 넘긴다.

        종료 상태의 차원은 넘기지 않는다. `merged`·`split`·`deprecated` 는 더 쓰지
        않는 차원이며 새 버전에 행을 만들면 어휘에 남는다.

        끝점이 넘어오지 않은 관계도 넘기지 않는다. 한쪽이 사라진 관계는 새 버전에서
        가리킬 곳이 없다.
        """
        previous = state.previous_taxonomy_version_id
        if previous is None:
            return

        for row in self._repository.dimension_versions(previous):
            if lifecycle.is_terminal(row["lifecycle_status"]):
                continue
            dimension_id = row["dimension_id"]
            self._repository.add_dimension_version(
                {
                    "dimension_version_id": dimension_version_identifier(
                        dimension_id, state.taxonomy_version_id
                    ),
                    "dimension_id": dimension_id,
                    "taxonomy_version_id": state.taxonomy_version_id,
                    "internal_canonical_label": row["internal_canonical_label"],
                    "display_label": row["display_label"],
                    "definition": row["definition"],
                    "lifecycle_status": row["lifecycle_status"],
                    "standard_mapping_status": row["standard_mapping_status"],
                    "standard_id": row["standard_id"],
                    "mapping_confidence": row["mapping_confidence"],
                    "mapping_evidence": row["mapping_evidence"],
                    "review_status": row["review_status"],
                    "role_boundary_eligible": row["role_boundary_eligible"],
                }
            )
            state.dimensions.add(dimension_id)
            state.carried_dimensions += 1

        for row in self._repository.aliases(previous):
            if row["dimension_id"] not in state.dimensions:
                continue
            if not state.claim_alias(row["alias_text"]):
                continue
            self._repository.add_alias(
                {
                    "alias_id": alias_identifier(
                        state.taxonomy_version_id, row["alias_text"]
                    ),
                    "dimension_id": row["dimension_id"],
                    "taxonomy_version_id": state.taxonomy_version_id,
                    "alias_text": row["alias_text"],
                    "alias_source": row["alias_source"],
                }
            )
            state.carried_aliases += 1

        for row in self._repository.relations(previous):
            endpoints = {row["src_dimension_id"], row["dst_dimension_id"]}
            if not endpoints <= state.dimensions:
                continue
            self._repository.add_relation(
                {
                    "relation_id": relation_identifier(
                        state.taxonomy_version_id,
                        row["src_dimension_id"],
                        row["dst_dimension_id"],
                        row["relation_type"],
                    ),
                    "taxonomy_version_id": state.taxonomy_version_id,
                    "src_dimension_id": row["src_dimension_id"],
                    "dst_dimension_id": row["dst_dimension_id"],
                    "relation_type": row["relation_type"],
                }
            )
            state.carried_relations += 1

    # ------------------------------------------------------------ 승격 반영
    def _apply(self, state: _State) -> None:
        """판정별 경로로 후보를 새 버전에 넣는다.

        한 후보의 실패가 나머지를 막지 않는다.
        """
        for decision in state.review.promotable:
            try:
                if decision.route == ROUTE_ALIAS:
                    self._add_alias(decision, state)
                else:
                    self._add_dimension(decision, state)
                    if decision.route == ROUTE_RELATION:
                        self._add_relation(decision, state)
                self._record(decision, state)
            except Exception as exc:
                state.errors.append(
                    (decision.candidate_id, f"{type(exc).__name__}: {exc}")
                )

    def _add_dimension(self, decision: CandidateDecision, state: _State) -> None:
        """신규 차원의 정체성과 버전 행. `active` 로 넣는다.

        승격 심사를 통과한 차원만 여기 온다. `active` 이전의 후보는 통계에 들어가지
        않으며(docs/statistics-model.md 3.3) 심사가 그 경계다. 상태를 건너뛰지 않고
        `proposed` 부터 `active` 까지의 경로가 성립하는지 먼저 확인한다.
        """
        lifecycle.path_to(lifecycle.PROPOSED, lifecycle.ACTIVE)
        dimension_id = dimension_identifier(state.taxonomy_id, decision.candidate_id)
        self._repository.add_dimension(
            {
                "dimension_id": dimension_id,
                "taxonomy_id": state.taxonomy_id,
                "dimension_kind": DEFAULT_DIMENSION_KIND,
            }
        )
        self._repository.add_dimension_version(
            {
                "dimension_version_id": dimension_version_identifier(
                    dimension_id, state.taxonomy_version_id
                ),
                "dimension_id": dimension_id,
                "taxonomy_version_id": state.taxonomy_version_id,
                "internal_canonical_label": normalize_expression(
                    decision.proposed_label
                ),
                "display_label": decision.proposed_label,
                "definition": decision.judgment_rationale or DISCOVERED_DEFINITION,
                "lifecycle_status": lifecycle.ACTIVE,
                "standard_mapping_status": UNMAPPED,
                "standard_id": None,
                "mapping_confidence": None,
                "mapping_evidence": None,
                "review_status": REVIEW_STATUS,
                "role_boundary_eligible": False,
            }
        )
        state.dimensions.add(dimension_id)
        state.promoted_dimension[decision.candidate_id] = dimension_id
        state.created_dimensions += 1

    def _add_relation(self, decision: CandidateDecision, state: _State) -> None:
        """신규 차원과 상대 차원의 관계. 방향은 후보에서 상대 차원으로 간다.

        `relation_judgment` 가 후보를 주어로 삼은 판정이므로(`broader` 는 후보가 더
        넓다) 그대로 `relation_type` 이 된다.
        """
        source = state.promoted_dimension[decision.candidate_id]
        target = decision.nearest_dimension_id
        if not target or target == source:
            return
        self._repository.add_relation(
            {
                "relation_id": relation_identifier(
                    state.taxonomy_version_id,
                    source,
                    target,
                    decision.relation_judgment,
                ),
                "taxonomy_version_id": state.taxonomy_version_id,
                "src_dimension_id": source,
                "dst_dimension_id": target,
                "relation_type": decision.relation_judgment,
            }
        )
        state.created_relations += 1

    def _add_alias(self, decision: CandidateDecision, state: _State) -> None:
        """동의어 후보를 상대 차원의 표기로 접는다. 차원을 만들지 않는다.

        같은 표기가 이미 버전 안에 있으면 넣지 않는다.
        `UNIQUE (taxonomy_version_id, alias_text)` 가 한 표현을 한 차원에만 붙인다.
        """
        target = decision.nearest_dimension_id
        if not target or not state.claim_alias(decision.proposed_label):
            return
        self._repository.add_alias(
            {
                "alias_id": alias_identifier(
                    state.taxonomy_version_id, decision.proposed_label
                ),
                "dimension_id": target,
                "taxonomy_version_id": state.taxonomy_version_id,
                "alias_text": decision.proposed_label,
                "alias_source": ALIAS_SOURCE,
            }
        )
        state.created_aliases += 1

    def _record(self, decision: CandidateDecision, state: _State) -> None:
        """승격 결정을 기록하고 후보의 생명주기를 옮긴다.

        `promoted_to_version_id` 를 새 버전으로 채운다. `promote` 판정은 이 값이
        없으면 CHECK 제약을 어긴다(docs/erd.md 7.9).
        """
        evidence = state.evidence[decision.candidate_id]
        self._repository.add_decision(
            decision_row(
                decision,
                evidence,
                state.context.agent_run_id,
                state.taxonomy_version_id,
            )
        )
        state.recorded_decisions += 1

        target = decision.target_lifecycle
        if lifecycle.path_to(evidence.lifecycle_status, target):
            self._repository.set_candidate_lifecycle(decision.candidate_id, target)

    # ------------------------------------------------------------ 발행 없음
    def _unpublished(
        self, context: RunContext, review: ReviewOutcome
    ) -> PublicationOutcome:
        """심사만 하고 버전을 발행하지 않은 결과."""
        return PublicationOutcome(
            agent_run_id=context.agent_run_id,
            stop_reason=review.stop_reason,
            taxonomy_id=review.taxonomy_id,
            previous_taxonomy_version_id=review.taxonomy_version_id,
            taxonomy_policy_version=review.taxonomy_policy_version,
            reviewed=review.reviewed,
            held=review.counts.get("hold", 0),
            rejected=review.counts.get("reject", 0),
            decisions=review.decisions,
        )

    def _halted(
        self, context: RunContext, review: ReviewOutcome
    ) -> PublicationOutcome:
        """심사 전제가 깨진 결과. 발행하지 않는다."""
        return PublicationOutcome(
            agent_run_id=context.agent_run_id,
            stop_reason=StopReason.EXPLICIT_FAILURE,
            taxonomy_id=review.taxonomy_id,
            previous_taxonomy_version_id=review.taxonomy_version_id,
            reviewed=review.reviewed,
            decisions=review.decisions,
            errors=review.errors,
        )


class _State:
    """발행 하나가 쌓는 값. 결과 모델로 굳히기 전의 가변 상태다."""

    def __init__(
        self, context: RunContext, review: ReviewOutcome, published_at: datetime
    ) -> None:
        self.context = context
        self.review = review
        self.published_at = published_at
        self.taxonomy_id = review.taxonomy_id or ""
        self.previous_taxonomy_version_id = review.taxonomy_version_id
        self.policy_version = review.taxonomy_policy_version or ""
        self.evidence = review.evidence_by_id

        self.taxonomy_version_id = ""
        self.version_number = 0
        self.superseded = 0

        self.dimensions: set[str] = set()
        """새 버전에 행을 가진 차원. 관계와 별칭의 끝점 검사에 쓴다."""

        self.promoted_dimension: dict[str, str] = {}
        self._alias_texts: set[str] = set()

        self.carried_dimensions = 0
        self.carried_aliases = 0
        self.carried_relations = 0
        self.created_dimensions = 0
        self.created_aliases = 0
        self.created_relations = 0
        self.recorded_decisions = 0
        self.errors: list[tuple[str, str]] = []

    def claim_alias(self, alias_text: str) -> bool:
        """이 버전에서 아직 쓰지 않은 표기인가. 처음이면 자리를 잡는다."""
        if alias_text in self._alias_texts:
            return False
        self._alias_texts.add(alias_text)
        return True

    def outcome(self) -> PublicationOutcome:
        counts = self.review.counts
        return PublicationOutcome(
            agent_run_id=self.context.agent_run_id,
            stop_reason=(
                StopReason.EXPLICIT_FAILURE
                if self.errors
                else StopReason.SLOTS_FILLED
            ),
            taxonomy_id=self.taxonomy_id,
            previous_taxonomy_version_id=self.previous_taxonomy_version_id,
            taxonomy_version_id=self.taxonomy_version_id,
            version_number=self.version_number,
            taxonomy_policy_version=self.policy_version,
            reviewed=self.review.reviewed,
            promoted=counts.get("promote", 0),
            merged=counts.get("merge", 0),
            held=counts.get("hold", 0),
            rejected=counts.get("reject", 0),
            superseded=self.superseded,
            carried_dimensions=self.carried_dimensions,
            carried_aliases=self.carried_aliases,
            carried_relations=self.carried_relations,
            created_dimensions=self.created_dimensions,
            created_aliases=self.created_aliases,
            created_relations=self.created_relations,
            recorded_decisions=self.recorded_decisions,
            decisions=self.review.decisions,
            errors=tuple(self.errors),
        )


__all__ = [
    "ALIAS_SOURCE",
    "DEFAULT_DIMENSION_KIND",
    "DISCOVERED_DEFINITION",
    "REVIEW_STATUS",
    "PublicationOutcome",
    "TaxonomyPublication",
    "alias_identifier",
    "dimension_identifier",
    "dimension_version_identifier",
    "relation_identifier",
    "taxonomy_version_identifier",
]
