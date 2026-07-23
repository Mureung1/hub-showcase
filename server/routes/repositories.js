import { Router } from 'express';
import { repositories, createId } from '../state/store.js';
import { buildFixedContext } from '../services/stubData.js';
import { ok, fail } from '../services/respond.js';
import { isAllowedGithubUrl } from '../utils/validateRepositoryUrl.js';
import { parseGithubUrl } from '../utils/parseGithubUrl.js';
import { fetchRepoMeta, fetchTree } from '../services/githubClient.js';
import { classifyTree } from '../services/fileClassifier.js';
import { selectCandidates } from '../services/candidateSelector.js';
import { MAX_FILE_COUNT, CANDIDATE_COUNT } from '../config.js';

/**
 * 05_CODE_SCANNER_SCORER.md 4장 Pipeline 중 "파일 목록 수집(Git Trees API)",
 * "확장자/경로 기반 제외 분류", "후보 파일 선정(임시: 앞쪽 N개)"을 실제로 수행한다.
 *
 * 진짜 가중치 스코어링(6장)과 정규식 기반 청킹(7장), README/tech_stack 파싱은
 * 아직 다음 단계다 — context(project_overview/tech_stack)는 계속 stubData.js를 쓴다.
 */

const router = Router();

router.post('/repositories', async (req, res) => {
  const { repository_url } = req.body || {};

  if (!repository_url || typeof repository_url !== 'string') {
    return fail(res, 400, 'INVALID_URL', 'repository_url을 입력해주세요.');
  }

  if (!isAllowedGithubUrl(repository_url)) {
    return fail(res, 400, 'INVALID_HOST', 'repository_url은 https://github.com/... 형태여야 합니다.');
  }

  const parsedRepo = parseGithubUrl(repository_url);
  if (!parsedRepo) {
    return fail(res, 400, 'INVALID_URL', 'repository_url에서 owner/repo를 확인할 수 없습니다.');
  }

  const meta = await fetchRepoMeta(parsedRepo.owner, parsedRepo.repo);
  if (!meta) {
    return fail(res, 404, 'REPOSITORY_NOT_FOUND', '저장소를 찾을 수 없습니다. URL을 다시 확인해주세요.');
  }

  const tree = await fetchTree(parsedRepo.owner, parsedRepo.repo, meta.defaultBranch);
  if (!tree) {
    return fail(res, 404, 'REPOSITORY_NOT_FOUND', '저장소를 찾을 수 없습니다. URL을 다시 확인해주세요.');
  }
  if (tree.truncated || tree.entries.length > MAX_FILE_COUNT) {
    return fail(res, 400, 'SCAN_TOO_LARGE', '레포가 너무 커서 분석할 수 없습니다. 더 작은 레포로 시도해주세요.');
  }

  const classified = classifyTree(tree.entries);

  if (classified.candidateFilePaths.length === 0) {
    if (classified.hasOtherLanguageSource) {
      return fail(res, 400, 'UNSUPPORTED_LANGUAGE', '현재는 JS/TS 프로젝트만 지원합니다. 다른 언어 지원은 준비 중입니다.');
    }
    return fail(res, 400, 'NO_SOURCE_FILES', '분석할 소스 코드를 찾지 못했습니다.');
  }

  const candidates = await selectCandidates(
    parsedRepo.owner,
    parsedRepo.repo,
    classified.candidateFilePaths,
    CANDIDATE_COUNT
  );
  if (candidates.length === 0) {
    return fail(res, 502, 'CONTENT_FETCH_FAILED', '후보 파일 코드를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.');
  }

  const repositoryId = createId('repo');
  repositories.set(repositoryId, {
    repositoryUrl: repository_url,
    defaultBranch: meta.defaultBranch,
    totalFileCount: classified.totalFileCount,
    candidateFilePaths: classified.candidateFilePaths,
    contextFilePaths: classified.contextFilePaths,
    lastScannedAt: new Date().toISOString(),
    candidates,
    // README/tech_stack 파싱은 다음 단계 (아직 stubData.js 고정값)
    context: buildFixedContext(),
  });

  // 실제 스캔은 비동기 Job이지만(07_API_SPEC.md), Trees API 1회 호출로 충분히 빨라 즉시 완료로 처리한다.
  ok(res, {
    repository_id: repositoryId,
    job_id: createId('job'),
    status: 'COMPLETED',
  });
});

router.get('/repositories/:repositoryId/candidates', (req, res) => {
  const repo = repositories.get(req.params.repositoryId);
  if (!repo) {
    return fail(res, 404, 'REPOSITORY_NOT_FOUND', '해당 repository_id를 찾을 수 없습니다.');
  }
  ok(res, { candidates: repo.candidates });
});

router.get('/repositories/:repositoryId/files', (req, res) => {
  const repo = repositories.get(req.params.repositoryId);
  if (!repo) {
    return fail(res, 404, 'REPOSITORY_NOT_FOUND', '해당 repository_id를 찾을 수 없습니다.');
  }
  ok(res, {
    default_branch: repo.defaultBranch,
    total_file_count: repo.totalFileCount,
    candidate_file_paths: repo.candidateFilePaths.map((f) => f.path),
    context_file_paths: repo.contextFilePaths.map((f) => f.path),
    excluded_file_count:
      repo.totalFileCount - repo.candidateFilePaths.length - repo.contextFilePaths.length,
  });
});

export default router;
