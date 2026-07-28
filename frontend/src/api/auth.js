// 로그인 API 호출 함수
// 이 함수는 이메일과 비밀번호를 백엔드로 보내고, 성공하면 JWT와 사용자 정보를 받아와.
// Vercel Rewrite를 사용하여 /api 요청을 Backend로 전달

export async function loginUser(email, password) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "로그인에 실패했습니다.");
  }

  return data;
}

export async function registerUser(name, email, password) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "회원가입 실패");
  }

  return data;
}