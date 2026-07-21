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

  const [selectedLaw, setSelectedLaw] = useState(null);
  const [typingTimeout, setTypingTimeout] = useState(null);

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

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (typingTimeout) clearTimeout(typingTimeout);
    
    setTypingTimeout(setTimeout(async () => {
      if (val.trim().length > 2) {
        try {
          const res = await axios.post("http://127.0.0.1:8000/api/analyze", { query: val });
          const facts = res.data.facts;
          
          setManualForm(prev => {
            let aiFacts = "";
            if (facts.when) aiFacts += `일시: ${facts.when}\n`;
            if (facts.amount) aiFacts += `관련 금액: ${facts.amount}\n`;

            return {
              ...prev,
              title: facts.case_type || prev.title,
              // [추가된 부분] 백엔드에서 분석한 상대방(person) 이름이 있으면 피고 이름 칸에 자동 입력!
              receiver_name: facts.person || prev.receiver_name,
              facts: aiFacts.trim() !== "" ? aiFacts.trim() : prev.facts
            };
          });
        } catch (err) {
          console.error("실시간 분석 에러", err);
        }
      }
    }, 800));
  };

  const handleAsk = async () => {
    if (!query.trim()) return;
    
    const newChat = [...chatLog, { sender: 'user', text: query }];
    setChatLog(newChat);
    setIsLoading(true);
    setExtractedData(null); 
    setDocResult("");
    setFeedbackSubmitted(false);
    setCurrentCaseId(null);
    setRelatedLaws([]);

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
    if (!caseId) return;
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

  // [핵심 업데이트] SNU Navy (신뢰) + Naver Green (행동 유도) 테마
  const colors = {
    snuNavy: '#0A2254',      // 서울대 상징 네이비 (헤더, 텍스트)
    snuNavyLight: '#153A80', 
    naverGreen: '#03C75A',   // 네이버 상징 그린 (버튼, 프로그레스 바)
    naverHover: '#02b351',   
    accentBg: '#E8F9EE',     // 네이버 그린의 아주 연한 배경색
    border: '#E2E8F0', 
    textMain: '#1E293B',     // 가독성을 위한 진한 차콜
    textMuted: '#64748b',
    bgLight: '#F8FAFC', 
    white: '#ffffff'
  };

  const inputStyle = { 
    padding: '12px', border: `1px solid ${colors.border}`, borderRadius: '6px', 
    fontSize: '14px', width: '100%', boxSizing: 'border-box', outline: 'none',
    transition: 'border-color 0.2s', color: colors.textMain
  };

  const isAgentReplied = chatLog.length > 0 && chatLog[chatLog.length - 1].sender === 'ai';

  return (
    <div style={{ padding: '40px 20px', fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif", maxWidth: '1200px', margin: '0 auto', color: colors.textMain }}>
      
      {/* 자세히 보기 모달 */}
      {selectedLaw && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedLaw(null)}>
          <div style={{ backgroundColor: colors.white, padding: '30px', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedLaw(null)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'transparent', fontSize: '24px', cursor: 'pointer', color: colors.textMuted }}>✖</button>
            <h2 style={{ marginTop: 0, color: colors.snuNavy, paddingRight: '30px', borderBottom: `2px solid ${colors.border}`, paddingBottom: '15px' }}>{selectedLaw.title}</h2>
            <div style={{ lineHeight: '1.8', fontSize: '15px', whiteSpace: 'pre-wrap', color: colors.textMain, marginTop: '20px' }}>
              {selectedLaw.full_content || "상세 내용이 제공되지 않았습니다."}
            </div>
          </div>
        </div>
      )}

      <h1 style={{ color: colors.snuNavy, borderBottom: `3px solid ${colors.snuNavy}`, paddingBottom: '15px', fontWeight: '800', letterSpacing: '-0.5px' }}>
        ⚖️ 진화형 법률 AI 에이전트 (v3.0)
      </h1>

      <div style={{ marginBottom: '30px', display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button onClick={() => setActiveTab("create")} style={{ padding: '12px 28px', cursor: 'pointer', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', transition: 'all 0.2s', backgroundColor: activeTab === "create" ? colors.snuNavy : colors.bgLight, color: activeTab === "create" ? colors.white : colors.textMuted, boxShadow: activeTab === "create" ? '0 4px 6px -1px rgba(10, 34, 84, 0.2)' : 'none' }}>📝 사건 분석 및 서식 생성</button>
        <button onClick={() => setActiveTab("history")} style={{ padding: '12px 28px', cursor: 'pointer', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', transition: 'all 0.2s', backgroundColor: activeTab === "history" ? colors.snuNavy : colors.bgLight, color: activeTab === "history" ? colors.white : colors.textMuted, boxShadow: activeTab === "history" ? '0 4px 6px -1px rgba(10, 34, 84, 0.2)' : 'none' }}>📂 내 사건 히스토리</button>
      </div>

      {activeTab === "create" ? (
        <div style={{ display: 'flex', gap: '30px' }}>
          <div style={{ flex: '2' }}>
            
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ color: colors.snuNavyLight, fontSize: '1.25rem', marginBottom: '15px' }}>1. 상황 설명 (자유 입력)</h2>
              <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '15px' }}>사건을 편하게 적어주세요. AI가 핵심 정보를 실시간으로 캐치하여 아래 폼에 정리해 드립니다.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea 
                  value={query} 
                  onChange={handleQueryChange} 
                  placeholder="예: 2026년 3월 5일에 김철수에게 500만원을 빌려줬는데 안 갚아요..." 
                  style={{ width: '100%', height: '120px', padding: '16px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '15px', outline: 'none', resize: 'vertical' }} 
                />
                {/* [Naver Green 적용] 가장 중요한 행동 유도 버튼 */}
                <button onClick={handleAsk} disabled={isLoading} style={{ width: '100%', padding: '16px', backgroundColor: colors.naverGreen, color: colors.white, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', transition: 'background-color 0.2s' }}>
                  {isLoading ? '전략 분석 중...' : '법률 전략 요청하기 (판례 검색)'}
                </button>
              </div>

              {/* 실시간 폼 패널 */}
              <div style={{ marginTop: '30px', padding: '25px', backgroundColor: colors.bgLight, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ color: colors.snuNavyLight, marginTop: 0, marginBottom: '15px', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: '8px' }}>🤖</span> 실시간 육하원칙 정리 
                  <span style={{ fontSize: '12px', fontWeight: 'normal', color: colors.naverGreen, marginLeft: 'auto' }}>*잘못 인식된 경우 직접 수정 가능합니다.</span>
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input placeholder="내 이름 (원고)" value={manualForm.sender_name} onChange={e => setManualForm({...manualForm, sender_name: e.target.value})} style={inputStyle} />
                  <input placeholder="상대방 이름 (피고)" value={manualForm.receiver_name} onChange={e => setManualForm({...manualForm, receiver_name: e.target.value})} style={inputStyle} />
                  <input placeholder="내 주소" value={manualForm.sender_address} onChange={e => setManualForm({...manualForm, sender_address: e.target.value})} style={inputStyle} />
                  <input placeholder="상대방 주소" value={manualForm.receiver_address} onChange={e => setManualForm({...manualForm, receiver_address: e.target.value})} style={inputStyle} />
                  <input placeholder="사건 유형 (자동 인식)" value={manualForm.title} onChange={e => setManualForm({...manualForm, title: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1', borderColor: manualForm.title ? colors.naverGreen : colors.border}} />
                  <textarea placeholder="사실관계 (날짜, 금액 자동 인식)" value={manualForm.facts} onChange={e => setManualForm({...manualForm, facts: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1', height: '100px', resize: 'none', borderColor: manualForm.facts ? colors.naverGreen : colors.border}} />
                  <textarea placeholder="요구사항 및 변호사 질문 (전략 요청 시 AI가 가이드)" value={manualForm.demands} onChange={e => setManualForm({...manualForm, demands: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1', height: '80px', resize: 'none'}} />
                </div>
                
                {isAgentReplied && (
                   <button onClick={submitManualForm} style={{ width: '100%', padding: '14px', marginTop: '20px', backgroundColor: colors.snuNavy, color: colors.white, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>이 내용으로 변호사 브리핑 / 소장 생성</button>
                )}
              </div>

              {/* 챗 로그 렌더링 */}
              {chatLog.length > 0 && (
                <div style={{ marginTop: '30px', padding: '20px', backgroundColor: colors.white, border: `1px solid ${colors.border}`, borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                  <h3 style={{ color: colors.snuNavyLight, marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>에이전트 전략 피드백</h3>
                  {chatLog.filter(msg => msg.sender === 'ai').map((msg, idx) => (
                    <div key={idx} style={{ padding: '16px', backgroundColor: colors.accentBg, borderRadius: '8px', borderLeft: `4px solid ${colors.naverGreen}`, whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '14.5px', color: colors.textMain }}>
                      {msg.text}
                    </div>
                  ))}
                </div>
              )}

            </div>

            {extractedData && (
              <div style={{ backgroundColor: colors.white, border: `1px solid ${colors.border}`, padding: '30px', borderRadius: '12px', marginBottom: '40px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
                <h2 style={{ color: colors.snuNavyLight, marginTop: 0, fontSize: '1.25rem', marginBottom: '20px' }}>2. 문서 자동 발급</h2>
                <div style={{ marginBottom: '25px', display: 'flex', gap: '20px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '15px' }}><input type="radio" value="content_proof" checked={selectedDocType === "content_proof"} onChange={(e) => setSelectedDocType(e.target.value)} style={{ marginRight: '8px', accentColor: colors.naverGreen }} /> 변호사 상담용 브리핑 / 내용증명서</label>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '15px' }}><input type="radio" value="complaint" checked={selectedDocType === "complaint"} onChange={(e) => setSelectedDocType(e.target.value)} style={{ marginRight: '8px', accentColor: colors.naverGreen }} /> 민사소장</label>
                </div>
                <button onClick={handleGenerateDoc} disabled={isLoading} style={{ width: '100%', padding: '16px', backgroundColor: colors.naverGreen, color: colors.white, border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s' }}>📄 AI 문서 자동 생성</button>
              </div>
            )}

            {docResult && (
              <div>
                <h2 style={{ color: colors.snuNavyLight, fontSize: '1.25rem', marginBottom: '15px' }}>3. 완성된 법률 문서</h2>
                <div style={{ backgroundColor: colors.white, padding: '40px', border: `1px solid ${colors.border}`, borderRadius: '12px', whiteSpace: 'pre-wrap', fontFamily: "'KoPub Batang', 'Malgun Gothic', serif", lineHeight: '1.8', height: '500px', overflowY: 'auto', marginBottom: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', color: '#000' }}>{docResult}</div>

                <div style={{ backgroundColor: colors.bgLight, border: `1px solid ${colors.border}`, padding: '25px', borderRadius: '12px' }}>
                  <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: colors.snuNavy }}>🌟 방금 생성한 전략에 대한 피드백</h3>
                  {feedbackSubmitted ? (
                    <p style={{ color: colors.naverGreen, fontWeight: 'bold', margin: 0 }}>✓ 기록이 안전하게 저장되었습니다.</p>
                  ) : (
                    <div>
                      <div style={{ marginBottom: '15px', display: 'flex', gap: '8px' }}>
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button key={num} onClick={() => setRating(num)} style={{ padding: '8px 16px', backgroundColor: rating === num ? colors.naverGreen : colors.white, color: rating === num ? colors.white : colors.textMain, border: `1px solid ${rating === num ? colors.naverGreen : colors.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }}>{num}점</button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="개선 사항이나 추가 코멘트를 적어주세요..." style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={() => handleSubmitFeedback(currentCaseId, rating, comment)} style={{ padding: '0 25px', backgroundColor: colors.snuNavy, color: colors.white, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>기록 전송</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ flex: '1', minWidth: '320px' }}>
            <div style={{ backgroundColor: colors.bgLight, padding: '25px', borderRadius: '12px', border: `1px solid ${colors.border}`, height: 'fit-content', position: 'sticky', top: '20px' }}>
              <h3 style={{ marginTop: '0', color: colors.snuNavy, borderBottom: `2px solid ${colors.border}`, paddingBottom: '12px', fontSize: '1.1rem' }}>📖 관련 법령 및 판례 레퍼런스</h3>
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {relatedLaws.length === 0 ? (
                  <p style={{ fontSize: '14px', color: colors.textMuted, textAlign: 'center', padding: '20px 0' }}>{isLoading ? '검색 중입니다...' : '전략 분석을 요청하시면 관련 데이터가 표시됩니다.'}</p>
                ) : (
                  relatedLaws.map((law, idx) => (
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
                      <h4 style={{ margin: '0 0 10px 0', color: colors.snuNavyLight, fontSize: '15px', lineHeight: '1.4' }}>{law.title}</h4>
                      
                      {/* [Naver Green 적용] 유사도 % 진행바 UI */}
                      {law.similarity !== undefined && (
                        <div style={{ margin: '10px 0 15px 0', fontSize: '12px', color: colors.textMuted }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>사건 연관성</span>
                            <span style={{ fontWeight: 'bold', color: colors.naverGreen }}>{law.similarity}%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: colors.border, borderRadius: '3px' }}>
                            <div style={{ width: `${law.similarity}%`, height: '100%', backgroundColor: colors.naverGreen, borderRadius: '3px' }} />
                          </div>
                        </div>
                      )}

                      <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: colors.textMain, lineHeight: '1.6' }}>{law.content}</p>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '12px', color: colors.naverGreen, fontWeight: '700' }}>자세히 보기 →</span>
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
          <h2 style={{ color: colors.snuNavy, marginBottom: '10px' }}>📂 문서 생성 이력 및 피드백 기록</h2>
          <p style={{ color: colors.textMuted, marginBottom: '30px', fontSize: '15px' }}>나중에 사건의 승소 여부나 문서의 활용 결과를 기록하면, AI가 이를 바탕으로 학습하여 더욱 정교해집니다.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {cases.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', backgroundColor: colors.bgLight, border: `1px dashed ${colors.border}`, borderRadius: '12px', color: colors.textMuted }}>아직 생성된 문서 기록이 없습니다.</div>
            ) : (
              cases.map((c) => (
                <div key={c.id} style={{ border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '25px', backgroundColor: colors.white, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.bgLight}`, paddingBottom: '15px', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, color: colors.snuNavyLight, fontSize: '1.1rem' }}><span style={{ color: colors.naverGreen, marginRight: '8px' }}>[{c.doc_type === 'complaint' ? '소장' : '내용증명'}]</span> {c.extracted_data.title || "제목 없음"}</h3>
                    <span style={{ color: colors.textMuted, fontSize: '13px' }}>{c.timestamp}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: colors.textMain, marginBottom: '20px', lineHeight: '1.6', backgroundColor: colors.bgLight, padding: '15px', borderRadius: '8px' }}>
                    <strong style={{ color: colors.snuNavy }}>상대방:</strong> {c.extracted_data.receiver_name} <br/>
                    <strong style={{ color: colors.snuNavy }}>초기 질문:</strong> {c.query}
                  </div>
                  <div style={{ borderTop: `1px dashed ${colors.border}`, paddingTop: '20px' }}>
                    {editingFeedbackId === c.id ? (
                      <div style={{ backgroundColor: colors.accentBg, padding: '20px', borderRadius: '8px' }}>
                        <strong style={{ display: 'block', marginBottom: '15px', color: colors.snuNavy }}>피드백 업데이트</strong>
                        <div style={{ marginBottom: '15px', display: 'flex', gap: '8px' }}>
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button key={num} onClick={() => setRating(num)} style={{ padding: '6px 14px', backgroundColor: rating === num ? colors.snuNavy : colors.white, color: rating === num ? colors.white : colors.textMain, border: `1px solid ${rating === num ? colors.snuNavy : colors.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>{num}점</button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="코멘트 입력..." style={{...inputStyle, flex: 1}} />
                          <button onClick={() => handleSubmitFeedback(c.id, rating, comment)} style={{ padding: '0 20px', backgroundColor: colors.naverGreen, color: colors.white, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>저장</button>
                          <button onClick={() => setEditingFeedbackId(null)} style={{ padding: '0 20px', backgroundColor: colors.textMuted, color: colors.white, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '14px' }}>
                          <span style={{ color: colors.textMuted, marginRight: '10px' }}>AI 만족도:</span> {c.rating > 0 ? <strong style={{ color: colors.naverGreen, fontSize: '16px' }}>{c.rating}점</strong> : <span style={{ color: colors.textMuted }}>미평가</span>}
                          <span style={{ margin: '0 15px', color: colors.border }}>|</span>
                          <span style={{ color: colors.textMuted, marginRight: '10px' }}>코멘트:</span> <span style={{ color: colors.textMain }}>{c.comment || "없음"}</span>
                        </div>
                        <button onClick={() => { setEditingFeedbackId(c.id); setRating(c.rating || 5); setComment(c.comment || ""); }} style={{ padding: '8px 16px', backgroundColor: colors.white, border: `1px solid ${colors.border}`, borderRadius: '6px', cursor: 'pointer', color: colors.snuNavy, fontWeight: '600', transition: 'background-color 0.2s' }}>평가 수정</button>
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