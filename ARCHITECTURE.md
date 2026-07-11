# Architecture

## 주요 디렉터리

- `src/`: React 앱의 현재 구현
- `src/assets/`: 이미지와 Vite 기본 자산
- `docs/`: 제품 기획, 개발 참고 문서, 다이어그램
- `public/`: 정적 공개 파일
- `skills/cafe-stamp-design-system/`: 이 프로젝트의 디자인 시스템 스킬

## 애플리케이션 진입점

- `src/main.jsx`가 `#root`에 React 앱을 마운트합니다.
- `src/App.jsx`가 현재 전체 화면과 상태를 포함합니다.
- `src/index.css`는 전역 CSS를 설정합니다.
- `src/App.css`는 앱 화면 스타일을 담당합니다.

## 페이지 또는 화면 구조

현재 라우터는 없습니다. `App.jsx` 내부 상태로 손님 화면과 사장님 화면을 전환합니다.

- 역할 선택 화면: `RoleLogin`
- 손님 홈: `CustomerHome`
- 손님 쿠폰: `CouponsView`
- 손님 알림: `NotificationsView`
- 손님 마이페이지: `MyPage`
- 사장님 화면: `OwnerDashboard`

## 컴포넌트 구성

현재 컴포넌트는 모두 `src/App.jsx` 한 파일 안에 있습니다. 작은 데모 화면에는 충분하지만, 기능이 늘어나면 화면 또는 역할 기준으로 분리하는 것이 좋습니다.

## 현재 데이터와 상태 흐름

- 카페, 쿠폰, 알림 데이터는 `src/App.jsx` 상단의 정적 배열입니다.
- `role` 상태로 손님/사장님 화면을 전환합니다.
- `activeTab` 상태로 손님 하단 탭을 전환합니다.
- `couponSort` 상태로 쿠폰 정렬 기준을 바꿉니다.
- `nickname` 상태는 마이페이지 입력값과 헤더 표시를 연결합니다.
- 외부 API, 인증, 라우팅, 데이터베이스 연결은 아직 없습니다.

## 공통 코드의 위치

현재 별도의 공통 유틸, 서비스, 라우트, 공통 컴포넌트 디렉터리는 없습니다. 전역 스타일은 `src/index.css`, 화면 스타일은 `src/App.css`에 있습니다.

## 새 기능을 추가할 권장 위치

- 화면이 늘어나면 `src/pages/` 또는 `src/components/`를 추가합니다.
- Supabase 등 외부 데이터 접근이 생기면 `src/services/`에 모읍니다.
- 앱 라우팅이 필요해지면 `src/app/` 또는 `src/routes/`에 라우터와 보호 라우트를 둡니다.
- 공통 UI가 반복되면 `src/components/common/`로 분리합니다.
- 정적 데모 데이터가 임시로 더 필요하면 실제 서비스 코드와 섞이지 않도록 별도 모듈로 분리합니다.

## 현재 결정되지 않은 사항

- 실제 인증 방식과 계정 생성 절차
- Supabase 프로젝트와 환경변수 값
- 데이터베이스 스키마와 RLS 정책의 실제 구현
- 라우팅 구조와 URL별 화면 구성
- 테스트 도구 도입 시점과 테스트 범위
- 배포 환경과 배포 자동화 방식
