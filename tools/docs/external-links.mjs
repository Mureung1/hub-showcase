import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listMarkdownFiles } from "./validate.mjs";

const require = createRequire(import.meta.url);
const markdownLinkCheck = require("markdown-link-check");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const files = listMarkdownFiles(root).filter((file) =>
  file === "README.md" || file === "AGENTS.md" || file.startsWith("docs/"));

let failures = 0;
for (const file of files) {
  const markdown = await readFile(path.join(root, file), "utf8");
  const results = await new Promise((resolve) => {
    markdownLinkCheck(markdown, {
      baseUrl: `file://${path.dirname(path.join(root, file))}/`,
      ignorePatterns: [
        { pattern: "^http://localhost" },
        { pattern: "^http://127\\.0\\.0\\.1" },
      ],
      retryOn429: true,
    }, (_error, links) => resolve(links ?? []));
  });

  for (const result of results) {
    if (result.status === "dead" && /^https?:/.test(result.link)) {
      console.error(`${file}: 외부 링크 실패: ${result.link}`);
      failures += 1;
    }
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`외부 링크 검사 통과: ${files.length}개 Markdown 파일`);
}
