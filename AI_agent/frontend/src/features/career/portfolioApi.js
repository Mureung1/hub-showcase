import { requestAuthJson } from "../auth/authService";

export const getLatestPortfolioDraft = async () => {
  const data = await requestAuthJson("/api/portfolio/latest");
  return {
    submission: data.submission,
    portfolioDraft: data.portfolioDraft,
  };
};

export const saveLatestPortfolioDraft = async () => {
  const data = await requestAuthJson("/api/portfolio/latest", {
    method: "POST",
  });

  return {
    submission: data.submission,
    portfolioDraft: data.portfolioDraft,
  };
};
