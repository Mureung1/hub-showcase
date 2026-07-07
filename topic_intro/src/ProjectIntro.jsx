import React, { useState, useEffect } from 'react';

/**
 * ProjectIntro Component - Scholar-Sync AI
 * An AI-driven research assistant tailored for graduate/undergraduate lab students.
 * Built with pure React, semantic HTML5, and inline styles (no Tailwind or styled-components).
 */
export default function ProjectIntro() {
  // 1. Responsive layout hook
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  // 2. Interactive States
  const [hoveredCard, setHoveredCard] = useState(null);
  const [activeBtnHover, setActiveBtnHover] = useState(false);
  const [resetBtnHover, setResetBtnHover] = useState(false);

  // Profile Configuration States
  const [selectedConfs, setSelectedConfs] = useState(['arXiv', 'IEEE', 'NeurIPS']);
  const [selectedKeywords, setSelectedKeywords] = useState([
    'Python Crawler',
    'gcloud Instance',
    'Optimization',
    'High Throughput'
  ]);
  const [newKeyword, setNewKeyword] = useState('');

  // Simulator States
  // States: 'idle' | 'searching' | 'completed'
  const [simStatus, setSimStatus] = useState('idle');
  const [searchStepText, setSearchStepText] = useState('');
  const [progress, setProgress] = useState(0);

  // Curated Papers (Simulation Output)
  const availablePapers = [
    {
      id: 'paper-1',
      title: 'Optimizing Python Crawlers on Cloud Instances',
      relevance: 98,
      venue: 'arXiv (2026)',
      status: '키워드 매칭 완료',
      summary: [
        '클라우드 VM 환경에서 파이썬 기반 분산 크롤링의 네트워크 지연 및 자원 병목 원인 규명',
        '프록시 IP 로테이션 및 비동기 소켓 세션 오버헤드 완화를 위한 다중 연결 풀 제어 기법 제안',
        'gcloud 컴퓨팅 인스턴스 환경 튜닝을 통해 타깃 API 간 데이터 수집 처리 성능 2.1배 개선 입증'
      ],
      link: 'arXiv:2604.10394v1'
    },
    {
      id: 'paper-2',
      title: 'High-Performance Data Gathering on Cloud VM Clusters',
      relevance: 89,
      venue: 'IEEE (2025)',
      status: '키워드 매칭 완료',
      summary: [
        '분산 가상 머신(VM) 클러스터 분배 과정의 대용량 로그 크롤링 부하 균등 스케줄러 구현',
        '컴퓨터 네트워크 계층 최적화를 통해 클라우드 가상 머신 간 불필요한 핸드셰이크 왕복 축소',
        '최적 전송 프로토콜 적용으로 다중 인스턴스 동시 크롤링 시 네트워크 대역폭 포화도 34% 감소'
      ],
      link: 'IEEE-Trans-2025-092'
    }
  ];

  // Selected Paper for Insight summary details (defaults to first available paper if completed)
  const [selectedPaperId, setSelectedPaperId] = useState(null);

  // Archived Library Papers (Column 3 displays these)
  const [archivedPapers, setArchivedPapers] = useState([
    {
      id: 'archived-default-1',
      title: 'Modern Paper Search Engine with Semantic Vectors',
      relevance: 92,
      venue: 'NeurIPS (2025)',
      summary: [
        '단어 매칭 한계를 넘어 의미론적 공간 임베딩을 통한 고차원 키워드 검색 엔진 설계',
        '인스턴스 최적화 모델 구조 경량화를 통한 모바일/웹 엣지 연산 인퍼런스 속도 개선',
        '기존 BM25 알고리즘 대비 문맥 유사도 14% 향상 및 학술 검색 서비스 정밀도 향상'
      ]
    }
  ]);

  // 3. Simulated Curation Run
  const startCuration = () => {
    if (simStatus !== 'idle') return;

    setSimStatus('searching');
    setProgress(10);
    setSearchStepText('학술 API 데이터베이스 요청 중...');

    // Phase 1: Search arXiv & IEEE
    setTimeout(() => {
      setProgress(40);
      setSearchStepText(`키워드 검색 수행 중...`);
    }, 700);

    // Phase 2: Compute relevance Embeddings
    setTimeout(() => {
      setProgress(75);
      setSearchStepText('클라우드 인스턴스 통신 매칭 스코어 계산 중...');
    }, 1400);

    // Phase 3: Finish
    setTimeout(() => {
      setProgress(100);
      setSearchStepText('연구 추천 논문 정렬 완료!');
    }, 2000);

    setTimeout(() => {
      setSimStatus('completed');
      setSelectedPaperId(availablePapers[0].id);
    }, 2300);
  };

  // Reset simulator
  const resetCuration = () => {
    setSimStatus('idle');
    setProgress(0);
    setSearchStepText('');
    setSelectedPaperId(null);
  };

  // Toggle conference choices
  const toggleConference = (conf) => {
    if (selectedConfs.includes(conf)) {
      if (selectedConfs.length > 1) {
        setSelectedConfs(selectedConfs.filter((c) => c !== conf));
      }
    } else {
      setSelectedConfs([...selectedConfs, conf]);
    }
  };

  // Add keyword
  const addKeyword = (e) => {
    e.preventDefault();
    if (newKeyword.trim() && !selectedKeywords.includes(newKeyword.trim())) {
      setSelectedKeywords([...selectedKeywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  // Remove keyword
  const removeKeyword = (kw) => {
    if (selectedKeywords.length > 1) {
      setSelectedKeywords(selectedKeywords.filter((k) => k !== kw));
    }
  };

  // Archive Paper
  const archivePaper = (paper) => {
    if (archivedPapers.some((p) => p.title === paper.title)) {
      alert('이미 서재에 보관된 논문입니다.');
      return;
    }
    const newArchive = {
      id: `archived-${Date.now()}`,
      title: paper.title,
      relevance: paper.relevance,
      venue: paper.venue,
      summary: paper.summary
    };
    setArchivedPapers([newArchive, ...archivedPapers]);
  };

  // Remove Archived Paper
  const removeArchivedPaper = (id) => {
    setArchivedPapers(archivedPapers.filter((p) => p.id !== id));
  };

  // 4. Color Palette - Deep Teal and Navy Blue system for an Academic feel
  const colors = {
    background: '#f8f9fa',
    cardBackground: '#ffffff',
    primary: '#0f766e', // Deep Teal
    primaryLight: '#ccfbf1', // Light Teal
    primaryDark: '#115e59', // Teal 800
    accentBlue: '#0284c7', // Sky Blue 600
    accentBlueLight: '#e0f2fe', // Sky Blue 100
    textDark: '#0f172a', // Slate 900
    textMuted: '#334155', // Slate 700
    textLight: '#64748b', // Slate 500
    border: '#e2e8f0', // Slate 200
    danger: '#ef4444',
    dangerBg: '#fef2f2',
    dangerBorder: '#fca5a5',
    dangerText: '#991b1b',
    // Score Badge colors
    scoreHigh: '#10b981', // Emerald
    scoreMed: '#f59e0b', // Amber
  };

  // 5. Static Styles Object
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: colors.background,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '16px 8px' : '40px 24px',
      fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      color: colors.textDark,
      boxSizing: 'border-box',
    },
    card: {
      maxWidth: '1200px',
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: '24px',
      boxShadow: '0 20px 25px -5px rgba(15, 118, 110, 0.04), 0 10px 10px -5px rgba(0, 0, 0, 0.02), 0 0 0 1px rgba(15, 118, 110, 0.05)',
      padding: isMobile ? '24px 16px' : '48px 40px',
      display: 'flex',
      flexDirection: 'column',
      gap: '36px',
      boxSizing: 'border-box',
    },
    header: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      textAlign: 'center',
    },
    badgeContainer: {
      display: 'flex',
      justifyContent: 'center',
    },
    badge: {
      backgroundColor: colors.primaryLight,
      color: colors.primary,
      padding: '6px 14px',
      borderRadius: '9999px',
      fontSize: '0.85rem',
      fontWeight: '700',
      letterSpacing: '0.05em',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
    },
    title: {
      fontSize: isMobile ? '1.6rem' : '2.2rem',
      fontWeight: '800',
      color: colors.textDark,
      lineHeight: '1.3',
      letterSpacing: '-0.02em',
      margin: '0',
      wordBreak: 'keep-all',
    },
    subtitle: {
      fontSize: isMobile ? '0.95rem' : '1.1rem',
      color: colors.textMuted,
      lineHeight: '1.6',
      maxWidth: '820px',
      margin: '0 auto',
      fontWeight: '400',
      wordBreak: 'keep-all',
    },
    divider: {
      height: '1px',
      backgroundColor: colors.border,
      width: '100%',
      border: 'none',
      margin: '0',
    },
    sectionTitle: {
      fontSize: '1.25rem',
      fontWeight: '700',
      color: colors.textDark,
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    problemBox: {
      backgroundColor: colors.dangerBg,
      borderLeft: `5px solid ${colors.dangerBorder}`,
      borderRadius: '12px',
      padding: '20px 24px',
      boxSizing: 'border-box',
    },
    problemText: {
      fontSize: '0.95rem',
      lineHeight: '1.75',
      color: colors.dangerText,
      margin: '0',
      fontWeight: '500',
      wordBreak: 'keep-all',
    },
    featuresContainer: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: '20px',
      justifyContent: 'space-between',
    },
    featureCard: {
      flex: '1',
      backgroundColor: '#ffffff',
      borderRadius: '18px',
      padding: '24px',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxSizing: 'border-box',
      minWidth: 0, // prevents overflow issues in flex items
    },
    featureTitle: {
      fontSize: '1.15rem',
      fontWeight: '700',
      color: colors.textDark,
      margin: '0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    featureDesc: {
      fontSize: '0.88rem',
      lineHeight: '1.5',
      color: colors.textLight,
      margin: '0',
      wordBreak: 'keep-all',
    },
    // Column 1 Specific styling
    profileBox: {
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    },
    profileLabel: {
      fontSize: '0.8rem',
      fontWeight: '700',
      color: colors.textLight,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    },
    profileValue: {
      fontSize: '0.9rem',
      fontWeight: '600',
      color: colors.textDark,
      padding: '8px 12px',
      backgroundColor: '#ffffff',
      borderRadius: '6px',
      border: '1px solid #e2e8f0',
    },
    tagGroup: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
    },
    clickableTag: {
      padding: '5px 10px',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    keywordTag: {
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: '500',
      backgroundColor: colors.accentBlueLight,
      color: colors.accentBlue,
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      border: '1px solid #bae6fd',
    },
    removeKwBtn: {
      background: 'none',
      border: 'none',
      color: colors.accentBlue,
      cursor: 'pointer',
      fontSize: '0.8rem',
      padding: '0 2px',
      fontWeight: '700',
    },
    kwInputForm: {
      display: 'flex',
      gap: '6px',
    },
    kwInput: {
      flex: 1,
      padding: '6px 10px',
      fontSize: '0.8rem',
      borderRadius: '6px',
      border: '1px solid #cbd5e1',
      outline: 'none',
    },
    kwAddBtn: {
      padding: '6px 12px',
      backgroundColor: colors.primary,
      color: '#ffffff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '0.8rem',
      fontWeight: '600',
      cursor: 'pointer',
    },
    // Column 2 Specific (Simulator)
    queryCard: {
      backgroundColor: '#f0fdfa',
      border: `1px solid ${colors.primaryLight}`,
      borderRadius: '12px',
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    queryText: {
      fontSize: '0.85rem',
      lineHeight: '1.45',
      color: colors.primaryDark,
      margin: '0',
      fontWeight: '500',
      wordBreak: 'keep-all',
    },
    simBtn: {
      width: '100%',
      padding: '10px 14px',
      border: 'none',
      borderRadius: '10px',
      fontWeight: '700',
      fontSize: '0.9rem',
      transition: 'background-color 0.2s ease, transform 0.1s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      boxShadow: '0 4px 6px -1px rgba(15, 118, 110, 0.2)',
    },
    progressContainer: {
      marginTop: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    progressBarOuter: {
      height: '8px',
      width: '100%',
      backgroundColor: '#e2e8f0',
      borderRadius: '9999px',
      overflow: 'hidden',
    },
    progressBarInner: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: '9999px',
      transition: 'width 0.3s ease',
    },
    progressText: {
      fontSize: '0.75rem',
      color: colors.textLight,
      textAlign: 'center',
      fontStyle: 'italic',
      fontWeight: '500',
    },
    paperList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      marginTop: '8px',
    },
    paperCard: {
      borderRadius: '10px',
      padding: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    },
    paperTitle: {
      fontSize: '0.85rem',
      fontWeight: '700',
      color: colors.textDark,
      margin: 0,
      lineHeight: '1.35',
    },
    paperMeta: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '0.75rem',
      color: colors.textLight,
    },
    paperBadge: {
      padding: '2px 6px',
      borderRadius: '4px',
      fontWeight: '700',
      fontSize: '0.7rem',
    },
    paperActionBtn: {
      marginTop: '4px',
      alignSelf: 'flex-end',
      padding: '4px 10px',
      fontSize: '0.75rem',
      fontWeight: '600',
      border: `1px solid ${colors.primary}`,
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    },
    // Column 3 Specific (Insights & Archive)
    summaryBox: {
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
    },
    summaryTitle: {
      fontSize: '0.85rem',
      fontWeight: '700',
      color: colors.textDark,
      borderBottom: '1px solid #cbd5e1',
      paddingBottom: '6px',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    summaryList: {
      margin: 0,
      padding: 0,
      listStyleType: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    summaryItem: {
      fontSize: '0.8rem',
      lineHeight: '1.45',
      color: colors.textMuted,
      display: 'flex',
      gap: '6px',
    },
    summaryBullet: {
      color: colors.primary,
      fontWeight: '700',
    },
    archiveTitle: {
      fontSize: '0.9rem',
      fontWeight: '700',
      color: colors.textDark,
      marginTop: '12px',
      marginBottom: '6px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    archiveScroll: {
      maxHeight: '180px',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      paddingRight: '4px',
    },
    archiveItem: {
      padding: '10px',
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '8px',
    },
    archivePaperTitle: {
      fontSize: '0.78rem',
      fontWeight: '600',
      color: colors.textDark,
      margin: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      flex: 1,
    },
    deleteArchiveBtn: {
      background: 'none',
      border: 'none',
      color: colors.danger,
      cursor: 'pointer',
      fontSize: '0.85rem',
      padding: '0 4px',
    },
    noArchiveText: {
      fontSize: '0.75rem',
      color: colors.textLight,
      textAlign: 'center',
      padding: '16px 0',
      fontStyle: 'italic',
    },
    footer: {
      textAlign: 'center',
      fontSize: '0.8rem',
      color: colors.textLight,
      marginTop: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }
  };

  const selectedPaper = availablePapers.find((p) => p.id === selectedPaperId);

  return (
    <div style={styles.container}>
      {/* Dynamic Keyframe Animations for CSS injection */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-teal {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-pulse {
          animation: pulse-teal 1.5s infinite ease-in-out;
        }
        .anim-fade-in {
          animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      <article style={styles.card}>
        {/* 1. 헤더 영역 (Header) */}
        <header style={styles.header}>
          <div style={styles.badgeContainer}>
            <div style={styles.badge}>
              <span style={{ fontSize: '1rem' }} role="img" aria-label="sparkles">✨</span> SCHOLAR-SYNC AI AGENT
            </div>
          </div>
          <h1 style={styles.title}>
            Scholar-Sync AI: 내 연구 분야에 딱 맞는 논문 큐레이션 에이전트
          </h1>
          <p style={styles.subtitle}>
            매일 쏟아지는 arXiv와 학회 논문 속에서 내 관심 키워드와 연구 주제에 맞는 핵심 논문만 분석하고 추천해 주는 지능형 연구 비서
          </p>
        </header>

        <hr style={styles.divider} />

        {/* 2. 문제 정의 영역 (Problem) */}
        <section aria-labelledby="problem-heading">
          <h2 id="problem-heading" style={styles.sectionTitle}>
            <span role="img" aria-label="warning">⚠️</span> 연구자들의 정보 과부하 문제 (Research Pain Points)
          </h2>
          <div style={styles.problemBox}>
            <p style={styles.problemText}>
              많은 대학(원)생 및 연구원들이 끊임없이 쏟아지는 신규 논문을 탐색하고 최신 트렌드를 추적하는 과정에 과도한 시간과 비용을 소모하고 있습니다. 
              수많은 영어 초록(Abstract)을 일일이 읽어보는 피로감(Cognitive Overload)이 크고, 본인의 세부 연구 도메인(예: 클라우드 파이썬 크롤링 최적화)에 
              부합하는 정밀한 키워드 기반의 매칭 논문을 적시에 탐색하지 못하면 연구 기획 및 학술 성과 도출 과정 전체가 지연되곤 합니다.
            </p>
          </div>
        </section>

        {/* 3. 핵심 기능 영역 (Core Features) */}
        <section aria-labelledby="features-heading">
          <h2 id="features-heading" style={styles.sectionTitle}>
            <span role="img" aria-label="lightning">⚡</span> 학술 워크플로우 핵심 기능 (Core Features)
          </h2>

          <div style={styles.featuresContainer}>
            
            {/* Column 1: 연구 프로필 및 키워드 설정 (Input) */}
            <article 
              style={{
                ...styles.featureCard,
                border: hoveredCard === 1 ? `1px solid ${colors.primary}` : `1px solid ${colors.border}`,
                boxShadow: hoveredCard === 1 
                  ? '0 12px 20px -8px rgba(15, 118, 110, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.02)' 
                  : '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
                transform: hoveredCard === 1 ? 'translateY(-4px)' : 'translateY(0)',
              }}
              onMouseEnter={() => setHoveredCard(1)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <h3 style={styles.featureTitle}>
                <span role="img" aria-label="target">🎯</span> 연구 프로필 & 키워드 (Input)
              </h3>
              <p style={styles.featureDesc}>
                전공 및 타깃 학술 채널을 선택하고 관심 있는 연구 키워드를 동적으로 관리하여 내 프로필을 구성합니다.
              </p>

              <div style={styles.profileBox}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={styles.profileLabel}>연구 분야 / 전공</span>
                  <div style={styles.profileValue}>인공지능 & 데이터 엔지니어링</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={styles.profileLabel}>타깃 학회 & 채널 (선택 가능)</span>
                  <div style={styles.tagGroup}>
                    {['arXiv', 'IEEE', 'NeurIPS', 'ACM', 'KDD'].map((conf) => {
                      const isSelected = selectedConfs.includes(conf);
                      return (
                        <button
                          key={conf}
                          onClick={() => toggleConference(conf)}
                          style={{
                            ...styles.clickableTag,
                            border: isSelected ? `1px solid ${colors.primary}` : '1px solid #cbd5e1',
                            backgroundColor: isSelected ? colors.primaryLight : '#ffffff',
                            color: isSelected ? colors.primaryDark : colors.textMuted,
                          }}
                          title={`${conf} 채널 토글`}
                          type="button"
                        >
                          {conf}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={styles.profileLabel}>연구 키워드 등록</span>
                  <div style={styles.tagGroup}>
                    {selectedKeywords.map((kw) => (
                      <span key={kw} style={styles.keywordTag}>
                        {kw}
                        <button
                          style={styles.removeKwBtn}
                          onClick={() => removeKeyword(kw)}
                          title="키워드 삭제"
                          type="button"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Keyword insertion form */}
                <form onSubmit={addKeyword} style={styles.kwInputForm}>
                  <input
                    type="text"
                    placeholder="새 키워드 입력..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    style={styles.kwInput}
                  />
                  <button type="submit" style={styles.kwAddBtn}>
                    추가
                  </button>
                </form>
              </div>
            </article>

            {/* Column 2: 지능형 논문 탐색 및 분석 (Process) */}
            <article 
              style={{
                ...styles.featureCard,
                border: hoveredCard === 2 ? `1px solid ${colors.primary}` : `1px solid ${colors.border}`,
                boxShadow: hoveredCard === 2 
                  ? '0 12px 20px -8px rgba(15, 118, 110, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.02)' 
                  : '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
                transform: hoveredCard === 2 ? 'translateY(-4px)' : 'translateY(0)',
              }}
              onMouseEnter={() => setHoveredCard(2)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <h3 style={styles.featureTitle}>
                <span role="img" aria-label="thunder">⚡</span> 탐색 및 분석 (Process)
              </h3>
              <p style={styles.featureDesc}>
                연구 질문(Query)을 분석하고 실시간으로 arXiv 및 학회 디비의 유사 매칭 논문들을 탐색합니다.
              </p>

              <div style={styles.queryCard}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: colors.primaryDark }}>유저 입력 연구 쿼리</span>
                <p style={styles.queryText}>
                  "TUD 연구실 프로젝트 관련 Python 기반 대규모 데이터 크롤링 및 gcloud 인스턴스 통신 최적화 기법에 대한 최근 1년 논문 찾아줘"
                </p>
              </div>

              {simStatus === 'idle' && (
                <button
                  style={{
                    ...styles.simBtn,
                    backgroundColor: activeBtnHover ? colors.primaryDark : colors.primary,
                    cursor: 'pointer',
                    transform: activeBtnHover ? 'scale(1.02)' : 'scale(1)',
                  }}
                  onMouseEnter={() => setActiveBtnHover(true)}
                  onMouseLeave={() => setActiveBtnHover(false)}
                  onClick={startCuration}
                >
                  논문 큐레이션 시작 🔍
                </button>
              )}

              {simStatus === 'searching' && (
                <div style={styles.progressContainer}>
                  <div style={styles.progressBarOuter}>
                    <div style={{ ...styles.progressBarInner, width: `${progress}%` }} />
                  </div>
                  <span style={styles.progressText} className="anim-pulse">
                    {searchStepText} ({progress}%)
                  </span>
                </div>
              )}

              {simStatus === 'completed' && (
                <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: colors.primary }}>분석 매칭 결과</span>
                    <button 
                      style={{ background: 'none', border: 'none', color: colors.textLight, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                      onClick={resetCuration}
                      onMouseEnter={() => setResetBtnHover(true)}
                      onMouseLeave={() => setResetBtnHover(false)}
                      type="button"
                    >
                      <span style={{ textDecoration: resetBtnHover ? 'underline' : 'none' }}>다시 탐색 🔄</span>
                    </button>
                  </div>

                  <div style={styles.paperList}>
                    {availablePapers.map((paper) => {
                      const isActive = selectedPaperId === paper.id;
                      const isHighRelevance = paper.relevance > 90;
                      return (
                        <div 
                          key={paper.id} 
                          style={{
                            ...styles.paperCard,
                            border: isActive ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                            backgroundColor: isActive ? '#f0fdfa' : '#ffffff',
                          }}
                          onClick={() => setSelectedPaperId(paper.id)}
                        >
                          <h4 style={styles.paperTitle}>{paper.title}</h4>
                          <div style={styles.paperMeta}>
                            <span>{paper.venue}</span>
                            <span style={{
                              ...styles.paperBadge,
                              backgroundColor: isHighRelevance ? '#ecfdf5' : '#fffbeb',
                              color: isHighRelevance ? colors.scoreHigh : colors.scoreMed,
                              border: isHighRelevance ? '1px solid #a7f3d0' : '1px solid #fde68a',
                            }}>
                              관련도 {paper.relevance}%
                            </span>
                          </div>
                          <button
                            style={{
                              ...styles.paperActionBtn,
                              backgroundColor: isActive ? colors.primary : '#ffffff',
                              color: isActive ? '#ffffff' : colors.primary
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              archivePaper(paper);
                            }}
                            type="button"
                          >
                            내 서재에 저장 🗂️
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </article>

            {/* Column 3: 데일리 인사이트 요약 (Output) */}
            <article 
              style={{
                ...styles.featureCard,
                border: hoveredCard === 3 ? `1px solid ${colors.primary}` : `1px solid ${colors.border}`,
                boxShadow: hoveredCard === 3 
                  ? '0 12px 20px -8px rgba(15, 118, 110, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.02)' 
                  : '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
                transform: hoveredCard === 3 ? 'translateY(-4px)' : 'translateY(0)',
              }}
              onMouseEnter={() => setHoveredCard(3)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <h3 style={styles.featureTitle}>
                <span role="img" aria-label="insights">🗂️</span> 데일리 인사이트 (Output)
              </h3>
              <p style={styles.featureDesc}>
                큐레이팅된 논문의 초록을 한국어 3줄 요약본으로 추출하고, 관심 있는 논문 아카이브를 제공합니다.
              </p>

              {/* Summary Insights */}
              <div style={styles.summaryBox}>
                <h4 style={styles.summaryTitle}>
                  <span>📝</span> {selectedPaper ? '선택된 논문 3줄 요약' : '논문 요약 대기 중'}
                </h4>
                {selectedPaper ? (
                  <ul style={styles.summaryList} className="anim-fade-in">
                    {selectedPaper.summary.map((line, idx) => (
                      <li key={idx} style={styles.summaryItem}>
                        <span style={styles.summaryBullet}>{idx + 1}.</span>
                        <span style={{ wordBreak: 'keep-all' }}>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ fontSize: '0.78rem', color: colors.textLight, margin: 0, fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
                    상단 시뮬레이터를 작동시키고 분석 완료된 논문을 선택해 보세요.
                  </p>
                )}
              </div>

              {/* Archived Library */}
              <div>
                <h4 style={styles.archiveTitle}>
                  <span>🏛️</span> 내 서재 보관함 ({archivedPapers.length})
                </h4>
                <div style={styles.archiveScroll}>
                  {archivedPapers.length > 0 ? (
                    archivedPapers.map((paper) => (
                      <div key={paper.id} style={styles.archiveItem} className="anim-fade-in">
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                          <h5 style={styles.archivePaperTitle} title={paper.title}>{paper.title}</h5>
                          <span style={{ fontSize: '0.65rem', color: colors.textLight }}>{paper.venue} | 매칭 {paper.relevance}%</span>
                        </div>
                        <button
                          style={styles.deleteArchiveBtn}
                          onClick={() => removeArchivedPaper(paper.id)}
                          title="서재에서 제거"
                          type="button"
                        >
                          &times;
                        </button>
                      </div>
                    ))
                  ) : (
                    <p style={styles.noArchiveText}>보관된 논문이 없습니다. 논문을 탐색하여 저장해 보세요!</p>
                  )}
                </div>
              </div>
            </article>

          </div>
        </section>

        {/* Footer */}
        <footer style={styles.footer}>
          <p>© 2026 Scholar-Sync AI 에이전트. All Rights Reserved.</p>
          <p style={{ fontSize: '0.7rem', color: colors.textLight }}>
            Academic Paper Curation Agent Platform
          </p>
        </footer>
      </article>
    </div>
  );
}
