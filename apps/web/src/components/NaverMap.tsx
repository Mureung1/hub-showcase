import { LocateFixed, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DURYU_CENTER } from "../data/photoSpots";
import { loadNaverMaps } from "../services/naverMaps";
import type { PhotoSpot, SpotKind } from "../types/photoSpot";

type Props = {
  spots: PhotoSpot[];
  selectedId?: string;
  mode: SpotKind;
  selectable?: boolean;
  onSelect: (spot: PhotoSpot) => void;
  onCoordinateSelect?: (coordinate: { latitude: number; longitude: number }) => void;
};

export function NaverMap({ spots, selectedId, mode, selectable = false, onSelect, onCoordinateSelect }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);
  const markerRefs = useRef<{ setMap: (map: unknown | null) => void }[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let mounted = true;
    loadNaverMaps()
      .then((maps) => {
        if (!mounted || !elementRef.current) return;
        const map = new maps.Map(elementRef.current, {
          center: new maps.LatLng(DURYU_CENTER.latitude, DURYU_CENTER.longitude),
          zoom: 15,
          zoomControl: false,
          mapDataControl: false,
        });
        mapRef.current = map;
        if (selectable && onCoordinateSelect) {
          maps.Event.addListener(map, "click", (event) => {
            onCoordinateSelect({ latitude: event.coord.lat(), longitude: event.coord.lng() });
          });
        }
        setStatus("ready");
      })
      .catch(() => mounted && setStatus("error"));
    return () => {
      mounted = false;
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current = [];
    };
  }, [selectable, onCoordinateSelect]);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    let cancelled = false;
    loadNaverMaps().then((maps) => {
      if (cancelled || !mapRef.current) return;
      markerRefs.current.forEach((marker) => marker.setMap(null));
      markerRefs.current = spots.map((spot) => {
        const isSelected = spot.id === selectedId;
        const isCandidate = spot.kind === "candidate";
        const content = `<button class="naver-marker ${isCandidate ? "candidate" : "official"} ${isSelected ? "selected" : ""}" aria-label="${spot.name}"><span>${isCandidate ? "♥" : "●"}</span>${isCandidate ? `<b>${spot.likes}</b>` : ""}</button>`;
        const marker = new maps.Marker({
          position: new maps.LatLng(spot.latitude, spot.longitude),
          map: mapRef.current,
          icon: { content, size: new maps.Size(48, 54), anchor: new maps.Point(24, 48) },
          title: spot.name,
        });
        maps.Event.addListener(marker, "click", () => onSelect(spot));
        return marker;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [spots, selectedId, status, onSelect, mode]);

  const resetMap = () => {
    loadNaverMaps().then((maps) => {
      const map = mapRef.current as { setCenter?: (coord: unknown) => void; setZoom?: (zoom: number) => void } | null;
      map?.setCenter?.(new maps.LatLng(DURYU_CENTER.latitude, DURYU_CENTER.longitude));
      map?.setZoom?.(15);
    });
  };

  return (
    <div className="map-canvas" aria-label="네이버 지도">
      <div ref={elementRef} className="map-element" />
      {status !== "ready" && (
        <div className="map-status">
          {status === "loading" ? "네이버 지도를 불러오는 중..." : "지도를 불러오지 못했어요. Client ID와 허용 URL을 확인해 주세요."}
        </div>
      )}
      <div className="map-controls">
        <button type="button" className="map-control" onClick={resetMap} aria-label="두류공원으로 이동"><LocateFixed size={22} /></button>
        <button type="button" className="map-control" aria-label="지도 레이어"><MapPin size={21} /></button>
      </div>
    </div>
  );
}
