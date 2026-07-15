import { cp, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const appDirectory = resolve(scriptDirectory, "..");
const publicDirectory = resolve(appDirectory, "public");
const modelDirectory = resolve(publicDirectory, "models");
const wasmSource = resolve(appDirectory, "node_modules", "@mediapipe", "tasks-vision", "wasm");

const assets = [
  {
    url: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
    output: resolve(modelDirectory, "pose_landmarker_lite.task"),
  },
];

async function download({ url, output }) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download ${url}: ${response.status} ${response.statusText}`);
  }

  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, Buffer.from(await response.arrayBuffer()));
  console.log(`Prepared ${output.replace(appDirectory, ".")}`);
}

await Promise.all(assets.map(download));
await mkdir(resolve(publicDirectory, "wasm"), { recursive: true });
await cp(wasmSource, resolve(publicDirectory, "wasm"), { recursive: true, force: true });
console.log("Prepared local MediaPipe WASM files.");
