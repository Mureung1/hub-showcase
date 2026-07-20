export function createRequireAuth(authService) {
  return async function requireAuth(request, response, next) {
    const authorization = String(request.get("authorization") || "");
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      response.status(401).json({ error: "authentication_required", message: "로그인 후 다시 시도해 주세요." });
      return;
    }

    try {
      const accessToken = match[1].trim();
      const user = await authService.getUser(accessToken);
      request.user = { id: user.id, email: user.email || null };
      request.accessToken = accessToken;
      next();
    } catch (error) {
      const status = error?.code === "auth_not_configured" ? 503 : 401;
      response.status(status).json({
        error: error?.code === "auth_not_configured" ? "auth_unavailable" : "invalid_token",
        message: status === 503 ? "인증 서버 설정을 확인해 주세요." : "로그인 상태가 만료되었거나 유효하지 않습니다.",
      });
    }
  };
}
