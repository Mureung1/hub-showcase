export function createCorsOptions(allowedOrigins) {
  const allowedOriginSet = new Set(allowedOrigins);

  return {
    origin(origin, callback) {
      if (!origin || allowedOriginSet.has(origin.replace(/\/$/, ""))) {
        callback(null, true);
        return;
      }

      const error = new Error("허용되지 않은 출처입니다.");
      error.code = "CORS_ORIGIN_DENIED";
      callback(error);
    },
  };
}

export function securityHeaders(request, response, next) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  response.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "connect-src 'self'",
      "font-src 'self' data:",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data:",
      "object-src 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
    ].join("; "),
  );
  next();
}

export function handleCorsError(error, request, response, next) {
  if (error?.code !== "CORS_ORIGIN_DENIED") {
    next(error);
    return;
  }

  response.status(403).json({
    error: "origin_not_allowed",
    message: "이 출처에서는 UniRadar API를 호출할 수 없습니다.",
  });
}
