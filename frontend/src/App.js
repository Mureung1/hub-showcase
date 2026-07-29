import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';

// Particles 라이브러리 import
import * as tsparticlesReact from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim"; 

// ==============================================================================
// 🌐 API URL 동적 할당 및 유저 식별자 로직
// ==============================================================================
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim() !== "") {
    return process.env.REACT_APP_API_URL;
  }
  const currentHost = window.location.hostname;
  return `http://${currentHost}:8000`;
};
const API_BASE_URL = getApiBaseUrl();

// 유저 고유 ID 생성기 (브라우저에 영구 저장되어 나만의 히스토리를 유지함)
const getUserId = () => {
  let uid = localStorage.getItem('legal_ai_uid');
  if (!uid) {
    uid = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('legal_ai_uid', uid);
  }
  return uid;
};
const USER_ID = getUserId();
// ==============================================================================

// Particles 컴포넌트 안전 추출
const Particles = tsparticlesReact.default || tsparticlesReact.Particles || tsparticlesReact;

function App() {
  // ---------------- 반응형(모바일) 감지 상태 ----------------
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ---------------- 상태 관리 ----------------
  const [activeTab, setActiveTab] = useState("create");
  const [query, setQuery] = useState("");
  const [chatLog, setChatLog] = useState([]);
  
  const [checklist, setChecklist] = useState([]);
  const [institutions, setInstitutions] = useState([]); 
  
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

  const [agentStats, setAgentStats] = useState(null);
  const [votedCards, setVotedCards] = useState({}); 

  const [manualForm, setManualForm] = useState({
    sender_name: "", sender_address: "", sender_phone: "",
    receiver_name: "", receiver_address: "",
    title: "", facts: "", legal_basis: "전문가(AI) 상담 또는 관련 법령 참조", demands: "", deadline: ""
  });

  // --- Particles 초기화 ---
  const particlesInit = useCallback(async (engine) => {
    if (typeof loadSlim === 'function') {
      await loadSlim(engine);
    }
  }, []);

  // ---------------- 디자인 시스템 ----------------
  const designSystem = {
    colors: {
      bgMain: '#050914',      
      bgCard: 'rgba(11, 21, 41, 0.8)',      
      bgInput: '#101F3A',     
      primary: '#3B82F6',     
      secondary: '#1D4ED8',   
      success: '#10B981',     
      successSubtle: 'rgba(16, 185, 129, 0.1)',
      border: '#1E3A8A',      
      textMain: '#E2EAF8',    
      textMuted: '#8A9DBA',   
      white: '#ffffff',
      danger: '#ef4444',
      dangerSubtle: 'rgba(239, 68, 68, 0.1)',
    },
    shadows: { card: '0 8px 30px rgba(0, 0, 0, 0.5)' },
    transitions: { default: 'all 0.25s ease-in-out' }
  };
  const colors = designSystem.colors;

  // --- 밤하늘 별/별자리 효과 설정 ---
  const particlesOptions = useMemo(() => ({
    background: { color: { value: "transparent" } },
    fpsLimit: 60, 
    interactivity: { events: { onHover: { enable: true, mode: "grab" } }, modes: { grab: { distance: 180, links: { opacity: 0.35 } } } },
    particles: {
      color: { value: "#ffffff" }, links: { color: "#ffffff", distance: 150, enable: true, opacity: 0.15, width: 1 },
      move: { enable: true, speed: 0.15, direction: "none", random: true, straight: false, outModes: { default: "out" } },
      number: { density: { enable: true, area: 900 }, value: 160 },
      opacity: { value: { min: 0.1, max: 0.8 }, animation: { enable: true, speed: 1.5, sync: false } },
      size: { value: { min: 0.5, max: 2.5 }, animation: { enable: true, speed: 2, minimumValue: 0.5, sync: false } },
      shape: { type: "circle" },
    },
    detectRetina: true,
  }), []);

  const cardStyle = {
    backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', 
    padding: isMobile ? '20px' : '28px', boxShadow: designSystem.shadows.card, marginBottom: '30px',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', width: '100%', boxSizing: 'border-box'
  };
  const inputStyle = { 
    padding: '14px 18px', backgroundColor: colors.bgInput, border: `1px solid ${colors.border}`, 
    borderRadius: '10px', fontSize: '15px', width: '100%', boxSizing: 'border-box', 
    outline: 'none', color: colors.textMain, transition: designSystem.transitions.default,
  };
  const mainButtonStyle = {
    padding: '16px 20px', backgroundColor: colors.success, color: colors.white, 
    border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', 
    fontSize: isMobile ? '15px' : '16px', transition: designSystem.transitions.default, textTransform: 'uppercase', letterSpacing: '0.5px'
  };
  const h2Style = { 
    color: colors.primary, fontSize: isMobile ? '1.2rem' : '1.5rem', marginBottom: '25px', fontWeight: '800', 
    marginTop: 0, borderLeft: `5px solid ${colors.primary}`, paddingLeft: '15px'
  };

  // ---------------- 로직 구현 (USER_ID 적용) ----------------
  const fetchCasesAndStats = async () => {
    try {
      // 내 ID에 해당하는 사건만 가져옴
      const res = await axios.get(`${API_BASE_URL}/api/cases`, { params: { user_id: USER_ID } });
      setCases(res.data.reverse());
      const statsRes = await axios.get(`${API_BASE_URL}/api/agent-stats`);
      setAgentStats(statsRes.data);
    } catch (e) { console.error("데이터 로드 실패:", e); }
  };

  useEffect(() => { if (activeTab === "history") fetchCasesAndStats(); }, [activeTab]);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (typingTimeout) clearTimeout(typingTimeout);
    setTypingTimeout(setTimeout(async () => {
      if (val.trim().length > 2) {
        try {
          const res = await axios.post(`${API_BASE_URL}/api/analyze`, { query: val, user_id: USER_ID });
          const facts = res.data.facts;
          setManualForm(prev => {
            let aiFacts = "";
            if (facts.when) aiFacts += `일시: ${facts.when}\n`;
            if (facts.amount) aiFacts += `관련 금액: ${facts.amount}\n`;
            return { ...prev, title: facts.case_type || prev.title, receiver_name: facts.person || prev.receiver_name, facts: aiFacts.trim() !== "" ? aiFacts.trim() : prev.facts };
          });
        } catch (err) {}
      }
    }, 800));
  };

  const handleAsk = async () => {
    if (!query.trim()) return;
    const newChat = [...chatLog, { sender: 'user', text: query }];
    setChatLog(newChat); setIsLoading(true); setExtractedData(null); setDocResult(""); setFeedbackSubmitted(false);
    setCurrentCaseId(null); setRelatedLaws([]); setVotedCards({}); setChecklist([]); setInstitutions([]); 
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ask`, { query: query, case_type: manualForm.title || "", user_id: USER_ID });
      setChatLog([...newChat, { sender: 'ai', text: response.data.response }]);
      if (response.data.extracted_data) setExtractedData(response.data.extracted_data);
      if (response.data.related_laws) setRelatedLaws(response.data.related_laws);
      if (response.data.strategy_guide_list) setChecklist(response.data.strategy_guide_list.map(text => ({ text: text, checked: false })));
      if (response.data.institutions) setInstitutions(response.data.institutions);
    } catch (error) { setChatLog([...newChat, { sender: 'ai', text: "서버 에러가 발생했습니다." }]); }
    setIsLoading(false);
  };

  const handleToggleCheck = (index) => { const newList = [...checklist]; newList[index].checked = !newList[index].checked; setChecklist(newList); };

  const handleGenerateDoc = async () => {
    if (!extractedData) return;
    setIsLoading(true); setDocResult("문서를 생성 중입니다...");
    try {
      const payload = { ...extractedData, doc_type: selectedDocType, related_laws: relatedLaws, strategy_guide: checklist.map(c => c.text).join('\n'), user_id: USER_ID };
      const response = await axios.post(`${API_BASE_URL}/api/generate-document`, payload);
      setDocResult(response.data.document_content);
      
      const caseRes = await axios.post(`${API_BASE_URL}/api/cases`, { 
        query: chatLog[chatLog.length - 2]?.text || "수동 입력", 
        extracted_data: extractedData, 
        doc_type: selectedDocType, 
        document_content: response.data.document_content, 
        related_laws: relatedLaws,
        user_id: USER_ID // 사건 저장 시 소유자 명시
      });
      setCurrentCaseId(caseRes.data.id); 
    } catch (error) { setDocResult("문서 생성 실패: 서버 에러"); }
    setIsLoading(false);
  };

  const handleSubmitFeedback = async (caseId, ratingVal, commentVal) => {
    if (!caseId) return;
    try {
      await axios.post(`${API_BASE_URL}/api/feedback`, { case_id: caseId, rating: ratingVal, comment: commentVal, user_id: USER_ID });
      if (activeTab === "create") setFeedbackSubmitted(true); else { fetchCasesAndStats(); }
    } catch (error) { alert("피드백 전송 실패"); }
  };

  const handleCardFeedback = async (lawTitle, isUseful, e) => {
    e.stopPropagation(); 
    const existingVote = votedCards[lawTitle];
    if (existingVote) {
        if((existingVote.voteType === 'up') === isUseful) {
            try {
                await axios.post(`${API_BASE_URL}/api/card-feedback`, { law_title: lawTitle, is_useful: isUseful, is_cancel: true, user_id: USER_ID });
                setVotedCards(prev => { const newVotes = { ...prev }; delete newVotes[lawTitle]; return newVotes; });
            } catch (error) {}
            return;
        } else { alert("이미 평가하셨습니다."); return; }
    }
    try {
      await axios.post(`${API_BASE_URL}/api/card-feedback`, { law_title: lawTitle, is_useful: isUseful, is_cancel: false, user_id: USER_ID });
      setVotedCards(prev => ({ ...prev, [lawTitle]: { voteType: isUseful ? 'up' : 'down', message: isUseful ? '📈 학습됨' : '📉 학습됨' } }));
    } catch (error) {}
  };

  const handleDeleteCase = async (caseId) => {
    if (!window.confirm("삭제하시겠습니까?")) return;
    try { await axios.delete(`${API_BASE_URL}/api/cases/${caseId}`, { params: { user_id: USER_ID } }); fetchCasesAndStats(); } catch (error) {}
  };

  const handleDownloadWord = (content, title) => {
    const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${title}</title></head><body><div style="white-space: pre-wrap; font-family: 'Malgun Gothic', serif; font-size: 11pt;">${content}</div></body></html>`;
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${title || '법률문서'}.doc`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const submitManualForm = () => setExtractedData(manualForm);
  const isAgentReplied = chatLog.length > 0 && chatLog[chatLog.length - 1].sender === 'ai';

  const statBars = agentStats ? [ { subject: '정확도', val: agentStats.accuracy }, { subject: '신속성', val: agentStats.speed }, { subject: '판례 적합성', val: agentStats.precedent_match }, { subject: '법령 신뢰도', val: agentStats.statute_reliability }, { subject: '문제 해결력', val: agentStats.resolution_power }, { subject: '진화 지수', val: agentStats.evolution_index } ] : [];

  const tabButtonStyle = (isActive) => ({
    padding: '14px 20px', cursor: 'pointer', border: 'none', borderRadius: '10px', fontSize: isMobile ? '14px' : '16px', fontWeight: '700', 
    backgroundColor: isActive ? colors.primary : colors.bgInput, color: isActive ? colors.white : colors.textMuted, 
    transition: designSystem.transitions.default, boxShadow: isActive ? '0 4px 15px rgba(59, 130, 246, 0.4)' : 'none',
    width: isMobile ? '100%' : 'auto', textAlign: 'center'
  });

  const ratingButtonStyle = (num) => ({
    padding: isMobile ? '8px 12px' : '10px 20px', backgroundColor: rating === num ? colors.success : colors.bgInput, color: rating === num ? colors.white : colors.textMain, 
    border: `1px solid ${rating === num ? colors.success : colors.border}`, borderRadius: '8px', cursor: 'pointer', fontWeight: '600', 
    fontSize: isMobile ? '13px' : '15px'
  });

  const voteButtonStyle = (type, isActive, isVoted) => {
    let baseColor = type === 'up' ? colors.success : colors.danger;
    let bgColor = 'transparent'; let textColor = baseColor; let borderColor = baseColor;
    if (isVoted) { if (isActive) { bgColor = baseColor; textColor = colors.white; } else { bgColor = 'transparent'; borderColor = colors.border; textColor = colors.border; } }
    return { 
      flex: 1, padding: '10px', fontSize: '13px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', 
      transition: designSystem.transitions.default, backgroundColor: bgColor, color: textColor, border: `1px solid ${borderColor}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
    };
  };

  const checklistProgress = checklist.length > 0 ? Math.round((checklist.filter(c => c.checked).length / checklist.length) * 100) : 0;
  const calculateDDay = (timestamp) => {
    const deadlineDate = new Date(new Date(timestamp).setDate(new Date(timestamp).getDate() + 7)); 
    const diffDays = Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return { text: `D-${diffDays}`, color: colors.danger, bg: colors.dangerSubtle };
    if (diffDays === 0) return { text: 'D-Day', color: colors.danger, bg: colors.dangerSubtle };
    return { text: '만료', color: colors.textMuted, bg: colors.bgInput };
  };

  return (
    <div className="AppMainContainer" style={{ backgroundColor: colors.bgMain, color: colors.textMain, minHeight: '100vh', padding: isMobile ? '20px 15px' : '50px 20px', fontFamily: "'Pretendard', sans-serif", position: 'relative', overflowX: 'hidden' }}>
      
      {Particles && typeof particlesInit === 'function' && (
        <Particles id="tsparticles" init={particlesInit} options={particlesOptions} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />
      )}

      <div style={{ maxWidth: '1240px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {/* 모달 */}
        {selectedLaw && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: isMobile ? '20px' : '0' }} onClick={() => setSelectedLaw(null)}>
            <div style={{ ...cardStyle, maxWidth: '700px', width: '100%', maxHeight: '85vh', overflowY: 'auto', position: 'relative', margin: 0, backgroundColor: 'rgba(11, 21, 41, 0.95)' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedLaw(null)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'transparent', fontSize: '24px', color: colors.textMuted }}>&times;</button>
              <h2 style={{ ...h2Style, borderBottom: `2px solid ${colors.border}`, paddingBottom: '15px' }}>{selectedLaw.title}</h2>
              <div style={{ lineHeight: '1.8', fontSize: '15px', whiteSpace: 'pre-wrap' }}>{selectedLaw.full_content || selectedLaw.content}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: `2px solid ${colors.border}`, paddingBottom: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: isMobile ? '28px' : '36px' }}>⚖️</span>
          <h1 style={{ color: colors.white, margin: 0, fontWeight: '900', fontSize: isMobile ? '1.6rem' : '2.2rem', letterSpacing: '-1px' }}>진화형 법률 AI 에이전트</h1>
        </div>

        <div style={{ marginBottom: '30px', display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row' }}>
          <button onClick={() => setActiveTab("create")} style={tabButtonStyle(activeTab === "create")}>📝 사건 분석 및 서식 생성</button>
          <button onClick={() => setActiveTab("history")} style={tabButtonStyle(activeTab === "history")}>📂 내 사건 히스토리</button>
        </div>

        {activeTab === "create" ? (
          <div style={{ display: 'flex', gap: isMobile ? '20px' : '30px', alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
            
            {/* 왼쪽: 메인 입력 및 채팅 영역 */}
            <div style={{ flex: '2', minWidth: 0, width: '100%' }}>
              <div style={cardStyle}>
                <h2 style={h2Style}>1. 상황 설명</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <textarea value={query} onChange={handleQueryChange} placeholder="최대한 상세히 적을수록 정확한 분석이 가능합니다." style={{ ...inputStyle, height: '120px', resize: 'vertical' }} />
                  <button onClick={handleAsk} disabled={isLoading} style={{ ...mainButtonStyle, opacity: isLoading ? 0.6 : 1 }}>
                    {isLoading ? 'AI가 분석 중...' : '⚖️ 전략 및 판례 요청'}
                  </button>
                </div>

                <div style={{ marginTop: '30px', padding: isMobile ? '15px' : '20px', backgroundColor: colors.bgMain, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                  <h3 style={{ color: colors.white, marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>🤖 AI 실시간 요약</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
                    <input placeholder="원고 (본인)" value={manualForm.sender_name} onChange={e => setManualForm({...manualForm, sender_name: e.target.value})} style={inputStyle} />
                    <input placeholder="피고 (상대방)" value={manualForm.receiver_name} onChange={e => setManualForm({...manualForm, receiver_name: e.target.value})} style={inputStyle} />
                    <input placeholder="사건 유형 (예: 대여금 반환)" value={manualForm.title} onChange={e => setManualForm({...manualForm, title: e.target.value})} style={{...inputStyle, gridColumn: isMobile ? 'auto' : '1 / -1'}} />
                    <textarea placeholder="핵심 사실관계 (수정 가능)" value={manualForm.facts} onChange={e => setManualForm({...manualForm, facts: e.target.value})} style={{...inputStyle, gridColumn: isMobile ? 'auto' : '1 / -1', height: '100px'}} />
                  </div>
                  {isAgentReplied && (
                    <button onClick={submitManualForm} style={{ ...mainButtonStyle, width: '100%', marginTop: '20px', backgroundColor: colors.primary }}>
                      ✅ 이 내용으로 문서 생성하기
                    </button>
                  )}
                </div>

                {chatLog.length > 0 && (
                  <div style={{ marginTop: '25px', padding: isMobile ? '15px' : '20px', backgroundColor: colors.bgMain, border: `1px solid ${colors.border}`, borderRadius: '10px' }}>
                    <h3 style={{ color: colors.textMain, marginTop: 0, marginBottom: '10px', fontSize: '1rem' }}>에이전트 조언</h3>
                    {chatLog.filter(msg => msg.sender === 'ai').map((msg, idx) => (
                      <div key={idx} style={{ padding: '15px', backgroundColor: colors.successSubtle, borderRadius: '8px', borderLeft: `4px solid ${colors.success}`, whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '14px' }}>{msg.text}</div>
                    ))}
                    
                    {checklist.length > 0 && (
                      <div style={{ marginTop: '25px', backgroundColor: colors.bgCard, padding: isMobile ? '15px' : '20px', borderRadius: '10px', border: `1px solid ${colors.primary}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <h4 style={{ color: colors.white, margin: 0, fontSize: '0.95rem' }}>📋 행동 지침</h4>
                          <span style={{ color: colors.primary, fontWeight: 'bold', fontSize: '14px' }}>{checklistProgress}%</span>
                        </div>
                        <div style={{ width: '100%', backgroundColor: colors.bgInput, height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
                          <div style={{ width: `${checklistProgress}%`, height: '100%', backgroundColor: colors.primary, transition: 'width 0.4s ease-out' }}></div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {checklist.map((item, idx) => (
                            <label key={idx} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px', backgroundColor: item.checked ? colors.successSubtle : colors.bgInput, border: `1px solid ${item.checked ? colors.success : colors.border}`, borderRadius: '8px' }}>
                              <input type="checkbox" checked={item.checked} onChange={() => handleToggleCheck(idx)} style={{ width: '18px', height: '18px', marginRight: '12px', accentColor: colors.success }} />
                              <span style={{ fontSize: '14px', color: item.checked ? colors.textMuted : colors.textMain, textDecoration: item.checked ? 'line-through' : 'none' }}>{item.text}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {institutions && institutions.length > 0 && (
                      <div style={{ marginTop: '25px', backgroundColor: colors.bgMain, padding: isMobile ? '15px' : '20px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                        <h4 style={{ color: colors.white, marginTop: 0, marginBottom: '15px', fontSize: '1rem' }}>📍 추천 관할 기관</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          {institutions.map((inst, idx) => (
                            <div key={idx} style={{ backgroundColor: colors.bgCard, padding: '15px', borderRadius: '10px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '15px' : '0' }}>
                              <div>
                                <h5 style={{ margin: '0 0 5px 0', color: colors.primary, fontSize: '15px' }}>{inst.name}</h5>
                                <p style={{ margin: '0 0 5px 0', color: colors.textMuted, fontSize: '13px' }}>{inst.type}</p>
                                <div style={{ fontSize: '13px' }}>📞 {inst.phone}</div>
                              </div>
                              <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
                                <a href={`tel:${inst.phone.replace(/[^0-9]/g, '')}`} style={{ flex: isMobile ? 1 : 'auto', textAlign: 'center', padding: '8px', backgroundColor: colors.successSubtle, color: colors.success, border: `1px solid ${colors.success}`, borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>전화걸기</a>
                                <a href={`https://map.naver.com/v5/search/${inst.name}`} target="_blank" rel="noreferrer" style={{ flex: isMobile ? 1 : 'auto', textAlign: 'center', padding: '8px', backgroundColor: colors.bgInput, color: colors.white, border: `1px solid ${colors.border}`, borderRadius: '6px', textDecoration: 'none', fontSize: '13px' }}>지도보기</a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {extractedData && (
                <div style={cardStyle}>
                  <h2 style={h2Style}>2. 문서 종류 선택</h2>
                  <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[ {id: 'briefing', name: '💼 변호사 상담 브리핑'}, {id: 'content_proof', name: '✉️ 내용증명서'}, {id: 'complaint', name: '🏛️ 소장 초안'} ].map(type => (
                      <label key={type.id} style={{ display: 'flex', alignItems: 'center', padding: '15px', backgroundColor: selectedDocType === type.id ? 'rgba(59, 130, 246, 0.1)' : colors.bgMain, borderRadius: '10px', border: `1px solid ${selectedDocType === type.id ? colors.primary : colors.border}` }}>
                        <input type="radio" value={type.id} checked={selectedDocType === type.id} onChange={(e) => setSelectedDocType(e.target.value)} style={{ marginRight: '12px', width: '16px', height: '16px', accentColor: colors.primary }} /> 
                        <span style={{ fontSize: '14px', color: selectedDocType === type.id ? colors.white : colors.textMain }}>{type.name}</span>
                      </label>
                    ))}
                  </div>
                  <button onClick={handleGenerateDoc} disabled={isLoading} style={{ ...mainButtonStyle, width: '100%', backgroundColor: colors.primary }}>📄 문서 생성 시작</button>
                </div>
              )}

              {docResult && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '15px' : '0' }}>
                    <h2 style={{ ...h2Style, marginBottom: 0 }}>3. 문서 미리보기</h2>
                    <button onClick={() => handleDownloadWord(docResult, extractedData?.title)} style={{ ...mainButtonStyle, padding: '10px 15px', backgroundColor: colors.bgInput, color: colors.white, width: isMobile ? '100%' : 'auto' }}>💾 Word 다운로드</button>
                  </div>
                  
                  <div style={{ backgroundColor: colors.white, padding: isMobile ? '20px' : '40px', borderRadius: '12px', whiteSpace: 'pre-wrap', maxHeight: '500px', overflowY: 'auto', marginBottom: '30px', color: '#000', fontSize: '13px' }}>{docResult}</div>

                  <div style={{ backgroundColor: colors.bgCard, padding: '20px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                    <h3 style={{ margin: '0 0 15px 0', color: colors.white, fontSize: '1.05rem' }}>🌟 결과물 평가</h3>
                    {feedbackSubmitted ? (
                      <div style={{ backgroundColor: colors.successSubtle, padding: '15px', borderRadius: '8px', color: colors.success, textAlign: 'center' }}>✓ 피드백이 전송되었습니다!</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                          {[1, 2, 3, 4, 5].map((num) => ( <button key={num} onClick={() => setRating(num)} style={ratingButtonStyle(num)}>{num}점</button> ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexDirection: isMobile ? 'column' : 'row' }}>
                          <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="개선할 점" style={{ ...inputStyle, flex: 1 }} />
                          <button onClick={() => handleSubmitFeedback(currentCaseId, rating, comment)} style={{ ...mainButtonStyle, backgroundColor: colors.secondary, width: isMobile ? '100%' : 'auto' }}>제출</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 오른쪽: 관련 법령 (모바일에서는 맨 아래로, 데스크탑에서는 고정) */}
            <div style={{ flex: '1', width: isMobile ? '100%' : 'auto', minWidth: isMobile ? '0' : '320px', position: isMobile ? 'static' : 'sticky', top: '20px', maxHeight: isMobile ? 'none' : 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...cardStyle, marginBottom: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <h3 style={{ marginTop: 0, color: colors.white, fontSize: '1.1rem', borderBottom: `2px solid ${colors.border}`, paddingBottom: '15px' }}>📖 핵심 판례/법령</h3>
                
                <div style={{ flex: 1, overflowY: isMobile ? 'visible' : 'auto', display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
                  {relatedLaws.length === 0 ? (
                    <div style={{ padding: '30px 15px', textAlign: 'center', backgroundColor: colors.bgMain, borderRadius: '10px', color: colors.textMuted, fontSize: '13px' }}>🔍<br/>분석이 완료되면 추천됩니다.</div>
                  ) : (
                    relatedLaws.map((law, idx) => {
                      const voteData = votedCards[law.title];
                      const isVoted = !!voteData;
                      return (
                        <div key={idx} onClick={() => setSelectedLaw(law)} style={{ backgroundColor: colors.bgMain, padding: '15px', borderRadius: '10px', border: `1px solid ${colors.border}`, position: 'relative' }}>
                          {law.similarity > law.base_sim_debug && (
                            <div style={{ position: 'absolute', top: '-10px', right: '-5px', backgroundColor: colors.danger, color: colors.white, fontSize: '10px', padding: '3px 8px', borderRadius: '20px' }}>🔥 피드백 진화</div>
                          )}
                          <h4 style={{ margin: '0 0 10px 0', color: colors.white, fontSize: '14px' }}>{law.title}</h4>
                          <div style={{ margin: '8px 0', fontSize: '12px', color: colors.success, backgroundColor: colors.successSubtle, padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>연관성: <strong>{law.similarity}%</strong></div>
                          <p style={{ margin: '0 0 15px 0', fontSize: '12px', color: colors.textMuted, display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{law.content}</p>
                          <div style={{ display: 'flex', gap: '8px', borderTop: `1px solid ${colors.border}`, paddingTop: '10px' }}>
                            <button onClick={(e) => handleCardFeedback(law.title, true, e)} style={voteButtonStyle('up', voteData?.voteType === 'up', isVoted)}>👍 유용함</button>
                            <button onClick={(e) => handleCardFeedback(law.title, false, e)} style={voteButtonStyle('down', voteData?.voteType === 'down', isVoted)}>👎 무관함</button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            {agentStats && (
              <div style={cardStyle}>
                <h2 style={h2Style}>📊 AI 누적 진화 스탯</h2>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
                  {statBars.map((stat, idx) => (
                    <div key={idx} style={{ backgroundColor: colors.bgMain, padding: '15px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                        <span style={{color: colors.textMuted}}>{stat.subject}</span>
                        <span style={{color: colors.success}}>{stat.val} / 100</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: colors.bgInput, borderRadius: '4px' }}>
                        <div style={{ width: `${stat.val}%`, height: '100%', backgroundColor: colors.success }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2 style={{ ...h2Style, marginBottom: '20px' }}>📂 나의 문서 이력</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {cases.length === 0 ? (
                <div style={{...cardStyle, textAlign: 'center', color: colors.textMuted}}>이력이 없습니다.</div>
              ) : (
                cases.map((c) => (
                  <div key={c.id} style={{ ...cardStyle, padding: isMobile ? '15px' : '20px', marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 5px 0', color: colors.white, fontSize: '1.05rem' }}>{c.extracted_data?.title || "제목 없음"}</h3>
                        <div style={{ fontSize: '12px', color: colors.primary, marginBottom: '5px' }}>{c.doc_type} | {new Date(c.timestamp).toLocaleDateString()}</div>
                        {c.doc_type !== "briefing" && (
                          <span style={{ padding: '3px 6px', borderRadius: '4px', fontSize: '11px', backgroundColor: calculateDDay(c.timestamp).bg, color: calculateDDay(c.timestamp).color, border: `1px solid ${calculateDDay(c.timestamp).color}` }}>
                            ⏱️ {calculateDDay(c.timestamp).text}
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleDeleteCase(c.id)} style={{ padding: '5px 10px', fontSize: '12px', background: 'none', color: colors.danger, border: `1px solid ${colors.danger}`, borderRadius: '6px' }}>삭제</button>
                    </div>
                    <div style={{ fontSize: '13px', backgroundColor: colors.bgMain, padding: '10px', borderRadius: '8px', maxHeight: '80px', overflowY: 'auto' }}>{c.query}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: '12px', marginTop: '40px', padding: '20px', borderTop: `1px solid ${colors.border}`, zIndex: 1, position: 'relative', wordBreak: 'keep-all' }}>
          &copy; 2026 Legal AI Agent. <br/> 본 결과물은 AI 초안으로 법적 효력이 없습니다.
        </div>
      </div>
    </div>
  );
}

export default App;