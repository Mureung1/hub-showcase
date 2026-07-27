"""검사 1. 스키마 검사.

정의는 docs/agent-design.md 9장의 검사 1을 따른다.

컬럼 타입·NOT NULL·CHECK 는 데이터베이스가 이미 강제한다. 이 검사는 그것을
다시 확인하지 않고, 데이터베이스가 볼 수 없는 `jsonb` 내부를 검사한다.

규칙은 기존 정의를 재사용한다. 필드 목록을 여기서 다시 선언하면 정의가 두 곳에
생기고 어긋난다. 선언되지 않은 키를 거부하는 것은 검증 정책이므로 `domain` 이 아니라
이 모듈이 담당한다.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, fields, is_dataclass
from functools import lru_cache
from typing import Any

from pydantic import TypeAdapter, ValidationError

from careersignal.contracts.check_result import CheckVerdict, Severity
from careersignal.domain.confidence import ConfidenceComponents
from careersignal.verification.protocol import Check, CheckContext, CheckOutcome, passed

REASON_NOT_DECLARED = "SCHEMA_NOT_DECLARED"
"""대상 타입에 선언된 규칙이 없다. 검사하지 않은 것을 통과로 두지 않는다."""

REASON_FIELD_MISSING = "SCHEMA_FIELD_MISSING"
REASON_INVALID = "SCHEMA_INVALID"


@dataclass(frozen=True, eq=False)
class SchemaRule:
    """대상 타입의 한 필드가 지켜야 하는 구조."""

    target_type: str
    field: str
    model: type[Any]
    required: bool = True
    source: str = ""
    """이 구조를 정의한 기준 문서."""


SCHEMA_RULES: tuple[SchemaRule, ...] = (
    SchemaRule(
        target_type="analysis_claim",
        field="confidence_components",
        model=ConfidenceComponents,
        source="docs/agent-design.md 8장",
    ),
)
"""`analysis_claims.confidence_components` 는 jsonb 라 데이터베이스가 내부를 보지 못한다."""


@lru_cache(maxsize=None)
def _adapter(model: type[Any]) -> TypeAdapter[Any]:
    return TypeAdapter(model)


@lru_cache(maxsize=None)
def _declared_keys(model: type[Any]) -> frozenset[str] | None:
    """선언된 필드 이름. 알 수 없는 구조면 None 이다."""
    if is_dataclass(model):
        return frozenset(f.name for f in fields(model))
    declared = getattr(model, "model_fields", None)
    if declared is not None:
        return frozenset(declared)
    return None


def rules_for(
    target_type: str, rules: Sequence[SchemaRule] = SCHEMA_RULES
) -> tuple[SchemaRule, ...]:
    return tuple(r for r in rules if r.target_type == target_type)


def _validate(rule: SchemaRule, value: Any) -> list[dict[str, Any]] | None:
    """위반 목록을 돌려준다. 위반이 없으면 None 이다.

    선언되지 않은 키를 먼저 막는다. 생성 모델의 자기 보고가 신뢰도 구성값에
    섞여 들어오는 경로가 여기다.

    `domain` 의 판정 규칙은 `__post_init__` 에서 `ValueError` 로 나온다.
    `ValidationError` 는 `ValueError` 의 하위형이라 순서를 지켜 잡는다.
    """
    declared = _declared_keys(rule.model)
    if declared is not None and isinstance(value, dict):
        unknown = sorted(set(value) - declared)
        if unknown:
            return [{"type": "extra_forbidden", "keys": unknown}]

    try:
        _adapter(rule.model).validate_python(value)
    except ValidationError as exc:
        return list(exc.errors(include_url=False))
    except ValueError as exc:
        return [{"type": type(exc).__name__, "msg": str(exc)}]
    return None


def schema_check(rules: Sequence[SchemaRule] = SCHEMA_RULES) -> Check:
    """검사 1의 구현을 만든다."""

    def check(context: CheckContext) -> CheckOutcome:
        applicable = rules_for(context.target_type, rules)
        if not applicable:
            return CheckOutcome(
                verdict=CheckVerdict.SKIP,
                severity=Severity.BLOCKING,
                reason_code=REASON_NOT_DECLARED,
                detail={"target_type": context.target_type},
            )

        for rule in applicable:
            if rule.field not in context.payload:
                if not rule.required:
                    continue
                return CheckOutcome(
                    verdict=CheckVerdict.FAIL,
                    severity=Severity.BLOCKING,
                    reason_code=REASON_FIELD_MISSING,
                    detail={"field": rule.field, "source": rule.source},
                )

            errors = _validate(rule, context.payload[rule.field])
            if errors is not None:
                return CheckOutcome(
                    verdict=CheckVerdict.FAIL,
                    severity=Severity.BLOCKING,
                    reason_code=REASON_INVALID,
                    detail={
                        "field": rule.field,
                        "source": rule.source,
                        "errors": errors,
                    },
                )
        return passed()

    return check
