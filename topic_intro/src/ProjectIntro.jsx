import React, { useState, useEffect } from 'react';

/**
 * ProjectIntro Component
 * Introducing the AI-powered CV and Resume Cover Letter Agent (Career-Up AI).
 * Built with pure React, semantic HTML5, and inline styles.
 */
export default function ProjectIntro() {
  // Window width state for responsive layout
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  // Hover states for interactive cards and button
  const [hoveredCard, setHoveredCard] = useState(null);
  const [isBtnHovered, setIsBtnHovered] = useState(false);

  // State for the interactive STAR conversion simulation
  const [isTransformed, setIsTransformed] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);

  // Monitor screen size for responsiveness
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  // Run a mini loading state for the STAR transformation click
  const handleTransformClick = () => {
    if (!isTransformed) {
      setIsTransforming(true);
      setTimeout(() => {
        setIsTransforming(false);
        setIsTransformed(true);
      }, 900); // simulated transition time
    } else {
      setIsTransformed(false);
    }
  };

  // Color Palette Definitions (Slate & Indigo Accent System)
  const colors = {
    background: '#f8f9fa',
    cardBackground: '#ffffff',
    primary: '#4f46e5', // indigo-600
    primaryLight: '#e0e7ff', // indigo-100
    primaryDark: '#4338ca', // indigo-700
    textDark: '#0f172a', // slate-900
    textMuted: '#475569', // slate-600
    textLight: '#94a3b8', // slate-400
    border: '#e2e8f0', // slate-200
    accentWarning: '#fff1f2', // soft rose background
    accentWarningBorder: '#f43f5e', // rose-500
    accentWarningText: '#9f1239', // rose-800
    starS: '#ef4444', // Situation red-orange
    starT: '#f59e0b', // Task amber
    starA: '#3b82f6', // Action blue
    starR: '#10b981', // Result emerald
  };

  // Inline Style Objects
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: colors.background,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '20px 12px' : '40px 24px',
      fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      color: colors.textDark,
      boxSizing: 'border-box',
    },
    card: {
      maxWidth: '920px',
      width: '100%',
      backgroundColor: colors.cardBackground,
      borderRadius: '24px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.03), 0 0 0 1px rgba(0,0,0,0.01)',
      padding: isMobile ? '24px 16px' : '56px 48px',
      display: 'flex',
      flexDirection: 'column',
      gap: '40px',
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
      textTransform: 'uppercase',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
    },
    title: {
      fontSize: isMobile ? '1.8rem' : '2.4rem',
      fontWeight: '800',
      color: colors.textDark,
      lineHeight: '1.25',
      letterSpacing: '-0.02em',
      margin: '0',
    },
    subtitle: {
      fontSize: isMobile ? '1.05rem' : '1.15rem',
      color: colors.textMuted,
      lineHeight: '1.6',
      maxWidth: '720px',
      margin: '0 auto',
      fontWeight: '400',
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
      backgroundColor: colors.accentWarning,
      borderLeft: `5px solid ${colors.accentWarningBorder}`,
      borderRadius: '12px',
      padding: '20px 24px',
      boxSizing: 'border-box',
    },
    problemText: {
      fontSize: '0.98rem',
      lineHeight: '1.7',
      color: colors.accentWarningText,
      margin: '0',
      fontWeight: '500',
    },
    featuresContainer: {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      gap: '20px',
      justifyContent: 'space-between',
    },
    featureCard: (id) => ({
      flex: '1',
      backgroundColor: '#ffffff',
      border: hoveredCard === id ? `1px solid ${colors.primary}` : `1px solid ${colors.border}`,
      borderRadius: '18px',
      padding: '24px',
      boxShadow: hoveredCard === id 
        ? '0 12px 20px -8px rgba(79, 70, 229, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.02)' 
        : '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)',
      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: hoveredCard === id ? 'translateY(-4px)' : 'translateY(0)',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      boxSizing: 'border-box',
    }),
    featureTitle: {
      fontSize: '1.1rem',
      fontWeight: '700',
      color: colors.textDark,
      margin: '0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    featureDesc: {
      fontSize: '0.92rem',
      lineHeight: '1.6',
      color: colors.textMuted,
      margin: '0',
    },
    // Interactive STAR simulator styling
    simulatorContainer: {
      marginTop: '12px',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    },
    simHeader: {
      fontSize: '0.8rem',
      fontWeight: '700',
      color: colors.textLight,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    simBubble: (type) => ({
      backgroundColor: type === 'memo' ? '#ffffff' : '#f1f5f9',
      border: type === 'memo' ? '1px solid #e2e8f0' : 'none',
      borderRadius: '8px',
      padding: '10px 12px',
      fontSize: '0.85rem',
      lineHeight: '1.5',
      color: colors.textDark,
      fontStyle: type === 'memo' ? 'italic' : 'normal',
    }),
    simBtn: {
      width: '100%',
      padding: '8px 12px',
      backgroundColor: isBtnHovered ? colors.primaryDark : colors.primary,
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '0.85rem',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
    },
    starList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      margin: '0',
      padding: '0',
      listStyle: 'none',
    },
    starItem: {
      fontSize: '0.82rem',
      lineHeight: '1.45',
      color: colors.textDark,
      display: 'flex',
      alignItems: 'flex-start',
      gap: '6px',
    },
    starBadge: (color) => ({
      backgroundColor: color,
      color: '#ffffff',
      padding: '1px 6px',
      borderRadius: '4px',
      fontSize: '0.7rem',
      fontWeight: '800',
      minWidth: '18px',
      textAlign: 'center',
      flexShrink: 0,
      marginTop: '2px',
    }),
    footer: {
      textAlign: 'center',
      fontSize: '0.82rem',
      color: colors.textLight,
      marginTop: '12px',
    }
  };

  return (
    <div style={styles.container}>
      <article style={styles.card}>
        {/* 1. 헤더 영역 (Header) */}
        <header style={styles.header}>
          <div style={styles.badgeContainer}>
            <div style={styles.badge}>
              <span role="img" aria-label="sparkles">✨</span> CAREER-UP AI AGENT
            </div>
          </div>
          <h1 style={styles.title}>
            Career-Up AI: 내 경험을 자산으로 만드는 CV 에이전트
          </h1>
          <p style={styles.subtitle}>
            대학생의 파편화된 경험을 구조화하고 채용 공고(JD)에 맞춰 추천하는 지능형 이력서 비서
          </p>
        </header>

        <hr style={styles.divider} />

        {/* 2. 문제 정의 영역 (Problem) */}
        <section>
          <h2 style={styles.sectionTitle}>
            <span role="img" aria-label="warning">⚠️</span> 해결하려는 도전 과제 (Problem)
          </h2>
          <div style={styles.problemBox}>
            <p style={styles.problemText}>
              많은 대학생들이 학업, 동아리, 개인 프로젝트 등 가치 있는 경험을 겪고도 이를 취업 시장에 적합한 '전문적인 역량 중심 언어'로 표현하는 데 큰 어려움을 겪습니다. 더욱이 매번 다른 기업들의 복잡한 자소서 문항과 채용 공고(JD)의 요구사항에 맞게 경험을 재구성하고, 버전별로 관리하는 일은 많은 구직자들을 주눅 들게 만드는 과정입니다.
            </p>
          </div>
        </section>

        {/* 3. 핵심 기능 영역 (Core Features) */}
        <section>
          <h2 style={styles.sectionTitle}>
            <span role="img" aria-label="star">⚡</span> 핵심 기능 (Core Features)
          </h2>
          
          <div style={styles.featuresContainer}>
            
            {/* 기능 1: 경험 자산화 (Input) */}
            <article 
              style={styles.featureCard(1)}
              onMouseEnter={() => setHoveredCard(1)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <h3 style={styles.featureTitle}>
                <span>✍️</span> 경험 자산화 (Input)
              </h3>
              <p style={styles.featureDesc}>
                정제되지 않은 일상적 개발 메모나 단순 기록을 역량 평가 기준인 **STAR 기법** 기반의 전문 문항으로 완벽히 재구조화합니다.
              </p>

              {/* STAR 기법 시뮬레이터 (마이크로 인터랙션) */}
              <div style={styles.simulatorContainer}>
                <div style={styles.simHeader}>
                  <span>STAR AI 시뮬레이터</span>
                  <span style={{ color: isTransformed ? colors.starR : colors.primary, fontWeight: '700' }}>
                    {isTransformed ? '변환 완료' : '대기 중'}
                  </span>
                </div>

                {!isTransformed ? (
                  <div style={styles.simBubble('memo')}>
                    "Technological University Dublin(TUD) 교환학생 때 파이썬으로 크롤러 짜는데 IP 차단 에러 났음. 프록시 로테이션 돌리고 타임 딜레이 줘서 우회 완료함."
                  </div>
                ) : (
                  <div style={{ ...styles.simBubble('output'), animation: 'fadeIn 0.5s ease' }}>
                    <ul style={styles.starList}>
                      <li style={styles.starItem}>
                        <span style={styles.starBadge(colors.starS)}>S</span>
                        <span>TUD 교환학생 중 대용량 파이썬 크롤링 작업 시 서버 IP 차단 문제 봉착.</span>
                      </li>
                      <li style={styles.starItem}>
                        <span style={styles.starBadge(colors.starT)}>T</span>
                        <span>IP 차단 필터를 우회하여 데이터 수집 안정성 확보 필요.</span>
                      </li>
                      <li style={styles.starItem}>
                        <span style={styles.starBadge(colors.starA)}>A</span>
                        <span>프록시 IP 로테이터 풀을 구성하고 지수 백오프 기반 딜레이 알고리즘 적용.</span>
                      </li>
                      <li style={styles.starItem}>
                        <span style={styles.starBadge(colors.starR)}>R</span>
                        <span>IP 차단율 0% 달성 및 데이터 크롤링 수집 효율 200% 개선 달성.</span>
                      </li>
                    </ul>
                  </div>
                )}

                <button 
                  style={styles.simBtn}
                  onMouseEnter={() => setIsBtnHovered(true)}
                  onMouseLeave={() => setIsBtnHovered(false)}
                  onClick={handleTransformClick}
                  disabled={isTransforming}
                >
                  {isTransforming ? (
                    <span>변환 분석 중...</span>
                  ) : isTransformed ? (
                    <span>다시 작성해보기 🔄</span>
                  ) : (
                    <span>STAR AI 변환하기 ✨</span>
                  )}
                </button>
              </div>
            </article>

            {/* 기능 2: JD 맞춤 매칭 (Process) */}
            <article 
              style={styles.featureCard(2)}
              onMouseEnter={() => setHoveredCard(2)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <h3 style={styles.featureTitle}>
                <span>🎯</span> JD 맞춤 매칭 (Process)
              </h3>
              <p style={styles.featureDesc}>
                목표 기업의 채용 공고(JD) 우대사항 및 자소서 항목을 분석하여, 내가 수집한 경험 DB 중 가장 관련성이 높은 최고의 에피소드를 지능형 가중치로 추천합니다.
              </p>
              
              <div style={{...styles.simulatorContainer, backgroundColor: '#ffffff', flex: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center'}}>
                <div style={{fontSize: '2.5rem', marginBottom: '8px'}}>⚡</div>
                <div style={{fontSize: '0.85rem', fontWeight: '700', color: colors.textDark}}>JD 적합도 추천 알고리즘</div>
                <div style={{fontSize: '0.75rem', color: colors.textLight, marginTop: '4px', textAlign: 'center'}}>
                  JD 키워드 임베딩 매칭 지원
                </div>
              </div>
            </article>

            {/* 기능 3: 맞춤형 초안 및 버전 관리 (Output) */}
            <article 
              style={styles.featureCard(3)}
              onMouseEnter={() => setHoveredCard(3)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <h3 style={styles.featureTitle}>
                <span>🗂️</span> 초안 & 버전 관리 (Output)
              </h3>
              <p style={styles.featureDesc}>
                추천된 에피소드를 기반으로 기업별 맞춤형 이력서 및 자소서 초안을 자동 빌드하며, 지원 타임라인 트래킹을 통해 버전 관리 편의성을 제공합니다.
              </p>
              
              <div style={{...styles.simulatorContainer, backgroundColor: '#ffffff', flex: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center'}}>
                <div style={{fontSize: '2.5rem', marginBottom: '8px'}}>📅</div>
                <div style={{fontSize: '0.85rem', fontWeight: '700', color: colors.textDark}}>지원 기업 타임라인</div>
                <div style={{fontSize: '0.75rem', color: colors.textLight, marginTop: '4px', textAlign: 'center'}}>
                  서류 제출 ➡️ 면접 ➡️ 최종 합격 트래킹
                </div>
              </div>
            </article>

          </div>
        </section>

        <footer style={styles.footer}>
          <p>© 2026 Career-Up AI 에이전트. All Rights Reserved.</p>
        </footer>
      </article>
    </div>
  );
}
