# 프로젝트
green-connect — 사용자의 몸 상태(증상/생활 패턴)를 분석해 필요한 기능성 성분을 추천하고,
기존 복용 영양제와의 성분 중복을 체크한 뒤, 기업 규모(대기업·중소기업·소상공인)에 상관없이 그 성분을
우수하게 담은 신뢰할 수 있는 건강기능식품으로 연결(스마트스토어 등)해주는 개인 맞춤형 건강기능식품
추천 서비스. 특정 기업 규모를 우대하지 않고 성분·품질 기준으로만 제품을 추천한다.


## 화면 흐름 (IA)
0. 시작 화면 → 1. 홈(증상 체크) → 2. 성분 분석(추천 성분 제시 + 복용 중 영양제 입력)
→ 3. 성분 중복 체크(경고 배지) → 4. 제품 추천(카드 목록) → 5. 상세(인증 정보 + 구매 연결)
→ 6. 스마트스토어 이동 전환

각 화면의 상세 마크업/스타일 참고는 `hub/prototype/` 내 `0-start.html` ~ `6-transition.html`,
`style.css` 참고 (디자인 톤: 라벤더/퍼플 계열 `#7C6AE8` — `design-system-lavender` 스킬 기준, Noto Sans KR 폰트,
375px 모바일 카드형 레이아웃, 상세 토큰은 `hub/docs/design skill.css` 참고).

## 기술 스택
- FE: React + TypeScript
- BE: Node.js (Express)
- DB: PostgreSQL
- 패키지 매니저: npm (yarn/pnpm 사용 금지)

## 컨벤션
- 컴포넌트/파일 네이밍 (T05에서 확정, `frontend/src` 기준):
  - React 컴포넌트 파일: PascalCase (`AuthForm.tsx`), `src/components/`에 위치
  - 훅/유틸/API 래퍼 파일: camelCase (`auth.ts`), `src/api/`, `src/hooks/` 등 역할별 폴더에 위치
- 커밋 메시지: Conventional Commits 형식 사용 (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:` 등)


## 하지 말 것
- `any` 타입 사용 금지 (TypeScript strict 지향)
- 외부 UI 라이브러리 임의 추가 금지 — 새 라이브러리가 필요하면 먼저 사용자에게 제안하고 합의 후 추가
- `.env` 등 민감 정보 파일 커밋 금지
- 성분/영양 정보는 목업이라도 실제 상한 섭취량 기준과 크게 어긋나지 않게 주의 (건강 관련 서비스이므로
  성분 데이터의 신뢰성에 유의)

## 참고 문서
- 기획서: `hub/planning.md`, `service_concept_design.md`
- 작업 분해: `hub/작업 분해.md`
- 백로그: `hub/docs/green-connect-backlog.md`
- 프로토타입/디자인: `hub/prototype/` (0-start.html ~ 6-transition.html, prototype.html, style.css)

## 개발 단계 참고 (작업 분해 기준)
1. 정적 UI 화면 먼저 구현 (헤더, 증상 체크 카드, 성분 분석 결과, 중복 체크 대시보드, 제품 카드, 구매 버튼)
2. 기능 로직 연결 (증상→성분 매핑, 성분 데이터셋/상한 섭취량 목업, 중복 계산, 제품 매칭)
3. 화면 간 상태 유지 + 전체 흐름 연결 + 예외 처리 + 시나리오 테스트

