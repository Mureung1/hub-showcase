export function createRequireScanAccess({
  authConfigured,
  isProduction = false,
  requireAuth,
}) {
  return function requireScanAccess(request, response, next) {
    if (authConfigured) {
      requireAuth(request, response, next);
      return;
    }

    if (!isProduction) {
      next();
      return;
    }

    response.status(503).json({
      error: "scan_auth_unavailable",
      message: "공지 스캔을 사용하려면 인증 서버 설정이 필요합니다.",
    });
  };
}