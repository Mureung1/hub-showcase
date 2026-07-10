#!/usr/bin/env node
// Copies the docs/ folder into the Vite build output so it's served at /docs/
import { cpSync } from "fs";
cpSync("docs", "apps/web/dist/docs", { recursive: true });
console.log("docs/ copied to apps/web/dist/docs/");
