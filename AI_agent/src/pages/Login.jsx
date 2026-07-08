import PagePlaceholder from "./PagePlaceholder";

function Login() {
  return (
    <PagePlaceholder
      title="로그인"
      description="아이디 또는 이메일과 비밀번호로 로그인한 뒤 맞춤 커리어 분석 흐름을 시작합니다."
      items={[
        { title: "로그인 입력", text: "아이디 또는 이메일, 비밀번호를 입력합니다." },
        { title: "로그인 후", text: "홈으로 이동하고 상단 메뉴가 로그인 상태로 변경됩니다." },
      ]}
    />
  );
}

export default Login;
