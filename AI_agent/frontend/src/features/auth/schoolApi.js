const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export const searchUniversities = async (keyword) => {
  const params = new URLSearchParams({
    keyword: keyword.trim(),
  });

  const response = await fetch(`${API_BASE_URL}/api/schools?${params}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "학교 정보를 불러오지 못했습니다.");
  }

  const data = await response.json();
  return data.schools || [];
};

export const searchMajorsBySchool = async ({ keyword, schoolName }) => {
  const params = new URLSearchParams({
    keyword: keyword.trim(),
    schoolName: schoolName.trim(),
  });

  const response = await fetch(`${API_BASE_URL}/api/majors?${params}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "학과 정보를 불러오지 못했습니다.");
  }

  const data = await response.json();
  return data.majors || [];
};
