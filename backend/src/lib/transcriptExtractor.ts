import path from 'path';

// 인터뷰 전사문 파일에서 plain text를 추출한다.
// 현재는 .txt/.md만 지원하며, PDF/DOCX/XLSX는 아래 switch에 case를 추가해 확장한다.
export const SUPPORTED_TRANSCRIPT_EXTENSIONS = ['.txt', '.md'];

export function extractText(originalName: string, buffer: Buffer): string {
  const ext = path.extname(originalName).toLowerCase();

  switch (ext) {
    case '.txt':
    case '.md':
      return buffer.toString('utf-8');
    // 이후 확장 예정:
    // case '.pdf': return extractFromPdf(buffer);      // pdf-parse
    // case '.docx': return extractFromDocx(buffer);    // mammoth
    // case '.xlsx': return extractFromXlsx(buffer);    // SheetJS
    default:
      throw new Error(`지원하지 않는 파일 형식입니다: ${ext || '(확장자 없음)'}`);
  }
}
