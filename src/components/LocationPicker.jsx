import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { createLocationSelection, isActiveLocationRequest, LOCATION_PRIVACY_NOTICE } from "../services/locationSelection";

const DEFAULT_CENTER = [37.5665, 126.978];

function hasCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude);
}

function LocationPicker({
  address,
  latitude,
  longitude,
  onChange,
  label = "상세주소",
  inputId = "location-address",
}) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const addressRef = useRef(address);
  const initialCoordinatesRef = useRef({ latitude, longitude });
  const activeLocationRequestRef = useRef(0);
  const mountedRef = useRef(true);
  const [isLocating, setIsLocating] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
    addressRef.current = address;
  }, [address, onChange]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return undefined;
    mountedRef.current = true;

    const initialCoordinates = initialCoordinatesRef.current;
    const initialCenter = hasCoordinates(initialCoordinates.latitude, initialCoordinates.longitude)
      ? [initialCoordinates.latitude, initialCoordinates.longitude]
      : DEFAULT_CENTER;
    const map = L.map(mapElementRef.current, { zoomControl: true }).setView(
      initialCenter,
      hasCoordinates(initialCoordinates.latitude, initialCoordinates.longitude) ? 17 : 15,
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    map.on("click", ({ latlng }) => {
      activeLocationRequestRef.current += 1;
      onChangeRef.current(createLocationSelection(
        addressRef.current,
        latlng.lat,
        latlng.lng,
      ));
      setNotice("선택한 핀 위치가 저장됐어요. 아래 상세주소도 확인해 주세요.");
    });
    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      mountedRef.current = false;
      activeLocationRequestRef.current += 1;
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!hasCoordinates(latitude, longitude)) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const position = [latitude, longitude];
    if (!markerRef.current) {
      const pin = L.divIcon({
        className: "location-pin-shell",
        html: '<span class="location-pin" aria-hidden="true"></span>',
        iconSize: [28, 36],
        iconAnchor: [14, 34],
      });
      markerRef.current = L.marker(position, { draggable: true, icon: pin }).addTo(map);
      markerRef.current.on("dragend", (event) => {
        const nextPosition = event.target.getLatLng();
        onChangeRef.current(createLocationSelection(
          addressRef.current,
          nextPosition.lat,
          nextPosition.lng,
        ));
        setNotice("핀을 옮겼어요. 아래 상세주소도 확인해 주세요.");
      });
    } else {
      markerRef.current.setLatLng(position);
    }
    map.setView(position, Math.max(map.getZoom(), 16));
  }, [latitude, longitude]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setNotice("이 브라우저에서는 현재 위치를 사용할 수 없어요. 지도나 상세주소를 이용해 주세요.");
      return;
    }
    const requestId = activeLocationRequestRef.current + 1;
    activeLocationRequestRef.current = requestId;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!isActiveLocationRequest(requestId, activeLocationRequestRef.current, mountedRef.current)) return;
        onChange(createLocationSelection(
          address.trim() || "현재 위치 주변",
          coords.latitude,
          coords.longitude,
        ));
        setNotice("현재 위치에 핀을 표시했어요. 상세주소를 더 정확하게 적어 주세요.");
        setIsLocating(false);
      },
      () => {
        if (!isActiveLocationRequest(requestId, activeLocationRequestRef.current, mountedRef.current)) return;
        setNotice("위치 권한을 확인하지 못했어요. 지도에 핀을 찍거나 상세주소를 입력해 주세요.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function changeAddress(event) {
    onChange(createLocationSelection(event.target.value, null, null));
  }

  function clearPin() {
    activeLocationRequestRef.current += 1;
    onChange(createLocationSelection(address, null, null));
    setNotice("지도 핀만 지웠어요. 상세주소는 그대로 사용할 수 있어요.");
  }

  return (
    <section className="location-picker">
      <div className="location-picker-heading">
        <div>
          <strong>출발 위치 정하기</strong>
          <p>현재 위치를 사용하거나 지도를 눌러 핀을 옮길 수 있어요.</p>
        </div>
        <button className="location-button compact" disabled={isLocating} type="button" onClick={useCurrentLocation}>
          {isLocating ? "위치 확인 중..." : "⌖ 현재 내 위치 사용"}
        </button>
      </div>
      <div ref={mapElementRef} className="location-map" aria-label="출발 위치 지도" />
      <div className="location-picker-footer">
        <label htmlFor={inputId}>
          {label}
          <input
            id={inputId}
            maxLength="80"
            minLength="2"
            placeholder="예: 중앙도서관 북문, 학생회관 1층 앞"
            required
            value={address}
            onChange={changeAddress}
          />
        </label>
        {hasCoordinates(latitude, longitude) && (
          <div className="coordinate-status">
            <span>핀 선택됨 · {latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
            <button type="button" onClick={clearPin}>핀 지우기</button>
          </div>
        )}
        {notice && <p className="location-picker-notice">{notice}</p>}
        <p className="location-privacy-note">
          {LOCATION_PRIVACY_NOTICE}
        </p>
      </div>
    </section>
  );
}

export default LocationPicker;
