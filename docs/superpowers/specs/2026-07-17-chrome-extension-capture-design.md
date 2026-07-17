# Chrome 확장 즉시 저장 설계

## 상태

- 이슈: [#39 Chrome 확장으로 현재 탭을 즉시 저장한다](https://github.com/ppre1ude/hub/issues/39)
- 확정일: 2026-07-17
- 상태: 사용자 승인

## 목표

로그인한 사용자가 PC Chrome에서 확장 아이콘을 한 번 클릭하면 현재 탭의 URL과 제목을 즉시 저장한다. 저장 이후 메모는 선택 사항으로 남기되, 메모를 작성하려는 사용자도 웹사이트로 이동하지 않고 확장 프로그램 안에서 작업을 끝낼 수 있어야 한다.

## 확정한 사용자 흐름

```text
확장 아이콘 클릭
       ↓
현재 탭 링크 즉시 저장
       ↓
  `저장됨` 알림
   ├─ 닫기 → 종료
   └─ 메모 남기기 → 확장 프로그램의 작은 메모창
                              ├─ 저장 → 메모 반영 후 닫기
                              └─ 닫기 → 링크만 유지
```

- 확장 아이콘 클릭은 입력 팝업을 먼저 열지 않는다.
- 링크 저장 성공은 메모 작성 여부와 무관하게 즉시 확정한다.
- 알림의 `메모 남기기`를 누르면 Chrome 확장 프로그램이 소유한 작은 창을 연다. 아맞다 웹사이트는 열지 않는다.
- 메모를 닫거나 저장에 실패해도 이미 저장된 링크는 취소하지 않는다.
- 웹과 모바일의 기존 `저장 → 선택적 메모` 흐름은 변경하지 않는다.

## 처음 사용하는 경우의 인증

확장 프로그램과 웹사이트는 저장 공간이 분리되어 있으므로 웹사이트 로그인 상태를 몰래 복사하지 않는다.

1. 세션이 없는 상태에서 처음 확장 아이콘을 클릭한다.
2. `chrome.identity.launchWebAuthFlow()`로 Supabase Google 로그인을 시작한다.
3. 로그인 성공 뒤 처음 클릭했을 때 수집한 탭을 바로 저장한다.
4. 세션은 `chrome.storage.local`을 사용하는 Supabase 사용자 정의 저장소에 보관한다.
5. 이후 클릭에서는 저장된 세션을 확인하고, 필요할 때만 토큰을 갱신한 뒤 즉시 저장한다.

세션이 만료되어 갱신할 수 없으면 실패 알림에서 다시 로그인을 시작할 수 있게 한다. 서비스 워커가 언제든 종료될 수 있으므로 인증 상태와 진행 중인 메모 대상은 메모리가 아니라 확장 저장소에 둔다.

## 확장 프로그램 구성

확장은 웹 애플리케이션과 배포 단위가 다르므로 루트의 `extension/`에 둔다. 빌드 결과는 `dist/chrome-extension/`에 생성한다.

### Manifest V3 서비스 워커

- `chrome.action.onClicked`에서 현재 탭의 URL과 제목을 받는다.
- 기본 팝업인 `action.default_popup`은 선언하지 않는다.
- `chrome://`, `edge://`, 확장 페이지처럼 저장할 수 없는 프로토콜은 서버 호출 전에 거절한다.
- 공통 캡처 API에 `{ source: "chrome_extension", url, title }`을 전달한다.
- 생성과 중복 모두 공통 캡처가 돌려준 인사이트 ID를 메모 대상으로 사용한다.
- 저장 결과를 Chrome 알림으로 표시하고 성공 알림에 `메모 남기기` 버튼을 제공한다.

### 메모창

- 알림 버튼을 누르면 `chrome.windows.create({ type: "popup" })`로 확장 내부 페이지를 연다.
- 메모창에는 저장한 링크의 제목, 최대 200자인 한 줄 메모 입력, `메모 저장`, `닫기`만 둔다.
- White Canvas 디자인 계약의 토큰, 1px 경계, 명시적 레이블, 44px 이상 조작 영역과 `focus-visible`을 적용한다.
- 메모 저장 중에는 중복 제출을 막고, 실패하면 입력값과 재시도 버튼을 유지한다.
- 성공하면 `메모 저장됨`을 짧게 표시한 뒤 창을 닫는다.

### 빌드

- 기존 TypeScript와 Vite 도구를 사용해 서비스 워커와 메모 페이지를 별도로 빌드한다.
- Manifest가 참조하는 파일명은 고정하고, 애플리케이션·Supabase 원점은 빌드 시점 환경 값으로 제한한다.
- 확장 전용 빌드 명령과 전체 빌드 명령을 분리하되 CI에서 둘 다 검증할 수 있게 한다.

## 서버 계약

기존 `POST /api/insights/capture`를 그대로 사용한다. 이 응답은 새 저장과 중복 저장 모두 대상 인사이트 ID를 반환하므로 동일한 메모 흐름을 적용할 수 있다.

메모는 확장에서 데이터베이스를 직접 수정하지 않고 인증된 전용 API로 보낸다.

```http
PATCH /api/insights/:insightId/memo
Authorization: Bearer <access-token>
Content-Type: application/json

{ "memo": "다음 기획 회의에서 참고" }
```

- 기존 Supabase 사용자 인증기로 액세스 토큰의 사용자를 확인한다.
- UUID 형식의 인사이트 ID와 200자 이하 문자열만 허용한다.
- 앞뒤 공백을 제거하고 빈 문자열은 `null`로 저장한다.
- 사용자 토큰으로 만든 Supabase 클라이언트와 RLS를 사용하고, 사용자 ID 조건을 함께 적용한다.
- 다른 사용자의 인사이트이거나 존재하지 않는 ID는 상세 정보를 드러내지 않는 `not-found`로 처리한다.
- 성공, 잘못된 요청, 인증 실패, 대상 없음, 쓰기 실패를 제한된 결과 타입과 HTTP 상태로 변환한다.

이 API는 확장 메모에 필요한 좁은 변경만 허용한다. 제목, 카테고리, URL 등 다른 필드는 수정하지 않는다.

## 최소 권한과 보안 경계

Manifest 권한은 다음으로 제한한다.

- `activeTab`: 사용자가 확장 아이콘을 누른 현재 탭의 URL과 제목만 일시적으로 읽는다.
- `identity`: 처음 로그인과 재로그인을 처리한다.
- `storage`: 세션과 실패한 메모 초안을 보존한다.
- `notifications`: 저장 결과와 선택적 메모 진입을 표시한다.
- `host_permissions`: 아맞다 API와 Supabase 인증 원점만 빌드 환경별로 선언한다.

`tabs`, `scripting`, `<all_urls>`와 전체 사이트 콘텐츠 접근 권한은 요청하지 않는다. 현재 탭의 페이지 내용이나 DOM도 읽지 않는다. 서비스 역할 키는 확장 번들, 서버 요청과 테스트 어디에도 포함하지 않는다.

## 오류와 복구

| 상황               | 사용자에게 보이는 결과        | 복구                                       |
| ------------------ | ----------------------------- | ------------------------------------------ |
| 정상 저장          | `저장됨`과 `메모 남기기`      | 닫거나 메모 작성                           |
| 이미 저장한 링크   | `이미 저장됨`과 `메모 남기기` | 기존 인사이트에 메모 작성                  |
| Chrome 내부 페이지 | `이 페이지는 저장할 수 없음`  | 일반 웹페이지에서 다시 클릭                |
| 세션 없음·만료     | Google 로그인 창              | 로그인을 완료하면 처음 클릭한 탭 저장 재개 |
| 캡처 API 실패      | `저장하지 못함`               | 같은 탭에서 다시 클릭                      |
| 메모 API 실패      | 메모창에서 오류와 입력값 유지 | 메모만 다시 저장하거나 닫기                |

오류 메시지는 내부 상태, 토큰, 서버 응답 본문을 노출하지 않는다. 메모 실패는 링크 저장 성공을 되돌리지 않는다.

## 테스트 전략

### 자동 테스트

- Manifest에 필요한 권한만 있고 기본 팝업, `tabs`, `scripting`, `<all_urls>`가 없는지 확인한다.
- 현재 탭의 URL·제목을 `chrome_extension` 출처로 전송하는지 확인한다.
- 새 저장과 중복 저장 모두 성공 알림과 올바른 메모 대상 ID를 만드는지 확인한다.
- 인증 없음, 토큰 갱신 실패, 지원하지 않는 프로토콜과 네트워크 실패의 안내를 확인한다.
- 알림의 메모 버튼이 웹 URL이 아닌 확장 메모창을 여는지 확인한다.
- 메모 API의 인증, 입력 정규화, RLS 대상 제한, 없음과 쓰기 실패를 확인한다.
- 메모 실패 뒤 링크가 유지되고 입력값으로 재시도할 수 있는지 확인한다.

### 수동 검수

자동 테스트와 빌드가 통과한 뒤 실제 Chrome에서 다음 항목만 사람이 확인한다.

- 압축 해제된 확장을 설치하고 처음 클릭에서 Google 로그인 후 원래 탭이 저장되는지
- 두 번째 클릭부터 팝업 없이 즉시 저장되는지
- 성공 알림에서 메모창을 열고, 웹사이트 전환 없이 메모를 저장하거나 닫을 수 있는지
- 확장 권한 화면에 전체 사이트 상시 접근 권한이 표시되지 않는지

실제 로그인 검수 전에는 운영 확장의 `chrome.identity.getRedirectURL()` 값을 Supabase OAuth 허용 URL에 등록하고, 빌드 환경에 운영 API와 Supabase 원점을 지정한다. 이 외부 설정은 저장소에 비밀값을 추가하지 않는다.

## 고려한 대안

### 저장 뒤 웹사이트 열기

기존 웹 메모 화면을 재사용하기 쉽지만, 확장에서 시작한 짧은 저장 작업이 웹사이트 전환으로 끊긴다. 사용자가 확장 안에서 작업을 끝내길 원하므로 채택하지 않는다.

### 확장 아이콘 클릭 시 항상 팝업 열기

메모 입력은 쉽지만 링크를 즉시 저장한다는 핵심 흐름에 입력 화면이 먼저 끼어든다. 채택하지 않는다.

### 선택한 방식: 알림과 확장 내부 메모창

첫 클릭의 즉시 저장을 지키면서 메모를 원하는 사용자에게만 작은 입력창을 제공한다. Chrome의 알림 버튼과 확장 소유 팝업 창을 이용하므로 웹사이트 전환 없이 두 흐름을 분리할 수 있다.

## 참고 자료

- [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/api/identity)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Chrome Notifications API](https://developer.chrome.com/docs/extensions/reference/api/notifications)
- [Chrome Windows API](https://developer.chrome.com/docs/extensions/reference/api/windows)
- [Chrome 확장의 교차 출처 요청](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests)
- [Supabase JavaScript 인증](https://supabase.com/docs/reference/javascript/auth)
