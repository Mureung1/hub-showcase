import { useEffect, useRef } from "react";
import L from "leaflet";

const DEFAULT_CENTER = [37.5665, 126.978];

function PickupVoteMap({ candidates, disabled, onVote, selectedName }) {
  const hasLocatedCandidates = candidates.some(
    ({ latitude, longitude }) => Number.isFinite(latitude) && Number.isFinite(longitude),
  );
  const elementRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const onVoteRef = useRef(onVote);

  useEffect(() => {
    onVoteRef.current = onVote;
  }, [onVote]);

  useEffect(() => {
    if (!elementRef.current || mapRef.current) return undefined;
    const map = L.map(elementRef.current, { scrollWheelZoom: false }).setView(DEFAULT_CENTER, 15);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [hasLocatedCandidates]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    layerRef.current?.remove();
    const layer = L.layerGroup().addTo(map);
    layerRef.current = layer;
    const located = candidates.filter(
      ({ latitude, longitude }) => Number.isFinite(latitude) && Number.isFinite(longitude),
    );

    located.forEach((candidate, index) => {
      const selected = candidate.name === selectedName;
      const icon = L.divIcon({
        className: "vote-map-pin-shell",
        html: `<span class="vote-map-pin${selected ? " selected" : ""}"><b>${index + 1}</b></span>`,
        iconSize: [34, 40],
        iconAnchor: [17, 38],
      });
      const marker = L.marker([candidate.latitude, candidate.longitude], { icon }).addTo(layer);
      marker.bindTooltip(candidate.name, { direction: "top", offset: [0, -30] });
      if (!disabled) marker.on("click", () => onVoteRef.current(candidate.name));
    });

    if (located.length === 1) {
      map.setView([located[0].latitude, located[0].longitude], 16);
    } else if (located.length > 1) {
      map.fitBounds(located.map(({ latitude, longitude }) => [latitude, longitude]), {
        maxZoom: 16,
        padding: [35, 35],
      });
    }
  }, [candidates, disabled, selectedName]);

  if (!hasLocatedCandidates) {
    return <div className="vote-map-empty">지도 위치가 있는 후보가 아직 없어요. 아래 장소 목록에서 투표할 수 있어요.</div>;
  }

  return (
    <div className="vote-map-wrap">
      <div ref={elementRef} className="vote-map" aria-label="공동 수령지 후보 지도" />
      <p>지도 핀이나 아래 후보를 눌러 투표할 수 있어요. 핀 위치는 개인정보 보호를 위해 약 100m 단위로 표시됩니다.</p>
    </div>
  );
}

export default PickupVoteMap;
