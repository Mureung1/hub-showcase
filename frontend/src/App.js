import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';

// Particles 라이브러리 import
import * as tsparticlesReact from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim"; 

// ==============================================================================
// API base URL 설정 (백엔드 주소에 맞게 수정하세요)
// ==============================================================================
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
// ==============================================================================

// Particles 컴포넌트 안전 추출
const Particles = tsparticlesReact.default || tsparticlesReact.Particles || tsparticlesReact;

function App() {
  // ---------------- 상태 관리 ----------------
  const [activeTab, setActiveTab] = useState("create");
  const [query, setQuery] = useState("");
  const [chatLog, setChatLog] = useState([]);
  
  const [checklist, setChecklist] = useState([]);
  const [institutions, setInstitutions] = useState([]); // 관할 기관 상태
  
  const [extractedData, setExtractedData] = useState(null);
  const [relatedLaws, setRelatedLaws] = useState([]); // 추천 법령/판례
  const [docResult, setDocResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [selectedDocType, setSelectedDocType] = useState("briefing");
  const [selectedLaw, setSelectedLaw] = useState(null); // 모달용
  const [typingTimeout, setTypingTimeout] = useState(null);

  const [cases, setCases] = useState([]);
  const [currentCaseId, setCurrentCaseId] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);

  const [agentStats, setAgentStats] = useState(null);
  const [votedCards, setVotedCards] = useState({}); // 추천 카드 투표 상태

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
    shadows: {
      card: '0 8px 30px rgba(0, 0, 0, 0.5)', 
    },
    transitions: {
      default: 'all 0.25s ease-in-out',
    }
  };

  const colors = designSystem.colors;

  // --- 밤하늘 별/별자리 효과 설정 ---
  const particlesOptions = useMemo(() => ({
    background: { color: { value: "transparent" } },
    fpsLimit: 60, 
    interactivity: {
      events: {
        onHover: { enable: true, mode: "grab" },
      },
      modes: { grab: { distance: 180, links: { opacity: 0.35 } } },
    },
    particles: {
      color: { value: "#ffffff" },
      links: { color: "#ffffff", distance: 150, enable: true, opacity: 0.15, width: 1 },
      move: { enable: true, speed: 0.15, direction: "none", random: true, straight: false, outModes: { default: "out" } },
      number: { density: { enable: true, area: 900 }, value: 160 },
      opacity: { value: { min: 0.1, max: 0.8 }, animation: { enable: true, speed: 1.5, sync: false } },
      size: { value: { min: 0.5, max: 2.5 }, animation: { enable: true, speed: 2, minimumValue: 0.5, sync: false } },
      shape: { type: "circle" },
    },
    detectRetina: true,
  }), []);

  // ---------------- 공통 스타일 ----------------
  const cardStyle = {
    backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '16px', 
    padding: '28px', boxShadow: designSystem.shadows.card, marginBottom: '30px',
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
    fontSize: '16px', transition: designSystem.transitions.default, textTransform: 'uppercase', letterSpacing: '0.5px'
  };

  const h2Style = { 
    color: colors.primary, fontSize: '1.5rem', marginBottom: '25px', fontWeight: '800', 
    marginTop: 0, borderLeft: `5px solid ${colors.primary}`, paddingLeft: '15px'
  };

  // ---------------- 로직 구현 ----------------
  const fetchCasesAndStats = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/cases`);
      setCases(res.data.reverse());
      const statsRes = await axios.get(`${API_BASE_URL}/api/agent-stats`);
      setAgentStats(statsRes.data);
    } catch (e) { console.error("데이터 로드 실패:", e); }
  };

  useEffect(() => {
    if (activeTab === "history") fetchCasesAndStats();
  }, [activeTab]);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (typingTimeout) clearTimeout(typingTimeout);
    
    setTypingTimeout(setTimeout(async () => {
      if (val.trim().length > 2) {
        try {
          const res = await axios.post(`${API_BASE_URL}/api/analyze`, { query: val });
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
    setChecklist([]); 
    setInstitutions([]); // 🚀 새 질문 시 기관 정보 초기화

    try {
      const payload = { query: query, case_type: manualForm.title || "" };
      const response = await axios.post(`${API_BASE_URL}/api/ask`, payload);
      
      setChatLog([...newChat, { sender: 'ai', text: response.data.response }]);
      if (response.data.extracted_data) setExtractedData(response.data.extracted_data);
      if (response.data.related_laws) setRelatedLaws(response.data.related_laws);
      
      if (response.data.strategy_guide_list && response.data.strategy_guide_list.length > 0) {
        setChecklist(response.data.strategy_guide_list.map(text => ({ text: text, checked: false })));
      }

      if (response.data.institutions) {
        setInstitutions(response.data.institutions);
      }
      
    } catch (error) {
      console.error(error);
      setChatLog([...newChat, { sender: 'ai', text: "서버 에러가 발생했습니다. 잠시 후 다시 시도해주세요." }]);
    }
    setIsLoading(false);
  };

  const handleToggleCheck = (index) => {
    const newList = [...checklist];
    newList[index].checked = !newList[index].checked;
    setChecklist(newList);
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
        strategy_guide: checklist.map(c => c.text).join('\n')
      };
      
      const response = await axios.post(`${API_BASE_URL}/api/generate-document`, payload);
      const generatedDoc = response.data.document_content;
      setDocResult(generatedDoc);

      const casePayload = {
        query: chatLog[chatLog.length - 2]?.text || "수동 입력 데이터",
        extracted_data: extractedData,
        doc_type: selectedDocType,
        document_content: generatedDoc,
        related_laws: relatedLaws
      };
      const caseRes = await axios.post(`${API_BASE_URL}/api/cases`, casePayload);
      setCurrentCaseId(caseRes.data.id); 
    } catch (error) {
      setDocResult("문서 생성 실패: 서버 에러");
    }
    setIsLoading(false);
  };

  const handleSubmitFeedback = async (caseId, ratingVal, commentVal) => {
    if (!caseId) return;
    try {
      await axios.post(`${API_BASE_URL}/api/feedback`, { case_id: caseId, rating: ratingVal, comment: commentVal });
      if (activeTab === "create") setFeedbackSubmitted(true);
      else { setEditingFeedbackId(null); fetchCasesAndStats(); }
    } catch (error) { alert("피드백 전송 실패"); }
  };

  const handleCardFeedback = async (lawTitle, isUseful, e) => {
    e.stopPropagation(); 
    const existingVote = votedCards[lawTitle];
    if (existingVote) {
        const wasUseful = existingVote.voteType === 'up';
        if(wasUseful === isUseful) {
            try {
                await axios.post(`${API_BASE_URL}/api/card-feedback`, { law_title: lawTitle, is_useful: isUseful, is_cancel: true });
                setVotedCards(prev => { const newVotes = { ...prev }; delete newVotes[lawTitle]; return newVotes; });
            } catch (error) { console.error("취소 실패"); }
            return;
        } else {
            alert("이미 평가하셨습니다. 취소 후 다시 평가해주세요.");
            return;
        }
    }
    try {
      await axios.post(`${API_BASE_URL}/api/card-feedback`, { law_title: lawTitle, is_useful: isUseful, is_cancel: false });
      setVotedCards(prev => ({ 
        ...prev, 
        [lawTitle]: { voteType: isUseful ? 'up' : 'down', message: isUseful ? '📈 AI가 이 법령을 더 중요하게 학습합니다!' : '📉 연관성이 낮음을 학습합니다.' } 
      }));
    } catch (error) { console.error("피드백 전송 실패"); }
  };

  const handleDeleteCase = async (caseId) => {
    if (!window.confirm("기록을 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/cases/${caseId}`);
      fetchCasesAndStats();
    } catch (error) { alert("삭제 실패"); }
  };

  const handleDownloadWord = (content, title) => {
    const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${title}</title></head><body><div style="white-space: pre-wrap; font-family: 'Malgun Gothic', serif; font-size: 11pt;">${content}</div></body></html>`;
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title || '법률문서'}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const submitManualForm = () => setExtractedData(manualForm);
  const isAgentReplied = chatLog.length > 0 && chatLog[chatLog.length - 1].sender === 'ai';

  const statBars = agentStats ? [
    { subject: '정확도', val: agentStats.accuracy }, { subject: '신속성', val: agentStats.speed },
    { subject: '판례 적합성', val: agentStats.precedent_match }, { subject: '법령 신뢰도', val: agentStats.statute_reliability },
    { subject: '문제 해결력', val: agentStats.resolution_power }, { subject: '진화 지수', val: agentStats.evolution_index },
  ] : [];

  const tabButtonStyle = (isActive) => ({
    padding: '14px 30px', cursor: 'pointer', border: 'none', borderRadius: '10px', fontSize: '16px', fontWeight: '700', 
    backgroundColor: isActive ? colors.primary : colors.bgInput, color: isActive ? colors.white : colors.textMuted, 
    transition: designSystem.transitions.default, boxShadow: isActive ? '0 4px 15px rgba(59, 130, 246, 0.4)' : 'none', 
  });

  const ratingButtonStyle = (num) => ({
    padding: '10px 20px', backgroundColor: rating === num ? colors.success : colors.bgInput, color: rating === num ? colors.white : colors.textMain, 
    border: `1px solid ${rating === num ? colors.success : colors.border}`, borderRadius: '8px', cursor: 'pointer', fontWeight: '600', 
    fontSize: '15px', transition: designSystem.transitions.default,
  });

  const voteButtonStyle = (type, isActive, isVoted) => {
    let baseColor = type === 'up' ? colors.success : colors.danger;
    let bgColor = 'transparent'; let textColor = baseColor; let borderColor = baseColor;
    if (isVoted) {
        if (isActive) { bgColor = baseColor; textColor = colors.white; } 
        else { bgColor = 'transparent'; borderColor = colors.border; textColor = colors.border; }
    }
    return { 
      flex: 1, padding: '12px', fontSize: '14px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', 
      transition: designSystem.transitions.default, backgroundColor: bgColor, color: textColor, border: `1px solid ${borderColor}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
    };
  };

  const checklistProgress = checklist.length > 0 
    ? Math.round((checklist.filter(c => c.checked).length / checklist.length) * 100) 
    : 0;

  // 🚀 [추가] 생성일 기준 7일 후 D-Day 자동 계산 헬퍼 함수
  const calculateDDay = (timestamp) => {
    const createdDate = new Date(timestamp);
    const deadlineDate = new Date(createdDate.setDate(createdDate.getDate() + 7)); // 7일 기한 설정
    const today = new Date();
    const diffTime = deadlineDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) return { text: `답변 기한 D-${diffDays}`, color: colors.danger, bg: colors.dangerSubtle };
    if (diffDays === 0) return { text: '기한 만료일 (D-Day)', color: colors.danger, bg: colors.dangerSubtle };
    return { text: '답변 기한 만료 (후속 조치 필요)', color: colors.textMuted, bg: colors.bgInput };
  };

  return (
    <div className="AppMainContainer" style={{ backgroundColor: colors.bgMain, color: colors.textMain, minHeight: '100vh', padding: '50px 20px', fontFamily: "'Pretendard', sans-serif", position: 'relative', overflowX: 'hidden' }}>
      
      {Particles && typeof particlesInit === 'function' && (
        <Particles id="tsparticles" init={particlesInit} options={particlesOptions}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />
      )}

      <div style={{ maxWidth: '1240px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        {selectedLaw && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' }} onClick={() => setSelectedLaw(null)}>
            <div style={{ ...cardStyle, maxWidth: '700px', width: '90%', maxHeight: '85vh', overflowY: 'auto', position: 'relative', margin: 0, backgroundColor: 'rgba(11, 21, 41, 0.95)', border: `1px solid ${colors.primary}` }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedLaw(null)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'transparent', fontSize: '24px', cursor: 'pointer', color: colors.textMuted }}>&times;</button>
              <h2 style={{ ...h2Style, borderLeft: 'none', paddingLeft: 0, borderBottom: `2px solid ${colors.border}`, paddingBottom: '15px' }}>{selectedLaw.title}</h2>
              <div style={{ lineHeight: '1.8', fontSize: '15px', whiteSpace: 'pre-wrap', marginTop: '20px', color: colors.textMain }}>{selectedLaw.full_content || selectedLaw.content || "상세 내용이 제공되지 않았습니다."}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', borderBottom: `2px solid ${colors.border}`, paddingBottom: '25px', marginBottom: '40px' }}>
          <span style={{ fontSize: '36px' }}>⚖️</span>
          <h1 style={{ color: colors.white, margin: 0, fontWeight: '900', fontSize: '2.2rem', letterSpacing: '-1px' }}>진화형 법률 AI 에이전트</h1>
        </div>

        <div style={{ marginBottom: '40px', display: 'flex', gap: '10px' }}>
          <button onClick={() => setActiveTab("create")} style={tabButtonStyle(activeTab === "create")}>📝 사건 분석 및 서식 생성</button>
          <button onClick={() => setActiveTab("history")} style={tabButtonStyle(activeTab === "history")}>📂 내 사건 히스토리</button>
        </div>

        {activeTab === "create" ? (
          <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
            
            <div style={{ flex: '2', minWidth: 0 }}>
              <div style={cardStyle}>
                <h2 style={h2Style}>1. 상황 설명 (자유 입력)</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <textarea value={query} onChange={handleQueryChange} placeholder="예: 2026년 3월 5일에 김철수에게 500만원을 빌려줬는데 안 갚아요... 최대한 상세히 적을수록 정확한 분석이 가능합니다." style={{ ...inputStyle, height: '150px', lineHeight: '1.6', resize: 'vertical' }} />
                  <button onClick={handleAsk} disabled={isLoading} style={{ ...mainButtonStyle, opacity: isLoading ? 0.6 : 1 }}>
                    {isLoading ? 'AI가 분석 및 검색 중...' : '⚖️ 법률 전략 및 관련 판례 요청하기'}
                  </button>
                </div>

                <div style={{ marginTop: '30px', padding: '20px', backgroundColor: colors.bgMain, borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                  <h3 style={{ color: colors.white, marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>🤖 AI 실시간 육하원칙 정리</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <input placeholder="원고 (송신인/본인)" value={manualForm.sender_name} onChange={e => setManualForm({...manualForm, sender_name: e.target.value})} style={inputStyle} />
                    <input placeholder="피고 (수신인/상대방)" value={manualForm.receiver_name} onChange={e => setManualForm({...manualForm, receiver_name: e.target.value})} style={inputStyle} />
                    <input placeholder="사건 유형 요약 (예: 대여금 반환 청구의 건)" value={manualForm.title} onChange={e => setManualForm({...manualForm, title: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1'}} />
                    <textarea placeholder="AI가 분석한 핵심 사실관계입니다. 수정이 필요하면 직접 입력하세요." value={manualForm.facts} onChange={e => setManualForm({...manualForm, facts: e.target.value})} style={{...inputStyle, gridColumn: '1 / -1', height: '100px', resize: 'none'}} />
                  </div>
                  {isAgentReplied && (
                    <button onClick={submitManualForm} style={{ ...mainButtonStyle, width: '100%', marginTop: '20px', backgroundColor: colors.primary, fontSize: '15px' }}>
                      ✅ 이 내용으로 맞춤형 법률 문서 생성하기
                    </button>
                  ) }
                </div>

                {chatLog.length > 0 && (
                  <div style={{ marginTop: '25px', padding: '20px', backgroundColor: colors.bgMain, border: `1px solid ${colors.border}`, borderRadius: '10px' }}>
                    <h3 style={{ color: colors.textMain, marginTop: 0, marginBottom: '10px', fontSize: '1rem' }}>에이전트 전략 조언</h3>
                    {chatLog.filter(msg => msg.sender === 'ai').map((msg, idx) => (
                      <div key={idx} style={{ padding: '15px', backgroundColor: colors.successSubtle, borderRadius: '8px', borderLeft: `4px solid ${colors.success}`, whiteSpace: 'pre-wrap', lineHeight: '1.7', fontSize: '14px', color: colors.textMain }}>{msg.text}</div>
                    ))}
                    
                    {checklist.length > 0 && (
                      <div style={{ marginTop: '25px', backgroundColor: colors.bgCard, padding: '20px', borderRadius: '10px', border: `1px solid ${colors.primary}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                          <h4 style={{ color: colors.white, margin: 0, fontSize: '1rem' }}>📋 지금 당장 실천할 행동 지침</h4>
                          <span style={{ color: colors.primary, fontWeight: 'bold' }}>진행률: {checklistProgress}%</span>
                        </div>
                        
                        <div style={{ width: '100%', backgroundColor: colors.bgInput, height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
                          <div style={{ width: `${checklistProgress}%`, height: '100%', backgroundColor: colors.primary, transition: 'width 0.4s ease-out' }}></div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {checklist.map((item, idx) => (
                            <label key={idx} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px', backgroundColor: item.checked ? colors.successSubtle : colors.bgInput, border: `1px solid ${item.checked ? colors.success : colors.border}`, borderRadius: '8px', transition: 'all 0.2s' }}>
                              <input 
                                type="checkbox" checked={item.checked} onChange={() => handleToggleCheck(idx)}
                                style={{ width: '20px', height: '20px', marginRight: '15px', accentColor: colors.success, cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: '15px', color: item.checked ? colors.textMuted : colors.textMain, textDecoration: item.checked ? 'line-through' : 'none' }}>
                                {item.text}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 추천 관할 기관 및 상담소 UI */}
                    {institutions && institutions.length > 0 && (
                      <div style={{ marginTop: '25px', backgroundColor: colors.bgMain, padding: '20px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                        <h4 style={{ color: colors.white, marginTop: 0, marginBottom: '15px', fontSize: '1rem' }}>📍 추천 관할 기관 및 오프라인 상담소</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                          {institutions.map((inst, idx) => (
                            <div key={idx} style={{ backgroundColor: colors.bgCard, padding: '18px', borderRadius: '10px', border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <h5 style={{ margin: '0 0 5px 0', color: colors.primary, fontSize: '15px' }}>{inst.name}</h5>
                                <p style={{ margin: '0 0 8px 0', color: colors.textMuted, fontSize: '13px' }}>{inst.type}</p>
                                <div style={{ fontSize: '14px', color: colors.textMain }}>
                                  📞 {inst.phone} <br/>
                                  {inst.search_info && <span style={{fontSize: '12px', color: colors.textMuted}}>ℹ️ 참고: {inst.search_info}</span>}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '10px' }}>
                                <a href={`tel:${inst.phone.replace(/[^0-9]/g, '')}`} style={{ padding: '8px 12px', backgroundColor: colors.successSubtle, color: colors.success, border: `1px solid ${colors.success}`, borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>전화걸기</a>
                                <a href={`https://map.naver.com/v5/search/${inst.name}`} target="_blank" rel="noreferrer" style={{ padding: '8px 12px', backgroundColor: colors.bgInput, color: colors.white, border: `1px solid ${colors.border}`, borderRadius: '6px', textDecoration: 'none', fontSize: '13px' }}>지도보기</a>
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
                  <h2 style={h2Style}>2. 생성할 문서 종류 선택</h2>
                  <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[ {id: 'briefing', name: '💼 변호사 상담용 상세 브리핑 문서'}, {id: 'content_proof', name: '✉️ 정식 내용증명서 (우체국 발송용)'}, {id: 'complaint', name: '🏛️ 민사 소장 초안 (법원 제출용)'} ].map(type => (
                      <label key={type.id} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '15px', backgroundColor: selectedDocType === type.id ? 'rgba(59, 130, 246, 0.1)' : colors.bgMain, borderRadius: '10px', border: `1px solid ${selectedDocType === type.id ? colors.primary : colors.border}` }}>
                        <input type="radio" value={type.id} checked={selectedDocType === type.id} onChange={(e) => setSelectedDocType(e.target.value)} style={{ marginRight: '15px', width: '18px', height: '18px', accentColor: colors.primary }} /> 
                        <span style={{ fontSize: '15px', color: selectedDocType === type.id ? colors.white : colors.textMain, fontWeight: selectedDocType === type.id ? '600' : '400' }}>{type.name}</span>
                      </label>
                    ))}
                  </div>
                  <button onClick={handleGenerateDoc} disabled={isLoading} style={{ ...mainButtonStyle, width: '100%', fontSize: '15px', backgroundColor: colors.primary }}>📄 AI 법률 문서 생성 시작</button>
                </div>
              )}

              {docResult && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h2 style={{ ...h2Style, marginBottom: 0 }}>3. 완성된 법률 문서 미리보기</h2>
                    <button onClick={() => handleDownloadWord(docResult, extractedData?.title)} style={{ ...mainButtonStyle, padding: '10px 20px', backgroundColor: colors.bgInput, color: colors.white, border: `1px solid ${colors.border}`, fontSize: '14px' }}>💾 Word 다운로드</button>
                  </div>
                  
                  <div className="GeneratedDocView" style={{ backgroundColor: colors.white, padding: '40px', border: `1px solid ${colors.border}`, borderRadius: '12px', whiteSpace: 'pre-wrap', maxHeight: '600px', overflowY: 'auto', marginBottom: '30px', color: '#000000', lineHeight: '2.0', fontSize: '14px', fontFamily: "'Malgun Gothic', serif" }}>{docResult}</div>

                  <div style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, padding: '25px', borderRadius: '12px' }}>
                    <h3 style={{ margin: '0 0 20px 0', color: colors.white, fontSize: '1.1rem' }}>🌟 결과물은 만족스러우신가요? (피드백)</h3>
                    {feedbackSubmitted ? (
                      <div style={{ backgroundColor: colors.successSubtle, padding: '15px', borderRadius: '8px', border: `1px solid ${colors.success}`, color: colors.success, fontWeight: 'bold', textAlign: 'center' }}>✓ 소중한 피드백이 전송되었습니다. 에이전트 진화에 반영됩니다!</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{color: colors.textMuted, fontSize: '14px'}}>만족도:</span>
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button key={num} onClick={() => setRating(num)} style={ratingButtonStyle(num)}>{num}점</button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="개선할 점이 있다면 적어주세요 (선택사항)" style={{ ...inputStyle, flex: 1 }} />
                          <button onClick={() => handleSubmitFeedback(currentCaseId, rating, comment)} style={{ ...mainButtonStyle, padding: '0 25px', backgroundColor: colors.secondary, fontSize: '14px' }}>평가 제출</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div style={{ flex: '1', minWidth: '320px', position: 'sticky', top: '20px', maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ ...cardStyle, marginBottom: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <h3 style={{ marginTop: '0', color: colors.white, fontSize: '1.1rem', borderBottom: `2px solid ${colors.border}`, paddingBottom: '15px', marginBottom: '20px' }}>📖 핵심 관련 법령/판례 (AI 추천)</h3>
                
                <div className="RelatedLawsScroll" style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {relatedLaws.length === 0 ? (
                    <div style={{ padding: '30px 15px', textAlign: 'center', backgroundColor: colors.bgMain, borderRadius: '10px', color: colors.textMuted, border: `1px dashed ${colors.border}`, fontSize: '14px', lineHeight: '1.6' }}>
                      <span style={{fontSize: '24px', display: 'block', marginBottom: '10px'}}>🔍</span> 상황 설명을 분석하면<br/>관련 법적 근거 및 판례가<br/>이곳에 추천됩니다.
                    </div>
                  ) : (
                    relatedLaws.map((law, idx) => {
                      const voteData = votedCards[law.title];
                      const isVoted = !!voteData;

                      return (
                        <div key={idx} onClick={() => setSelectedLaw(law)} style={{ backgroundColor: colors.bgMain, padding: '15px', borderRadius: '10px', border: `1px solid ${colors.border}`, cursor: 'pointer', transition: designSystem.transitions.default, position: 'relative' }}>
                          
                          {/* 🚀 [추가] 실제 피드백 덕분에 기본 검색 점수보다 가중치가 올라간 판례에만 배지 노출 */}
                          {law.similarity > law.base_sim_debug && (
                            <div style={{ position: 'absolute', top: '-10px', right: '-10px', backgroundColor: colors.danger, color: colors.white, fontSize: '11px', fontWeight: 'bold', padding: '4px 10px', borderRadius: '20px', boxShadow: '0 4px 10px rgba(239,68,68,0.4)', zIndex: 2 }}>
                                🔥 유저 피드백 진화 판례
                            </div>
                          )}

                          <h4 style={{ margin: '0 0 10px 0', color: colors.white, fontSize: '14px', lineHeight: '1.4' }}>{law.title}</h4>
                          
                          <div style={{ margin: '8px 0', fontSize: '12px', color: colors.success, backgroundColor: colors.successSubtle, padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                            AI 분석 연관성: <strong>{law.similarity}%</strong>
                          </div>
                          
                          <p style={{ margin: '0 0 15px 0', fontSize: '13px', lineHeight: '1.6', color: colors.textMuted, display: '-webkit-box', WebkitLineClamp: '5', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {law.content || "내용 요약 정보가 없습니다."}
                          </p>
                          
                          <div style={{ display: 'flex', gap: '8px', marginTop: '15px', borderTop: `1px solid ${colors.border}`, paddingTop: '10px' }}>
                            <button onClick={(e) => handleCardFeedback(law.title, true, e)} style={voteButtonStyle('up', voteData?.voteType === 'up', isVoted)}>👍 유용함</button>
                            <button onClick={(e) => handleCardFeedback(law.title, false, e)} style={voteButtonStyle('down', voteData?.voteType === 'down', isVoted)}>👎 무관함</button>
                          </div>

                          {isVoted && (
                            <div style={{ fontSize: '11px', color: voteData.voteType === 'up' ? colors.success : colors.danger, marginTop: '8px', textAlign: 'center', backgroundColor: colors.bgInput, padding: '4px', borderRadius: '4px'}}>
                                {voteData.message}
                            </div>
                          )}
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
                <h2 style={h2Style}>📊 AI 에이전트 누적 진화 스탯</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {statBars.map((stat, idx) => (
                    <div key={idx} style={{ backgroundColor: colors.bgMain, padding: '15px', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                        <span style={{color: colors.textMuted}}>{stat.subject}</span>
                        <span style={{color: colors.success, fontWeight: 'bold'}}>{stat.val} / 100</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: colors.bgInput, borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${stat.val}%`, height: '100%', backgroundColor: colors.success, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2 style={{ ...h2Style, marginBottom: '20px' }}>📂 나의 문서 생성 이력</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {cases.length === 0 ? (
                <div style={{...cardStyle, textAlign: 'center', color: colors.textMuted}}>생성된 문서 이력이 없습니다.</div>
              ) : (
                cases.map((c) => (
                  <div key={c.id} style={{ ...cardStyle, padding: '20px', marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 5px 0', color: colors.white, fontSize: '1.1rem' }}>{c.extracted_data?.title || "제목 없음"}</h3>
                        <div style={{ fontSize: '13px', color: colors.primary, marginBottom: '8px' }}>
                          종류: {c.doc_type} | 생성일: {new Date(c.timestamp).toLocaleDateString()}
                        </div>
                        {/* 🚀 [추가] D-Day 경고 자동화 배지 렌더링 */}
                        {c.doc_type !== "briefing" && (
                          <span style={{ 
                            display: 'inline-block', padding: '4px 8px', borderRadius: '4px', 
                            fontSize: '12px', fontWeight: 'bold', 
                            backgroundColor: calculateDDay(c.timestamp).bg, 
                            color: calculateDDay(c.timestamp).color,
                            border: `1px solid ${calculateDDay(c.timestamp).color}`
                          }}>
                            ⏱️ {calculateDDay(c.timestamp).text}
                          </span>
                        )}
                      </div>
                      <button onClick={() => handleDeleteCase(c.id)} style={{ padding: '5px 10px', fontSize: '12px', backgroundColor: 'transparent', color: colors.danger, border: `1px solid ${colors.danger}`, borderRadius: '6px', cursor: 'pointer' }}>삭제</button>
                    </div>
                    <div style={{ fontSize: '14px', color: colors.textMain, whiteSpace: 'pre-wrap', backgroundColor: colors.bgMain, padding: '10px', borderRadius: '8px', maxHeight: '100px', overflowY: 'auto' }}>{c.query}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        <div style={{ textAlign: 'center', color: colors.textMuted, fontSize: '13px', marginTop: '50px', padding: '30px 20px', borderTop: `1px solid ${colors.border}`, zIndex: 1, position: 'relative', wordBreak: 'keep-all' }}>
          &copy; 2026 Legal AI Agent. All rights reserved. <br/> 본 결과물은 AI 초안으로 법적 효력이 없으며 전문가의 검토가 필요합니다.
        </div>
      </div>
    </div>
  );
}

export default App;