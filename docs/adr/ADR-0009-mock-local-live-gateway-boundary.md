---
id: ADR-0009
title: Mock·Local Live·배포 Gateway 신뢰 경계
type: adr
status: accepted
date: 2026-07-14
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../work-records/WI-0007-provider-and-live-validation-policy.md
  - ../work-records/WI-0015-naver-api-hub-adapter.md
  - ../work-records/WI-0039-shared-fork-live-security-foundation.md
  - ../work-records/WI-0040-elice-llm-proxy-live-contract.md
  - ADR-0007-provider-and-live-boundary.md
  - ADR-0011-elice-chat-completions-provider-boundary.md
---

# ADR-0009 Mock·Local Live·배포 Gateway 신뢰 경계

## 맥락과 문제

Mock은 정상·실패·timeout을 결정적으로 재현하므로 필수지만, 발급한 NAVER API HUB
인증정보와 현재 endpoint가 실제로 동작하는지는 증명하지 못한다. 반대로 실제 API를
일반 개발과 CI에 사용하면 외부 변동, quota, 비용과 데이터가 자동 검증을 지배한다.

저장소는 여러 관리자가 있는 공유 Fork다. 관리자가 workflow를 변경할 수 있는
저장소의 GitHub secret이나 Environment에 원본 Naver key를 두면 값을 UI에서 볼 수
없더라도 변조한 job을 통해 사용할 수 있다. 별도 저장소 없이 실제 개발·배포를
지원하면서 이 권한을 원본 비밀의 신뢰 경계에서 제외해야 한다.

사용자가 대화에 게시한 기존 Naver secret은 비밀 채널을 벗어났다. 해당 값은
활성 여부와 관계없이 개발·검증에 재사용하지 않고 NAVER API HUB에서 교체한 사실을
사람이 확인해야 한다. 새 값은 대화, Issue, PR, Git, test report와 artifact에 넣지
않는다.

## 판단 기준과 검토 대안

기준은 결정적 자동 회귀, 실제 계약 drift 탐지, 공유 Fork 관리자와 비밀의 분리,
별도 저장소 없는 운영, 최소 호출·비용, 데이터 최소화와 재현 가능한 승인이다.

- Mock만 사용하면 CI는 안전하지만 인증·endpoint·실제 schema를 확인할 수 없다.
- 모든 로컬·CI를 live로 전환하면 실제성은 높아지지만 회귀 결과가 외부 상태와
  비용에 종속되고 비밀 노출면이 커진다.
- GitHub Environment에 원본 key를 두면 구성이 단순하지만 공유 Fork 관리자를 신뢰
  경계에서 제외할 수 없다.
- Mock, 승인된 Local Live, 외부 Gateway를 분리하면 실행 경로가 늘어나지만 각 검증이
  무엇을 증명하는지 명확해진다.

## 결정

외부 연동을 다음 세 경로로 고정한다.

| 경로 | 비밀과 호출 위치 | 증명하는 것 | 금지 사항 |
| --- | --- | --- | --- |
| Mock | 가짜 값, WireMock, Testcontainers | 변환·오류·timeout·도메인 회귀 | 실제 host·key·외부 DNS |
| Local Live | Git에서 제외한 `.env.live.local`, 개발자 PC | 현재 인증·Local·Blog schema 호환성 | 일반 앱·CI·부하 실행, 응답 보존 |
| 배포 Live | 외부 Provider Gateway의 secret | 승인된 배포의 제한된 provider 접근 | GitHub·Vercel·Render에 원본 key 전달 |

`local`, `test`, `load`와 필수 CI는 계속 `mock`만 허용한다. Local Live는 일반
Spring 실행과 분리된 Gradle `naverLiveContractTest` source set과 루트의
`make naver-live-contract`만 사용한다. wrapper는 CI, 잘못된 mode, 누락·중복·미지원
환경 항목을 요청 전에 거부하고, test는 정확한 API HUB HTTPS origin을 코드에 고정한다.
고정된 비개인성 입력으로 Local과 Blog를 application 수준에서 한 번씩 호출하고
adapter transport의 자동 재시도를 비활성화한다. 응답은
메모리에서 schema만 확인한 뒤 폐기한다.

배포 Live에서는 Cloudflare Worker 기반 Approval Gate와 Provider Gateway를 신뢰
경계로 사용한다. GitHub Actions는 원본 provider·배포 secret을 갖지 않고 OIDC token만
Gate에 제시한다. Gate는 저장소·소유자·actor ID, `workflow_dispatch`, main ref, 사용자가
승인한 40자리 SHA, workflow SHA·경로·내용 hash, issuer·audience·만료와 일회성 `jti`를
모두 검증한다. Provider Gateway만 Naver 원본 ID와 key를 보유하고 Local·Blog GET,
허용 query parameter, 고정 HTTPS upstream, timeout과 응답 크기 상한만 허용한다.

현재 변경은 Gate/Gateway 프로그램과 무비밀 자동 검증 기반까지만 만든다. Cloudflare,
Vercel, Render, Neon과 Upstash 리소스 및 secret을 실제로 만들거나 배포한 상태가 아니다.
실제 배포 workflow와 단기 Gateway 자격 발급은 PP-033·PP-035에서 별도 검증한다.

검증 상태는 하나의 `live 완료`로 합치지 않고 다음처럼 기록한다.

| 상태 축 | 완료 조건 |
| --- | --- |
| 코드 자동 검증 | Mock 계약, fail-closed, redaction, OIDC·JWT·Gateway 음성 테스트 통과 |
| 실제 Local Live 검증 | 교체된 key로 Local·Blog 각 1회 2xx와 schema 통과 |
| 클라우드 배포 검증 | Gate·Gateway와 demo stack 배포 후 승인 SHA E2E 통과 |

[NAVER API HUB 공식 계약](https://api.ncloud-docs.com/docs/naver-api-hub-overview)과
[NCP AI·NAVER API 약관](https://www.ncloud.com/policy/terms/opapi)을 사람이 검토해
허용 범위와 표시 의무를 확정하기 전에는 Local·Blog 결과 결합, 추천용 영구 저장,
Elice 등 제3자 LLM 전달을 차단한다. Local Live canary는 일시적인 인증·schema
검증일 뿐 이 제품 사용 방식에 대한 약관 승인이 아니다.

## 결과와 트레이드오프

Mock과 실제 계약 확인이 경쟁하지 않고 서로 다른 실패를 설명할 수 있다. 원본 key는
개발자 PC와 외부 Gateway 밖으로 나가지 않으므로 공유 Fork 관리자가 GitHub 권한만으로
획득할 수 없다. 별도 소스 저장소도 필요하지 않다.

대신 개발자는 Local Live 실행 전에 대상 SHA와 live task diff를 직접 검토해야 한다.
악성 코드가 포함된 working tree에서 task를 실행하면 로컬 비밀이 노출될 수 있으므로
Git ignore만으로 안전이 완성되지는 않는다. 배포에는 Approval Gate, Provider Gateway,
단기 JWT와 replay 저장소라는 추가 운영 요소가 생긴다.

## 검증과 재검토 조건

자동 검증은 실제 key 없이 수행하고 Local Live 결과와 클라우드 배포 결과를 별도
증거로 남긴다. 2026-07-14 Naver Local·Blog 각 1회 canary는 모두
`INVALID_RESPONSE`로 실패했으므로 Local Live 완료 증거가 아니다. 로그·JUnit XML·
artifact·Docker 설정에서 key나 원문 응답을 찾으면
즉시 실패하고 [RUN-0001](../runbooks/RUN-0001-naver-local-live-and-credential-rotation.md)의
유출 대응 절차를 적용한다.

Gate를 우회하는 배포 권한, provider가 제공하는 더 강한 workload identity, Gateway의
장애·비용이 측정되거나 Naver 약관 결론이 바뀌면 경계를 재검토한다. Mock 통과,
Local Live 한 번의 성공 또는 Gateway 코드 테스트 중 어느 하나도 나머지 두 상태의
완료 증거로 대신하지 않는다.
