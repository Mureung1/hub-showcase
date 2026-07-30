import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, "client"), { recursive: true });
await mkdir(path.join(dist, "server"), { recursive: true });
await mkdir(path.join(dist, ".openai"), { recursive: true });

await cp(path.join(root, "client", "dist"), path.join(dist, "client"), {
  recursive: true,
});
await cp(
  path.join(root, "sites", "worker.mjs"),
  path.join(dist, "server", "index.js"),
);
await cp(
  path.join(root, ".openai", "hosting.json"),
  path.join(dist, ".openai", "hosting.json"),
);

console.log("[cv2pf] Sites bundle prepared in dist/");
