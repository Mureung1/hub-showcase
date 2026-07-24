# distance.py — 두 좌표 사이 거리를 계산하는 함수
# TDD로 개발: test_distance.py의 테스트를 먼저 작성한 뒤 이 함수를 구현했습니다.
#
# 주변 경쟁업체를 반경으로 필터링하려면, 내 가게와 각 업체 사이의
# 실제 거리(km)를 알아야 합니다. 위도/경도 두 점 사이의 거리는
# 지구가 둥글기 때문에 단순 뺄셈으로는 구할 수 없고, Haversine 공식을 씁니다.

import math


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """두 좌표(위도, 경도) 사이의 거리를 km 단위로 반환합니다.

    Args:
        lat1, lon1: 첫 번째 지점의 위도, 경도
        lat2, lon2: 두 번째 지점의 위도, 경도

    Returns:
        두 지점 사이의 거리 (km)
    """
    R = 6371  # 지구 반지름 (km)

    # 위도/경도 차이를 라디안으로 변환
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    # Haversine 공식
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.asin(math.sqrt(a))

    return R * c


def filter_by_radius(my_lat: float, my_lon: float, stores: list, radius_km: float = 2.0) -> list:
    """내 가게 기준 반경 내의 업체만 남기고, 거리순으로 정렬해 반환합니다.

    Args:
        my_lat, my_lon: 내 가게 좌표
        stores: 업체 목록. 각 항목은 'latitude', 'longitude' 키를 가진 dict
        radius_km: 반경 (기본 2km)

    Returns:
        반경 내 업체 목록 (각 항목에 'distance' 추가됨, 가까운 순 정렬)
    """
    result = []
    for store in stores:
        dist = haversine(my_lat, my_lon, store["latitude"], store["longitude"])
        if dist <= radius_km:
            store_with_dist = {**store, "distance": round(dist, 2)}
            result.append(store_with_dist)

    # 거리순 정렬 (가까운 것 먼저)
    result.sort(key=lambda s: s["distance"])
    return result
