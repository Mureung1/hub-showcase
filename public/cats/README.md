# 답냥이 캐릭터 에셋

사용자 제공 1254×1254 RGBA PNG는 원본 보존용이며, 실제 화면은 전송량을 줄인 투명 WebP 파생본을 사용한다. 자동 trim이나 배경 합성을 하지 않아 기존 투명 여백과 CSS 크롭 위치를 유지한다.

브랜드 패널의 Three.js/R3F 단일 Canvas와 정적 폴백에 쓰는 1024×1024 WebP:

- `dabnyangi-main.webp` — 관계 선택 전 대표 답냥이. 대화 헤더와 공유
- `dabnyangi-thinking.webp` — AI 문구 생성 중 생각하는 답냥이
- `groupwork-cat-stage.webp` — 팀플냥 선택 후
- `professor-cat-stage.webp` — 교수냥 선택 후
- `senior-cat-stage.webp` — 선배냥 선택 후
- `friend-cat-stage.webp` — 연인냥 선택 후

관계 선택 카드와 대화 헤더에 쓰는 384×384 정적 WebP:

- `groupwork-cat.webp` — 팀플냥
- `professor-cat.webp` — 교수냥
- `senior-cat.webp` — 선배냥. `senior-cat-avatar-transparent.png` 전용 얼굴·상반신 원본 사용
- `friend-cat.webp` — 연인냥

WebP 파생본은 quality 92·alpha quality 100으로 만들었고 10개 합계는 512,178 bytes다. 교체 전 런타임이 참조하던 PNG 9개 7,042,525 bytes보다 92.7% 작다. PNG와 사용자 제공 크로마키 원본은 수정·삭제하지 않는다. 관계 카드 네 장은 정적 `<img>`이며 Canvas를 추가하지 않는다.
