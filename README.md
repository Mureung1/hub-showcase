# 모두의 뇌

여러 사람이 하나의 프로젝트를 함께 진행할 때 각자 알고 있는 배경지식, 결정사항, 용어, 미결 질문을 하나의 공유 지식망으로 정리해주는 협업 맥락 AI 에이전트 기획입니다.

## 서비스 한 줄 설명

모두의 뇌는 회의록, 연구 메모, 팀 피드백, 보고서에 흩어진 프로젝트 맥락을 연결해 팀 전체가 함께 쓰는 두 번째 뇌를 만들어주는 AI 에이전트입니다.

## 문서

- [기초 개발 기획서](docs/plan.md)
- [시장 조사 및 경쟁 분석](docs/market-research.md)
- [디자인 산출물 링크](docs/design-assets.md)
- [작업 분해 체크리스트](docs/checklist.md)
- [PR 설명 초안](docs/pr-description-draft.md)

## 기획 시각화

![모두의 뇌 기획 대표 이미지](docs/images/modu-brain-cover.png)

- [HTML 상세 보기](docs/visualization.html)

## 현재 개발 방향

오늘 단계에서는 회의 요약 도구와 구분되는 기획 방향을 명확히 하기 위해, `할 일 정리`보다 `맥락 공유`를 핵심 문제로 둡니다.

1. 문제 정의를 협업 맥락 손실 문제로 바꿉니다.
2. 핵심 기능을 프로젝트 맥락 추출과 공유 지식맵 생성으로 좁힙니다.
3. 시장 조사와 경쟁 분석으로 기획 타당성을 보강합니다.
4. 기초 화면 개발을 위해 React + TypeScript 컴포넌트를 추가합니다.

## MVP 핵심 기능

- 회의록/연구 메모/팀 피드백에서 주제, 용어, 결정사항, 미결 질문 추출
- 사람/분야/업체/주제를 연결한 공유 지식맵과 맥락 요약 생성

## React 확인 컴포넌트

- [NewsCard 컴포넌트](src/components/NewsCard.tsx)
- CSS Modules: [NewsCard.module.css](src/components/NewsCard.module.css)

## 로컬 실행

```bash
npm install
npm run dev
```

## NewsCard 렌더 확인 props

```tsx
<NewsCard
  title="업데이트 확인과 도구 전환이 실제 작업 시간을 잠식한다"
  source="Asana Anatomy of Work"
  thumbnail="/images/research-work.svg"
/>
```

## npm run dev 확인 시나리오

1. 홈 화면에서 `모두의 뇌` 제목과 기획 근거 카드 3개가 보이는지 확인합니다.
2. 각 카드에 `title`, `source`, `thumbnail`이 모두 렌더링되는지 확인합니다.
3. 브라우저 폭을 줄였을 때 카드가 한 줄 세로 목록으로 바뀌고 긴 제목이 깨지지 않는지 확인합니다.
