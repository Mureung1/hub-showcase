---
id: ADR-0011
title: Elice Chat Completions MVP Provider와 데이터 경계
type: adr
status: accepted
date: 2026-07-14
owners:
  - placepick-team
related:
  - ../roadmap.md
  - ../work-records/WI-0040-elice-llm-proxy-live-contract.md
  - ../runbooks/RUN-0002-elice-llm-local-live-and-token-rotation.md
  - https://github.com/gdh0730/hub/issues/42
  - ADR-0009-mock-local-live-gateway-boundary.md
  - ADR-0013-naver-elice-linked-live-boundary.md
---

# ADR-0011 Elice Chat Completions MVP Provider와 데이터 경계

## 맥락과 문제

조건 추출과 추천 이유에는 schema가 고정된 LLM 출력이 필요하다. 기존 문서는 OpenAI
Responses API 직접 호출을 기본 방향으로 정했지만, 현재 프로젝트가 실제 확인할 수 있는
후보는 Elice의 OpenAI-compatible proxy다. 호환 API라는 명칭만으로 endpoint, model,
Structured Outputs, 저장·로깅 정책과 오류 의미까지 OpenAI와 같다고 가정할 수 없다.

Embedding endpoint도 제공되지만 현재 사용자 여정에는 vector 검색이나 의미 기반 중복
제거가 필요하지 않다. 기능 목적 없이 embedding을 runtime에 연결하면 Naver·사용자
텍스트의 제3자 전달, vector 저장·삭제와 품질 기준이 추가된다.

## 판단 기준과 검토 대안

기준은 실제 사용할 수 있는 계약, strict schema, provider 교체 가능성, 호출·비용 상한,
비밀 분리, 개인정보와 Naver 데이터 최소화, Mock 회귀의 결정성이다.

- OpenAI Responses 직접 호출은 공식 기능과 문서가 명확하지만 별도 OpenAI credential,
  비용과 데이터 처리 검토가 필요해 현재 기본 경로로 두지 않는다.
- Elice Chat Completions는 현재 제공된 proxy와 맞지만 OpenAI 호환 범위와 Elice 정책을
  실제 계약 검증과 사람 검토로 확인해야 한다.
- 자유 JSON이나 일반 텍스트 parsing은 schema drift와 환각을 조용히 수용하므로 제외한다.
- Embedding을 바로 추천·중복 제거에 사용하면 사용자 가치와 품질 기준 없이 데이터
  수명·vector 저장소가 늘어나므로 capability 확인까지만 허용한다.

## 결정

MVP LLM provider 방향은 Elice OpenAI-compatible Chat Completions로 정한다. Local Live
계약 하네스는 승인된 `https://mlapi.run/{canonical-uuid}/v1` base 아래
`POST /chat/completions`를 사용하고 proxy namespace가 포함된
`openai/gpt-4.1-mini`를 exact pin한다. `stream=false`, `store=false`,
`temperature=0`, 제한된 `max_completion_tokens`, tool 없음과 strict
`response_format=json_schema`를 요구한다. canary는 합성 입력으로 추가 field가 없는
`{"status":"ok"}`만 허용한다.

[OpenAI의 GPT-4.1 mini 사양](https://developers.openai.com/api/docs/models/gpt-4.1-mini)은
공식 모델이 Chat Completions, Responses와 Structured Outputs를 지원한다고 명시한다.
이 문서는 호환 계약의 비교 기준일 뿐 Elice proxy가 같은 보관 정책을 제공한다는
증거가 아니다. PP-038의 실제 Elice canary는 2026-07-14 strict schema를 통과했지만,
데이터 정책과 제품 runtime은 별도 승인으로 남는다.

[Elice ML API key 문서](https://help.elice.io/help/docs/elicecloud/ml-api/api-key)는
API key를 Bearer header로 전달하고 잘못되거나 만료된 key는 인증 오류가 된다고 설명한다.
[Elice Model Library](https://elice.io/ax/model-library/1d1d8f2e-a255-4d6d-9177-c43362887502)는
`mlapi.run` 배포 base 아래 Chat Completions와 구조화 출력을 제공하는 예시를 제시한다.
다른 모델의 예시를 현재 배포의 성공 증거로 사용하지 않고 실제 canary로 확인한다.

직접 OpenAI Responses API는 provider port 뒤의 재검토 가능한 대안으로 남긴다. Elice
실패 시 Responses API로 자동 fallback하지 않는다. provider 또는 API surface 변경은
별도 credential·비용·개인정보·Eval 검토와 ADR 변경을 거친다.

Embedding은 `POST /embeddings`, exact model
`openai/text-embedding-3-small`, 합성 문자열 하나와 `encoding_format=float`로
가용성만 확인한다. [OpenAI Embeddings 가이드](https://developers.openai.com/api/docs/guides/embeddings)는
공식 `text-embedding-3-small`의 기본 vector 길이를 1,536으로 설명한다. Local Live는
data 한 건, index 0, 1,536개의 finite number만 검증하고 vector를 출력·저장하지 않는다.
Embedding은 추천, 검색, 점수, 중복 제거와 운영 DB에 연결하지 않는다.

요청 model은 위 provider-prefixed 값으로 고정한다. 응답 model metadata는 provider가
공식 base alias 또는 승인된 snapshot으로 정규화할 수 있으므로 Chat은 요청 alias,
`gpt-4.1-mini`, `gpt-4.1-mini-2025-04-14`만, Embedding은 요청 alias와
`text-embedding-3-small`만 허용한다. 관찰값을 그대로 신뢰하거나 prefix를 임의 제거하지
않고 닫힌 목록 밖의 model은 계약 실패로 처리한다.

실제 사용자 입력, Naver 검색 결과, 장소·주소·블로그 내용과 생성 응답을 Elice에 보내는
제품 runtime은 Elice의 보관·로깅·학습 사용·하위 처리자·삭제·개인정보 정책을 사람이
확인하기 전까지 차단한다. `store=false`는 요청 의도일 뿐 제3자 proxy의 미보관을
증명하지 않는다. PP-040은 저장소 소유자의 양쪽 Provider 승인 진술에 따라 고정 합성
입력의 로컬 일회성 Linked 검증만 ADR-0013의 allowlist로 예외 처리한다. 승인 원문은
독립 검토하지 않았고 제품 runtime이나 실제 사용자 데이터 허용으로 확장하지 않는다.

Mock·Local Live·runtime·배포를 다음처럼 분리한다.

| 경계 | 허용 데이터와 목적 | 현재 완료 조건 |
| --- | --- | --- |
| Mock | 합성 fixture로 변환·오류·fallback 회귀 | 필수 CI 자동 테스트 |
| Elice Local Live | 고정 합성 입력으로 Chat·Embedding 계약 확인 | 각 endpoint 1회 2xx·schema |
| Linked Live | 실제 Naver 근거의 로컬 일회성 이유 생성 | PP-040·ADR-0013의 병합 main 실행 증거 |
| 제품 runtime | 확정 조건과 검증된 최소 근거 | PP-009·PP-016·PP-029 및 정책 승인 |
| 배포 Live | Gateway와 승인 SHA 전체 E2E | PP-033·PP-035 |

공용 `.env.live.local`을 사용하더라도 Naver와 Elice 실행 명령은 provider별 변수만
하위 프로세스에 전달한다. Elice token과 routing UUID가 포함된 전체 proxy URL은 Git,
Issue, PR, 로그와 artifact에 저장하지 않는다.

## 결과와 트레이드오프

현재 제공된 proxy를 실제로 검증하면서 domain port와 Mock 회귀를 유지할 수 있다.
Chat과 Embedding의 성공 의미를 분리해 Embedding 가용성이 곧 제품 기능이라는 오해를
막는다. 직접 OpenAI Responses로의 변경 가능성도 남는다.

대신 Elice의 호환 범위와 정책 검토라는 추가 gate가 생긴다. Local Live 합성 canary가
성공해도 실제 사용자 데이터 처리, 조건 추출·추천 이유 품질과 cloud runtime은
검증되지 않는다.

## 검증과 재검토 조건

자동 검증은 실제 token 없이 URL allowlist, provider별 환경 격리, 요청 schema,
redaction, 오류·timeout·oversized 응답을 검증한다. 실제 Elice 검증은
[RUN-0002](../runbooks/RUN-0002-elice-llm-local-live-and-token-rotation.md)로 수동 실행하고
Chat과 Embedding 결과를 별도 상태로 기록한다.

2026-07-14 첫 실제 실행의 전송 실패 뒤 capability별 transport를 격리했고, 후속 진단은
두 capability 모두 2xx에서 model metadata 차이를 확인했다. 승인된 닫힌 alias 목록과
Mock 음성 테스트를 적용한 SHA `e6190662c2382304f21c39bdb29375d1b1324733`에서 Chat
strict schema·usage와 Embedding 1,536차원 계약을 각각 한 번 통과했다. 자세한 재현과
교훈은 TS-0010과 TS-0012에 남긴다.

Elice가 strict schema나 `store=false`를 받지 않거나 정책 검토가 제품 데이터 처리를
허용하지 않으면 runtime provider 선정을 재검토한다. Embedding을 제품에 사용할
사용자 가치가 생기면 vector 품질, 저장소, 보존·삭제, 비용과 fallback을 다루는 별도
Task와 ADR을 먼저 작성한다.
