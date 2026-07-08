# 캘린더 실용성 강화 및 구글 캘린더 동기화 계획

현재 읽기 전용(Read-only)으로 되어 있는 캘린더 화면을, 사용자가 실제로 활용하고 구글 캘린더와 연동할 수 있도록 기능을 고도화하기 위한 기획서입니다.

## User Review Required
- **구글 캘린더 연동 방식 결정**: 
  1. **단방향 동기화(내보내기)**: 우리 앱에서 생성된 일정(AI 제안 및 수동 추가)을 구글 캘린더로 "전송(생성)"만 하는 방식입니다. 구현이 상대적으로 빠르며, MVP 스펙에 가장 적합합니다.
  2. **양방향 동기화**: 구글 캘린더에 있는 기존 일정들도 우리 앱의 캘린더로 불러와서 함께 렌더링하는 방식입니다. 구글 OAuth 로그인 및 캘린더 읽기/쓰기 권한이 모두 필요하며, 구현 볼륨이 꽤 큽니다.
  (현재 MVP 단계이므로 **단방향 동기화(내보내기) + 양방향 조회** 정도를 추천합니다. 어떻게 진행할까요?)

## Open Questions
- **수동 일정 추가 시 AI 분석 적용 여부**: 사용자가 수동으로 캘린더에 일정을 추가할 때, 이 일정도 AI가 판단하는 'Conflict Resolution(일정 충돌)' 계산에 포함시킬까요? (포함시키는 것이 장기적으로 좋습니다!)

## Proposed Changes

### Frontend (React)
- `Calendar.tsx` 내에 **[+ 일정 추가]** 버튼 및 모달 폼 구현
- 새로운 일정을 백엔드로 전송하는 API 연동 (`POST /api/dashboard/action-items`)
- 구글 연동 버튼 클릭 시 백엔드의 OAuth 2.0 로그인 URL로 리다이렉트 처리

#### [MODIFY] [Calendar.tsx](file:///Users/playedwell/git-practice/Naver_Challenge/hub/frontend/src/components/Calendar.tsx)

### Backend (Spring Boot)
- 사용자가 직접 일정을 추가할 수 있는 API 엔드포인트 신설
- 구글 캘린더 API(Google API Client) 의존성 추가
- 구글 OAuth 2.0 인증을 거친 사용자의 액세스 토큰을 활용해, 우리 앱의 일정을 구글 캘린더에 Event로 Insert 하는 서비스 로직 구현

#### [MODIFY] build.gradle (Google API Client 추가)
#### [NEW] GoogleCalendarService.java
#### [MODIFY] DashboardController.java

## Tasks (작업 목록)

| 작업명 (Task) | 설명 | 상태 | 비고 |
| --- | --- | --- | --- |
| 수동 일정 추가 폼 구현 (Front) | 캘린더 화면에서 모달을 띄워 날짜/시간/제목을 입력받음 | [x] | 드래그 앤 드롭으로 슬롯 선택 시 발동 |
| 일정 추가 API 신설 (Back) | 입력받은 수동 일정을 `ActionItem` 엔티티로 DB에 저장 | [x] | `CATEGORY: MANUAL`로 분류 |
| 구글 API 의존성 설정 (Back) | `build.gradle`에 구글 캘린더 API 라이브러리 세팅 | [x] | `google-api-client` |
| 구글 OAuth & 동기화 로직 (Back)| 구글 토큰을 발급받아 특정 일정을 구글 캘린더에 Insert | [x] | 서비스 뼈대 작성 (Credentials 연동 대기) |
| 캘린더 동기화 트리거 연동 (Front)| AI 제안 수락 또는 버튼 클릭 시 구글로 동기화 API 호출 | [x] | |

## Verification Plan
### Automated Tests
- 일정 수동 생성 API 통합 테스트
### Manual Verification
- 프론트엔드 모달을 통해 새 일정을 만들었을 때 달력에 즉시 반영되는지 확인
- 구글 동기화 버튼을 누른 뒤, 실제 본인의 구글 캘린더(web)에 해당 일정이 생성되었는지 눈으로 확인
