# ShowUp — 미션 요구사항 vs 실제 아키텍처 차이 설명

## 1. 미션이 가정하는 아키텍처

미션은 **전통적 3티어 구조**를 가정한다:

```
React (Vercel)  →  Express 서버 (Render)  →  Supabase (PostgreSQL)
   FE                  BE (중간 서버)              DB
```

- FE는 HTTP 요청으로 BE(Express)에 접근한다
- BE는 비즈니스 로직을 처리하고 DB(Supabase)에 접근한다
- FE와 BE가 분리되어 있어 CORS 설정, 환경변수로 BE 주소 설정이 필요하다
- 상태 확인 API(`/health`)로 BE가 살아있는지 확인한다

## 2. ShowUp의 실제 아키텍처

ShowUp은 **Firebase 서버리스 구조**를 사용한다:

```
React (Firebase Hosting)  →  Firebase SDK  →  Firestore / Auth (직접 접근)
   FE                            클라이언트 SDK           DB + 인증
```

- FE가 Firebase SDK를 통해 **직접** Firestore에 접근한다
- 중간에 Express 서버가 없다
- 보안은 Firestore Security Rules가 담당한다 (서버 역할 대체)
- CORS 설정이 불필요하다 (HTTP 요청이 아니라 SDK 호출이므로)
- 환경변수는 Firebase config 값 (API 키, 프로젝트 ID 등)

## 3. 항목별 차이

### 3.1 FE 배포

| 항목 | 미션 | ShowUp |
|------|------|--------|
| 배포 플랫폼 | Vercel | Firebase Hosting |
| 배포 방법 | Vercel에 GitHub repo 연결 | `firebase deploy --only hosting` |
| 결과 | Vercel URL에서 React 화면 | Firebase URL에서 React 화면 |
| 실제 주소 | (미션 가정) | https://showup-project.web.app |

**동작 차이**: 없다. 둘 다 정적 React 파일을 호스팅하고 URL에서 화면이 열린다.

### 3.2 BE 배포

| 항목 | 미션 | ShowUp |
|------|------|--------|
| 배포 플랫폼 | Render | Firebase (Firestore + Security Rules) |
| BE 형태 | Express 서버 (Node.js 프로세스) | 서버리스 (서버 프로세스 없음) |
| 상태 확인 | `/health` API 응답 | Firebase Hosting 200 OK + Firestore 응답 |
| 배포 방법 | Render에 GitHub repo 연결 | `firebase deploy --only firestore:rules,indexes` |

**동작 차이**:
- 미션: Express 서버가 항상 실행되며 HTTP 요청을 받아 처리한다
- ShowUp: 서버 프로세스가 없다. Firestore Security Rules가 요청을 검증하고 데이터를 반환한다
- 미션: BE 장애 시 FE가 요청 실패
- ShowUp: Firestore 직접 접근이므로 BE 장애 개념이 없음 (Firebase 인프라 장애만 존재)

### 3.3 FE-BE 연결

| 항목 | 미션 | ShowUp |
|------|------|--------|
| 연결 방식 | FE → HTTP 요청 → BE | FE → Firebase SDK → Firestore |
| 환경변수 | BE 주소 (`API_URL`) | Firebase config (`apiKey`, `projectId` 등) |
| CORS | BE에서 FE 도메인 허용 필요 | 불필요 (SDK 기반, HTTP 요청 아님) |

**동작 차이**:
- 미션: `fetch(`${API_URL}/customers`)` → Express가 처리 → Supabase 쿼리
- ShowUp: `getDocs(collection(db, 'customers'))` → Firestore SDK가 직접 조회
- 미션: BE가 CORS 헤더를 반환해야 FE에서 응답을 받을 수 있음
- ShowUp: SDK가 내부적으로 처리하므로 CORS 개념 자체가 없음

### 3.4 DB

| 항목 | 미션 | ShowUp |
|------|------|--------|
| DB | Supabase (PostgreSQL, 관계형) | Firestore (NoSQL, 문서형) |
| 쿼리 | SQL (`SELECT * FROM customers WHERE ...`) | SDK 쿼리 (`where('phoneLast4', '==', '5678')`) |
| 스키마 | 테이블 + 외래키 | 컬렉션 + 하위 컬렉션 |
| 데이터 확인 | Supabase Dashboard | Firebase Console Firestore 탭 |
| 보안 | Row Level Security (RLS) | Firestore Security Rules |

**동작 차이**:
- 미션: BE(Express)가 SQL 쿼리를 실행하고 결과를 FE에 JSON으로 반환
- ShowUp: FE가 직접 Firestore에서 문서를 읽고 React에서 처리
- 미션: 조인이 필요하면 BE에서 SQL JOIN
- ShowUp: 조인 없이 하위 컬렉션으로 구조화 (`stores/{uid}/customers/{id}/incidents/{id}`)

### 3.5 핵심 기능 동작 흐름 비교

**미션 기반 (가정)**:
```
1. 사용자가 고객 검색 → FE가 GET /api/customers?q=5678 요청
2. Express가 요청 받음 → Supabase에 SELECT 쿼리
3. Supabase가 결과 반환 → Express가 JSON 응답
4. FE가 응답을 화면에 렌더링
```

**ShowUp 실제**:
```
1. 사용자가 고객 검색 → FE가 searchCustomers(uid, '5678') 호출
2. Firebase SDK가 Firestore에 where('phoneLast4', '==', '5678') 쿼리
3. Firestore Security Rules가 권한 검증 (ownerUid == auth.uid)
4. Firestore가 결과 반환 → SDK가 FE에 데이터 전달
5. FE가 화면에 렌더링
```

차이: 미션은 4단계(FE → BE → DB → BE → FE), ShowUp은 3단계(FE → DB → FE). 중간 서버가 없어서 한 단계가 줄어든다.

## 4. 미션 최소 완료 기준 대응

| 미션 최소 기준 | ShowUp 달성 여부 | 대응 방식 |
|---------------|-----------------|----------|
| Vercel 주소에서 React 화면이 열림 | ✅ 달성 | Firebase Hosting URL에서 React 화면 열림 |
| Render 주소의 상태 확인 API가 응답 | ✅ 달성 | Firebase Hosting 200 OK + Firestore 정상 응답 |
| FE 환경변수에 Render API 주소 설정 | ✅ 달성 | FE 환경변수에 Firebase config 설정 (.env) |
| BE CORS 설정에 Vercel 주소 반영 | ✅ 불필요 | Firebase SDK 기반이라 CORS 설정 없음 |
| Render에 Supabase 연결 정보 설정 | ✅ 달성 | Firebase 프로젝트에 Firestore 활성화 + Rules 배포 |
| 배포된 화면에서 핵심 기능 실행 | ✅ 달성 | 검색 → 경고 → 예약 → 기록 → 위험도 갱신 전체 동작 |
| 브라우저 개발자 도구에서 요청/응답 확인 | ✅ 달성 | Firestore SDK 요청이 Network 탭에 표시됨 |
| Supabase에서 데이터 저장/조회 확인 | ✅ 달성 | Firebase Console Firestore 탭에서 확인 |

## 5. 왜 Firebase를 선택했는가

1주차 기획서(docs/plan.md §8)에 명시한 이유:

- **가게 격리가 핵심**: ShowUp은 가게마다 데이터를 완전히 분리해야 한다. Firestore Security Rules의 `ownerUid == auth.uid` 검증이 이에 정확히 부합한다
- **3주 내 구축 불가**: Express + Supabase로 서버 + DB + Auth + 보안 규칙을 직접 구축하면 3주 안에 MVP 완성이 어렵다
- **배포 속도**: Firebase Hosting은 빌드 후 1분 내 배포 완료. Vercel + Render 2곳 배포보다 단순하다
- **인증 기본 제공**: Firebase Auth가 이메일/비밀번호 인증을 기본 제공하므로 별도 구현 불필요

## 6. Cloud Functions (Express 대체 계획)

ShowUp은 현재 Spark(무료) 요금제로 Cloud Functions를 배포하지 않았다. 위험도 갱신을 클라이언트 `riskRefresh.ts`가 담당하고 있다.

Blaze(종량제) 요금제 전환 시:
- `functions/` 디렉토리의 Cloud Functions를 배포하면 Express와 유사한 서버 로직이 추가됨
- 예약/사건 변경 시 서버에서 자동으로 riskStats 재계산
- 이때 미션의 3티어 구조와 더 가까워진다

```
현재:     React → Firestore (직접)
Blaze 후:  React → Firestore → Cloud Functions (서버 트리거) → Firestore
```

## 7. 추가 차이점 — 미션 요구사항 전체 검토

### 7.1 개인정보처리방침 / 이용약관

| 항목 | 미션 요구 | ShowUp 현황 |
|------|----------|------------|
| 법적 문안 | 실제 서비스에 맞는 문안 게시 | 2026-07-28 MVP 운영 초안 게시, 상용화 전 법률 검토 필요 |
| 회원가입 동의 | 실제 동의 받기 | 체크박스 + `/privacy`, `/terms` 링크 페이지 존재 |
| 미구현 기능 표시 | 문서와 일치해야 함 | plan.md에 삭제·이의제기·정정 명시되어 있으나 미구현 |

**차이**: placeholder는 제거했지만 사업자 정보·보유기간·국외 이전 세부 고지는 상용화 전 보완해야 한다.

### 7.2 고객 삭제 시 하위 데이터 처리

| 항목 | 미션 요구 | ShowUp 현황 |
|------|----------|------------|
| 고객 삭제 | 하위 데이터 처리 정책 확정 | `deleteCustomer()`가 연결 reservations/incidents/customer를 batch 삭제 |

**차이**: 클라이언트 batch cascade를 구현했다. 500개 초과 데이터는 여러 batch라 완전 원자적이지 않으며 계정 전체 삭제는 별도 과제다.

### 7.3 보안 테스트 추적 가능성

| 항목 | 미션 요구 | ShowUp 현황 |
|------|----------|------------|
| 테스트 코드 추적 | Git에 추적되어 재현 가능 | `security/smoke-test.mjs` 추적 예외 추가 |
| 테스트 실행 | 누구나 clone 후 실행 가능 | `firebase emulators:exec --only firestore "npm run verify:security"` |
| "18개 PASS" 재현 | 문서와 실행 결과가 일치해야 함 | 2026-07-28 로컬 18/18 PASS |

**차이**: 오래된 중복 테스트 대신 한 개의 추적 가능한 Rules 회귀 테스트를 기준으로 통일했다.

### 7.4 데모 계정 보안

| 항목 | 미션 요구 | ShowUp 현황 |
|------|----------|------------|
| 비밀번호 노출 | 비밀 키를 GitHub에 올리지 않음 | 데모 계정 비밀번호가 README.md와 createDemoStore.ts에 공개 |

**차이**: `.env`는 GitHub에 없지만, 데모 계정 비밀번호(`demoPassword123!`)가 README와 소스 코드에 평문으로 들어있음. 공개 배포 환경에서 누구나 데모 계정으로 로그인해 데이터를 수정할 수 있음.

### 7.5 Express 포트 환경변수

| 항목 | 미션 요구 | ShowUp 현황 |
|------|----------|------------|
| 포트 설정 | `process.env.PORT` 사용 | Express 없음, 포트 개념 없음 |

**차이**: 미션은 Express가 배포 환경의 포트를 사용하도록 요구하지만, ShowUp은 Express가 없으므로 해당 없음.

### 7.6 영상 제출

| 항목 | 미션 요구 | ShowUp 현황 |
|------|----------|------------|
| 5분 미만 영상 | 수요일 밤 10시까지 PR에 포함 | 미녹화 (7/29 예정) |
| 음성/자막 | 설명 포함 | 미녹화 |
| showcase.json | `demoVideoUrl` 입력 | 필드는 있으나 값은 빈 문자열 (영상 후 URL 입력 예정) |

### 7.7 환경변수 관리

| 항목 | 미션 요구 | ShowUp 현황 |
|------|----------|------------|
| 비밀 키 분리 | GitHub에 올리지 않음 | ✅ .env는 .gitignore + symlink to ~/Secrets/ |
| FE에서 BE 주소 | 환경변수로 읽음 | Firebase config 값으로 대체 (.env의 VITE_FIREBASE_* 값) |
| 배포 환경 설정 | Vercel/Render 대시보드에서 설정 | Firebase Console에서 프로젝트 설정, Hosting은 빌드 시 .env 주입 |

**차이**: 미션은 FE와 BE 환경변수를 분리해서 설정하지만, ShowUp은 FE에만 Firebase config가 있고 BE(서버)가 없으므로 환경변수가 하나뿐임.

## 8. 요약

미션과 ShowUp은 **기술 스택이 다를 뿐 달성 목표는 동일**하다:

| 목표 | 미션 방식 | ShowUp 방식 |
|------|----------|------------|
| FE 배포 | Vercel | Firebase Hosting |
| BE/DB 배포 | Render + Supabase | Firebase Firestore + Rules |
| FE-BE 연결 | HTTP + 환경변수 | SDK + 환경변수 |
| 보안 | RLS + CORS | Security Rules (CORS 불필요) |
| 핵심 기능 동작 | ✅ | ✅ |
| 외부 접속 가능 | ✅ | ✅ showup-project.web.app |

### 추가로 해결 필요한 항목

| 항목 | 시급성 | 해결 방법 |
|------|--------|----------|
| 보안 테스트 추적 | 완료 | `security/smoke-test.mjs`를 Git 추적 대상으로 유지하고 Emulator 18개 회귀 테스트 실행 |
| 데모 계정 비밀번호 공개 | 낮 | 제출 후 계정 비활성화 또는 데이터 초기화 |
| 법적 문안 | 중 | MVP 운영 초안 게시 완료; 상용화 전 사업자·보유기간·국외 이전 고지와 법률 검토 필요 |
| 고객 삭제 cascade | 낮 | 고객 단위 reservations/incidents cascade 완료; 계정·가게 전체 삭제는 별도 구현 |
| 영상 제출 | 높 | 7/29 수요일 녹화·업로드·`demoVideoUrl` 갱신 예정 |
