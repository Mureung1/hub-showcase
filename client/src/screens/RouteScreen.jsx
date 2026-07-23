import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore.js';
import { fetchTopRoutes } from '../api/routes.js';
import { estimateMinutes, RANK_COLORS, MODES } from '../utils/routeCalc.js';
import { normalizeToViewBox } from '../utils/geo.js';
import RankCard from '../components/RankCard.jsx';
import Modal from '../components/Modal.jsx';
import Mascot from '../components/Mascot.jsx';
import { ClockIcon, ShareIcon, CloseIcon } from '../components/icons.jsx';

export default function RouteScreen() {
  const bakeries = useAppStore((s) => s.bakeries);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const removeFromSelection = useAppStore((s) => s.removeFromSelection);
  const activeRankIdx = useAppStore((s) => s.activeRankIdx);
  const setActiveRankIdx = useAppStore((s) => s.setActiveRankIdx);
  const saveCourse = useAppStore((s) => s.saveCourse);
  const showToast = useAppStore((s) => s.showToast);
  const userLocation = useAppStore((s) => s.userLocation);
  const userLocationLabel = useAppStore((s) => s.userLocationLabel);
  const consumePendingRecommendation = useAppStore((s) => s.consumePendingRecommendation);

  const [showModeTabs, setShowModeTabs] = useState(false);
  const [mode, setMode] = useState('walk');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [routesStatus, setRoutesStatus] = useState('idle'); // idle | loading | ready | error
  const [serverRoutes, setServerRoutes] = useState([]);
  // 자동 추천받기에서 넘어온 경우, 서버가 이미 계산까지 끝낸 결과가 있으므로 아래 fetch 이펙트를
  // 한 번은 건너뛴다(그렇지 않으면 같은 계산을 /api/routes로 한 번 더 요청하게 된다).
  const skipNextFetchRef = useRef(false);

  useEffect(() => {
    const pending = consumePendingRecommendation();
    if (!pending) return;
    setServerRoutes(pending.routes);
    setMode(pending.mode);
    setRoutesStatus('ready');
    skipNextFetchRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chosen = useMemo(
    () => [...selectedIds].map((id) => bakeries.find((b) => b.id === id)),
    [selectedIds, bakeries]
  );

  // 선택/출발지가 바뀔 때마다 서버에 동선 계산을 요청한다 — 완전탐색/휴리스틱 로직은
  // server/src/services/routeService.js에서 처리(CLAUDE.md: 프론트는 위치 데이터만 전달).
  useEffect(() => {
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    if (chosen.length < 2) return;
    let cancelled = false;
    setRoutesStatus('loading');
    fetchTopRoutes({ origin: userLocation, bakeries: chosen })
      .then((routes) => {
        if (cancelled) return;
        setServerRoutes(routes);
        setRoutesStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setRoutesStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [chosen, userLocation]);

  // 서버는 id 순서 + 거리만 주므로, 화면에 필요한 빵집 상세 정보는 store에서 매핑해 붙인다.
  const routes = useMemo(
    () =>
      serverRoutes.map((r) => ({
        order: r.order.map((id) => bakeries.find((b) => b.id === id)),
        dist: r.distanceKm,
      })),
    [serverRoutes, bakeries]
  );
  const route = routes[activeRankIdx] || routes[0];
  // 지도/미니맵에 출발지도 함께 그리기 위해 맨 앞에 합성 노드로 끼워 넣는다.
  const origin = useMemo(
    () => ({ id: 'origin', name: userLocationLabel, lat: userLocation.lat, lng: userLocation.lng }),
    [userLocation, userLocationLabel]
  );
  // 미니맵은 실제 축척 없이 상대적 배치만 보여주면 되므로 lat/lng을 0~100 뷰박스로 정규화해서 그린다.
  const positioned = useMemo(() => (route ? normalizeToViewBox([origin, ...route.order]) : []), [route, origin]);

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

  if (routesStatus === 'error') {
    return (
      <section className="screen-route">
        <div className="route-empty">
          <Mascot />
          <p>
            동선을 계산하지 못했어요.
            <br />
            잠시 후 다시 시도해주세요.
          </p>
        </div>
      </section>
    );
  }

  if (!route) {
    return (
      <section className="screen-route">
        <div className="route-empty">
          <Mascot />
          <p>동선을 계산하고 있어요...</p>
        </div>
      </section>
    );
  }

  const handleShare = () => {
    const text = [origin.name, ...route.order.map((b) => b.name)].join(' → ');
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
      <div className="route-main">
        <div className="route-ranks">
          {routes.map((r, i) => (
            <RankCard
              key={i}
              route={r}
              index={i}
              active={i === activeRankIdx}
              originLabel={origin.name}
              onClick={() => setActiveRankIdx(i)}
            />
          ))}
        </div>

        <div className="route-map-center">
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
                  stroke={RANK_COLORS[i % RANK_COLORS.length]}
                  strokeWidth="0.8"
                  pathLength="1"
                  style={{ animationDelay: `${i * 0.35}s` }}
                />
              );
            })}
          </svg>
          {positioned.map((p, i) => {
            const isOrigin = i === 0;
            return (
              <div
                className="pin"
                key={p.id}
                style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${i * 0.35}s` }}
              >
                <span
                  className="dot"
                  style={{ background: isOrigin ? 'var(--ink)' : RANK_COLORS[(i - 1) % RANK_COLORS.length] }}
                >
                  {isOrigin ? (
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="#fff">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z" />
                    </svg>
                  ) : (
                    i
                  )}
                </span>
              </div>
            );
          })}
        </div>

        <div className="route-selection">
          <div className="route-selection-actions">
            <button type="button" className="btn-outline" onClick={handleShare}>
              <ShareIcon />
              공유하기
            </button>
            <button type="button" className="btn-solid" onClick={() => setSaveModalOpen(true)}>
              이 코스 저장하기
            </button>
          </div>
          <div className="route-selection-list">
            {chosen.map((b) => (
              <div className="route-picked-item" key={b.id}>
                <span>{b.name}</span>
                <button
                  type="button"
                  className="remove-btn"
                  aria-label={`${b.name} 선택 해제`}
                  onClick={() => removeFromSelection(b.id)}
                >
                  <CloseIcon style={{ width: 11, height: 11 }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="route-time-bar">
        <button type="button" className="time-toggle-btn" onClick={() => setShowModeTabs((v) => !v)}>
          <ClockIcon />
          이동 거리 보기
        </button>

        {showModeTabs && (
          <div className="route-time-panel">
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
          </div>
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
