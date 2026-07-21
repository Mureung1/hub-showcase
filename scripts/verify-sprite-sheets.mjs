import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const planariaDir = join(root, "public", "assets", "lumi", "planaria-stage-1");

const expectedSheets = [
  { state: "idle", fps: 4, anchor: "float x=32 y=60" },
  { state: "focused", fps: 6, anchor: "float x=32 y=60" },
  { state: "happy", fps: 6, anchor: "float x=32 y=60" },
  { state: "recovering", fps: 4, anchor: "float x=32 y=60" },
  { state: "hover", fps: 7, anchor: "float x=32 y=60" },
  { state: "hanging", fps: 6, anchor: "top-grip x=32 y=5" },
  { state: "hiding", fps: 5, anchor: "peek-edge x=53 y=32" },
];

function readPngSize(path) {
  const buffer = readFileSync(path);
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error(`${path} is not a PNG file`);
  }

  const chunkType = buffer.subarray(12, 16).toString("ascii");
  if (chunkType !== "IHDR") {
    throw new Error(`${path} does not start with an IHDR chunk`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer.readUInt8(24),
    colorType: buffer.readUInt8(25),
  };
}

let failures = 0;

for (const sheet of expectedSheets) {
  const filename = `planaria-stage-1-${sheet.state}-sheet.png`;
  const path = join(planariaDir, filename);

  try {
    const png = readPngSize(path);
    const frameWidth = png.width / 4;
    const isValid = png.width === 256 && png.height === 64 && frameWidth === 64;

    if (!isValid) failures += 1;

    console.log(
      `${isValid ? "PASS" : "FAIL"} ${filename} ${png.width}x${png.height} ` +
        `frames=4 cell=${frameWidth}x${png.height} fps=${sheet.fps} anchor=${sheet.anchor}`,
    );
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${filename} ${(error instanceof Error) ? error.message : String(error)}`);
  }
}

if (failures > 0) {
  console.error(`Sprite sheet verification failed: ${failures} issue(s).`);
  process.exit(1);
}

console.log("Sprite sheet verification passed.");
