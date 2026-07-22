/**
 * 05_CODE_SCANNER_SCORER.md 5장 파일 필터링 규칙.
 * Git Trees API(recursive=1) 결과를 3가지로 분류한다:
 *   - Candidate File: 인터뷰 질문 대상 소스 코드 (MVP는 JS/TS만)
 *   - Context File: README/설정 파일, 인터뷰 대상은 아니지만 별도 파이프라인에서 재사용
 *   - 완전 제외: 그 외 전부 (node_modules/dist/build/.env, 바이너리 등)
 */

const CANDIDATE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
const OTHER_LANGUAGE_EXTENSIONS = ['.py', '.java'];

const CONTEXT_BASENAMES = new Set([ //Set의 .has(검색)이  .includes()보다 빠름
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

//목록 속 확장자인지 확인 (TF로 반환)
function hasExtension(path, extensions) { //들어온 문자열 = ext 비교할 대상 = extensions
  const lower = path.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

//제외 파일 여부 확인 (TF로 반환)
function isExplicitlyExcludedPath(path) {
  return EXCLUDED_PREFIX_PATTERN.test(path) || EXCLUDED_ENV_PATTERN.test(path);
}

//파일 이름 소문자
function basename(path) {
  const segments = path.split('/');
  return segments[segments.length - 1].toLowerCase(); //길이-1이 가장 마지막 요소임
}

export function classifyTree(treeEntries) {
  const blobs = treeEntries.filter((entry) => entry.type === 'blob'); //타입이 파일
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
      candidateFilePaths.push({ path, sha: blob.sha, size: blob.size });
      continue;
    }

    if (CONTEXT_BASENAMES.has(basename(path))) {
      contextFilePaths.push({ path, sha: blob.sha, size: blob.size });
      continue;
    }

    if (hasExtension(path, OTHER_LANGUAGE_EXTENSIONS)) {
      hasOtherLanguageSource = true;
    }

    excludedFileCount += 1;//그외 파일도 제외 파일로 함
  }

  return {
    totalFileCount,
    candidateFilePaths,
    contextFilePaths,
    excludedFileCount,
    hasOtherLanguageSource,
  };
}
