import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { generateOverlay, validateGuide } from "../src/generate-overlay.mjs";

const validGuide = {
  backgroundLines: [{ id: "line_test", start: [0.1, 0.35], end: [0.88, 0.4] }],
  personFrame: { x: 0.35, y: 0.45, width: 0.3, height: 0.42 },
};

test("generates a transparent overlay with the same dimensions as the input", async () => {
  const directory = await mkdtemp(join(tmpdir(), "overlay-agent-"));
  const imagePath = join(directory, "reference.png");
  const layoutPath = join(directory, "example_layout.json");
  const outputPath = join(directory, "overlay.png");

  await sharp({ create: { width: 640, height: 480, channels: 3, background: "#334155" } }).png().toFile(imagePath);
  await writeFile(layoutPath, JSON.stringify(validGuide));
  await generateOverlay({ imagePath, layoutPath, outputPath });

  const metadata = await sharp(outputPath).metadata();
  const pixels = await sharp(outputPath).raw().toBuffer();

  assert.equal(metadata.width, 640);
  assert.equal(metadata.height, 480);
  assert.equal(metadata.hasAlpha, true);
  assert.ok(pixels.length > 0);
});

test("rejects a person frame outside the image", () => {
  assert.throws(
    () => validateGuide({ ...validGuide, personFrame: { x: 0.8, y: 0.5, width: 0.3, height: 0.3 } }),
    /personFrames\[0\] must stay inside the image bounds/,
  );
});

test("rejects coordinates outside the unit range", () => {
  const invalidGuide = JSON.parse(JSON.stringify(validGuide));
  invalidGuide.backgroundLines[0].start = [1.1, 0.3];

  assert.throws(() => validateGuide(invalidGuide), /values between 0 and 1/);
});

test("accepts two person frames for a couple composition", () => {
  const coupleGuide = {
    ...validGuide,
    personFrames: [
      { x: 0.2, y: 0.45, width: 0.22, height: 0.42, label: "Left person" },
      { x: 0.58, y: 0.45, width: 0.22, height: 0.42, label: "Right person" },
    ],
  };
  delete coupleGuide.personFrame;

  assert.doesNotThrow(() => validateGuide(coupleGuide));
});

test("accepts OpenCV-style background line segments", () => {
  const visionGuide = {
    backgroundLines: [
      { id: "line_first", start: [0.1, 0.3], end: [0.7, 0.24] },
      { id: "line_second", start: [0.15, 0.42], end: [0.85, 0.38] },
    ],
    personFrames: [{ x: 0.35, y: 0.4, width: 0.26, height: 0.45 }],
  };

  assert.doesNotThrow(() => validateGuide(visionGuide));
});
