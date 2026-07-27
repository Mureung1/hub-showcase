import { useState } from 'react';
import TideCheck from './TideCheck';
import Episodes from './Episodes';
import ChatView from './ChatView';
import './screens.css';

// 웹 서비스 레이아웃: 사이드바(Episodes) + 메인(ChatView)이 항상 같이 보이고,
// Tide Check는 그 위에 뜨는 모달이다 — 폰 프레임으로 화면을 통째로 바꾸지 않는다.
// selectedId는 "지금 스크롤이 어느 episode를 향해야 하는지"만 의미하는 state.
function App() {
  const [showTideCheck, setShowTideCheck] = useState(true); // 하루 최소 1회 필수 체크인
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div className="app-shell">
      <Episodes
        selectedId={selectedId}
        onSelectEpisode={(episode) => setSelectedId(episode.id)}
        onUpdateTide={() => setShowTideCheck(true)}
      />
      <ChatView />

      {showTideCheck && (
        <div className="modal-overlay">
          <div className="tc-modal-wrap">
            <TideCheck onDone={() => setShowTideCheck(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
