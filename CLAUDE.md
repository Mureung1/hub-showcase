# CLAUDE.md

대학생 소액 투자자를 위한 **근거 검증 Agent**. 종목을 추천하지 않고, 사용자가 보는 현재가와 예상 적정가를 비교한 뒤 매수 판단이 실제 공시·재무 데이터로 뒷받침되는지 검증한다. 상세 기획은 [docs/plan.md](docs/plan.md), 배경·리스크 논리는 [docs/docs_1.md](docs/docs_1.md), 작업 분해는 [docs/checklist.md](docs/checklist.md), **Agent 스킬 계약(입력/출력/제약)은 [docs/skills.md](docs/skills.md)** 참고. 범용 에이전트 지침은 [AGENTS.md](AGENTS.md).

## 절대 원칙

- **매수/매도를 추천하지 않는다.** 목표가·추천 문구를 출력하지 않는다. 사용자가 이미 내린(또는 내리려는) 판단의 근거를 검증만 한다. 이건 투자자문업 리스크 회피의 핵심이라 기능 설계·UI 문구 전반에서 지켜야 한다. (예외: [개인용 확장 - 매수 주문 실행](#개인용-확장-매수-주문-실행-mvp-범위-밖)은 Agent가 가격을 추천하는 게 아니라 **사용자가 이미 정한 지정가**를 그대로 주문에 넣는 것이므로 이 원칙과 배치되지 않는다.)
- **원문에 없는 수치·사실을 만들지 않는다.** 재무 수치는 공시 원문과 일치해야 하고, 근거는 출처와 함께 표시한다. 데이터가 부족하면 조용히 빈 값을 채우지 말고 "데이터 부족"을 명시한다.
- **모든 데이터 화면에 기준일(YYYY-MM-DD)을 표시한다.** 최신성 한계를 사용자가 알 수 있게 한다.

## 핵심 기능 (3개)

각 기능은 [docs/skills.md](docs/skills.md)의 스킬(S1~S11)을 조합한 파이프라인이다. 기능을 건드리기 전에 해당 스킬 계약을 먼저 확인한다.

- **A. 종목 공부 Agent** — 종목명 → OpenDART 공시 조회 + 재무지표 계산 → 초보자용 요약 리포트 + 확인 포인트 (S1·S2·S3·S4·S11)
- **B. 현재가·적정가 분석 Agent** — 현재가 입력/조회 → PER/PBR/ROE/성장률/변동성 기반 적정 예상가 범위 산출 → 고평가/저평가/중립 판정 + 매수 가능 구간 (S1·S3·S5·S6·S11)
- **C. 근거 검증 Agent** — 매수 이유(자연어) → 근거 유형 추출 → 공시·재무 데이터 대조 → 있음/부족/없음 판정 + 체크리스트 + 복기 로그 저장 (S1·S2·S3·S7·S8·S9·S11·S10)

체크리스트·감정적 판단 여부·누적 복기 리포트는 별도 파이프라인이 아니라 **기능 C 출력의 재사용**이다(S8 → S9·S10).

## 현재 구현 상태

`src/`는 **Vite + React 소개(랜딩) 페이지 한 장**이다. 위 Agent 시스템은 아직 미구현이며 [docs/checklist.md](docs/checklist.md)의 5주 계획을 따라 만든다.

- [src/ProjectIntro.jsx](src/ProjectIntro.jsx) — 기획을 설명하는 정적 컴포넌트. 데모용 CLAIMS/PIPELINE 데이터가 하드코딩돼 있다(실제 Agent 호출 아님).
- [src/App.jsx](src/App.jsx) → `ProjectIntro` 렌더링. [src/main.jsx](src/main.jsx) → React 진입점.
- 스타일은 컴포넌트별 CSS 파일([src/ProjectIntro.css](src/ProjectIntro.css), [src/index.css](src/index.css)).

## 명령어

```bash
npm install
npm run dev      # Vite 개발 서버
npm run build    # dist/ 로 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
```

## 계획된 아키텍처 (미구현)

프론트(React) + 백엔드(FastAPI) + LangGraph 파이프라인. 상세는 [docs/docs_1.md](docs/docs_1.md) §3~4.

- **기술 스택**: React · FastAPI · LangGraph · Claude API · PostgreSQL(정형: 재무수치·복기로그) · Chroma(공시 원문 RAG) · OpenDART(원천 데이터). Redis/Next.js/Docker+EC2는 의도적으로 제외.
- **LangGraph 노드**: Query Parser → Company Resolver → Disclosure Collector → Financial Calculator → Claim Extractor(기능 C) → Evidence Verifier(RAG 근거) → Report Generator → Review Logger. 노드별 입력/출력/제약은 [docs/skills.md](docs/skills.md)의 스킬 S1~S11에 대응한다.
- **평가 지표**: 숫자 일치율(rule-based) + 근거 타당성(LLM judge, 골든샘플 10~20개) + 환각 발생률.
- **인증**: MVP는 로그인 생략. 복기 로그는 임시 기기 ID(브라우저 기준)로 구분한다.

## 엣지 케이스 처리 방침

- **공시 부실 종목**: 대상은 KOSPI·KOSDAQ 상장사. 공시가 일정 개수 미만이면 "제한된 리포트입니다" 명시.
- **근거 여러 개 혼합 입력**("실적도 좋고 뉴스도 좋아서"): Claim Extractor가 유형 리스트를 추출하고 결과 화면에서 유형별로 판정을 나눠 표시.
- **극히 짧은 입력**("그냥 감"): 추출 가능한 근거가 없으면 바로 "근거 없음(감정적 판단)" 판정 + "어떤 정보를 보고 판단했나요?" 후속 질문. 에러로 막지 않는다.

## 개인용 확장: 매수 주문 실행 (MVP 범위 밖)

4주 MVP(기능 A·B·C)가 끝난 뒤, **본인 계좌로만** 쓰는 개인용 확장으로 고려한다. 타인에게 제공하는 서비스가 아니라 본인 자동화 도구이므로 투자중개업 리스크는 낮지만, 실제 자금이 움직이므로 별도 안전장치를 둔다. 스킬 계약은 [docs/skills.md](docs/skills.md)의 S12 참고.

- **범위**: 사용자가 직접 정한 지정가·수량으로 증권사 Open API(예: 한국투자증권 KIS Developers)를 통해 매수 주문을 넣는다. Agent는 가격을 계산해서 **제안**할 뿐 최종 지정가는 항상 사용자가 확정한다.
- **안전장치**: 모의투자(paper trading) 모드를 기본값으로 하고 실거래 전환은 명시적 설정으로만. 실주문 전 최종 확인 단계 필수. 1회 주문 금액 상한을 코드에 하드코딩.
- **비대상**: 이 확장은 타인 대상 서비스로 배포하지 않는다. 배포·데모 시에는 이 기능을 끄거나 모의투자 모드로 고정한다.

## 컨벤션

- 사용자 대면 문구는 **한국어**, 초보 투자자 눈높이. 추천이 아닌 **검증** 톤.
- LLM 관련 작업 시 Claude API를 기본으로 한다(최신 모델 우선). docs_1.md의 스택 표를 따른다.
