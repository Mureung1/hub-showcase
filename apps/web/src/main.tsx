import { ArrowLeft, Camera, ChevronRight, Heart, MapPin, Plus, Search, ShieldCheck, X } from "lucide-react";
import { ChangeEvent, FormEvent, ReactNode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CameraCapture } from "./components/CameraCapture";
import { NaverMap } from "./components/NaverMap";
import { photoSpots, shotFrames } from "./data/photoSpots";
import type { PhotoSpot, ProposalDraft, ShotFrame, SpotKind } from "./types/photoSpot";
import "./styles/app.css";

type View = "map" | "detail" | "frames" | "camera" | "capture" | "proposal" | "complete";

function App() {
  const [view, setView] = useState<View>("map");
  const [mode, setMode] = useState<SpotKind>("official");
  const [spots, setSpots] = useState(photoSpots);
  const [selectedId, setSelectedId] = useState(photoSpots[0].id);
  const [selectedFrame, setSelectedFrame] = useState<ShotFrame>(shotFrames[0]);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [liked, setLiked] = useState<string[]>([]);
  const [draft, setDraft] = useState<ProposalDraft>({ latitude: 35.8547, longitude: 128.5663, address: "두류공원 안에서 위치를 선택해 주세요", frame: "couple", imageName: null });
  const visibleSpots = useMemo(() => spots.filter((spot) => spot.kind === mode), [mode, spots]);
  const selectedSpot = spots.find((spot) => spot.id === selectedId) ?? visibleSpots[0];

  const selectSpot = (spot: PhotoSpot) => { setSelectedId(spot.id); setMode(spot.kind); };
  const toggleLike = () => {
    if (!selectedSpot || selectedSpot.kind !== "candidate") return;
    const hasLiked = liked.includes(selectedSpot.id);
    setLiked((current) => hasLiked ? current.filter((id) => id !== selectedSpot.id) : [...current, selectedSpot.id]);
    setSpots((current) => current.map((spot) => spot.id === selectedSpot.id ? { ...spot, likes: (spot.likes ?? 0) + (hasLiked ? -1 : 1) } : spot));
  };
  const selectProposalCoordinate = ({ latitude, longitude }: { latitude: number; longitude: number }) => setDraft((current) => ({ ...current, latitude, longitude, address: `선택한 촬영 위치 (${latitude.toFixed(5)}, ${longitude.toFixed(5)})` }));
  const receiveImage = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) setDraft((current) => ({ ...current, imageName: file.name })); };

  return <main className="app-shell"><section className="phone-frame">
    <div className="status-bar"><span>9:41</span><span>● ● ● 〰 ▰</span></div>
    {view === "map" && <MapScreen mode={mode} spots={spots} visibleSpots={visibleSpots} selectedSpot={selectedSpot} onMode={setMode} onSelect={selectSpot} onDetail={() => setView("detail")} onPropose={() => setView("proposal")} />}
    {view === "detail" && selectedSpot && <DetailScreen spot={selectedSpot} liked={liked.includes(selectedSpot.id)} onBack={() => setView("map")} onLike={toggleLike} onFrames={() => setView("frames")} onPropose={() => setView("proposal")} />}
    {view === "frames" && selectedSpot && <FrameScreen spot={selectedSpot} selected={selectedFrame} onBack={() => setView("detail")} onSelect={(frame) => { setSelectedFrame(frame); setView("camera"); }} />}
    {view === "camera" && <CameraCapture frame={selectedFrame} onBack={() => setView("frames")} onCapture={(image) => { setCapturedImage(image); setView("capture"); }} />}
    {view === "capture" && <CaptureReview image={capturedImage} frame={selectedFrame} onRetake={() => setView("camera")} onMap={() => setView("map")} />}
    {view === "proposal" && <ProposalScreen draft={draft} onBack={() => setView("map")} onCoordinateSelect={selectProposalCoordinate} onImageSelect={receiveImage} onFrameChange={(frame) => setDraft((current) => ({ ...current, frame }))} onSubmit={() => setView("complete")} />}
    {view === "complete" && <CompleteScreen onMap={() => setView("map")} />}
  </section></main>;
}

function MapScreen({ mode, spots, visibleSpots, selectedSpot, onMode, onSelect, onDetail, onPropose }: { mode: SpotKind; spots: PhotoSpot[]; visibleSpots: PhotoSpot[]; selectedSpot?: PhotoSpot; onMode: (mode: SpotKind) => void; onSelect: (spot: PhotoSpot) => void; onDetail: () => void; onPropose: () => void }) {
  const [query, setQuery] = useState("");
  const searchResults = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return [];
    return spots.filter((spot) => [spot.name, spot.area, spot.address, spot.placeCategory].some((value) => value.toLowerCase().includes(keyword)));
  }, [query, spots]);
  const setTab = (next: SpotKind) => { onMode(next); onSelect(spots.find((spot) => spot.kind === next)!); };
  const selectSearchResult = (spot: PhotoSpot) => { onSelect(spot); setQuery(spot.name); };
  const submitSearch = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (searchResults[0]) selectSearchResult(searchResults[0]); };
  return <><header className="map-header"><form className="search-form" onSubmit={submitSearch}><label className="search-box"><Search size={21} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="장소 검색" aria-label="장소 검색" /><button type="submit" aria-label="검색">검색</button></label>{searchResults.length > 0 && <div className="search-results">{searchResults.map((spot) => <button type="button" key={spot.id} onClick={() => selectSearchResult(spot)}><span><b>{spot.name}</b><small>{spot.placeCategory} · {spot.address}</small></span><MapPin size={17} /></button>)}</div>}</form></header><div className="segment-control" role="tablist" aria-label="포토스팟 종류"><button className={mode === "official" ? "active" : ""} type="button" onClick={() => setTab("official")}>공식 포토스팟</button><button className={mode === "candidate" ? "active" : ""} type="button" onClick={() => setTab("candidate")}>후보 보기</button></div><NaverMap spots={visibleSpots} selectedId={selectedSpot?.id} mode={mode} onSelect={onSelect} /><BottomSheet mode={mode} spots={visibleSpots} selectedId={selectedSpot?.id} onSelect={onSelect} onDetail={onDetail} onPropose={onPropose} /></>;
}

function BottomSheet({ mode, spots, selectedId, onSelect, onDetail, onPropose }: { mode: SpotKind; spots: PhotoSpot[]; selectedId?: string; onSelect: (spot: PhotoSpot) => void; onDetail: () => void; onPropose: () => void }) { return <section className="bottom-sheet"><div className="sheet-handle" /><div className="sheet-tabs"><span className={mode === "official" ? "active" : ""}>공식</span><span className={mode === "candidate" ? "active" : ""}>후보 {mode === "candidate" ? spots.length : ""}</span><button type="button" onClick={onPropose}><Plus size={16} /> 후보 제안</button></div><div className="spot-list">{spots.map((spot) => <button className={`spot-row ${spot.id === selectedId ? "selected" : ""}`} type="button" key={spot.id} onClick={() => { onSelect(spot); onDetail(); }}><PhotoThumbnail tone={spot.imageTone} /><span className="spot-row-copy"><strong>{spot.name}</strong><small>{spot.area}</small>{spot.kind === "candidate" && <em><Heart size={14} fill="currentColor" /> {spot.likes} / {spot.threshold}</em>}</span><ChevronRight size={23} /></button>)}</div></section>; }

function DetailScreen({ spot, liked, onBack, onLike, onFrames, onPropose }: { spot: PhotoSpot; liked: boolean; onBack: () => void; onLike: () => void; onFrames: () => void; onPropose: () => void }) { return <section className="detail-screen"><header className="page-header"><button type="button" onClick={onBack} aria-label="뒤로"><ArrowLeft size={24} /></button><strong>{spot.kind === "candidate" ? "후보 포토스팟" : "공식 포토스팟"}</strong><button type="button" onClick={onBack} aria-label="닫기"><X size={22} /></button></header><PhotoThumbnail tone={spot.imageTone} large /><article className="detail-card"><div className="title-row"><div><h2>{spot.name}</h2><p>{spot.placeCategory}</p></div>{spot.kind === "candidate" && <button className={`like-button ${liked ? "liked" : ""}`} type="button" onClick={onLike}><Heart size={20} fill={liked ? "currentColor" : "none"} /> {spot.likes}</button>}</div>{spot.kind === "candidate" && <div className="threshold-box"><b>좋아요 {spot.likes} / {spot.threshold}</b><span>좋아요 10개 달성 후 관리자 검토를 거쳐 공식 포토스팟으로 등록됩니다.</span></div>}<Info label="장소" text={spot.address} icon={<MapPin size={20} />} /><Info label="촬영 팁" text={spot.placeTip} icon={<Camera size={20} />} /><Info label="포토스팟 안내" text={spot.description} icon={<ChevronRight size={20} />} /><button className="primary-cta" type="button" onClick={onFrames}>프레임 고르고 사진 찍기 <Camera size={19} /></button><button className="text-cta" type="button" onClick={onPropose}>이 장소를 후보로 제안하기</button></article></section>; }

function FrameScreen({ spot, selected, onBack, onSelect }: { spot: PhotoSpot; selected: ShotFrame; onBack: () => void; onSelect: (frame: ShotFrame) => void }) { return <section className="frame-screen"><header className="page-header"><button type="button" onClick={onBack} aria-label="뒤로"><ArrowLeft size={24} /></button><div><strong>프레임 선택</strong><small>{spot.name}</small></div><span /></header><p className="screen-intro">원하는 구도를 고르면 바로 카메라 오버레이로 이어집니다.</p><div className="frame-list">{shotFrames.map((frame) => <button key={frame.id} className={`frame-card ${selected.id === frame.id ? "selected" : ""}`} type="button" onClick={() => onSelect(frame)}><PhotoThumbnail tone={frame.tone} /><span><b>{frame.title}</b><small>{frame.subtitle}</small><em>{frame.guide}</em></span><ChevronRight size={22} /></button>)}</div></section>; }

function CaptureReview({ image, frame, onRetake, onMap }: { image: string | null; frame: ShotFrame; onRetake: () => void; onMap: () => void }) { return <section className="capture-review"><header className="page-header"><span /><strong>촬영 결과</strong><span /></header><div className="captured-image">{image ? <img src={image} alt="방금 촬영한 사진" /> : <PhotoThumbnail tone={frame.tone} large />}</div><article><b>{frame.title}</b><p>사진이 촬영되었습니다. 실제 서비스에서는 이 사진을 기기에 저장하거나 유사도 비교에 사용할 수 있어요.</p><button className="primary-cta" type="button" onClick={onRetake}>다시 찍기</button><button className="text-cta" type="button" onClick={onMap}>지도 보기</button></article></section>; }

function ProposalScreen({ draft, onBack, onCoordinateSelect, onImageSelect, onFrameChange, onSubmit }: { draft: ProposalDraft; onBack: () => void; onCoordinateSelect: (coordinate: { latitude: number; longitude: number }) => void; onImageSelect: (event: ChangeEvent<HTMLInputElement>) => void; onFrameChange: (frame: "solo" | "couple") => void; onSubmit: () => void }) { return <section className="proposal-screen"><header className="page-header"><button type="button" onClick={onBack} aria-label="뒤로"><ArrowLeft size={24} /></button><strong>후보 제안</strong><span /></header><div className="proposal-map"><NaverMap spots={[]} mode="candidate" selectable onSelect={() => undefined} onCoordinateSelect={onCoordinateSelect} /><div className="map-tip">원하는 촬영 지점을 눌러 주세요</div></div><div className="proposal-form"><label>선택한 위치 <span>{draft.address}</span></label><label className="upload-box"><input type="file" accept="image/*" onChange={onImageSelect} /><Camera size={24} /><b>{draft.imageName ?? "사진 추가"}</b><small>{draft.imageName ? "사진이 선택되었습니다" : "최대 4장"}</small></label><div className="field-label">프레임 선택</div><div className="frame-segment"><button type="button" className={draft.frame === "solo" ? "active" : ""} onClick={() => onFrameChange("solo")}>1인</button><button type="button" className={draft.frame === "couple" ? "active" : ""} onClick={() => onFrameChange("couple")}>커플</button></div><button className="primary-cta" type="button" onClick={onSubmit}>후보 제안 제출</button></div></section>; }

function CompleteScreen({ onMap }: { onMap: () => void }) { return <section className="complete-screen"><Heart className="heart-badge" size={47} fill="currentColor" /><h1>좋아요 10개 달성!</h1><p>후보 장소가 기준 좋아요를 달성했어요.</p><div className="vertical-flow"><div><Heart size={29} fill="currentColor" /><b>좋아요 기준 달성</b></div><i>↓</i><div><ShieldCheck size={42} /><b>관리자 검토</b><span>관리자가 사진과 위치, 구도를 확인합니다.</span></div><i>↓</i><div><MapPin size={42} fill="currentColor" /><b>공식 포토스팟 등록</b><span>승인 후 지도에 공식 마커로 노출됩니다.</span></div></div><small>※ AI 자동 승인이 아닌 관리자 직접 검토 흐름입니다.</small><button className="primary-cta" type="button" onClick={onMap}>지도 보기</button></section>; }

function PhotoThumbnail({ tone, large = false }: { tone: PhotoSpot["imageTone"]; large?: boolean }) { return <div className={`photo-thumb ${tone} ${large ? "large" : ""}`}><div className="photo-sky" /><div className="photo-ground" /><div className="photo-subject one" /><div className="photo-subject two" /></div>; }
function Info({ label, text, icon }: { label: string; text: string; icon: ReactNode }) { return <div className="info-row"><span>{icon}</span><div><b>{label}</b><p>{text}</p></div></div>; }

createRoot(document.getElementById("root")!).render(<App />);
