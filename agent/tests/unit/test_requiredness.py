"""공고 라벨의 필수·우대 정규화 검증.

규칙은 docs/erd.md 6.1·7.13 에서 온다. `stated_requiredness` 는 공고가 쓴 라벨
원문이고, 할당의 `requiredness` 는 그 원문을 네 열거값으로 옮긴 결과다.

순수 함수만 검사한다. 저장소도 생성 모델도 쓰지 않는다.
"""

from __future__ import annotations

import pytest

from careersignal.taxonomy.requiredness import (
    REQUIREDNESS,
    Requiredness,
    matched_kinds,
    normalize_requiredness,
)


# ============================================================ 열거값
def test_the_enum_matches_the_check() -> None:
    assert set(REQUIREDNESS) == {
        "required",
        "preferred",
        "responsibility",
        "unknown",
    }


# ============================================================ 필수
@pytest.mark.parametrize(
    "stated",
    [
        "자격요건",
        "자격 요건",
        "[자격요건]",
        "필수사항",
        "필수 역량",
        "지원자격",
        "기본자격",
        "이런 분을 찾습니다",
        "이런 분을 찾아요",
        "이런 분과 함께하고 싶어요",
        "Requirements",
        "Qualifications",
    ],
)
def test_required_labels_normalize_to_required(stated: str) -> None:
    assert normalize_requiredness(stated) is Requiredness.REQUIRED


# ============================================================ 우대
@pytest.mark.parametrize(
    "stated",
    [
        "우대사항",
        "우대 사항",
        "우대",
        "이런 경험이 있다면 더 좋습니다",
        "이런 경험이 있으면 좋아요",
        "Nice to have",
        "Preferred",
    ],
)
def test_preferred_labels_normalize_to_preferred(stated: str) -> None:
    assert normalize_requiredness(stated) is Requiredness.PREFERRED


@pytest.mark.parametrize(
    "stated",
    [
        "선호 역량/경험",
        "이런 분이면 더 좋아요",
        "이런 점이 있으면 더 좋아요",
        "이런 경험이 있으시면 더욱 좋아요",
    ],
)
def test_the_labels_the_eval_set_calls_preferred_are_preferred(stated: str) -> None:
    """docs/eval/backend_v1.json 에 실제로 나온 우대 구간 라벨이다.

    `이런 분이면 더 좋아요` 는 `이런 분이면` 을 필수 표지로 두었을 때 `required` 로
    뒤집히던 라벨이며, 갈래를 나르는 말은 뒤의 `더 좋` 이다.
    """
    assert normalize_requiredness(stated) is Requiredness.PREFERRED


# ============================================================ 담당 업무
@pytest.mark.parametrize(
    "stated",
    [
        "주요업무",
        "주요 업무",
        "담당업무",
        "담당하실 업무",
        "업무 내용",
        "이런 일을 합니다",
        "하는 일",
        "Responsibilities",
        "What you'll do",
    ],
)
def test_responsibility_labels_normalize_to_responsibility(stated: str) -> None:
    """맡을 일을 적는 구간은 필수도 우대도 아니다."""
    assert normalize_requiredness(stated) is Requiredness.RESPONSIBILITY


def test_a_particle_between_the_marker_words_still_matches() -> None:
    """docs/eval/backend_v1.json 의 실제 라벨이다.

    매칭 키가 공백만 지우고 조사는 남기므로 `업무소개` 한 표지로는 걸리지 않는다.
    """
    assert (
        normalize_requiredness("합류하면 하게 될 업무를 소개해 드려요")
        is Requiredness.RESPONSIBILITY
    )


# ============================================================ 판단 불가
@pytest.mark.parametrize(
    "stated",
    [
        "",
        "   ",
        "복지와 혜택",
        "전형 절차",
        "우리 팀을 소개합니다",
        "기타",
        "- ·",
    ],
)
def test_a_label_without_a_marker_is_unknown(stated: str) -> None:
    """판단할 근거가 없으면 해석하지 않는다."""
    assert normalize_requiredness(stated) is Requiredness.UNKNOWN


def test_a_missing_label_is_unknown() -> None:
    """추출이 구간 라벨을 찾지 못하면 빈 값이 온다."""
    assert normalize_requiredness(None) is Requiredness.UNKNOWN


@pytest.mark.parametrize(
    "stated",
    ["자격요건 및 우대사항", "필수/우대", "주요업무 및 자격요건"],
)
def test_a_label_with_two_kinds_is_unknown(stated: str) -> None:
    """어느 쪽인지 정할 근거가 없다.

    임의로 `required` 로 밀면 `requiredness_ratio` 의 분자가 조용히 부푼다
    (docs/metric-spec.md 3.2).
    """
    assert len(matched_kinds(stated)) == 2
    assert normalize_requiredness(stated) is Requiredness.UNKNOWN


# ============================================================ 표기 흔들림
def test_spacing_does_not_change_the_result() -> None:
    assert normalize_requiredness("자격 요건") is normalize_requiredness("자격요건")


def test_case_does_not_change_the_result() -> None:
    assert normalize_requiredness("PREFERRED") is normalize_requiredness("preferred")


def test_the_function_is_pure() -> None:
    """같은 입력은 언제나 같은 값을 준다."""
    assert normalize_requiredness("우대사항") is normalize_requiredness("우대사항")
