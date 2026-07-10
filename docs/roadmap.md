# 개발 로드맵 (3주)

프론트 프로토타입은 완성됐고 백엔드(Express+Prisma+SQLite)는 뼈대만 완성된 상태다.
가장 우선순위가 높은 건 프론트-백엔드 연동이며, 지금까지의 디자인 작업(청록 포인트 컬러,
필/토글, 랜딩 페이지)은 아직 초안이라 다시 다듬을 예정이다. Week 1 → 2 → 3 순서로 진행하며,
같은 주차 안에서는 병렬로 진행할 수 있다.

## Week 1 — 디자인 확정 + 백엔드 연동 착수

### 디자인 재작업
- [ ] 추가 레퍼런스/피드백 반영해 온보딩·대시보드 디자인 리터치 (지금 것은 초안)
- [ ] 모바일 폭 반응형 점검 및 수정 (`OnboardingForm.css`/`Dashboard.css`/`Landing.css`)
- [ ] 랜딩 페이지 문구·레이아웃 재검토

### 백엔드 — 작업 항목 이식
- [ ] `src/data/tasks.ts`의 14개 항목 정의(`condition`/`reason`/`dueDate`)를
      `server/src/data/tasks.ts`로 이식
- [ ] `GET /api/tasks` 라우트 구현 — 세션의 `Profile`을 조회해 조건에 맞는 항목만 필터링
- [ ] `curl`로 `/api/tasks` 응답 검증

### 프론트 API 연동 착수
- [ ] fetch 유틸/훅 작성 (`credentials: 'include'`로 세션 쿠키 유지)
- [ ] 온보딩 제출 → `POST /api/profile` 연동
- [ ] 대시보드 진입 시 `GET /api/profile`, `GET /api/tasks` 연동

## Week 2 — 연동 완료 + 안정화

### 진행상태 연동
- [ ] 체크 토글 → `POST /api/progress/:taskId/toggle` 연동
- [ ] "체크 상태 초기화" → `POST /api/progress/reset` 연동
- [ ] `src/hooks/useLocalStorage.ts` 사용처 정리 (더 이상 안 쓰는 곳 제거 또는 오프라인
      폴백으로 유지할지 결정)

### 에러/로딩 UX
- [ ] API 호출 로딩 상태 표시 (스피너/스켈레톤)
- [ ] 네트워크 에러 시 안내 문구 + 재시도 UI

### 개발 편의성
- [ ] 루트에 `concurrently`(또는 유사 도구)로 프론트+백엔드 동시 실행 스크립트 추가
- [ ] README에 로컬 개발 환경(서버 2개 실행) 안내 갱신

### 통합 QA
- [ ] 전체 플로우 수동 테스트: 온보딩 → 대시보드 → 체크 → 새로고침 → 재방문 상태 복원
- [ ] 발견된 버그 수정

## Week 3 — 배포 + 마무리

### 배포
- [ ] SQLite 지속 디스크를 지원하는 PaaS(Render/Railway 등) 선정
- [ ] 백엔드 배포, 프로덕션 환경변수(`DATABASE_URL`, CORS origin) 설정
- [ ] 프론트 배포(Vercel/Netlify 등) 및 배포된 백엔드 API 주소 연결

### 선택 — 시간 남으면
- [ ] 지원금 목록 공공데이터포털 API 연동 조사 및 적용 여부 결정

### 마무리
- [ ] 접근성/반응형 최종 점검
- [ ] PR 본문 작성 (`주요 작업 리스트`, 스크린샷, `내가 설명할 수 있는 부분` 등 템플릿 채우기)
- [ ] 데모/발표 준비
