import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import sharp from "sharp";
import { generateOverlay, validateGuide } from "../src/generate-overlay.mjs";

const validGuide = {
  buildingOutline: [[0.1, 0.35], [0.45, 0.2], [0.88, 0.4]],
  horizonY: 0.62,
  personFrame: { x: 0.35, y: 0.45, width: 0.3, height: 0.42 },
};

test("generates a transparent overlay with the same dimensions as the input", async () => {
  const directory = await mkdtemp(join(tmpdir(), "overlay-agent-"));
  const imagePath = join(directory, "reference.png");
  const guidePath = join(directory, "guide.json");
  const outputPath = join(directory, "overlay.png");

  await sharp({ create: { width: 640, height: 480, channels: 3, background: "#334155" } }).png().toFile(imagePath);
  await writeFile(guidePath, JSON.stringify(validGuide));
  await generateOverlay({ imagePath, guidePath, outputPath });

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
  invalidGuide.buildingOutline[0] = [1.1, 0.3];

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
