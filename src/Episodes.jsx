import { useState } from 'react';
import EpisodeCard from './EpisodeCard';
import { episodes } from './mockEpisodes';

// 사이드바 컴포넌트 — activeTab은 이 화면 안에서만 쓰는 state.
// onSelectEpisode / onUpdateTide는 App이 내려준 props(콜백) — 클릭 이벤트를 부모로 올려보낸다.
function Episodes({ selectedId, onSelectEpisode, onUpdateTide }) {
  const [activeTab, setActiveTab] = useState('recent');
  const visible = episodes.filter((ep) => ep.tab === activeTab);

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <h1>🌊 TideNote</h1>
        <button className="pill-btn ghost" onClick={onUpdateTide}>
          Update your tide
        </button>
      </div>

      <div className="segmented">
        <button
          className={`seg-btn${activeTab === 'history' ? ' active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button
          className={`seg-btn${activeTab === 'recent' ? ' active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          Recent
        </button>
      </div>

      <div className="ep-list">
        {visible.map((ep) => (
          <EpisodeCard
            key={ep.id}
            episode={ep}
            selected={ep.id === selectedId}
            onSelect={onSelectEpisode}
          />
        ))}
      </div>
    </aside>
  );
}

export default Episodes;
