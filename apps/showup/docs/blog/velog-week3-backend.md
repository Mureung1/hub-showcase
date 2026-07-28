# AI Agent Challenge 3주차 백엔드 회고 — ShowUp: 대시보드·에러 핸들링·통합 QA·배포

> 역사적 회고 문서(3주차 작성 시점). 당시 10개 보안 회귀, 삭제 미구현, 배포 상태 등은 이후 변경됐다. 2026-07-28 현재 기준은 [ShowUp README](../../README.md), [작업 체크리스트](../checklist.md)다.

> **ShowUp**은 소상공인을 위한 노쇼·악성 고객 이력 관리 및 위험도 경고 웹서비스입니다.
>
> 2주차까지 핵심 기능 구현을 마치고, 3주차(7/20~7/24)부터는 완성도 높이기 — 대시보드 집계, 에러 핸들링 표준화, 모바일 QA, 침투 테스트, 통합 QA, Firebase Hosting 배포를 진행했습니다.
>
- 프로젝트 기간: 2026-07-09 ~ 2026-07-30 (16영업일)
- 백엔드: Firebase (Auth / Firestore / Cloud Functions / Hosting)
- 백엔드 세션 모델: Kimi K2.7 Code (Ollama)

---

## 3주차 백엔드 작업 요약

| 일차 | 날짜 | 주제 | 핵심 구현 |
|------|------|------|----------|
| 8일차 | 7/20 월 | 대시보드 | 집계 쿼리, 주의 고객 Top 5 |
| 9일차 | 7/21 화 | 완성·비용 | Firestore 비용 점검, 백업 스크립트 |
| 10일차 | 7/22 수 | 에러 핸들링 | ShowUpError 체계, withErrorHandling |
| 11일차 | 7/23 목 | 통합 QA·배포 | 데모 가게 생성, 인덱스 배포, Hosting 배포 |
| 12일차 | 7/24 금 | 발표 | — |

---

## 1. 대시보드 집계 — Firestore 비용과 타협하기

8일차에 대시보드용 집계 쿼리를 구현했습니다. 대시보드는 4개 요약 카드(오늘 예약 수, 오늘 노쇼, 이번 달 노쇼율, 주의 고객 수)와 주의 고객 Top 5 목록을 보여줍니다.

### 문제: Firestore는 집계 쿼리를 지원하지 않는다

SQL의 `COUNT`, `GROUP BY` 같은 집계 쿼리를 Firestore는 기본적으로 지원하지 않습니다. 3주차 시점에서는 Firestore의 `count()` 집계 함수도 Spark 요금제에서 제약이 있었습니다.

### 선택: 전체 예약을 읽어와서 클라이언트에서 집계

```typescript
// src/services/dashboard.ts — 대시보드 데이터 조회

export async function getDashboardData(
  storeId: string,
  today = new Date(),
): Promise<DashboardData> {
  const [allReservations, attentionCustomers] = await Promise.all([
    listReservations(storeId),
    getTopRiskyCustomers(storeId, 5),
  ]);

  const stats = calculateDashboardStats(allReservations, today);
  return { ...stats, attentionCustomers, ... };
}
```

전체 예약을 한 번에 읽어와서 순수 함수로 집계합니다. 이 방식의 단점은 예약 데이터가 많아지면 읽기 비용이 증가한다는 것입니다. 하지만 MVP 단계에서는 한 가게당 예약 수가 수십~수백 건 수준이므로, 1회 읽기로 충분했습니다.

### 집계 로직을 순수 함수로 분리

```typescript
// src/utils/dashboard.ts — 대시보드 집계 순수 함수

export function calculateDashboardStats(
  reservations: Reservation[],
  today = new Date(),
): DashboardStats {
  // 오늘 예약 필터링
  const todayReservations = reservations.filter(r => r.date === todayStr);
  // 이번 달 예약 필터링
  const monthReservations = reservations.filter(r => isSameMonth(r.date, today));

  const noShowRate = monthStats.total === 0
    ? 0
    : (monthStats.noShow / monthStats.total) * 100;

  return {
    today: buildDailyStats(todayReservations),
    month: { total, noShowCount, noShowRate: Math.round(noShowRate * 10) / 10 },
  };
}
```

집계 로직을 서비스 함수(`dashboard.ts`)가 아니라 유틸 함수(`dashboard.ts`)로 분리했습니다. 이유는 위험도 계산(`risk.ts`)과 같은 원칙입니다 — **순수 함수로 분리하면 DB 없이 테스트할 수 있고, 나중에 다른 곳에서 재사용할 수 있습니다.**

### `Promise.all`로 병렬 조회

대시보드는 예약 목록과 주의 고객 Top 5를 동시에 조회합니다. 두 쿼리는 독립적이므로 `Promise.all`로 병렬 실행했습니다. 직렬로 실행하면 2배 느려집니다.

---

## 2. Firestore 비용 점검 — 읽기 횟수 최적화

9일차에 Firestore 비용 점검을 했습니다. Spark 요금제는 일일 읽기 50,000회, 쓰기 20,000회가 한도입니다. ShowUp의 주요 읽기 패턴을 분석했습니다.

### 주요 읽기 패턴 분석

| 작업 | 읽기 횟수 | 비고 |
|------|----------|------|
| 고객 검색 (이름+번호) | 2회 쿼리 = 검색 결과 수 | 병렬 실행 |
| 고객 상세 | 1회 + 예약 N + 사건 M | riskStats는 캐시되어 있음 |
| 대시보드 | 전체 예약 1회 + Top5 1회 | 집계는 클라이언트 |
| 위험도 갱신 | 예약 전체 + 사건 전체 | riskRefresh 시 |

### 위험도 갱신 비용이 가장 크다

`riskRefresh`는 예약 전체와 사건 전체를 읽어와야 합니다. 예약 100건 + 사건 20건이면 120회 읽기입니다. Cloud Function으로 이관하면, 예약 상태 변경 시 한 번만 실행되지만, 클라이언트에서는 호출할 때마다 비용이 발생합니다.

이건 Cloud Functions 이관 후 개선할 수 있는 부분입니다. 현재는 사용 빈도가 낮아서 감수하고 있습니다.

### 백업 스크립트

```bash
# Firestore 데이터 내보내기 (백업)
npx firebase firestore:export gs://showup-backup/$(date +%Y%m%d)
```

Firestore의 내보내기 기능으로 전체 데이터를 Cloud Storage에 백업합니다. 일일 자동화는 아직 안 했지만, 스크립트 자체는 작성해뒀습니다.

---

## 3. 에러 핸들링 표준화 — ShowUpError 체계

10일차에 에러 핸들링을 표준화했습니다. 이전까지는 각 서비스 함수가 Firebase 에러를 그대로 throw하고 있었는데, 프론트엔드에서 에러 처리가 일관되지 않았습니다.

### 에러 클래스 계층

```typescript
// src/utils/errors.ts

export class ShowUpError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ShowUpError';
  }
}

export class NotFoundError extends ShowUpError { ... }       // NOT_FOUND
export class PermissionError extends ShowUpError { ... }     // PERMISSION_DENIED
export class ValidationError extends ShowUpError { ... }      // VALIDATION_ERROR
```

`ShowUpError`를 기반으로 3개 하위 클래스를 만들었습니다. 프론트엔드는 `error instanceof ShowUpError`로 ShowUp 에러를 판별하고, `error.code`로 분기할 수 있습니다.

### Firebase 에러를 ShowUpError로 변환

```typescript
export function wrapFirestoreError(error: unknown): ShowUpError {
  if (error instanceof ShowUpError) return error;

  if (error instanceof Error) {
    const message = error.message;
    if (message.includes('permission-denied'))
      return new PermissionError('Firestore 접근 권한이 없습니다.');
    if (message.includes('not-found'))
      return new NotFoundError('문서');
    if (message.includes('already-exists'))
      return new ValidationError('이미 존재하는 데이터입니다.');
    return new ShowUpError(message, 'FIRESTORE_ERROR');
  }

  return new ShowUpError('알 수 없는 오류가 발생했습니다.', 'UNKNOWN_ERROR');
}
```

Firebase 에러 메시지를 분석해서 적절한 ShowUpError로 변환합니다. 이렇게 하면 프론트엔드는 Firebase 에러 형식을 알 필요 없이, ShowUpError의 `code`와 `name`으로만 분기하면 됩니다.

### `withErrorHandling` 래퍼

```typescript
// src/services/withErrorHandling.ts

export async function withErrorHandling<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw wrapFirestoreError(error);
  }
}
```

서비스 함수의 try-catch를 이 래퍼로 대체할 수 있습니다. 모든 서비스 함수가 동일한 에러 변환을 거치도록 보장합니다.

### 왜 이렇게 했는가

이전에는 `try-catch`에서 에러를 콘솔에만 출력하거나, Firebase 에러를 그대로 throw하는 코드가 섞여 있었습니다. 프론트엔드에서 "이 에러가 권한 문제인지, 데이터 문제인지"를 판단하려면 에러 메시지를 문자열로 검색해야 했는데, 이건 너무 취약합니다. `ShowUpError` 체계로 에러를 표준화하니 프론트엔드에서 일관된 에러 처리가 가능해졌습니다.

---

## 4. 침투 테스트 최종 — 10개 시나리오 전체 PASS

3주차에 보안 세션에서 침투 테스트를 최종 실행했습니다. 2주차의 8개 시나리오에 2개를 추가해서 총 10개입니다:

| # | 시나리오 | 결과 |
|---|---------|------|
| 1 | 미인증 stores 접근 | PASS |
| 2 | 타 가게 데이터 접근 | PASS |
| 3 | 위조 ownerUid store 생성 | PASS |
| 4 | 허용되지 않은 incident type | PASS |
| 5 | 원본 전화번호 노출 | PASS |
| 6 | 삭제 cascade (당시 미구현, 규칙으로 잔여 데이터 접근 차단) | PASS |
| 7 | 클라이언트 riskStats 직접 수정 | PASS (현재 허용, Blaze 이관 후 차단) |
| 8 | "블랙리스트" 용어 | PASS (0건) |
| 9 | 동의 없는 가입 | PASS |
| 10 | 빈 껍데기 파일 접근 | PASS |

### 시나리오 7번의 타협

원래는 `riskStats`를 클라이언트에서 직접 수정할 수 없도록 Rules에서 차단하려 했습니다. 하지만 Cloud Functions를 배포할 수 없어서 클라이언트에서 갱신해야 하고, 그러려면 Rules에서 riskStats 쓰기를 허용해야 합니다. 보안과 기능의 트레이드오프였습니다.

```
// firestore.rules — 현재: riskStats 쓰기 허용 (TODO로 차단 예정 표시)
// Blaze 이관 시 riskStats 쓰기 차단 + Cloud Functions 트리거로 전환
```

당시에는 허용하되 주석으로 이관 조건을 명시했습니다. 현재 구현과 기술 부채를 함께 기록한 회고입니다.

---

## 5. 통합 QA — 시나리오 A 전체 플로우 검증

11일차에 리드 세션과 함께 통합 QA를 진행했습니다. ShowUp의 핵심 시나리오 A(사장님 플로우)를 처음부터 끝까지 수동 테스트했습니다:

1. 회원가입 → 가게 생성
2. 로그인
3. 고객 등록 (이름 + 전화번호)
4. 예약 생성
5. 예약 상태 → 노쇼로 변경
6. riskStats 갱신 확인
7. 위험도 경고 배너 표시 확인
8. 사건 기록 (폭언 카테고리)
9. riskStats 재갱신 → abuse 1회 최소 주의 등급 확인

### 발견된 버그

| 우선순위 | 버그 | 담당 |
|---------|------|------|
| P0 | CustomerDetail `any` 타입 3건 | FE |
| P0 | mock 데이터 잔여 | FE |
| P1 | riskRefresh 미연동 | FE → BE |
| P2 | 빈 상태 UI 누락 | FE |

P0 버그는 11일차 안에 수정했고, P1은 riskRefresh 함수를 `AndRefresh` 패턴으로 교체해서 해결했습니다.

---

## 6. 데모 가게 생성 — firebase-admin으로 샘플 데이터 주입

11일차에 프로덕션에 데모용 가게를 생성했습니다. 발표 때 실제로 작동하는 서비스를 보여주기 위해서입니다.

```typescript
// src/seeds/createDemoStore.ts — firebase-admin으로 데모 데이터 주입

const app = initializeApp({
  credential: cert(getEnv('GOOGLE_APPLICATION_CREDENTIALS')),
  projectId: PROJECT_ID,
});

// 1. 데모 사용자 생성 (이미 있으면 재사용)
const userRecord = await auth.createUser({
  email: 'demo@showup.example',
  password: 'demoPassword123!',
});

// 2. 가게 문서 생성
// 3. 고객 10명 batch write
// 4. 예약 30건 batch write
// 5. 사건 8건 batch write
```

### `firebase-admin` vs 클라이언트 SDK

데모 데이터 주입은 클라이언트 SDK가 아니라 `firebase-admin`을 사용했습니다. Admin SDK는 Security Rules를 우회할 수 있어서, 초기 데이터를 한 번에 주입하기 적합합니다. `GOOGLE_APPLICATION_CREDENTIALS` 환경변수로 서비스 계정 키를 지정해서 실행합니다.

### batch write로 한 번에 처리

고객 10명, 예약 30건, 사건 8건을 각각 `db.batch()`로 묶어서 한 번에 커밋했습니다. 개별 write를 48번 호출하는 대신 3번의 batch commit으로 처리했습니다. Firestore batch는 원자성도 보장해서, 중간에 실패하면 전부 롤백됩니다.

---

## 7. Firebase Hosting 배포 — showup-project.web.app

11일차에 Firebase Hosting 배포를 완료했습니다.

```bash
# 빌드
npm run build

# 배포
npx firebase deploy --only hosting
```

배포 후 `https://showup-project.web.app`에서 서비스가 정상 작동하는지 확인했습니다. 로그인 → 대시보드 → 고객 검색 → 경고 배너 → 예약 → 노쇼 기록 → 위험도 갱신 전체 플로우를 브라우저에서 검증했습니다.

### Firestore 인덱스 배포

```bash
npx firebase deploy --only firestore:indexes
```

`phoneLast4`와 `date` 복합 인덱스를 프로덕션에 배포했습니다. 인덱스가 없으면 검색 쿼리가 실패하는데, 이건 로컬 개발 환경에서는 잡히지 않는 문제라서 프로덕션 배포 후 별도로 확인이 필요했습니다.

---

## 8. 일정 앞당김 — 7/30 → 7/28 마감

3주차에 일정을 2일 앞당겼습니다. 기존 10~11일차 작업을 10일차로 압축하고, 13~16일차를 13~14일차로 압축했습니다.

이유는 발표 준비 시간을 확보하기 위해서였습니다. 기능 구현보다 발표 자료, 데모 리허설, 최종 점검이 생각보다 오래 거릴 것 같았거든요. 일정 압축을 결정하니 10일차에 모바일 QA + 에러 핸들링 + 보안 강화 + 침투 테스트를 하루에 다 처리해야 했습니다. 꽤 빡빡했지만, 4개 세션이 병렬로 작업해서 커버했습니다.

---

## 마무리

3주차 백엔드 작업의 핵심은 **"완성도를 높이고, 실제 배포해서 작동을 확인하는 것"**이었습니다.

- 대시보드 집계를 순수 함수로 분리 → 테스트 용이, 재사용 가능
- Firestore 비용 점검 → Cloud Functions 이관 시 개선 포인트 파악
- ShowUpError 체계 → 에러 처리 표준화, 프론트엔드 일관성 확보
- 침투 테스트 10개 PASS → 보안 검증 완료
- 통합 QA → 핵심 시나리오 전체 플로우 검증
- 데모 가게 생성 + Hosting 배포 → 실제 작동하는 서비스 확보

4주차(마지막 주)에는 발표 자료 완성, 최종 점검, 프로젝트 마무리가 진행됩니다.

---

**참고:** 본 프로젝트의 코드는 Hermes Agent 프레임워크 + Ollama Pro 모델(Kimi K2.7 Code)과 협업하여 작성되었으며, 설계 검토와 방향 수립, 코드 리뷰와 수정은 직접 진행했습니다.
