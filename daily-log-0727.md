# 7/27 (일) — 발표 자료 제작 및 보안 정리

## 주요 작업 리스트
- 화면→서버→DB→외부API 데이터 흐름도를 SVG로 시각화
- 앱 디자인(다크 네이비 + 오렌지-로즈 그라디언트)과 동일한 톤의 HTML 발표 자료 제작 (8슬라이드, 키보드 네비게이션)
- PPTX 발표 자료도 병행 제작 (pptxgenjs 활용)
- 발표 자료를 Vercel에 배포하여 공개 링크 생성 (hub-g4ih.vercel.app/presentation.html)
- git에 노출되어 있던 Firebase API 키(.env.local) 제거 및 .gitignore 추가
- 불필요 파일 삭제 — 구 MVP 파일(2_mvp (1).tsx), 루트 index.html
- 프로젝트명 Itda → Eat-da로 통일 (README, 문서)
- Mermaid 아키텍처 다이어그램 및 에브리타임 XML API 테스트 문서 추가

## 내가 설명할 수 있는 부분
- 앱의 6계층 아키텍처: 사용자 화면(React) → API 호출 → Express 라우터 → 비즈니스 로직 → MongoDB/외부 API → 응답
- Firebase Authentication의 Google OAuth 흐름: signInWithPopup → credential에서 accessToken 추출 → Google Calendar API 호출
- 에브리타임 시간표 파싱: 공유 URL에서 identifier 추출 → everytime.kr API에 POST → XML 응답의 subject/data 태그에서 day, starttime, endtime 추출 → 5분 단위(starttime * 5)로 실제 시간 변환
- .gitignore에 .env.local을 추가하고 git rm --cached로 추적 해제하는 것과, 이미 git history에 남은 키는 별도로 rotate해야 하는 차이

## 아직 이해 못 한 부분
- pptxgenjs로 만든 PPTX 파일의 시각적 품질 검증 방법 — LibreOffice가 없어서 PDF 변환이 안 됨
- Vercel의 자동 배포가 어떤 브랜치를 감시하는지, preview deploy와 production deploy의 차이
- Fork 레포에서 upstream으로 PR을 보낼 때 브랜치 전략의 best practice

## 새로 알게 된 것
- pptxgenjs로 Node.js 스크립트에서 프로그래밍 방식으로 PPTX를 생성할 수 있음 — slide.addText(), slide.addShape() 등으로 슬라이드 구성
- git remote prune으로 원격에서 삭제된 브랜치의 로컬 추적 ref를 정리할 수 있음
- Firebase API 키는 클라이언트에 노출되어도 Firebase Security Rules로 보호 가능하지만, 그래도 환경변수로 관리하는 것이 best practice
- Tailwind CSS의 클래스 네이밍에서 앱의 디자인 시스템을 역으로 추출할 수 있음 (bg-gradient-to-r from-orange-500 to-rose-500 → 오렌지-로즈 그라디언트)
