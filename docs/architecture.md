# TasteFit 데이터 흐름 및 시스템 아키텍처

![TasteFit 데이터 흐름 및 시스템 아키텍처](./tastefit-architecture.png)

## 편집 가능한 원본

```mermaid
flowchart LR
    U["사용자"]

    subgraph B["브라우저 · React/Vite"]
        direction TB
        UI["화면<br/>로그인 · 회원가입<br/>지도/검색 · 매장 목록<br/>매장 상세 · 리뷰"]
        STATE["클라이언트 상태/로직<br/>상황별 추천 점수 계산<br/>검색·리뷰 결과 조합"]
        LS[("Local Storage<br/>Access Token · 사용자 정보")]
        GEO["Browser Geolocation<br/>현재 위도·경도"]
        UI <--> STATE
        UI <--> LS
        GEO -->|"현재 위치"| STATE
    end

    subgraph S["애플리케이션 서버 · Node.js/Express"]
        direction TB
        API["REST API<br/>/api/auth/*<br/>/api/reviews/*<br/>/api/stores"]
        AUTH["인증 확인<br/>Bearer Token 검증"]
        REVIEW["리뷰 서비스<br/>목록 · 요약 · 작성 · 공감"]
        API --> AUTH
        API --> REVIEW
    end

    subgraph SB["Supabase"]
        direction TB
        SBAUTH["Supabase Auth<br/>회원가입 · 로그인 · 사용자 검증"]
        DB[("PostgreSQL<br/>stores · reviews · profiles")]
        RPC["DB Functions / RLS<br/>취향 유사도 조회<br/>리뷰 공감 집계·토글"]
        RPC <--> DB
    end

    KAKAO["Kakao Maps JavaScript API<br/>지도 · 장소/키워드 검색<br/>음식점/카페 위치 정보"]

    U -->|"검색·선택·리뷰 작성"| UI
    UI -->|"결과 화면"| U

    STATE <-->|"지도/장소 데이터<br/>HTTPS · Kakao SDK"| KAKAO
    STATE <-->|"JSON REST 요청/응답<br/>개발 시 Vite /api 프록시"| API
    LS -.->|"리뷰 작성·공감·맞춤 리뷰 시<br/>Authorization: Bearer token"| API

    AUTH <-->|"로그인·가입·JWT 검증"| SBAUTH
    REVIEW <-->|"매장·리뷰·프로필 CRUD"| DB
    REVIEW <-->|"취향 유사도·공감 처리"| RPC

    DB -->|"리뷰 요약/평점 데이터"| REVIEW
    REVIEW -->|"요약 데이터"| STATE
    KAKAO -->|"매장 후보"| STATE
    STATE -->|"후보 + 리뷰 요약 결합<br/>상황별 점수 계산·정렬"| UI

    classDef client fill:#FFF5E8,stroke:#A66A3F,color:#3E2723;
    classDef server fill:#EAF3FF,stroke:#477DB3,color:#18324B;
    classDef data fill:#ECF8EF,stroke:#4C8B5F,color:#173C22;
    classDef external fill:#FFF9D9,stroke:#B89A2D,color:#4A3C00;
    class U,UI,STATE,LS,GEO client;
    class API,AUTH,REVIEW server;
    class SBAUTH,DB,RPC data;
    class KAKAO external;
```

## 핵심 흐름

1. 사용자의 현재 위치 또는 검색어를 브라우저가 Kakao Maps API에 전달해 음식점·카페 후보를 받습니다.
2. React 화면은 후보의 Kakao Place ID를 Express의 리뷰 요약 API로 보내고, 서버는 Supabase의 `stores`, `reviews` 데이터를 집계해 반환합니다.
3. 브라우저가 장소 정보와 리뷰 요약을 합치고, 선택한 상황에 맞는 추천 점수를 계산·정렬하여 지도와 매장 목록에 표시합니다.
4. 로그인·회원가입은 Express를 거쳐 Supabase Auth에서 처리합니다. 로그인 결과의 Access Token과 사용자 정보는 브라우저 Local Storage에 저장됩니다.
5. 리뷰 조회·작성·공감 시 Express가 토큰을 검증하고 Supabase 테이블 및 DB 함수를 호출합니다. 취향 유사도와 공감 결과가 다시 매장 상세 화면에 표시됩니다.

> 실선은 주요 요청·응답 또는 데이터 흐름이고, 점선은 인증이 필요한 요청에 토큰이 추가되는 흐름입니다. 이 문서는 현재 저장소의 구현을 기준으로 작성했습니다.
