import { requestAuthJson } from "../auth/authService";

export const getMissionProgress = async (missionId) => {
  const data = await requestAuthJson(`/api/missions/${missionId}/progress`);
  return data.progress;
};

export const saveMissionProgress = async ({
  missionId,
  missionTitle,
  missionSummary,
  checkedItems,
  checklistItems,
}) => {
  const data = await requestAuthJson(`/api/missions/${missionId}/progress`, {
    method: "PATCH",
    body: JSON.stringify({
      missionTitle,
      missionSummary,
      checkedItems,
      checklistItems,
    }),
  });

  return data.progress;
};
