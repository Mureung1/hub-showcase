import "dotenv/config";
import { analyzePDF } from "./src/services/analysisService.js";
import fs from "fs";
import path from "path";

async function test() {
  console.log("PDF 분석 테스트 시작...\n");

  const uploadsDir = "./uploads";
  const pdfFiles = fs
    .readdirSync(uploadsDir)
    .filter((file) => file.endsWith(".pdf"));

  if (pdfFiles.length === 0) {
    console.log("❌ 테스트할 PDF 파일이 없습니다");
    process.exit(1);
  }

  console.log(`발견된 PDF 파일: ${pdfFiles.length}개\n`);

  for (const pdfFile of pdfFiles) {
    const filePath = path.join(uploadsDir, pdfFile);
    console.log(`📄 파일: ${pdfFile}`);
    console.log("분석 중...\n");

    try {
      const result = await analyzePDF(filePath);

      console.log("✅ 분석 완료!\n");
      console.log("결과:");
      console.log(JSON.stringify(result, null, 2));
      console.log("\n" + "=".repeat(80) + "\n");
    } catch (error) {
      console.error("❌ 오류 발생:");
      console.error(error.message);
      console.log("\n" + "=".repeat(80) + "\n");
    }
  }
}

test();
