import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

console.log("pdf-parse 구조:");
console.log("Type:", typeof pdfParse);
console.log("Keys:", Object.keys(pdfParse));
console.log("Entries:", pdfParse);
