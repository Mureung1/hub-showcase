# sentiment.py — 리뷰 목록의 긍정 비율을 계산하는 함수
# TDD로 개발: test_sentiment.py의 테스트를 먼저 작성한 뒤 이 함수를 구현했습니다.


def calculate_positive_ratio(reviews: list) -> float:
    """리뷰 목록을 받아 긍정 비율(%)을 계산합니다.

    Args:
        reviews: 각 항목이 {"sentiment": "긍정" 또는 "부정"}인 딕셔너리 리스트

    Returns:
        긍정 비율 (0.0 ~ 100.0), 소수점 첫째 자리까지 반올림.
        리뷰가 하나도 없으면 0.0을 반환합니다.
    """
    total = len(reviews)
    if total == 0:
        return 0.0

    positive_count = sum(1 for r in reviews if r["sentiment"] == "긍정")
    ratio = positive_count / total * 100
    return round(ratio, 1)
