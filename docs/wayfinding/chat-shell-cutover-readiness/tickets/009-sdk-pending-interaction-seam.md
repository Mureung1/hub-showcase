# 009 — Official SDK pending-interaction seam의 존재를 확인한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: None

## Question

Exact official Python SDK public surface는 original `RequestId`를 보존하면서 sole reader를 막지 않고 command/file approval이나 user input request를 defer하고 나중에 응답할 수 있는 Seam을 제공하는가?

## Resolution evidence

- Exact source의 public/private signature와 callback execution context matrix
- Request 수신 → caller roundtrip → response 또는 timeout의 sequence와 reader deadlock trace
- Legacy raw transport가 실제 fallback인지, Server request response loop 부재 때문에 단지 별도 evidence인지에 대한 판정
- Production monkey patch나 approval UI 구현 없이 primary source를 인용한 research asset
- 제공하지 않는다면 그 사실과 public extension gap만 기록하고 architecture 전략은 다음 decision ticket에 남긴다.
