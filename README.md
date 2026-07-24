# 있는대로

> 냉장고 속 보유 재료와 소비기한을 바탕으로 지금 만들 수 있는 1인분 레시피를 추천하는 자취생용 식재료 관리 서비스

<p align="center">
  <a href="docs/demo-presentation/README.md">
    <img src="docs/demo-presentation/slides/slide-01.png" width="860" alt="있는대로 데모 프레젠테이션 표지">
  </a>
</p>

## 바로가기

- [데모 슬라이드 웹에서 보기](docs/demo-presentation/README.md)
- [PowerPoint 원본 다운로드](docs/demo-presentation/ai-agent-challenge-demo-2026-07-24.pptx)
- [AI와 함께 개발한 과정](docs/AI_DEVELOPMENT_WORKFLOW.md)
- [개발 환경 및 협업 가이드](docs/DEVELOPMENT_GUIDE.md)
- [GitHub Issues](https://github.com/pkchanghyun-pixel/hub/issues)

## 해결하려는 문제

자취생은 냉장고에 어떤 재료가 있는지 잊거나 소비기한을 놓치기 쉽습니다. 남은 재료를 확인해도 무엇을 만들 수 있는지 판단하려면 다시 레시피를 검색해야 합니다.

`있는대로`는 재료 관리와 메뉴 결정을 하나의 흐름으로 연결합니다.

```text
재료 등록 및 소비기한 관리
        ↓
보유 재료와 조리 조건 분석
        ↓
Gemini 기반 1인분 메뉴 추천
        ↓
레시피·대체 재료·부족 재료 확인
```

## 주요 기능

- 보관 위치·수량·소비기한·추천 태그를 포함한 냉장고 재료 관리
- 소비기한과 재료 태그 우선순위를 반영한 Gemini 레시피 추천
- 빠르게·불 없이·균형 있게 등 상황별 조리 조건 선택
- 보유 재료와 부족한 재료 자동 구분
- 1인분 재료, 대체 재료, 조리 순서와 주의사항 안내
- 부족한 재료의 구매 검색 연결

## 기술 구성

| 영역 | 기술 | 역할 |
| --- | --- | --- |
| Frontend | React, Vite | 재료 관리, 추천 및 레시피 화면 |
| Backend | Node.js, Express | REST API와 추천 서비스 |
| Validation | Zod | 환경변수, 요청과 AI 응답 검증 |
| Data | Supabase PostgreSQL | 보유 재료와 추천 캐시 저장 |
| Generative AI | Gemini API | 조건에 맞는 구조화 레시피 생성 |
| Quality | Vitest, oxlint | 회귀 테스트와 정적 분석 |
| Logging | Pino, pino-http | 구조화 서버·요청 로그 |

## 데이터 흐름

<p align="center">
  <img src="https://github.com/user-attachments/assets/88d3952d-4bd4-4c43-b2a4-cb20f983f75f" width="100%" alt="있는대로 데이터 흐름 아키텍처">
</p>

1. 사용자가 React 화면에서 재료와 조리 조건을 입력합니다.
2. Express 서버가 Supabase에서 실제 보유 재료를 조회합니다.
3. 서버가 소비기한과 태그를 기준으로 재료 우선순위를 계산합니다.
4. 캐시가 없으면 허용된 필드만 Gemini API에 전달합니다.
5. Gemini 응답을 Zod와 서버 추천 정책으로 다시 검증합니다.
6. 검증을 통과한 추천만 사용자 화면에 표시합니다.

## 로컬 실행

### 준비 사항

- Git
- Node.js LTS
- npm
- Supabase 프로젝트
- Gemini API 키

### 설치 및 시작

```powershell
git clone https://github.com/pkchanghyun-pixel/hub.git
cd hub
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

- 웹: `http://localhost:5173/`
- API 상태: `http://localhost:3000/api/health`

환경변수와 실행 방법은 [개발 환경 및 협업 가이드](docs/DEVELOPMENT_GUIDE.md)를 참고해 주세요. 실제 비밀키가 들어 있는 `.env` 파일은 커밋하지 않습니다.

## 품질 확인

```powershell
npm test
npm run lint
npm run build
```

추천 정책, 소비기한 계산, 캐시, Gemini 오류, 사용자 흐름을 테스트하고 lint와 프로덕션 build를 품질 게이트로 사용합니다.

## AI와 함께 개발한 방식

Codex와 페어 프로그래밍 방식으로 요구사항을 작은 작업으로 나누고, mock 데이터에서 실제 Supabase와 Gemini 연동으로 단계적으로 확장했습니다. AI가 만든 결과를 그대로 사용하지 않고 오류 시나리오와 서버 정책을 테스트로 검증했습니다.

- [전체 AI 개발 Workflow](docs/AI_DEVELOPMENT_WORKFLOW.md)
- [Agent 개발 규칙](Agent.md)
- [UI Design Skill](DESIGN_SKILL.md)
- [UI 디자인 기준](design.md)

## 프로젝트 문서

| 문서 | 내용 |
| --- | --- |
| [DEVELOPMENT_GUIDE.md](docs/DEVELOPMENT_GUIDE.md) | 개발 환경, 명령, API·로그·보안과 커밋 규칙 |
| [AI_DEVELOPMENT_WORKFLOW.md](docs/AI_DEVELOPMENT_WORKFLOW.md) | 3주간 AI와 함께 개발한 과정 |
| [recipe-recommendation-api.md](docs/recipe-recommendation-api.md) | Gemini 추천 API와 검증 정책 |
| [QA_REPORT_2026-07-22.md](docs/QA_REPORT_2026-07-22.md) | 기능 및 화면 검증 결과 |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | 배포 구조와 운영 준비 |

## 기획과 작업 기록

- [프로젝트 기획 Wiki](https://github.com/pkchanghyun-pixel/hub/wiki/%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-%EA%B8%B0%ED%9A%8D%EC%84%9C-%5B%EC%9E%90%EC%B7%A8%EC%83%9D-%EC%9A%94%EB%A6%AC-%EC%B6%94%EC%B2%9C-%EC%9B%B9%ED%8E%98%EC%9D%B4%EC%A7%80-%EC%84%9C%EB%B9%84%EC%8A%A4%5D)
- [GitHub Issue 작업 기록](https://github.com/pkchanghyun-pixel/hub/issues)
