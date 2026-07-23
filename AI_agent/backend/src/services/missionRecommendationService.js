import {
  getMissionById as findMissionById,
  getRecommendedMissions as recommendMissions,
  inferCareerTrack,
} from "../data/missionData.js";

export { inferCareerTrack };

export const getRecommendedMissions = (context = {}) => {
  const normalizedContext =
    typeof context === "string" ? { targetRole: context } : context || {};

  return {
    inferredTrack: inferCareerTrack(normalizedContext),
    missions: recommendMissions(normalizedContext),
  };
};

export const getMissionById = (missionId) => findMissionById(missionId);
