import { useState, useEffect } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import StatementSection from './components/StatementSection';
import ProcessSection from './components/ProcessSection';
import DropsGrid from './components/DropsGrid';
import Leaderboard from './components/Leaderboard';
import DetailOverlay from './components/DetailOverlay';
import ToastAlert from './components/ToastAlert';
import Footer from './components/Footer';

// 1. Core Interfaces
interface Drop {
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
}

interface ToastMessage {
  id: string;
  message: string;
}

export default function App() {
  // 3. States
  const [activeTab, setActiveTab] = useState<'upcoming' | 'released' | 'ranking'>('upcoming');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [drops, setDrops] = useState<Drop[]>([]);
  const [selectedDropId, setSelectedDropId] = useState<string | null>(null);
  const [rankingPeriod, setRankingPeriod] = useState<'current' | 'last'>('current');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const API_BASE = 'http://localhost:5000/api';
  const TEST_USER_ID = '64700eed-4e7e-4a57-b75b-7e81f999caaa';

  // Fetch Drops from Backend
  const fetchDrops = async () => {
    try {
      const res = await fetch(`${API_BASE}/drops`);
      const result = await res.json();
      if (result.success) {
        // Map backend Drop schema to frontend Drop interface
        const mapped: Drop[] = result.data.map((d: any) => {
          const catLabels: Record<string, string> = {
            sneakers: 'sneakers 👟',
            streetwear: 'streetwear 👕',
            tcg: 'tcg/toys 🃏',
            lego: 'lego 🧱'
          };

          // Image mappings based on brand or title for premium aesthetics
          let image = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80';
          if (d.brand === 'Nike') image = 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=500&q=80';
          else if (d.brand === 'Adidas') image = 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500&q=80';
          else if (d.brand === 'Asics') image = 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80';
          else if (d.brand === 'Salomon') image = 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&q=80';
          else if (d.category === 'tcg') image = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&q=80';

          return {
            id: d.id,
            title: d.title.toLowerCase(),
            category: d.category,
            catLabel: catLabels[d.category] || d.category,
            status: d.status.toLowerCase(),
            retail: `${d.retailPrice.toLocaleString()} KRW`,
            consensus: d.consensusPrice || Math.round(d.retailPrice * 1.15),
            marketPrice: d.marketPrice ? `${d.marketPrice.toLocaleString()} KRW` : undefined,
            // Derive a mockup bullish percentage based on title characters for visual styling
            bullish: Math.abs(d.title.charCodeAt(0) % 30) + 65,
            image,
            sparkline: d.category === 'sneakers'
              ? 'M 0 85 C 50 60, 100 40, 150 25 C 200 20, 250 15, 300 10'
              : 'M 0 50 C 50 50, 100 60, 150 55 C 200 45, 250 52, 300 48',
            releaseDate: d.releaseDate,
            releaseDateText: d.releaseDateText,
            priceChangeRate: d.priceChangeRate,
            volume: d.volume
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

  // Update body class for editorial visibility toggling
  useEffect(() => {
    if (activeTab === 'upcoming' && activeCategory === 'all') {
      document.body.classList.remove('hide-editorial');
    } else {
      document.body.classList.add('hide-editorial');
    }
  }, [activeTab, activeCategory]);

  const showToast = (message: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const castVote = async (id: string, isUp: boolean) => {
    const item = drops.find((d) => d.id === id);
    if (!item || item.status === 'released') return;

    try {
      const res = await fetch(`${API_BASE}/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: TEST_USER_ID,
          dropId: id,
          direction: isUp ? 'UP' : 'DOWN'
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showToast(
          isUp
            ? `[▲ 오를까] 투표완료 // 예상 리셀가가 상승했습니다.`
            : `[▼ 내릴까] 투표완료 // 예상 리셀가가 하락했습니다.`
        );
        await fetchDrops();
      } else {
        showToast(`[오류] ${result.message || '투표 제출에 실패했습니다.'}`);
      }
    } catch (error) {
      console.error('Error casting vote:', error);
      showToast('[오류] 서버와의 통신에 실패했습니다.');
    }
  };

  const currentSelectedDrop = drops.find((d) => d.id === selectedDropId);

  // Filter items by tab status and sub category
  const filteredDrops = drops.filter((d) => {
    if (activeTab === 'upcoming' && d.status !== 'upcoming') return false;
    if (activeTab === 'released' && d.status !== 'released') return false;
    if (activeCategory !== 'all' && d.category !== activeCategory) return false;
    return true;
  });

  return (
    <>
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setActiveCategory={setActiveCategory}
      />

      {/* Hero & Intro Statement: Only visible on upcoming and 'all' categories */}
      {activeTab === 'upcoming' && activeCategory === 'all' && (
        <>
          <HeroSection />
          <StatementSection />
          <ProcessSection />
        </>
      )}

      {/* Main product items list grid */}
      <DropsGrid
        activeTab={activeTab}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        filteredDrops={filteredDrops}
        setSelectedDropId={setSelectedDropId}
        castVote={castVote}
      />

      {/* Leaderboard weekly rankings panel */}
      <Leaderboard
        activeTab={activeTab}
        rankingPeriod={rankingPeriod}
        setRankingPeriod={setRankingPeriod}
        showToast={showToast}
      />

      {/* Right details sidebar slider overlay */}
      <DetailOverlay
        selectedDropId={selectedDropId}
        setSelectedDropId={setSelectedDropId}
        currentSelectedDrop={currentSelectedDrop}
        castVote={castVote}
      />

      {/* Floated toast alerts */}
      <ToastAlert toasts={toasts} />

      <Footer />
    </>
  );
}
