# Runtime Ownership Spike에서 file auth store를 사용한다

분류: 완료·역사 기록

Runtime Ownership Spike는 app-managed `CODEX_HOME` 안에서 ChatGPT subscription 로그인을 검증하기 위해 `cli_auth_credentials_store = "file"`을 사용했다. 기본 `auto`가 OS keychain을 선택하면 전역 Codex 상태에 의존하지 않았다는 격리 근거를 관찰하기 어려우므로, 이 Spike에서는 `auth.json`의 존재를 확인할 수 있는 방식을 의도적으로 선택했다.

이 결정은 제품의 영구 인증 저장 정책이 아니다. Spike 종료 뒤 제품 인증 방식은 별도 보안·배포 요구에 따라 결정한다.
