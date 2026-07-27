import Phaser from "phaser";

type SpriteSheetOptions = {
  frameSize: number;
  columns: number;
  rows: number;
  fitToFrameGrid?: boolean;
  rowOffsets?: Partial<Record<number, number>>;
  removeGroundShadow?: boolean;
};

const BACKGROUND_MIN_CHANNEL = 180;
const BACKGROUND_MAX_CHANNEL_SPREAD = 18;
const GROUND_SHADOW_MIN_CHANNEL = 150;
const GROUND_SHADOW_MAX_CHANNEL = 230;
const GROUND_SHADOW_MAX_CHANNEL_SPREAD = 24;
const GROUND_SHADOW_START_RATIO = 0.86;

export function createTransparentSpriteSheet(
  scene: Phaser.Scene,
  sourceKey: string,
  targetKey: string,
  options: SpriteSheetOptions,
) {
  const sourceImage = scene.textures.get(sourceKey).getSourceImage() as HTMLImageElement;
  const canvas = document.createElement("canvas");
  const targetWidth = options.frameSize * options.columns;
  const targetHeight = options.frameSize * options.rows;
  canvas.width = options.fitToFrameGrid ? targetWidth : sourceImage.width;
  canvas.height = options.fitToFrameGrid ? targetHeight : sourceImage.height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error(`투명 스프라이트 시트를 만들 수 없습니다: ${targetKey}`);
  }

  context.imageSmoothingEnabled = false;
  context.drawImage(
    sourceImage,
    0,
    0,
    sourceImage.width,
    sourceImage.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  removeCheckerboardBackground(imageData, options);

  if (options.removeGroundShadow) {
    removeGroundShadows(imageData, options);
  }

  context.putImageData(imageData, 0, 0);

  const texture = scene.textures.addCanvas(targetKey, canvas);
  if (!texture) {
    throw new Error(`투명 스프라이트 텍스처를 등록할 수 없습니다: ${targetKey}`);
  }

  for (let row = 0; row < options.rows; row += 1) {
    for (let column = 0; column < options.columns; column += 1) {
      const frameIndex = row * options.columns + column;
      texture.add(
        frameIndex,
        0,
        column * options.frameSize,
        getFrameStartY(row, options),
        options.frameSize,
        options.frameSize,
      );
    }
  }

  texture.refresh();
}

function removeGroundShadows(
  imageData: ImageData,
  { frameSize, columns, rows, rowOffsets }: SpriteSheetOptions,
) {
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const startX = column * frameSize;
      const startY = getFrameStartY(row, { frameSize, rowOffsets });
      const shadowStartY = Math.floor(frameSize * GROUND_SHADOW_START_RATIO);

      for (let y = shadowStartY; y < frameSize; y += 1) {
        for (let x = 0; x < frameSize; x += 1) {
          const pixelIndex =
            (startY + y) * imageData.width * 4 + (startX + x) * 4;

          if (isGroundShadowPixel(imageData, pixelIndex)) {
            imageData.data[pixelIndex + 3] = 0;
          }
        }
      }
    }
  }
}

function removeCheckerboardBackground(
  imageData: ImageData,
  { frameSize, columns, rows, rowOffsets }: SpriteSheetOptions,
) {
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      removeFrameBackground(
        imageData,
        column * frameSize,
        getFrameStartY(row, { frameSize, rowOffsets }),
        frameSize,
      );
    }
  }
}

function getFrameStartY(
  row: number,
  { frameSize, rowOffsets }: Pick<SpriteSheetOptions, "frameSize" | "rowOffsets">,
) {
  return row * frameSize + (rowOffsets?.[row] ?? 0);
}

function removeFrameBackground(
  imageData: ImageData,
  startX: number,
  startY: number,
  frameSize: number,
) {
  const visited = new Uint8Array(frameSize * frameSize);
  const stack: Array<[number, number]> = [];

  for (let index = 0; index < frameSize; index += 1) {
    stack.push([index, 0], [index, frameSize - 1], [0, index], [frameSize - 1, index]);
  }

  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const visitIndex = y * frameSize + x;

    if (visited[visitIndex] === 1 || !isCheckerboardPixel(imageData, startX + x, startY + y)) {
      continue;
    }

    visited[visitIndex] = 1;
    const pixelIndex = (startY + y) * imageData.width * 4 + (startX + x) * 4;
    imageData.data[pixelIndex + 3] = 0;

    if (x > 0) stack.push([x - 1, y]);
    if (x < frameSize - 1) stack.push([x + 1, y]);
    if (y > 0) stack.push([x, y - 1]);
    if (y < frameSize - 1) stack.push([x, y + 1]);
  }
}

function isCheckerboardPixel(imageData: ImageData, x: number, y: number) {
  const pixelIndex = y * imageData.width * 4 + x * 4;
  const red = imageData.data[pixelIndex];
  const green = imageData.data[pixelIndex + 1];
  const blue = imageData.data[pixelIndex + 2];
  const min = Math.min(red, green, blue);
  const max = Math.max(red, green, blue);

  return (
    min >= BACKGROUND_MIN_CHANNEL &&
    max - min <= BACKGROUND_MAX_CHANNEL_SPREAD
  );
}

function isGroundShadowPixel(imageData: ImageData, pixelIndex: number) {
  const red = imageData.data[pixelIndex];
  const green = imageData.data[pixelIndex + 1];
  const blue = imageData.data[pixelIndex + 2];
  const min = Math.min(red, green, blue);
  const max = Math.max(red, green, blue);

  return (
    imageData.data[pixelIndex + 3] !== 0 &&
    min >= GROUND_SHADOW_MIN_CHANNEL &&
    max <= GROUND_SHADOW_MAX_CHANNEL &&
    max - min <= GROUND_SHADOW_MAX_CHANNEL_SPREAD
  );
}
