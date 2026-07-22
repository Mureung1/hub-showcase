import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4000);
const DATA_DIR = path.join(__dirname, ".local-data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const ALLOWED_ORIGINS = new Set(["http://localhost:3000", "http://127.0.0.1:3000"]);

function isAllowedOrigin(origin) {
  if (!origin || ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    const isPrivateIpv4 = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname);
    return url.protocol === "http:" && url.port === "3000" && isPrivateIpv4;
  } catch {
    return false;
  }
}

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

function sendJson(request, response, statusCode, payload, extraHeaders = {}) {
  Object.entries(extraHeaders).forEach(([name, value]) => response.setHeader(name, value));
  return response.status(statusCode).json(payload);
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
  return request.body || {};
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

await loadLocalEnv();
await mkdir(DATA_DIR, { recursive: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const supabase = supabaseUrl && supabaseSecretKey
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const app = express();
app.disable("x-powered-by");
app.use(cors({
  credentials: true,
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  origin(origin, callback) {
    callback(null, isAllowedOrigin(origin));
  },
}));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (request, response) => {
  if (!supabase) {
    return sendJson(request, response, 503, {
      ok: false,
      database: "disconnected",
      message: "Supabase 환경변수가 설정되지 않았습니다.",
    });
  }

  const { error } = await supabase
    .from("places")
    .select("id", { count: "exact", head: true });

  if (error) {
    return sendJson(request, response, 503, {
      ok: false,
      database: "disconnected",
      message: "Supabase 데이터베이스에 연결하지 못했습니다.",
      code: error.code,
    });
  }

  return sendJson(request, response, 200, { ok: true, database: "connected" });
});

app.post("/api/auth/signup", handleSignup);
app.post("/api/auth/login", handleLogin);
app.post("/api/auth/logout", handleLogout);
app.get("/api/auth/me", handleMe);
app.patch("/api/users/me", handleProfileUpdate);
app.get("/api/kakao/local", (request, response) => {
  const url = new URL(request.originalUrl, `${request.protocol}://${request.get("host")}`);
  return handleKakaoLocalSearch(request, response, url);
});

const buildDir = path.join(__dirname, "build");
app.use(express.static(buildDir));
app.use((request, response, next) => {
  if (request.path.startsWith("/api/")) return sendJson(request, response, 404, { message: "API 경로를 찾을 수 없습니다." });
  const indexPath = path.join(buildDir, "index.html");
  if (!existsSync(indexPath)) return response.status(404).send("Build not found");
  return response.sendFile(indexPath);
});

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);
  const statusCode = error.type === "entity.too.large" ? 413 : 500;
  return sendJson(request, response, statusCode, {
    message: statusCode === 413 ? "요청 본문이 너무 큽니다." : "요청을 처리하지 못했습니다.",
    detail: error.message,
  });
});

app.listen(PORT, "0.0.0.0", () => console.log(`지금리뷰 Express API server listening on http://0.0.0.0:${PORT}`));
