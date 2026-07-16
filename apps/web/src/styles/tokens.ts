/**
 * 디자인 토큰 (weatherpilot-design / tokens.css 기반, Wurly 블루).
 * 색·폰트 등 반복 값을 한곳에 모아 인라인 스타일에서 재사용한다.
 * (외부 스타일링 라이브러리 금지 — 인라인 스타일/순수 객체만)
 */
export const T = {
  primary: "#4A90E2", primaryDark: "#3B7DD8",
  gradient: "linear-gradient(160deg,#62A8F5 0%,#4A90E2 100%)",
  bg: "#EEF3F8", surface: "#FFFFFF", surfaceAlt: "#F4F7FA", border: "#E4EAF1",
  ink: "#253449", sub: "#8B95A5", muted: "#B0B8C4", onBlue: "#FFFFFF",
  down: "#FF7A45", up: "#2FB37A",          // 알약·강조용 (선명)
  downText: "#E0704F", upText: "#3FA772",   // 작은 텍스트용 (가독성)
  downBg: "#FCEDE6", upBg: "#E8F7F0", warnLine: "#F3CDBB",
  shadowCard: "0 8px 24px rgba(74,144,226,.10)",
  shadowBlue: "0 10px 28px rgba(74,144,226,.28)",
  shadowSoft: "0 2px 8px rgba(37,52,73,.05)",
};

export const font = `"Poppins","Pretendard","Apple SD Gothic Neo","Malgun Gothic",-apple-system,"Segoe UI",Roboto,sans-serif`;

export const won = (n: number): string => n.toLocaleString() + "원";

export const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

// 단골 규모 (LegalPanel·발송 대상 안내용 — 실수치는 D3+에서 백엔드 동의자 수로 대체)
export const DANGOL_TOTAL = 142;
export const DANGOL_CONSENT = 98;
