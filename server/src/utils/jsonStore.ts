import { promises as fs } from "fs";
import path from "path";

const locks = new Map<string, Promise<unknown>>();

function withLock<T>(filePath: string, task: () => Promise<T>): Promise<T> {
  const key = path.resolve(filePath);
  const previous = locks.get(key) ?? Promise.resolve();
  const next = previous.then(task, task);
  locks.set(
    key,
    next.catch(() => undefined)
  );
  return next;
}

export async function readJson<T>(filePath: string): Promise<T> {
  return withLock(filePath, async () => {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  });
}

export async function writeJson<T>(filePath: string, data: T): Promise<void> {
  return withLock(filePath, async () => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  });
}
