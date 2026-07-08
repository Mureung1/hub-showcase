# AI Student Agent - 상세 기능 체크리스트 (Detailed Checklist)

프론트엔드/백엔드/AI 파이프라인 단위의 세부 구현 항목들입니다.

## 1. 기반 인프라 및 DB (Infrastructure & DB)

- [x] 데이터베이스(PostgreSQL) 설계 및 스키마 세팅 (Member, RawInfo, ActionItem 등)
- [x] Spring Boot 기초 환경 구성 및 패키지 구조 설계
- [x] React (Vite) + TailwindCSS 프론트엔드 초기 세팅
- [x] CORS 설정 및 프론트/백엔드 통신 테스트

## 2. 데이터 수집 엔진 (Observe - Crawler/API)

- [x] **수집기 코어**: 주기적 데이터 스크래핑을 위한 스케줄러(Cron) 구축
- [x] **학교 공지**: BeautifulSoup 기반 정적 페이지 크롤러 구현
- [ ] **학과 공지**: 특정 1개 학과 타겟 파서 구현
- [ ] **LMS (LearningX)**: Canvas REST API 인증(토큰) 및 과제/공지 JSON 파싱 로직 
  - *Fallback: API 불가 시 크롬 익스텐션 기반 DOM 스크래핑*
- [ ] **장학금**: 공공데이터포털(한국장학재단) 오픈 API 클라이언트 구현
- [ ] **청년정책**: 온통청년 오픈 API 연동 (승인 전까지는 Mock 데이터 서비스로 대체)



## 3. AI 파이프라인 (Understand & Reason)

- [ ] **텍스트 요약 모듈**: 긴 공지사항에서 핵심 내용 3줄 요약 프롬프트 작성
- [ ] **구조화 모듈**: 비정형 텍스트 → JSON(카테고리, 마감일, 액션, 중요도) 추출 로직 구현
- [ ] **임베딩 및 매칭**: 공지사항 벡터화 및 사용자 프로필(학과, 관심사) 기반 Cosine Similarity(Interest) 산출
- [ ] **Priority Score 수식**: `S = w1*Interest + w2*Deadline - w3*Conflict + w4*Irreversibility` 계산기 구현
- [ ] **충돌 감지(Conflict Detection)**: 3일 이내에 마감이 겹치는 ActionItem 그룹화 로직
- [ ] **충돌 재배치(Conflict Resolution)**: Irreversibility 기반 LLM 재배치 시나리오(JSON) 생성 프롬프트 및 파서 구현



## 4. 행동 및 학습 엔진 (Act & Learn)

- [ ] **Today's Brief**: 가장 우선순위가 높은 3~5개 작업을 문장형으로 요약해주는 로직
- [ ] **알림 엔진**: 마감 임박 / 중요도 급상승 시 프론트엔드로 알림 푸시(또는 이메일 발송) 모듈
- [ ] **Google Calendar 연동**: Google OAuth 2.0 로그인 및 Access Token 발급 로직
- [ ] **Google Calendar 쓰기**: 수락된 ActionItem을 실제 구글 캘린더 Event로 Insert 하는 API 연동
- [ ] **피드백 로직 (Learn)**: 사용자가 재배치 시나리오를 수락/거절했을 때 이력 저장
- [ ] **가중치 보정 (Learn)**: 피드백 이력을 바탕으로 S(Priority Score) 수식의 가중치(w1~w4) 미세 조정



## 5. 대시보드 프론트엔드 (Dashboard UI)

- [x] **레이아웃**: 네비게이션 바, 사이드바, 전체 레이아웃 템플릿 구성
- [x] **인증 뷰**: 로그인 / 회원가입 UI
- [x] **Today's Brief 카드**: 오늘의 핵심 요약 내용 시각화
- [x] **Action Items 리스트**: 진행 중인 일정을 Priority Score 순으로 정렬하여 표시 (긴급도 뱃지 포함)
- [x] **일정 충돌 경고 카드 (Conflict Card)**: 충돌 감지 시 AI의 재배치 시나리오를 보여주고 [수락] / [거절] 버튼 배치
- [x] **월간 캘린더 뷰**: 내장 캘린더 UI 렌더링 및 모달을 통한 수동 일정 추가 폼
- [x] **구글 캘린더 동기화 버튼**: OAuth 로그인 팝업 및 연동 완료 UI 상태 처리
- [ ] **알림 토스트 (Toast)**: 우측 상단 실시간 알림 팝업 컴포넌트