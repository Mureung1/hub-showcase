import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore.js';
import { fetchTopRoutes } from '../api/routes.js';
import { TOUR_THEMES, accentSoft } from '../data/tourThemes.js';
import Mascot from '../components/Mascot.jsx';

export default function ThemeScreen() {
  const navigate = useNavigate();
  const bakeries = useAppStore((s) => s.bakeries);
  const bakeriesStatus = useAppStore((s) => s.bakeriesStatus);
  const userLocation = useAppStore((s) => s.userLocation);
  const wishlist = useAppStore((s) => s.wishlist);
  const applyRecommendation = useAppStore((s) => s.applyRecommendation);
  const showToast = useAppStore((s) => s.showToast);

  const [loadingId, setLoadingId] = useState(null);

  const handleSelectTheme = async (theme, picked) => {
    if (picked.length < 2) {
      showToast(
        theme.id === 'wishlist'
          ? '찜한 빵집이 2곳 이상 있어야 코스를 만들 수 있어요.'
          : '이 테마에 맞는 빵집이 아직 부족해요.'
      );
      return;
    }
    setLoadingId(theme.id);
    try {
      const routes = await fetchTopRoutes({ origin: userLocation, bakeries: picked });
      applyRecommendation({ bakeries: picked, routes, mode: 'walk' });
      navigate('/route');
    } catch {
      showToast('동선을 계산하지 못했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <section className="screen-theme">
      <div className="theme-header">
        <div className="eyebrow">TOUR THEME</div>
        <h1>테마로 빵투어 떠나기</h1>
        <p>테마를 고르면 어울리는 빵집을 모아 바로 동선을 계산해드려요.</p>
      </div>

      {bakeriesStatus !== 'ready' ? (
        <div className="theme-empty">
          <Mascot />
          <p>빵집 목록을 불러오는 중이에요...</p>
        </div>
      ) : (
        <div className="theme-grid">
          {TOUR_THEMES.map((theme, i) => {
            const picked = theme.select({ bakeries, userLocation, wishlist });
            const isLoading = loadingId === theme.id;
            return (
              <motion.button
                type="button"
                key={theme.id}
                className="theme-card"
                style={{ '--theme-accent': theme.accent, '--theme-accent-soft': accentSoft(theme.accent) }}
                onClick={() => handleSelectTheme(theme, picked)}
                disabled={loadingId !== null}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
              >
                <span className="theme-card-emoji">{theme.emoji}</span>
                <span className="theme-card-title">{theme.label}</span>
                <span className="theme-card-desc">{theme.description}</span>
                <span className="theme-card-count">{isLoading ? '동선 계산 중…' : `${picked.length}곳 매칭`}</span>
              </motion.button>
            );
          })}
        </div>
      )}
    </section>
  );
}
