import { useEffect, useState } from "react";
import { getTestMessage } from "./api/client";
import "./App.css";

function App() {
  const [message, setMessage] = useState("서버 연결 확인 중...");
  const [error, setError] = useState("");

  useEffect(() => {
    async function connectBackend() {
      try {
        const data = await getTestMessage();
        setMessage(data.message);
      } catch (requestError) {
        setError(requestError.message);
      }
    }

    connectBackend();
  }, []);

  return (
    <main>
      <h1>CalMe</h1>
      <p>프론트엔드와 백엔드 연결 테스트</p>

      {error ? (
        <p>연결 실패: {error}</p>
      ) : (
        <p>{message}</p>
      )}
    </main>
  );
}

export default App;