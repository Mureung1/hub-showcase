import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const dockerfile = readFileSync(resolve(process.cwd(), "Dockerfile"), "utf8");

test("Docker runtime image includes shared src modules used by Express", () => {
  assert.match(dockerfile, /^COPY src \.\/src$/m);
  assert.match(dockerfile, /^ENV SERVE_CLIENT=false$/m);
});
