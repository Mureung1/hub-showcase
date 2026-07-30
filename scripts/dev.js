import { spawn } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";

const viteBin = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const children = [
  spawn(process.execPath, ["--env-file=.env", "server/demo.js"], { stdio: "inherit" }),
  spawn(process.execPath, [viteBin, "--host", "127.0.0.1"], { stdio: "inherit" }),
];

let stopping = false;

function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exitCode = exitCode;
}

for (const child of children) {
  child.on("error", (error) => {
    console.error("개발 서버를 실행하지 못했습니다:", error.message);
    stopAll(1);
  });
  child.on("exit", (code) => {
    if (!stopping) stopAll(code ?? 1);
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
