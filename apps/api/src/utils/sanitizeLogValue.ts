const REDACTED = "[REDACTED]";
const sensitiveKeyPattern = /(authorization|cookie|password|phone|secret|token)/i;
const databaseUrlPasswordPattern = /(postgres(?:ql)?:\/\/[^:\s/@]+:)[^@\s]+(@)/gi;
const bearerTokenPattern = /(bearer\s+)\S+/gi;
const koreanPhonePattern = /(?:\+?82[- ]?1[016789]|01[016789])[- ]?\d{3,4}[- ]?\d{4}|0\d{1,2}-\d{3,4}-\d{4}/g;

function sanitizeText(value: string): string {
  return value
    .replace(databaseUrlPasswordPattern, `$1${REDACTED}$2`)
    .replace(bearerTokenPattern, `$1${REDACTED}`)
    .replace(koreanPhonePattern, REDACTED);
}

function sanitize(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return sanitizeText(value);
  if (value === null || typeof value !== "object") return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeText(value.message),
      ...(value.stack ? { stack: sanitizeText(value.stack) } : {}),
    };
  }

  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      sensitiveKeyPattern.test(key) ? REDACTED : sanitize(nestedValue, seen),
    ]),
  );
}

export function sanitizeLogValue(value: unknown): unknown {
  return sanitize(value, new WeakSet());
}

export function redactRequestPath(path: string): string {
  return path.replace(/(\/api\/waitings\/status\/)[^/?#]+/i, `$1${REDACTED}`);
}
