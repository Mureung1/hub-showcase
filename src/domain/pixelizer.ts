export interface PixelizerConfig {
  scale: number;
  paletteSize?: number;
  dither?: boolean;
}

export interface PixelizerPlan {
  sourceWidth: number;
  sourceHeight: number;
  sampleWidth: number;
  sampleHeight: number;
  smoothing: boolean;
}

export interface PixelizerFrameSize {
  width: number;
  height: number;
}

export interface PixelTvStreamSettings {
  sampleWidth: number;
  sampleHeight: number;
  targetFps: 24;
  smoothing: false;
}

export interface PixelTvPhotoCaptureRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PixelTvPhotoCapturePlan {
  width: number;
  height: number;
  tvFrame: PixelTvPhotoCaptureRect;
  tvScreen: PixelTvPhotoCaptureRect;
  managerSprite: PixelTvPhotoCaptureRect;
  caption: PixelTvPhotoCaptureRect;
  smoothing: false;
}

export function createPixelizerPlan(sourceWidth: number, sourceHeight: number, _config: PixelizerConfig): PixelizerPlan {
  const scale = Math.max(1, Math.floor(_config.scale));

  return {
    sourceWidth,
    sourceHeight,
    sampleWidth: Math.max(1, Math.floor(sourceWidth / scale)),
    sampleHeight: Math.max(1, Math.floor(sourceHeight / scale)),
    smoothing: false,
  };
}

export function resolvePixelTvStreamSettings(
  sourceWidth: number,
  sourceHeight: number,
): PixelTvStreamSettings {
  const maxSampleWidth = 144;
  const maxSampleHeight = 108;
  const safeSourceWidth = Math.max(1, sourceWidth);
  const safeSourceHeight = Math.max(1, sourceHeight);
  const ratio = Math.min(maxSampleWidth / safeSourceWidth, maxSampleHeight / safeSourceHeight);

  return {
    sampleWidth: Math.max(1, Math.round(safeSourceWidth * ratio)),
    sampleHeight: Math.max(1, Math.round(safeSourceHeight * ratio)),
    targetFps: 24,
    smoothing: false,
  };
}

export function createPixelizerPlanForStream(
  sourceWidth: number,
  sourceHeight: number,
  settings: PixelTvStreamSettings,
): PixelizerPlan {
  return {
    sourceWidth,
    sourceHeight,
    sampleWidth: settings.sampleWidth,
    sampleHeight: settings.sampleHeight,
    smoothing: settings.smoothing,
  };
}

export function createPixelTvPhotoCapturePlan(): PixelTvPhotoCapturePlan {
  return {
    width: 640,
    height: 360,
    tvFrame: { x: 44, y: 70, width: 364, height: 232 },
    tvScreen: { x: 70, y: 94, width: 312, height: 176 },
    managerSprite: { x: 418, y: 118, width: 160, height: 160 },
    caption: { x: 44, y: 314, width: 534, height: 24 },
    smoothing: false,
  };
}

export function createPixelTvPhotoFileName(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");
  const second = date.getSeconds().toString().padStart(2, "0");
  return `pixel-tv-photo-${year}${month}${day}-${hour}${minute}${second}.png`;
}

export function transformPixelTvSamplePixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const source = new Uint8ClampedArray(pixels);
  const result = new Uint8ClampedArray(pixels.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = source[index + 3];
      const edge = getPixelEdgeStrength(source, width, height, x, y);
      const edgeShade = edge > 48 ? 0.62 : 1;
      const tone = clampColor(getPixelLuma(source, width, x, y) * edgeShade);

      const warmedTone = applySubtlePixelTvWarmTone(tone);
      result[index] = warmedTone.red;
      result[index + 1] = warmedTone.green;
      result[index + 2] = warmedTone.blue;
      result[index + 3] = alpha;
    }
  }

  return result;
}

function getPixelEdgeStrength(pixels: Uint8ClampedArray, width: number, height: number, x: number, y: number): number {
  const current = getPixelLuma(pixels, width, x, y);
  const right = getPixelLuma(pixels, width, Math.min(width - 1, x + 1), y);
  const down = getPixelLuma(pixels, width, x, Math.min(height - 1, y + 1));
  return Math.max(Math.abs(current - right), Math.abs(current - down));
}

function getPixelLuma(pixels: Uint8ClampedArray, width: number, x: number, y: number): number {
  const index = (y * width + x) * 4;
  return pixels[index] * 0.299 + pixels[index + 1] * 0.587 + pixels[index + 2] * 0.114;
}

function clampColor(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function applySubtlePixelTvWarmTone(tone: number) {
  return {
    red: clampColor(tone * 1.04),
    green: clampColor(tone),
    blue: clampColor(tone * 0.95),
  };
}

export function canPixelizeSource(width: number, height: number): boolean {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
}

export function getPixelizerPreviewSize(plan: PixelizerPlan, frame: PixelizerFrameSize): PixelizerFrameSize {
  const sourceWidth = Math.max(1, plan.sourceWidth);
  const sourceHeight = Math.max(1, plan.sourceHeight);
  const frameWidth = Math.max(1, frame.width);
  const frameHeight = Math.max(1, frame.height);
  const ratio = Math.min(frameWidth / sourceWidth, frameHeight / sourceHeight);

  return {
    width: Math.max(1, Math.round(sourceWidth * ratio)),
    height: Math.max(1, Math.round(sourceHeight * ratio)),
  };
}

export function getPixelizerCoverSize(plan: PixelizerPlan, frame: PixelizerFrameSize): PixelizerFrameSize {
  const sourceWidth = Math.max(1, plan.sourceWidth);
  const sourceHeight = Math.max(1, plan.sourceHeight);
  const frameWidth = Math.max(1, frame.width);
  const frameHeight = Math.max(1, frame.height);
  const ratio = Math.max(frameWidth / sourceWidth, frameHeight / sourceHeight);

  return {
    width: Math.max(1, Math.round(sourceWidth * ratio)),
    height: Math.max(1, Math.round(sourceHeight * ratio)),
  };
}
