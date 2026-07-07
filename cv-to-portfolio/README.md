# CV → 포트폴리오 생성기 (프로토타입)

이력서(CV)를 업로드하고 원하는 **DESIGN.md** 테마를 고르면, 그 디자인으로 완성된
**독립 실행형 포트폴리오 HTML**을 만들어 주는 웹앱입니다. (React only, Vite)

## 문서

- 📄 **[기획서](docs/기획서.md)** — 문제 정의 · 사용자 시나리오 · 핵심 기능
- 🎨 [디자인 명세 (DESIGN.md 5종)](designs)
- 🖼️ [예시 결과 + 스크린샷](examples)
- 🔀 [Pull Request #1](https://github.com/dolphin1404/NaverConnect_wm/pull/1)

## 미리보기

샘플 개발자 CV(`samples/kim-jiwoo-frontend.md`)를 각 테마로 생성한 실제 결과입니다.
전체 HTML은 [`examples/`](examples) 폴더에서 열어볼 수 있습니다.

| Minimal Clean · 기본 | Terminal Dark |
|:--:|:--:|
| ![Minimal Clean](examples/minimal-clean.png) | ![Terminal Dark](examples/terminal-dark.png) |
| **Pro Sidebar** | **Editorial Serif** |
| ![Pro Sidebar](examples/pro-sidebar.png) | ![Editorial Serif](examples/editorial-serif.png) |
| **Creative Gradient** | |
| ![Creative Gradient](examples/creative-gradient.png) | |

## 사용자 흐름

```
① CV 업로드/붙여넣기  →  ② DESIGN.md 테마 선택  →  ③ AI 생성  →  ④ 미리보기 & 다운로드
```

1. **CV 업로드** — 마크다운 이력서를 붙여넣거나 `.md/.txt` 파일 업로드 (샘플 2종 제공). 실시간으로 이름·직함·연락처·스킬·경력·프로젝트·학력으로 파싱됩니다.
2. **디자인 선택** — 5개 테마의 미리보기 카드에서 하나를 고르면 해당 `DESIGN.md` 원문이 표시됩니다.
3. **생성** — 선택한 디자인 토큰으로 CV를 렌더링해 HTML 페이지를 조립합니다.
4. **결과** — iframe 미리보기 ↔ HTML 코드 탭, `<이름>_portfolio.html`로 다운로드.

## 실행

```bash
npm install
npm run dev     # http://localhost:5173
```

## 프로젝트 구조

```
designs/                     # 사람이 읽는 디자인 명세 (DESIGN.md 5종)
samples/                     # 샘플 CV 2종 (개발자 / 디자이너)
src/
├─ App.jsx                   # 4단계 흐름 오케스트레이터
├─ components/Stepper.jsx    # 진행 표시기
└─ features/
   ├─ cvUpload/              # ① 업로드 + 마크다운 파서(parseCv)
   ├─ designSelect/          # ② 테마 갤러리 + 레지스트리(themes.js)
   ├─ generate/              # ③ 생성 엔진(generatePortfolio) + AI seam
   └─ result/                # ④ 미리보기 + 다운로드
```

## 디자인 테마 5종

| 테마 | 결 | 레이아웃 |
| --- | --- | --- |
| **Minimal Clean** ⭐기본 | 여백 중심 미니멀, 채용담당자 친화 | single-column |
| Terminal Dark | 터미널/코드 감성 다크, 개발자 | timeline |
| Creative Gradient | 그라디언트 배너, 크리에이터 | single-column (banner) |
| Editorial Serif | 매거진 세리프, 에디토리얼 | two-column |
| Pro Sidebar | 좌측 프로필 사이드바, 비즈니스 | sidebar |

> 기본 테마(minimal-clean)는 큐레이션 결과 본문 대비(약 15.8:1)가 가장 높고 범용적이라 선정.

## "AI 생성"에 대하여 (프로토타입 vs 실서비스)

- **프로토타입**: `generatePortfolio()`가 CV + 디자인 토큰으로 HTML을 **결정적으로 렌더링**합니다. 백엔드·API 키 없이 브라우저만으로 동작합니다.
- **실서비스(seam)**: 자유도 높은 결과를 원하면 이 함수를 `generateWithAI.js`의 **Claude API 호출**로 교체합니다. CV 원문 + 선택한 `DESIGN.md`를 그대로 LLM에 넘겨 HTML을 생성합니다.
  - ⚠️ API 키는 브라우저에 노출하면 안 되므로 **백엔드(서버/서버리스)**에서 호출해야 합니다.

## 한계 / TODO

- PDF·DOCX 업로드는 미지원(현재는 마크다운/텍스트). 실서비스에선 파싱 단계에 문서 변환기 추가 필요.
- 파서는 흔한 마크다운 구조를 관대하게 처리하는 수준(휴리스틱).
- 실제 LLM 생성 경로(`generateWithAI.js`)는 seam만 있고 호출되지 않음 → 백엔드 붙이면 활성화.
