const express = require('express');
const supabase = require('../db/db');

const router = express.Router();

// Authorization: Bearer <access_token> 헤더를 검증해서 req.user에 로그인 사용자 정보를 채운다.
async function requireUser(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: '로그인이 필요합니다.' });
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ error: '유효하지 않은 세션입니다. 다시 로그인해주세요.' });
  }
  req.user = data.user;
  next();
}

// POST /api/timetables { year, semester, label, lectureIds }
// 사용자당 (year, semester) 하나의 확정 시간표만 유지한다 (다시 선택하면 덮어씀).
router.post('/', requireUser, async (req, res) => {
  const { year, semester, label, lectureIds } = req.body;

  if (!year || !semester || !label || !Array.isArray(lectureIds) || lectureIds.length === 0) {
    return res.status(400).json({ error: 'year, semester, label, lectureIds는 필수입니다.' });
  }

  const { data: timetable, error } = await supabase
    .from('timetable')
    .upsert(
      { user_id: req.user.id, year, semester, label },
      { onConflict: 'user_id,year,semester' }
    )
    .select('id')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  await supabase.from('timetable_lecture').delete().eq('timetable_id', timetable.id);
  const rows = lectureIds.map((lectureId) => ({ timetable_id: timetable.id, lecture_id: lectureId }));
  const { error: linkError } = await supabase.from('timetable_lecture').insert(rows);
  if (linkError) {
    return res.status(500).json({ error: linkError.message });
  }

  res.json({ id: timetable.id });
});

// GET /api/timetables/current?year=2026&semester=2026-2
router.get('/current', requireUser, async (req, res) => {
  const { year, semester } = req.query;

  if (!year || !semester) {
    return res.status(400).json({ error: 'year, semester는 필수 쿼리 파라미터입니다.' });
  }

  const { data: timetable, error } = await supabase
    .from('timetable')
    .select('id, label')
    .eq('user_id', req.user.id)
    .eq('year', year)
    .eq('semester', semester)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!timetable) {
    return res.json(null);
  }

  const { data: links, error: linksError } = await supabase
    .from('timetable_lecture')
    .select('lecture(*, lecture_time(day, start_time, end_time))')
    .eq('timetable_id', timetable.id);

  if (linksError) {
    return res.status(500).json({ error: linksError.message });
  }

  const lectures = links.map(({ lecture }) => ({
    id: lecture.id,
    name: lecture.name,
    professor: lecture.professor,
    credit: lecture.credit,
    category: lecture.category,
    department: lecture.department,
    required: lecture.required,
    times: lecture.lecture_time.map((t) => ({ day: t.day, start: t.start_time, end: t.end_time })),
  }));

  res.json({ label: timetable.label, lectures });
});

module.exports = router;
