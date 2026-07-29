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
