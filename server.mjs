import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4000);
const DATA_DIR = path.join(__dirname, ".local-data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const ALLOWED_ORIGINS = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);

function parseEnvFile(contents) {
  contents.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).forEach((line) => {
    const index = line.indexOf("=");
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  });
}

async function loadLocalEnv() {
  for (const fileName of [".env", ".env.local"]) {
    const filePath = path.join(__dirname, fileName);
    if (existsSync(filePath)) parseEnvFile(await readFile(filePath, "utf8"));
  }
}

function corsHeaders(request) {
  const origin = request.headers.origin;
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "http://localhost:3000",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

function sendJson(request, response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...corsHeaders(request),
    ...extraHeaders,
  });
  response.end(JSON.stringify(payload));
}

async function readJsonFile(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeJsonFile(filePath, value) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readRequestJson(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > 1024 * 1024) throw new Error("요청 본문이 너무 큽니다.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validateSignup({ email, password, name }) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "올바른 이메일 주소를 입력해 주세요.";
  if (password.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (name.length < 2 || name.length > 30) return "이름은 2자 이상 30자 이하로 입력해 주세요.";
  return "";
}

function createPasswordRecord(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  const actual = Buffer.from(scryptSync(password, user.passwordSalt, 64));
  const expected = Buffer.from(user.passwordHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt };
}

function parseCookies(request) {
  return Object.fromEntries(String(request.headers.cookie || "").split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
  }));
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

async function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const sessions = (await readJsonFile(SESSIONS_FILE)).filter((session) => session.expiresAt > now);
  sessions.push({ id: randomUUID(), userId, tokenHash: hashToken(token), createdAt: now, expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000 });
  await writeJsonFile(SESSIONS_FILE, sessions);
  return token;
}

async function getAuthenticatedUser(request) {
  const token = parseCookies(request).jr_session;
  if (!token) return null;
  const now = Date.now();
  const sessions = await readJsonFile(SESSIONS_FILE);
  const session = sessions.find((item) => item.tokenHash === hashToken(token) && item.expiresAt > now);
  if (!session) return null;
  const users = await readJsonFile(USERS_FILE);
  return users.find((user) => user.id === session.userId) || null;
}

function sessionCookie(token) {
  return `jr_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

async function handleSignup(request, response) {
  const body = await readRequestJson(request);
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  const validationError = validateSignup({ email, password, name });
  if (validationError) return sendJson(request, response, 400, { message: validationError });

  const users = await readJsonFile(USERS_FILE);
  if (users.some((user) => user.email === email)) return sendJson(request, response, 409, { message: "이미 가입된 이메일입니다." });
  const passwordRecord = createPasswordRecord(password);
  const now = new Date().toISOString();
  const user = { id: randomUUID(), email, name, passwordSalt: passwordRecord.salt, passwordHash: passwordRecord.hash, createdAt: now, updatedAt: now };
  users.push(user);
  await writeJsonFile(USERS_FILE, users);
  const token = await createSession(user.id);
  return sendJson(request, response, 201, { user: publicUser(user) }, { "Set-Cookie": sessionCookie(token) });
}

async function handleLogin(request, response) {
  const body = await readRequestJson(request);
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const users = await readJsonFile(USERS_FILE);
  const user = users.find((item) => item.email === email);
  if (!user || !verifyPassword(password, user)) return sendJson(request, response, 401, { message: "이메일 또는 비밀번호가 올바르지 않습니다." });
  const token = await createSession(user.id);
  return sendJson(request, response, 200, { user: publicUser(user) }, { "Set-Cookie": sessionCookie(token) });
}

async function handleLogout(request, response) {
  const token = parseCookies(request).jr_session;
  if (token) {
    const tokenHash = hashToken(token);
    const sessions = (await readJsonFile(SESSIONS_FILE)).filter((session) => session.tokenHash !== tokenHash);
    await writeJsonFile(SESSIONS_FILE, sessions);
  }
  return sendJson(request, response, 200, { ok: true }, { "Set-Cookie": "jr_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0" });
}

async function handleMe(request, response) {
  const user = await getAuthenticatedUser(request);
  if (!user) return sendJson(request, response, 401, { message: "로그인이 필요합니다." });
  return sendJson(request, response, 200, { user: publicUser(user) });
}

async function handleProfileUpdate(request, response) {
  const authenticatedUser = await getAuthenticatedUser(request);
  if (!authenticatedUser) return sendJson(request, response, 401, { message: "로그인이 필요합니다." });
  const body = await readRequestJson(request);
  const name = String(body.name || "").trim();
  if (name.length < 2 || name.length > 30) return sendJson(request, response, 400, { message: "이름은 2자 이상 30자 이하로 입력해 주세요." });
  const users = await readJsonFile(USERS_FILE);
  const index = users.findIndex((user) => user.id === authenticatedUser.id);
  users[index] = { ...users[index], name, updatedAt: new Date().toISOString() };
  await writeJsonFile(USERS_FILE, users);
  return sendJson(request, response, 200, { user: publicUser(users[index]) });
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value || fallback);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function normalizeKakaoPlace(item) {
  const categoryParts = String(item.category_name || "").split(">").map((part) => part.trim()).filter(Boolean);
  return { id: item.id, title: item.place_name || "이름 없는 업체", link: item.place_url || "", category: categoryParts.at(-1) || "업체", fullCategory: categoryParts.join(" > ") || "분류 정보 없음", description: "", telephone: item.phone || "", address: item.address_name || "", roadAddress: item.road_address_name || "", x: item.x, y: item.y };
}

async function handleKakaoLocalSearch(request, response, url) {
  const restApiKey = process.env.KAKAO_REST_API_KEY;
  if (!restApiKey) return sendJson(request, response, 501, { message: "카카오 Local REST API 키가 설정되지 않았습니다." });
  const query = String(url.searchParams.get("query") || "").trim();
  if (!query) return sendJson(request, response, 400, { message: "검색어를 입력해 주세요." });
  const size = clampNumber(url.searchParams.get("size"), 15, 1, 15);
  const x = Number(url.searchParams.get("x"));
  const y = Number(url.searchParams.get("y"));
  const radius = clampNumber(url.searchParams.get("radius"), 5000, 500, 20000);
  const kakaoUrl = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  kakaoUrl.searchParams.set("query", query);
  kakaoUrl.searchParams.set("size", String(size));
  kakaoUrl.searchParams.set("page", String(clampNumber(url.searchParams.get("page"), 1, 1, 45)));
  if (Number.isFinite(x) && Number.isFinite(y)) {
    kakaoUrl.searchParams.set("x", String(x));
    kakaoUrl.searchParams.set("y", String(y));
    kakaoUrl.searchParams.set("radius", String(radius));
    kakaoUrl.searchParams.set("sort", "distance");
  } else {
    kakaoUrl.searchParams.set("sort", "accuracy");
  }
  try {
    const kakaoResponse = await fetch(kakaoUrl, { headers: { Authorization: `KakaoAK ${restApiKey}`, KA: "sdk/1.0.0 os/javascript lang/ko-KR origin/http%3A%2F%2Flocalhost%3A3000" } });
    const payload = await kakaoResponse.json();
    if (!kakaoResponse.ok) return sendJson(request, response, kakaoResponse.status, { message: "카카오 장소 검색에 실패했습니다.", detail: payload });
    return sendJson(request, response, 200, { query, total: payload.meta?.total_count || 0, isEnd: Boolean(payload.meta?.is_end), items: (payload.documents || []).map(normalizeKakaoPlace) });
  } catch (error) {
    return sendJson(request, response, 502, { message: "카카오 장소 검색 서버에 연결하지 못했습니다.", detail: error.message });
  }
}

async function handleStatic(response, url) {
  const buildDir = path.join(__dirname, "build");
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]/, "");
  const filePath = path.join(buildDir, safePath);
  try {
    const bytes = await readFile(filePath);
    const contentType = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".ico": "image/x-icon", ".svg": "image/svg+xml" }[path.extname(filePath)] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(bytes);
  } catch {
    const indexPath = path.join(buildDir, "index.html");
    if (existsSync(indexPath)) {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(await readFile(indexPath));
      return;
    }
    response.writeHead(404);
    response.end("Build not found");
  }
}

await loadLocalEnv();
await mkdir(DATA_DIR, { recursive: true });

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === "OPTIONS") {
    response.writeHead(204, { ...corsHeaders(request), "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS" });
    return response.end();
  }
  try {
    if (url.pathname === "/api/health" && request.method === "GET") return sendJson(request, response, 200, { ok: true });
    if (url.pathname === "/api/auth/signup" && request.method === "POST") return await handleSignup(request, response);
    if (url.pathname === "/api/auth/login" && request.method === "POST") return await handleLogin(request, response);
    if (url.pathname === "/api/auth/logout" && request.method === "POST") return await handleLogout(request, response);
    if (url.pathname === "/api/auth/me" && request.method === "GET") return await handleMe(request, response);
    if (url.pathname === "/api/users/me" && request.method === "PATCH") return await handleProfileUpdate(request, response);
    if (url.pathname === "/api/kakao/local" && request.method === "GET") return await handleKakaoLocalSearch(request, response, url);
    return await handleStatic(response, url);
  } catch (error) {
    return sendJson(request, response, 500, { message: "요청을 처리하지 못했습니다.", detail: error.message });
  }
}).listen(PORT, () => console.log(`지금리뷰 API server listening on http://localhost:${PORT}`));
