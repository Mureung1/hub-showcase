import PagePlaceholder from "./PagePlaceholder";

function Signup() {
  return (
    <PagePlaceholder
      title="회원가입"
      description="이름, 아이디, 이메일, 비밀번호, 학교, 전공을 입력해 Career Mission 이용 계정을 만듭니다."
      items={[
        { title: "기본 정보", text: "이름, 아이디, 이메일을 입력합니다." },
        { title: "학교 정보", text: "학교와 전공 정보를 등록합니다." },
        { title: "다음 단계", text: "가입 완료 후 로그인 화면으로 이동합니다." },
      ]}
    />
  );
}

export default Signup;
