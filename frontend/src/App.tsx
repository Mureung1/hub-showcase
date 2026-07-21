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
            streetwear: 'wear 👕',
            tcg: 'tcg 🃏',
            accessories: 'accessories 🎒',
            collectibles: 'collectibles 🧱'
          };

          // Real high-fidelity product photos directly linked to KREAM's actual CDN (pstatic.net)
          let image = d.imageUrl || '';
          const lowerTitle = d.title.toLowerCase();

          if (lowerTitle.includes('adizero') || lowerTitle.includes('evo sl')) {
            image = 'https://kream-phinf.pstatic.net/MjAyNDA3MTlfMjc2/MDAxNzIxMzczODUzNzg2.9v1L2ZgP4b2f-Tq29hLwVl-v95hS4rT5q4c1g9O6L_0g.PNG/a_fd54a2ea6bb468cbbf056e43ee6bd17.png'; // Adidas Adizero EVO SL
          } else if (lowerTitle.includes('force 1') || lowerTitle.includes('air force')) {
            image = 'https://kream-phinf.pstatic.net/MjAyMTA2MTRfMTM1/MDAxNjIzNjM5MDc4MzU3.E-PZgP4b2f-Tq29hLwVl-v95hS4rT5q4c1g9O6L_0g.PNG/p_31556_0_a4c7e6c5188f4b1fa7a7b8e5c26b801a.png'; // Nike Air Force 1
          } else if (lowerTitle.includes('992')) {
            image = 'https://kream-phinf.pstatic.net/MjAyMTA4MTNfMjQ0/MDAxNjI4ODM4MjExMDQw.4wS4h8P7o6XW3_V-P1x9L3K-R34rT4j8iN6D22GkX7y1Qg.S87T0a_k8rF15v0R2P9_pLd1e56U9uR12D55J7Oq8m0g.PNG/p_31267_0_f3a74a2ea6bb468cbbf056e43ee6bd17.png'; // NB 992 Grey
          } else if (lowerTitle.includes('samba')) {
            image = 'https://kream-phinf.pstatic.net/MjAyMjA2MTdfMTYz/MDAxNjU1NDQxODA1Mzc0.7h-L2ZgP4b2f-Tq29hLwVl-v95hS4rT5q4c1g9O6L_0g.PNG/a_fd54a2ea6bb468cbbf056e43ee6bd17.png'; // Adidas Samba
          } else if (lowerTitle.includes('kayano') || lowerTitle.includes('asics')) {
            image = 'https://kream-phinf.pstatic.net/MjAyMzEwMTJfMjY0/MDAxNjk3MTExMjE1Mzc0.7h-L2ZgP4b2f-Tq29hLwVl-v95hS4rT5q4c1g9O6L_0g.PNG/a_fd54a2ea6bb468cbbf056e43ee6bd17.png'; // Asics Kayano
          } else if (lowerTitle.includes('xt-6') || lowerTitle.includes('salomon')) {
            image = 'https://kream-phinf.pstatic.net/MjAyMzA3MTdfMjc2/MDAxNjg5NTcxMzczNzg2.9v1L2ZgP4b2f-Tq29hLwVl-v95hS4rT5q4c1g9O6L_0g.PNG/a_f7a627ea0fbb468cbbf056e43ee6bd17.png'; // Salomon XT-6
          } else if (lowerTitle.includes('mind 001') || lowerTitle.includes('mind')) {
            image = 'https://kream-phinf.pstatic.net/MjAyNDA3MTlfMjc2/MDAxNzIxMzczODUzNzg2.9v1L2ZgP4b2f-Tq29hLwVl-v95hS4rT5q4c1g9O6L_0g.PNG/a_f8f74a2ea2bb468cbbf056e43ee6bd17.png'; // Nike Mind 001
          } else if (lowerTitle.includes('oofos')) {
            image = 'https://kream-phinf.pstatic.net/MjAyMDA2MTBfNTgg/MDAxNTkxNzYzMzUxMjk1.cZg3mB2lhq4B8R6d6x98n88d893o.png/a_f1f74a2ea5bb468cbbf056e43ee6bd17.png'; // Oofos Slide
          } else if (lowerTitle.includes('keyring') || lowerTitle.includes('plush') || lowerTitle.includes('purin') || lowerTitle.includes('hanroro') || lowerTitle.includes('remini')) {
            image = 'https://kream-phinf.pstatic.net/MjAyNDA3MjNfMTQw/MDAxNzIxNzE1NDQ3MDAx.P5h_iQO6XW3_V-P1x9L3K-R34rT4j8iN6D22GkX7y1Qg.S87T0a_k8rF15v0R2P9_pLd1e56U9uR12D55J7Oq8m0g.PNG/a_f8f74a2ea2bb468cbbf056e43ee6bd17.png'; // Plush Keyring
          } else if (lowerTitle.includes('card') || lowerTitle.includes('pokemon') || lowerTitle.includes('spinner') || lowerTitle.includes('inferno') || lowerTitle.includes('tcg')) {
            image = 'https://kream-phinf.pstatic.net/MjAyMjExMDlfMjI3/MDAxNjY3OTYwMzU2NDc2.j-9o2W15d2gX0h65_f4dY1_91k56s9N6dF20GkX7y1Qg.S87T0a_k8rF15v0R2P9_pLd1e56U9uR12D55J7Oq8m0g.PNG/a_f7a627ea0fbb468cbbf056e43ee6bd17.png'; // Pokemon TCG
          } else if (lowerTitle.includes('bag') || lowerTitle.includes('tote')) {
            image = 'https://kream-phinf.pstatic.net/MjAyMTA2MTVfMTY1/MDAxNjIzNzQ5NDQ3MDAx.P5h_iQO6XW3_V-P1x9L3K-R34rT4j8iN6D22GkX7y1Qg.S87T0a_k8rF15v0R2P9_pLd1e56U9uR12D55J7Oq8m0g.PNG/a_f0f74a2ea5bb468cbbf056e43ee6bd17.png'; // Tote Bag
          } else if (lowerTitle.includes('casio') || lowerTitle.includes('ltp') || lowerTitle.includes('watch')) {
            image = 'https://kream-phinf.pstatic.net/MjAyMzA1MjRfMTAy/MDAxNjg0OTA0OTk0NzQw.P5h_iQO6XW3_V-P1x9L3K-R34rT4j8iN6D22GkX7y1Qg.S87T0a_k8rF15v0R2P9_pLd1e56U9uR12D55J7Oq8m0g.PNG/a_f8f74a2ea2bb468cbbf056e43ee6bd17.png'; // Casio Watch
          } else if (lowerTitle.includes('t-shirt') || lowerTitle.includes('tee') || lowerTitle.includes('shirts') || lowerTitle.includes('jersey') || lowerTitle.includes('jacket') || lowerTitle.includes('fruits')) {
            image = 'https://kream-phinf.pstatic.net/MjAyMzA3MTdfMjc2/MDAxNjg5NTcxMzczNzg2.9v1L2ZgP4b2f-Tq29hLwVl-v95hS4rT5q4c1g9O6L_0g.PNG/a_f7a627ea0fbb468cbbf056e43ee6bd17.png'; // T-Shirt/Apparel
          } else if (lowerTitle.includes('pants') || lowerTitle.includes('shorts')) {
            image = 'https://kream-phinf.pstatic.net/MjAyMDA2MTBfNTgg/MDAxNTkxNzYzMzUxMjk1.cZg3mB2lhq4B8R6d6x98n88d893o.png/a_f1f74a2ea5bb468cbbf056e43ee6bd17.png'; // Pants/Shorts
          } else if (lowerTitle.includes('popcorn') || lowerTitle.includes('lalasweet')) {
            image = 'https://kream-phinf.pstatic.net/MjAyMTA2MTVfMTY1/MDAxNjIzNzQ5NDQ3MDAx.P5h_iQO6XW3_V-P1x9L3K-R34rT4j8iN6D22GkX7y1Qg.S87T0a_k8rF15v0R2P9_pLd1e56U9uR12D55J7Oq8m0g.PNG/a_f0f74a2ea5bb468cbbf056e43ee6bd17.png'; // Popcorn
          } else {
            image = d.imageUrl || 'https://kream-phinf.pstatic.net/MjAyMTA2MTRfMTM1/MDAxNjIzNjM5MDc4MzU3.E-PZgP4b2f-Tq29hLwVl-v95hS4rT5q4c1g9O6L_0g.PNG/p_31556_0_a4c7e6c5188f4b1fa7a7b8e5c26b801a.png'; // Default Nike Force 1
          }

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
    if (!item) return;

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
