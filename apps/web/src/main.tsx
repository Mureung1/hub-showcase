import { ArrowLeft, Camera, ChevronRight, Heart, MapPin, Plus, Search, ShieldCheck, X } from "lucide-react";
import { ChangeEvent, ReactNode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { NaverMap } from "./components/NaverMap";
import { photoSpots } from "./data/photoSpots";
import type { PhotoSpot, ProposalDraft, SpotKind } from "./types/photoSpot";
import "./styles/app.css";

type View = "map" | "detail" | "proposal" | "complete";

function App() {
  const [view, setView] = useState<View>("map");
  const [mode, setMode] = useState<SpotKind>("official");
  const [spots, setSpots] = useState(photoSpots);
  const [selectedId, setSelectedId] = useState(photoSpots[0].id);
  const [liked, setLiked] = useState<string[]>([]);
  const [draft, setDraft] = useState<ProposalDraft>({ latitude: 35.8547, longitude: 128.5663, address: "두류공원 안에서 위치를 선택해 주세요", frame: "couple", imageName: null });
  const visibleSpots = useMemo(() => spots.filter((spot) => spot.kind === mode), [mode, spots]);
  const selectedSpot = spots.find((spot) => spot.id === selectedId) ?? visibleSpots[0];

  const selectSpot = (spot: PhotoSpot) => {
    setSelectedId(spot.id);
    setMode(spot.kind);
  };

  const toggleLike = () => {
    if (!selectedSpot || selectedSpot.kind !== "candidate") return;
    const hasLiked = liked.includes(selectedSpot.id);
    setLiked((current) => hasLiked ? current.filter((id) => id !== selectedSpot.id) : [...current, selectedSpot.id]);
    setSpots((current) => current.map((spot) => spot.id === selectedSpot.id ? { ...spot, likes: (spot.likes ?? 0) + (hasLiked ? -1 : 1) } : spot));
  };

  const selectProposalCoordinate = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
    setDraft((current) => ({ ...current, latitude, longitude, address: `선택한 촬영 위치 (${latitude.toFixed(5)}, ${longitude.toFixed(5)})` }));
  };

  const receiveImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setDraft((current) => ({ ...current, imageName: file.name }));
  };

  const renderMap = () => (
    <>
      <header className="map-header">
        <label className="search-box"><Search size={21} /><input placeholder="장소 검색" aria-label="장소 검색" /></label>
      </header>
      <div className="segment-control" role="tablist" aria-label="포토스팟 종류">
        <button className={mode === "official" ? "active" : ""} type="button" onClick={() => { setMode("official"); setSelectedId(spots.find((spot) => spot.kind === "official")!.id); }}>공식 포토스팟</button>
        <button className={mode === "candidate" ? "active" : ""} type="button" onClick={() => { setMode("candidate"); setSelectedId(spots.find((spot) => spot.kind === "candidate")!.id); }}>후보 보기</button>
      </div>
      <NaverMap spots={visibleSpots} selectedId={selectedSpot?.id} mode={mode} onSelect={selectSpot} />
      <BottomSheet mode={mode} spots={visibleSpots} selectedId={selectedSpot?.id} onSelect={selectSpot} onDetail={() => setView("detail")} onPropose={() => setView("proposal")} />
    </>
  );

  return (
    <main className="app-shell">
      <section className="phone-frame">
        <div className="status-bar"><span>9:41</span><span>● ● ● 〰 ▰</span></div>
        {view === "map" && renderMap()}
        {view === "detail" && selectedSpot && <DetailScreen spot={selectedSpot} liked={liked.includes(selectedSpot.id)} onBack={() => setView("map")} onLike={toggleLike} onPropose={() => setView("proposal")} />}
        {view === "proposal" && <ProposalScreen draft={draft} onBack={() => setView("map")} onCoordinateSelect={selectProposalCoordinate} onImageSelect={receiveImage} onFrameChange={(frame) => setDraft((current) => ({ ...current, frame }))} onSubmit={() => setView("complete")} />}
        {view === "complete" && <CompleteScreen onMap={() => setView("map")} />}
      </section>
      <aside className="desktop-caption"><p>Photo Navigation MVP</p><h1>지도에서 포토스팟을 고르고<br />원하는 구도를 찾아 찍어요.</h1><span>실제 네이버 지도 · 후보 좋아요 · 관리자 검토 흐름</span></aside>
    </main>
  );
}

function BottomSheet({ mode, spots, selectedId, onSelect, onDetail, onPropose }: { mode: SpotKind; spots: PhotoSpot[]; selectedId?: string; onSelect: (spot: PhotoSpot) => void; onDetail: () => void; onPropose: () => void }) {
  return <section className="bottom-sheet"><div className="sheet-handle" /><div className="sheet-tabs"><span className={mode === "official" ? "active" : ""}>공식</span><span className={mode === "candidate" ? "active" : ""}>후보 {mode === "candidate" ? spots.length : ""}</span><button type="button" onClick={onPropose}><Plus size={16} /> 후보 제안</button></div><div className="spot-list">{spots.map((spot) => <button className={`spot-row ${spot.id === selectedId ? "selected" : ""}`} type="button" key={spot.id} onClick={() => { onSelect(spot); onDetail(); }}><PhotoThumbnail tone={spot.imageTone} /><span className="spot-row-copy"><strong>{spot.name}</strong><small>{spot.area}</small>{spot.kind === "candidate" && <em><Heart size={14} fill="currentColor" /> {spot.likes} / {spot.threshold}</em>}</span><ChevronRight size={23} /></button>)}</div></section>;
}

function DetailScreen({ spot, liked, onBack, onLike, onPropose }: { spot: PhotoSpot; liked: boolean; onBack: () => void; onLike: () => void; onPropose: () => void }) {
  return <section className="detail-screen"><header className="page-header"><button type="button" onClick={onBack} aria-label="뒤로"><ArrowLeft size={24} /></button><strong>{spot.kind === "candidate" ? "후보 포토스팟" : "공식 포토스팟"}</strong><button type="button" aria-label="닫기"><X size={22} /></button></header><PhotoThumbnail tone={spot.imageTone} large /><article className="detail-card"><div className="title-row"><div><h2>{spot.name}</h2><p>{spot.area}</p></div>{spot.kind === "candidate" && <button className={`like-button ${liked ? "liked" : ""}`} type="button" onClick={onLike}><Heart size={20} fill={liked ? "currentColor" : "none"} /> {spot.likes}</button>}</div>{spot.kind === "candidate" && <div className="threshold-box"><b>좋아요 {spot.likes} / {spot.threshold}</b><span>좋아요 10개 달성 후 관리자 검토를 거쳐 공식 포토스팟으로 등록됩니다.</span></div>}<Info label="위치" text="대구 두류공원 포토스팟 영역" icon={<MapPin size={20} />} /><Info label="설명" text={spot.description} icon={<Camera size={20} />} /><button className="outline-cta" type="button" onClick={onPropose}>후보 제안 <ChevronRight size={21} /></button></article></section>;
}

function ProposalScreen({ draft, onBack, onCoordinateSelect, onImageSelect, onFrameChange, onSubmit }: { draft: ProposalDraft; onBack: () => void; onCoordinateSelect: (coordinate: { latitude: number; longitude: number }) => void; onImageSelect: (event: ChangeEvent<HTMLInputElement>) => void; onFrameChange: (frame: "solo" | "couple") => void; onSubmit: () => void }) {
  return <section className="proposal-screen"><header className="page-header"><button type="button" onClick={onBack} aria-label="뒤로"><ArrowLeft size={24} /></button><strong>후보 제안</strong><span /></header><div className="proposal-map"><NaverMap spots={[]} mode="candidate" selectable onSelect={() => undefined} onCoordinateSelect={onCoordinateSelect} /><div className="map-tip">원하는 촬영 지점을 눌러 주세요</div></div><div className="proposal-form"><label>선택한 위치 <span>{draft.address}</span></label><label className="upload-box"><input type="file" accept="image/*" onChange={onImageSelect} /><Camera size={24} /><b>{draft.imageName ?? "사진 추가"}</b><small>{draft.imageName ? "사진이 선택되었습니다" : "최대 4장"}</small></label><div className="field-label">프레임 선택</div><div className="frame-segment"><button type="button" className={draft.frame === "solo" ? "active" : ""} onClick={() => onFrameChange("solo")}>1인</button><button type="button" className={draft.frame === "couple" ? "active" : ""} onClick={() => onFrameChange("couple")}>커플</button></div><button className="primary-cta" type="button" onClick={onSubmit}>후보 제안 제출</button></div></section>;
}

function CompleteScreen({ onMap }: { onMap: () => void }) { return <section className="complete-screen"><Heart className="heart-badge" size={47} fill="currentColor" /><h1>좋아요 10개 달성!</h1><p>후보 장소가 기준 좋아요를 달성했어요.</p><div className="vertical-flow"><div><Heart size={29} fill="currentColor" /><b>좋아요 기준 달성</b></div><i>↓</i><div><ShieldCheck size={42} /><b>관리자 검토</b><span>관리자가 사진과 위치, 구도를 확인합니다.</span></div><i>↓</i><div><MapPin size={42} fill="currentColor" /><b>공식 포토스팟 등록</b><span>승인 후 지도에 공식 마커로 노출됩니다.</span></div></div><small>※ AI 자동 승인이 아닌 관리자 직접 검토 흐름입니다.</small><button className="primary-cta" type="button" onClick={onMap}>지도 보기</button></section>; }

function PhotoThumbnail({ tone, large = false }: { tone: PhotoSpot["imageTone"]; large?: boolean }) { return <div className={`photo-thumb ${tone} ${large ? "large" : ""}`}><div className="photo-sky" /><div className="photo-ground" /><div className="photo-subject one" /><div className="photo-subject two" /></div>; }
function Info({ label, text, icon }: { label: string; text: string; icon: ReactNode }) { return <div className="info-row"><span>{icon}</span><div><b>{label}</b><p>{text}</p></div></div>; }

createRoot(document.getElementById("root")!).render(<App />);
