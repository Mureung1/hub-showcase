export function createFixedWindowRateLimit({
  enabled = true,
  maxRequests,
  windowMs,
  message = "분석 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
}) {
  const clients = new Map();

  return function fixedWindowRateLimit(request, response, next) {
    if (!enabled) {
      next();
      return;
    }

    const now = Date.now();
    const key = request.ip || request.socket.remoteAddress || "unknown";
    const current = clients.get(key);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

    bucket.count += 1;
    clients.set(key, bucket);

    response.setHeader("RateLimit-Limit", String(maxRequests));
    response.setHeader("RateLimit-Remaining", String(Math.max(0, maxRequests - bucket.count)));
    response.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > maxRequests) {
      response.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      response.status(429).json({
        error: "rate_limit_exceeded",
        message,
      });
      return;
    }

    if (clients.size > 1_000) {
      for (const [clientKey, clientBucket] of clients.entries()) {
        if (clientBucket.resetAt <= now) clients.delete(clientKey);
      }
    }

    next();
  };
}
