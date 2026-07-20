import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const batchesPath = path.join(projectRoot, ".ua", "intermediate", "batches.json");
const outputDir = path.join(projectRoot, ".ua", "tmp");
const selected = new Set([2, 3, 4, 8]);
const payload = JSON.parse(fs.readFileSync(batchesPath, "utf8"));

for (const batch of payload.batches) {
  if (!selected.has(batch.batchIndex)) continue;

  const input = {
    projectRoot,
    batchFiles: batch.files.map(({ path: filePath, language, sizeLines, fileCategory }) => ({
      path: filePath,
      language,
      sizeLines,
      fileCategory,
    })),
    batchImportData: batch.batchImportData,
  };

  fs.writeFileSync(
    path.join(outputDir, `ua-file-analyzer-input-${batch.batchIndex}.json`),
    `${JSON.stringify(input, null, 2)}\n`,
    "utf8",
  );
}
