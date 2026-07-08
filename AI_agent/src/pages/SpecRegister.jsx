import PagePlaceholder from "./PagePlaceholder";

function SpecRegister() {
  return (
    <PagePlaceholder
      title="스펙 등록"
      description="전공, 학년, 학점, 자격증, 어학 점수, 프로젝트 경험, 대외활동, 보유 기술을 등록합니다."
      items={[
        { title: "기본 정보", text: "전공, 학년, 학점 정보를 입력합니다." },
        { title: "경험 정보", text: "프로젝트, 대외활동, 인턴 경험을 정리합니다." },
        { title: "역량 정보", text: "자격증, 어학 점수, 기술 스택을 등록합니다." },
      ]}
    />
  );
}

export default SpecRegister;
