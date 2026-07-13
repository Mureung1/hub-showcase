import PagePlaceholder from "./PagePlaceholder";

function Feedback() {
  return (
    <PagePlaceholder
      title="AI 피드백"
      description="제출 결과물에 대해 전체 평가, 잘한 점, 개선할 점, 수정 제안, 포트폴리오 반영 포인트를 제공합니다."
      items={[
        { title: "전체 평가", text: "미션 결과물의 완성도를 요약합니다." },
        { title: "개선 제안", text: "수정 방향과 보완 포인트를 제안합니다." },
        { title: "포트폴리오 반영", text: "경험으로 정리할 수 있는 문장과 포인트를 안내합니다." },
      ]}
    />
  );
}

export default Feedback;
