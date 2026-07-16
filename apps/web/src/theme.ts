import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

/**
 * Decision Log 브랜드 테마.
 * neutral 테마를 확장하고 docs/DESIGN.md 4장의 브랜드 토큰 값만 오버라이드한다.
 * 컴포넌트 개별 색 하드코딩 대신 반드시 이 토큰을 거친다.
 */
export const decisionLogTheme = defineTheme({
  name: "decision-log",
  extends: neutralTheme,
  tokens: {
    // 색
    "--color-accent": "#2563EB",
    "--color-background-body": "#F6F7F9",
    "--color-background-surface": "#FFFFFF",
    "--color-background-card": "#FFFFFF",
    "--color-border": "#E5E7EB",
    "--color-text-primary": "#111827",
    "--color-text-secondary": "#6B7280",
    // 상태 배경 (passed / conflicted / rejected)
    "--color-success-muted": "#DCFCE7",
    "--color-warning-muted": "#FEF3C7",
    "--color-error-muted": "#FEE2E2",
    // Radius 스케일: 작은 버튼 8px / 카드 12px / 큰 패널 20px
    "--radius-element": "8px",
    "--radius-container": "12px",
    "--radius-page": "20px",
    // 폰트: Pretendard → system-ui 폴백
    "--font-family-body": "'Pretendard', system-ui, -apple-system, sans-serif",
    "--font-family-heading":
      "'Pretendard', system-ui, -apple-system, sans-serif",
  },
});
