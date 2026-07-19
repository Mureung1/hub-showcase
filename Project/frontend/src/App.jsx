import { useState } from 'react';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import HomeScreen from './pages/HomeScreen';
import PostfeedScreen from './pages/PostfeedScreen';
import CreatePostScreen from './pages/CreatePostScreen';
import MyPage from './pages/MyPage';
import GroupPurchaseDetailPage from './pages/GroupPurchaseDetailPage';

const initialPosts = [
  {
    id: 1,
    category: '식자재',
    categoryIcon: 'eco',
    title: '양파 5kg 한 망 나눠요',
    price: 3500,
    currentParticipants: 3,
    targetParticipants: 5,
    distanceText: '도보 8분',
    badgeText: '2일 남음',
    badgeType: 'info',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGQV-i8lt6Ry6PgToUxOrXYNDvI99shqAGcQ8bz81sFCqjrPSTrC2_NEHqzJpW4TcsglIDJTP7WsjGRpt823ozwkwsGIHmUA8Wu1Tl0wJGUCPK3lsicy7PwP_I61wheBH89PQYokSzOVpT4rciFVWkV4DG9Id28odRxGpuEbJorEmXPLu8KSjLPHd3vD6blL8fkT4Uii4v0H5tlyG3Maa8fagux1qO5GTVHOg4B9WV8xU8St47kvc',
  },
  {
    id: 2,
    category: '식자재',
    categoryIcon: 'eco',
    title: '딸기 1박스 (2kg) 반반 나눌 분',
    price: 9000,
    currentParticipants: 1,
    targetParticipants: 2,
    distanceText: '도보 3분',
    badgeText: '마감임박',
    badgeType: 'danger',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDUnL8-lbzmGM3h_fLNcKWq6Ob9XB3m1QG7OttzUgJYs2DmgLJjEOV2hYKU1dyEOy1iVLXxKT-Gusigi_P227_yvNbeRHlnczJpiqxQJY9DFqrkIN5Hs3O1sl-x67gN9_f2j1CvIHLSiEghtBD_Blka9LERFCYnRZKDsCKiQhzdhhPyyHmjg5tgNPJjtqylxUsI5siY8FbXk1RxygUIn_KcvKEgVhoY0sXKT7Ix8Rgf-lVNhDsgIpA',
  },
  {
    id: 3,
    category: '생활용품',
    categoryIcon: 'shopping_bag',
    title: '크리넥스 3겹 화장지 30롤 공구',
    price: 7500,
    currentParticipants: 2,
    targetParticipants: 3,
    distanceText: '도보 12분',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoSLBuND-cSFGw7ZEoTx_gc_kgDUBVzOCUv-VDbAFvqavlDcyh7HY8uTZFUAoAl8vYLbPZxRHx-GXAJdI6mU-RA-JkPuaRmECQJytdQJ8lBNr4G7GjQX-nLX5PCwACr4ilPXOvi6kBgPNRuUXK2ide3A4WUmuGPUFOHfkQI89mZ3awj5hP4sgmitWAXu3Vv2W8_YxpiKoa63Q87Pw_RL8V0cPZZC0xLkqSTECI6s-nvU0hKLykJyE',
  },
  {
    id: 4,
    category: '식자재',
    categoryIcon: 'eco',
    title: '유기농 대파 1+1 나눔',
    price: 1200,
    currentParticipants: 1,
    targetParticipants: 2,
    distanceText: '도보 5분',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGQV-i8lt6Ry6PgToUxOrXYNDvI99shqAGcQ8bz81sFCqjrPSTrC2_NEHqzJpW4TcsglIDJTP7WsjGRpt823ozwkwsGIHmUA8Wu1Tl0wJGUCPK3lsicy7PwP_I61wheBH89PQYokSzOVpT4rciFVWkV4DG9Id28odRxGpuEbJorEmXPLu8KSjLPHd3vD6blL8fkT4Uii4v0H5tlyG3Maa8fagux1qO5GTVHOg4B9WV8xU8St47kvc',
  },
  {
    id: 5,
    category: '식자재',
    categoryIcon: 'eco',
    title: '햇감자 10kg 박스 나눔',
    price: 4500,
    currentParticipants: 2,
    targetParticipants: 4,
    distanceText: '도보 10분',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDUnL8-lbzmGM3h_fLNcKWq6Ob9XB3m1QG7OttzUgJYs2DmgLJjEOV2hYKU1dyEOy1iVLXxKT-Gusigi_P227_yvNbeRHlnczJpiqxQJY9DFqrkIN5Hs3O1sl-x67gN9_f2j1CvIHLSiEghtBD_Blka9LERFCYnRZKDsCKiQhzdhhPyyHmjg5tgNPJjtqylxUsI5siY8FbXk1RxygUIn_KcvKEgVhoY0sXKT7Ix8Rgf-lVNhDsgIpA',
  },
  {
    id: 6,
    category: '생활용품',
    categoryIcon: 'shopping_bag',
    title: '다우니 섬유유연제 대용량',
    price: 8200,
    currentParticipants: 1,
    targetParticipants: 3,
    distanceText: '도보 15분',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDoSLBuND-cSFGw7ZEoTx_gc_kgDUBVzOCUv-VDbAFvqavlDcyh7HY8uTZFUAoAl8vYLbPZxRHx-GXAJdI6mU-RA-JkPuaRmECQJytdQJ8lBNr4G7GjQX-nLX5PCwACr4ilPXOvi6kBgPNRuUXK2ide3A4WUmuGPUFOHfkQI89mZ3awj5hP4sgmitWAXu3Vv2W8_YxpiKoa63Q87Pw_RL8V0cPZZC0xLkqSTECI6s-nvU0hKLykJyE',
  }
];

function App() {
  const [page, setPage] = useState('home'); // 'home' | 'postfeed' | 'createpost' | 'detail'
  const [posts, setPosts] = useState(initialPosts);

  const handleAddPost = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="td-app-layout">
      <Header currentPage={page} onNavigate={handlePageChange} />
      {page === 'detail' ? (
        <GroupPurchaseDetailPage onNavigate={handlePageChange} />
      ) : page === 'postfeed' ? (
        <PostfeedScreen onNavigate={handlePageChange} posts={posts} setPosts={setPosts} />
      ) : page === 'createpost' ? (
        <CreatePostScreen onNavigate={handlePageChange} onAddPost={handleAddPost} />
      ) : page === 'mypage' ? (
        <MyPage onNavigate={handlePageChange} />
      ) : (
        <HomeScreen onNavigate={handlePageChange} />
      )}
      <BottomNav currentPage={page} onNavigate={handlePageChange} />
    </div>
  );
}

export default App;
