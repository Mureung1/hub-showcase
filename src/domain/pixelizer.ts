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
