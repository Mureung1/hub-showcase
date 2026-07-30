# Spark/Blaze Cloud Functions fallback 및 Firestore 인덱스 배포 노트

> 2026-07-23 ShowUp 11일차 BE 세션에서 얻은 실전 패턴.

## Cloud Functions Spark 요금제 배포 불가

### 증상

```
Your project showup-project must be on the Blaze (pay-as-you-go) plan to complete this command.
Required API cloudbuild.googleapis.com can't be enabled until the upgrade is complete.
```

### 원인

Firebase Cloud Functions 프로덕션 배포는 Blaze(종량제)에서만 가능.
Spark(무료)에서는 다음 API를 활성화할 수 없음:

- `cloudfunctions.googleapis.com`
- `cloudbuild.googleapis.com`
- `artifactregistry.googleapis.com`

### 대응

1. **즉시 대체**: 클라이언트 `riskRefresh.ts`에서 `createIncidentAndRefresh`, `transitionReservationStatusAndRefresh` 같은 헬퍼로 예약/사건 변경 후 `riskStats`를 직접 갱신.
2. **Rules 조정**: `firestore.rules`의 `customers` 문서 `update` 조건에서 `riskStats` 직접 쓰기를 허용해야 함. 단, 가게 소유자(`isStoreOwner`) 검증은 유지.
3. **functions/ 유지**: Blaze 업그레이드 후 Cloud Functions로 즉시 이관할 수 있도록 `apps/showup/functions/` 디렉토리와 코드는 삭제하지 않는다. `functions/src/index.ts`의 `onDocumentWritten` 트리거는 그대로 보존.
4. **문서화**: `docs/cloud-functions-deploy.md`에 Blaze 업그레이드 후 배포 절차를 기록.

### Blaze 이관 시 체크리스트

- Firebase Console → Project Settings → Usage & Billing → Blaze upgrade
- `firebase deploy --only functions`
- `firestore.rules`에서 `riskStats` 직접 쓰기 차단 복원
- 클라이언트에서 `riskRefresh.ts` 제거 또는 폐기 표시

---

## Firestore 인덱스 "not necessary" 오류

### 증상

```
HTTP Error: 400, this index is not necessary, configure using single field index controls
```

### 원인

`firestore.indexes.json`에 단일 필드에 대한 복합 인덱스를 정의했을 때 발생.
예: `incidents` 컬렉션의 `occurredAt DESC` 단일 필드 인덱스.

### 해결

해당 항목을 `indexes` 배열에서 제거. Firestore는 단일 필드 인덱스를 자동으로 생성/관리하므로 복합 인덱스 JSON에는 단일 필드만 남기지 않는다.

```json
{
  "indexes": [
    {
      "collectionGroup": "reservations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "date", "order": "DESCENDING" },
        { "fieldPath": "time", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### 배포 명령

```bash
npx firebase deploy --only firestore:indexes
```

---

## 데모 가게 계정 생성 스크립트

### 파일

`apps/showup/src/seeds/createDemoStore.ts`

### 특징

- `firebase-admin/auth`로 데모 계정 생성/재사용
- `firebase-admin/firestore`로 가게 문서 + 고객 + 예약 + 사건 일괄 생성
- 이미 존재하는 계정이면 재사용 (멱등성)
- `merge: true`로 여러 번 실행해도 덮어쓰기 가능

### 실행 조건

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
npx tsx src/seeds/createDemoStore.ts
```

또는

```bash
npm run seed:demo -w showup
```

### 서비스 계정 키 발급

Firebase Console → Project Settings → Service accounts → Generate new private key → JSON 다운로드.

### 데모 계정 예시

- 이메일: `demo@showup.example`
- 비밀번호: `demoPassword123!`
- storeId: Auth UID와 동일
