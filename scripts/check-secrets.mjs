import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((file) => !file.endsWith(".lock") && !file.includes("node_modules"));

const forbiddenFile = /(^|\/)(\.env(?:\..+)?|.*\.pem|.*\.key)$/i;
const forbiddenValue = /(NAVER_CLIENT_SECRET\s*=\s*[^\s#]+|NCP_CLIENT_SECRET\s*=\s*[^\s#]+|service_role\s*[=:]\s*["'][^"']+|AKIA[0-9A-Z]{16})/;
const findings = [];

for (const file of tracked) {
  if (forbiddenFile.test(file) && !file.endsWith(".env.example")) findings.push(`${file}: environment/key file must not be tracked`);
  try {
    const content = readFileSync(file, "utf8");
    if (forbiddenValue.test(content)) findings.push(`${file}: possible secret value found`);
  } catch {
    // Binary or unavailable files are irrelevant to the source scan.
  }
}

if (findings.length) {
  console.error("Secret check failed:\n" + findings.join("\n"));
  process.exit(1);
}
console.log("Secret check passed: no tracked environment files or server secrets detected.");
