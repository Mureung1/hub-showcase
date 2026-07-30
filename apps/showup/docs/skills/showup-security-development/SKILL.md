---
name: showup-security-development
description: ShowUp 프로젝트 보안(SECURITY) 세션 표준 워크플로우 — Firestore Rules, 침투 테스트, 마스킹 검증, 법무 문안
author: security-session
category: software-development
tags:
  - showup
  - security
  - firebase
  - firestore-rules
  - penetration-testing
  - privacy
---

# ShowUp 보안(SECURITY) 개발 워크플로우

> 이 스킬은 ShowUp 프로젝트 SECURITY 세션의 표준 접근법을 정의한다.
> BE 세션과는 다른 영역이며, **Firestore Security Rules**, **침투 테스트**, **전화번호 마스킹 검증**, **법무 문안**을 담당한다.

## 트리거 조건

- 사용자가 "ShowUp 보안 세션이다" / "security 세션"이라고 하거나 보안 관련 작업을 지시할 때
- `apps/showup` 아래에서 다음 키워드가 등장할 때
  - `firestore.rules`, `storage.rules`, `security/`, `security-docs/`
  - 침투 테스트, 스모크 테스트, 규칙 회귀 테스트
  - 마스킹 검증, "블랙리스트" 용어 확인, 개인정보 처리방침, 이용약관

## 핵심 규칙

1. **담당 영역**
   - `apps/showup/firestore.rules` — Security Rules 작성/수정
   - `apps/showup/security/` — 테스트 코드 (smoke-test.mjs, penetration-test.test.mjs)
   - `apps/showup/security-docs/` — 보안 산출물 (security-report.md, penetration-test.md, privacy-draft.md, terms-draft.md, riskstats-exception.md)
   - `apps/showup/src/utils/validation.ts` — Zod validation schema
   - `apps/showup/src/pages/Privacy.tsx`, `Terms.tsx` — 문안 소유 (라우팅/레이아웃은 FE)
   - `apps/showup/.env.example`

2. **건드리지 않는 것**
   - 실제 `.env`
   - BE 데이터 모델 (협의 없이 변경 금지)
   - FE 화면 대규모 레이아웃 수정
   - `src/utils/phone.ts` 구현 (BE 소유 — 보안은 검증만)
   - 자동 차단 / 블랙리스트 기능

3. **브랜치/커밋 정책**
   - 단일 작업 브랜치: `N167_채민석`
   - 커밋 접두어: `SEC-`
   - push/PR은 사용자 명시 지시 시만

4. **언어/보고 형식**
   - 한국어 응답
   - "N일차 작업 시작"이라고 하면 사전 확인 없이 바로 상태 파악과 실행 시작
   - 보고 형식:
     ```
     날짜 - N번째 작업(내용)
     한것 -
     막힌 점 -
     검증 -
     관리자가 할것 -
     참고 -
     ```

## 표준 작업 순서

1. **현재 상태 파악**
   - `git log --oneline -5`, `git status --short`
   - `docs/checklist.md` 당일 보안 항목 재확인 (LEAD가 우선순위 변경했을 수 있음)
   - `firestore.rules` 읽기
   - `security-docs/` 산출물 읽기
   - `compiled .js` 정리: `find apps/showup/src -name '*.js' -delete`

2. **규칙 회귀 테스트 실행**
   - Firebase 에뮬레이터 시작: `firebase emulators:start --only firestore` (백그라운드)
   - 스모크 테스트 실행: `node --experimental-vm-modules apps/showup/security/smoke-test.mjs`
   - 14개 시나리오 전체 PASS 확인

3. **검증 항목**
   - "블랙리스트" 용어: `search_files`로 코드/문서 전체 검색 (보안 문서 내 금지 규정 언급은 허용, 코드/화면 0건이어야 함)
   - 전화번호 마스킹: FE 페이지에서 `customer.phone` 직접 참조 0건, `phoneMasked`만 사용 확인
   - 동의 체크박스: 회원가입 시 `agreedToPrivacy` 미체크 차단 확인
   - riskStats 쓰기: Spark 요금제에서는 허용, Blaze 전환 후 차단+Cloud Functions 이관

4. **산출물 업데이트**
   - `security-docs/security-report.md` — 테스트 결과 반영
   - `security-docs/penetration-test.md` — 시나리오 추가/업데이트
   - `docs/checklist.md` — 완료 항목 체크

## 주의사항(Pitfalls)

- **`@firebase/rules-unit-testing` v5 모듈 resolve 실패 (npm workspaces hoisting)**: `@firebase/rules-unit-testing`이 hub 루트로 hoist되지만 `firebase` 패키지는 showup workspace에만 있어서 ESM resolve 실패. 해결: `ln -sf apps/showup/node_modules/firebase hub/node_modules/firebase` 심볼릭 링크 생성. 또는 `npm install --save-dev @firebase/rules-unit-testing --legacy-peer-deps`를 showup에 직접 설치.
- **에뮬레이터 테스트 시 DB 초기화**: 각 테스트 시나리오가 같은 projectId를 공유하면 이전 테스트의 문서가 남아 `set()`이 update로 동작함. `env.clearFirestore({ projectId })`를 각 테스트 시작 전에 호출.
- **`assertFails` 로그 주의**: 에뮬레이터 로그에 `PERMISSION_DENIED`가 출력되는 것은 정상 — `assertFails`가 기대한 차단 동작의 결과. 테스트 결과 요약(✅/❌)만 보면 됨.
- **riskStats 직접 쓰기**: Spark 요금제에서는 Cloud Functions 배포 불가 → rules에서 riskStats 쓰기 허용. Blaze 전환 후 차단 복구 필요. 보안 영향: owner만 자기 가게 riskStats 갱신 가능하므로 타 가게 조작 위험 없음.
- **cascade 삭제 미구현**: `deleteCustomer()`가 하위 incidents/reservations 미삭제. Firestore는 자동 cascade 미지원. 보안 영향: 하위 문서 접근은 rules로 owner만 차단 가능 → 데이터 유출 위험 없음. BE에 cascade 삭제 구현 요청.
- **보안 문서 내 "블랙리스트" 언급**: 금지 규정을 설명하는 문서(terms-draft.md, penetration-test.md)에서 `blacklist` 단어를 사용하는 것은 정책 언급이므로 허용. 코드/화면/UI 텍스트에 0건이어야 함.
- **terms-draft.md 깨진 텍스트**: 이전 세션에서 마크다운 형식이 깨진 적이 있음 (`## ics:// --- Placeholder ---`). 보안 산출물 수정 시 마크다운 구조 확인 필수.

## 보안 원칙

- 로그인한 사용자만 자기 store에 접근 가능 (`ownerUid == request.auth.uid`)
- 타 가게 customer, reservation, incident 접근 전부 차단
- 전화번호 원본은 Firestore에 저장하되 UI/로그에는 마스킹만 (`010-****-1234`)
- 사건 메모는 "사실만 기록" 가이드 표시
- "블랙리스트" 용어 코드/화면/문서 0건 (보안 문서 내 금지 규정 언급은 제외)
- "위험 고객" 표현은 경고 배너에서만 제한적 사용, 설명에 "참고 지표" 병기

## Firestore Rules 목표 구조

```txt
function isStoreOwner(storeId) {
  return request.auth != null
    && get(/databases/$(database)/documents/stores/$(storeId)).data.ownerUid == request.auth.uid;
}
match /stores/{storeId} {
  allow create: if request.auth != null && request.resource.data.ownerUid == request.auth.uid;
  allow read: if request.auth != null && resource.data.ownerUid == request.auth.uid;
  // customers, incidents, reservations 각각 필드 검증 포함
}
```

## 검증해야 할 공격 시나리오

1. 비로그인 store/customer/reservation/incident 접근
2. 타 가게 store read/write
3. ownerUid 위조 store create
4. 타 가게 고객 read/write/update/delete
5. 타 가게 사건 read/write/update/delete
6. 허용되지 않은 incident type create/update
7. 타 가게 예약 read/write/update/delete
8. 예약 status 허용값 외 차단
9. 고객 create 필드 검증 (name/phone/phoneLast4)
10. 고객 update 필드 검증 (name 빈 문자열 차단)
11. riskStats 클라이언트 갱신 (Spark: 허용, Blaze: 차단)
12. 정상 소유자 CRUD 허용
13. 회원가입 동의 체크박스 미체크 차단
14. "블랙리스트" 용어 0건

## 참고 자료

- [references/emulator-smoke-test-pattern.md](references/emulator-smoke-test-pattern.md) — Firebase 에뮬레이터 기반 보안 스모크 테스트 패턴 (설정, 실행, 결과 해석)
- [references/security-report-structure.md](references/security-report-structure.md) — 보안 리포트 최종 구조 (섹션별 내용, 산출물 목록)
- `showup-be-development` 스킬 — BE 관점의 보안 규칙/마스킹 내용 (중복 영역 있음, BE↔Security 협업 시 참조)