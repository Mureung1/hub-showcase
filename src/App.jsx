import { useState } from 'react';
import TideCheck from './TideCheck';
import Episodes from './Episodes';
import ChatView from './ChatView';
import './screens.css';

// App이 "지금 어떤 화면인지"와 "어떤 episode를 보고 있는지"를 state로 들고 있고,
// 각 화면 컴포넌트에는 그 state를 props(데이터)와 콜백(이벤트)으로만 내려준다.
function App() {
  const [screen, setScreen] = useState('tidecheck');
  const [activeEpisode, setActiveEpisode] = useState(null);

  if (screen === 'tidecheck') {
    return <TideCheck onDone={() => setScreen('episodes')} />;
  }

  if (screen === 'chat' && activeEpisode) {
    return <ChatView episode={activeEpisode} onBack={() => setScreen('episodes')} />;
  }

  return (
    <Episodes
      onOpenEpisode={(episode) => {
        setActiveEpisode(episode);
        setScreen('chat');
      }}
      onUpdateTide={() => setScreen('tidecheck')}
    />
  );
}

export default App;
