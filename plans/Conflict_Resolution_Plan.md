# Conflict Resolution & Calendar 페이지 구현 계획

`PROJECT_SPEC.md`의 핵심 차별화 기능인 **일정 충돌 재배치(Conflict Resolution)** 로직 및 프론트엔드 **사용자 캘린더 페이지**를 추가하기 위한 구현 계획서입니다.

## User Review Required
- **Conflict Resolution 데이터 구조**: 여러 일정의 충돌 상황과 그에 대한 재배치 제안(시나리오)을 저장하기 위해, 기존 `ActionItem` 엔티티 내에 JSON 형태로 저장할지, 아니면 `ConflictScenario`라는 별도의 엔티티를 생성할지 결정이 필요합니다. MVP 단계에서는 `ActionItem`에 필드를 추가하거나 가벼운 엔티티로 분리하는 것을 제안합니다.
- **Frontend 라우팅**: 현재 `App.tsx`는 상태(state) 기반으로 뷰를 전환하고 있습니다. 캘린더 페이지 추가를 위해 `react-router-dom`을 도입하여 본격적인 SPA 라우팅을 구성하는 것을 제안합니다.

## Open Questions
- **캘린더 UI 라이브러리**: 프론트엔드 캘린더 화면을 구현할 때, `react-big-calendar` 같은 외부 라이브러리를 도입하여 커스텀 스타일링(파스텔톤)을 적용할까요? 아니면 Tailwind CSS를 활용해 월간(Monthly) 뷰를 직접 구현하는 것이 좋을까요?
- **충돌 재배치 UI 노출 방식**: 충돌 제안 카드를 대시보드 상단에 띄우고, 수락 시 캘린더 페이지로 넘어가서 조정된 일정을 보여주는 흐름이 맞을까요?

## Proposed Changes

### Frontend (React + Tailwind)
- `react-router-dom`을 도입하여 `/dashboard`, `/calendar` 라우팅 구성
- 캘린더 뷰 컴포넌트 추가 및 디자인 시스템(파스텔톤) 적용
- 대시보드 내 "일정 충돌 감지 및 재배치 제안" Alert 카드 UI 추가

#### [MODIFY] [App.tsx](file:///Users/playedwell/git-practice/Naver_Challenge/hub/frontend/src/App.tsx)
#### [MODIFY] [Dashboard.tsx](file:///Users/playedwell/git-practice/Naver_Challenge/hub/frontend/src/components/Dashboard.tsx)
#### [NEW] [Calendar.tsx](file:///Users/playedwell/git-practice/Naver_Challenge/hub/frontend/src/components/Calendar.tsx)

### Backend (Spring Boot)
- 캘린더 뷰에 렌더링할 사용자 일정 조회 API 추가
- 충돌 시나리오(Conflict Resolution) 정보를 담을 필드/엔티티 설계 및 API 응답에 포함
- (LLM 연동은 이후 별도 Phase로 진행하더라도, 뼈대 데이터 구조를 먼저 완성)

#### [MODIFY] ActionItem.java (엔티티 수정)
#### [NEW] CalendarController.java (일정 조회 API)

## Tasks (작업 목록)

| 작업명 (Task) | 설명 | 상태 | 비고 |
| --- | --- | --- | --- |
| 프론트엔드 라우팅 설정 | `react-router-dom` 설치 및 `App.tsx` 라우팅 구조로 변경 | [x] | |
| 캘린더 컴포넌트 마크업 | `Calendar.tsx` 생성 및 파스텔톤 플랫 디자인 적용 | [x] | |
| 재배치 제안 카드 UI 추가 | `Dashboard.tsx`에 일정 충돌 경고 및 AI 제안 카드 마크업 | [x] | |
| 백엔드 일정 조회 API | 캘린더 렌더링을 위한 월별/주별 일정 데이터 조회 엔드포인트 구현 | [x] | |
| Conflict 데이터 구조 설계 | 일정 충돌 데이터 및 Irreversibility 점수를 저장할 스키마 반영 | [x] | |

## Verification Plan
### Automated Tests
- 백엔드 캘린더 일정 조회 API 단위 테스트 작성
### Manual Verification
- 프론트엔드 실행 후 네비게이션 바를 통해 Dashboard와 Calendar 페이지 간 전환 확인
- 임의의 충돌 데이터를 목업으로 넣어 대시보드 상단에 재배치 카드가 정상 렌더링되는지 확인
