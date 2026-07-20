const fs = require("fs");
const path = require("path");

const [mode, projectRoot, gitCommitHash] = process.argv.slice(2);
const uaDir = path.join(projectRoot, ".ua");
const intermediate = path.join(uaDir, "intermediate");
const scanPath = path.join(intermediate, "scan-result.json");
const graphPath = path.join(intermediate, "assembled-graph.json");
const scan = JSON.parse(fs.readFileSync(scanPath, "utf8"));

if (mode === "prepare") {
  const graph = fs.readFileSync(graphPath, "utf8");
  fs.writeFileSync(path.join(uaDir, "knowledge-graph.json"), graph);
  const input = {
    projectRoot,
    sourceFilePaths: scan.files.map((file) => file.path),
    gitCommitHash,
  };
  fs.writeFileSync(
    path.join(intermediate, "fingerprint-input.json"),
    `${JSON.stringify(input, null, 2)}\n`,
  );
  process.stdout.write(`Prepared final graph and ${input.sourceFilePaths.length} fingerprint paths.\n`);
} else if (mode === "meta") {
  const meta = {
    lastAnalyzedAt: new Date().toISOString(),
    gitCommitHash,
    version: "1.0.0",
    analyzedFiles: scan.totalFiles,
  };
  fs.writeFileSync(
    path.join(uaDir, "meta.json"),
    `${JSON.stringify(meta, null, 2)}\n`,
  );
  process.stdout.write("Metadata written.\n");
} else {
  throw new Error(`Unknown mode: ${mode}`);
}
