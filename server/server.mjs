import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createApiV1Handler } from "./apiV1.mjs";
import { handleContextAnalysisRequest } from "./contextAnalysisApi.mjs";

const moduleUrl = new URL(import.meta.url);
const modulePath = moduleUrl.protocol === "file:" ? fileURLToPath(moduleUrl) : "";
const defaultRootDir = modulePath ? resolve(dirname(modulePath), "..") : process.cwd();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
};

export function createModuBrainServer(options = {}) {
  const rootDir = options.rootDir || defaultRootDir;
  const distDir = options.distDir || join(rootDir, "dist");
  const handleApiV1 = createApiV1Handler(options.apiV1Options);

  return createServer(async (req, res) => {
    if (isSecureRequest(req)) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }

    let pathname;

    try {
      pathname = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`).pathname;
    } catch {
      writeText(res, 400, "잘못된 요청 URL입니다.");
      return;
    }

    try {
      if (pathname === "/api/context-analysis") {
        await handleContextAnalysisRequest(req, res, {
          ...(options.apiOptions || {}),
          analysisOptions: {
            ...(options.apiOptions?.analysisOptions || {}),
            provider: "local-heuristic",
          },
        });
        return;
      }

      if (await handleApiV1(req, res, pathname)) return;

      await serveStatic(pathname, res, {
        distDir,
        supabaseUrl:
          options.supabaseUrl || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      });
    } catch {
      if (!res.headersSent) {
        writeText(res, 500, "서버에서 요청을 처리하지 못했습니다.");
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  });
}

export async function serveStatic(pathname, res, options = {}) {
  const distDir = options.distDir || join(defaultRootDir, "dist");

  if (!existsSync(distDir)) {
    writeText(res, 503, "dist directory not found. Run npm run build first.");
    return;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    writeText(res, 400, "잘못 인코딩된 요청 경로입니다.");
    return;
  }

  const relativePath = decodedPath.replace(/^[/\\]+/, "") || "index.html";
  let filePath = resolve(distDir, relativePath);
  const resolvedDistDir = resolve(distDir);

  if (filePath !== resolvedDistDir && !filePath.startsWith(`${resolvedDistDir}${sep}`)) {
    writeText(res, 403, "Forbidden");
    return;
  }

  let fileStat = await tryStat(filePath);

  if (fileStat?.isDirectory()) {
    filePath = join(filePath, "index.html");
    fileStat = await tryStat(filePath);
    if (!fileStat?.isFile()) {
      writeText(res, 404, "Not found");
      return;
    }
  } else if (!fileStat?.isFile()) {
    if (extname(relativePath)) {
      writeText(res, 404, "Not found");
      return;
    }

    filePath = join(resolvedDistDir, "index.html");
    fileStat = await tryStat(filePath);
    if (!fileStat?.isFile()) {
      writeText(res, 503, "dist index not found. Run npm run build first.");
      return;
    }
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", mimeTypes[extname(filePath)] || "application/octet-stream");
  setSecurityHeaders(res, options);
  await pipeFile(filePath, res);
}

function tryStat(filePath) {
  return stat(filePath).catch(() => null);
}

function pipeFile(filePath, res) {
  return new Promise((resolvePromise) => {
    const stream = createReadStream(filePath);

    stream.on("error", () => {
      if (!res.headersSent) {
        writeText(res, 500, "정적 파일을 읽을 수 없습니다.");
      } else if (!res.writableEnded) {
        res.end();
      }
      resolvePromise();
    });
    stream.on("end", resolvePromise);
    stream.pipe(res);
  });
}

function writeText(res, statusCode, message) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  setSecurityHeaders(res);
  res.end(message);
}

function setSecurityHeaders(res, options = {}) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  let connectSource = "'self'";
  try {
    if (options.supabaseUrl) connectSource += ` ${new URL(options.supabaseUrl).origin}`;
  } catch {
    // Invalid optional configuration must not weaken the default same-origin CSP.
  }
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src ${connectSource}; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
  );
}

function isSecureRequest(req) {
  const forwardedProtocol = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  return Boolean(req.socket?.encrypted) || forwardedProtocol === "https";
}

if (modulePath && process.argv[1] && resolve(process.argv[1]) === modulePath) {
  const port = Number(process.env.PORT || 4173);
  const host = process.env.HOST || "127.0.0.1";
  const server = createModuBrainServer();
  server.listen(port, host, () => {
    console.log(`Modu Brain preview server running at http://${host}:${port}`);
  });
}
