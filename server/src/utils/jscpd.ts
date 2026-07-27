import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

export interface DuplicateBlock {
  format: string;
  lines: number;
  tokens: number;
  fragment: string;
  firstFile: { name: string; start: number; end: number };
  secondFile: { name: string; start: number; end: number };
}

export interface JscpdResult {
  duplicates: DuplicateBlock[];
}

// jscpd 5.x ships as a CLI (Rust binary under the hood) with no importable JS API,
// unlike 4.x — so we shell out and read back its JSON reporter output, the same
// spawn-and-parse pattern used for the Roslyn analyzer.
const JSCPD_BIN = require.resolve("jscpd/run-jscpd.js");

export async function runJscpd(targetPath: string): Promise<JscpdResult> {
  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "gameforge-jscpd-"));

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("node", [
        JSCPD_BIN,
        targetPath,
        "--format",
        "csharp",
        "--reporters",
        "json",
        "--output",
        outDir,
        "--silent",
        "--no-tips",
      ]);

      let stderr = "";
      child.stderr.on("data", (chunk) => (stderr += chunk));
      child.on("error", reject);
      child.on("close", () => {
        // jscpd's own exit code reflects duplication thresholds, not failure —
        // whether it found clones or not, a 0/1 exit here is normal. Only a
        // missing report file (checked below) counts as a real failure.
        void stderr;
        resolve();
      });
    });

    const raw = await fs.readFile(path.join(outDir, "jscpd-report.json"), "utf-8");
    const parsed = JSON.parse(raw) as { duplicates?: DuplicateBlock[] };
    return { duplicates: parsed.duplicates ?? [] };
  } finally {
    await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});
  }
}
