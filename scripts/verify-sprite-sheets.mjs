import { readFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

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

const canonicalStage2PetIds = [
  "pink-manager",
  "glass-frog",
];

const promotedStage2CandidatePetIds = [
  "costasiella-kuroshimae",
  "fried-egg-jellyfish",
  "sea-bunny-slug",
];

const candidateSheets = [
  {
    petId: "pink-manager",
    stage: "stage-1",
    state: "idle",
    frameCount: 4,
    fps: 4,
    loop: true,
    playbackFrames: [0, 1, 2, 3],
    anchor: "float x=32 y=58",
    folder: "pink-manager-stage-1",
    filename: "pink-manager-stage-1-idle-sheet.png",
  },
  {
    petId: "pink-manager",
    stage: "stage-2",
    state: "watching",
    frameCount: 4,
    fps: 5,
    loop: true,
    playbackFrames: [0, 1, 2, 3],
    anchor: "float x=32 y=58",
    folder: "pink-manager-stage-2-production-candidates",
    filename: "pink-manager-stage-2-watching-sheet-v1.png",
  },
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

function promotedStage2CandidateVersion(petId, state) {
  if ((petId === "costasiella-kuroshimae" || petId === "sea-bunny-slug") && (state === "hanging" || state === "climbing")) {
    return "v2";
  }
  return "v1";
}

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
    buffer,
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer.readUInt8(24),
    colorType: buffer.readUInt8(25),
  };
}

let failures = 0;

function readPngDiagnostics(png, frameCount) {
  const pixels = decodePngPixels(png);
  const alpha = summarizeAlpha(pixels, png.width, png.height);
  const frameBoxes = summarizeFrameBoxes(pixels, png.width, png.height, frameCount);
  const alphaSummary =
    `alpha=opaque:${alpha.opaquePct}% semi:${alpha.semiPct}% transparent:${alpha.transparentPct}% ` +
    `cornerOpaque=${alpha.cornerOpaque} cornerSemi=${alpha.cornerSemi}`;
  const bboxSummary = `bbox=${formatFrameBoxes(frameBoxes)}`;

  return `${alphaSummary} ${bboxSummary}`;
}

function decodePngPixels(png) {
  if (png.bitDepth !== 8) {
    throw new Error(`Unsupported PNG bit depth for diagnostics: ${png.bitDepth}`);
  }

  const bytesPerPixel = getBytesPerPixel(png.colorType);
  const colorChannels = getColorChannels(png.colorType);
  const alphaChannel = getAlphaChannel(png.colorType);
  const rowLength = png.width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(readPngChunks(png.buffer, "IDAT")));
  const pixels = new Uint8Array(png.width * png.height * 4);
  let inputOffset = 0;
  let previousRow = new Uint8Array(rowLength);

  for (let y = 0; y < png.height; y += 1) {
    const filterType = inflated[inputOffset];
    inputOffset += 1;
    const rawRow = inflated.subarray(inputOffset, inputOffset + rowLength);
    inputOffset += rowLength;
    const row = unfilterRow(rawRow, previousRow, bytesPerPixel, filterType);

    for (let x = 0; x < png.width; x += 1) {
      const source = x * bytesPerPixel;
      const target = (y * png.width + x) * 4;
      pixels[target] = colorChannels === 1 ? row[source] : row[source];
      pixels[target + 1] = colorChannels === 1 ? row[source] : row[source + 1];
      pixels[target + 2] = colorChannels === 1 ? row[source] : row[source + 2];
      pixels[target + 3] = alphaChannel === -1 ? 255 : row[source + alphaChannel];
    }

    previousRow = row;
  }

  return pixels;
}

function readPngChunks(buffer, type) {
  const chunks = [];
  let offset = 8;

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const chunkType = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (chunkType === type) chunks.push(buffer.subarray(dataStart, dataEnd));
    offset = dataEnd + 4;
  }

  return chunks;
}

function getBytesPerPixel(colorType) {
  if (colorType === 0) return 1;
  if (colorType === 2) return 3;
  if (colorType === 4) return 2;
  if (colorType === 6) return 4;
  throw new Error(`Unsupported PNG color type for diagnostics: ${colorType}`);
}

function getColorChannels(colorType) {
  return colorType === 0 || colorType === 4 ? 1 : 3;
}

function getAlphaChannel(colorType) {
  if (colorType === 4) return 1;
  if (colorType === 6) return 3;
  return -1;
}

function unfilterRow(rawRow, previousRow, bytesPerPixel, filterType) {
  const row = new Uint8Array(rawRow.length);

  for (let index = 0; index < rawRow.length; index += 1) {
    const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
    const up = previousRow[index] ?? 0;
    const upperLeft = index >= bytesPerPixel ? previousRow[index - bytesPerPixel] : 0;
    const raw = rawRow[index];

    if (filterType === 0) row[index] = raw;
    else if (filterType === 1) row[index] = (raw + left) & 0xff;
    else if (filterType === 2) row[index] = (raw + up) & 0xff;
    else if (filterType === 3) row[index] = (raw + Math.floor((left + up) / 2)) & 0xff;
    else if (filterType === 4) row[index] = (raw + paethPredictor(left, up, upperLeft)) & 0xff;
    else throw new Error(`Unsupported PNG filter type: ${filterType}`);
  }

  return row;
}

function paethPredictor(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);

  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
}

function summarizeAlpha(pixels, width, height) {
  let opaque = 0;
  let semi = 0;
  let transparent = 0;
  let cornerOpaque = 0;
  let cornerSemi = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha === 0) transparent += 1;
      else if (alpha === 255) opaque += 1;
      else semi += 1;

      if ((x < 8 || x >= width - 8) && (y < 8 || y >= height - 8)) {
        if (alpha === 255) cornerOpaque += 1;
        else if (alpha > 0) cornerSemi += 1;
      }
    }
  }

  const total = width * height;
  return {
    opaquePct: pct(opaque, total),
    semiPct: pct(semi, total),
    transparentPct: pct(transparent, total),
    cornerOpaque,
    cornerSemi,
  };
}

function summarizeFrameBoxes(pixels, width, height, frameCount) {
  const frameWidth = width / frameCount;
  return Array.from({ length: frameCount }, (_, frame) => {
    let minX = frameWidth;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    const startX = frame * frameWidth;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < frameWidth; x += 1) {
        const alpha = pixels[(y * width + startX + x) * 4 + 3];
        if (alpha === 0) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < 0) return "empty";
    return `${minX},${minY}-${maxX},${maxY}`;
  });
}

function formatFrameBoxes(frameBoxes) {
  const uniqueBoxes = [...new Set(frameBoxes)];
  if (uniqueBoxes.length <= 3) return uniqueBoxes.join("|");
  return `${uniqueBoxes.slice(0, 3).join("|")}...`;
}

function pct(value, total) {
  return Math.round((value * 10000) / total) / 100;
}

function verifySheet(sheet) {
  const stage = sheet.stage ?? "stage-2";
  const filename = sheet.filename ?? `${sheet.petId}-${stage}-${sheet.state}-sheet.png`;
  const folder = sheet.folder ?? `${sheet.petId}-${stage}`;
  const path = join(root, "public", "assets", "lumi", folder, filename);

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
        `frames=${sheet.frameCount} cell=${frameWidth}x${png.height} fps=${sheet.fps} loop=${sheet.loop} anchor=${sheet.anchor} ` +
        readPngDiagnostics(png, sheet.frameCount),
    );
  } catch (error) {
    failures += 1;
    console.error(`FAIL ${filename} ${(error instanceof Error) ? error.message : String(error)}`);
  }
}

for (const sheet of planariaSheets) {
  verifySheet({ ...sheet, stage: "stage-1", loop: true, playbackFrames: Array.from({ length: sheet.frameCount }, (_, frame) => frame) });
}

for (const sheet of candidateSheets) {
  verifySheet(sheet);
}

for (const petId of canonicalStage2PetIds) {
  for (const motion of motionSpecs) {
    verifySheet({
      petId,
      ...motion,
      anchor: motion.state === "hanging" || motion.state === "climbing" ? "top-grip x=32 y=5" : motion.state === "hiding" ? "peek-edge x=4 y=32" : "float x=32 y=58",
    });
  }
}

for (const petId of promotedStage2CandidatePetIds) {
  for (const motion of motionSpecs) {
    verifySheet({
      petId,
      ...motion,
      anchor: motion.state === "hanging" || motion.state === "climbing" ? "top-grip x=32 y=5" : motion.state === "hiding" ? "peek-edge x=4 y=32" : "float x=32 y=58",
      folder: `${petId}-stage-2-production-candidates`,
      filename: `${petId}-stage-2-${motion.state}-sheet-${promotedStage2CandidateVersion(petId, motion.state)}.png`,
    });
  }
}

if (failures > 0) {
  console.error(`Sprite sheet verification failed: ${failures} issue(s).`);
  process.exit(1);
}

console.log("Sprite sheet verification passed.");
