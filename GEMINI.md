# Scholar-Sync AI Agent: 에이전트 지침서

## 프로젝트
- Scholar-Sync AI: 대학(원)생 및 연구원의 논문 탐색 피로도를 줄여주는 지능형 큐레이션 및 요약 비서 서비스

## 기술 스택
- Frontend: React
- Backend: Express
- Styling: 순수 CSS (디자인 시스템 토큰 기준 컴포넌트 커스텀 스타일링)

## 디렉토리 구조
```text
├── .github/
├── .venv/
├── assets/
│   ├── prototype.png
│   └── user_flow.png
├── docs/
│   ├── design_system.md
│   └── plan.md
├── prototype/
│   ├── index.html
│   └── style.css
├── topic_intro/
├── .gitignore
└── README.md
```

## 컨벤션
- 컴포넌트: PascalCase
- 커밋 태그: feat / fix / refactor / docs / style / chore

## 하지 말 것
- any 타입 사용 금지 (추후 TypeScript 빌드 구성 시)
- 외부 UI 라이브러리 독단적 사용 금지 (Tailwind, styled-components 등은 미션 제약 확인 후 반영)
- `docs/design_system.md`에 정의된 2x2 비대칭 격자 면적 비중(30:10:60)을 임의로 변경하거나 파괴하지 말 것
- 3줄 인사이트 요약 노출 시 정형화된 3대 구획 구조(연구 배경, 핵심 방법론, 개선 결과)를 누락하지 말 것

## 참고
- 기획서 명세: @docs/plan.md
- 디자인 시스템 명세: @docs/design_system.md
- 활성화된 스킬 절차서: @docs/skills/design_production.md
