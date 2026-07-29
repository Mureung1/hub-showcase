import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useSearchParams, Navigate } from 'react-router-dom';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import StatementSection from './components/StatementSection';
import ProcessSection from './components/ProcessSection';
import DropsGrid from './components/DropsGrid';
import Leaderboard from './components/Leaderboard';
import DetailOverlay from './components/DetailOverlay';
import ToastAlert from './components/ToastAlert';
import AuthModal, { UserSession } from './components/AuthModal';
import Footer from './components/Footer';

// 1. Core Interfaces
export interface Drop {
  id: string;
  title: string;
  category: string;
  catLabel: string;
  status: 'upcoming' | 'released';
  retail: string;
  consensus: number;
  marketPrice?: string;
  bullish: number;
  image: string;
  sparkline: string;
  releaseDate?: string;
  releaseDateText?: string;
  priceChangeRate?: number;
  volume?: number;
  priceHistories?: { id?: string; dateLabel: string; price: number }[];
  polymarket: {
    upPrice: number;
    downPrice: number;
    upPriceCent: string;
    downPriceCent: string;
    upOdds: string;
    downOdds: string;
    totalUpStaked: number;
    totalDownStaked: number;
    totalPot: number;
  };
}

interface ToastMessage {
  id: string;
  message: string;
}

export default function App() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [selectedDropId, setSelectedDropId] = useState<string | null>(null);
  const [rankingPeriod, setRankingPeriod] = useState<'current' | 'last'>('current');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Auth User Session State
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('dropcast_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const activeCategory = searchParams.get('category') || 'all';

  const API_BASE = (import.meta as any).env?.VITE_API_URL || 'https://dropcast1.onrender.com/api';

  const handleLoginSuccess = (user: UserSession) => {
    setUserSession(user);
    localStorage.setItem('dropcast_user', JSON.stringify(user));
    showToast(`🎉 환영합니다, ${user.username}님! (포인트: ${user.points.toLocaleString()} pts)`);
  };

  const handleLogout = () => {
    setUserSession(null);
    localStorage.removeItem('dropcast_user');
    showToast('로그아웃 되었습니다.');
  };

  // Fetch Drops & Polymarket Pricing from Backend
  const fetchDrops = async () => {
    try {
      const res = await fetch(`${API_BASE}/drops`);
      const result = await res.json();
      if (result.success) {
        const mapped: Drop[] = result.data.map((d: any) => {
          const catLabels: Record<string, string> = {
            sneakers: 'sneakers 👟',
            streetwear: 'wear 👕',
            tcg: 'tcg 🃏',
            accessories: 'accessories 🎒',
            collectibles: 'collectibles 🧱'
          };

          const upStaked = d.totalUpStaked || 0;
          const downStaked = d.totalDownStaked || 0;
          const totalPot = upStaked + downStaked;

          let upPrice = 0.50;
          if (totalPot > 0) {
            upPrice = Math.max(0.05, Math.min(0.95, upStaked / totalPot));
          }
          const downPrice = Math.round((1.0 - upPrice) * 100) / 100;
          upPrice = Math.round(upPrice * 100) / 100;

          const upOdds = (1.0 / upPrice).toFixed(2);
          const downOdds = (1.0 / downPrice).toFixed(2);

          return {
            id: d.id,
            title: d.title.toLowerCase(),
            category: d.category,
            catLabel: catLabels[d.category] || d.category,
            status: d.status.toLowerCase(),
            retail: `${d.retailPrice.toLocaleString()} KRW`,
            consensus: d.consensusPrice || Math.round(d.retailPrice * 1.15),
            marketPrice: d.marketPrice ? `${d.marketPrice.toLocaleString()} KRW` : undefined,
            bullish: Math.round(upPrice * 100),
            image: d.imageUrl || '',
            sparkline: d.category === 'sneakers'
              ? 'M 0 85 C 50 60, 100 40, 150 25 C 200 20, 250 15, 300 10'
              : 'M 0 50 C 50 50, 100 60, 150 55 C 200 45, 250 52, 300 48',
            releaseDate: d.releaseDate,
            releaseDateText: d.releaseDateText,
            priceChangeRate: d.priceChangeRate,
            volume: d.volume,
            priceHistories: d.priceHistories || [],
            polymarket: {
              upPrice,
              downPrice,
              upPriceCent: `${Math.round(upPrice * 100)}¢`,
              downPriceCent: `${Math.round(downPrice * 100)}¢`,
              upOdds: `${upOdds}x`,
              downOdds: `${downOdds}x`,
              totalUpStaked: upStaked,
              totalDownStaked: downStaked,
              totalPot
            }
          };
        });
        setDrops(mapped);
      }
    } catch (error) {
      console.error('Error fetching drops:', error);
    }
  };

  useEffect(() => {
    fetchDrops();
  }, []);

  // Mouse Glow Effect Setup
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const isUpcomingPage = location.pathname === '/' || location.pathname === '/upcoming';
    if (isUpcomingPage && activeCategory === 'all') {
      document.body.classList.remove('hide-editorial');
    } else {
      document.body.classList.add('hide-editorial');
    }
  }, [location.pathname, activeCategory]);

  const showToast = (message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const castVote = async (id: string, isUp: boolean, stakedPoints: number = 100) => {
    if (!userSession) {
      showToast('[안내] 투표 및 지분 매수를 위해 먼저 로그인해 주세요.');
      setIsAuthModalOpen(true);
      return;
    }

    const item = drops.find((d) => d.id === id);
    if (!item) return;

    try {
      const res = await fetch(`${API_BASE}/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: userSession.id,
          dropId: id,
          direction: isUp ? 'UP' : 'DOWN',
          stakedPoints
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        const { boughtSharePrice, sharesCount, remainingPoints, odds } = result.data;
        if (remainingPoints !== undefined) {
          const updated = { ...userSession, points: remainingPoints };
          setUserSession(updated);
          localStorage.setItem('dropcast_user', JSON.stringify(updated));
        }

        const priceCent = Math.round(boughtSharePrice * 100);
        showToast(
          `[Polymarket] ${isUp ? '▲ UP' : '▼ DOWN'} 지분 ${sharesCount}주 매수 완료! (가격: ${priceCent}¢, 배당: ${odds}x)`
        );
        await fetchDrops();
      } else {
        showToast(`[오류] ${result.message || '매수에 실패했습니다.'}`);
      }
    } catch (error) {
      console.error('Error casting vote:', error);
      showToast('[오류] 서버와의 통신에 실패했습니다.');
    }
  };

  // Match /drop/:id route or state
  const matchDropRoute = location.pathname.match(/^\/drop\/(.+)$/);
  const activeDropId = selectedDropId || (matchDropRoute ? matchDropRoute[1] : null);
  const currentSelectedDrop = drops.find((d) => d.id === activeDropId);

  return (
    <>
      <Header
        userSession={userSession}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <Routes>
        <Route
          path="/"
          element={
            <>
              {activeCategory === 'all' && (
                <>
                  <HeroSection />
                  <StatementSection />
                  <ProcessSection />
                </>
              )}
              <DropsGrid
                statusFilter="upcoming"
                drops={drops}
                setSelectedDropId={setSelectedDropId}
                castVote={castVote}
              />
            </>
          }
        />
        <Route
          path="/upcoming"
          element={
            <>
              {activeCategory === 'all' && (
                <>
                  <HeroSection />
                  <StatementSection />
                  <ProcessSection />
                </>
              )}
              <DropsGrid
                statusFilter="upcoming"
                drops={drops}
                setSelectedDropId={setSelectedDropId}
                castVote={castVote}
              />
            </>
          }
        />
        <Route
          path="/released"
          element={
            <DropsGrid
              statusFilter="released"
              drops={drops}
              setSelectedDropId={setSelectedDropId}
              castVote={castVote}
            />
          }
        />
        <Route
          path="/ranking"
          element={
            <Leaderboard
              activeTab="ranking"
              rankingPeriod={rankingPeriod}
              setRankingPeriod={setRankingPeriod}
              showToast={showToast}
            />
          }
        />
        <Route
          path="/drop/:id"
          element={
            <DropsGrid
              statusFilter="upcoming"
              drops={drops}
              setSelectedDropId={setSelectedDropId}
              castVote={castVote}
            />
          }
        />
        <Route path="*" element={<Navigate to="/upcoming" replace />} />
      </Routes>

      <DetailOverlay
        selectedDropId={activeDropId}
        setSelectedDropId={(id) => {
          setSelectedDropId(id);
          if (!id) {
            if (matchDropRoute) {
              navigate(-1);
            }
          }
        }}
        currentSelectedDrop={currentSelectedDrop}
        castVote={castVote}
        userPoints={userSession?.points || 0}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      <ToastAlert toasts={toasts} />

      <Footer />
    </>
  );
}

