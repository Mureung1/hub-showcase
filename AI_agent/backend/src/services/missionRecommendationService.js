import {
  getMissionById as findMissionById,
  getMissionCount,
  getRecommendedMissions as recommendMissions,
  inferCareerTrack,
} from "../data/missionData.js";

export { inferCareerTrack };

export const getRecommendedMissions = (context = {}) => {
  const normalizedContext =
    typeof context === "string" ? { targetRole: context } : context || {};
  const completedMissionIds = Array.isArray(normalizedContext.completedMissionIds)
    ? normalizedContext.completedMissionIds.map(String)
    : [];

  return {
    inferredTrack: inferCareerTrack(normalizedContext),
    completedMissionCount: completedMissionIds.length,
    totalMissionCount: getMissionCount(),
    unlockedSetNumber: Math.floor(completedMissionIds.length / 4) + 1,
    missions: recommendMissions(normalizedContext),
  };
};

export const getMissionById = (missionId) => findMissionById(missionId);
