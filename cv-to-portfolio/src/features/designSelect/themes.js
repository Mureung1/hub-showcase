// ============================================================
//  디자인 테마 레지스트리
//  각 테마 = 사람이 읽는 DESIGN.md(문서) + 생성기가 쓰는 tokens(값).
//  DESIGN.md 원문은 Vite의 ?raw 임포트로 그대로 불러온다.
// ============================================================
import minimalMd from "../../../designs/minimal-clean.md?raw";
import terminalMd from "../../../designs/terminal-dark.md?raw";
import creativeMd from "../../../designs/creative-gradient.md?raw";
import editorialMd from "../../../designs/editorial-serif.md?raw";
import proMd from "../../../designs/pro-sidebar.md?raw";

export const THEMES = [
  {
    slug: "minimal-clean",
    name: "Minimal Clean",
    vibe: "여백으로 말하는 단정한 미니멀 이력서",
    audience: "채용담당자에게 빠르게 읽히는 이력서가 필요한 사람 — 개발자·디자이너·기획자 모두",
    isDefault: true,
    markdown: minimalMd,
    tokens: {
      bg: "#FFFFFF",
      surface: "#F7F8FA",
      text: "#1A1D23",
      textMuted: "#5B616E",
      accent: "#2B5CE6",
      accent2: "#0E7C6B",
      border: "#E4E7EC",
      radius: "10px",
      fontHeading:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
      fontBody:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
      googleFontHref:
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      layout: "single-column",
      headerStyle: "centered",
    },
  },
  {
    slug: "terminal-dark",
    name: "Terminal Dark",
    vibe: "모노스페이스와 네온 초록으로 짜인 개발자의 콘솔",
    audience: "백엔드/프론트엔드/DevOps 개발자, 오픈소스 기여자, CLI를 사랑하는 기술직",
    markdown: terminalMd,
    tokens: {
      bg: "#0A0E14",
      surface: "#121820",
      text: "#D6E0EA",
      textMuted: "#8A97A6",
      accent: "#3BE38B",
      accent2: "#4FD6E0",
      border: "#243040",
      radius: "6px",
      fontHeading:
        "'JetBrains Mono', 'Fira Code', ui-monospace, 'SFMono-Regular', 'Cascadia Code', Menlo, Consolas, monospace",
      fontBody:
        "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      googleFontHref:
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap",
      layout: "timeline",
      headerStyle: "split",
    },
  },
  {
    slug: "creative-gradient",
    name: "Creative Gradient",
    vibe: "과감한 그라디언트와 컬러풀한 에너지",
    audience: "디자이너·일러스트레이터·브랜드 크리에이터처럼 시각적 임팩트가 중요한 사람",
    markdown: creativeMd,
    tokens: {
      bg: "#0F0B1E",
      surface: "#1B1533",
      text: "#F4F1FF",
      textMuted: "#B7ADD6",
      accent: "#B57BFF",
      accent2: "#FF7AC6",
      border: "#3A2F5C",
      radius: "20px",
      fontHeading: "'Sora', 'Pretendard', system-ui, -apple-system, 'Segoe UI', sans-serif",
      fontBody:
        "'Plus Jakarta Sans', 'Pretendard', system-ui, -apple-system, 'Segoe UI', sans-serif",
      googleFontHref:
        "https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap",
      layout: "single-column",
      headerStyle: "banner",
    },
  },
  {
    slug: "editorial-serif",
    name: "Editorial Serif",
    vibe: "매거진 표지처럼 정제된 세리프 에디토리얼",
    audience: "디자이너·작가·편집자·아트 디렉터처럼 완성도와 취향으로 신뢰를 얻는 사람",
    markdown: editorialMd,
    tokens: {
      bg: "#FBFAF7",
      surface: "#FFFFFF",
      text: "#1F1B16",
      textMuted: "#6B6357",
      accent: "#8A4B2F",
      accent2: "#3E5C52",
      border: "#E4DFD4",
      radius: "4px",
      fontHeading: "'Playfair Display', 'Times New Roman', Georgia, serif",
      fontBody: "'Source Serif 4', Georgia, 'Times New Roman', serif",
      googleFontHref:
        "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Source+Serif+4:ital,wght@0,400;0,500;0,600;1,400&display=swap",
      layout: "two-column",
      headerStyle: "split",
    },
  },
  {
    slug: "pro-sidebar",
    name: "Pro Sidebar",
    vibe: "좌측 프로필, 우측 본문의 신뢰감 있는 비즈니스 레이아웃",
    audience: "경력직, 매니저·컨설턴트·PM·금융/IT 직군",
    markdown: proMd,
    tokens: {
      bg: "#F4F6F8",
      surface: "#FFFFFF",
      text: "#1A2230",
      textMuted: "#5A6572",
      accent: "#1F5FA8",
      accent2: "#0E9A8A",
      border: "#DDE3EA",
      radius: "10px",
      fontHeading: "'Barlow', 'Pretendard', system-ui, -apple-system, 'Segoe UI', sans-serif",
      fontBody: "'Inter', 'Pretendard', system-ui, -apple-system, 'Segoe UI', sans-serif",
      googleFontHref:
        "https://fonts.googleapis.com/css2?family=Barlow:wght@500;600;700&family=Inter:wght@400;500;600&display=swap",
      layout: "sidebar",
      headerStyle: "sidebar-profile",
    },
  },
];

export const DEFAULT_THEME = THEMES.find((t) => t.isDefault) || THEMES[0];

export function getTheme(slug) {
  return THEMES.find((t) => t.slug === slug) || DEFAULT_THEME;
}
