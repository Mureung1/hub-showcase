# 📅 [편방] 웹 개발 기본 구조 학습 중심 개발 백로그

> **멘토링 핵심 목표:** 실제 서비스 배포보다 **Frontend - Backend - Database 간의 데이터 흐름과 역할 분담**을 배우는 것을 최우선으로 합니다. EasyOCR 결합 대신 Mock 데이터를 활용하여 핵심 CRUD 흐름을 마스터합니다.

---

## 📌 1. 프로젝트 학습 목표
- **Frontend (화면)**: 사용자 인터페이스 제공 및 `fetch` API를 이용한 Backend 비동기 통신 학습
- **Backend (서버)**: API 라우팅 설계, 비즈니스 로직(가성비 검증) 처리, Database 제어(SQL 실행) 및 데이터 중개 역할 학습
- **Database (저장소)**: 관계형 데이터베이스 SQLite3 테이블 구조 이해 및 데이터 영구 저장(CRUD) 학습

---

## 📅 2. 학습 로드맵 (Milestones)

### 1~2주차: UI 기초 및 Mock API 구축 (완료)
- [x] 개발 환경 세팅 (Flask 백엔드 및 JS 프론트엔드 폴더 구조)
- [x] 프론트엔드 메인 UI 마크업 및 이미지 파일 선택 컴포넌트 세팅
- [x] 파일명 기반 Mock 데이터 매핑 API 구조 설계
- [x] API 호출 레이어 분리 및 로딩 애니메이션/토스트 UI 연동

### 3주차: BE-DB 연동 및 데이터 흐름 완성 (7/20 ~ 7/24) - [완료 🎉]
- [x] **[1단계] Database 구조 파악 및 테이블 생성 실습**
  - [pyeonbang.db](file:///home/ohbyeongjun/AI%20Agent/hub/pyeonbang/backend/pyeonbang.db) SQLite3 테이블 구조 이해 및 초기화 코드 분석
- [x] **[2단계] Backend(Flask) DB CRUD API 구현**
  - GET `/api/history`: DB에서 저장된 내역을 읽어와 JSON 형태로 반환하는 로직 구현
  - POST `/api/history`: 사용자가 보낸 분석 결과를 DB에 안전하게 기록(INSERT)하는 로직 구현
  - DELETE `/api/history`: 누적 데이터를 DB에서 전체 또는 개별 삭제(DELETE)하는 로직 구현
- [x] **[3단계] Frontend(JS) fetch API 연결 및 화면 동기화**
  - 기존 LocalStorage 의존도를 낮추고 백엔드 DB 서버로부터 실시간 데이터를 받아와 대시보드 및 히스토리 이력 갱신

### 4주차: 비즈니스 로직 설계 및 종합 복습 (7/27 ~ 7/31)
- [x] **[4단계] 3단계 가성비 필터링 비즈니스 로직 결합 - [완료 🎉]**
  - 가격과 영양성분으로 등급(1, 2, 3등급)을 실시간으로 계산하는 공식을 Backend에 구현
- [x] **[5단계] 예외 처리와 로딩 경험(UX) 고도화 및 최종 복습 - [완료 🎉]**
  - 네트워크 단절, 비정상적인 가격 입력 등 예외 상황에서의 데이터 유실 방지와 에러 렌더링
  - FE-BE-DB 전체 데이터 통신 아키텍처 다이어그램 기반 종합 멘토링 정리

---

## 🏆 프로젝트 최종 완료 및 서비스 배포 (7/31 완료 🎉)
- **실제 AI/OCR 엔진 연동**: Gemini Vision 모델 기반 영양성분표 자동 분석 API 구축
- **3단계 가성비 산출 로직**: 단백질 함량 대비 가격 비 비즈니스 알고리즘 구현
- **클라우드 배포 완료**: Render 플랫폼 기반 WSGI Gunicorn + Flask 백엔드 서비스 라이브 오픈 (`https://pyeonbang.onrender.com`)
- **최종 과제 및 쇼케이스 제출**: 쇼케이스 등록 (`showcase.json`) 및 시연 영상 링크 연결 완료