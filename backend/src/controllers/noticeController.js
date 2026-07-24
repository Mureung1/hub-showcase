import database from "../config/database.js";
import { PDFParse } from "pdf-parse";
import { readFile, unlink } from "fs/promises";

// 공지 등록 함수
export function createNotice(req, res) {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({
      success: false,
      message: "제목과 본문을 모두 입력해주세요.",
    });
  }

  const insertNotice = database.prepare(`
    INSERT INTO notices (title, content)
    VALUES (?, ?)
  `);

  const result = insertNotice.run(title, content);

  const savedNotice = database
    .prepare(`
      SELECT
        id,
        title,
        content,
        created_at AS createdAt
      FROM notices
      WHERE id = ?
    `)
    .get(result.lastInsertRowid);

  return res.status(201).json({
    success: true,
    message: "공지 저장 성공",
    data: savedNotice,
  });
}

// 공지 조회 함수
export function getNotices(req, res) {
  const notices = database
    .prepare(`
      SELECT
        id,
        title,
        content,
        created_at AS createdAt
      FROM notices
      ORDER BY id DESC
    `)
    .all();

  return res.json({
    success: true,
    data: notices,
  });
}

// PDF 업로드 및 텍스트 추출 함수
export async function uploadPDF(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "파일을 선택해주세요.",
    });
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  if (req.file.size > MAX_FILE_SIZE) {
    return res.status(400).json({
      success: false,
      message: "파일 크기가 10MB를 초과했습니다.",
    });
  }

  if (req.file.mimetype !== "application/pdf") {
    return res.status(400).json({
      success: false,
      message: "PDF 파일만 업로드 가능합니다.",
    });
  }

  const filePath = req.file.path;
  let extractedText = "";
  let parser = null;

  try {
    // PDF 파일을 Buffer로 읽기
    const pdfBuffer = await readFile(filePath);

    // pdf-parse 2.4.5: PDFParse named export 사용
    parser = new PDFParse({ data: pdfBuffer });
    const textResult = await parser.getText();
    extractedText = (textResult.text || "").trim();

    // 텍스트가 너무 짧은 경우 (100자 이하)
    const MIN_TEXT_LENGTH = 100;
    const isScannedOrEmpty = extractedText.length < MIN_TEXT_LENGTH;

    return res.status(201).json({
      success: true,
      message: isScannedOrEmpty
        ? "스캔된 PDF이거나 텍스트를 읽을 수 없는 문서입니다."
        : "PDF 텍스트 추출 성공",
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
        extractedText: extractedText,
        isScannedOrEmpty: isScannedOrEmpty,
      },
    });
  } catch (error) {
    // 파일이 손상되었거나 암호가 걸린 경우
    console.error("PDF 파싱 오류:", error.message);
    let errorMessage = "PDF를 읽을 수 없습니다.";

    if (
      error.message.includes("Invalid PDF") ||
      error.message.includes("not a PDF") ||
      error.message.includes("Unexpected token")
    ) {
      errorMessage = "손상된 PDF 파일입니다. 다른 파일을 시도해주세요.";
    } else if (error.message.includes("password")) {
      errorMessage = "암호가 걸린 PDF입니다. 암호를 제거 후 시도해주세요.";
    } else {
      errorMessage =
        "PDF 처리 중 오류가 발생했습니다. 다른 파일을 시도해주세요.";
    }

    return res.status(400).json({
      success: false,
      message: errorMessage,
    });
  } finally {
    // parser 정리
    if (parser) {
      try {
        await parser.destroy();
      } catch (destroyError) {
        console.error(`PDF parser 정리 실패:`, destroyError.message);
      }
    }

    // 임시 PDF 파일 삭제
    try {
      await unlink(filePath);
    } catch (deleteError) {
      console.error(
        `임시 PDF 파일 삭제 실패: ${filePath}`,
        deleteError.message
      );
    }
  }
}