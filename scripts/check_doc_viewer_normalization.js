#!/usr/bin/env node
const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync("docs/wiki/doc-viewer.html", "utf8");
const start = html.indexOf("function safeDecode");
const end = html.indexOf("function escapeHtml");

if (start === -1 || end === -1 || end <= start) {
  throw new Error("normalizeDoc helpers not found in docs/wiki/doc-viewer.html");
}

const context = {};
vm.createContext(context);
vm.runInContext(html.slice(start, end), context);

const cases = new Map([
  ["Home.md", "Home.md"],
  ["doc-viewer.html?doc=Home.md", "Home.md"],
  ["doc-viewer.html%3Fdoc%3DHome.md", "Home.md"],
  ["doc-viewer.html?doc=doc-viewer.html%3Fdoc%3DHome.md", "Home.md"],
  ["../features/3d-congestion-explorer.md", "../features/3d-congestion-explorer.md"],
  ["../prototypes/core-market-analysis-prototype.html", "Home.md"],
]);

for (const [input, expected] of cases) {
  const actual = context.normalizeDoc(input);
  if (actual !== expected) {
    throw new Error(`${input} -> ${actual}, expected ${expected}`);
  }
}

console.log("Doc viewer URL normalization check passed.");
