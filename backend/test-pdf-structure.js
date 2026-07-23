import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfModule = require("pdf-parse");

console.log("require('pdf-parse') 구조:");
console.log("Type:", typeof pdfModule);
console.log("Keys:", Object.keys(pdfModule));
console.log("Full:", pdfModule);
