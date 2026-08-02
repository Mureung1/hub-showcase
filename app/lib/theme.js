// T22: 화이트노이즈 테마(낮/밤 동기화·숲·카페). 실제 오디오 재생은 범위 밖이고,
// 배경색·장식 요소·캡션 문구로만 분위기를 표현한다(docs/prototype/whitenoise-themes.html).
export const THEMES = ["daynight", "forest", "cafe"];

// 6시~18시를 낮으로 본다(design-system 문서엔 정확한 경계가 없어 상식적인 기준으로 정함).
export function isNightTime(date = new Date()) {
  const hour = date.getHours();
  return hour < 6 || hour >= 18;
}

export function themeBackgroundColor(theme, date = new Date()) {
  if (theme === "forest") return "var(--forest-bg)";
  if (theme === "cafe") return "var(--cafe-bg)";
  return isNightTime(date) ? "var(--night)" : "var(--cream)";
}

// 밤 배경(--night, 어두운 남색)에서 기본 --ink(어두운 갈색) 텍스트는 거의 안 보인다.
// 그 경우에만 밝은 톤(--night-soft)으로 바꾸고, 나머지 테마는 원래 --ink 그대로 쓴다.
export function themeTextColor(theme, date = new Date()) {
  if (theme === "daynight" && isNightTime(date)) return "var(--night-soft)";
  return "var(--ink)";
}

// T24: 테마별 배경음(Mixkit 무료 라이선스, public/sounds/). daynight만 낮/밤에 따라 다른 파일을 쓴다.
export function themeSoundSrc(theme, date = new Date()) {
  if (theme === "forest") return "/sounds/forest.mp3";
  if (theme === "cafe") return "/sounds/cafe.mp3";
  return isNightTime(date) ? "/sounds/night.mp3" : "/sounds/day.mp3";
}

// T24: 감각 강도 다이얼(0~100, 차분하게~생기있게) → 채도(%). 40(차분)~140(생기)% 범위.
export function intensityToSaturate(intensity) {
  return 40 + intensity;
}
