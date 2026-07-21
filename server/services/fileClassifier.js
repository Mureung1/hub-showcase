/**
 * 05_CODE_SCANNER_SCORER.md 5장 파일 필터링 규칙.
 * Git Trees API(recursive=1) 결과를 3가지로 분류한다:
 *   - Candidate File: 인터뷰 질문 대상 소스 코드 (MVP는 JS/TS만)
 *   - Context File: README/설정 파일, 인터뷰 대상은 아니지만 별도 파이프라인에서 재사용
 *   - 완전 제외: 그 외 전부 (node_modules/dist/build/.env, 바이너리 등)
 */

const CANDIDATE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
const OTHER_LANGUAGE_EXTENSIONS = ['.py', '.java'];

const CONTEXT_BASENAMES = new Set([
  'readme.md',
  'package.json',
  'requirements.txt',
  'pom.xml',
  'build.gradle',
  'docker-compose.yml',
  'dockerfile',
]);

const EXCLUDED_PREFIX_PATTERN = /(^|\/)(node_modules|dist|build)\//;
const EXCLUDED_ENV_PATTERN = /(^|\/)\.env(\.|$)/;

function hasExtension(path, extensions) {
  const lower = path.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

function isExplicitlyExcludedPath(path) {
  return EXCLUDED_PREFIX_PATTERN.test(path) || EXCLUDED_ENV_PATTERN.test(path);
}

function basename(path) {
  const segments = path.split('/');
  return segments[segments.length - 1].toLowerCase();
}

export function classifyTree(treeEntries) {
  const blobs = treeEntries.filter((entry) => entry.type === 'blob');
  const totalFileCount = blobs.length;

  const candidateFilePaths = [];
  const contextFilePaths = [];
  let excludedFileCount = 0;
  let hasOtherLanguageSource = false;

  for (const blob of blobs) {
    const path = blob.path;

    if (isExplicitlyExcludedPath(path)) {
      excludedFileCount += 1;
      continue;
    }

    if (hasExtension(path, CANDIDATE_EXTENSIONS)) {
      candidateFilePaths.push({ path, sha: blob.sha });
      continue;
    }

    if (CONTEXT_BASENAMES.has(basename(path))) {
      contextFilePaths.push({ path, sha: blob.sha });
      continue;
    }

    if (hasExtension(path, OTHER_LANGUAGE_EXTENSIONS)) {
      hasOtherLanguageSource = true;
    }

    excludedFileCount += 1;
  }

  return {
    totalFileCount,
    candidateFilePaths,
    contextFilePaths,
    excludedFileCount,
    hasOtherLanguageSource,
  };
}
