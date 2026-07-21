import path from "path";

export const DATA_DIR = path.resolve(__dirname, "../../../data");
export const ANALYZER_DIR = path.resolve(__dirname, "../../../tools/analyzer");

export function dataPath(...segments: string[]): string {
  return path.join(DATA_DIR, ...segments);
}
