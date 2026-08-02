import jschardet from 'jschardet';
import iconv from 'iconv-lite';
import { AppError } from '../../utils/errors.js';

// v1은 텍스트 기반 파일만 검사한다. 오피스 바이너리(xlsx/docx)·이미지(OCR)는 확장 과제.
// 확장자 기준으로 화이트리스트를 두는 이유: MIME은 브라우저마다 제각각이고(.env는 빈 문자열,
// .log는 application/octet-stream 등) 위조도 쉬워서 신뢰하기 어렵다.
const TEXT_EXTENSIONS = new Set([
  // 문서·데이터·설정
  'txt', 'csv', 'tsv', 'log', 'md', 'json', 'yaml', 'yml', 'xml', 'html', 'css',
  'scss', 'less', 'env', 'ini', 'conf', 'cfg', 'toml', 'properties', 'gradle',
  'gitignore', 'dockerignore', 'editorconfig',
  // 소스코드
  'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'kt', 'kts', 'go', 'rb', 'php', 'rs',
  'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'cs', 'swift', 'scala', 'r', 'lua', 'dart',
  'pl', 'pm', 'groovy', 'vue', 'svelte', 'sql', 'sh', 'bash', 'zsh', 'bat', 'ps1',
]);

// 확장자가 없는 텍스트 파일들(파일명 자체로 식별). 소문자로 비교한다.
const TEXT_FILENAMES = new Set([
  'dockerfile', 'makefile', 'rakefile', 'gemfile', 'procfile', 'jenkinsfile',
]);

export const MAX_FILE_BYTES = Number(process.env.FILE_MAX_BYTES) || 1024 * 1024; // 1MB
export const MAX_FILES = Number(process.env.FILE_MAX_COUNT) || 5;

function extname(name) {
  const dot = name.lastIndexOf('.');
  // ".env"처럼 점으로 시작하는 파일은 확장자 자체를 이름으로 본다.
  if (dot <= 0) return name.startsWith('.') ? name.slice(1).toLowerCase() : '';
  return name.slice(dot + 1).toLowerCase();
}

// 한국에서 엑셀로 뽑은 CSV 등은 UTF-8이 아니라 CP949(EUC-KR)인 경우가 많다.
// 그냥 UTF-8로 읽으면 한글이 깨져 정규식이 아무것도 못 잡으므로(유출 파일을 통과시키는
// 조용한 실패), 인코딩을 감지해 UTF-8로 변환한 뒤 검사한다.
function decodeBuffer(buffer) {
  const detected = jschardet.detect(buffer);
  const encoding = detected?.encoding || 'UTF-8';
  const normalized = encoding.toUpperCase();

  if (normalized === 'UTF-8' || normalized === 'ASCII') {
    return buffer.toString('utf-8');
  }
  if (iconv.encodingExists(encoding)) {
    return iconv.decode(buffer, encoding);
  }
  // 감지 실패 시 UTF-8로 폴백 (완전 깨짐보단 낫다)
  return buffer.toString('utf-8');
}

// multer 파일 하나 -> { name, text }. 검사 대상이 아닌 파일은 AppError로 거른다.
export function extractTextFromFile(file) {
  const ext = extname(file.originalname);
  const supported = TEXT_EXTENSIONS.has(ext) || TEXT_FILENAMES.has(file.originalname.toLowerCase());
  if (!supported) {
    throw new AppError(
      415,
      'unsupported_file_type',
      `지원하지 않는 파일 형식입니다: ${file.originalname} (현재는 텍스트 파일만 검사합니다)`
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new AppError(
      413,
      'file_too_large',
      `파일이 너무 큽니다: ${file.originalname} (최대 ${Math.floor(MAX_FILE_BYTES / 1024)}KB)`
    );
  }
  return { name: file.originalname, text: decodeBuffer(file.buffer) };
}
