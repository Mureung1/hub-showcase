import { useState } from 'react';
import EpisodeCard from './EpisodeCard';
import { groupMessagesIntoEpisodes } from './groupMessagesIntoEpisodes';

// 사이드바 컴포넌트 — messages(App이 내려준 실제 대화 기록)를 episode로 묶어서 보여준다.
// activeTab은 이 화면 안에서만 쓰는 state.
function Episodes({ messages, onSelectEpisode, onUpdateTide }) {
  const [activeTab, setActiveTab] = useState('recent');
  const episodes = groupMessagesIntoEpisodes(messages);
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
        {visible.length === 0 && (
          <div className="ep-empty">
            {activeTab === 'recent' ? '아직 나눈 대화가 없어요.' : '지난 대화가 없어요.'}
          </div>
        )}
        {visible.map((ep) => (
          <EpisodeCard key={ep.id} episode={ep} onSelect={onSelectEpisode} />
        ))}
      </div>
    </aside>
  );
}

export default Episodes;
