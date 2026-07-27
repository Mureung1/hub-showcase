export function createRequireLocalDemoMode({
  authConfigured,
  isProduction = false,
  storageProvider = "sqlite",
}) {
  const isLocalSqliteDemo = !authConfigured && !isProduction && storageProvider === "sqlite";

  return function requireLocalDemoMode(request, response, next) {
    if (isLocalSqliteDemo) {
      next();
      return;
    }

    response.status(403).json({
      error: "local_demo_disabled",
      message: "익명 저장 공고 API는 인증이 없는 로컬 SQLite 데모에서만 사용할 수 있습니다.",
    });
  };
}