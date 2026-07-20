set -e

gh issue create -t "🧱 개발 환경 마무리 — 레포 push + 로컬 실행" -b '> **P0 · 이번 주 월요일** — 모든 작업의 출발점

### 🎯 목표
스타터를 push하고, 로컬에서 client·server가 같이 도는 것 확인

### ✅ 완료 기준
- [ ] client(Vite) + server(Express) 동시 실행, 브라우저 접속 OK
- [ ] README에 실행 방법 + 주간계획 링크'

gh issue create -t "🔌 Supabase 프로젝트 생성 + .env 연결" -b '> **P0 · 이번 주 월요일**

### 🎯 목표
Supabase 프로젝트를 만들고 client에서 접속되게 연결

### ✅ 완료 기준
- [ ] `.env`에 URL·anon key 연결 (`.env.example`만 커밋)
- [ ] client에서 간단 쿼리 1회 성공'

gh issue create -t "🗄️ DB 테이블 설계 및 적용" -b '> **P0 · 이번 주 화요일** — ⚠️ 이번 주의 승부처, 이날은 이것만

### 🎯 목표
테이블 6종 스키마 확정 후 Supabase 적용

### ✅ 완료 기준
- [ ] `users(role)` `requests` `confirmations` `tickets` `ticket_redemptions` `ratings`
- [ ] 상태값 **모집중→진행중→완료대기→완료** enum/check 강제
- [ ] 완료 성립 = 양측 confirmation **2건** / 차감 = redemption 별도 기록
- [ ] 시드 데이터 삽입'

gh issue create -t "🔐 인증 — 가입/로그인 + 역할 선택" -b '> **P0 · 이번 주 수요일**

### 🎯 목표
Supabase Auth 이메일로 SignupPage(학생 헬퍼/사장님)·LoginPage 구현

### ✅ 완료 기준
- [ ] 가입 시 역할이 `users`에 저장
- [ ] 로그인 상태 Context 공유 (외부 라이브러리 ❌)
- [ ] 비로그인 접근 → 로그인 리다이렉트
- [ ] hankki-design v3 토큰 준수'

gh issue create -t "📋 재능 피드 — 목록 + 태그 필터" -b '> **P0 · 이번 주 목요일**

### 🎯 목표
TalentFeedPage에서 requests를 카드 목록으로 표시

### ✅ 완료 기준
- [ ] 카드에 상태 배지 + 🎟️ 식권 티켓 컴포넌트
- [ ] Tab2 태그 5종 칩 필터
- [ ] 지역 프리셋 드롭다운 (활성: 부산대 앞)'

gh issue create -t "✍️ 요청 등록 폼" -b '> **P0 · 이번 주 금요일**

### 🎯 목표
필수 필드 검증 + 이미지 업로드 포함한 등록 구현

### ✅ 완료 기준
- [ ] 필수 필드(태그·내용·기대 예시·식사권 수량·지역) 없으면 등록 불가
- [ ] 기대 예시 이미지 → Storage 업로드
- [ ] 수정 1회 룰박스 + 시세 힌트
- [ ] 등록 직후 피드 노출'

gh issue create -t "🏁 이번 주 목표 통과 — 가입→등록→피드" -b '> **P0 · 이번 주 금요일 저녁** — 이게 닫히면 이번 주 성공

### ✅ 완료 기준
- [ ] 새 계정으로 **가입→로그인→요청 등록→피드 노출** 전 구간 통과
- [ ] 버그는 별도 이슈로 등록'

gh issue create -t "📄 요청 상세 + 진행 스텝바" -b '> **P0 · 다음 주**

### ✅ 완료 기준
- [ ] 스텝바 4단계 고정 (요청등록→매칭→완료대기→완료·지급)
- [ ] 기대 예시 고정 노출 + 수정 1회 룰박스
- [ ] 지원/매칭 동작'

gh issue create -t "🤝 완료 확인 API — 양측 확인 검증" -b '> **P0 · 다음 주** — 신뢰 장치의 핵심

### ✅ 완료 기준
- [ ] **양측 확인이 모두 있어야** 완료 전환 (server 검증, 일방 완료 ❌)
- [ ] 완료 시 식사권 지급 기록'

gh issue create -t "🔥 핫딜 피드 + 썸네일 선순환" -b '> **P0 · 다음 주**

### ✅ 완료 기준
- [ ] Tab1 목록 + 태그 4종 필터
- [ ] Tab2 완료 결과물 → Tab1 썸네일 재사용'

gh issue create -t "🤖 AI 문구 생성 연동" -b '> **P1 · 다음 주**

### ✅ 완료 기준
- [ ] 한 줄 입력 → server 경유 LLM → 문구+태그 초안
- [ ] "AI가 만든 초안" 표시 + 사장님 확인 후에만 게시 (자동 게시 ❌)'

gh issue create -t "🎟️ 식사권 지갑 + 사용확인" -b '> **P1 · 다음 주**

### ✅ 완료 기준
- [ ] WalletPage 티켓 목록 (사용 완료는 dim)
- [ ] 사장님 확인 시에만 차감, **되돌리기 불가** (server 검증)'

gh issue create -t "⭐ 상호 평점 저장" -b '> **P1 · 여유되면**

- [ ] 별점 + 한줄후기 양방향 저장'

gh issue create -t "⏰ 무응답 매칭 자동취소" -b '> **P2 · 여유되면**

- [ ] 일정 시간 무응답 → 자동 취소 → 모집중 복귀'

gh issue create -t "🔔 관심 태그 알림" -b '> **P2 · 여유되면**

- [ ] 관심 태그 새 글 등록 시 알림'

gh issue create -t "🍚 파일럿 식당 인터뷰 1곳" -b '> **P2 · 개발과 병행**

- [ ] 부산대 앞 식당 1곳 사전 인터뷰'

gh issue create -t "🚀 배포 + 발표 준비" -b '> **P0 · 마지막 주** — 수요일(7/29)에 개발 끊고 여기 집중

### ✅ 완료 기준
- [ ] client Vercel / server Render 배포
- [ ] 발표 전 서버 미리 깨워두기
- [ ] 시연 시나리오 + 디자인 QA'

echo ""
echo "✨ 완료! 레포 Issues 탭 새로고침해서 확인하세요."