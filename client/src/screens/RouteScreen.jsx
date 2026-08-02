import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore.js';
import { fetchTopRoutes, fetchTransitMinutes } from '../api/routes.js';
import { estimateMinutes, RANK_COLORS, MODES } from '../utils/routeCalc.js';
import RankCard from '../components/RankCard.jsx';
import RouteMapCanvas from '../components/RouteMapCanvas.jsx';
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
  // 실제 지도(RouteMapCanvas)에 찍을 점들 — 출발지부터 방문 순서 그대로.
  const routePoints = useMemo(
    () => (route ? [{ ...origin, isOrigin: true }, ...route.order.map((b) => ({ ...b, isOrigin: false }))] : []),
    [route, origin]
  );
  // 지도 위 선/핀 색은 지금 보고 있는 순위 카드와 같은 색으로 맞춰서, 카드와 동선이 바로 연결돼 보이게 한다.
  const routeColor = RANK_COLORS[activeRankIdx % RANK_COLORS.length];

  // "버스"(대중교통) 모드만 TMap 대중교통 API로 실제 소요시간을 구한다 — 도보/자동차는 여전히
  // routeCalc.js의 거리 기반 근사치. 방문 순서(route)나 모드가 바뀌면 다시 계산.
  const [transitStatus, setTransitStatus] = useState('idle'); // idle | loading | ready | error
  const [transitMinutes, setTransitMinutes] = useState(null);
  useEffect(() => {
    if (mode !== 'bus' || !showModeTabs || !route) return;
    let cancelled = false;
    setTransitStatus('loading');
    const points = [origin, ...route.order].map((p) => ({ lat: p.lat, lng: p.lng }));
    fetchTransitMinutes(points)
      .then((minutes) => {
        if (cancelled) return;
        setTransitMinutes(minutes);
        setTransitStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setTransitStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [mode, showModeTabs, route, origin]);

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
        {/* 효율적 동선 1~3순위 + 그 아래 선택한 베이커리(x로 취소)를 한 박스 안에 몰아넣고,
            박스 하나만 내부 스크롤되게 한다(사이드바 자체가 페이지를 밀어 늘리지 않도록). */}
        <aside className="route-sidebar">
          <div className="route-sidebar-scroll">
            <div className="route-ranks">
              {routes.map((r, i) => (
                <RankCard
                  key={i}
                  route={r}
                  index={i}
                  color={RANK_COLORS[i % RANK_COLORS.length]}
                  active={i === activeRankIdx}
                  onClick={() => setActiveRankIdx(i)}
                />
              ))}
            </div>

            <div className="route-selection-block">
              <div className="route-selection-head">
                <span>선택한 베이커리</span>
                <span className="count">{chosen.length}곳</span>
              </div>
              <div className="route-selection-list">
                <AnimatePresence initial={false}>
                  {chosen.map((b) => (
                    <motion.div
                      className="route-picked-item"
                      key={b.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span>{b.name}</span>
                      <button
                        type="button"
                        className="remove-btn"
                        aria-label={`${b.name} 선택 해제`}
                        onClick={() => removeFromSelection(b.id)}
                      >
                        <CloseIcon style={{ width: 11, height: 11 }} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </aside>

        <div className="route-map-center">
          <RouteMapCanvas points={routePoints} color={routeColor} />

          {/* 공유/저장은 예전엔 우측 별도 칸에 있었는데, 그 칸을 없애고 좌측바에 순위+선택목록을
              몰아넣으면서 지도 위 플로팅 버튼으로 옮겼다(MapScreen의 location-bar와 같은 패턴). */}
          <div className="route-map-actions">
            <button type="button" className="btn-outline" onClick={handleShare}>
              <ShareIcon />
              공유하기
            </button>
            <button type="button" className="btn-solid" onClick={() => setSaveModalOpen(true)}>
              이 코스 저장하기
            </button>
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
              {mode === 'bus' ? (
                transitStatus === 'loading' ? (
                  <>
                    대중교통 경로 확인 중…
                    <small>TMap 대중교통 API로 실제 소요시간을 조회하고 있어요.</small>
                  </>
                ) : transitStatus === 'ready' ? (
                  <>
                    버스 이동 시 약 {transitMinutes}분 소요
                    <small>TMap 대중교통 API 기반 실제 소요시간입니다.</small>
                  </>
                ) : (
                  <>
                    버스 이동 시 약 {estimateMinutes(route.dist, mode)}분 소요
                    <small>
                      {transitStatus === 'error'
                        ? '실제 대중교통 경로를 불러오지 못해 거리 기반 근사치로 대신 보여드려요.'
                        : '거리 기반 근사치입니다.'}
                    </small>
                  </>
                )
              ) : (
                <>
                  {MODES.find(([v]) => v === mode)[1]} 이동 시 약 {estimateMinutes(route.dist, mode)}분 소요
                  <small>거리 기반 근사치입니다. (도보/자동차는 아직 실제 API 미연동)</small>
                </>
              )}
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
