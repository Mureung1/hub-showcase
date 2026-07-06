import React, { useState } from "react";

export default function ProjectIntro() {
  const [currentMenu, setCurrentMenu] = useState("dashboard");

  // 토스/카카오 스타일의 단정하고 세련된 미니멀리즘 컬러 & 스타일 가이드
  const styles = {
    container: {
      display: "flex",
      maxWidth: "1400px",
      margin: "20px auto",
      minHeight: "850px",
      fontFamily:
        '"Pretendard", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      backgroundColor: "#f3f4f6", // 밝고 깨끗한 배경색
      color: "#1f2937",
      borderRadius: "24px",
      overflow: "hidden",
      boxShadow:
        "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)",
    },
    /* 좌측 사이드바 내비게이션 */
    sidebar: {
      width: "260px",
      backgroundColor: "#ffffff",
      padding: "32px 20px",
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid #e5e7eb",
    },
    logoArea: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "40px",
      paddingLeft: "8px",
    },
    logoIcon: {
      width: "24px",
      height: "24px",
      backgroundColor: "#ff7e36", // 당근/토스 느낌의 산뜻한 포인트 컬러
      borderRadius: "6px",
    },
    logoText: {
      fontSize: "18px",
      fontWeight: "800",
      color: "#111827",
      letterSpacing: "-0.5px",
    },
    menuList: {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      listStyle: "none",
      padding: 0,
      margin: 0,
    },
    menuItem: (isActive) => ({
      display: "flex",
      alignItems: "center",
      padding: "14px 16px",
      borderRadius: "12px",
      fontSize: "15px",
      fontWeight: isActive ? "700" : "500",
      color: isActive ? "#ff7e36" : "#4b5563",
      backgroundColor: isActive ? "#fff5ed" : "transparent",
      cursor: "pointer",
      transition: "all 0.2s ease",
      border: "none",
      textAlign: "left",
      width: "100%",
    }),
    menuIcon: {
      marginRight: "12px",
      fontSize: "16px",
    },
    /* 우측 메인 콘텐츠 영역 */
    mainContent: {
      flex: 1,
      padding: "40px",
      display: "flex",
      flexDirection: "column",
      gap: "24px",
      overflowY: "auto",
    },
    /* 상단 배너/헤더 */
    topBanner: {
      backgroundColor: "#111827", // 다크한 톤으로 세련미 강조
      padding: "36px",
      borderRadius: "20px",
      color: "#ffffff",
      position: "relative",
    },
    bannerBadge: {
      display: "inline-block",
      padding: "6px 12px",
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      borderRadius: "8px",
      fontSize: "13px",
      fontWeight: "600",
      color: "#ffd0b5",
      marginBottom: "16px",
    },
    bannerTitle: {
      fontSize: "28px",
      fontWeight: "800",
      margin: "0 0 8px 0",
      color: "#ffffff",
      letterSpacing: "-0.5px",
    },
    bannerSubtitle: {
      fontSize: "15px",
      color: "#9ca3af",
      margin: 0,
    },
    /* 대시보드 그리드 구조 */
    grid2Col: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr",
      gap: "24px",
    },
    grid3Col: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "20px",
    },
    /* 카드 컴포넌트 */
    card: {
      backgroundColor: "#ffffff",
      padding: "28px",
      borderRadius: "20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
      border: "1px solid #e5e7eb",
    },
    cardTitle: {
      fontSize: "18px",
      fontWeight: "700",
      color: "#111827",
      margin: "0 0 16px 0",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    /* 리스트 스타일 */
    painList: {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    },
    painTag: {
      padding: "12px 16px",
      backgroundColor: "#f9fafb",
      borderRadius: "12px",
      fontSize: "14px",
      borderLeft: "4px solid #ef4444", // 강조선
      lineHeight: "1.5",
    },
    valueTag: {
      padding: "12px 16px",
      backgroundColor: "#f0fdf4",
      borderRadius: "12px",
      fontSize: "14px",
      borderLeft: "4px solid #22c55e",
      lineHeight: "1.5",
    },
    /* 핵심 지표 스타일 (우측 사이드용) */
    metricBox: {
      textAlign: "center",
      padding: "24px",
      backgroundColor: "#fff7ed",
      borderRadius: "16px",
      marginBottom: "16px",
    },
    metricValue: {
      fontSize: "36px",
      fontWeight: "800",
      color: "#ff7e36",
    },
    metricLabel: {
      fontSize: "13px",
      color: "#6b7280",
      marginTop: "4px",
    },
    /* 스텝 트래커 (단계 표시) */
    trackerContainer: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: "16px",
      position: "relative",
    },
    stepNode: {
      flex: 1,
      textAlign: "center",
      position: "relative",
      padding: "0 8px",
    },
    stepCircle: (isActive) => ({
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      backgroundColor: isActive ? "#ff7e36" : "#e5e7eb",
      color: isActive ? "#ffffff" : "#9ca3af",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: "700",
      margin: "0 auto 8px auto",
      fontSize: "14px",
    }),
    stepText: {
      fontSize: "13px",
      fontWeight: "600",
      color: "#374151",
    },
    /* ERD 테이블 스타일 */
    table: {
      width: "100%",
      borderCollapse: "collapse",
      textAlign: "left",
      fontSize: "14px",
    },
    th: {
      padding: "14px 16px",
      backgroundColor: "#f9fafb",
      color: "#4b5563",
      fontWeight: "600",
      borderBottom: "1px solid #e5e7eb",
    },
    td: {
      padding: "16px",
      borderBottom: "1px solid #f3f4f6",
      color: "#374151",
      verticalAlign: "top",
    },
    typeBadge: {
      fontFamily: "monospace",
      padding: "2px 6px",
      backgroundColor: "#f1f5f9",
      borderRadius: "4px",
      color: "#64748b",
      fontSize: "12px",
    },
  };

  return (
    <div style={styles.container}>
      {/* 1. 좌측 사이드바 내비게이션 */}
      <aside style={styles.sidebar}>
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}></div>
          <span style={styles.logoText}>NoticePilot Hub</span>
        </div>
        <nav>
          <ul style={styles.menuList}>
            <li>
              <button
                style={styles.menuItem(currentMenu === "dashboard")}
                onClick={() => setCurrentMenu("dashboard")}
              >
                <span style={styles.menuIcon}>📊</span> 프로젝트 개요
              </button>
            </li>
            <li>
              <button
                style={styles.menuItem(currentMenu === "features")}
                onClick={() => setCurrentMenu("features")}
              >
                <span style={styles.menuIcon}>⚡</span> MVP 핵심 기능
              </button>
            </li>
            <li>
              <button
                style={styles.menuItem(currentMenu === "architecture")}
                onClick={() => setCurrentMenu("architecture")}
              >
                <span style={styles.menuIcon}>🗄️</span> 백엔드 & ERD 구조
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {/* 2. 우측 메인 콘텐츠 영역 */}
      <main style={styles.mainContent}>
        {/* 공통 상단 프리미엄 헤더 배너 */}
        <div style={styles.topBanner}>
          <span style={styles.bannerBadge}>4주 MVP 고밀도 개발 프로젝트</span>
          <h1 style={styles.bannerTitle}>위치 기반 자취생 공동구매 플랫폼</h1>
          <p style={styles.bannerSubtitle}>
            1인 가구의 소용량 소비 패턴과 동네 기반 분할 매커니즘의 결합
          </p>
        </div>

        {/* 메뉴 1: 프로젝트 개요 대시보드 */}
        {currentMenu === "dashboard" && (
          <div style={styles.grid2Col}>
            {/* 좌측 핵심 기획 영역 */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>
                  ❌ 기존 환경의 문제 정의 (Pain Point)
                </h3>
                <div style={styles.painList}>
                  <div style={styles.painTag}>
                    <strong>대량 구매의 딜레마:</strong> 생수, 양파, 세제 등
                    대량 구매 시 단가는 낮아지나 원룸 내{" "}
                    <strong>보관 공간 부족</strong> 및{" "}
                    <strong>소비 기한 초과</strong>로 소용량 구매를 강제당함.
                  </div>
                  <div style={styles.painTag}>
                    <strong>기존 플랫폼의 한계 구조:</strong> 당근마켓 동네생활
                    등은 정형화된 공동구매 폼(인원 모집, 정산 트래킹, 승인
                    시스템)이 없어 커뮤니티성 난개발 글에 의존함.
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <h3 style={styles.cardTitle}>
                  🎯 혁신적 해결책 (Value Proposition)
                </h3>
                <div style={styles.painList}>
                  <div style={styles.valueTag}>
                    <strong>정형화된 분할 매커니즘:</strong> 유저가 직접 물품과
                    타겟 인원을 설정하여 방을 개설하면, 시스템이 정형화된
                    모집/참여 프로세스를 가이드함.
                  </div>
                  <div style={styles.valueTag}>
                    <strong>위치(동네) 필터링 최적화:</strong> 반경 스케일을
                    기준으로 밀집 지역 내 이웃 자취생을 신속하게 매칭하여 물류
                    소분 이동 동선을 최소화함.
                  </div>
                </div>
              </div>
            </div>

            {/* 우측 핵심 타겟 및 주요 지표 영역 (토스 스타일 요약 레이아웃) */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              <div style={styles.card}>
                <div style={styles.metricBox}>
                  <div style={styles.metricValue}>1인 가구</div>
                  <div style={styles.metricLabel}>
                    대학생 및 원룸 밀집 지역 타겟
                  </div>
                </div>
                <h4
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "15px",
                    fontWeight: "700",
                  }}
                >
                  타겟 유저 프로파일
                </h4>
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    color: "#6b7280",
                    lineHeight: "1.6",
                  }}
                >
                  학교 근처 거주하며 고물가 시대에 식자재 및 생필품 지출을
                  극적으로 절감하고자 하는 스마트 컨슈머 자취생층에 집중합니다.
                </p>
              </div>

              <div style={styles.card}>
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "15px",
                    fontWeight: "700",
                  }}
                >
                  💡 기대 이펙트
                </h4>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "20px",
                    fontSize: "13px",
                    color: "#4b5563",
                    lineHeight: "1.8",
                  }}
                >
                  <li>단가 기준 최대 40% 지출 절감</li>
                  <li>소분 매칭을 통한 공간 효율 증대</li>
                  <li>이웃 간 신뢰 기반 친환경 소비</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 메뉴 2: MVP 핵심 기능 명세 */}
        {currentMenu === "features" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            {/* 상단 3열 기능 카드 */}
            <div style={styles.grid3Col}>
              <div style={styles.card}>
                <h3
                  style={{
                    ...styles.cardTitle,
                    color: "#ff7e36",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  👑 방장
                  <br />
                  (개설 프로세스)
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#4b5563",
                    lineHeight: "1.6",
                    margin: 0,
                  }}
                >
                  • 물품명, 공유 링크, 총 가격, 모집 인원, 인당 정산액 기입
                  <br />• 소분 및 대면 픽업을 진행할{" "}
                  <strong>지도 기반 위치 핀 지정</strong>
                  <br />• 신청 유저 목록의 실시간 프로필 확인 후 승인/거절 제어
                </p>
              </div>
              <div style={styles.card}>
                <h3
                  style={{
                    ...styles.cardTitle,
                    color: "#2563eb",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  🏃‍♂️ 참여자
                  <br />
                  (탐색 및 매칭)
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#4b5563",
                    lineHeight: "1.6",
                    margin: 0,
                  }}
                >
                  • 인증된 사용자 거주 동네 기준 실시간 피드 라우팅
                  <br />
                  • 카테고리 필터(식자재, 생필품) 및 마감 임박 정렬 기능
                  <br />• 원클릭 '참여 신청' 및 목표 도달 시 자동 모집 완료
                  트리거
                </p>
              </div>
              <div style={styles.card}>
                <h3
                  style={{
                    ...styles.cardTitle,
                    color: "#10b981",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  💳 MVP 라이트 정산
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#4b5563",
                    lineHeight: "1.6",
                    margin: 0,
                  }}
                >
                  • 무거운 pg 결제 연동을 배제한 직관적 정산 가이드
                  <br />
                  • 매칭 완료 시 방장 계좌 정보 유연한 노출 인가
                  <br />• 소분 약속 장소 및 시간 대시보드 내 고정 스펙 제공
                </p>
              </div>
            </div>

            {/* 하단: 실시간 진행 스텝 트래커 시각화 */}
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>
                🔄 핵심 흐름: 실시간 공구 상태 트래커 (Status Tracking)
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  marginBottom: "24px",
                }}
              >
                개발 범위 간소화 및 상태 관리를 위한 5단계 뼈대 비즈니스
                로직입니다.
              </p>
              <div style={styles.trackerContainer}>
                {[
                  { id: "1", title: "모집 중", desc: "이웃 유저 신청 수렴" },
                  { id: "2", title: "모집 완료", desc: "목표 인원 충족 완료" },
                  {
                    id: "3",
                    title: "구매 및 배송",
                    desc: "방장 대량 주문/수령",
                  },
                  {
                    id: "4",
                    title: "픽업 대기",
                    desc: "지정 핀에서 소분 분할",
                  },
                  { id: "5", title: "공구 종료", desc: "정산 및 상호 피드백" },
                ].map((step, idx) => (
                  <div key={idx} style={styles.stepNode}>
                    <div style={styles.stepCircle(idx === 0 || idx === 1)}>
                      {step.id}
                    </div>
                    <div style={styles.stepText}>{step.title}</div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#9ca3af",
                        marginTop: "2px",
                      }}
                    >
                      {step.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 메뉴 3: 아키텍처 & ERD 구조 */}
        {currentMenu === "architecture" && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              🗄️ Spring Boot & JPA 엔티티 릴레이션 매핑 스펙
            </h3>
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                marginBottom: "20px",
              }}
            >
              JPA 연관 관계 효율성을 극대화하기 위해 다대다(N:M) 구조를
              일대다(1:N), 다대일(N:1)로 풀어낸 코어 ERD 설계 테이블
              리스트입니다.
            </p>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: "20%" }}>엔티티 (Table)</th>
                  <th style={{ ...styles.th, width: "45%" }}>
                    필드 스펙 (Columns / Mapping)
                  </th>
                  <th style={{ ...styles.th, width: "35%" }}>
                    관계 및 인덱스 설명
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.td}>
                    <strong>User</strong>
                  </td>
                  <td style={styles.td}>
                    id <span style={styles.typeBadge}>Long / PK</span>
                    <br />
                    email <span style={styles.typeBadge}>String</span>
                    <br />
                    nickname <span style={styles.typeBadge}>String</span>
                    <br />
                    neighborhood_id <span style={styles.typeBadge}>String</span>
                  </td>
                  <td style={styles.td}>
                    사용자 기본 정보 테이블. 거주 동네 식별값은 위치 기반 필터링
                    쿼리의 기준 인덱스로 활용됨.
                  </td>
                </tr>
                <tr>
                  <td style={styles.td}>
                    <strong>GroupPurchase</strong>
                  </td>
                  <td style={styles.td}>
                    id <span style={styles.typeBadge}>Long / PK</span>
                    <br />
                    title, content <span style={styles.typeBadge}>String</span>
                    <br />
                    total_price, target_user_count{" "}
                    <span style={styles.typeBadge}>int</span>
                    <br />
                    latitude, longitude{" "}
                    <span style={styles.typeBadge}>Double (위경도)</span>
                    <br />
                    status <span style={styles.typeBadge}>Enum (Status)</span>
                    <br />
                    <strong>host_id</strong>{" "}
                    <span style={styles.typeBadge}>ManyToOne (User)</span>
                  </td>
                  <td style={styles.td}>
                    공동구매 게시글 및 모집 데이터 코어 엔티티. 특정
                    유저(방장)와{" "}
                    <code style={{ color: "#ff7e36" }}>@ManyToOne</code> 맵핑
                    단방향 바인딩.
                  </td>
                </tr>
                <tr>
                  <td style={styles.td}>
                    <strong>UserGroupPurchase</strong>
                  </td>
                  <td style={styles.td}>
                    id <span style={styles.typeBadge}>Long / PK</span>
                    <br />
                    <strong>user_id</strong>{" "}
                    <span style={styles.typeBadge}>ManyToOne (User)</span>
                    <br />
                    <strong>group_purchase_id</strong>{" "}
                    <span style={styles.typeBadge}>
                      ManyToOne (GroupPurchase)
                    </span>
                  </td>
                  <td style={styles.td}>
                    참여 관계 매핑 교차 테이블. 유저의 참여 목록 조회 및 특정
                    공구방의 실시간 참여 인원 집계 카운트 최적화용 테이블 구조.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
