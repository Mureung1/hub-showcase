#!/usr/bin/env node

import {
  cpSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const docsSource = join(repositoryRoot, "docs");
const outputRoot = join(repositoryRoot, "dist", "docs-site");
const docsOutput = join(outputRoot, "docs");

function assertExpectedOutputPath(target) {
  const expected = resolve(repositoryRoot, "dist", "docs-site");
  if (resolve(target) !== expected) {
    throw new Error(`Refusing to clean unexpected output path: ${target}`);
  }
}

function assertNoSymbolicLinks(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    const relativePath = relative(repositoryRoot, entryPath);

    if (entry.isSymbolicLink() || lstatSync(entryPath).isSymbolicLink()) {
      throw new Error(`Documentation source contains a symbolic link: ${relativePath}`);
    }

    if (entry.isDirectory()) {
      assertNoSymbolicLinks(entryPath);
    }
  }
}

if (!lstatSync(docsSource).isDirectory()) {
  throw new Error(`Documentation source is not a directory: ${docsSource}`);
}

assertExpectedOutputPath(outputRoot);
assertNoSymbolicLinks(docsSource);

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });
cpSync(docsSource, docsOutput, {
  recursive: true,
  dereference: false,
  errorOnExist: true,
  force: false,
});

const docsHome = "./docs/wiki/doc-viewer.html?doc=Home.md";
const indexHtml = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="0; url=${docsHome}" />
    <title>LocalTwin Documentation</title>
  </head>
  <body>
    <p><a href="${docsHome}">LocalTwin 문서 홈으로 이동</a></p>
  </body>
</html>
`;

writeFileSync(join(outputRoot, "index.html"), indexHtml, "utf8");

console.log(`Documentation artifact created: ${relative(repositoryRoot, outputRoot)}`);
