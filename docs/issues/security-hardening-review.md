# LocalTwin 보안 점검 및 조치 체크리스트

문서 상태: active
최초 점검: 2026-07-13
적용 범위: LocalTwin web, API, scene worker, Vercel 정적 배포

이 문서는 발견된 보안 문제를 재현하고, 조치 방향을 검토한 뒤 실제 수정과 재검증까지 추적한다. SEC-001 A단계의 제품 Scene route 기본 차단은 검증을 마쳤다. SEC-001 B단계 인증·객체 단위 인가와 SEC-002~008은 아직 계획 상태다.

## 1. 안전 원칙

- 개인 로컬 개발환경과 테스트 데이터에서만 재현한다.
- 공개 서버, 다른 사람의 파일·계정·GPU에는 실행하지 않는다.
- 실제 얼굴, 차량번호, API key 대신 합성 fixture와 빈 key를 사용한다.
- DoS는 실제 8GB 전송 대신 코드 확인과 작은 요청으로 검증한다.
- 기록에 secret, 원본 촬영물, 로컬 절대 경로를 남기지 않는다.

## 2. 전체 체크리스트

상태는 `Open → Reproduced → Planned → In Progress → Verified` 순서로 변경한다. `Verified`는 수정 전 재현이 수정 후 차단되고 회귀 테스트도 통과한 상태다.

| ID | 우선순위 | 문제 | 상태 | 완료 조건 |
| --- | --- | --- | --- | --- |
| SEC-001 | High | Scene API 인증·객체 단위 인가 없음 | A Verified / B Planned | 기본 제품 route는 비노출이며, 활성 환경에서도 무인증과 다른 사용자 job 접근이 차단된다 |
| SEC-002 | High | Privacy gate가 서버에서 강제되지 않음 | Planned | 미승인 asset 다운로드가 서버에서 거부된다 |
| SEC-003 | High | 업로드·GPU quota와 실행 제한 없음 | Planned | 크기·빈도·동시 실행·재실행 제한을 확인한다 |
| SEC-004 | Medium | 업로드 검증이 확장자 중심 | Planned | 위장 파일과 처리 한도 초과 media를 거부한다 |
| SEC-005 | Medium | 공개 API가 worker 내부정보를 반환 | Planned | 공개 응답에서 경로·command·상세 진단을 제거한다 |
| SEC-006 | Medium | Seoul API key가 평문 HTTP URL 경로로 전송 | Planned | HTTPS 또는 승인된 격리 대안을 적용한다 |
| SEC-007 | Medium/Low | 공급망 고정과 container 격리 부족 | Planned | frozen install과 digest·runtime 제한을 적용한다 |
| SEC-008 | Low | Vercel 보안 header 없음 | Planned | 배포 응답에서 header와 화면 회귀를 확인한다 |
## 2.1 Phase 2 실행 매핑

Parent Epic은 `EPIC-07 제품 보안과 Privacy Enforcement`다. `SEC-001`은 두 단계로 나눈다. A단계의 제품 환경 기본 차단은 이번 주 첫 구현으로 수행하고, B단계의 인증·객체 단위 인가와 SEC-002~008은 핵심 서비스 vertical slice 이후 사용자 촬영 E2E 전에 수행한다.

| ID | Task Packet | 선행 조건 |
| --- | --- | --- |
| SEC-001 | [Scene API 기본 차단·인증·인가](../../.harness/tasks/SEC-001-scene-authz.md) | A단계 없음, B단계 인증 방식 승인 |
| SEC-002 | [서버 privacy gate](../../.harness/tasks/SEC-002-privacy-gate.md) | SEC-001 |
| SEC-003 | [upload·GPU resource limit](../../.harness/tasks/SEC-003-resource-limits.md) | SEC-001, 한도 수치 승인 |
| SEC-004 | [media·PLY validation](../../.harness/tasks/SEC-004-media-validation.md) | 없음 |
| SEC-005 | [response redaction](../../.harness/tasks/SEC-005-response-redaction.md) | SEC-001 |
| SEC-006 | [Seoul key transport](../../.harness/tasks/SEC-006-seoul-key-transport.md) | 공식 HTTPS 지원 재확인 |
| SEC-007 | [supply chain·container](../../.harness/tasks/SEC-007-supply-chain-container.md) | SEC-003 |
| SEC-008 | [deployment headers](../../.harness/tasks/SEC-008-deployment-headers.md) | 허용 origin 목록 |

전체 제품 순서는 `SEC-001 A단계 → ARCH-002 → WEB-008 → DB-001 → SEARCH-001 → 반경·통합 → SEC-001 B단계 → SEC-002~008 → 사용자 촬영 E2E`다. 보안 Epic 안에서는 B단계 이후 `SEC-002 → SEC-003 → SEC-004 → SEC-005 → SEC-006~008`을 기본 순서로 사용한다. 즉시 차단과 완전한 인증 체계 구축을 같은 하루 작업으로 오해하지 않는다.

## 3. 공통 로컬 준비

터미널 A:

```powershell
pnpm install --frozen-lockfile
uv sync --directory product/apps/api --frozen
pnpm dev:api
```

터미널 B:

```powershell
$Api = "http://127.0.0.1:8000"
Invoke-RestMethod "$Api/health"
```

예상 결과는 `status: ok`다.

## 4. SEC-001 — Scene API 인증·인가 부재

### 쉬운 설명

인증은 “너는 누구인가?”, 인가는 “그 사람이 이 작업을 볼 권리가 있는가?”를 확인한다. UUID가 길어 맞히기 어렵더라도 권한 검사를 대신하지 못한다.

근거는 `product/apps/api/src/localtwin_api/main.py`의 worker 상태, upload, job 조회·재실행, asset endpoint다.

### 안전한 재현

```powershell
(Invoke-WebRequest "$Api/api/v1/scenes/toolchain" -SkipHttpErrorCheck).StatusCode
```

수정 전 기본 설정에서는 token 없이 `200`이었다. A단계 적용 후 기본 설정에서는 `404`이고 OpenAPI schema에서도 Scene route가 보이지 않는다. 승인된 개발 환경에서 `SCENE_API_ENABLED=true`로 활성화하면 기존 route 계약은 유지되며, 이 활성 상태의 인증·인가는 B단계 범위다.

```powershell
$JobId = "로컬 테스트 job UUID"
(Invoke-WebRequest "$Api/api/v1/scenes/jobs/$JobId" -SkipHttpErrorCheck).StatusCode
```

존재하는 ID면 현재는 인증 없이 `200`이다. 없는 ID의 `404`는 인증이 있다는 뜻이 아니다.

### 조치와 선택 이유

0. A단계: `SCENE_API_ENABLED=false`를 기본값으로 두고 제품 환경의 모든 Scene route를 노출하지 않는다.
1. B단계: API에서 사용자를 식별한다.
2. `SceneJob`에 `owner_id`를 저장한다.
3. 모든 job endpoint에서 `job.owner_id == current_user.id`를 검사한다.
4. toolchain 상세 endpoint는 관리자만 허용한다.

로그인만 확인하면 사용자 A가 사용자 B의 UUID를 얻었을 때 접근할 수 있다. 따라서 인증과 객체 단위 인가를 같이 적용해야 한다.

- [x] A단계: 기본 설정에서 모든 Scene route가 404 또는 정책상 비노출 상태
- [x] A단계: market·score API 회귀 없음
- [ ] B단계: 인증 방식과 token 저장 위치 승인
- [ ] 무인증 요청 `401`
- [ ] 자신의 job 정상 접근
- [ ] 다른 사용자 job `403` 또는 정책상 `404`
- [ ] 관리자만 toolchain 상세 조회
- [ ] 위 경우를 API test로 고정

## 5. SEC-002 — 서버에서 강제되지 않는 Privacy gate

### 쉬운 설명

화면의 경고문은 표지판이고 서버 검사는 자물쇠다. 현재 UI는 익명화 전 공개하지 않는다고 말하지만 서버에는 승인 상태가 없고 `main.py:122-133`은 준비된 asset을 바로 반환한다.

### 안전한 재현

실제 촬영물 대신 합성 PLY fixture job을 사용한다.

```powershell
$JobId = "로컬 합성 fixture job UUID"
Get-Content "product/data/scenes/jobs/$JobId/job.json" |
  Select-String "privacy|approved|anonymized"
(Invoke-WebRequest "$Api/api/v1/scenes/jobs/$JobId/asset" -SkipHttpErrorCheck).StatusCode
```

현재 job에는 승인 필드가 없고 ready asset은 승인 없이 `200`이다. asset이 준비되지 않아 받은 `404`는 privacy gate 검증 결과가 아니다.

### 조치와 선택 이유

- job에 `privacy_review_status = pending|approved|rejected`를 저장한다.
- 원본과 anonymized artifact 경로를 분리한다.
- endpoint는 `approved`인 anonymized artifact만 반환한다.
- 승인 시각·검토자와 원본 retention 기간을 기록한다.

상태를 서버 데이터에 남겨야 UI 우회나 직접 API 호출도 차단할 수 있다.

- [ ] privacy 상태 모델 승인
- [ ] `pending`, `rejected` 다운로드 차단
- [ ] `approved` anonymized asset만 다운로드
- [ ] 원본 경로 비노출
- [ ] 원본 보관·삭제 기준 확정

## 6. SEC-003 — 리소스 고갈과 비용 DoS

### 쉬운 설명

한 사람이 운동장의 모든 자리를 예약하면 다른 사람은 사용할 수 없다. 현재는 job당 최대 8GB를 받고 요청마다 비싼 GPU 작업을 시작할 수 있지만 사용자별 횟수와 동시 실행 상한이 없다.

### 안전한 재현

실제 대용량 업로드나 GPU 실행은 하지 않는다.

```powershell
rg -n "MAX_TOTAL_BYTES|rate|quota|semaphore|cooldown|idempot|queue" `
  product/apps/api/src/localtwin_api/main.py `
  product/apps/api/src/localtwin_api/scene_pipeline.py
```

현재 예상은 `MAX_TOTAL_BYTES`만 있고 rate, quota, queue 제한은 없는 것이다.

### 조치와 선택 이유

- proxy와 API에 upload 크기 제한
- 인증 사용자별 일일 job·저장량 quota
- durable queue와 worker 동시 실행 상한
- 중복 실행 방지와 retry cooldown
- 만료 cleanup과 디스크 여유 공간 검사

크기 제한만으로 작은 요청 여러 개를 막을 수 없어 서로 다른 지점에 방어층을 둔다.

- [ ] MVP 한도 수치 승인
- [ ] 초과 upload `413`
- [ ] rate/quota 초과 `429`
- [ ] 같은 job 중복 실행 차단
- [ ] worker 동시 실행 상한 검증
- [ ] cleanup과 디스크 부족 검증

## 7. SEC-004 — 확장자 중심 파일 검증

### 쉬운 설명

`photo.jpg`라는 이름은 상자에 “사진”이라고 적은 것뿐이다. 실제 사진인지 확인하려면 signature와 내부 구조를 검사해야 한다.

### 안전한 재현

GPU를 실행하지 않도록 `auto_run=false`를 사용한다.

```powershell
Set-Content "$env:TEMP/fake.jpg" "this is not an image"
$response = curl.exe -sS -X POST `
  -F "scene_name=security-format-test" `
  -F "capture_type=images" `
  -F "auto_run=false" `
  -F "files=@$env:TEMP/fake.jpg" `
  "$Api/api/v1/scenes/jobs"
$result = $response | ConvertFrom-Json
$result.id
$result.status
Remove-Item "$env:TEMP/fake.jpg"
```

현재 예상은 실제 JPEG가 아니어도 `uploaded`다. 검증 후 `product/data/scenes/jobs/<result.id>` 테스트 폴더만 수동 삭제한다.

### 조치와 선택 이유

- magic bytes, MIME, decoder probe를 단계적으로 검사한다.
- video duration, resolution, frame 수와 codec을 제한한다.
- PLY vertex 수, property type, 선언 크기를 검사한다.
- 외부 parser를 timeout이 있는 낮은 권한의 격리 worker에서 실행한다.

parser 하나만 신뢰하지 않고 입구 검증, 처리 한도, 격리를 함께 사용한다.

- [ ] 위장 `.jpg`가 `422`
- [ ] 정상 fixture는 계속 수락
- [ ] 비정상 video·PLY 회귀 test
- [ ] parser timeout과 sandbox 검증

## 8. SEC-005 — 내부 worker 정보 노출

### 안전한 재현

```powershell
Invoke-RestMethod "$Api/api/v1/scenes/toolchain" | ConvertTo-Json -Depth 6
```

현재는 mode, image, GPU, blocker, tool path가 포함될 수 있고 job 응답에는 hash, stage message, command가 포함될 수 있다.

### 조치와 선택 이유

사용자 DTO에는 `ready`, 일반화된 진행 상태와 안전한 error code만 둔다. executable path, command, 상세 exception은 관리자 endpoint나 서버 log로 이동한다. 기능에 필요 없는 내부정보는 공격자의 정찰에 도움을 줄 수 있다.

- [ ] 사용자·관리자 response schema 분리
- [ ] 공개 응답에서 path·command·상세 exception 제거
- [ ] 운영 진단은 서버 log에서 가능

## 9. SEC-006 — Seoul API key의 HTTP 전송

### 안전한 재현

실제 key나 네트워크 요청 없이 코드만 확인한다.

```powershell
rg -n "http://|SEOUL_OPEN_DATA_KEY|build_request_url" `
  product/apps/api/src/localtwin_api/seoul_open_data.py
```

endpoint가 HTTP이고 key가 URL path에 있으면 전송 구간과 proxy/access log에 노출될 수 있다.

### 조치와 선택 이유

공식 HTTPS 지원을 먼저 확인한다. 지원하면 HTTPS로 전환한다. 미지원이면 URL만 임의 변경하지 않고 격리 수집 worker, 제한된 egress, log redaction, 낮은 권한 key와 rotation을 사용한다.

- [ ] 공식 HTTPS 지원 여부와 확인 날짜 기록
- [ ] HTTPS 또는 격리 대안 승인
- [ ] application·proxy log에 key가 없는지 검증
- [ ] 노출 가능 key rotation

## 10. SEC-007 — 공급망 고정과 container 격리

### 안전한 재현

```powershell
Select-String -Path vercel.json -Pattern "frozen-lockfile"
Select-String -Path .env.example -Pattern "SCENE_DOCKER_IMAGE"
rg -n -- "--network|--read-only|--cap-drop|--user|@sha256" `
  product/apps/api/src/localtwin_api/scene_pipeline.py vercel.json .env.example
```

현재 예상은 Vercel install에 frozen mode가 없고 image는 tag이며 container 제한도 없는 것이다.

### 조치와 선택 이유

- 배포 install에 frozen lockfile 적용
- 검증한 Docker image digest 고정
- 호환성을 확인하며 non-root, capability drop, network 제한, read-only root 적용

Tag는 같은 이름이 다른 image를 가리킬 수 있지만 digest는 정확한 내용을 가리킨다. Runtime 제한은 image가 침해돼도 피해 범위를 줄인다.

- [ ] frozen install 통과
- [ ] lockfile 불일치 시 배포 실패
- [ ] image digest와 갱신 절차 기록
- [ ] 최소 권한 container에서 정상 작업

## 11. SEC-008 — 정적 배포 보안 header

### 안전한 재현

```powershell
$Site = "https://hub-localtwin-docs-vercel.vercel.app/"
(Invoke-WebRequest $Site -Method Head).Headers | Format-List
```

`Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`를 확인한다. 배포 상태는 바뀔 수 있어 조치 직전에 다시 확인한다.

### 조치와 선택 이유

`vercel.json`에 header를 작은 단위로 추가한다. CSP는 preview에서 MapLibre, font, WebGL 출처를 확인한 뒤 강제한다. 너무 좁은 CSP는 정상 지도와 3D asset도 차단할 수 있다.

- [ ] 외부 resource origin 목록화
- [ ] preview CSP 위반 확인
- [ ] 배포 응답 header 확인
- [ ] 지도·문서 viewer·3D smoke 통과

## 12. 비발견 사항과 미검증 범위

현재 점검에서는 `.env`가 Git 제외 대상이고, 기본 CORS가 localhost allowlist이며, filename·job UUID path traversal 완화가 있음을 확인했다. 일반적인 secret 패턴, 명백한 `dangerouslySetInnerHTML`, 사용자 제어 SSRF, SQL injection 경로는 발견하지 못했다.

아직 Git 전체 history, 실제 배포 환경변수·CORS, TLS/WAF/IAM/backup, dependency CVE audit, 실제 익명화 품질은 검증하지 않았다. 비발견은 취약점이 절대 없다는 뜻이 아니라 이번 범위에서 증거를 찾지 못했다는 뜻이다.

## 13. 구현 시작 전 확정할 정책

- [ ] 인증 방식과 사용자 식별자
- [ ] 다른 사용자 job에 `403` 또는 `404`를 반환할 정책
- [ ] privacy 승인 주체와 원본 보관 기간
- [ ] upload 크기, 일일 job 수, GPU 동시 실행 수
- [ ] Seoul API 공식 HTTPS 지원 여부
- [ ] CSP가 허용할 지도·font·asset origin
- [x] 각 SEC 항목을 별도 Task Packet과 작은 commit으로 수행

## 14. 검증 기록 양식

```text
ID:
검증 날짜와 환경:
수정 전 재현 명령과 결과:
선택한 조치와 이유:
변경 파일:
수정 후 같은 재현 결과:
추가 regression test:
남은 위험:
검토자:
상태: Open | Reproduced | Planned | In Progress | Verified
```
