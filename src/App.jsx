import React, { useState } from 'react';
import axios from 'axios';
import './App.css'; // 기본 스타일링

function App() {
  // 1. 상태 관리 (State)
  const [query, setQuery] = useState("");
  const [chatLog, setChatLog] = useState([]);
  
  const [docResult, setDocResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 2. 문서 생성용 기본 데이터 (테스트용)
  const [docData, setDocData] = useState({
    sender_name: "홍길동", sender_address: "대구광역시 북구 대학로 80", sender_phone: "010-1234-5678",
    receiver_name: "김악덕", receiver_address: "서울특별시 강남구 테헤란로 123",
    title: "임대차계약 종료에 따른 보증금 반환 촉구",
    facts: "- 2024년 5월 1일 전세 계약 체결\n- 만료일 지났으나 보증금 1억 미반환",
    legal_basis: "주택임대차보호법 제3조의2",
    demands: "보증금 1억 원을 국민은행(111-222)으로 즉시 반환 요망",
    deadline: "2026년 7월 20일"
  });

  // 3. 채팅 전송 함수 (FastAPI /api/ask 호출)
  const handleAsk = async () => {
    if (!query.trim()) return;
    
    const newChat = [...chatLog, { sender: 'user', text: query }];
    setChatLog(newChat);
    setQuery("");
    setIsLoading(true);

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/ask", { query: query });
      setChatLog([...newChat, { sender: 'ai', text: response.data.response }]);
    } catch (error) {
      setChatLog([...newChat, { sender: 'ai', text: "서버 통신 에러가 발생했습니다." }]);
    }
    setIsLoading(false);
  };

  // 4. 문서 생성 함수 (FastAPI /api/generate-document 호출)
  const handleGenerateDoc = async () => {
    setIsLoading(true);
    setDocResult("문서를 생성 중입니다...");
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/generate-document", docData);
      setDocResult(response.data.document_content);
    } catch (error) {
      setDocResult("문서 생성 실패: 서버 에러");
    }
    setIsLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        ⚖️ 진화형 법률 AI 에이전트
      </h1>

      {/* --- 채팅 영역 --- */}
      <div style={{ marginBottom: '40px' }}>
        <h2>1. 법률 상담 채팅</h2>
        <div style={{ height: '200px', overflowY: 'scroll', border: '1px solid #ccc', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
          {chatLog.length === 0 ? <p style={{ color: '#888' }}>에이전트에게 질문해보세요. (예: 보증금 안돌려줄 때 어떻게 해?)</p> : null}
          {chatLog.map((msg, idx) => (
            <div key={idx} style={{ textAlign: msg.sender === 'user' ? 'right' : 'left', margin: '10px 0' }}>
              <span style={{ display: 'inline-block', padding: '8px 12px', borderRadius: '15px', backgroundColor: msg.sender === 'user' ? '#007bff' : '#e9ecef', color: msg.sender === 'user' ? '#fff' : '#000' }}>
                {msg.text}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', marginTop: '10px' }}>
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAsk()} placeholder="상황을 입력하세요..." style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '5px 0 0 5px' }} />
          <button onClick={handleAsk} disabled={isLoading} style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '0 5px 5px 0', cursor: 'pointer' }}>
            질문하기
          </button>
        </div>
      </div>

      {/* --- 문서 생성 영역 --- */}
      <div>
        <h2>2. 원클릭 법률 문서 생성</h2>
        <p style={{ color: '#666', fontSize: '14px' }}>* 실제 서비스에서는 에이전트가 채팅 내용을 바탕으로 아래 폼을 자동으로 채워줍니다.</p>
        <button onClick={handleGenerateDoc} disabled={isLoading} style={{ padding: '12px 24px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', marginBottom: '15px' }}>
          📄 내용증명 자동 생성
        </button>
        
        {docResult && (
          <div style={{ backgroundColor: '#fff', padding: '20px', border: '1px solid #ccc', borderRadius: '5px', whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: '1.5', height: '300px', overflowY: 'scroll', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)' }}>
            {docResult}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;