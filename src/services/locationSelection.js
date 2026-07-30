export const LOCATION_PRIVACY_NOTICE = "입력한 장소 이름은 공동 수령지 추천과 참여자 화면에 사용돼요. 집 주소보다는 학교 건물이나 출입구처럼 함께 보기 안전한 장소를 적어 주세요. 지도 화면은 OpenStreetMap에 현재 보이는 지역의 지도 요청을 전송해요.";

export function isActiveLocationRequest(requestId, activeRequestId, isMounted) {
  return isMounted && requestId === activeRequestId;
}

export function createLocationSelection(address, latitude, longitude) {
  const normalizedAddress = String(address ?? "").trim();
  const hasNoCoordinates = latitude == null && longitude == null;
  const hasCompleteCoordinates = Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;

  if (!hasNoCoordinates && !hasCompleteCoordinates) {
    throw new Error("위치 좌표를 다시 선택해 주세요.");
  }

  return {
    address: normalizedAddress,
    latitude: hasNoCoordinates ? null : latitude,
    longitude: hasNoCoordinates ? null : longitude,
  };
}
