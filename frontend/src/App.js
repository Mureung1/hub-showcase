import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  // --- 탭 상태 관리 ---
  const [activeTab, setActiveTab] = useState("create"); // "create" | "history"

  // --- 기존 생성 관련 상태 ---
  const [query, setQuery] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [extractedData, setExtractedData] = useState(null);
  const [relatedLaws, setRelatedLaws] = useState([]);
  const [docResult, setDocResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("content_proof");

  // --- 히스토리 및 피드백 상태 ---
  const [cases, setCases] = useState([]);
  const [currentCaseId, setCurrentCaseId] = useState(null); // 방금 생성한 사건 ID
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);

  // 수동 입력 폼
  const [manualForm, setManualForm] = useState({
    sender_name: "", sender_address: "", sender_phone: "",
    receiver_name: "", receiver_address: "",
    title: "", facts: "", legal_basis: "전문가(AI) 상담 또는 관련 법령 참조", demands: "", deadline: ""
  });

  // [NEW] 히스토리 불러오기
  const fetchCases = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/cases");
      setCases(res.data.reverse()); // 최신순 정렬
    } catch (e) {
      console.error("히스토리 로드 실패:", e);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchCases();
    }
  }, [activeTab]);

  const handleAsk = async () => {
    if (!query.trim()) return;
    
    const newChat = [...chatLog, { sender: 'user', text: query }];
    setChatLog(newChat);
    setQuery("");
    setIsLoading(true);
    setExtractedData(null); 
    setDocResult("");
    setFeedbackSubmitted(false);
    setCurrentCaseId(null);
    
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
      
      // 1. 문서 생성 요청
      const response = await axios.post("http://127.0.0.1:8000/api/generate-document", payload);
      const generatedDoc = response.data.document_content;
      setDocResult(generatedDoc);

      // 2. [NEW] 생성 완료 후 DB(JSON 파일)에 사건 기록 저장
      const casePayload = {
        query: chatLog[chatLog.length - 2]?.text || "수동 입력 데이터",
        extracted_data: extractedData,
        doc_type: selectedDocType,
        document_content: generatedDoc
      };
      const caseRes = await axios.post("http://127.0.0.1:8000/api/cases", casePayload);
      setCurrentCaseId(caseRes.data.id); // 부여받은 고유 ID 저장

    } catch (error) {
      setDocResult("문서 생성 실패: 서버 에러");
    }
    setIsLoading(false);
  };

  // [NEW] 특정 사건 ID에 대한 피드백 전송
  const handleSubmitFeedback = async (caseId, ratingVal, commentVal) => {
    if (!caseId) {
      alert("사건 정보가 올바르지 않습니다.");
      return;
    }
    try {
      await axios.post("http://127.0.0.1:8000/api/feedback", {
        case_id: caseId,
        rating: ratingVal,
        comment: commentVal
      });
      
      if (activeTab === "create") {
        setFeedbackSubmitted(true);
      } else {
        setEditingFeedbackId(null);
        fetchCases(); // 목록 새로고침
      }
    } catch (error) {
      alert("피드백 전송 실패");
    }
  };

  const submitManualForm = () => setExtractedData(manualForm);

  const inputStyle = { padding: '10px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '14px', width: '100%', boxSizing: 'border-box' };
  const needsMoreInfo = chatLog.length > 0 && chatLog[chatLog.length - 1].sender === 'ai' && !extractedData;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#2c3e50', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        ⚖️ 진화형 법률 AI 에이전트 (v3.0)
      </h1>

      {/* --- 탭 메뉴 --- */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => setActiveTab("create")} 
          style={{ padding: '12px 25px', cursor: 'pointer', border: 'none', borderRadius: '5px', fontWeight: 'bold', backgroundColor: activeTab === "create" ? '#007bff' : '#e9ecef', color: activeTab === "create" ? '#fff' : '#495057' }}>
          📝 새 서식 생성
        </button>
        <button 
          onClick={() => setActiveTab("history")} 
          style={{ padding: '12px 25px', cursor: 'pointer', border: 'none', borderRadius: '5px', fontWeight: 'bold', backgroundColor: activeTab === "history" ? '#007bff' : '#e9ecef', color: activeTab === "history" ? '#fff' : '#495057' }}>
          📂 내 사건 히스토리
        </button>
      </div>

      {activeTab === "create" ? (
        // ======================= [ 새 서식 생성 탭 ] =======================
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: '2' }}>
            <div style={{ marginBottom: '40px' }}>
              <h2>1. 상황 분석 및 전략 검토</h2>
              <div style={{ height: '350px', overflowY: 'scroll', border: '1px solid #ccc', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
                {chatLog.length === 0 && <p style={{ color: '#888' }}>상황을 설명해주세요. (예: "차량사고로 손해배상을 청구하고 싶어요")</p>}
                {chatLog.map((msg, idx) => (
                  <div key={idx} style={{ textAlign: msg.sender === 'user' ? 'right' : 'left', margin: '15px 0' }}>
                    <span style={{ 
                      display: 'inline-block', padding: '12px 16px', borderRadius: '15px', 
                      backgroundColor: msg.sender === 'user' ? '#007bff' : '#fff', color: msg.sender === 'user' ? '#fff' : '#333',
                      border: msg.sender === 'ai' ? '1px solid #ddd' : 'none', whiteSpace: 'pre-wrap', lineHeight: '1.5'
                    }}>
                      {msg.text}
                    </span>
                  </div>
                ))}
              </div>
              
              {needsMoreInfo && (
                <div style={{ marginTop: '15px', padding: '20px', backgroundColor: '#fdf7e3', borderRadius: '8px', border: '1px solid #f1e0a6' }}>
                  <h3 style={{ color: '#8a6d3b', marginTop: 0, marginBottom: '5px' }}>📝 법률 문서 필수 정보 직접 입력</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input placeholder="내 이름 (발신인)" value={manualForm.sender_name} onChange={e => setManualForm({...manualForm, sender_name: e.target.value})} style={inputStyle} />
                    <input placeholder="상대방 이름 (수신인)" value={manualForm.receiver_name} onChange={e => setManualForm({...manualForm, receiver_name: e.target.value})} style={inputStyle} />
                    <input placeholder="내 주소" value={manualForm.sender_address} onChange={e => setManualForm({...manualForm, sender_address: e.target.value})} style={inputStyle} />
                    <input placeholder="상대방 주소" value={manualForm.receiver_address} onChange={e => setManualForm({...manualForm, receiver_address: e.target.value})} style={inputStyle} />
                    <input placeholder="문서 제목" value={manualForm.title} onChange={e => setManualForm({...manualForm, title: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1'}} />
                    <textarea placeholder="사실관계" value={manualForm.facts} onChange={e => setManualForm({...manualForm, facts: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1', height: '60px', resize: 'none'}} />
                    <textarea placeholder="요구사항" value={manualForm.demands} onChange={e => setManualForm({...manualForm, demands: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1', height: '60px', resize: 'none'}} />
                  </div>
                  <button onClick={submitManualForm} style={{ width: '100%', padding: '12px', marginTop: '15px', backgroundColor: '#d39e00', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                    작성 완료 (다음 단계로)
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', marginTop: '10px' }}>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAsk()} placeholder="사실관계를 상세히 입력하세요..." style={{ flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '5px 0 0 5px' }} />
                <button onClick={handleAsk} disabled={isLoading} style={{ padding: '12px 25px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '0 5px 5px 0', cursor: 'pointer', fontWeight: 'bold' }}>
                  분석 요청
                </button>
              </div>
            </div>

            {extractedData && (
              <div style={{ backgroundColor: '#e9f5ff', border: '1px solid #b8daff', padding: '20px', borderRadius: '8px', marginBottom: '40px' }}>
                <h2 style={{ color: '#0056b3', marginTop: 0 }}>2. 문서 자동 발급 레이어</h2>
                <div style={{ marginBottom: '15px', fontWeight: 'bold' }}>
                  <label style={{ marginRight: '15px', cursor: 'pointer' }}><input type="radio" value="content_proof" checked={selectedDocType === "content_proof"} onChange={(e) => setSelectedDocType(e.target.value)} /> 내용증명서</label>
                  <label style={{ cursor: 'pointer' }}><input type="radio" value="complaint" checked={selectedDocType === "complaint"} onChange={(e) => setSelectedDocType(e.target.value)} /> 민사소장</label>
                </div>
                <button onClick={handleGenerateDoc} disabled={isLoading} style={{ width: '100%', padding: '15px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
                  📄 문서 자동 생성
                </button>
              </div>
            )}

            {docResult && (
              <div>
                <h2>3. 완성된 법률 문서</h2>
                <div style={{ backgroundColor: '#fff', padding: '30px', border: '1px solid #333', borderRadius: '5px', whiteSpace: 'pre-wrap', fontFamily: 'serif', lineHeight: '1.8', height: '450px', overflowY: 'scroll', marginBottom: '20px' }}>
                  {docResult}
                </div>

                <div style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6', padding: '20px', borderRadius: '8px' }}>
                  <h3>🌟 방금 생성한 전략에 대한 피드백</h3>
                  {feedbackSubmitted ? (
                    <p style={{ color: '#28a745', fontWeight: 'bold' }}>✓ 기록이 저장되었습니다. 히스토리 탭에서 언제든 수정 가능합니다.</p>
                  ) : (
                    <div>
                      <div style={{ marginBottom: '10px' }}>
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button key={num} onClick={() => setRating(num)} style={{ marginRight: '5px', padding: '5px 10px', backgroundColor: rating === num ? '#007bff' : '#fff', color: rating === num ? '#fff' : '#000', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer' }}>{num}점</button>
                        ))}
                      </div>
                      <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="개선 사항을 적어주세요..." style={{ width: '70%', padding: '10px', marginRight: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                      <button onClick={() => handleSubmitFeedback(currentCaseId, rating, comment)} style={{ padding: '10px 20px', backgroundColor: '#17a2b8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>기록 전송</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ flex: '1', backgroundColor: '#f1f3f5', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', height: 'fit-content' }}>
            <h3 style={{ marginTop: '0', color: '#495057' }}>📖 관련 법령 레퍼런스</h3>
            {relatedLaws.length === 0 ? <p style={{ fontSize: '14px', color: '#adb5bd', textAlign: 'center' }}>검색된 법령이 없습니다.</p> : relatedLaws.map((law, idx) => (
              <div key={idx} style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '5px', border: '1px solid #ced4da', marginBottom: '15px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#0056b3', fontSize: '15px' }}>{law.title}</h4>
                <p style={{ margin: '0', fontSize: '13px', color: '#343a40', lineHeight: '1.5' }}>{law.content}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // ======================= [ 내 사건 히스토리 탭 ] =======================
        <div>
          <h2>📂 문서 생성 이력 및 피드백 기록</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>나중에 사건의 승소 여부나 문서의 활용 결과를 기록하면, AI가 이를 바탕으로 학습합니다.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {cases.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f8f9fa', border: '1px dashed #ccc', borderRadius: '8px', color: '#888' }}>
                아직 생성된 문서 기록이 없습니다.
              </div>
            ) : (
              cases.map((c) => (
                <div key={c.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '20px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, color: '#333' }}>
                      {c.doc_type === 'complaint' ? '소장' : '내용증명'} - {c.extracted_data.title || "제목 없음"}
                    </h3>
                    <span style={{ color: '#888', fontSize: '14px' }}>{c.timestamp}</span>
                  </div>
                  
                  <p style={{ fontSize: '14px', color: '#555', marginBottom: '15px' }}>
                    <strong>상대방:</strong> {c.extracted_data.receiver_name} <br/>
                    <strong>초기 질문:</strong> {c.query}
                  </p>

                  <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
                    {editingFeedbackId === c.id ? (
                      // 피드백 수정 모드
                      <div>
                        <strong style={{ display: 'block', marginBottom: '10px' }}>피드백 업데이트</strong>
                        <div style={{ marginBottom: '10px' }}>
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button key={num} onClick={() => setRating(num)} style={{ marginRight: '5px', padding: '3px 8px', backgroundColor: rating === num ? '#007bff' : '#fff', color: rating === num ? '#fff' : '#000', border: '1px solid #ccc', borderRadius: '3px', cursor: 'pointer' }}>{num}점</button>
                          ))}
                        </div>
                        <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="코멘트 입력..." style={{ width: '60%', padding: '8px', marginRight: '10px', borderRadius: '4px', border: '1px solid #ccc' }} />
                        <button onClick={() => handleSubmitFeedback(c.id, rating, comment)} style={{ padding: '8px 15px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>저장</button>
                        <button onClick={() => setEditingFeedbackId(null)} style={{ padding: '8px 15px', backgroundColor: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '5px' }}>취소</button>
                      </div>
                    ) : (
                      // 결과 표시 모드
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>에이전트 만족도:</strong> {c.rating > 0 ? <span style={{ color: '#007bff', fontWeight: 'bold' }}>{c.rating}점</span> : <span style={{ color: '#999' }}>미평가</span>}
                          <br/>
                          <strong>코멘트:</strong> {c.comment || <span style={{ color: '#999' }}>없음</span>}
                        </div>
                        <button onClick={() => { setEditingFeedbackId(c.id); setRating(c.rating || 5); setComment(c.comment || ""); }} style={{ padding: '8px 15px', backgroundColor: '#e2e6ea', border: '1px solid #dae0e5', borderRadius: '4px', cursor: 'pointer', color: '#495057' }}>
                          평가하기
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;