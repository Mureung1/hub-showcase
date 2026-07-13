import { Router } from 'express';
import { repositories, createId } from '../state/store.js';
import { buildFixedCandidateFile, buildFixedContext } from '../services/stubData.js';
import { ok, fail } from '../services/respond.js';

/**
 * Day 1 Walking Skeleton: 실제 GitHub 스캔 없이 고정 후보 파일 1개를 반환한다.
 * Day 3~6에서 이 라우트 내부만 Code Scanner & Scorer 실제 로직으로 교체한다
 * (05_CODE_SCANNER_SCORER.md 4장 Pipeline 참고). 응답 shape은 유지된다.
 */

const router = Router();

router.post('/repositories', (req, res) => {
  const { repository_url } = req.body || {};

  if (!repository_url || typeof repository_url !== 'string') {
    return fail(res, 400, 'INVALID_URL', 'repository_url을 입력해주세요.');
  }

  const repositoryId = createId('repo');
  repositories.set(repositoryId, {
    repositoryUrl: repository_url,
    candidates: [buildFixedCandidateFile()],
    context: buildFixedContext(),
  });

  // 실제 스캔은 비동기 Job이지만(07_API_SPEC.md), 스텁 단계에서는 즉시 완료로 처리한다.
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

export default router;
