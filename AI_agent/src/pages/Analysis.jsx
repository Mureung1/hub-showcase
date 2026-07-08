import PagePlaceholder from "./PagePlaceholder";

function Analysis() {
  return (
    <PagePlaceholder
      title="AI 분석"
      description="목표 직무와 현재 스펙을 비교해 종합 점수, 강점, 부족한 역량, 보완 우선순위를 보여줍니다."
      items={[
        { title: "종합 점수", text: "목표 직무 기준 준비도를 요약합니다." },
        { title: "강점", text: "현재 스펙에서 직무와 연결되는 부분을 보여줍니다." },
        { title: "보완 우선순위", text: "먼저 채워야 할 역량을 제안합니다." },
      ]}
    />
  );
}

export default Analysis;
