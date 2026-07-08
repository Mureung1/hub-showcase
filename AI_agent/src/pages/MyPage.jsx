import PagePlaceholder from "./PagePlaceholder";

function MyPage() {
  return (
    <PagePlaceholder
      title="내 정보"
      description="회원 기본 정보, 등록한 스펙, 목표 직무, 수행한 미션과 피드백 이력을 확인합니다."
      items={[
        { title: "회원 정보", text: "아이디, 이메일, 학교, 전공을 확인합니다." },
        { title: "스펙 정보", text: "등록한 프로젝트, 자격증, 기술 스택을 확인합니다." },
        { title: "미션 이력", text: "수행한 미션과 AI 피드백 이력을 확인합니다." },
      ]}
    />
  );
}

export default MyPage;
