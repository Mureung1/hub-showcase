import { requestAuthJson } from "../auth/authService";

export const getRecommendedMissions = async ({ major, targetRole, skills } = {}) => {
  const params = new URLSearchParams({
    major: String(major || ""),
    targetRole: String(targetRole || ""),
    skills: String(skills || ""),
  });
  const data = await requestAuthJson(`/api/missions/recommendations?${params}`);

  return {
    inferredTrack: data.inferredTrack || "business",
    missions: data.missions || [],
  };
};
