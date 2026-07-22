# Runtime Ownership Spike에서 file auth store를 사용한다

분류: 완료·역사 기록

Runtime Ownership Spike는 app-managed `CODEX_HOME` 안에서 ChatGPT subscription 로그인을 검증하기 위해 `cli_auth_credentials_store = "file"`을 사용했다. 기본 `auto`가 OS keychain을 선택하면 전역 Codex 상태에 의존하지 않았다는 격리 근거를 관찰하기 어려우므로, 이 Spike에서는 `auth.json`의 존재를 확인할 수 있는 방식을 의도적으로 선택했다.

이 결정은 제품의 영구 인증 저장 정책이 아니다. 후속 제품 account·credential authority는 [ADR 0017 — 제품 account lifecycle에 Codex-managed Browser OAuth를 사용한다](0017-use-codex-managed-browser-oauth-for-product-account-lifecycle.md)가 새로 결정하며, 이 문서는 Spike 당시 증거로 남는다.
