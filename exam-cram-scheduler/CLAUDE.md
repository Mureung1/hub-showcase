# 시험 벼락치기 스케줄러

시험 날짜·남은 공부량·평소 수면 패턴·카페인 섭취 상태를 입력하면, 검증된 생물수학 모델(Two-Process Model + 카페인 상호작용 모델)로 "시험 시작 시각에 각성도가 최고가 되는" 수면·카페인 스케줄을 계산해주는 웹 도구. 시험이 여러 개 겹치는 시험기간 전체를 한 번에 고려해 스케줄을 짜준다는 점이 핵심 차별점이다.

## 기술 스택

| 층 | 기술 | 비고 |
|---|---|---|
| FE | React | CSS Modules로 스타일링 |
| BE | Express | 계산 엔진 API + 참고 데이터 제공 API |
| DB | Supabase (Postgres) | 음료별 카페인 함량, 반감기, 안전 섭취 한도 등 참고용 정적 데이터만 저장. 사용자 스케줄은 저장하지 않음(브라우저 localStorage 사용) |

## 컨벤션

**컴포넌트**
- 컴포넌트 파일명은 `PascalCase.tsx`
- 같은 폴더에 동일한 이름의 `.module.css`를 짝으로 둔다 (예: `ExamCard.tsx` + `ExamCard.module.css`)
- 스타일은 CSS Modules로 작성하고, `docs/prototype/styles.css`의 `:root` 디자인 토큰(`--brand`, `--surface`, `--ink-900` 등)을 그대로 재사용한다

**커밋**
- Conventional Commits 형식: `타입: 한국어 설명`
- 타입 예시: `feat`(기능 추가), `fix`(버그 수정), `docs`(문서), `style`(스타일링), `refactor`, `test`, `chore`, `ci`
- 예: `feat: 시험 일정 입력 폼 추가`, `fix: 카페인 반감기 계산 오류 수정`

## 하지 말 것

- 사용자가 명시적으로 실행하라고 지시하지 않은 작업은 스스로 실행하지 않는다
- 프롬프트에 빈틈(정해지지 않은 부분)이 있으면 임의로 판단해서 채우지 말고, 사용자에게 다시 질문해서 함께 결정한다

## 참고

- 기획서: [docs/기획서.md](docs/기획서.md)
- 서비스 기술 지도: [docs/서비스_기술_지도.md](docs/서비스_기술_지도.md)
- 프로토타입: https://dodeho.github.io/hub/ (소스: `docs/prototype/`)
