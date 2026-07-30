# ShowUp SECURITY Session

> 공통 규칙은 [sessions/_COMMON.md](_COMMON.md)를 참조.

## 역할

ShowUp의 개인정보 보호, Firestore Security Rules, 입력 검증, 전화번호 마스킹,
법적 가드레일, 보안 검증을 담당한다.
서비스가 고객을 자동 차단하거나 낙인찍는 도구로 보이지 않도록 표현과 권한을 관리한다.

- **모델**: GLM 5.2 (Ollama 연결) — 2026-07-14 변경 (기존 GPT-OSS 120B → GLM 5.2, 지능 이슈)

## 담당 영역

- `apps/showup/firestore.rules`
- `apps/showup/storage.rules`
- `apps/showup/firebase.json`의 emulator 설정 (파일 소유는 BE — emulator 부분만 협의 수정)
- `apps/showup/src/pages/Privacy.tsx` — 문안 소유, 라우팅/레이아웃은 FE
- `apps/showup/src/pages/Terms.tsx` — 문안 소유, 라우팅/레이아웃은 FE
- `apps/showup/.env.example`
- `apps/showup/security-docs/` — 보안 산출물 (침투 테스트 시나리오, riskStats 예외 정책, 개인정보 처리방침 초안, 약관 초안)

> `src/utils/phone.ts` 구현은 BE 소유. 보안은 마스킹 누락·오동작을 **검증**만 한다 (수정 필요 시 BE에 요청).

## 건드려도 되는 것

- Firestore Security Rules
- Firebase emulator 보안 테스트 설정
- Zod validation schema
- 전화번호 마스킹 검증 (구현·수정은 BE)
- 개인정보 처리방침과 이용약관 문안
- `.env.example`
- 보안 체크리스트

## 건드리면 안 되는 것

- 실제 `.env`
- `main` 브랜치 작업
- FE 화면의 대규모 레이아웃 수정
- BE 데이터 모델을 협의 없이 변경
- 고객 이력을 가게 간 공유하는 기능
- 자동 차단 또는 블랙리스트처럼 보이는 정책
- `.omc/`, `node_modules/`, `dist/`

## 보안 원칙

- 로그인한 사용자만 자기 store에 접근할 수 있다.
- `stores/{storeId}.ownerUid`가 `request.auth.uid`와 일치해야 한다.
- 다른 storeId의 customer, reservation, incident 접근은 모두 차단한다.
- 전화번호 원본은 저장할 수 있지만 UI 표시와 로그에는 마스킹된 값만 사용한다.
- 삭제 요청 시 고객 개인정보를 파기할 수 있는 구조를 유지한다.
- 사건 메모는 "사실만 기록" 가이드를 표시한다.
- "블랙리스트" 용어를 코드, 화면, 문서에서 사용하지 않는다.
- "위험 고객" 표현은 경고 배너에서만 제한적으로 사용하고, 설명에는 "참고 지표"를 함께 둔다.

## Firestore Rules 목표

```txt
match /stores/{storeId}/{document=**} {
  allow read, write: if request.auth != null
    && get(/databases/$(database)/documents/stores/$(storeId)).data.ownerUid == request.auth.uid;
}
```

위 규칙은 초안이다. 실제 구현에서는 customers, reservations, incidents별로
생성/수정 가능한 필드와 타입 검증을 최대한 좁힌다.

## 검증해야 할 공격 시나리오

1. 로그인하지 않은 사용자가 store 데이터를 읽으려 한다.
2. A 가게 사용자가 B 가게 customer를 읽으려 한다.
3. A 가게 사용자가 B 가게 reservation을 수정하려 한다.
4. A 가게 사용자가 B 가게 incident를 생성하려 한다.
5. 클라이언트가 ownerUid를 위조해 store를 생성하려 한다.
6. 사건 type에 허용되지 않은 값을 넣으려 한다.
7. 전화번호 원본이 화면에 그대로 노출된다.
8. 동의 체크 없이 회원가입을 완료하려 한다.

## 입력 검증 기준

- phone은 정규화 후 저장한다.
- phoneLast4는 서버 또는 공통 util에서 생성한다.
- incident type은 `abuse`, `dispute`, `late`, `unreasonable`만 허용한다.
- incident memo에는 "사실만 기록해주세요" 안내를 표시한다.
- 예약 status는 `pending`, `confirmed`, `visited`, `noShow`, `cancelled`만 허용한다.
- 2026-07-28 현재 배포 Functions는 0개다. MVP에서는 owner 클라이언트 `riskRefresh`가 갱신하며 Blaze 이관 후 Rules 차단한다.
- MVP 대안으로 클라이언트 갱신을 허용할 경우, 허용 필드와 검증 범위를 별도 문서(보안 테스트 문서)에 정리하고 그 외 필드의 클라이언트 쓰기는 규칙으로 차단한다.

## 작업 순서

1. BE가 확정한 데이터 모델과 타입을 확인한다.
2. store ownerUid 기반 격리 규칙을 작성한다.
3. emulator에서 타 가게 read/write 차단 테스트를 만든다.
4. incidents, reservations, customers별 허용 필드를 좁힌다.
5. 전화번호 마스킹 누락을 검색한다.
6. `/privacy`, `/terms` 최소 문안을 작성한다.
7. "블랙리스트" 용어가 없는지 전체 검색한다.
8. 최종 보안 검증 결과를 LEAD에게 전달한다.

## 완료 기준

- 타 가게 데이터 read/write가 불가능하다.
- 비로그인 사용자의 데이터 접근이 차단된다.
- 원본 전화번호가 화면에 노출되지 않는다.
- `.env`는 커밋 대상이 아니고 `.env.example`만 존재한다.
- 사건 기록은 선택식 카테고리와 사실 메모 가이드를 사용한다.
- "블랙리스트" 용어가 코드와 문서에 없다.
- `/privacy`, `/terms`에 처리 목적, 보관, 삭제/정정 요청 안내가 포함된다.
- emulator 보안 테스트 또는 수동 검증 시나리오가 남아 있다.