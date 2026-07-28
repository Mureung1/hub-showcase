const express = require('express');
const supabase = require('../services/supabase');
const auth = require('../middleware/auth');
const { generateWeeklyReport } = require('../services/openai');

const router = express.Router();

// clusters.batch_date와 같은 기준(서버 UTC 날짜)으로 이번 주 월요일을 계산 — scripts/cluster.js의 batchDate 계산과 동일한 방식(UTC)
function currentWeekStartDate() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=일 ~ 6=토
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diffToMonday);
  return monday.toISOString().slice(0, 10);
}

router.get('/weekly', auth, async (req, res) => {
  const weekStartDate = currentWeekStartDate();

  const { data: report, error } = await supabase
    .from('weekly_reports')
    .select('week_start_date, content')
    .eq('user_id', req.user.id)
    .eq('week_start_date', weekStartDate)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  if (!report) {
    return res.status(404).json({ error: 'report_not_found' });
  }

  res.json({ weekStartDate: report.week_start_date, content: report.content });
});

router.post('/weekly/generate', auth, async (req, res) => {
  const weekStartDate = currentWeekStartDate();

  const { data: clusters, error: clustersError } = await supabase
    .from('clusters')
    .select('id, title, description')
    .eq('user_id', req.user.id)
    .gte('batch_date', weekStartDate);

  if (clustersError) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  if (clusters.length === 0) {
    return res.status(404).json({ error: 'not_found' });
  }

  const content = await generateWeeklyReport(clusters);

  const { data: report, error: upsertError } = await supabase
    .from('weekly_reports')
    .upsert(
      { user_id: req.user.id, week_start_date: weekStartDate, content },
      { onConflict: 'user_id,week_start_date' }
    )
    .select('id, week_start_date, content')
    .single();

  if (upsertError || !report) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  // report_clusters엔 unique 제약이 없어서 upsert 대신 delete 후 insert로 재생성 시 중복을 막음
  await supabase.from('report_clusters').delete().eq('report_id', report.id);
  const links = clusters.map((c) => ({ report_id: report.id, cluster_id: c.id }));
  await supabase.from('report_clusters').insert(links);

  res.json({ weekStartDate: report.week_start_date, content: report.content });
});

module.exports = router;
