import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState("create");
  const [query, setQuery] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [extractedData, setExtractedData] = useState(null);
  const [relatedLaws, setRelatedLaws] = useState([]);
  const [docResult, setDocResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("content_proof");

  // [NEW] 자세히 보기(모달) 상태 관리
  const [selectedLaw, setSelectedLaw] = useState(null);

  const [cases, setCases] = useState([]);
  const [currentCaseId, setCurrentCaseId] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);

  const [manualForm, setManualForm] = useState({
    sender_name: "", sender_address: "", sender_phone: "",
    receiver_name: "", receiver_address: "",
    title: "", facts: "", legal_basis: "전문가(AI) 상담 또는 관련 법령 참조", demands: "", deadline: ""
  });

  const fetchCases = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/cases");
      setCases(res.data.reverse());
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
    setRelatedLaws([]);
    
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
      const generatedDoc = response.data.document_content;
      setDocResult(generatedDoc);

      const casePayload = {
        query: chatLog[chatLog.length - 2]?.text || "수동 입력 데이터",
        extracted_data: extractedData,
        doc_type: selectedDocType,
        document_content: generatedDoc
      };
      const caseRes = await axios.post("http://127.0.0.1:8000/api/cases", casePayload);
      setCurrentCaseId(caseRes.data.id); 
    } catch (error) {
      setDocResult("문서 생성 실패: 서버 에러");
    }
    setIsLoading(false);
  };

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
        fetchCases();
      }
    } catch (error) {
      alert("피드백 전송 실패");
    }
  };

  const submitManualForm = () => setExtractedData(manualForm);

  const colors = {
    navy: '#0f172a', navyLight: '#1e293b',
    cobalt: '#2563eb', cobaltHover: '#1d4ed8', cobaltLight: '#eff6ff',
    border: '#e2e8f0', textMain: '#334155', textMuted: '#64748b',
    bgLight: '#f8fafc', white: '#ffffff'
  };

  const inputStyle = { 
    padding: '12px', border: `1px solid ${colors.border}`, borderRadius: '6px', 
    fontSize: '14px', width: '100%', boxSizing: 'border-box', outline: 'none',
    transition: 'border-color 0.2s', color: colors.textMain
  };

  const needsMoreInfo = chatLog.length > 0 && chatLog[chatLog.length - 1].sender === 'ai' && !extractedData;

  return (
    <div style={{ padding: '40px 20px', fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif", maxWidth: '1200px', margin: '0 auto', color: colors.textMain }}>
      
      {/* [NEW] 자세히 보기 모달 오버레이 */}
      {selectedLaw && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedLaw(null)}>
          <div style={{ backgroundColor: colors.white, padding: '30px', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedLaw(null)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'transparent', fontSize: '24px', cursor: 'pointer', color: colors.textMuted }}>✖</button>
            <h2 style={{ marginTop: 0, color: colors.navy, paddingRight: '30px', borderBottom: `2px solid ${colors.border}`, paddingBottom: '15px' }}>{selectedLaw.title}</h2>
            <div style={{ lineHeight: '1.8', fontSize: '15px', whiteSpace: 'pre-wrap', color: colors.textMain, marginTop: '20px' }}>
              {selectedLaw.full_content || "상세 내용이 제공되지 않았습니다."}
            </div>
          </div>
        </div>
      )}

      <h1 style={{ color: colors.navy, borderBottom: `3px solid ${colors.navy}`, paddingBottom: '15px', fontWeight: '800', letterSpacing: '-0.5px' }}>
        ⚖️ 진화형 법률 AI 에이전트 (v3.0)
      </h1>

      <div style={{ marginBottom: '30px', display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button onClick={() => setActiveTab("create")} style={{ padding: '12px 28px', cursor: 'pointer', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', transition: 'all 0.2s', backgroundColor: activeTab === "create" ? colors.navy : colors.bgLight, color: activeTab === "create" ? colors.white : colors.textMuted, boxShadow: activeTab === "create" ? '0 4px 6px -1px rgba(15, 23, 42, 0.2)' : 'none' }}>📝 새 서식 생성</button>
        <button onClick={() => setActiveTab("history")} style={{ padding: '12px 28px', cursor: 'pointer', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', transition: 'all 0.2s', backgroundColor: activeTab === "history" ? colors.navy : colors.bgLight, color: activeTab === "history" ? colors.white : colors.textMuted, boxShadow: activeTab === "history" ? '0 4px 6px -1px rgba(15, 23, 42, 0.2)' : 'none' }}>📂 내 사건 히스토리</button>
      </div>

      {activeTab === "create" ? (
        <div style={{ display: 'flex', gap: '30px' }}>
          <div style={{ flex: '2' }}>
            
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ color: colors.navyLight, fontSize: '1.25rem', marginBottom: '15px' }}>1. 상황 분석 및 전략 검토</h2>
              <div style={{ height: '380px', overflowY: 'auto', border: `1px solid ${colors.border}`, padding: '20px', backgroundColor: colors.white, borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                {chatLog.length === 0 && <p style={{ color: colors.textMuted, textAlign: 'center', marginTop: '150px' }}>상황을 상세히 설명해주세요. (예: "차량사고로 손해배상을 청구하고 싶어요")</p>}
                
                {chatLog.map((msg, idx) => (
                  <div key={idx} style={{ textAlign: msg.sender === 'user' ? 'right' : 'left', margin: '10px 0' }}>
                    <span style={{ display: 'inline-block', padding: '14px 18px', borderRadius: '16px', fontSize: '15px', backgroundColor: msg.sender === 'user' ? colors.cobalt : colors.bgLight, color: msg.sender === 'user' ? colors.white : colors.textMain, border: msg.sender === 'ai' ? `1px solid ${colors.border}` : 'none', borderBottomRightRadius: msg.sender === 'user' ? '4px' : '16px', borderBottomLeftRadius: msg.sender === 'ai' ? '4px' : '16px', whiteSpace: 'pre-wrap', lineHeight: '1.6', maxWidth: '85%', textAlign: 'left' }}>
                      {msg.text}
                    </span>
                  </div>
                ))}
              </div>
              
              {needsMoreInfo && (
                <div style={{ marginTop: '20px', padding: '25px', backgroundColor: colors.cobaltLight, borderRadius: '12px', border: `1px solid #bfdbfe` }}>
                  <h3 style={{ color: colors.cobaltHover, marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>📝 법률 문서 필수 정보 직접 입력</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input placeholder="내 이름 (발신인)" value={manualForm.sender_name} onChange={e => setManualForm({...manualForm, sender_name: e.target.value})} style={inputStyle} />
                    <input placeholder="상대방 이름 (수신인)" value={manualForm.receiver_name} onChange={e => setManualForm({...manualForm, receiver_name: e.target.value})} style={inputStyle} />
                    <input placeholder="내 주소" value={manualForm.sender_address} onChange={e => setManualForm({...manualForm, sender_address: e.target.value})} style={inputStyle} />
                    <input placeholder="상대방 주소" value={manualForm.receiver_address} onChange={e => setManualForm({...manualForm, receiver_address: e.target.value})} style={inputStyle} />
                    <input placeholder="문서 제목" value={manualForm.title} onChange={e => setManualForm({...manualForm, title: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1'}} />
                    <textarea placeholder="사실관계" value={manualForm.facts} onChange={e => setManualForm({...manualForm, facts: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1', height: '80px', resize: 'none'}} />
                    <textarea placeholder="요구사항" value={manualForm.demands} onChange={e => setManualForm({...manualForm, demands: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1', height: '80px', resize: 'none'}} />
                  </div>
                  <button onClick={submitManualForm} style={{ width: '100%', padding: '14px', marginTop: '20px', backgroundColor: colors.cobalt, color: colors.white, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>작성 완료 및 다음 단계로</button>
                </div>
              )}

              <div style={{ display: 'flex', marginTop: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderRadius: '8px' }}>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAsk()} placeholder="사실관계를 상세히 입력하세요..." style={{ flex: 1, padding: '16px', border: `1px solid ${colors.border}`, borderRadius: '8px 0 0 8px', fontSize: '15px', outline: 'none' }} />
                <button onClick={handleAsk} disabled={isLoading} style={{ padding: '0 30px', backgroundColor: colors.navy, color: colors.white, border: 'none', borderRadius: '0 8px 8px 0', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', transition: 'background-color 0.2s' }}>{isLoading ? '분석 중...' : '분석 요청'}</button>
              </div>
            </div>

            {extractedData && (
              <div style={{ backgroundColor: colors.white, border: `1px solid ${colors.border}`, padding: '30px', borderRadius: '12px', marginBottom: '40px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                <h2 style={{ color: colors.navyLight, marginTop: 0, fontSize: '1.25rem', marginBottom: '20px' }}>2. 문서 자동 발급</h2>
                <div style={{ marginBottom: '25px', display: 'flex', gap: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '15px' }}><input type="radio" value="content_proof" checked={selectedDocType === "content_proof"} onChange={(e) => setSelectedDocType(e.target.value)} style={{ marginRight: '8px', accentColor: colors.cobalt }} /> 내용증명서</label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '15px' }}><input type="radio" value="complaint" checked={selectedDocType === "complaint"} onChange={(e) => setSelectedDocType(e.target.value)} style={{ marginRight: '8px', accentColor: colors.cobalt }} /> 민사소장</label>
                </div>
                <button onClick={handleGenerateDoc} disabled={isLoading} style={{ width: '100%', padding: '16px', backgroundColor: colors.cobalt, color: colors.white, border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s' }}>📄 AI 문서 자동 생성</button>
              </div>
            )}

            {docResult && (
              <div>
                <h2 style={{ color: colors.navyLight, fontSize: '1.25rem', marginBottom: '15px' }}>3. 완성된 법률 문서</h2>
                <div style={{ backgroundColor: colors.white, padding: '40px', border: `1px solid ${colors.border}`, borderRadius: '12px', whiteSpace: 'pre-wrap', fontFamily: "'KoPub Batang', 'Malgun Gothic', serif", lineHeight: '1.8', height: '500px', overflowY: 'auto', marginBottom: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', color: '#000' }}>{docResult}</div>

                <div style={{ backgroundColor: colors.bgLight, border: `1px solid ${colors.border}`, padding: '25px', borderRadius: '12px' }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: colors.navy }}>🌟 방금 생성한 전략에 대한 피드백</h3>
                  {feedbackSubmitted ? (
                    <p style={{ color: colors.cobalt, fontWeight: 'bold', margin: 0 }}>✓ 기록이 안전하게 저장되었습니다.</p>
                  ) : (
                    <div>
                      <div style={{ marginBottom: '15px', display: 'flex', gap: '8px' }}>
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button key={num} onClick={() => setRating(num)} style={{ padding: '8px 16px', backgroundColor: rating === num ? colors.navy : colors.white, color: rating === num ? colors.white : colors.textMain, border: `1px solid ${rating === num ? colors.navy : colors.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}>{num}점</button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="개선 사항이나 추가 코멘트를 적어주세요..." style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={() => handleSubmitFeedback(currentCaseId, rating, comment)} style={{ padding: '0 25px', backgroundColor: colors.cobalt, color: colors.white, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>기록 전송</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ flex: '1', minWidth: '320px' }}>
            <div style={{ backgroundColor: colors.bgLight, padding: '25px', borderRadius: '12px', border: `1px solid ${colors.border}`, height: 'fit-content', position: 'sticky', top: '20px' }}>
              <h3 style={{ marginTop: '0', color: colors.navy, borderBottom: `2px solid ${colors.border}`, paddingBottom: '12px', fontSize: '1.1rem' }}>📖 관련 법령 및 판례 레퍼런스</h3>
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {relatedLaws.length === 0 ? (
                  <p style={{ fontSize: '14px', color: colors.textMuted, textAlign: 'center', padding: '20px 0' }}>{isLoading ? '검색 중입니다...' : '분석을 요청하시면 관련 데이터가 표시됩니다.'}</p>
                ) : (
                  relatedLaws.map((law, idx) => (
                    // [NEW] 호버 애니메이션 및 클릭 이벤트 추가
                    <div 
                      key={idx} 
                      onClick={() => setSelectedLaw(law)}
                      style={{ 
                        backgroundColor: colors.white, padding: '18px', borderRadius: '8px', 
                        border: `1px solid ${colors.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)', 
                        cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' 
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.08)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'; }}
                    >
                      <h4 style={{ margin: '0 0 10px 0', color: colors.navyLight, fontSize: '15px', lineHeight: '1.4' }}>{law.title}</h4>
                      <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: colors.textMain, lineHeight: '1.6' }}>{law.content}</p>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '12px', color: colors.cobalt, fontWeight: '700' }}>자세히 보기 →</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: '900px' }}>
          <h2 style={{ color: colors.navy, marginBottom: '10px' }}>📂 문서 생성 이력 및 피드백 기록</h2>
          <p style={{ color: colors.textMuted, marginBottom: '30px', fontSize: '15px' }}>나중에 사건의 승소 여부나 문서의 활용 결과를 기록하면, AI가 이를 바탕으로 학습하여 더욱 정교해집니다.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {cases.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', backgroundColor: colors.bgLight, border: `1px dashed ${colors.border}`, borderRadius: '12px', color: colors.textMuted }}>아직 생성된 문서 기록이 없습니다.</div>
            ) : (
              cases.map((c) => (
                <div key={c.id} style={{ border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '25px', backgroundColor: colors.white, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.bgLight}`, paddingBottom: '15px', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, color: colors.navyLight, fontSize: '1.1rem' }}><span style={{ color: colors.cobalt, marginRight: '8px' }}>[{c.doc_type === 'complaint' ? '소장' : '내용증명'}]</span> {c.extracted_data.title || "제목 없음"}</h3>
                    <span style={{ color: colors.textMuted, fontSize: '13px' }}>{c.timestamp}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: colors.textMain, marginBottom: '20px', lineHeight: '1.6', backgroundColor: colors.bgLight, padding: '15px', borderRadius: '8px' }}>
                    <strong style={{ color: colors.navy }}>상대방:</strong> {c.extracted_data.receiver_name} <br/>
                    <strong style={{ color: colors.navy }}>초기 질문:</strong> {c.query}
                  </div>
                  <div style={{ borderTop: `1px dashed ${colors.border}`, paddingTop: '20px' }}>
                    {editingFeedbackId === c.id ? (
                      <div style={{ backgroundColor: colors.cobaltLight, padding: '20px', borderRadius: '8px' }}>
                        <strong style={{ display: 'block', marginBottom: '15px', color: colors.navy }}>피드백 업데이트</strong>
                        <div style={{ marginBottom: '15px', display: 'flex', gap: '8px' }}>
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button key={num} onClick={() => setRating(num)} style={{ padding: '6px 14px', backgroundColor: rating === num ? colors.navy : colors.white, color: rating === num ? colors.white : colors.textMain, border: `1px solid ${rating === num ? colors.navy : colors.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>{num}점</button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="코멘트 입력..." style={{...inputStyle, flex: 1}} />
                          <button onClick={() => handleSubmitFeedback(c.id, rating, comment)} style={{ padding: '0 20px', backgroundColor: colors.cobalt, color: colors.white, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>저장</button>
                          <button onClick={() => setEditingFeedbackId(null)} style={{ padding: '0 20px', backgroundColor: colors.textMuted, color: colors.white, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '14px' }}>
                          <span style={{ color: colors.textMuted, marginRight: '10px' }}>AI 만족도:</span> {c.rating > 0 ? <strong style={{ color: colors.cobalt, fontSize: '16px' }}>{c.rating}점</strong> : <span style={{ color: colors.textMuted }}>미평가</span>}
                          <span style={{ margin: '0 15px', color: colors.border }}>|</span>
                          <span style={{ color: colors.textMuted, marginRight: '10px' }}>코멘트:</span> <span style={{ color: colors.textMain }}>{c.comment || "없음"}</span>
                        </div>
                        <button onClick={() => { setEditingFeedbackId(c.id); setRating(c.rating || 5); setComment(c.comment || ""); }} style={{ padding: '8px 16px', backgroundColor: colors.white, border: `1px solid ${colors.border}`, borderRadius: '6px', cursor: 'pointer', color: colors.navy, fontWeight: '600', transition: 'background-color 0.2s' }}>평가 수정</button>
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