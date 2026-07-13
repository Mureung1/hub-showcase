const baseUrl = new URL(process.argv[2] || "http://127.0.0.1:4173");
const expectedCommit = String(process.argv[3] || "").trim().toLowerCase();
const forwardedHeaders = { "X-Forwarded-Proto": "https" };

const root = await requestAndAssert("/", "document");
await requestAndAssert("/login", "document");
await requestAndAssert("/privacy", "document");
const securityText = await requestAndAssert("/.well-known/security.txt", "asset");
if (!(await securityText.text()).includes("Contact: https://github.com/tjwnsdhfz/hub/security/advisories/new")) {
  fail("security.txt is missing the private vulnerability reporting address.");
}

const html = await root.text();
const assetPaths = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+\.(?:js|css))"/g)]
  .map((match) => match[1]);
if (assetPaths.length === 0) fail("No fingerprinted JavaScript or CSS assets were found.");
for (const assetPath of new Set(assetPaths)) await requestAndAssert(assetPath, "asset");

const health = await requestAndAssert("/api/health/live", "api");
const payload = await health.json();
const metadata = payload?.data;
if (metadata?.status !== "ok") fail("Liveness payload does not report status=ok.");
if (!metadata?.buildId) fail("Liveness payload is missing buildId.");
if (!metadata?.builtAt || Number.isNaN(new Date(metadata.builtAt).valueOf())) {
  fail("Liveness payload is missing a valid builtAt timestamp.");
}
if (expectedCommit && metadata?.commit !== expectedCommit) {
  fail(`Liveness commit mismatch: expected ${expectedCommit}, received ${metadata?.commit}.`);
}

const crossOrigin = await fetch(new URL("/api/v1/auth/magic-link", baseUrl), {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "https://attacker.invalid",
    "X-Forwarded-Proto": "https",
  },
  body: JSON.stringify({
    email: "security-smoke@example.invalid",
    captchaToken: "not-sent-to-provider",
  }),
});
if (crossOrigin.status !== 403) {
  fail(`Cross-origin mutation was not rejected (HTTP ${crossOrigin.status}).`);
}
expectHeader(crossOrigin, "/api/v1/auth/magic-link cross-origin", "content-security-policy", /frame-ancestors 'none'/);

console.info(
  JSON.stringify({
    status: "ok",
    checked: ["/", "/login", "/privacy", "/.well-known/security.txt", ...new Set(assetPaths), "/api/health/live"],
    commit: metadata.commit,
    buildId: metadata.buildId,
    builtAt: metadata.builtAt,
  }),
);

async function requestAndAssert(pathname, kind) {
  const response = await fetch(new URL(pathname, baseUrl), { headers: forwardedHeaders });
  if (!response.ok) fail(`${pathname} returned HTTP ${response.status}.`);

  expectHeader(response, pathname, "strict-transport-security", /max-age=31536000/);
  expectHeader(response, pathname, "x-content-type-options", /^nosniff$/);
  expectHeader(response, pathname, "x-frame-options", /^DENY$/);
  expectHeader(response, pathname, "referrer-policy", /^no-referrer$/);
  expectHeader(response, pathname, "permissions-policy", /camera=\(\)/);
  expectHeader(response, pathname, "cross-origin-resource-policy", /^same-origin$/);

  const csp = response.headers.get("content-security-policy") || "";
  if (!csp.includes("frame-ancestors 'none'")) fail(`${pathname} CSP permits framing.`);
  if (csp.includes("'unsafe-inline'")) fail(`${pathname} CSP permits unsafe inline content.`);
  if (kind !== "api" && !csp.includes("style-src 'self'")) {
    fail(`${pathname} CSP does not restrict styles to the same origin.`);
  }
  if (kind !== "api" && !csp.includes("frame-src https://challenges.cloudflare.com")) {
    fail(`${pathname} CSP does not narrowly allow the Turnstile frame.`);
  }
  return response;
}

function expectHeader(response, pathname, name, expected) {
  const value = response.headers.get(name) || "";
  if (!expected.test(value)) fail(`${pathname} has invalid ${name}: ${value || "missing"}.`);
}

function fail(message) {
  throw new Error(`Security smoke failed: ${message}`);
}
