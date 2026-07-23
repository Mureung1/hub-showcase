import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const COLORS = {
  building: "#D9FFF3",
  horizon: "#FFFFFF",
  person: "#3DFFAE",
  label: "#FFFFFF",
};

function fail(message) {
  throw new Error(`Overlay guide error: ${message}`);
}

function isUnitNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function validatePoint(point, fieldName) {
  if (!Array.isArray(point) || point.length !== 2 || !isUnitNumber(point[0]) || !isUnitNumber(point[1])) {
    fail(`${fieldName} must be a [x, y] pair with values between 0 and 1.`);
  }
}

function validatePersonFrame(frame, fieldName) {
  if (!frame || typeof frame !== "object" || Array.isArray(frame)) {
    fail(`${fieldName} must be an object.`);
  }

  for (const field of ["x", "y", "width", "height"]) {
    if (!isUnitNumber(frame[field])) {
      fail(`${fieldName}.${field} must be a number between 0 and 1.`);
    }
  }

  if (frame.width === 0 || frame.height === 0) {
    fail(`${fieldName} width and height must be greater than 0.`);
  }

  if (frame.x + frame.width > 1 || frame.y + frame.height > 1) {
    fail(`${fieldName} must stay inside the image bounds.`);
  }
}

function validateBackgroundLine(line, fieldName) {
  if (!line || typeof line !== "object" || Array.isArray(line)) {
    fail(`${fieldName} must be an object with start and end points.`);
  }
  validatePoint(line.start, `${fieldName}.start`);
  validatePoint(line.end, `${fieldName}.end`);
}

export function validateGuide(guide) {
  if (!guide || typeof guide !== "object" || Array.isArray(guide)) {
    fail("guide must be a JSON object.");
  }

  const hasOutline = Array.isArray(guide.buildingOutline) && guide.buildingOutline.length >= 2;
  const hasBackgroundLines = Array.isArray(guide.backgroundLines) && guide.backgroundLines.length > 0;
  if (!hasOutline && !hasBackgroundLines) {
    fail("buildingOutline or backgroundLines is required.");
  }

  if (hasOutline) {
    guide.buildingOutline.forEach((point, index) => validatePoint(point, `buildingOutline[${index}]`));
  }
  if (hasBackgroundLines) {
    guide.backgroundLines.forEach((line, index) => validateBackgroundLine(line, `backgroundLines[${index}]`));
  }

  if (!isUnitNumber(guide.horizonY)) {
    fail("horizonY must be a number between 0 and 1.");
  }

  const personFrames = guide.personFrames ?? (guide.personFrame ? [guide.personFrame] : []);
  if (!Array.isArray(personFrames) || personFrames.length === 0) {
    fail("personFrame or personFrames is required.");
  }

  personFrames.forEach((frame, index) => validatePersonFrame(frame, `personFrames[${index}]`));

  return guide;
}

function toPixels(value, length) {
  return Math.round(value * length);
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character]);
}

export function createOverlaySvg({ width, height, guide }) {
  validateGuide(guide);

  const outline = guide.buildingOutline?.map(([x, y]) => `${toPixels(x, width)},${toPixels(y, height)}`).join(" ");
  const backgroundLines = guide.backgroundLines?.map((line) => {
    const [startX, startY] = line.start;
    const [endX, endY] = line.end;
    return `<line x1="${toPixels(startX, width)}" y1="${toPixels(startY, height)}" x2="${toPixels(endX, width)}" y2="${toPixels(endY, height)}" fill="none" stroke="${COLORS.building}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="0.92" />`;
  }).join("") ?? "";
  const horizonY = toPixels(guide.horizonY, height);
  const personFrames = guide.personFrames ?? [guide.personFrame];
  const fontSize = Math.max(14, Math.round(Math.min(width, height) * 0.035));
  const strokeWidth = Math.max(2, Math.round(Math.min(width, height) * 0.006));
  const buildingLabel = escapeXml(guide.buildingLabel ?? "Background outline");
  const labelPoint = guide.backgroundLines?.[0]?.start ?? guide.buildingOutline?.[0] ?? [0.1, 0.3];
  const personElements = personFrames.map((frame, index) => {
    const frameX = toPixels(frame.x, width);
    const frameY = toPixels(frame.y, height);
    const frameWidth = toPixels(frame.width, width);
    const frameHeight = toPixels(frame.height, height);
    const fallbackLabel = personFrames.length === 1 ? "Subject position" : `Person ${index + 1}`;
    const personLabel = escapeXml(frame.label ?? guide.personLabel ?? fallbackLabel);

    return `
  <rect x="${frameX}" y="${frameY}" width="${frameWidth}" height="${frameHeight}" rx="${strokeWidth * 2}" fill="none" stroke="${COLORS.person}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeWidth * 3} ${strokeWidth * 2}" />
  <line x1="${frameX + frameWidth / 2}" y1="${frameY - strokeWidth * 4}" x2="${frameX + frameWidth / 2}" y2="${frameY + frameHeight + strokeWidth * 4}" stroke="${COLORS.person}" stroke-width="${Math.max(1, strokeWidth - 1)}" opacity="0.65" />
  <text x="${frameX}" y="${Math.max(fontSize, frameY - fontSize / 2)}" fill="${COLORS.person}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600">${personLabel}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${outline ? `<polyline points="${outline}" fill="none" stroke="${COLORS.building}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="0.92" />` : ""}
  ${backgroundLines}
  <line x1="0" y1="${horizonY}" x2="${width}" y2="${horizonY}" stroke="${COLORS.horizon}" stroke-width="${Math.max(1, strokeWidth - 1)}" stroke-dasharray="${strokeWidth * 3} ${strokeWidth * 2}" opacity="0.78" />
  <text x="${toPixels(labelPoint[0], width)}" y="${Math.max(fontSize, toPixels(labelPoint[1], height) - fontSize)}" fill="${COLORS.label}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="600">${buildingLabel}</text>
  ${personElements}
</svg>`;
}

export function parseArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];

    if (!flag?.startsWith("--") || !value) {
      fail("usage: --image <path> --guide <path> --output <path>");
    }

    options[flag.slice(2)] = value;
  }

  for (const required of ["image", "guide", "output"]) {
    if (!options[required]) {
      fail(`--${required} is required.`);
    }
  }

  return options;
}

export async function generateOverlay({ imagePath, guidePath, outputPath }) {
  const rawGuide = await readFile(guidePath, "utf8");
  let guide;

  try {
    guide = JSON.parse(rawGuide);
  } catch {
    fail("guide must contain valid JSON.");
  }

  validateGuide(guide);
  const orientedImage = await sharp(imagePath).rotate().png().toBuffer({ resolveWithObject: true });
  const { width, height } = orientedImage.info;

  if (!width || !height) {
    fail("could not determine image dimensions.");
  }

  const svg = createOverlaySvg({ width, height, guide });
  await mkdir(dirname(outputPath), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(outputPath);

  return { width, height, outputPath };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await generateOverlay({
    imagePath: resolve(options.image),
    guidePath: resolve(options.guide),
    outputPath: resolve(options.output),
  });

  console.log(`Created overlay: ${result.outputPath} (${result.width}x${result.height})`);
}

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
