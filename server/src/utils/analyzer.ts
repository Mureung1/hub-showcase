import { spawn } from "child_process";
import { ANALYZER_DIR } from "./paths";

export interface AnalyzedClass {
  name: string;
  filePath: string;
  baseTypes: string[];
  referencedTypes: string[];
  methodCount: number;
}

export interface AnalyzerResult {
  classes: AnalyzedClass[];
}

// Runs the Roslyn analyzer (Syntax-only — no MSBuildWorkspace/compilation) against a
// local folder and returns its class/inheritance/dependency JSON.
export function runAnalyzer(targetPath: string): Promise<AnalyzerResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("dotnet", ["run", "--project", ANALYZER_DIR, "--", targetPath]);

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));

    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (exitCode !== 0) {
        return reject(new Error(`analyzer exited with code ${exitCode}: ${stderr.trim()}`));
      }
      // dotnet may print restore/build chatter before our JSON on a cold run,
      // so only the last non-empty line is treated as the actual payload.
      const lastLine = stdout.trim().split("\n").pop() ?? "";
      try {
        resolve(JSON.parse(lastLine) as AnalyzerResult);
      } catch {
        reject(new Error(`analyzer produced non-JSON output: ${stdout.trim()}`));
      }
    });
  });
}
