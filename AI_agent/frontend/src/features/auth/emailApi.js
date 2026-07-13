const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export const sendVerificationEmail = async ({ email, name, verificationUrl }) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/verification-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      name,
      verificationUrl,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "확인 메일을 발송하지 못했습니다.");
  }

  return response.json();
};
