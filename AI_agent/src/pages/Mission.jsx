import PagePlaceholder from "./PagePlaceholder";

function Mission() {
  return (
    <PagePlaceholder
      title="미션 추천"
      description="부족한 역량을 보완하고 포트폴리오로 연결할 수 있는 실무형 미션을 추천합니다."
      items={[
        { title: "추천 미션", text: "목표 직무별 실무형 과제를 보여줍니다." },
        { title: "난이도와 소요 시간", text: "미션별 난이도와 예상 소요 시간을 제공합니다." },
        { title: "제출 결과물", text: "GitHub, Notion, 블로그 링크 등 결과물 기준을 안내합니다." },
      ]}
    />
  );
}

export default Mission;
