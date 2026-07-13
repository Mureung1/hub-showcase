# GitHub Issues - 관계형 AI 이번 주 개발 작업

## 1. 핵심 사용자 시나리오 확정

### 작업 내용

관계형 AI의 핵심 사용자 시나리오를 정의하고 문서화합니다. 사용자가 상황과 감정을 입력했을 때 AI가 공감형 반응을 제공하는 기본 흐름을 확정합니다.

### 구현 방법

* 사용자 시나리오 텍스트 작성
* 핵심 수직 슬라이스 정의 (입력 → 검증 → Mock 응답 → 저장 → 표시)
* 완료 기준 체크리스트 작성

### 사용할 기술

* 마크다운 문서화
* 요구사항 정리

### 완료 기준

* [ ] 핵심 사용자 시나리오 텍스트 작성 완료
* [ ] 수직 슬라이스 5단계 흐름 명시
* [ ] 완료 기준 체크리스트 작성

### 작업 정보

* 예상 시간: 15분
* 우선순위: P0
* 실행 순서: 1
* 작업 날짜: 월요일
* 선행 작업: 없음

---

## 2. 수직 슬라이스 완료 기준 작성

### 작업 내용

이번 주 개발의 최종 완료 기준을 상세하게 정의합니다. 사용자 입력부터 AI 응답 저장까지 전체 프로세스가 작동해야 하는 기준을 명확히 합니다.

### 구현 방법

* 수평 시나리오별 체크리스트 작성 (UI, API, DB, 연결, 오류 처리)
* 테스트 가능한 기준 정의
* 각 기준별 예상 완료 날짜 기재

### 사용할 기술

* 마크다운 문서화
* 체크리스트 작성

### 완료 기준

* [ ] UI 완료 기준 명시
* [ ] API 동작 기준 명시
* [ ] DB 저장 기준 명시
* [ ] E2E 테스트 기준 명시

### 작업 정보

* 예상 시간: 15분
* 우선순위: P0
* 실행 순서: 2
* 작업 날짜: 월요일
* 선행 작업: 1번 (핵심 사용자 시나리오 확정)

---

## 3. Express 서버 실행 환경 구성

### 작업 내용

Express 서버를 새로 생성하고 개발 환경을 구성합니다. 포트 설정, 미들웨어 초기화, 핫 리로드 설정을 완료합니다.

### 구현 방법

* Express 앱 생성 및 기본 미들웨어 설정 (JSON parser, CORS)
* 포트 3001에서 서버 실행
* 기본 GET / 라우트 구현
* nodemon을 사용한 자동 재시작 설정
* package.json에 start/dev 스크립트 추가

### 사용할 기술

* Express.js
* nodemon
* CORS 미들웨어

### 완료 기준

* [ ] Express 앱 생성 및 포트 3001에서 실행
* [ ] JSON 미들웨어 설정
* [ ] CORS 설정 완료
* [ ] GET / 라우트에서 "서버 실행 중" 응답
* [ ] nodemon 자동 재시작 동작

### 작업 정보

* 예상 시간: 20분
* 우선순위: P0
* 실행 순서: 3
* 작업 날짜: 월요일
* 선행 작업: 없음

---

## 4. 상황 입력 컴포넌트 구현

### 작업 내용

사용자가 자신의 상황을 텍스트로 입력할 수 있는 React 컴포넌트를 구현합니다. 텍스트 에어리어 또는 입력 필드 형태로 최대 500자 입력을 지원합니다.

### 구현 방법

* SituationInput 컴포넌트 생성
* useState를 사용하여 입력 값 관리
* 입력 필드 UI 구성 (라벨, 플레이스홀더, 글자 수 표시)
* 입력 값 부모 컴포넌트로 전달 (props 또는 콜백)
* 최대 500자 제한

### 사용할 기술

* React
* React.useState
* CSS

### 완료 기준

* [ ] SituationInput 컴포넌트 생성
* [ ] 텍스트 입력 필드 렌더링
* [ ] 입력 값 상태 관리 및 콜백 함수 동작
* [ ] 최대 500자 제한 동작
* [ ] 글자 수 표시 (예: "150/500")

### 작업 정보

* 예상 시간: 20분
* 우선순위: P1
* 실행 순서: 4
* 작업 날짜: 월요일
* 선행 작업: 없음

---

## 5. 감정 선택 컴포넌트 구현

### 작업 내용

사용자가 현재 감정 상태를 선택할 수 있는 React 컴포넌트를 구현합니다. 라디오 버튼이나 버튼 그룹 형태로 5-7개의 감정 옵션을 제공합니다.

### 구현 방법

* EmotionSelector 컴포넌트 생성
* 감정 옵션 정의: '기쁨', '슬픔', '화남', '불안', '무서움', '중립' (6개)
* useState를 사용하여 선택된 감정 관리
* 선택 상태 시각적으로 표현 (색상, 하이라이트)
* 선택된 감정을 부모 컴포넌트로 전달

### 사용할 기술

* React
* React.useState
* CSS

### 완료 기준

* [ ] EmotionSelector 컴포넌트 생성
* [ ] 6개 감정 옵션 렌더링
* [ ] 감정 선택 상태 관리
* [ ] 선택된 감정 시각적 표시
* [ ] 선택값 콜백 함수로 전달

### 작업 정보

* 예상 시간: 15분
* 우선순위: P1
* 실행 순서: 5
* 작업 날짜: 월요일
* 선행 작업: 없음

---

## 6. Mock AI 응답 생성 함수 구현

### 작업 내용

Express 백엔드에서 사용자 입력(상황, 감정)을 받아 규칙 기반의 Mock AI 응답을 생성하는 함수를 구현합니다. 실제 AI API 없이 템플릿 기반 응답을 반환합니다.

### 구현 방법

* generateMockResponse(situation, emotion) 함수 생성
* 감정별 공감 템플릿 준비 (10-15개 템플릿)
* 상황 키워드 감지 및 맞춤 응답 생성
* 추가 질문 자동 생성
* JSON 형태로 응답 객체 반환 {response: string, followUpQuestion: string}

### 사용할 기술

* JavaScript/Node.js
* 텍스트 패턴 매칭
* 배열/객체 기반 템플릿 관리

### 완료 기준

* [ ] generateMockResponse 함수 생성
* [ ] 감정별 템플릿 최소 6개 이상
* [ ] 상황 키워드 감지 로직 구현
* [ ] 공감 응답 + 추가 질문 생성
* [ ] JSON 형식 응답 확인

### 작업 정보

* 예상 시간: 20분
* 우선순위: P0
* 실행 순서: 6
* 작업 날짜: 월요일
* 선행 작업: 없음

---

## 7. 사용자 입력 검증

### 작업 내용

Express 백엔드에서 받은 사용자 입력(상황, 감정)을 검증하는 함수를 구현합니다. 빈 값, 길이 초과, 잘못된 감정 값 등을 확인합니다.

### 구현 방법

* validateInput(situation, emotion) 함수 생성
* 상황: 빈 값 확인, 최소 5자, 최대 500자
* 감정: 허용된 감정 목록에 포함되는지 확인
* 검증 실패 시 명확한 에러 메시지 반환
* 검증 성공 시 true 반환

### 사용할 기술

* JavaScript/Node.js
* 문자열 검증

### 완료 기준

* [ ] validateInput 함수 생성
* [ ] 상황 필드 길이 검증 (5-500자)
* [ ] 감정 필드 허용 값 검증
* [ ] 에러 메시지 작성
* [ ] 테스트: 유효한 입력 승인, 무효한 입력 거부

### 작업 정보

* 예상 시간: 20분
* 우선순위: P0
* 실행 순서: 7
* 작업 날짜: 월요일
* 선행 작업: 없음

---

## 8. 대화 생성 API 라우트 구현

### 작업 내용

사용자 입력을 받아 Mock AI 응답을 생성하고 반환하는 POST /api/conversations 라우트를 Express에 구현합니다.

### 구현 방법

* POST /api/conversations 라우트 생성
* 요청 본문에서 situation, emotion 파라미터 추출
* validateInput() 호출하여 입력 검증
* generateMockResponse() 호출하여 응답 생성
* 응답 객체 JSON으로 반환: {id, situation, emotion, response, followUpQuestion, createdAt}
* 에러 발생 시 적절한 HTTP 상태 코드 반환 (400, 500)

### 사용할 기술

* Express.js
* JSON 응답
* HTTP 상태 코드

### 완료 기준

* [ ] POST /api/conversations 라우트 생성
* [ ] 입력 검증 통합
* [ ] Mock 응답 생성 통합
* [ ] JSON 응답 형식 확인
* [ ] 에러 처리 (유효하지 않은 입력, 서버 오류)

### 작업 정보

* 예상 시간: 20분
* 우선순위: P0
* 실행 순서: 9
* 작업 날짜: 화요일
* 선행 작업: 3번 (Express 환경), 6번 (Mock 응답), 7번 (입력 검증)

---

## 9. Supabase conversations 테이블 생성

### 작업 내용

Supabase에서 사용자 입력과 AI 응답을 저장할 conversations 테이블을 생성합니다. 테이블 스키마를 정의하고 필요한 인덱스를 설정합니다.

### 구현 방법

* Supabase 프로젝트 접속
* SQL 에디터에서 conversations 테이블 생성
* 컬럼 정의:
  - id: UUID (Primary Key)
  - situation: text
  - emotion: varchar(20)
  - response: text
  - follow_up_question: text
  - created_at: timestamp (기본값: now())
  - updated_at: timestamp (기본값: now())
* created_at에 인덱스 생성
* Row Level Security (RLS) 정책 미구성 (개발 단계)

### 사용할 기술

* Supabase
* PostgreSQL SQL

### 완료 기준

* [ ] conversations 테이블 생성 완료
* [ ] 모든 컬럼 정의됨
* [ ] UUID, timestamp 데이터 타입 설정
* [ ] Supabase 테이블 구조 확인 (SQL 에디터)
* [ ] 테이블에 샘플 데이터 추가 확인 가능

### 작업 정보

* 예상 시간: 15분
* 우선순위: P0
* 실행 순서: 10
* 작업 날짜: 화요일
* 선행 작업: 2번 (수직 슬라이스 기준)

---

## 10. Supabase 연결 설정

### 작업 내용

Express 백엔드에서 Supabase와 연결하기 위한 SDK를 초기화합니다. 환경 변수 설정과 클라이언트 초기화를 완료합니다.

### 구현 방법

* .env 파일에 SUPABASE_URL, SUPABASE_KEY 저장
* .env.example 파일 작성 (실제 값은 비우기)
* Express에서 @supabase/supabase-js 임포트
* Supabase 클라이언트 생성: createClient(url, key)
* 클라이언트 객체를 별도 파일(supabaseClient.js)로 분리
* 다른 라우트에서 임포트 가능하도록 export

### 사용할 기술

* @supabase/supabase-js
* dotenv
* Node.js 환경 변수

### 완료 기준

* [ ] .env 파일 생성 및 환경 변수 설정
* [ ] @supabase/supabase-js 설치
* [ ] supabaseClient.js 파일 생성
* [ ] 클라이언트 초기화 코드 작성
* [ ] 환경 변수 로드 확인

### 작업 정보

* 예상 시간: 20분
* 우선순위: P0
* 실행 순서: 11
* 작업 날짜: 화요일
* 선행 작업: 9번 (Supabase 테이블)

---

## 11. 대화 저장 기능 구현

### 작업 내용

Supabase conversations 테이블에 사용자 입력과 AI 응답을 저장하는 함수를 구현합니다.

### 구현 방법

* saveConversation(situation, emotion, response, followUpQuestion) 함수 생성
* Supabase 클라이언트를 사용하여 INSERT 쿼리 실행
* 새로 생성된 대화의 id, created_at 반환
* 데이터베이스 오류 처리 (중복 키, 제약 조건 위반 등)
* 저장된 데이터 구조 반환

### 사용할 기술

* @supabase/supabase-js
* SQL INSERT

### 완료 기준

* [ ] saveConversation 함수 생성
* [ ] Supabase insert 쿼리 작성
* [ ] 생성된 데이터 반환
* [ ] 오류 처리 구현
* [ ] 데이터베이스에 실제 저장 확인

### 작업 정보

* 예상 시간: 20분
* 우선순위: P0
* 실행 순서: 12
* 작업 날짜: 화요일
* 선행 작업: 8번 (대화 생성 API), 10번 (Supabase 연결)

---

## 12. 대화 조회 기능 구현

### 작업 내용

Supabase conversations 테이블에서 사용자의 대화 내역을 조회하는 함수를 구현합니다.

### 구현 방법

* getConversations(limit = 10) 함수 생성
* Supabase 클라이언트를 사용하여 SELECT 쿼리 실행
* created_at 내림차순 정렬 (최신 순)
* limit 파라미터로 조회 개수 제한
* 배열 형태로 대화 목록 반환
* 오류 처리 (조회 실패, 타임아웃)

### 사용할 기술

* @supabase/supabase-js
* SQL SELECT, ORDER BY

### 완료 기준

* [ ] getConversations 함수 생성
* [ ] SELECT 쿼리 작성
* [ ] created_at 내림차순 정렬
* [ ] limit 파라미터 구현
* [ ] 데이터베이스에서 실제 조회 확인

### 작업 정보

* 예상 시간: 20분
* 우선순위: P0
* 실행 순서: 13
* 작업 날짜: 화요일
* 선행 작업: 10번 (Supabase 연결), 11번 (대화 저장)

---

## 13. React와 Express 연결

### 작업 내용

React 프론트엔드에서 Express 백엔드의 /api/conversations 엔드포인트를 호출하는 통신 로직을 구현합니다.

### 구현 방법

* ConversationContainer 또는 App 컴포넌트에서 fetch() 사용
* POST 요청: {situation, emotion} 전송
* Express 응답 처리 및 상태 업데이트
* 로딩 상태 관리 (isLoading)
* 에러 상태 관리 (error)
* 응답 데이터 (response, followUpQuestion) 상태에 저장

### 사용할 기술

* React.useState
* fetch API
* async/await

### 완료 기준

* [ ] POST /api/conversations 요청 구현
* [ ] 요청 본문 구성 (situation, emotion)
* [ ] 응답 처리 로직
* [ ] 로딩 상태 표시
* [ ] Express 응답 수신 및 화면 업데이트

### 작업 정보

* 예상 시간: 20분
* 우선순위: P0
* 실행 순서: 14
* 작업 날짜: 화요일
* 선행 작업: 4번 (상황 입력), 5번 (감정 선택), 8번 (API 라우트)

---

## 14. Mock AI 응답 화면 구현

### 작업 내용

Express에서 받은 Mock AI 응답을 React 화면에 표시하는 컴포넌트를 구현합니다.

### 구현 방법

* ResponseDisplay 컴포넌트 생성
* props로 response, followUpQuestion, emotion 받기
* 공감 응답 텍스트 표시
* 추가 질문 표시
* 타임스탬프 또는 감정 아이콘 표시
* CSS로 대화형 UI 스타일링

### 사용할 기술

* React
* CSS

### 완료 기준

* [ ] ResponseDisplay 컴포넌트 생성
* [ ] 공감 응답 텍스트 렌더링
* [ ] 추가 질문 표시
* [ ] 감정에 따른 스타일 적용
* [ ] Mock 응답이 화면에 표시됨

### 작업 정보

* 예상 시간: 20분
* 우선순위: P1
* 실행 순서: 15
* 작업 날짜: 화요일
* 선행 작업: 13번 (React와 Express 연결)

---

## 15. Express와 Supabase 연결

### 작업 내용

Express의 대화 생성 API에 Supabase 저장 기능을 통합합니다. API 호출 시 응답을 데이터베이스에 저장하도록 연결합니다.

### 구현 방법

* POST /api/conversations에 saveConversation() 호출 추가
* Mock 응답 생성 후 즉시 Supabase에 저장
* 저장된 데이터의 id, created_at을 응답에 포함
* 저장 실패 시 에러 처리 및 500 상태 코드 반환

### 사용할 기술

* @supabase/supabase-js
* Express.js

### 완료 기준

* [ ] POST /api/conversations에 saveConversation 통합
* [ ] Mock 응답 생성 후 Supabase 저장
* [ ] 응답에 id, created_at 포함
* [ ] 저장 실패 시 에러 처리
* [ ] 실제 데이터가 Supabase에 저장됨

### 작업 정보

* 예상 시간: 20분
* 우선순위: P0
* 실행 순서: 17
* 작업 날짜: 수요일
* 선행 작업: 10번 (Supabase 연결), 11번 (저장), 12번 (조회)

---

## 16. 실제 API 응답을 React 화면에 표시

### 작업 내용

Express에서 저장된 데이터를 포함한 실제 API 응답을 React에서 받아 화면에 표시합니다.

### 구현 방법

* 기존 ResponseDisplay에 id, created_at 표시
* 응답 데이터 구조 업데이트
* 대화 목록 상태 추가 (conversations 배열)
* 새 대화 추가 시 목록에 append
* 최신 대화부터 역순 정렬 표시

### 사용할 기술

* React.useState
* fetch API

### 완료 기준

* [ ] API 응답 전체 데이터 화면에 표시
* [ ] 대화 목록 상태 관리
* [ ] 새 대화 추가 시 목록 업데이트
* [ ] 타임스탬프 표시
* [ ] Express 응답 데이터 완전히 활용됨

### 작업 정보

* 예상 시간: 20분
* 우선순위: P1
* 실행 순서: 18
* 작업 날짜: 수요일
* 선행 작업: 13번 (React-Express 연결), 15번 (Express-Supabase 연결)

---

## 17. 오류 및 로딩 상태 처리

### 작업 내용

React에서 API 호출 시 발생하는 오류와 로딩 상태를 적절히 처리하고 사용자에게 피드백을 제공합니다.

### 구현 방법

* 로딩 상태 UI (스피너, 비활성화된 버튼)
* 오류 상태 UI (에러 메시지 표시)
* fetch 오류 처리 (try-catch)
* HTTP 오류 코드 처리 (400, 500)
* 사용자 친화적인 에러 메시지 작성
* 재시도 기능 추가

### 사용할 기술

* React.useState
* try-catch
* CSS

### 완료 기준

* [ ] 로딩 상태 UI 구현
* [ ] 오류 메시지 표시
* [ ] try-catch로 네트워크 오류 처리
* [ ] HTTP 오류 코드 처리
* [ ] 사용자 메시지 명확함

### 작업 정보

* 예상 시간: 20분
* 우선순위: P1
* 실행 순서: 19
* 작업 날짜: 수요일
* 선행 작업: 16번 (실제 API 응답)

---

## 18. 전체 수직 슬라이스 테스트

### 작업 내용

사용자가 상황과 감정을 입력했을 때 최종 저장까지의 전체 프로세스가 정상 작동하는지 E2E 테스트를 수행합니다.

### 구현 방법

* React 화면에서 상황 입력
* 감정 선택
* 제출 버튼 클릭
* Express 서버 로그 확인 (요청 수신, 검증, Mock 응답 생성)
* Supabase 테이블 확인 (데이터 저장 확인)
* React 화면에 AI 응답 표시 확인
* 여러 시나리오 테스트 (유효한 입력, 무효한 입력, 네트워크 오류)

### 사용할 기술

* Manual Testing
* 브라우저 개발자 도구
* Supabase 대시보드

### 완료 기준

* [ ] 전체 프로세스 정상 작동
* [ ] React → Express 요청 전송
* [ ] Express → Supabase 데이터 저장
* [ ] Supabase → React 응답 표시
* [ ] 오류 처리 정상 작동

### 작업 정보

* 예상 시간: 20분
* 우선순위: P0
* 실행 순서: 20
* 작업 날짜: 수요일
* 선행 작업: 17번 (오류 및 로딩 상태)

---

## 19. README에 계획과 Agent 링크 추가

### 작업 내용

프로젝트 README에 관계형 AI 프로젝트 설명, 이번 주 개발 계획, 그리고 계획 Agent 링크를 추가합니다.

### 구현 방법

* README.md 업데이트 (기존 내용 유지)
* "관계형 AI 프로젝트" 섹션 추가
* 핵심 수직 슬라이스 설명
* 기술 스택 명시
* 계획 문서 링크: [이번 주 개발 계획](./agents/relationship-ai-feature-planner.md)
* GitHub Issues 링크: [GitHub Issues](./docs/github-issues.md)

### 사용할 기술

* 마크다운 문서화
* 링크 생성

### 완료 기준

* [ ] README에 프로젝트 설명 추가
* [ ] 핵심 수직 슬라이스 설명
* [ ] 계획 Agent 링크 추가
* [ ] GitHub Issues 링크 추가
* [ ] README 포맷 일관성 유지

### 작업 정보

* 예상 시간: 10분
* 우선순위: P1
* 실행 순서: 21
* 작업 날짜: 수요일
* 선행 작업: 2번 (수직 슬라이스 기준)

---

## 이번 주 작업 요약

### 총 작업 개수: 19개 이슈

**우선순위별**
- P0 (필수): 14개
- P1 (중요): 5개

**영역별**
- Planning: 2개
- Frontend: 4개
- Backend: 6개
- Database: 2개
- Integration: 3개
- Test: 1개
- Docs: 1개

### 예상 총 소요 시간
- 월요일: 150분
- 화요일: 140분
- 수요일: 100분
- **총 390분 = 6시간 30분**

### 작업 흐름
1. 기획 → 2. 서버 환경 구성 → 3. 화면 컴포넌트 → 4. 서버 로직 → 5. DB 스키마 → 6. 서버-DB 연결 → 7. 화면-서버 연결 → 8. 화면 완성 → 9. 전체 테스트 → 10. 문서화

### 제외된 기능 (Backlog)
- 실제 생성형 AI API 연결
- 사용자 인증 (로그인/회원가입)
- 음성 대화
- 장기 기억 기능
- 벡터 데이터베이스
