// 오늘모여 — 공통 디자인 토큰
// 스티치 프로토타입(index.html / room.html)에서 추출한 값입니다.
// 실제 프로젝트의 tailwind.config.js에 theme.extend로 병합해서 쓰거나,
// 아래처럼 JS 상수로 두고 style={{ }} / 배열 템플릿으로 사용해도 됩니다.
// 컴포넌트들은 커스텀 tailwind 클래스(bg-campfire-orange 등)에 의존하지 않도록
// 전부 Tailwind 임의값(bg-[#FF5C00])으로 작성했기 때문에, 별도 설정 없이도 바로 동작합니다.

export const COLORS = {
  inkBlack: "#1A1A1A",
  paperCream: "#FFFDF5",
  campfireOrange: "#FF5C00",
  background: "#FBF9F1",
  surfaceContainer: "#F0EEE6",
  surfaceContainerHigh: "#EAE8E0",
  onSurfaceVariant: "#5B4137",
  mutedGray: "#808080",
  fadedInk: "#666666",
  error: "#BA1A1A",
};

export const FONT_FAMILY = {
  display: "'Jua', sans-serif", // 헤드라인 / 버튼 라벨 / 본문 전반
  mono: "'Space Mono', ui-monospace, monospace", // 타이머 숫자
};

// Google Fonts — 프로젝트의 index.html <head> 또는 전역 CSS에 한 번만 추가하세요.
// <link href="https://fonts.googleapis.com/css2?family=Jua&family=Space+Mono&display=swap" rel="stylesheet">
// <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block" rel="stylesheet">

export const BACKGROUND_IMAGES = {
  // 프로토타입에서 쓰인 픽셀아트 모닥불 배경. 실제 배포 시 자체 에셋으로 교체하세요.
  campfireWide:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuC6EKLHKWdK0nSMQzJ6EsWOfJP62nCiLE5sUUd7_5AM5sCDXhS77lccsTSXsbCN7bhc2UJLXmssOXlP4IZFc7OWJ89KnY446uuhjNREr8URES1svKx2C5ShrBlqo65YLp1gj55SVyQL8W1-IFwiAdMmw12j5rNrvEviwHphd0cde-HL9GIy1s42SwvqJoVaWI9KVenSikT_uNq1VuS9_aw4rl2IVsi7JEmgAlYO9KViXIA9EDqYuJeG7XwedMCf8dB1XPfl-Z7qjDS-",
  campfireRoom:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDOM2AG-zylsD1JytXEsvNqrSTSrR3WhM69Xul4ZCJw5jl8DNQoeBmCdSPlCKfjySOg1LTJaQjCG0hx_M-PLTfEZ0r4vGix_q6I00NnRpdEjb02DZKREJwwYvBKzymLTt9Uv6PY0giCjYW2DejuAbgVkocV0xWgCmEPaIhHyalR3EkSHDrodnayNkUDcoFgWhSIjyis-9IV8BxBhSJYvP4-Gz0S4krBeDOdwrXdPc5aAisLwUv1G84B_eeg2s9HITIYX2Dukt8FE98",
};
