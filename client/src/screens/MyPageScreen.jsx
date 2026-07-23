import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore.js';
import { fetchTopRoutes } from '../api/routes.js';
import Mascot from '../components/Mascot.jsx';

const STAMP_TOTAL = 10;

function stampBadge(visitedCount) {
  if (visitedCount >= STAMP_TOTAL) return '10곳 방문 — 빵지도 마스터';
  if (visitedCount >= 5) return '5곳 방문 — 빵지도 초보 탐험가';
  if (visitedCount >= 1) return `${visitedCount}곳 방문 — 빵지도 여정을 시작했어요`;
  return '아직 스탬프가 없어요. 첫 방문을 기록해보세요!';
}

export default function MyPageScreen() {
  const navigate = useNavigate();
  const bakeries = useAppStore((s) => s.bakeries);
  const user = useAppStore((s) => s.user);
  const authStatus = useAppStore((s) => s.authStatus);
  const wishlist = useAppStore((s) => s.wishlist);
  const visited = useAppStore((s) => s.visited);
  const savedCourses = useAppStore((s) => s.savedCourses);
  const setSelectedIds = useAppStore((s) => s.setSelectedIds);
  const setActiveRankIdx = useAppStore((s) => s.setActiveRankIdx);
  const openAuthModal = useAppStore((s) => s.openAuthModal);
  const userLocation = useAppStore((s) => s.userLocation);
  const logout = useAppStore((s) => s.logout);
  const showToast = useAppStore((s) => s.showToast);

  // 새로고침 직후엔 토큰으로 로그인 상태를 복원하는 중이라(useRestoreSession), 확정되기 전에
  // "로그인하세요" 화면을 잠깐 보여줬다 사라지는 깜빡임을 막는다.
  if (authStatus !== 'ready') {
    return (
      <section className="screen-mypage">
        <div className="mypage-empty">
          <Mascot />
          <p>불러오는 중이에요...</p>
        </div>
      </section>
    );
  }

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

  const visitedNames = [...visited].map((id) => bakeries.find((b) => b.id === id)?.name).filter(Boolean);
  const wishlistNames = [...wishlist].map((id) => bakeries.find((b) => b.id === id)?.name).filter(Boolean);

  const loadSavedCourse = async (course) => {
    setSelectedIds(course.order);
    const chosen = course.order.map((id) => bakeries.find((b) => b.id === id));
    try {
      const routes = await fetchTopRoutes({ origin: userLocation, bakeries: chosen });
      // 출발점 고정이라 순서가 그대로 보존돼야 매치되는 코스다 — 저장 당시와 같은 순서만 찾는다.
      const idx = routes.findIndex(
        (r) => r.order.length === course.order.length && r.order.every((id, i) => id === course.order[i])
      );
      setActiveRankIdx(idx >= 0 ? idx : 0);
      navigate('/route');
    } catch {
      showToast('코스를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
    }
  };

  return (
    <section className="screen-mypage">
      <div className="mypage-header">
        <h1>마이페이지</h1>
        <p>내 정보와 빵 취향, 기록을 한눈에 확인해요.</p>
      </div>

      <div className="profile-card">
        <div className="profile-card-head">
          <h3>{user.id}님</h3>
          <button type="button" className="logout-link" onClick={logout}>
            로그아웃
          </button>
        </div>
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
          {visitedNames.length ? (
            visitedNames.map((t) => (
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
          {Array.from({ length: STAMP_TOTAL }, (_, i) => i < visited.size).map((on, i) => (
            <span className={`stamp${on ? ' on' : ''}`} key={i}>
              <Mascot alt="" />
            </span>
          ))}
        </div>
        <p className="stamp-badge">{stampBadge(visited.size)}</p>
      </div>

      <div className="profile-card">
        <h3>저장한 코스</h3>
        <div className="course-list">
          {savedCourses.length ? (
            savedCourses.map((c, i) => (
              <button type="button" className="course-item" key={i} onClick={() => loadSavedCourse(c)}>
                <span>{c.name}</span>
                <span className="course-meta">
                  {c.order.map((id) => bakeries.find((b) => b.id === id)?.name).join(' → ')}
                </span>
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
