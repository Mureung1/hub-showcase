import { createServer } from "../../server/index.js";

type RuntimeEnv = Record<string, string | undefined>;

const runtimeEnv =
  (globalThis as typeof globalThis & { process?: { env?: RuntimeEnv } }).process?.env ?? {};

const server = createServer({
  get: (name) => runtimeEnv[name],
});

export default {
  fetch(request: Request) {
    return server(request);
  },
};
