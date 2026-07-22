import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabaseClient';
import { getFullProjectReport } from '../lib/projectReport';

const router = Router();

// GET /api/share/:token — 공유 링크 읽기 전용 조회.
// 이 라우터에는 GET만 존재한다. PATCH/POST 계열을 여기 절대 추가하지 않는 것 자체가
// Task 17("공유 URL 접근 범위 제한")의 구현이다 — 별도 차단 로직이 필요 없는 구조.
router.get('/:token', async (req: Request<{ token: string }>, res: Response) => {
  const { token } = req.params;

  const { data: project, error } = await supabase
    .from('projects')
    .select('id')
    .eq('share_token', token)
    .single();

  if (error || !project) {
    return res.status(404).json({ error: '공유 링크를 찾을 수 없습니다.' });
  }

  let report;
  try {
    report = await getFullProjectReport(project.id);
  } catch (err) {
    console.error('Failed to build shared report:', err);
    const message = err instanceof Error ? err.message : '리포트 조회에 실패했습니다.';
    return res.status(500).json({ error: message });
  }

  if (!report) {
    return res.status(404).json({ error: '공유 링크를 찾을 수 없습니다.' });
  }

  return res.status(200).json(report);
});

export default router;
