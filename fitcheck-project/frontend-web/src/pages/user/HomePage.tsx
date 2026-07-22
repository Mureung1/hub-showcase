import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, UtensilsCrossed, MapPinned, Flame } from 'lucide-react';
import type { Course } from '../../data/userMock';
import { MOCK_USER_LOCATION } from '../../data/userMock';
import { useAuth } from '../../hooks/useAuth';
import { fetchCourses } from '../../services/coursesApi';
import { fetchGyms } from '../../services/gymsApi';
import { fetchMeals } from '../../services/mealsApi';
import { todayString } from '../../utils/date';
import './user.css';

const QUICK_LINKS = [
  {
    to: '/user/courses',
    label: '강좌',
    desc: '부위·목적별 PT 가이드',
    icon: PlayCircle,
  },
  {
    to: '/user/meals',
    label: '식단',
    desc: 'AI 탄단지 피드백',
    icon: UtensilsCrossed,
  },
  {
    to: '/user/map',
    label: '지도',
    desc: '동네 헬스장 매칭',
    icon: MapPinned,
  },
] as const;

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [todayMealCount, setTodayMealCount] = useState(0);
  const [latestMealFeedback, setLatestMealFeedback] = useState<string | null>(null);
  const [nearbyGyms, setNearbyGyms] = useState(0);
  const [recommended, setRecommended] = useState<Course | null>(null);
  const [loadingRecommended, setLoadingRecommended] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const mealPromise = isAuthenticated
          ? fetchMeals({ date: todayString(), limit: 10 }).catch(() => null)
          : Promise.resolve(null);

        const [{ courses }, { meta }, mealsResult] = await Promise.all([
          fetchCourses({ limit: 1 }),
          fetchGyms({
            lat: MOCK_USER_LOCATION.lat,
            lng: MOCK_USER_LOCATION.lng,
            radiusKm: 3,
            limit: 50,
          }),
          mealPromise,
        ]);
        if (!cancelled) {
          setRecommended(courses[0] ?? null);
          setNearbyGyms(meta.total);
          if (mealsResult) {
            setTodayMealCount(mealsResult.meals.length);
            setLatestMealFeedback(mealsResult.meals[0]?.aiFeedback ?? null);
          }
        }
      } catch {
        if (!cancelled) {
          setRecommended(null);
          setNearbyGyms(0);
        }
      } finally {
        if (!cancelled) setLoadingRecommended(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return (
    <div className="user-page">
      <header className="page-header">
        <h1>오늘도 한 세트 더</h1>
        <p>혼자 시작해도 흔들리지 않게, FitCheck가 가이드합니다.</p>
      </header>

      <section className="user-stats" aria-label="오늘 요약">
        <article className="stat-card">
          <span className="stat-dot stat-dot-red" />
          <div>
            <strong>{todayMealCount}</strong>
            <span>오늘 식단 기록</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-dot stat-dot-green" />
          <div>
            <strong>{recommended ? 1 : 0}</strong>
            <span>추천 강좌</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-dot stat-dot-yellow" />
          <div>
            <strong>{nearbyGyms}</strong>
            <span>근처 매칭</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-dot stat-dot-purple" />
          <div>
            <strong>72%</strong>
            <span>주간 준수율</span>
          </div>
        </article>
      </section>

      <section className="user-section">
        <div className="panel-header">
          <div>
            <h2>
              <span className="panel-icon">
                <Flame size={16} />
              </span>
              바로가기
            </h2>
            <p>필요한 기능을 바로 열어보세요.</p>
          </div>
        </div>
        <div className="quick-grid">
          {QUICK_LINKS.map((item) => (
            <Link key={item.to} to={item.to} className="quick-card panel">
              <span className="panel-icon">
                <item.icon size={16} />
              </span>
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="user-section home-split">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>오늘의 추천 강좌</h2>
              <p>입문 루틴으로 가볍게 시작해 보세요.</p>
            </div>
          </div>
          {loadingRecommended && (
            <p className="home-recommend-meta">추천 강좌를 불러오는 중...</p>
          )}
          {!loadingRecommended && recommended && (
            <>
              <h3 className="home-recommend-title">{recommended.title}</h3>
              <p className="home-recommend-meta">
                {recommended.bodyPart} · {recommended.goal} ·{' '}
                {recommended.durationMin}분
              </p>
              <div className="home-recommend-actions">
                <Link
                  to={`/user/courses/${recommended.id}`}
                  className="btn btn-primary"
                >
                  강좌 보기
                </Link>
                <Link to="/user/courses" className="btn btn-ghost">
                  목록 보기
                </Link>
              </div>
            </>
          )}
          {!loadingRecommended && !recommended && (
            <p className="home-recommend-meta">
              추천 강좌를 불러오지 못했습니다. 백엔드 서버를 확인해 주세요.
            </p>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>최근 식단 피드백</h2>
              <p>방금 기록한 식단의 AI 코멘트입니다.</p>
            </div>
          </div>
          <p className="home-meal-snippet">
            {latestMealFeedback ?? '오늘 식단을 기록하면 AI 피드백이 여기에 표시됩니다.'}
          </p>
        </article>
      </section>
    </div>
  );
}
