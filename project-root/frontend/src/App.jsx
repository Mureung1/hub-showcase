import { useEffect, useState } from 'react';

function App() {
  const [status, setStatus] = useState('연결 확인 중...');

  useEffect(() => {
    fetch('http://localhost:3000/api/health')
      .then(res => res.json())
      .then(data => setStatus(`백엔드 응답: ${data.status}`))
      .catch(() => setStatus('백엔드 연결 실패'));
  }, []);

  return <div>{status}</div>;
}

export default App;