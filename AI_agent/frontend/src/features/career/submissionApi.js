import { requestAuthJson } from "../auth/authService";

export const getMySubmissions = async () => {
  const data = await requestAuthJson("/api/submissions/me");
  return data.submissions || [];
};

export const getLatestSubmission = async () => {
  const data = await requestAuthJson("/api/submissions/latest");
  return data.submission;
};

export const saveSubmission = async (submission) => {
  const data = await requestAuthJson("/api/submissions", {
    method: "POST",
    body: JSON.stringify(submission),
  });

  return data.submission;
};
