import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";

const COLORS = {
  background: "#FFE94A",
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

  const hasBackgroundLines = Array.isArray(guide.backgroundLines) && guide.backgroundLines.length > 0;
  if (!hasBackgroundLines) fail("backgroundLines is required.");
  guide.backgroundLines.forEach((line, index) => validateBackgroundLine(line, `backgroundLines[${index}]`));

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

  const strokeWidth = Math.max(2, Math.round(Math.min(width, height) * 0.006));
  const backgroundLines = guide.backgroundLines?.map((line) => {
    const [startX, startY] = line.start;
    const [endX, endY] = line.end;
    return `<line x1="${toPixels(startX, width)}" y1="${toPixels(startY, height)}" x2="${toPixels(endX, width)}" y2="${toPixels(endY, height)}" fill="none" stroke="${COLORS.background}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="0.92" />`;
  }).join("") ?? "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${backgroundLines}
</svg>`;
}

export function parseArgs(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];

    if (!flag?.startsWith("--") || !value) {
      fail("usage: --image <path> --layout <path> --output <path>");
    }

    options[flag.slice(2)] = value;
  }

  for (const required of ["image", "layout", "output"]) {
    if (!options[required]) {
      fail(`--${required} is required.`);
    }
  }

  return options;
}

export async function generateOverlay({ imagePath, layoutPath, outputPath }) {
  const rawGuide = await readFile(layoutPath, "utf8");
  let guide;

  try {
    guide = JSON.parse(rawGuide);
  } catch {
    fail("layout must contain valid JSON.");
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
    layoutPath: resolve(options.layout),
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
