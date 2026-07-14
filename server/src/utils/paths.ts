import path from "path";

export const DATA_DIR = path.resolve(__dirname, "../../../data");

export function dataPath(...segments: string[]): string {
  return path.join(DATA_DIR, ...segments);
}
