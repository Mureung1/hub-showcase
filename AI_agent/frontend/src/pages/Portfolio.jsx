import PagePlaceholder from "./PagePlaceholder";

function Portfolio() {
  return (
    <PagePlaceholder
      title="포트폴리오"
      description="미션 결과물을 프로젝트 경험 형태로 정리해 자기소개서와 면접에서 활용할 수 있도록 돕습니다."
      items={[
        { title: "프로젝트 요약", text: "문제 정의, 해결 과정, 결과를 정리합니다." },
        { title: "사용 기술", text: "미션 수행 과정에서 사용한 도구와 기술을 표시합니다." },
        { title: "결과물 링크", text: "GitHub, Notion, 배포 URL을 함께 관리합니다." },
      ]}
    />
  );
}

export default Portfolio;
