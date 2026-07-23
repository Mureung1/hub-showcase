import { requestAuthJson } from "../auth/authService";

export const getLatestFeedback = async () => {
  const data = await requestAuthJson("/api/feedback/latest");
  return {
    submission: data.submission,
    feedback: data.feedback,
  };
};

export const saveLatestFeedback = async () => {
  const data = await requestAuthJson("/api/feedback/latest", {
    method: "POST",
  });

  return {
    submission: data.submission,
    feedback: data.feedback,
  };
};
