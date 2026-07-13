const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export const searchQualifications = async (keyword) => {
  const params = new URLSearchParams({
    keyword: keyword.trim(),
  });

  const response = await fetch(`${API_BASE_URL}/api/qualifications?${params}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "자격증 목록을 불러오지 못했습니다.");
  }

  const data = await response.json();
  return data.qualifications || [];
};
