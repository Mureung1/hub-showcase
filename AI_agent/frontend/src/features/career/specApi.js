import { requestAuthJson } from "../auth/authService";

export const getMySpec = async () => {
  const data = await requestAuthJson("/api/specs/me");
  return data.spec;
};

export const saveMySpec = async (spec) => {
  const data = await requestAuthJson("/api/specs", {
    method: "POST",
    body: JSON.stringify(spec),
  });

  return data.spec;
};
