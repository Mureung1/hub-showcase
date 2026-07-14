import { requestAuthJson } from "../auth/authService";

export const getMyAnalysis = async () => {
  const data = await requestAuthJson("/api/analysis/me");
  return data.analysis;
};

export const runMyAnalysis = async () => {
  const data = await requestAuthJson("/api/analysis", {
    method: "POST",
  });

  return data.analysis;
};
