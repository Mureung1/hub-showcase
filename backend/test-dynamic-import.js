async function test() {
  const pdfModule = await import("pdf-parse");
  console.log("Dynamic import 'pdf-parse':");
  console.log("Type:", typeof pdfModule);
  console.log("Keys:", Object.keys(pdfModule));
  console.log("default:", pdfModule.default);
  console.log("Full:", pdfModule);
}

test();
