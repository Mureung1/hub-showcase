import { verifyAuthToken } from "../services/tokenService.js";
import { getUserById } from "../services/userService.js";

const readBearerToken = (authorizationHeader) => {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return "";
  }

  return authorizationHeader.slice("Bearer ".length).trim();
};

export const requireAuth = async (request, response, next) => {
  try {
    const token = readBearerToken(request.get("authorization"));

    if (!token) {
      response.status(401).json({ message: "로그인이 필요합니다." });
      return;
    }

    const payload = verifyAuthToken(token);
    const user = await getUserById(payload.sub);

    if (!user) {
      response.status(401).json({ message: "유효하지 않은 로그인 정보입니다." });
      return;
    }

    request.user = user;
    next();
  } catch {
    response.status(401).json({ message: "로그인이 만료되었거나 유효하지 않습니다." });
  }
};
