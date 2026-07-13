import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [query, setQuery] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [extractedData, setExtractedData] = useState(null);
  const [relatedLaws, setRelatedLaws] = useState([]);
  const [docResult, setDocResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [selectedDocType, setSelectedDocType] = useState("content_proof");

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // ====== [NEW] 수동 입력 폼 상태 관리 ======
  const [manualForm, setManualForm] = useState({
    sender_name: "", sender_address: "", sender_phone: "",
    receiver_name: "", receiver_address: "",
    title: "", facts: "", legal_basis: "전문가(AI) 상담 또는 관련 법령 참조", demands: "", deadline: ""
  });

  const handleAsk = async () => {
    if (!query.trim()) return;
    
    const newChat = [...chatLog, { sender: 'user', text: query }];
    setChatLog(newChat);
    setQuery("");
    setIsLoading(true);
    setExtractedData(null); 
    setDocResult("");
    setFeedbackSubmitted(false);
    
    // 수동 폼 초기화
    setManualForm({
      sender_name: "", sender_address: "", sender_phone: "",
      receiver_name: "", receiver_address: "",
      title: "", facts: "", legal_basis: "관련 법령 참조", demands: "", deadline: ""
    });

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/ask", { query: query });
      setChatLog([...newChat, { sender: 'ai', text: response.data.response }]);
      if (response.data.extracted_data) setExtractedData(response.data.extracted_data);
      if (response.data.related_laws) setRelatedLaws(response.data.related_laws);
    } catch (error) {
      setChatLog([...newChat, { sender: 'ai', text: "서버 통신 에러가 발생했습니다." }]);
    }
    setIsLoading(false);
  };

  const handleGenerateDoc = async () => {
    if (!extractedData) return;
    setIsLoading(true);
    setDocResult("문서를 생성 중입니다...");
    try {
      const payload = { ...extractedData, doc_type: selectedDocType };
      const response = await axios.post("http://127.0.0.1:8000/api/generate-document", payload);
      setDocResult(response.data.document_content);
    } catch (error) {
      setDocResult("문서 생성 실패: 서버 에러");
    }
    setIsLoading(false);
  };

  const handleSubmitFeedback = async () => {
    try {
      await axios.post("http://127.0.0.1:8000/api/feedback", {
        query: chatLog[chatLog.length - 2]?.text || "MOCK_QUERY",
        extracted_data: extractedData,
        rating: rating,
        user_comment: comment
      });
      setFeedbackSubmitted(true);
      setComment("");
    } catch (error) {
      alert("피드백 전송 실패");
    }
  };

  // 수동 폼 데이터를 문서 생성 단계(extractedData)로 넘기는 함수
  const submitManualForm = () => {
    setExtractedData(manualForm);
  };

  // 공통 인풋 스타일 (깔끔한 네모 상자)
  const inputStyle = {
    padding: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box'
  };

  // 정보 부족 상태 판별: 대화가 있고, 마지막 화자가 AI이며, 자동 추출 데이터가 없을 때
  const needsMoreInfo = chatLog.length > 0 && chatLog[chatLog.length - 1].sender === 'ai' && !extractedData;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        ⚖️ 진화형 법률 AI 에이전트 (v3.0)
      </h1>

      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <div style={{ flex: '2' }}>
          
          <div style={{ marginBottom: '40px' }}>
            <h2>1. 상황 분석 및 전략 검토</h2>
            <div style={{ height: '350px', overflowY: 'scroll', border: '1px solid #ccc', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
              {chatLog.length === 0 && <p style={{ color: '#888' }}>상황을 설명해주세요. (예: "차량사고로 손해배상을 청구하고 싶어요")</p>}
              
              {chatLog.map((msg, idx) => (
                <div key={idx} style={{ textAlign: msg.sender === 'user' ? 'right' : 'left', margin: '15px 0' }}>
                  <span style={{ 
                    display: 'inline-block', padding: '12px 16px', borderRadius: '15px', 
                    backgroundColor: msg.sender === 'user' ? '#007bff' : '#fff', 
                    color: msg.sender === 'user' ? '#fff' : '#333',
                    border: msg.sender === 'ai' ? '1px solid #ddd' : 'none',
                    whiteSpace: 'pre-wrap', lineHeight: '1.5'
                  }}>
                    {msg.text}
                  </span>
                </div>
              ))}
            </div>
            
            {/* ====== [NEW] 수동 데이터 입력 창 (명시적 UI) ====== */}
            {needsMoreInfo && (
              <div style={{ marginTop: '15px', padding: '20px', backgroundColor: '#fdf7e3', borderRadius: '8px', border: '1px solid #f1e0a6' }}>
                <h3 style={{ color: '#8a6d3b', marginTop: 0, marginBottom: '5px' }}>📝 법률 문서 필수 정보 직접 입력</h3>
                <p style={{ fontSize: '13px', color: '#8a6d3b', marginBottom: '15px' }}>
                  입력하신 내용만으로는 문서 자동 작성이 어렵습니다. 대화창에 자세히 적어주시거나, 아래 양식을 직접 채워주세요.
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <input placeholder="내 이름 (발신인)" value={manualForm.sender_name} onChange={e => setManualForm({...manualForm, sender_name: e.target.value})} style={inputStyle} />
                  <input placeholder="상대방 이름 (수신인)" value={manualForm.receiver_name} onChange={e => setManualForm({...manualForm, receiver_name: e.target.value})} style={inputStyle} />
                  
                  <input placeholder="내 주소" value={manualForm.sender_address} onChange={e => setManualForm({...manualForm, sender_address: e.target.value})} style={inputStyle} />
                  <input placeholder="상대방 주소" value={manualForm.receiver_address} onChange={e => setManualForm({...manualForm, receiver_address: e.target.value})} style={inputStyle} />
                  
                  <input placeholder="문서 제목 (예: 차량사고 손해배상 청구)" value={manualForm.title} onChange={e => setManualForm({...manualForm, title: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1'}} />
                  <textarea placeholder="사실관계 (사건 일시, 장소, 경위 등을 구체적으로 기재)" value={manualForm.facts} onChange={e => setManualForm({...manualForm, facts: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1', height: '60px', resize: 'none'}} />
                  <textarea placeholder="요구사항 (청구 금액, 이행 기한 등)" value={manualForm.demands} onChange={e => setManualForm({...manualForm, demands: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1', height: '60px', resize: 'none'}} />
                </div>

                <button onClick={submitManualForm} style={{ width: '100%', padding: '12px', marginTop: '15px', backgroundColor: '#d39e00', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>
                  작성 완료 (다음 단계로)
                </button>
              </div>
            )}
            {/* ================================================= */}

            <div style={{ display: 'flex', marginTop: '10px' }}>
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAsk()} placeholder="사실관계를 상세히 입력하세요..." style={{ flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '5px 0 0 5px', fontSize: '15px' }} />
              <button onClick={handleAsk} disabled={isLoading} style={{ padding: '12px 25px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '0 5px 5px 0', cursor: 'pointer', fontWeight: 'bold' }}>
                분석 요청
              </button>
            </div>
          </div>

          {extractedData && (
            <div style={{ backgroundColor: '#e9f5ff', border: '1px solid #b8daff', padding: '20px', borderRadius: '8px', marginBottom: '40px' }}>
              <h2 style={{ color: '#0056b3', marginTop: 0 }}>2. 문서 자동 발급 레이어</h2>
              
              <div style={{ marginBottom: '15px', fontWeight: 'bold' }}>
                <span style={{ marginRight: '15px' }}>서식 유형 선택: </span>
                <label style={{ marginRight: '15px', cursor: 'pointer' }}>
                  <input type="radio" value="content_proof" checked={selectedDocType === "content_proof"} onChange={(e) => setSelectedDocType(e.target.value)} /> 내용증명서
                </label>
                <label style={{ cursor: 'pointer' }}>
                  <input type="radio" value="complaint" checked={selectedDocType === "complaint"} onChange={(e) => setSelectedDocType(e.target.value)} /> 민사소장
                </label>
              </div>

              <pre style={{ backgroundColor: '#fff', padding: '12px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '13px', overflowX: 'auto' }}>
                {JSON.stringify(extractedData, null, 2)}
              </pre>
              <button onClick={handleGenerateDoc} disabled={isLoading} style={{ width: '100%', padding: '15px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', marginTop: '10px', fontWeight: 'bold' }}>
                📄 선택한 서식으로 법률 문서 발행 (Execution)
              </button>
            </div>
          )}

          {docResult && (
            <div>
              <h2>3. 완성된 법률 문서</h2>
              <div style={{ backgroundColor: '#fff', padding: '30px', border: '1px solid #333', borderRadius: '5px', whiteSpace: 'pre-wrap', fontFamily: 'serif', lineHeight: '1.8', height: '450px', overflowY: 'scroll', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)', marginBottom: '20px' }}>
                {docResult}
              </div>

              <div style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', padding: '20px', borderRadius: '8px' }}>
                <h3>🌟 에이전트 판단력 개선을 위한 피드백 (Self-Evolution)</h3>
                {feedbackSubmitted ? (
                  <p style={{ color: '#28a745', fontWeight: 'bold' }}>✓ 피드백이 전송되었습니다. 성공 경험 데이터베이스에 등록됩니다!</p>
                ) : (
                  <div>
                    <div style={{ marginBottom: '10px' }}>
                      <span style={{ marginRight: '10px' }}>전략 만족도: </span>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button key={num} onClick={() => setRating(num)} style={{ marginRight: '5px', padding: '5px 10px', backgroundColor: rating === num ? '#007bff' : '#fff', color: rating === num ? '#fff' : '#000', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer' }}>{num}점</button>
                      ))}
                    </div>
                    <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="실제 승소 여부나 개선 사항을 적어주세요..." style={{ width: '70%', padding: '10px', marginRight: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    <button onClick={handleSubmitFeedback} style={{ padding: '10px 20px', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>기록 전송</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: '1', backgroundColor: '#f1f3f5', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', height: 'fit-content' }}>
          <h3 style={{ marginTop: '0', color: '#495057' }}>📖 관련 법령 레퍼런스</h3>
          <p style={{ fontSize: '13px', color: '#868e96' }}>* FAISS 벡터 인덱스 검색 결과</p>
          {relatedLaws.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#adb5bd', textAlign: 'center', marginTop: '50px' }}>검색된 법령이 없습니다.</p>
          ) : (
            relatedLaws.map((law, idx) => (
              <div key={idx} style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '5px', border: '1px solid #ced4da', marginBottom: '15px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#0056b3', fontSize: '15px' }}>{law.title}</h4>
                <p style={{ margin: '0', fontSize: '13px', color: '#343a40', lineHeight: '1.5' }}>
                  {law.content.length > 150 ? law.content.substring(0, 150) + '...' : law.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;