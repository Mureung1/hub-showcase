"""체크리스트의 규칙. 순수 함수만 둔다.

Phase 16 의 세 단위 가운데 판정에 해당하는 부분이 전부 여기 있다.

- **16-1 활용처 배정.** 어떤 항목이 자기소개서·포트폴리오·면접 가운데 어디로
  가는지는 규칙이 정한다. 모델이 정하지 않는다. 생성 모델이 활용처를 고르면 같은
  성격의 항목이 실행마다 다른 자리로 가고, `checklist_items.channels` 의 CHECK 를
  넘는 값이 나올 수 있다.
- **16-2 개념 식별자.** `concept_identifier` 는 제목 하나에 언제나 같은 식별자를
  준다. 분석 버전이 바뀌어 문구가 달라져도 개념은 그대로이므로 사용자 체크 상태가
  살아남는다(docs/erd.md 11.7).
- **16-3 연결 완전성과 자료 정책.** 근거가 없는 항목과 `strategy` 용도가 허용되지
  않는 계층의 근거를 딛는 항목을 가려낸다.

이 모듈은 저장소도 모델 제공자도 import 하지 않는다. 값을 받아 값을 돌려줄 뿐이라
데이터베이스 없이 규칙만 검사할 수 있다.
"""

from __future__ import annotations

import hashlib
import re
from collections.abc import Iterable, Mapping

from careersignal.agents.strategy.contract import (
    BaselineRequirement,
    Channel,
    ChecklistConcept,
    ChecklistCopy,
    ChecklistDraft,
    ChecklistItem,
    ChecklistKind,
    Confidence,
    DeviationSignal,
    EvidenceKind,
    EvidenceLink,
    InterpretationInput,
)
from careersignal.contracts.check_result import (
    CheckName,
    CheckResult,
    CheckVerdict,
    RepairAction,
    Severity,
)
from careersignal.domain.scope import ScopeLevel
from careersignal.domain.source_policy import AllowedUse, SourceTier, is_allowed

CHANNEL_ORDER: tuple[Channel, ...] = (
    Channel.ESSAY,
    Channel.PORTFOLIO,
    Channel.INTERVIEW,
)
"""활용처의 표기 순서. `checklist_items.channels` 의 CHECK 배열과 같은 순서다.

배정 결과를 이 순서로 정렬해 담는다. 같은 항목이 실행마다 다른 순서의 배열을
가지면 저장 값이 달라 보이고, 화면의 배지 순서도 흔들린다.
"""

PRIMARY_CHANNEL: dict[ChecklistKind, Channel] = {
    ChecklistKind.PROJECT: Channel.PORTFOLIO,
    ChecklistKind.STORY: Channel.ESSAY,
    ChecklistKind.STUDY: Channel.INTERVIEW,
}
"""갈래마다 반드시 가는 자리.

`project` 는 만든 것을 보여 주는 항목이므로 포트폴리오, `story` 는 겪은 것을
말하는 항목이므로 자기소개서, `study` 는 산출물이 남지 않고 이해를 확인받는
항목이므로 면접이다. 근거는 `agent/main.py` 의 `/conditions` 뼈대 응답이 쓰던
배정과 CONTRACT 5장 C 의 `kind` 정의다.
"""

REQUIRED_RATIO_THRESHOLD = 0.5
"""기준선 항목을 필수로 볼 요구 비율.

절반 넘는 공고가 필수로 적었으면 준비하지 않고 지원하기 어렵다. 그 아래는 우대로
배정해 화면이 미보유를 붉게 표시하지 않게 한다.
"""

STRATEGY_USE = AllowedUse.STRATEGY
"""전략 산출물이 근거에 요구하는 허용 용도. 표는 docs/data-strategy.md 3장이다."""

MISSING_EVIDENCE = "missing_evidence_link"
DISALLOWED_TIER = "tier_not_allowed_for_strategy"
"""검사 실패의 사유 코드. `verification_results.reason_code` 로 간다."""

_ASCII_TOKEN = re.compile(r"[a-z0-9]+")


def slugify(text: str) -> str:
    """소문자 ASCII 낱말을 하이픈으로 잇는다.

    한글은 남기지 않는다. 식별자는 URL 과 로그와 CSV 를 오가므로 ASCII 로 좁힌다.
    잃은 정보는 `concept_identifier` 가 해시로 되살린다.
    """
    return "-".join(_ASCII_TOKEN.findall(text.casefold()))


def _lossless(text: str, slug: str) -> bool:
    """제목이 슬러그로 온전히 옮겨졌는지.

    ASCII 낱말과 구분자만으로 이루어진 제목은 슬러그가 제목을 그대로 담는다.
    한글이나 기호가 있으면 서로 다른 제목이 같은 슬러그를 갖게 되므로 온전하지 않다.
    """
    return bool(slug) and slug.replace("-", "") == "".join(
        ch for ch in text.casefold() if ch.isalnum()
    )


def _digest(text: str) -> str:
    """제목의 결정적 지문 8자. 같은 제목이면 언제나 같다."""
    return hashlib.sha256(text.strip().casefold().encode("utf-8")).hexdigest()[:8]


def concept_identifier(job_role_id: str, title: str) -> str:
    """`cc_<job>_<slug>` 를 만든다. 같은 제목은 언제나 같은 개념이다.

    사용자 체크 상태의 키가 이 값이다(docs/erd.md 11.7). 분석 버전이 바뀌어도 값이
    같아야 체크가 살아남으므로, 실행 시각이나 버전 문자열을 재료로 쓰지 않는다.

    한글 제목은 ASCII 슬러그로 옮기면 서로 다른 제목이 같은 값을 갖는다. 그때는
    제목의 해시 8자를 뒤에 붙여 가른다. `checklist_concepts` 의
    `UNIQUE (job_role_id, canonical_title)` 와 어긋나지 않는다.
    """
    if not job_role_id:
        raise ValueError("job_role_id 는 비어 있을 수 없다")
    stripped = title.strip()
    if not stripped:
        raise ValueError("제목이 빈 개념은 만들지 않는다")
    slug = slugify(stripped)
    if _lossless(stripped, slug):
        return f"cc_{job_role_id}_{slug}"
    digest = _digest(stripped)
    return f"cc_{job_role_id}_{slug}-{digest}" if slug else f"cc_{job_role_id}_{digest}"


def scope_key(scope_level: ScopeLevel, scope_id: str | None) -> str:
    """식별자에 쓰는 범위 조각. `overall` 이거나 기업군 `cluster_id` 다.

    CONTRACT 1장의 `<scope>` 정의다.
    """
    if scope_level is ScopeLevel.OVERALL:
        return "overall"
    if not scope_id:
        raise ValueError(f"{scope_level} 범위는 scope_id 가 필요하다")
    return scope_id


def version_marker(analysis_version: str) -> str:
    """분석 버전 하나를 가리키는 짧은 표식.

    `checklist_items.item_id` 와 `analysis_outputs.output_id` 는 기본키다. 같은
    범위의 같은 제목이 버전마다 새 행을 가지므로 식별자에 버전을 나타내는 조각이
    있어야 두 번째 버전의 적재가 기본키에서 막히지 않는다.

    데모 시드는 직무마다 활성 버전이 하나뿐이라 표식 자리에 `demo` 를 적는다
    (CONTRACT 1장). 그 값은 시드를 만드는 쪽이 넘긴다.
    """
    return _digest(analysis_version)


def item_identifier(
    job_role_id: str,
    scope_level: ScopeLevel,
    scope_id: str | None,
    title: str,
    marker: str = "demo",
) -> str:
    """`ci_<marker>_<job>_<scope>_<slug>` 를 만든다(CONTRACT 1장).

    개념과 달리 버전·범위마다 다른 행이므로 범위와 버전 표식이 식별자에 들어간다.
    같은 표식·범위의 같은 제목은 같은 항목이며, 재실행이 행을 늘리지 않는다.
    """
    slug = concept_identifier(job_role_id, title).split("_", 2)[2]
    return f"ci_{marker}_{job_role_id}_{scope_key(scope_level, scope_id)}_{slug}"


def output_identifier(
    job_role_id: str,
    scope_level: ScopeLevel,
    scope_id: str | None,
    marker: str = "demo",
) -> str:
    """`out_<marker>_<job>_strat_<scope>` 를 만든다(CONTRACT 1장)."""
    return f"out_{marker}_{job_role_id}_strat_{scope_key(scope_level, scope_id)}"


def assign_channels(
    kind: ChecklistKind,
    *,
    is_deviation: bool = False,
    required: bool = True,
) -> tuple[Channel, ...]:
    """항목 하나가 쓰이는 자리를 정한다(16-1).

    규칙은 셋이다.

    1. 갈래마다 반드시 가는 자리가 하나 있다(`PRIMARY_CHANNEL`).
    2. 편차 항목은 면접을 함께 받는다. 기업군이 직무 기준선과 다르게 요구한
       지점이 곧 면접의 확인 지점이다.
    3. 우대 항목은 면접을 더하지 않는다. 필수가 아닌 것을 면접 준비 목록에 올리면
       준비 순서가 필수 항목에서 밀린다.

    `study` 는 규칙 2·3 과 무관하게 면접 하나만 갖는다. 학습 항목은 산출물이
    남지 않아 다른 자리에 쓸 것이 없고, 이미 면접이 주 자리다.

    돌려주는 값은 언제나 `essay`·`portfolio`·`interview` 의 부분집합이며
    `CHANNEL_ORDER` 순서다.
    """
    primary = PRIMARY_CHANNEL[kind]
    channels = [primary]
    if kind is not ChecklistKind.STUDY and is_deviation and required:
        channels.append(Channel.INTERVIEW)
    ordered = tuple(c for c in CHANNEL_ORDER if c in set(channels))
    return ordered


def _baseline_draft(
    job_role_id: str, requirement: BaselineRequirement
) -> ChecklistDraft:
    """기준선 항목 하나를 초안으로 옮긴다."""
    required = (
        requirement.required_ratio is None
        or requirement.required_ratio >= REQUIRED_RATIO_THRESHOLD
    )
    concept_id = concept_identifier(job_role_id, requirement.title)
    return ChecklistDraft(
        concept_id=concept_id,
        title=requirement.title,
        kind=requirement.kind,
        channels=assign_channels(requirement.kind, required=required),
        required=required,
        topic=requirement.desc,
        evidence_links=(
            EvidenceLink(
                concept_id=concept_id,
                kind=EvidenceKind.DIMENSION,
                ref_id=requirement.item_id,
                source_tier=requirement.source_tier,
            ),
        ),
    )


def _deviation_draft(job_role_id: str, deviation: DeviationSignal) -> ChecklistDraft:
    """편차 하나를 초안으로 옮긴다.

    신뢰도가 낮은 편차는 우대로 배정한다. 2차 자료 하나에 기댄 편차를 필수로
    올리면 화면이 미보유를 필수 결격으로 표시한다.
    """
    required = deviation.confidence is not Confidence.LOW
    concept_id = concept_identifier(job_role_id, deviation.topic)
    return ChecklistDraft(
        concept_id=concept_id,
        title=deviation.topic,
        kind=deviation.kind,
        channels=assign_channels(
            deviation.kind, is_deviation=True, required=required
        ),
        is_deviation=True,
        dev_n=deviation.dev_n,
        required=required,
        topic=deviation.deviation or deviation.explanation,
        evidence_links=(
            EvidenceLink(
                concept_id=concept_id,
                kind=EvidenceKind.DEVIATION,
                ref_id=deviation.item_id,
                source_tier=deviation.source_tier,
            ),
        ),
    )


def draft_checklist(interpretation: InterpretationInput) -> tuple[ChecklistDraft, ...]:
    """해석 산출물에서 체크리스트 초안을 만든다.

    편차를 앞에 둔다. 좁은 범위에서 갈리는 지점이 먼저 읽혀야 하고, 화면의 편차
    번호(①②③)도 위에서부터 붙는다.

    같은 제목이 기준선과 편차에 모두 나오면 편차 쪽을 남긴다. 개념은 하나이고
    (`UNIQUE (job_role_id, canonical_title)`), 편차 쪽이 근거를 더 많이 담는다.
    이때 두 근거를 합쳐 하나의 초안이 기준선 차원과 편차를 함께 딛게 한다.
    """
    job = interpretation.job_role_id
    drafts: dict[str, ChecklistDraft] = {}
    for deviation in interpretation.deviations:
        draft = _deviation_draft(job, deviation)
        drafts.setdefault(draft.concept_id, draft)
    for requirement in interpretation.baseline:
        draft = _baseline_draft(job, requirement)
        existing = drafts.get(draft.concept_id)
        if existing is None:
            drafts[draft.concept_id] = draft
            continue
        drafts[draft.concept_id] = existing.model_copy(
            update={
                "evidence_links": existing.evidence_links + draft.evidence_links
            }
        )
    return tuple(drafts.values())


def concept_of(job_role_id: str, draft: ChecklistDraft) -> ChecklistConcept:
    """초안 하나에 대응하는 개념 행."""
    return ChecklistConcept(
        concept_id=draft.concept_id,
        job_role_id=job_role_id,
        canonical_title=draft.title,
        kind=draft.kind,
    )


def item_of(
    draft: ChecklistDraft,
    wording: ChecklistCopy,
    *,
    analysis_version: str,
    job_role_id: str,
    scope_level: ScopeLevel,
    scope_id: str | None,
    marker: str = "demo",
) -> ChecklistItem:
    """초안과 문구를 합쳐 버전 인스턴스 하나를 만든다(16-2).

    개념 식별자는 초안이 갖고 있던 값을 그대로 쓴다. 문구가 바뀌어도 이 값은
    변하지 않으므로 사용자 체크가 살아남는다.
    """
    return ChecklistItem(
        item_id=item_identifier(
            job_role_id, scope_level, scope_id, draft.title, marker
        ),
        concept_id=draft.concept_id,
        analysis_version=analysis_version,
        scope_level=scope_level,
        scope_id=scope_id,
        title=draft.title,
        subtitle=wording.subtitle,
        reason=wording.reason,
        evidence_needed=wording.evidence_needed,
        channels=draft.channels,
        required=draft.required,
        is_deviation=draft.is_deviation,
        dev_n=draft.dev_n,
        kind=draft.kind,
        wording=wording,
    )


def surviving_checks(
    checks: Mapping[str, bool], items: Iterable[ChecklistItem]
) -> dict[str, bool]:
    """새 버전 항목에 남는 체크 상태(16-2).

    키는 개념 식별자다. 새 버전이 문구를 바꿔도 개념이 유지된 항목은 체크가
    그대로 남고, 사라진 개념의 체크만 떨어진다. 체크 상태를 항목 식별자로 잡았다면
    문구 개정 한 번에 전부 초기화됐을 것이다.
    """
    alive = {item.concept_id for item in items}
    return {
        concept_id: value
        for concept_id, value in checks.items()
        if concept_id in alive
    }


def unlinked(drafts: Iterable[ChecklistDraft]) -> tuple[str, ...]:
    """근거가 하나도 없는 항목의 개념 식별자(16-3)."""
    return tuple(draft.concept_id for draft in drafts if not draft.evidence_links)


def policy_violations(
    drafts: Iterable[ChecklistDraft],
) -> tuple[tuple[str, str, SourceTier], ...]:
    """허용되지 않은 계층의 근거를 딛는 자리(16-3).

    `(개념 식별자, 근거 식별자, 계층)` 이다. 판정은
    `careersignal.domain.source_policy.is_allowed` 하나만 쓴다. 같은 표를 두 곳에
    적으면 갈라진다.
    """
    bad: list[tuple[str, str, SourceTier]] = []
    for draft in drafts:
        for link in draft.evidence_links:
            if not is_allowed(link.source_tier, STRATEGY_USE):
                bad.append((draft.concept_id, link.ref_id, link.source_tier))
    return tuple(bad)


def evidence_checks(drafts: Iterable[ChecklistDraft]) -> tuple[CheckResult, ...]:
    """연결 완전성과 자료 정책의 판정 결과(16-3).

    검사 이름 둘을 쓴다. 연결이 아예 없는 것은 산출물의 구조가 어긋난 것이므로
    `schema_validator` 이고, 계층이 용도를 허용하지 않는 것은
    `source_policy_validator` 다(docs/agent-design.md 9장).

    둘 다 차단이다. 근거 없는 항목과 허용되지 않은 자료로 세운 항목은 화면에
    나가면 안 된다. 통과한 항목은 결과를 남기지 않는다. 모든 항목의 통과를 한 줄로
    적는 것은 `run` 이 아니라 상위 검증의 몫이다.
    """
    results: list[CheckResult] = []
    for concept_id in unlinked(drafts):
        results.append(
            CheckResult(
                check=CheckName.SCHEMA,
                target_type="checklist_item",
                target_id=concept_id,
                verdict=CheckVerdict.FAIL,
                severity=Severity.BLOCKING,
                reason_code=MISSING_EVIDENCE,
                repair_action=RepairAction.REQUEST_RESEARCH,
            )
        )
    for concept_id, ref_id, tier in policy_violations(drafts):
        results.append(
            CheckResult(
                check=CheckName.SOURCE_POLICY,
                target_type="checklist_item",
                target_id=concept_id,
                verdict=CheckVerdict.FAIL,
                severity=Severity.BLOCKING,
                reason_code=DISALLOWED_TIER,
                repair_action=RepairAction.SWAP_EVIDENCE,
                detail={"evidence_id": ref_id, "source_tier": str(tier)},
            )
        )
    return tuple(results)


def blocked_concepts(checks: Iterable[CheckResult]) -> frozenset[str]:
    """저장하면 안 되는 항목의 개념 식별자."""
    return frozenset(
        check.target_id for check in checks if check.blocks_publication
    )


__all__ = [
    "CHANNEL_ORDER",
    "DISALLOWED_TIER",
    "MISSING_EVIDENCE",
    "PRIMARY_CHANNEL",
    "REQUIRED_RATIO_THRESHOLD",
    "STRATEGY_USE",
    "assign_channels",
    "blocked_concepts",
    "concept_identifier",
    "concept_of",
    "draft_checklist",
    "evidence_checks",
    "item_identifier",
    "item_of",
    "output_identifier",
    "policy_violations",
    "scope_key",
    "slugify",
    "surviving_checks",
    "unlinked",
    "version_marker",
]
