import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { bakeries } from '../data/bakeries.js';
import { useAppStore } from '../store/useAppStore.js';
import { computeTopRoutes, estimateMinutes, RANK_COLORS } from '../utils/routeCalc.js';
import { normalizeToViewBox } from '../utils/geo.js';
import RankCard from '../components/RankCard.jsx';
import Modal from '../components/Modal.jsx';
import Mascot from '../components/Mascot.jsx';
import { ClockIcon, ShareIcon } from '../components/icons.jsx';

const MODES = [
  ['walk', '도보'],
  ['car', '자동차'],
  ['bus', '버스'],
];

// TODO(3주차): POST /api/routes로 서버(완전탐색/휴리스틱) 결과를 받아 이 프론트 미리보기 계산을 대체.
export default function RouteScreen() {
  const selectedIds = useAppStore((s) => s.selectedIds);
  const activeRankIdx = useAppStore((s) => s.activeRankIdx);
  const setActiveRankIdx = useAppStore((s) => s.setActiveRankIdx);
  const saveCourse = useAppStore((s) => s.saveCourse);
  const showToast = useAppStore((s) => s.showToast);

  const [showModeTabs, setShowModeTabs] = useState(false);
  const [mode, setMode] = useState('walk');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [courseName, setCourseName] = useState('');

  const chosen = useMemo(() => [...selectedIds].map((id) => bakeries.find((b) => b.id === id)), [selectedIds]);
  const routes = useMemo(() => (chosen.length >= 2 ? computeTopRoutes(chosen) : []), [chosen]);
  const route = routes[activeRankIdx] || routes[0];
  // 미니맵은 실제 축척 없이 상대적 배치만 보여주면 되므로 lat/lng을 0~100 뷰박스로 정규화해서 그린다.
  const positioned = useMemo(() => (route ? normalizeToViewBox(route.order) : []), [route]);

  if (chosen.length < 2) {
    return (
      <section className="screen-route">
        <div className="route-empty">
          <Mascot />
          <p>
            빵집을 2곳 이상 선택하면
            <br />
            이곳에서 최적 동선을 보여드려요.
          </p>
          <Link to="/" className="btn-solid">
            지도에서 선택하기
          </Link>
        </div>
      </section>
    );
  }

  const handleShare = () => {
    const text = route.order.map((b) => b.name).join(' → ');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast('링크가 복사되었습니다'));
    } else {
      showToast('이 환경에서는 클립보드 복사를 지원하지 않아요');
    }
  };

  const handleSaveCourse = () => {
    const name = courseName.trim() || `${route.order[0].name} 코스`;
    saveCourse({ name, order: route.order.map((b) => b.id) });
    setSaveModalOpen(false);
    showToast('코스가 저장되었습니다');
  };

  return (
    <section className="screen-route">
      <div className="route-map">
        <svg className="lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          {positioned.slice(0, -1).map((a, i) => {
            const b = positioned[i + 1];
            return (
              <line
                key={`${a.id}-${b.id}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={RANK_COLORS[(i + 1) % RANK_COLORS.length]}
                strokeWidth="0.8"
              />
            );
          })}
        </svg>
        {positioned.map((b, i) => (
          <div className="pin" key={b.id} style={{ left: `${b.x}%`, top: `${b.y}%` }}>
            <span className="dot" style={{ background: RANK_COLORS[i % RANK_COLORS.length] }}>
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      <div className="route-body">
        <div className="rank-cards">
          {routes.map((r, i) => (
            <RankCard key={i} route={r} index={i} active={i === activeRankIdx} onClick={() => setActiveRankIdx(i)} />
          ))}
        </div>

        <div className="stop-list">
          {route.order.map((b, i) => (
            <div className="stop-item" key={b.id} style={{ borderLeftColor: RANK_COLORS[i % RANK_COLORS.length] }}>
              <span className="num">({i + 1})</span>
              <span>{b.name}</span>
            </div>
          ))}
        </div>

        <div className="route-actions">
          <button type="button" className="btn-outline" onClick={handleShare}>
            <ShareIcon />
            공유하기
          </button>
          <button type="button" className="btn-solid" onClick={() => setSaveModalOpen(true)}>
            이 코스 저장하기
          </button>
        </div>

        <button type="button" className="time-toggle-btn" onClick={() => setShowModeTabs(true)}>
          <ClockIcon />
          전체 이동 시간 보기
        </button>

        {showModeTabs && (
          <>
            <div className="mode-tabs">
              {MODES.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`mode-tab${mode === value ? ' active' : ''}`}
                  onClick={() => setMode(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mode-result">
              {MODES.find(([v]) => v === mode)[1]} 이동 시 약 {estimateMinutes(route.dist, mode)}분 소요
              <small>거리 기반 근사치입니다 (1차 구현). 이후 실제 API 연동 예정.</small>
            </div>
          </>
        )}
      </div>

      <Modal open={saveModalOpen} onClose={() => setSaveModalOpen(false)}>
        <div className="modal-head">
          <h2>코스 저장하기</h2>
        </div>
        <div className="field">
          <label htmlFor="course-name-input">코스 이름</label>
          <input
            id="course-name-input"
            type="text"
            placeholder={`예: ${route.order[0].name} 코스`}
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button type="button" onClick={() => setSaveModalOpen(false)}>
            취소
          </button>
          <button type="button" className="primary" onClick={handleSaveCourse}>
            저장
          </button>
        </div>
      </Modal>
    </section>
  );
}
