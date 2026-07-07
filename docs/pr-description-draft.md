# 모두의 뇌 기획서 및 기초 개발

## 주요 작업 리스트

- `docs/plan.md`에 협업 맥락 공유 AI 에이전트 기획을 정리했습니다.
- `docs/prd.md`에 제품 요구사항을 정리했습니다.
- `docs/trd.md`에 기술 요구사항과 데이터 구조를 정리했습니다.
- `docs/prompt-design.md`에 LLM 프롬프트 구조와 JSON 출력 스키마를 정리했습니다.
- `docs/market-research.md`에 시장 조사와 경쟁 분석을 정리했습니다.
- `docs/design-assets.md`에 Canva/Figma 디자인 산출물 링크를 정리했습니다.
- `README.md`에서 기획서, 시장 조사, 체크리스트, 대표 이미지에 바로 접근할 수 있도록 구성했습니다.
- React + TypeScript 기반 `NewsCard` 컴포넌트를 추가했습니다.
- CSS Modules로 카드 스타일을 분리했고, 샘플 시장 조사 카드 3개를 앱에서 렌더링하도록 구성했습니다.
- `npm run build`로 TypeScript와 Vite 빌드를 검증했습니다.

## 기획 대표 이미지

![모두의 뇌 기획 대표 이미지](https://github.com/tjwnsdhfz/hub/blob/N031_%EA%B9%80%EC%84%9C%EC%A4%80/docs/images/modu-brain-cover.png?raw=true)

## 디자인 산출물

- Canva 편집 디자인: https://www.canva.com/d/vv5pLSUhq50coma
- Figma FigJam 흐름도: https://www.figma.com/board/V5Jke4dsqaoMUOiTEg57tM
- 벡터 원본: `docs/images/modu-brain-cover.svg`

## 내가 설명할 수 있는 부분

기획의 핵심은 `할 일 정리`가 아니라 `맥락 공유`입니다.

회의 요약 에이전트는 회의 내용을 짧게 정리하거나 액션아이템을 뽑는 데 강하지만, 여러 분야 사람이 같은 프로젝트를 진행하면서 서로의 판단 근거와 배경 맥락을 이해하지 못하는 문제까지 해결하기는 어렵습니다.

모두의 뇌는 회의록과 문서를 입력받아 핵심 주제, 용어, 결정사항, 참여자별 관점, 미결 질문을 연결합니다. 즉 개인의 세컨드 브레인이 아니라 팀 전체가 함께 쓰는 공유 두뇌를 목표로 합니다.

## 아직 이해 못 한 부분

- 실제 AI API를 붙였을 때 문서에서 결정 배경과 관점 차이를 안정적으로 추출하는 방법은 더 공부가 필요합니다.
- 지식맵을 실제 그래프 UI로 구현할 때 어떤 데이터 구조가 가장 적절한지 더 실험이 필요합니다.
- 실제 팀 문서에 적용할 때 개인정보와 권한 관리는 더 공부가 필요합니다.

## 렌더 확인 props

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
3. 브라우저 폭을 줄였을 때 카드가 세로 목록으로 바뀌고 긴 제목이 깨지지 않는지 확인합니다.

## 새로 알게 된 것

- 회의 요약만으로는 협업 문제를 충분히 해결하기 어렵고, 결정 배경과 관점 차이를 구조화해야 차별화된 기획이 된다는 점을 알게 되었습니다.
- Notion AI, Confluence AI, Mem, Obsidian 같은 지식관리 도구를 비교하면서 팀 단위 지식망의 필요성을 더 명확히 이해했습니다.
- React + TypeScript 컴포넌트를 만들 때 props와 CSS Modules를 분리하면 작은 UI 단위부터 검증하기 쉽다는 점을 배웠습니다.
