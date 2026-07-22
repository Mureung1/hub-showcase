import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const planariaSheets = [
  { petId: "planaria", state: "idle", frameCount: 4, fps: 4, anchor: "float x=32 y=60" },
  { petId: "planaria", state: "focused", frameCount: 4, fps: 6, anchor: "float x=32 y=60" },
  { petId: "planaria", state: "happy", frameCount: 4, fps: 6, anchor: "float x=32 y=60" },
  { petId: "planaria", state: "recovering", frameCount: 4, fps: 4, anchor: "float x=32 y=60" },
  { petId: "planaria", state: "hover", frameCount: 4, fps: 7, anchor: "float x=32 y=60" },
  { petId: "planaria", state: "hanging", frameCount: 4, fps: 6, anchor: "top-grip x=32 y=5" },
  { petId: "planaria", state: "hiding", frameCount: 4, fps: 5, anchor: "peek-edge x=53 y=32" },
];

const stage1PetIds = [
  "pink-manager",
  "white-headed-long-tailed-tit",
  "costasiella-kuroshimae",
  "sea-bunny-slug",
  "platypus",
  "axolotl",
  "glass-frog",
  "fried-egg-jellyfish",
  "yeti-crab",
];

const motionSpecs = [
  { state: "idle", frameCount: 4, fps: 4, loop: true, playbackFrames: [0, 1, 2, 3] },
  { state: "focused", frameCount: 4, fps: 6, loop: true, playbackFrames: [0, 1, 2, 3] },
  { state: "happy", frameCount: 6, fps: 8, loop: true, playbackFrames: [0, 1, 2, 3, 4, 5] },
  { state: "recovering", frameCount: 4, fps: 4, loop: true, playbackFrames: [0, 1, 2, 3] },
  { state: "hanging", frameCount: 6, fps: 6, loop: true, playbackFrames: [0, 1, 2, 3, 4, 5] },
  { state: "hiding", frameCount: 6, fps: 5, loop: true, playbackFrames: [0, 1, 2, 3, 4, 5] },
  { state: "run", frameCount: 6, fps: 10, loop: true, playbackFrames: [0, 1, 2, 3, 4, 5, 2, 1] },
  { state: "jump", frameCount: 6, fps: 8, loop: false, playbackFrames: [0, 1, 2, 3, 4, 5] },
  { state: "walk", frameCount: 6, fps: 7, loop: true, playbackFrames: [0, 1, 0, 2, 0, 3, 0, 4, 0, 5] },
  { state: "climbing", frameCount: 6, fps: 8, loop: true, playbackFrames: [0, 1, 2, 3, 4, 5, 4, 3] },
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

function verifySheet(sheet) {
  const filename = `${sheet.petId}-stage-1-${sheet.state}-sheet.png`;
  const path = join(root, "public", "assets", "lumi", `${sheet.petId}-stage-1`, filename);

  try {
    const png = readPngSize(path);
    const frameWidth = png.width / sheet.frameCount;
    const isValid =
      png.width === sheet.frameCount * 64 &&
      png.height === 64 &&
      frameWidth === 64 &&
      sheet.playbackFrames.every((frame) => frame >= 0 && frame < sheet.frameCount);

    if (!isValid) failures += 1;

    console.log(
      `${isValid ? "PASS" : "FAIL"} ${filename} ${png.width}x${png.height} ` +
        `frames=${sheet.frameCount} cell=${frameWidth}x${png.height} fps=${sheet.fps} loop=${sheet.loop} anchor=${sheet.anchor}`,
    );
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${filename} ${(error instanceof Error) ? error.message : String(error)}`);
  }
}

for (const sheet of planariaSheets) {
  verifySheet({ ...sheet, loop: true, playbackFrames: Array.from({ length: sheet.frameCount }, (_, frame) => frame) });
}

for (const petId of stage1PetIds) {
  for (const motion of motionSpecs) {
    verifySheet({
      petId,
      ...motion,
      anchor: motion.state === "hanging" || motion.state === "climbing" ? "top-grip x=32 y=5" : motion.state === "hiding" ? "peek-edge x=53 y=32" : "float x=32 y=58",
    });
  }
}

if (failures > 0) {
  console.error(`Sprite sheet verification failed: ${failures} issue(s).`);
  process.exit(1);
}

console.log("Sprite sheet verification passed.");
