"""모델 식별자와 임베딩 설정.

식별자는 P2-2 스모크 테스트에서 실제 응답으로 확인한 값이다.
배치는 docs/agent-design.md 13장을 따른다.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class Tier(StrEnum):
    """작업 난이도에 따른 모델 등급."""

    LIGHT = "light"
    STANDARD = "standard"
    HEAVY = "heavy"


OPENAI_CHAT_MODELS: dict[Tier, str] = {
    Tier.LIGHT: "gpt-5.6-luna",
    Tier.STANDARD: "gpt-5.6-terra",
    Tier.HEAVY: "gpt-5.6-sol",
}

TASK_TIER: dict[str, Tier] = {
    "classification": Tier.LIGHT,
    "metadata_completion": Tier.LIGHT,
    "simple_extraction": Tier.LIGHT,
    "mention_extraction": Tier.STANDARD,
    "dimension_naming": Tier.STANDARD,
    "relation_judgement": Tier.STANDARD,
    "wiki_generation": Tier.STANDARD,
    "interpretation": Tier.STANDARD,
    "strategy": Tier.STANDARD,
    "roadmap": Tier.STANDARD,
    "entailment_check": Tier.STANDARD,
    "repeated_failure": Tier.HEAVY,
    "evaluation_sample": Tier.HEAVY,
}

ESCALATION: dict[Tier, Tier | None] = {
    Tier.LIGHT: Tier.STANDARD,
    Tier.STANDARD: Tier.HEAVY,
    Tier.HEAVY: None,
}


@dataclass(frozen=True, slots=True)
class EmbeddingConfig:
    """임베딩 모델과 차원.

    `text-embedding-3-large` 를 1536 차원으로 축소해 사용한다.
    앞쪽 차원에 정보가 몰리도록 학습된 모델이므로, 축소해도 같은 차원의
    소형 모델보다 검색 정확도가 높다. 저장 용량은 소형 모델과 같다.
    """

    model: str = "text-embedding-3-large"
    dimensions: int = 1536
    native_dimensions: int = 3072

    def __post_init__(self) -> None:
        if not 1 <= self.dimensions <= self.native_dimensions:
            raise ValueError("dimensions 는 1 과 native_dimensions 사이다")


EMBEDDING = EmbeddingConfig()
"""Phase 3 의 `chunk_embeddings.embedding vector(N)` 에서 N = EMBEDDING.dimensions."""

NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"
NVIDIA_AUDIT_MODEL = "nvidia/nemotron-mini-4b-instruct"
"""교차 표본 감사용. 생성 계열과 다른 모델을 써서 자기 선호를 줄인다."""


def chat_model(task: str) -> str:
    tier = TASK_TIER.get(task)
    if tier is None:
        raise KeyError(f"등록되지 않은 작업: {task}")
    return OPENAI_CHAT_MODELS[tier]


def escalate(current: Tier) -> Tier | None:
    return ESCALATION[current]
