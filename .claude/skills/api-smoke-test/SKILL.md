---
name: api-smoke-test
description: 백엔드(backend/) API 엔드포인트를 실제로 띄워서 검증할 때 사용. 서버를 백그라운드로 기동하고 openapi.yaml 기준 정상/에러 케이스를 curl(Invoke-RestMethod)로 확인한 뒤, 좀비 프로세스 없이 안전하게 종료한다. 새 라우트를 구현했거나 기존 라우트를 수정한 뒤 "실제로 동작하는지" 확인할 때 항상 사용.
---

# API 스모크 테스트 스킬

새 엔드포인트나 수정된 로직을 실제 서버 기동 + 실제 요청으로 검증하는 절차. 린트·타입만으로는 잡히지 않는 런타임 동작(에러 형식, 상태 코드, DB 반영)을 확인하는 용도.

## 절차

### 1. 사전 확인
포트(기본 3000)가 이미 점유 중인지 확인한다. 이전 세션의 좀비 프로세스가 남아있을 수 있다.
```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
```
점유 중이면 해당 PID를 `taskkill /PID <pid> /T /F`로 정리하고 시작한다.

### 2. 서버 기동 (백그라운드)
```powershell
Set-Location backend; npm run start
```
Bash 도구라면 `run_in_background: true`로, PowerShell 도구도 동일 옵션으로 실행한다. 기동 로그(`Prisma 연결 성공`, `서버 시작: http://localhost:3000`)가 뜨는 데 보통 3~4초 걸리므로 첫 요청 전에 `Start-Sleep -Seconds 3~4`를 둔다.

### 3. 테스트 케이스 실행
대상 엔드포인트의 `docs/openapi.yaml` 명세를 먼저 읽고, 명세에 정의된 응답 케이스를 전부 실제로 쳐본다. 최소한:
- **정상 케이스**: 유효한 입력 → 200 + 명세 스키마대로 응답
- **빈 결과**(명세에 있다면): 조건에 맞는 데이터가 없는 입력 → 200 + 빈 배열/객체 (에러 아님)
- **400**: 검증 실패 입력 (빈 필수 필드, 패턴 위반 등)
- **404**: 존재하지 않는 리소스/선행 조건 미충족
- **429**: 실제로 rate limit을 유발하기 어려우면 생략 가능 — 대신 에러 매핑 코드를 리뷰로 확인

PowerShell에서는 에러 상태 코드를 확인하려면 try/catch가 필요하다 (`Invoke-RestMethod`는 4xx/5xx에서 예외를 던짐):
```powershell
try {
    Invoke-RestMethod -Uri http://localhost:3000/api/xxx -Method Post -ContentType 'application/json' -Body $body
} catch {
    "$($_.Exception.Response.StatusCode.value__) $($_.ErrorDetails.Message)"
}
```
빈 결과처럼 GitHub 실제 API를 호출하는 케이스는 존재하지 않는/결과가 없는 것이 확실한 입력값(예: 언어명 `Brainfuck`처럼 유효하지만 조건을 만족하는 레포가 없는 값)을 골라 검증한다.

### 4. DB 확인 (저장 로직이 있으면)
캐시나 결과 테이블에 실제로 반영됐는지 간단한 카운트 스크립트로 확인한다:
```bash
node --input-type=module -e "
import 'dotenv/config';
const { default: prisma } = await import('./src/config/prisma.js');
console.log('테이블명:', await prisma.모델명.count());
await prisma.\$disconnect();
"
```
(backend 디렉토리에서 실행)

### 5. 서버 종료 — 반드시 `/T /F`
```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { taskkill /PID $_.OwningProcess /T /F }
```
**`/T`(트리 종료)를 빠뜨리면 자식 프로세스가 포트를 점유한 채 남아, 다음 세션에서 "새로 띄운 서버인데 옛날 코드가 응답하는" 혼란이 생긴다** (2026-07-15 실제 발생 사례, `docs/log.md` 참조). PID만 죽이고 `/T`를 생략하지 않는다.

### 6. 임시 파일 정리
검증용으로 스크래치 디렉토리나 `backend/` 안에 만든 임시 `.mjs`/`.tmp.mjs` 스크립트는 커밋 전에 삭제한다.

## 하지 말 것
- 서버를 백그라운드로 띄운 채 응답을 기다리지 않고 다음 작업으로 넘어가기 (기동 전 요청은 연결 실패로 오검출됨)
- `taskkill /PID` 단독 실행 (자식 프로세스 잔존 위험)
- 실제 GitHub API를 호출하는 케이스를 대량 반복 실행 (rate limit 소모 — 케이스당 최소 횟수로)
