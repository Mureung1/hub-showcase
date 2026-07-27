# Mealyze 아키텍처 — 데이터 흐름 한눈에 보기

> 이 문서의 모든 그림은 **Mermaid**로 그렸다. GitHub·VS Code가 빌드 없이 그대로 렌더하고, 텍스트라
> git diff로 변경 이력이 남으며, 코드가 바뀌면 그림도 같은 PR에서 함께 고칠 수 있어서다.
> (PlantUML은 렌더 서버가 필요하고, Structurizr는 별도 모델 빌드가 필요해 README 임베드에 맞지 않는다.)
>
> 압축본은 [README](../../README.md#아키텍처-한눈에-보기)에 있다. 이 문서는 그 확장판이다.

---

## 1. 시스템 전체 구조

한 문장 요약: **브라우저(또는 웹뷰 앱)가 화면을 다 그리고, 비밀 키가 필요한 외부 호출만 Express 프록시가 대신하며, 데이터는 로그인 여부에 따라 localStorage나 Supabase로 갈린다.**

```mermaid
graph TB
    subgraph client["🖥️ 클라이언트 (React SPA · Vite 번들)"]
        direction TB
        pages["화면 8개<br/>/analyze · /result · /meals<br/>/calendar · /map · /profile<br/>/login · /signup"]
        ctx["UserContext · ToastContext<br/>세션·프로필·오늘 식단·토스트"]
        ds{{"dataStore.js<br/><b>저장소 분기점</b>"}}
        libs["도메인 로직<br/>nutrition · foodNameMap<br/>adRecommendation · backupFormat"]
        pages --> ctx --> ds
        pages --> libs
    end

    subgraph proxy["⚙️ Express 프록시 (server/proxy.js — 단일 파일)"]
        direction TB
        r1["/api/gemini"]
        r2["/api/fooddb"]
        r3["/api/naver-places"]
        r4["/api/reverse-geocode"]
        r5["/api/places · /api/geocode<br/><i>(롤백용, 미사용)</i>"]
    end

    subgraph store["💾 저장소"]
        ls[("localStorage<br/>게스트 데이터<br/>cjmt: 접두사")]
        sb[("Supabase Postgres<br/>profiles · meals<br/>RLS: auth.uid()")]
        auth[["Supabase Auth<br/>bcrypt · JWT"]]
    end

    subgraph ext["🌐 외부 서비스 (서버가 키를 쥐고 대신 호출)"]
        or["OpenRouter<br/>Gemini 3 Flash"]
        food["공공데이터포털<br/>식약처 영양성분 DB"]
        naver["NAVER API Hub<br/>지역 검색"]
        kakao["Kakao Local<br/>좌표→지역명"]
    end

    subgraph direct["🌐 브라우저가 직접 (공개 키)"]
        nmap["Naver Maps JS SDK"]
        coupang["쿠팡 파트너스<br/>제휴 링크 이동"]
    end

    ds -->|게스트| ls
    ds -->|로그인| sb
    ctx <-->|"로그인·세션 복원"| auth
    auth -.->|"auth.uid()로 RLS 통과"| sb

    pages -->|"fetch /api/*"| proxy
    r1 --> or
    r2 --> food
    r3 --> naver
    r4 --> kakao
    r5 -.-> kakao

    pages --> nmap
    pages --> coupang

    classDef dim fill:#f5f5f5,stroke:#bbb,color:#888,stroke-dasharray:4 3
    class r5 dim
```

**핵심 규칙 3가지**

| 규칙 | 이유 |
|---|---|
| 비밀 키는 서버에만 | `OPENROUTER_API_KEY`·`FOODSAFETY_*`·`NAVER_SEARCH_*`·`KAKAO_REST_API_KEY`는 브라우저에 절대 안 나간다. `/api/*`는 오직 이걸 위해 존재한다 |
| `VITE_` 키는 공개 전제 | 지도 SDK 키와 Supabase anon key는 번들에 박힌다. 접근 제어는 키가 아니라 **RLS와 도메인 등록**이 한다 |
| 화면은 저장소를 모른다 | 게스트/로그인 분기는 `dataStore.js` 한 곳에만 있다 |

---

## 2. 저장소 분기 — 게스트 우선(guest-first) 설계

로그인은 **선택**이다. 로그인 없이도 모든 화면이 완전히 동작한다.

```mermaid
flowchart TD
    entry["화면이 dataStore 호출<br/>getMeals · addMeal · getProfile ..."]
    sess{"supabase.auth.getSession()<br/><i>로컬 캐시 읽기, 네트워크 아님</i>"}
    guest["게스트 경로<br/>mealStore.js / storage.js"]
    user["로그인 경로<br/>db.js → Supabase"]
    lsdb[("localStorage<br/>cjmt:meals:guest:&lt;날짜&gt;<br/>cjmt:guestProfile")]
    pg[("Postgres<br/>meals · profiles<br/><b>RLS로 본인 행만</b>")]

    entry --> sess
    sess -->|"세션 없음"| guest --> lsdb
    sess -->|"세션 있음"| user --> pg

    login["로그인/가입 직후"] -.->|"게스트 데이터가 남아있으면<br/>1회 동의 프롬프트"| mig["guestMigration.js<br/>프로필은 계정에 없을 때만<br/>끼니는 id 단위 중복 방지"]
    mig -.->|"복사(원본은 남김)"| pg
```

> **로컬에만 남는 것**: 달력의 수동 상태 표시(`dayStatus`), 카드 표시 설정(`cardSettings`), 광고 노출/클릭 집계(`adData`).
> 이들은 `effectiveUserId`(로그인=uid, 게스트=`'guest'`)로 키를 잡지만 **저장 위치는 항상 기기**다 → 3장 발견 4번 참고.

---

## 3. 핵심 흐름 — 사진 한 장이 영양 수치가 되기까지

이 앱에서 가장 복잡한 경로다. **AI는 "무엇을 얼마나"만 답하고, 실제 수치는 식약처 DB에서 온다.**

```mermaid
sequenceDiagram
    autonumber
    actor U as 사용자
    participant A as Analyze 화면
    participant P as Express 프록시
    participant G as OpenRouter(Gemini)
    participant F as 식약처 DB
    participant N as nutrition.js
    participant S as dataStore

    U->>A: 사진 촬영/선택 (+ 메뉴명·브랜드 힌트)
    Note over A: 캔버스로 긴 변 1024px 리사이즈 → base64
    A->>P: POST /api/gemini (이미지)
    P->>G: 키를 실어 대신 호출
    G-->>P: 음식명 + 검색어 + 추정 g
    P-->>A: 식별 결과만 (수치 아님)

    loop 음식마다
        A->>P: POST /api/fooddb (검색어 캐스케이드)
        Note right of A: dbSearchName → 표준명 정규화<br/>→ 가공식품DB → 접두 2자 제거<br/>→ fallbackSearchName …
        P->>F: 조회
        F-->>P: 100g당 영양성분
        P-->>A: 매칭 후보
    end

    A->>N: 100g당 → 실제 섭취량 환산
    N->>N: clampToPlausibleNutrients
    Note right of N: DB 값이라도 1인분 상식을<br/>크게 벗어나면 경계값으로 보정
    N-->>A: 최종 영양소

    A-->>U: 결과 카드로 전환 (같은 자리)
    U->>A: 시간대 선택 후 [저장하기]
    A->>S: addMeal(끼니 1건 = 사진 1회 분석)
    S-->>A: 게스트=localStorage / 로그인=Supabase
```

**분석 경로가 셋이라는 점에 주의** — 셋 다 같은 결과 카드/저장 흐름으로 합류한다.

```mermaid
flowchart LR
    photo["📷 사진 있음"] --> ai1["Gemini 식별<br/>(무엇을·몇 g)"] --> db["식약처 DB 조회"] --> clamp["현실 범위 보정"] --> card
    text["⌨️ 메뉴명만"] --> ai2["Gemini 식별<br/>(표준 1인분 g)"] --> db
    label["🏷️ 영양성분표 스캔"] --> ai3["Gemini 표 추출<br/><i>추정 아님</i>"] --> card

    card["결과 카드<br/>(같은 상태 머신)"] --> save["저장 → dataStore"]
```

> 사진·텍스트 경로는 **같은 함수(`resolveFoodItem`)로 합류한다** — AI는 식별(검색명·그램)만 하고,
> 실제 수치는 둘 다 식약처 DB 캐스케이드에서 온다(실패 시에만 AI 추정치 폴백 + 현실 범위 보정).
> 같은 음식이면 사진으로 찍든 타이핑하든 같은 수치·같은 출처 배지가 나온다.

---

## 4. 인증 — 아이디/비밀번호를 Supabase Auth 위에 얹은 방식

```mermaid
flowchart LR
    subgraph ui["가입/로그인 화면"]
        id["아이디<br/>영문소문자+숫자 4~20"]
        pw["비밀번호<br/>8자+ 영문+숫자"]
        nick["닉네임"]
    end

    map["authId.js<br/><b>아이디 → 합성 이메일</b><br/>&lt;아이디&gt;@mealyze.app"]
    gt["Supabase Auth (GoTrue)<br/>bcrypt 해싱 · JWT 발급"]
    meta["user_metadata<br/>nickname · login_id"]
    rls["RLS: auth.uid()"]

    id --> map --> gt
    pw --> gt
    nick --> meta
    gt --> meta
    gt -->|"세션 → localStorage<br/>자동 로그인 유지"| rls

    lock["로그인 실패 5회 → 1분 잠금<br/><i>기기 로컬 카운터</i>"] -.->|"서버 레이트리밋 앞단"| gt
```

**왜 합성 이메일인가**: 이메일 컬럼의 UNIQUE 제약이 그대로 아이디 중복 방지가 되고, 비밀번호 해싱·세션·RLS를 **한 줄도 바꾸지 않고** 인증 수단만 교체할 수 있다. 이 도메인으로는 메일을 보내지도 받지도 않는다(Supabase에서 "Confirm email"을 반드시 꺼야 하는 이유).

---

## 5. 배포 토폴로지 — 한 코드베이스, 세 갈래

```mermaid
flowchart TB
    repo["📦 같은 저장소 / 같은 브랜치"]

    subgraph rn["Render"]
        rp["server/proxy.js 직접 실행<br/>app.listen() + dist/ 정적 서빙<br/>+ SPA 폴백"]
    end
    subgraph vc["Vercel"]
        vi["api/index.js<br/>같은 Express 앱을 핸들러로 re-export<br/>listen·정적서빙 건너뜀"]
        vs["vercel.json이 정적 자산·SPA 라우팅 처리"]
    end
    subgraph ap["Android APK (Capacitor)"]
        wv["WebView가 <b>배포된 URL을 그대로 로드</b><br/>capacitor.config.json의 server.url"]
        pl["네이티브 플러그인<br/>Filesystem · Share · Browser · App"]
    end

    repo --> rn
    repo --> vc
    repo --> ap
    vc -.->|"배포된 사이트"| wv

    web["웹 코드 변경"] -->|"배포만 하면 앱에도 즉시 반영"| wv
    nat["플러그인 추가/변경"] -->|"npm run app:sync + APK 재설치 필요"| pl

    classDef warn fill:#FDEEEF,stroke:#F04452
    class nat warn
```

> `process.env.VERCEL` 유무로 같은 파일이 두 모드로 동작한다. **업데이트 채널이 둘**이라는 점이 함정 → 발견 5번

---

## 6. CSV 백업 — 내보내기 둘, 가져오기 하나

```mermaid
flowchart LR
    subgraph out["내보내기 (진입점 2개)"]
        e1["MY 탭<br/>전체 백업"] --> f1["[profile]/[meals] 섹션<br/>신체정보 포함"]
        e2["달력 탭<br/>기간별 기록"] --> f2["평면 표<br/>recommended_*/compliant"]
    end

    bf["backupFormat.js<br/><b>컬럼·직렬화·파싱 단일 소스</b>"]
    f1 & f2 -.->|"같은 상수 참조"| bf

    subgraph in["가져오기 (진입점 1개)"]
        det{"내용으로 형식 자동 판별<br/><i>파일명 안 봄</i>"}
        parse["parseBackupText<br/>깨진 행은 건너뛰고 집계"]
        dlg["중복 날짜?<br/>덮어쓰기 / 건너뛰기"]
        apply["applyBackup → dataStore"]
    end

    f1 & f2 --> det --> parse --> dlg --> apply

    plat["fileExport.js<br/>웹=blob 다운로드<br/>APK=Filesystem+Share<br/>UTF-8 BOM 부착"]
    out --> plat
```

---

## 7. 광고 — 사용자별 개인화는 판정 단계에서 일어난다

```mermaid
flowchart LR
    meals["오늘 식단 합계"] --> calc{"권장량 대비<br/>달성률 &lt; 80%?"}
    calc -->|"부족 있음"| top["달성률 낮은 순 상위 1~3 영양소"]
    calc -->|"기록 없음 / 전부 달성"| fb["폴백: 한국인 대표 부족<br/>비타민D·칼슘·비타민A…<br/><i>날짜 기준 순환</i>"]
    top & fb --> pick["coupangProducts.js<br/><b>정적 데이터</b>"]
    pick --> banner["식단 탭 가로 캐러셀<br/>AD 배지 + 파트너스 고지<br/><i>생략 불가</i>"]
    banner -->|"탭"| ext["쿠팡 상품 페이지<br/>APK=시스템 브라우저"]
```

> **상품 카탈로그는 전 사용자가 공유**하고, 개인화는 "어떤 영양소가 부족한가" 판정에서만 일어난다.
> 쿠팡 검색 API는 계정 기준 **시간당 10회** 제한이라 런타임 호출이 불가능하기 때문 → [next-쿠팡API-자동추천-프롬프트.md](next-쿠팡API-자동추천-프롬프트.md)

---

## 8. 4주차 추가 — 학식·급식 / 직업 추천 / AI 식습관 분석

```mermaid
flowchart TD
    profile["프로필.school<br/>{type: k12|university, ...}"] --> toggle["지도 탭<br/>학식·급식 토글"]
    toggle -->|"k12"| neis["/api/school-meal<br/>NEIS 급식식단정보"]
    toggle -->|"university"| univ["/api/univ-meal?univ=cnu<br/>(이번 주 전체, 24h 캐시)"]

    univ --> crawl["1차: cnu.js가 4개 건물 병렬 크롤링<br/>(2·3·4학생회관·생활과학대학)"]
    crawl -->|"4곳 모두 성공"| live["source: live<br/>(성공 시 폴백 파일도 자동 갱신)"]
    crawl -->|"하나라도 실패/타임아웃"| fb["2차: server/data/univ-meals.json"]
    fb -->|"주 데이터 있음"| fallback["source: fallback<br/>+ '○월 ○일 기준' 안내"]
    fb -->|"없음"| empty["source: empty<br/>(방학/휴무 — 에러 아님)"]

    neis --> allergyMap["allergyRules.js<br/>NEIS 번호 → M1~M19(공식)"]
    live & fallback --> allergyTag["cnuWeeklyParser.js<br/>주석(pork 등)+키워드 → M1~M19(추정 배지)"]
```

- **급식·학식 카드는 하나를 공유한다**(`MealCard.jsx`, 보강 Step 6) — 메뉴마다 알레르기 칩을 반복하지
  않고 메뉴명 옆 번호 위첨자(`src/lib/allergyDisplay.js`) + 카드 하단 범례 1줄로 축약해, 알레르기
  코드 통일(NEIS 공식 번호 ↔ 학식 키워드 추정, 둘 다 `allergyRules.js`의 M1~M19)의 이점이 표시
  레이어에서도 그대로 드러난다 — `estimated` 플래그로 배지만 다르게 그린다.
- **대학 학식은 5개 식당 × 주간 단위**(보강 Step 7)로 한 번에 받아온다 — 제1학생회관은 이 크롤링
  시스템에 실제 데이터가 없어(실측) 크롤링 대상에서 빼고 외부 안내 페이지 링크로 대체한다. 하이브리드
  판정은 `src/lib/cnuWeekFallback.js`의 순수 함수(`resolveCnuWeekResult`) 하나로 분리돼 있어, HTML
  파서(`src/lib/cnuWeeklyParser.js`)·크롤러(`server/univMealAdapters/cnu.js`)를 몰라도 테스트할 수
  있다. 화면은 이 주 전체를 한 번만 받아 날짜·식당·학생/직원 트랙 전환을 전부 클라이언트에서 처리한다
  (탭 클릭마다 서버를 다시 부르지 않는다).
- **직업 기반 추천**(`src/lib/occupationKeywords.js`)은 지도 탭에서 부족 영양소 추천과 **병렬로**
  돌아가는 완전히 별개의 검색이다 — 실패해도 서로 영향을 주지 않고, 지도에는 색이 다른 핀(빨강/파랑)
  으로 함께 표시된다(`NaverPlaceMap.jsx`). 직업 미설정이면 이 경로 자체가 아예 실행되지 않는다.
- **AI 식습관 분석**은 원본 끼니 기록을 절대 Gemini에 보내지 않는다 — `src/lib/dietSummary.js`가 만든
  집계 요약(일평균 칼로리·영양소별 달성률·자주 먹은 음식·과다/부족 항목)만 `/api/gemini`로 전달된다.
  같은 기간(7/30일) 분석은 하루 1회만 실제 호출하고(`dietAnalysisCache.js`, localStorage), 이후
  재방문·재클릭은 캐시만 보여준다 — 그래서 화면에 "다시 분석" 버튼이 없다.

---

## 9. 그림을 그리며 발견한 것 (다음 작업 후보)

다이어그램으로 옮겨 적으면서 **실제로 어긋나 있던 연결**들이다. 이번 작업에서는 코드를 고치지 않았고, 여기 기록만 남긴다.

### 🔴 1. 기간별 CSV의 `recommended_*`/`compliant`는 항상 빈칸이다

`csv.js`의 내보내기가 `dailyRecord.getRecord()`로 "그날의 권장량 스냅샷"을 읽는데, **그 스냅샷을 쓰는 유일한 함수 `dailyRecord.upsertMeal()`을 아무도 호출하지 않는다.**

```mermaid
flowchart LR
    w["upsertMeal()<br/>스냅샷 쓰기"] -.->|"❌ 호출하는 코드 없음"| snap[("dailyrecord:&lt;uid&gt;:&lt;날짜&gt;")]
    snap -->|"읽기만 살아있음"| ex["csv.js 기간별 내보내기<br/>recommended_* / compliant"]
    classDef dead fill:#FDEEEF,stroke:#F04452,stroke-dasharray:4 3
    class w dead
```

끼니 저장은 전부 `dataStore → mealStore/Supabase`로 가는데 이 스냅샷 경로만 옛 구조에 남았다. 결과적으로 신규 기록에서는 그 컬럼들이 **항상 빈 값으로 나간다**(파일 형식은 유효해 가져오기는 정상).
→ 선택지: ⓐ 컬럼을 내보내기에서 빼거나 ⓑ 저장 시점의 `effectiveRecommended`를 실제로 스냅샷하거나.

### 🟠 2. Kakao는 "롤백용"인데 키는 현역이다

`/api/places`·`/api/geocode`·`kakao.js`의 `searchPlaces`·`PlaceMap.jsx`·`useKakaoLoader.js`는 네이버 전환 후 아무 화면도 안 쓴다. 그런데 **`/api/reverse-geocode`(좌표→지역명)는 지금도 쓰여서** `KAKAO_REST_API_KEY`는 여전히 필수다. "롤백용 코드"와 "현역 기능"이 같은 키·같은 파일을 공유해, 롤백 코드를 지우려 해도 깔끔히 안 떨어진다.
→ 선택지: 역지오코딩을 네이버로 옮겨 Kakao 의존을 완전히 끊거나, 롤백 경로를 정식으로 폐기 선언.

### ✅ 3. ~~텍스트 분석은 식약처 DB를 안 탄다~~ (해소됨)

정확도 개선 작업에서 텍스트 경로를 사진 경로와 같은 구조(AI 식별 → `resolveFoodItem` 공유 →
식약처 DB 캐스케이드)로 재구성해 해소됐다. 같은 음식이면 두 경로의 수치·출처 배지가 일치한다.

### 🟡 4. 로그인해도 기기에 남는 설정이 있다

`dayStatus`(달력 수동 상태), `cardSettings`(표시할 영양소), `adData`(광고 집계)는 `effectiveUserId`로 키를 잡지만 저장 위치는 항상 localStorage다. 즉 **같은 계정으로 다른 기기에 로그인하면 이 설정들은 따라오지 않는다.** 식단·프로필은 동기화되는데 설정만 안 되니 사용자 기대와 어긋날 수 있다.

### 🟡 5. 업데이트 채널이 둘이다

APK가 원격 URL을 로드하므로 **웹 배포 = 앱 업데이트**지만, Capacitor 플러그인은 **APK 재설치**가 필요하다. 웹 코드가 새 플러그인을 쓰기 시작하면, 배포는 됐는데 구버전 APK에서만 깨지는 상태가 생긴다(3주차 CSV 저장이 정확히 이 형태였다).
→ 선택지: 네이티브 기능 호출부에 "플러그인 없음" 폴백을 두거나(현재 `fileExport`는 이미 폴백 있음), 앱 안에 최소 버전 안내.

### 🟡 6. 게스트 데이터는 기기 하나에 묶인다

게스트는 `GUEST_ID = 'guest'` 고정 버킷 하나뿐이라, 한 브라우저 = 한 게스트다. 기기 이동 수단은 CSV 백업뿐이고, **캐시를 지우면 복구 경로가 없다.** 의도된 설계지만 사용자에게는 그 사실이 MY 탭 안쪽에만 있다.

---

## 부록 — 화면과 데이터의 대응

```mermaid
flowchart LR
    subgraph s["화면"]
        a["/analyze 홈"]
        r["/result 진단"]
        m["/meals 식단"]
        c["/calendar 달력"]
        p["/map 지도"]
        f["/profile MY"]
    end
    subgraph d["주 데이터원"]
        gem["Gemini"]
        fdb["식약처 DB"]
        meal[("meals")]
        prof[("profiles")]
        loc["위치 · 네이버 지역검색"]
        lb["get_daily_leaderboard()"]
        localonly[("localStorage 전용<br/>dayStatus · cardSettings")]
    end

    a --> gem & fdb & meal
    r --> meal & prof & gem
    m --> meal & prof & lb
    c --> meal & localonly
    p --> loc & meal & prof
    f --> prof & localonly
```

| 화면 | 하는 일 | 로그인 필요? |
|---|---|---|
| `/analyze` | 사진·메뉴명·라벨 분석 → 끼니 저장 | ❌ |
| `/result` | 오늘 부족 영양소 진단 + AI 보충 메뉴 추천 | ❌ |
| `/meals` | 오늘 섭취량, 국민평균 비교, 영양제 광고, 순위 | 순위만 ✅ |
| `/calendar` | 날짜별 기록·상태, 기간별 CSV 내보내기 | ❌ |
| `/map` | 부족 영양소 기반 주변 식당 추천 | ❌ |
| `/profile` | 신체정보, 표시 설정, CSV 백업/복원 | ❌ |
