# test_distance.py — 거리 계산 함수 테스트 (TDD)
#
# TDD(테스트 주도 개발) 순서:
#   1) 이 테스트 파일을 먼저 작성한다 (아직 함수가 없어서 실패함 = Red)
#   2) 테스트를 통과하는 최소한의 함수를 구현한다 (Green)
#   3) 코드를 다듬는다 (Refactor)
#
# 실행: pytest test_distance.py -v
# (설치: pip install pytest)

import pytest
from distance import haversine, filter_by_radius


# ── haversine 함수 테스트 ──

def test_same_point_is_zero():
    """같은 지점 사이의 거리는 0이어야 한다."""
    assert haversine(37.5, 127.0, 37.5, 127.0) == 0


def test_seoul_city_hall_to_gangnam():
    """서울시청 ↔ 강남역은 약 8km다. (오차 1km 이내 허용)"""
    # 서울시청: 37.5663, 126.9779 / 강남역: 37.4979, 127.0276
    dist = haversine(37.5663, 126.9779, 37.4979, 127.0276)
    assert 7.0 <= dist <= 9.0


def test_distance_is_symmetric():
    """A→B 거리와 B→A 거리는 같아야 한다."""
    d1 = haversine(37.5, 127.0, 37.6, 127.1)
    d2 = haversine(37.6, 127.1, 37.5, 127.0)
    assert d1 == pytest.approx(d2)


def test_returns_positive():
    """서로 다른 두 지점의 거리는 항상 양수다."""
    assert haversine(37.5, 127.0, 35.1, 129.0) > 0


# ── filter_by_radius 함수 테스트 ──

def test_filter_keeps_only_within_radius():
    """반경 2km를 벗어난 업체는 제외되어야 한다."""
    my_lat, my_lon = 37.5, 127.0
    stores = [
        {"name": "가까운가게", "latitude": 37.505, "longitude": 127.005},   # 약 0.7km
        {"name": "먼가게", "latitude": 37.6, "longitude": 127.1},           # 약 13km
    ]
    result = filter_by_radius(my_lat, my_lon, stores, radius_km=2.0)
    names = [s["name"] for s in result]
    assert "가까운가게" in names
    assert "먼가게" not in names


def test_filter_sorts_by_distance():
    """결과는 가까운 순서대로 정렬되어야 한다."""
    my_lat, my_lon = 37.5, 127.0
    stores = [
        {"name": "B", "latitude": 37.510, "longitude": 127.0},  # 더 멈
        {"name": "A", "latitude": 37.502, "longitude": 127.0},  # 더 가까움
    ]
    result = filter_by_radius(my_lat, my_lon, stores, radius_km=5.0)
    assert result[0]["name"] == "A"
    assert result[1]["name"] == "B"


def test_filter_adds_distance_field():
    """필터를 거친 업체에는 distance 필드가 추가되어야 한다."""
    result = filter_by_radius(37.5, 127.0, [
        {"name": "테스트", "latitude": 37.502, "longitude": 127.0},
    ], radius_km=5.0)
    assert "distance" in result[0]
    assert result[0]["distance"] > 0
