# hub

N167 프로젝트 모노레포 (npm workspaces).

## 구조

```
hub/                        ← 모노레포 루트 (npm workspaces)
├── package.json            ← 워크스페이스 설정 (apps/*)
├── .gitignore
│
├── apps/                   ← 워크스페이스 앱
│   ├── intro/              ← 프로젝트 소개 사이트 (Vite + React)
│   └── showup/             ← ShowUp — 노쇼·악성 고객 이력 관리 서비스
│       ├── README.md       ← ShowUp 프로젝트 README
│       ├── docs/           ← 기획서·체크리스트·아키텍처·발표자료·블로그·워크플로우
│       │   ├── plan.md            ← 기획서
│       │   ├── checklist.md       ← 일자별 작업 체크리스트
│       │   ├── architecture.md    ← 전체 데이터 흐름 다이어그램
│       │   ├── agent-workflow.md  ← Agent·Skill·규칙 문서 사용 관계
│       │   ├── workflow.md         ← 재사용 가능한 워크플로우 문서
│       │   ├── bug-list.md         ← 통합 QA 버그 목록
│       │   ├── user-flow.md        ← 유저 플로우
│       │   ├── verify-skill.md     ← 검증 Skill 가이드
│       │   ├── presentations/      ← 발표 대본 (0710.md, 0724.md)
│       │   └── blog/               ← 벨로그 회고 (week1~3)
│       ├── sessions/       ← 세션 가이드 (LEAD·FE·BE·SECURITY)
│       ├── outputs/         ← 발표 자료
│       │   ├── weeks2/             ← 1~2주차 발표 데크 + 슬라이드 이미지
│       │   └── weeks3/             ← 3주차 발표 데크 + 슬라이드 이미지
│       ├── security/       ← 침투 테스트 코드
│       ├── security-docs/   ← 보안 산출물 (security-report, penetration-test, privacy, terms)
│       ├── src/             ← React 앱 소스
│       ├── functions/       ← Cloud Functions (Blaze 업그레이드 시 이관용)
│       ├── prototype/       ← HTML/CSS 프로토타입 (4화면)
│       ├── firebase.json    ← Firebase 설정
│       ├── firestore.rules  ← Firestore Security Rules
│       └── firestore.indexes.json
│
└── showcase/               ← showcase.json + 스크린샷 (PR 제출용)
    ├── showcase.json
    ├── thumbnail.png
    └── screenshots/
```

## 실행

```bash
npm install          # 루트에서 1회
npm run dev          # intro 개발 서버
npm run build        # intro 빌드
npm run lint         # intro lint
```

ShowUp 워크스페이스 직접 지정:
```bash
npm run dev -w showup
npm run build -w showup
npm run lint -w showup
npm run typecheck -w showup
```

## ShowUp

소상공인을 위한 노쇼·악성 고객 이력 관리 및 위험도 경고 웹서비스.
배포: https://showup-project.web.app
상세: [apps/showup/README.md](apps/showup/README.md)

### 진행 방식

Hermes Agent 프레임워크 + Ollama Pro 모델 4세션 역할 분리 개발:

| 세션 | 모델 | 담당 |
|------|------|------|
| 리드 | GLM 5.2 | 기획·통합·일정·배포 |
| 프론트엔드 | Qwen 3.5 | UI·컴포넌트·라우팅 |
| 백엔드 | Kimi K2.7 Code | Firestore·로직·인덱스 |
| 보안 | GLM 5.2 | Rules·침투테스트·법무 |

- **기간**: 2026-07-07 ~ 2026-07-29 (사전 세팅 7/7~7/8, 개발 7/9~7/29)
- **PR 제출 마감**: 7/29 수요일 밤 10시