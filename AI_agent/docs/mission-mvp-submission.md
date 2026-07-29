# 작은 문제를 해결하는 서비스 MVP 구현 결과물

## 제출 링크

- GitHub 저장소: https://github.com/samingming/hub/tree/N155_%EC%A0%95%EC%82%AC%EC%9E%84/AI_agent
- 배포 URL: https://career-mission-ai.vercel.app/
- 백엔드 API: https://career-mission-ai.onrender.com

## 문제 정의

취업 준비를 시작하는 학생은 본인의 스펙이 목표 직무에 얼마나 맞는지 판단하기 어렵고, 다음에 무엇을 해야 하는지도 구체적으로 정리하기 어렵다. 이 MVP는 사용자가 기본 정보와 스펙을 입력하면 준비도 분석, 추천 미션, 결과 제출, 피드백, 포트폴리오 초안까지 이어지는 작은 웹서비스 흐름을 제공한다.

## 구현 범위

### 입력 폼

- 회원가입 및 로그인
- 학교 검색과 학과 검색
- 목표 직무, 학점, 자격증, 어학, 프로젝트, 활동, 기술 스택 입력
- 미션 결과 URL 또는 파일 제출

### DB 저장

- Firebase Auth로 사용자 인증 및 이메일 인증
- Express API에서 Firebase ID token 검증
- Prisma를 통해 PostgreSQL/Supabase DB에 사용자, 스펙, 분석 결과, 미션 진행률, 제출 결과 저장
- 회원 정보와 미션 제출 정보는 새로고침 후에도 다시 조회 가능

### 조회 화면

- 마이페이지에서 회원 정보, 스펙, 분석 결과, 추천 미션 확인
- 미션 상세 화면에서 체크리스트 진행률 표시
- 결과 업로드 후 제출 내용, AI 피드백, 포트폴리오 초안 확인

### 배포

- 프론트엔드: Vercel
- 백엔드: Render
- DB: PostgreSQL/Supabase
- 인증: Firebase Authentication

## 실행 화면 설명

1. 회원가입 화면에서 이름, 아이디, 이메일, 학교, 학과, 비밀번호를 입력한다.
2. Firebase 인증 메일을 통해 이메일 인증을 완료한다.
3. 로그인 후 스펙 등록 화면에서 목표 직무와 보유 역량을 입력한다.
4. 분석 결과 화면에서 준비도 점수와 보완 항목을 확인한다.
5. 추천 미션 목록에서 "작은 문제를 해결하는 서비스 MVP 구현" 미션을 선택한다.
6. 미션 상세 화면에서 단계별 체크리스트를 완료한다.
7. 결과 업로드 화면에서 GitHub URL과 구현 설명을 제출한다.
8. 마이페이지에서 저장된 제출 결과와 진행 상태를 다시 조회한다.

## 데이터 흐름

```text
React 화면
  -> Firebase Auth 이메일 인증
  -> Express API
  -> Firebase Admin ID token 검증
  -> Prisma
  -> PostgreSQL/Supabase 저장 및 조회
```

## 구현 과정 요약

- React/Vite 기반으로 회원가입, 로그인, 스펙 등록, 미션 상세, 결과 업로드, 마이페이지 화면을 구성했다.
- Express API를 추가해 프론트엔드 입력값을 서버에서 처리하도록 분리했다.
- Prisma schema와 migration을 작성해 사용자, 스펙, 분석 결과, 미션 제출 데이터를 저장했다.
- Firebase Authentication을 연결해 실제 이메일 인증 기반 회원가입 흐름을 구현했다.
- Vercel과 Render에 각각 프론트엔드와 백엔드를 배포하고, 환경변수를 분리해 운영 배포 URL에서 동작하도록 설정했다.

## 검증 결과

- 회원가입 시 Firebase 사용자 생성과 인증 메일 발송 확인
- 인증 완료 후 이메일 또는 아이디 로그인 확인
- 스펙 입력 데이터 저장 확인
- 미션 체크리스트 진행률 저장 확인
- 결과 업로드 데이터 저장 및 재조회 확인
- `npm run build` 통과
- Prisma Client 생성 및 백엔드 문법 검사 통과

## README에 포함한 내용

- 서비스 소개
- 기술 스택
- 주요 기능
- 프론트엔드/백엔드 실행 방법
- 환경변수 설정
- DB schema와 데이터 흐름
- Vercel/Render 배포 방법
- MVP 한계와 추후 개선점

## MVP 한계와 개선점

- 파일 업로드는 현재 DB 저장 중심으로 구현되어 있어 실제 운영에서는 Supabase Storage 또는 S3 같은 오브젝트 스토리지 분리가 필요하다.
- AI 분석은 MVP 검증을 위한 규칙 기반 흐름이 포함되어 있어, 실제 서비스에서는 OpenAI API 연동과 프롬프트 품질 개선이 필요하다.
- Firebase, Render, Supabase 환경변수 관리가 중요하므로 운영 전 secret rotation과 접근 권한 정리가 필요하다.
