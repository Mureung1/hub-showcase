# test_sentiment.py — 긍정 비율 계산 함수 테스트 (TDD)
#
# 이 시점에는 sentiment.py 파일도, calculate_positive_ratio 함수도 존재하지 않는다.
# 그래도 먼저 "이 함수가 이렇게 동작해야 한다"를 테스트로 적어둔다. (Red 단계)

import pytest
from sentiment import calculate_positive_ratio


def test_all_positive_is_100_percent():
    """전부 긍정이면 100%가 나와야 한다."""
    reviews = [{"sentiment": "긍정"}, {"sentiment": "긍정"}]
    assert calculate_positive_ratio(reviews) == 100.0


def test_all_negative_is_0_percent():
    """전부 부정이면 0%가 나와야 한다."""
    reviews = [{"sentiment": "부정"}, {"sentiment": "부정"}]
    assert calculate_positive_ratio(reviews) == 0.0


def test_half_and_half_is_50_percent():
    """반반이면 50%가 나와야 한다."""
    reviews = [{"sentiment": "긍정"}, {"sentiment": "부정"}]
    assert calculate_positive_ratio(reviews) == 50.0


def test_seven_out_of_ten():
    """10개 중 7개 긍정이면 70%가 나와야 한다."""
    reviews = [{"sentiment": "긍정"}] * 7 + [{"sentiment": "부정"}] * 3
    assert calculate_positive_ratio(reviews) == 70.0


def test_empty_list_is_zero():
    """리뷰가 하나도 없으면 0을 반환해야 한다 (0으로 나누기 에러가 나면 안 됨)."""
    assert calculate_positive_ratio([]) == 0.0


def test_rounds_to_one_decimal():
    """나눠떨어지지 않는 경우 소수점 첫째 자리까지 반올림해야 한다."""
    reviews = [{"sentiment": "긍정"}] * 2 + [{"sentiment": "부정"}] * 1
    # 2/3 = 66.666... → 66.7
    assert calculate_positive_ratio(reviews) == 66.7
