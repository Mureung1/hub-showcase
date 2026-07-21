export function toFriendlyAuthError(error) {
  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "").toLowerCase();

  if (message.includes("invalid login credentials")) return "아이디 또는 비밀번호를 확인해 주세요.";
  if (message.includes("email not confirmed")) return "아이디 로그인에는 Supabase의 Confirm Email 설정을 꺼야 합니다.";
  if (message.includes("already registered")) return "이미 사용 중인 아이디입니다. 로그인해 주세요.";
  if (message.includes("password should be") || message.includes("password must")) return "비밀번호는 6자 이상으로 입력해 주세요.";
  if (code === "email_address_invalid" || message.includes("invalid email") || message.includes("email address is invalid")) return "아이디 인증 식별자 형식이 올바르지 않습니다. 새로고침 후 다시 시도해 주세요.";
  if (message.includes("signup is disabled") || code === "signup_disabled") return "현재 회원가입이 허용되지 않았습니다. Supabase 인증 설정을 확인해 주세요.";
  if (message.includes("email provider is disabled")) return "아이디 로그인에도 Supabase Email 제공자를 활성화해야 합니다.";
  if (message.includes("invalid api key") || message.includes("apikey") || code === "invalid_api_key") return "Supabase 공개 키 설정을 확인해 주세요. service_role 키는 사용할 수 없습니다.";
  if (message.includes("failed to fetch") || message.includes("network request failed")) return "Supabase 인증 서버에 연결하지 못했습니다. 프로젝트 URL과 네트워크 연결을 확인해 주세요.";
  if (message.includes("rate limit") || code.includes("rate_limit")) return "가입 또는 로그인 요청 제한에 도달했습니다. 잠시 후 다시 시도해 주세요.";

  return "인증 요청을 처리하지 못했습니다. Supabase Dashboard의 Authentication 로그를 확인해 주세요.";
}