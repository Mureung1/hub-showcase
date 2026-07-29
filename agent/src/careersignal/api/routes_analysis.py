"""분석 화면 네 라우트.

요청·응답 형태는 예전 `main.py` 와 같다. 바뀐 것은 **어디서 오느냐** 하나다. 고정
응답(fixture)이 아니라 활성 분석 버전의 `analysis_outputs.payload` 를 읽는다
(CONTRACT 4장·7장). 이 자리는 에이전트를 부르지 않고 집계도 하지 않는다.

`/roadmap` 만 예외적으로 손을 댄다. 체크 상태가 바뀌면 이미 가진 것을 채우는 단계를
앞에 둘 이유가 없으므로 `agents/roadmap/recompose.py` 의 순수 함수로 저장된 payload
의 순서와 우선순위를 다시 짠다. 순수 함수이므로 저장소도 모델도 부르지 않는다.
"""

from __future__ import annotations

from hashlib import sha256

from fastapi import APIRouter

from careersignal.agents.roadmap.recompose import recompose
from careersignal.agents.statistics.extractor import MentionCandidate
from careersignal.agents.strategy.checklist import slugify
from careersignal.api.deps import (
    NO_ACTIVE_ANALYSIS,
    NO_EXTRACTOR,
    Extractor,
    Serving,
    ServiceUnavailable,
)
from careersignal.api.schemas import (
    ConditionsRequest,
    ConditionsResponse,
    ExtractRequest,
    ExtractResponse,
    ReverseRequest,
    ReverseResponse,
    ReverseScope,
    RoadmapRequest,
    RoadmapResponse,
    Skill,
)
from careersignal.repositories.serving import (
    OUTPUT_INTERPRETATION,
    OUTPUT_ROADMAP,
    OUTPUT_STRATEGY,
    ServedOutput,
    ServingRepository,
)
from careersignal.taxonomy.requiredness import normalize_requiredness

router = APIRouter()

EXTRACT_AGENT_VERSION = "1.0.0"
EXTRACT_SOURCE = "agent"
"""`/extract` 는 주입된 포트를 그 자리에서 부른다. 저장된 결과가 아니다."""

CONFIDENCE_HIGH = 0.8
CONFIDENCE_MEDIUM = 0.5
"""평균 신뢰도를 세 라벨로 접는 경계."""


def _serve(
    repository: ServingRepository,
    job: str,
    output_type: str,
    scope: ReverseScope,
) -> ServedOutput:
    """저장된 payload 한 벌. 없으면 503 을 던진다.

    폴백은 저장소가 수행한다. 여기서는 결과가 비었는지만 본다.
    """
    served = repository.resolve(
        job_role_id=job,
        output_type=output_type,
        level=scope.level,
        cluster_tag=scope.cluster_tag,
        posting_id=scope.posting_id,
    )
    if served is None:
        raise ServiceUnavailable(
            NO_ACTIVE_ANALYSIS,
            f"{job} 의 활성 분석 결과가 없다. output_type={output_type}",
        )
    return served


@router.post("/reverse", response_model=ReverseResponse)
def reverse(req: ReverseRequest, repository: Serving) -> ReverseResponse:
    """채용공고 해석. 저장된 `interpretation` payload 를 그대로 돌려준다.

    `req.items` 와 `req.baseline` 은 읽지 않는다. 통계는 이미 분석 시점에 반영되어
    payload 안에 들어 있고, 화면이 보낸 값으로 저장된 해석을 다시 계산하면 같은
    직무의 같은 버전이 요청마다 다른 답을 내게 된다. 요청 모양은 유지한다 —
    Express 가 보내는 본문을 바꾸지 않기 위해서다.
    """
    served = _serve(repository, req.job, OUTPUT_INTERPRETATION, req.scope)
    return ReverseResponse.model_validate(served.with_scope())


@router.post("/conditions", response_model=ConditionsResponse)
def conditions(req: ConditionsRequest, repository: Serving) -> ConditionsResponse:
    """합격 전략. 저장된 `strategy` payload 를 그대로 돌려준다.

    `req.reverse` 는 읽지 않는다. 전략은 해석 산출물에서 이미 만들어져 저장되어 있고,
    화면이 되보낸 해석으로 다시 만들면 저장된 것과 갈라진다.
    """
    served = _serve(repository, req.job, OUTPUT_STRATEGY, req.scope)
    return ConditionsResponse.model_validate(served.with_scope())


@router.post("/roadmap", response_model=RoadmapResponse)
def roadmap(req: RoadmapRequest, repository: Serving) -> RoadmapResponse:
    """준비 로드맵. 저장된 payload 를 체크 상태로 재조합해 돌려준다.

    재조합은 `recompose` 한 곳에서만 한다. Express 조합기와 같은 순수 함수를 쓰므로
    같은 입력에 같은 결과가 나온다. 체크가 비면 저장된 순서 그대로다.
    """
    served = _serve(repository, req.job, OUTPUT_ROADMAP, req.scope)
    recomposed = recompose(served.with_scope(), req.checks)
    return RoadmapResponse.model_validate(recomposed)


# ------------------------------------------------------------------ 추출
def _slug(expression: str) -> str:
    """표현 하나의 슬러그. 서로 다른 표현이 같은 값을 갖지 않게 한다.

    `slugify` 는 ASCII 낱말만 남기므로 한글만으로 된 표현은 빈 문자열이 되고, 그러면
    `대용량 트래픽` 과 `테스트 코드 작성` 이 같은 슬러그를 갖는다. 화면이 슬러그로
    항목을 가르므로 두 표현이 하나로 접힌다. 옮기다 잃은 만큼을 지문 여덟 자로
    되살린다 — 규칙은 `checklist.concept_identifier` 와 같다.
    """
    stripped = expression.strip()
    ascii_slug = slugify(stripped)
    if ascii_slug and ascii_slug.replace("-", "") == "".join(
        ch for ch in stripped.casefold() if ch.isalnum()
    ):
        return ascii_slug
    digest = sha256(stripped.casefold().encode("utf-8")).hexdigest()[:8]
    return f"{ascii_slug}-{digest}" if ascii_slug else digest


def _confidence(candidates: tuple[MentionCandidate, ...]) -> str:
    """뽑힌 표현의 신뢰도를 세 라벨 하나로 접는다.

    값을 적어 온 표현이 하나도 없으면 `low` 다. 모른다는 것을 높게 적지 않는다.
    """
    scores = [c.confidence for c in candidates if c.confidence is not None]
    if not scores:
        return "low"
    average = sum(scores) / len(scores)
    if average >= CONFIDENCE_HIGH:
        return "high"
    if average >= CONFIDENCE_MEDIUM:
        return "medium"
    return "low"


@router.post("/extract", response_model=ExtractResponse)
def extract(req: ExtractRequest, extractor: Extractor) -> ExtractResponse:
    """공고 원문 하나에서 요구 표현을 뽑는다.

    `agents/statistics/extractor.py` 의 `MentionExtractor` 포트만 부른다. 이 모듈은
    제공자를 모르고, 어느 구현이 들어올지는 배선이 정한다.

    포트가 주입되지 않았으면 **명시적 오류**다. 빈 목록을 돌려주면 "요구가 없는
    공고"와 "추출기가 없는 배포"가 같은 응답이 되고, 화면은 앞의 것으로 그린다.

    태그 계열 필드는 비운다. 직무 외 요구·심화 신호·현실 신호는 표현을 뽑은 뒤의
    분류·집계 단계가 만드는 값이며, 이 포트의 계약에 없다. 없는 값을 지어내지 않는다.
    """
    if extractor is None:
        raise ServiceUnavailable(
            NO_EXTRACTOR,
            "요구 표현 추출 포트가 주입되지 않았다. "
            "deps.mention_extractor 를 배선에서 덮어써야 한다",
        )
    candidates = tuple(extractor.extract(None, req.raw_text))
    skills = [
        Skill(
            name=candidate.raw_expression,
            slug=_slug(candidate.raw_expression),
            requirement=str(normalize_requiredness(candidate.stated_requiredness)),
        )
        for candidate in candidates
    ]
    return ExtractResponse(
        posting_id=req.posting_id,
        skills=skills,
        out_of_role_tags=[],
        advanced_spans=[],
        reality_tags=[],
        axis_mentions=[],
        impl_level_signals=[],
        confidence=_confidence(candidates),
        agent_version=EXTRACT_AGENT_VERSION,
        source=EXTRACT_SOURCE,
    )


__all__ = ["router"]
