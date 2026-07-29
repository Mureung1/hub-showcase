import { useEffect, useMemo, useState } from 'react';
import type { Course } from '../../data/userMock';
import type { GymPlace } from '../../data/userMock';
import { useUserLocation } from '../../features/map/useUserLocation';
import { useAuth } from '../../hooks/useAuth';
import { fetchCourses } from '../../services/coursesApi';
import { fetchRecommendedGyms } from '../../services/gymsApi';
import { fetchMeals } from '../../services/mealsApi';
import { todayString } from '../../utils/date';
import { summarizeTodayMeals, type TodayMealSummary } from '../../utils/todayMealSummary';
import HomeRoutineCard from './home/HomeRoutineCard';
import HomeCourseCard from './home/HomeCourseCard';
import HomeDietCard from './home/HomeDietCard';
import HomeGreeting from './home/HomeGreeting';
import HomeGymMatchCard from './home/HomeGymMatchCard';
import HomeQuickMenu from './home/HomeQuickMenu';
import './user.css';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const { location } = useUserLocation();
  const [mealSummary, setMealSummary] = useState<TodayMealSummary | null>(null);
  const [nearbyGyms, setNearbyGyms] = useState(0);
  const [topGym, setTopGym] = useState<GymPlace | null>(null);
  const [recommended, setRecommended] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const mealPromise = isAuthenticated
          ? fetchMeals({ date: todayString(), limit: 20 }).catch(() => null)
          : Promise.resolve(null);

        const [{ courses }, recommendedGyms, mealsResult] = await Promise.all([
          fetchCourses({ limit: 1 }),
          fetchRecommendedGyms({
            lat: location.lat,
            lng: location.lng,
            radiusKm: 3,
            limit: 50,
          }).catch(() => null),
          mealPromise,
        ]);

        if (cancelled) return;

        setRecommended(courses[0] ?? null);
        setNearbyGyms(recommendedGyms?.meta.total ?? 0);
        setTopGym(recommendedGyms?.gyms[0] ?? null);

        if (mealsResult) {
          setMealSummary(summarizeTodayMeals(mealsResult.meals));
        } else {
          setMealSummary(null);
        }
      } catch {
        if (!cancelled) {
          setRecommended(null);
          setNearbyGyms(0);
          setTopGym(null);
          setMealSummary(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, location.lat, location.lng]);

  const dietSummary = useMemo(() => mealSummary, [mealSummary]);

  return (
    <div className="user-page user-home">
      <HomeGreeting />
      <HomeRoutineCard course={recommended} loading={loading} />
      <HomeDietCard summary={dietSummary} isAuthenticated={isAuthenticated} />
      <HomeCourseCard course={recommended} loading={loading} />
      <HomeGymMatchCard gym={topGym} totalNearby={nearbyGyms} loading={loading} />
      <HomeQuickMenu />
    </div>
  );
}
