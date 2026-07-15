import { useNavigate } from 'react-router-dom';
import { bakeries, findBakery } from '../data/bakeries.js';
import { useAppStore } from '../store/useAppStore.js';
import { computeTopRoutes, routesMatch } from '../utils/routeCalc.js';
import Mascot from '../components/Mascot.jsx';

const STAMP_TOTAL = 10;

function stampBadge(visitedCount) {
  if (visitedCount >= STAMP_TOTAL) return '10곳 방문 — 빵지도 마스터';
  if (visitedCount >= 5) return '5곳 방문 — 빵지도 초보 탐험가';
  if (visitedCount >= 1) return `${visitedCount}곳 방문 — 빵지도 여정을 시작했어요`;
  return '아직 스탬프가 없어요. 첫 방문을 기록해보세요!';
}

// TODO(3주차): GET /api/users/me 연동, 취향/가본곳/가고싶은곳을 서버 응답으로 교체.
export default function MyPageScreen() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const wishlist = useAppStore((s) => s.wishlist);
  const savedCourses = useAppStore((s) => s.savedCourses);
  const setSelectedIds = useAppStore((s) => s.setSelectedIds);
  const setActiveRankIdx = useAppStore((s) => s.setActiveRankIdx);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const userLocation = useAppStore((s) => s.userLocation);

  if (!user) {
    return (
      <section className="screen-mypage">
        <div className="mypage-empty">
          <Mascot variant="pointing" />
          <p>로그인하면 내 정보와 빵 취향을 확인할 수 있어요.</p>
          <button type="button" className="btn-solid" onClick={() => openAuthModal('login')}>
            로그인하기
          </button>
        </div>
      </section>
    );
  }

  const visitedCount = user.visited.length;
  const stamps = Array.from({ length: STAMP_TOTAL }, (_, i) => i < visitedCount);
  const wishlistNames = [
    ...new Set([...user.wishlist, ...[...wishlist].map((id) => findBakery(id)?.name).filter(Boolean)]),
  ];

  const loadSavedCourse = (course) => {
    setSelectedIds(course.order);
    const chosen = course.order.map((id) => bakeries.find((b) => b.id === id));
    const routes = computeTopRoutes(userLocation, chosen);
    const idx = routes.findIndex((r) => routesMatch(r.order, course.order));
    setActiveRankIdx(idx >= 0 ? idx : 0);
    navigate('/route');
  };

  return (
    <section className="screen-mypage">
      <div className="profile-card">
        <h3>{user.id}님</h3>
        <div className="detail-row">
          <span>빵 취향</span>
        </div>
        <div className="tag-row">
          {user.taste.length ? (
            user.taste.map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))
          ) : (
            <span className="chip">선택 안 함</span>
          )}
        </div>
      </div>

      <div className="profile-card">
        <h3>가본 곳</h3>
        <div className="tag-row">
          {user.visited.length ? (
            user.visited.map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))
          ) : (
            <span className="chip">없음</span>
          )}
        </div>
      </div>

      <div className="profile-card">
        <h3>가고 싶은 곳</h3>
        <div className="tag-row">
          {wishlistNames.length ? (
            wishlistNames.map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))
          ) : (
            <span className="chip">없음</span>
          )}
        </div>
      </div>

      <div className="profile-card stamp-card">
        <h3>스탬프 투어</h3>
        <div className="stamp-grid">
          {stamps.map((on, i) => (
            <span className={`stamp${on ? ' on' : ''}`} key={i}>
              <Mascot alt="" />
            </span>
          ))}
        </div>
        <p className="stamp-badge">{stampBadge(visitedCount)}</p>
      </div>

      <div className="profile-card">
        <h3>저장한 코스</h3>
        <div className="course-list">
          {savedCourses.length ? (
            savedCourses.map((c, i) => (
              <button type="button" className="course-item" key={i} onClick={() => loadSavedCourse(c)}>
                <span>{c.name}</span>
                <span className="course-meta">{c.order.map((id) => findBakery(id)?.name).join(' → ')}</span>
              </button>
            ))
          ) : (
            <p className="empty-note">아직 저장한 코스가 없어요.</p>
          )}
        </div>
      </div>
    </section>
  );
}
