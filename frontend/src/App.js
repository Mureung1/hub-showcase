import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css'; // recharts 임포트 완전 삭제! 절대 고장나지 않음.

function App() {
  const [activeTab, setActiveTab] = useState("create");
  const [query, setQuery] = useState("");
  const [chatLog, setChatLog] = useState([]);
  const [extractedData, setExtractedData] = useState(null);
  const [relatedLaws, setRelatedLaws] = useState([]);
  const [docResult, setDocResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedDocType, setSelectedDocType] = useState("briefing");
  const [selectedLaw, setSelectedLaw] = useState(null);
  const [typingTimeout, setTypingTimeout] = useState(null);

  const [cases, setCases] = useState([]);
  const [currentCaseId, setCurrentCaseId] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);

  const [agentStats, setAgentStats] = useState(null);
  const [votedCards, setVotedCards] = useState({});

  const [manualForm, setManualForm] = useState({
    sender_name: "", sender_address: "", sender_phone: "",
    receiver_name: "", receiver_address: "",
    title: "", facts: "", legal_basis: "전문가(AI) 상담 또는 관련 법령 참조", demands: "", deadline: ""
  });

  const fetchCasesAndStats = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/cases");
      setCases(res.data.reverse());
      
      const statsRes = await axios.get("http://127.0.0.1:8000/api/agent-stats");
      setAgentStats(statsRes.data);
    } catch (e) {
      console.error("데이터 로드 실패:", e);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchCasesAndStats();
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
              receiver_name: facts.person || prev.receiver_name,
              facts: aiFacts.trim() !== "" ? aiFacts.trim() : prev.facts
            };
          });
        } catch (err) {}
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
    setVotedCards({}); 

    try {
      const payload = { query: query, case_type: manualForm.title || "" };
      const response = await axios.post("http://127.0.0.1:8000/api/ask", payload);
      
      setChatLog([...newChat, { sender: 'ai', text: response.data.response }]);
      if (response.data.extracted_data) setExtractedData(response.data.extracted_data);
      if (response.data.related_laws) setRelatedLaws(response.data.related_laws);
    } catch (error) {
      setChatLog([...newChat, { sender: 'ai', text: "서버 에러가 발생했습니다." }]);
    }
    setIsLoading(false);
  };

  const handleGenerateDoc = async () => {
    if (!extractedData) return;
    setIsLoading(true);
    setDocResult("문서를 생성 중입니다...");
    
    try {
      const payload = { 
        ...extractedData, 
        doc_type: selectedDocType,
        related_laws: relatedLaws, 
        strategy_guide: chatLog.filter(m => m.sender === 'ai').map(m => m.text).join('\n\n')
      };
      
      const response = await axios.post("http://127.0.0.1:8000/api/generate-document", payload);
      const generatedDoc = response.data.document_content;
      setDocResult(generatedDoc);

      const casePayload = {
        query: chatLog[chatLog.length - 2]?.text || "수동 입력 데이터",
        extracted_data: extractedData,
        doc_type: selectedDocType,
        document_content: generatedDoc,
        related_laws: relatedLaws
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
        case_id: caseId, rating: ratingVal, comment: commentVal
      });
      if (activeTab === "create") {
        setFeedbackSubmitted(true);
      } else {
        setEditingFeedbackId(null);
        fetchCasesAndStats();
      }
    } catch (error) { alert("피드백 전송 실패"); }
  };

  const handleCardFeedback = async (lawTitle, isUseful, e) => {
    e.stopPropagation(); 
    try {
      await axios.post("http://127.0.0.1:8000/api/card-feedback", {
        law_title: lawTitle, is_useful: isUseful
      });
      setVotedCards(prev => ({ ...prev, [lawTitle]: true }));
    } catch (error) { console.error("피드백 전송 실패"); }
  };

  const handleDeleteCase = async (caseId) => {
    if (!window.confirm("정말로 이 기록을 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`http://127.0.0.1:8000/api/cases/${caseId}`);
      fetchCasesAndStats();
    } catch (error) { alert("삭제 실패"); }
  };

  const handleDownloadWord = (content, title) => {
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>${title}</title></head>
      <body><div style="white-space: pre-wrap; font-family: 'Malgun Gothic', serif; font-size: 11pt;">${content}</div></body>
      </html>
    `;
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title || '법률문서'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const submitManualForm = () => setExtractedData(manualForm);

  const colors = {
    snuNavy: '#0A2254', snuNavyLight: '#153A80', naverGreen: '#03C75A', 
    accentBg: '#E8F9EE', border: '#E2E8F0', textMain: '#1E293B', 
    textMuted: '#64748b', bgLight: '#F8FAFC', white: '#ffffff', danger: '#ef4444' 
  };

  const inputStyle = { 
    padding: '12px', border: `1px solid ${colors.border}`, borderRadius: '6px', 
    fontSize: '14px', width: '100%', boxSizing: 'border-box', outline: 'none', color: colors.textMain
  };

  const isAgentReplied = chatLog.length > 0 && chatLog[chatLog.length - 1].sender === 'ai';

  // 🚀 [신규] CSS 기반 스탯 데이터 매핑
  const statBars = agentStats ? [
    { subject: '정확도', val: agentStats.accuracy },
    { subject: '신속성', val: agentStats.speed },
    { subject: '판례 적합성', val: agentStats.precedent_match },
    { subject: '법령 신뢰도', val: agentStats.statute_reliability },
    { subject: '문제 해결력', val: agentStats.resolution_power },
    { subject: '진화 지수', val: agentStats.evolution_index },
  ] : [];

  return (
    <div style={{ padding: '40px 20px', fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif", maxWidth: '1200px', margin: '0 auto', color: colors.textMain }}>
      
      {selectedLaw && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedLaw(null)}>
          <div style={{ backgroundColor: colors.white, padding: '30px', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedLaw(null)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'transparent', fontSize: '24px', cursor: 'pointer', color: colors.textMuted }}>✖</button>
            <h2 style={{ marginTop: 0, color: colors.snuNavy, borderBottom: `2px solid ${colors.border}`, paddingBottom: '15px' }}>{selectedLaw.title}</h2>
            <div style={{ lineHeight: '1.8', fontSize: '15px', whiteSpace: 'pre-wrap', marginTop: '20px' }}>{selectedLaw.full_content || "상세 내용이 제공되지 않았습니다."}</div>
          </div>
        </div>
      )}

      <h1 style={{ color: colors.snuNavy, borderBottom: `3px solid ${colors.snuNavy}`, paddingBottom: '15px', fontWeight: '800' }}>
        ⚖️ 진화형 법률 AI 에이전트
      </h1>

      <div style={{ marginBottom: '30px', display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button onClick={() => setActiveTab("create")} style={{ padding: '12px 28px', cursor: 'pointer', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', backgroundColor: activeTab === "create" ? colors.snuNavy : colors.bgLight, color: activeTab === "create" ? colors.white : colors.textMuted }}>📝 사건 분석 및 서식 생성</button>
        <button onClick={() => setActiveTab("history")} style={{ padding: '12px 28px', cursor: 'pointer', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '700', backgroundColor: activeTab === "history" ? colors.snuNavy : colors.bgLight, color: activeTab === "history" ? colors.white : colors.textMuted }}>📂 내 사건 히스토리</button>
      </div>

      {activeTab === "create" ? (
        <div style={{ display: 'flex', gap: '30px' }}>
          <div style={{ flex: '2' }}>
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ color: colors.snuNavyLight, fontSize: '1.25rem', marginBottom: '15px' }}>1. 상황 설명 (자유 입력)</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <textarea value={query} onChange={handleQueryChange} placeholder="예: 2026년 3월 5일에 김철수에게 500만원을 빌려줬는데 안 갚아요..." style={{ width: '100%', height: '120px', padding: '16px', border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '15px', outline: 'none' }} />
                <button onClick={handleAsk} disabled={isLoading} style={{ width: '100%', padding: '16px', backgroundColor: colors.naverGreen, color: colors.white, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}>{isLoading ? '분석 중...' : '법률 전략 요청하기 (판례 검색)'}</button>
              </div>

              <div style={{ marginTop: '30px', padding: '25px', backgroundColor: colors.bgLight, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                <h3 style={{ color: colors.snuNavyLight, marginTop: 0, marginBottom: '15px' }}>🤖 실시간 육하원칙 정리</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input placeholder="원고" value={manualForm.sender_name} onChange={e => setManualForm({...manualForm, sender_name: e.target.value})} style={inputStyle} />
                  <input placeholder="피고" value={manualForm.receiver_name} onChange={e => setManualForm({...manualForm, receiver_name: e.target.value})} style={inputStyle} />
                  <input placeholder="사건 유형" value={manualForm.title} onChange={e => setManualForm({...manualForm, title: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1'}} />
                  <textarea placeholder="사실관계" value={manualForm.facts} onChange={e => setManualForm({...manualForm, facts: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1', height: '100px'}} />
                </div>
                {isAgentReplied && <button onClick={submitManualForm} style={{ width: '100%', padding: '14px', marginTop: '20px', backgroundColor: colors.snuNavy, color: colors.white, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>이 내용으로 문서 생성</button>}
              </div>

              {chatLog.length > 0 && (
                <div style={{ marginTop: '30px', padding: '20px', backgroundColor: colors.white, border: `1px solid ${colors.border}`, borderRadius: '12px' }}>
                  <h3 style={{ color: colors.snuNavyLight, marginTop: 0, marginBottom: '15px' }}>에이전트 전략 피드백</h3>
                  {chatLog.filter(msg => msg.sender === 'ai').map((msg, idx) => (
                    <div key={idx} style={{ padding: '16px', backgroundColor: colors.accentBg, borderRadius: '8px', borderLeft: `4px solid ${colors.naverGreen}`, whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '14.5px' }}>{msg.text}</div>
                  ))}
                </div>
              )}
            </div>

            {extractedData && (
              <div style={{ backgroundColor: colors.white, border: `1px solid ${colors.border}`, padding: '30px', borderRadius: '12px', marginBottom: '40px' }}>
                <h2 style={{ color: colors.snuNavyLight, marginTop: 0, fontSize: '1.25rem', marginBottom: '20px' }}>2. 맞춤형 문서 발급</h2>
                <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {['briefing', 'content_proof', 'complaint'].map(type => (
                    <label key={type} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '10px', backgroundColor: selectedDocType === type ? colors.bgLight : 'transparent' }}>
                      <input type="radio" value={type} checked={selectedDocType === type} onChange={(e) => setSelectedDocType(e.target.value)} style={{ marginRight: '10px' }} /> 
                      <strong>{type === 'briefing' ? '💼 변호사 상담 브리핑' : type === 'content_proof' ? '✉️ 내용증명서' : '🏛️ 민사 소장'}</strong>
                    </label>
                  ))}
                </div>
                <button onClick={handleGenerateDoc} disabled={isLoading} style={{ width: '100%', padding: '16px', backgroundColor: colors.naverGreen, color: colors.white, border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>📄 AI 문서 생성</button>
              </div>
            )}

            {docResult && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h2 style={{ color: colors.snuNavyLight, margin: 0 }}>3. 완성된 법률 문서</h2>
                  <button onClick={() => handleDownloadWord(docResult, extractedData?.title)} style={{ padding: '8px 16px', backgroundColor: colors.snuNavy, color: colors.white, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>💾 워드로 저장</button>
                </div>
                <div style={{ backgroundColor: colors.white, padding: '40px', border: `1px solid ${colors.border}`, borderRadius: '12px', whiteSpace: 'pre-wrap', height: '500px', overflowY: 'auto', marginBottom: '30px' }}>{docResult}</div>

                <div style={{ backgroundColor: colors.bgLight, border: `1px solid ${colors.border}`, padding: '25px', borderRadius: '12px' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: colors.snuNavy }}>🌟 전략 종합 피드백</h3>
                  {feedbackSubmitted ? (
                    <p style={{ color: colors.naverGreen, fontWeight: 'bold', margin: 0 }}>✓ 평가가 저장되었습니다. 에이전트 지능이 상승했습니다!</p>
                  ) : (
                    <div>
                      <div style={{ marginBottom: '15px', display: 'flex', gap: '8px' }}>
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button key={num} onClick={() => setRating(num)} style={{ padding: '8px 16px', backgroundColor: rating === num ? colors.naverGreen : colors.white, color: rating === num ? colors.white : colors.textMain, border: `1px solid ${rating === num ? colors.naverGreen : colors.border}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>{num}점</button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="개선 사항 입력..." style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={() => handleSubmitFeedback(currentCaseId, rating, comment)} style={{ padding: '0 25px', backgroundColor: colors.snuNavy, color: colors.white, border: 'none', borderRadius: '6px', cursor: 'pointer' }}>저장</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ flex: '1', minWidth: '320px' }}>
            <div style={{ backgroundColor: colors.bgLight, padding: '25px', borderRadius: '12px', border: `1px solid ${colors.border}`, position: 'sticky', top: '20px' }}>
              <h3 style={{ marginTop: '0', color: colors.snuNavy, borderBottom: `2px solid ${colors.border}`, paddingBottom: '12px' }}>📖 법령/판례 (직접 평가)</h3>
              
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {relatedLaws.length === 0 ? (
                  <p style={{ fontSize: '14px', color: colors.textMuted, textAlign: 'center' }}>데이터가 없습니다.</p>
                ) : (
                  relatedLaws.map((law, idx) => (
                    <div key={idx} onClick={() => setSelectedLaw(law)} style={{ backgroundColor: colors.white, padding: '18px', borderRadius: '8px', border: `1px solid ${colors.border}`, cursor: 'pointer' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: colors.snuNavyLight }}>{law.title}</h4>
                      <div style={{ margin: '10px 0', fontSize: '12px', color: colors.textMuted }}>
                        연관성 <strong style={{ color: colors.naverGreen }}>{law.similarity}%</strong>
                      </div>
                      <p style={{ margin: '0 0 12px 0', fontSize: '13px' }}>{law.content}</p>
                      
                      {/* 🚀 [핀셋 평가 버튼] 작동 보장 */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '15px', borderTop: `1px dashed ${colors.border}`, paddingTop: '10px' }}>
                        <button 
                          onClick={(e) => handleCardFeedback(law.title, true, e)}
                          disabled={votedCards[law.title]}
                          style={{ flex: 1, padding: '6px', fontSize: '12px', border: `1px solid ${colors.naverGreen}`, backgroundColor: votedCards[law.title] ? colors.bgLight : colors.white, color: colors.naverGreen, borderRadius: '4px', cursor: votedCards[law.title] ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                        >👍 유용해요</button>
                        <button 
                          onClick={(e) => handleCardFeedback(law.title, false, e)}
                          disabled={votedCards[law.title]}
                          style={{ flex: 1, padding: '6px', fontSize: '12px', border: `1px solid ${colors.danger}`, backgroundColor: votedCards[law.title] ? colors.bgLight : colors.white, color: colors.danger, borderRadius: '4px', cursor: votedCards[law.title] ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
                        >👎 관련없음</button>
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
          
          {/* 🚀 [신규 추가] 100% 에러 안 나는 순수 CSS 스탯 바 대시보드 */}
          {agentStats && (
            <div style={{ backgroundColor: colors.bgLight, padding: '30px', borderRadius: '12px', border: `1px solid ${colors.border}`, marginBottom: '40px' }}>
              <h2 style={{ color: colors.snuNavy, margin: '0 0 10px 0' }}>📊 AI 에이전트 인텔리전스 스탯</h2>
              <p style={{ color: colors.textMuted, fontSize: '15px', lineHeight: '1.6', marginBottom: '25px' }}>
                사용자의 평가를 바탕으로 실시간 진화하는 6대 지표입니다. 수치가 100에 가까워질수록 마스터 수준에 도달합니다.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {statBars.map((stat, idx) => (
                  <div key={idx} style={{ backgroundColor: colors.white, padding: '15px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: colors.snuNavyLight }}>{stat.subject}</span>
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: colors.naverGreen }}>{stat.val} / 100</span>
                    </div>
                    <div style={{ width: '100%', height: '10px', backgroundColor: colors.bgLight, borderRadius: '5px', overflow: 'hidden' }}>
                      <div style={{ width: `${stat.val}%`, height: '100%', backgroundColor: colors.naverGreen, borderRadius: '5px', transition: 'width 1s ease-out' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 style={{ color: colors.snuNavy, marginBottom: '20px' }}>📂 문서 생성 이력</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {cases.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', backgroundColor: colors.bgLight, borderRadius: '12px', color: colors.textMuted }}>기록이 없습니다.</div>
            ) : (
              cases.map((c) => (
                <div key={c.id} style={{ border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '25px', backgroundColor: colors.white }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${colors.bgLight}`, paddingBottom: '15px', marginBottom: '15px' }}>
                    <h3 style={{ margin: 0, color: colors.snuNavyLight, fontSize: '1.1rem' }}>
                      <span style={{ color: colors.naverGreen, marginRight: '8px' }}>[{c.doc_type}]</span> {c.extracted_data.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ color: colors.textMuted, fontSize: '13px' }}>{c.timestamp}</span>
                      <button onClick={() => handleDeleteCase(c.id)} style={{ padding: '4px 8px', fontSize: '12px', color: colors.danger }}>🗑️ 삭제</button>
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', marginBottom: '20px', backgroundColor: colors.bgLight, padding: '15px', borderRadius: '8px' }}>
                    <strong style={{ color: colors.snuNavy }}>질문:</strong> {c.query}
                  </div>
                  
                  <div style={{ borderTop: `1px dashed ${colors.border}`, paddingTop: '20px' }}>
                    {editingFeedbackId === c.id ? (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} style={{...inputStyle, flex: 1}} />
                        <button onClick={() => handleSubmitFeedback(c.id, rating, comment)}>저장</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                        <div>AI 만족도: <strong style={{ color: colors.naverGreen }}>{c.rating}점</strong> | 코멘트: {c.comment || "없음"}</div>
                        <button onClick={() => { setEditingFeedbackId(c.id); setRating(c.rating || 5); setComment(c.comment || ""); }} style={{ padding: '6px 12px', borderRadius: '4px', border: `1px solid ${colors.border}`, cursor: 'pointer' }}>평가 수정</button>
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