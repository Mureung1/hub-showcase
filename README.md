# CampusCart

AI 기반 대학생 공동구매 플랫폼

## 서비스 데이터 흐름

```mermaid
flowchart LR
    U[사용자]

    subgraph FRONT[React 화면]
        L[로그인·회원가입]
        GL[공동구매 목록]
        GD[공동구매 상세]
        PU[수령 장소 화면]
    end

    subgraph SERVER[Express 서버]
        AUTH[인증 API]
        LIST[GET 공동구매 조회]
        CREATE[POST 공동구매 생성]
        JOIN[POST 공동구매 참여]
        VOTE[POST 수령 장소 투표]
        FLOW[PATCH 장소 확정·단계 변경]
    end

    subgraph SUPABASE[Supabase]
        SA[Auth]
        PF[(profiles)]
        GB[(group_buys)]
        GP[(group_buy_participants)]
        GV[(group_buy_votes)]
    end

    U --> L
    U --> GL
    U --> GD
    U --> PU

    L -->|이메일·비밀번호·닉네임| AUTH
    GL -->|목록 요청| LIST
    GL -->|새 모집 정보| CREATE
    GD -->|수량·출발 위치| JOIN
    GD -->|후보 선택| VOTE
    GD -->|장소 확정·다음 단계| FLOW

    AUTH -->|계정 확인| SA
    AUTH -->|닉네임 저장·조회| PF
    LIST -->|select| GB
    LIST -->|참여자·투표 함께 조회| GP
    LIST -->|투표 수 집계| GV
    CREATE -->|insert| GB
    JOIN -->|insert·인원 증가| GP
    JOIN -->|current_people 갱신| GB
    VOTE -->|한 사람당 한 표 저장| GV
    FLOW -->|final_pickup·stage 갱신| GB

    SERVER -->|JSON 응답| FRONT
    FRONT -->|목록·인원·닉네임·투표 결과 갱신| U
```

사용자가 화면에서 요청하면 Express가 로그인 정보를 확인하고 Supabase에 데이터를 저장하거나 조회합니다. 화면은 서버가 돌려준 결과를 받아 목록, 참여 인원, 참여자 닉네임과 수령 장소 투표 현황을 갱신합니다.

구조를 정리하며 수령 장소 투표와 진행 단계가 임시 메모리에 남아 있던 연결을 확인했습니다. 현재는 사용자의 투표 선택, 최종 수령 장소와 진행 단계도 Supabase에 저장되며 서버를 다시 실행한 뒤에도 유지됩니다.

## 📄 프로젝트 기획서

- Wiki

https://github.com/lsiwooo/hub/wiki/CampusCart-기획서

# Week 2 Development Plan

## 🎯 Goal

이번 주 목표는 CampusCart의 핵심 기능(MVP)인

> 상품 검색 → AI 공동구매 추천 → 공동구매 참여 → 공동구매 생성

흐름을 구현하는 것입니다.

이번 주에는 Frontend, Backend, Database를 연결하여 하나의 Vertical Slice를 완성하는 것을 목표로 합니다.

---

## 📌 Development Roadmap

| Priority | Issue | Description |
|----------|-------|-------------|
| P1 | #1 | 프로젝트 구조 및 공통 데이터 모델 설계 |
| P1 | #2 | 상품 검색 기능 구현 |
| P1 | #3 | 진행 중인 공동구매 조회 |
| P1 | #4 | AI 공동구매 추천(Mock) |
| P1 | #5 | 공동구매 참여 기능 |
| P2 | #6 | 공동구매 생성 기능 |
| P2 | #7 | AI 수령 장소 추천(Mock) |
| P3 | #8 | UI 개선 및 발표 준비 |

---

## 📌 MVP Flow

상품 검색

↓

AI 공동구매 추천

↓

공동구매 참여

↓

없으면 공동구매 생성

↓

(추가 기능)

AI 수령 장소 추천

---

세부 작업 내용은 GitHub Issues에서 관리합니다.
