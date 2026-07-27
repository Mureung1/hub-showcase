const express = require('express');
const createRequireUser = require('../middleware/requireUser');

// supabase 클라이언트를 직접 require하지 않고 인자로 받는다.
// (테스트에서 mock 클라이언트를 그대로 주입할 수 있도록 하기 위함 — db.js를 통째로
// require('../db/db') 하면 테스트 환경에서 module mock이 잘 걸리지 않는 문제가 있었음)
module.exports = function createTimetablesRouter(supabase) {
  const router = express.Router();
  const requireUser = createRequireUser(supabase);

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

  // POST /api/timetables/share { year, semester }
  // 확정된(저장된) 시간표를 선배 시간표 공유 목록에 노출시킨다 (is_shared = true).
  router.post('/share', requireUser, async (req, res) => {
    const { year, semester } = req.body;

    if (!year || !semester) {
      return res.status(400).json({ error: 'year, semester는 필수입니다.' });
    }

    const { data: timetable, error } = await supabase
      .from('timetable')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('year', year)
      .eq('semester', semester)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    if (!timetable) {
      return res.status(404).json({ error: '공유할 시간표가 없습니다. 먼저 시간표를 확정해주세요.' });
    }

    const { error: updateError } = await supabase
      .from('timetable')
      .update({ is_shared: true })
      .eq('id', timetable.id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    res.json({ id: timetable.id });
  });

  // POST /api/timetables/:id/recommend
  // 같은 사용자가 같은 시간표를 중복 추천하지 못하도록 timetable_recommend에
  // (timetable_id, user_id) unique 제약을 걸어두고, insert 실패(23505)로 중복을 판별한다.
  router.post('/:id/recommend', requireUser, async (req, res) => {
    const { id } = req.params;

    const { error: insertError } = await supabase
      .from('timetable_recommend')
      .insert({ timetable_id: id, user_id: req.user.id });

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(409).json({ error: '이미 추천한 시간표입니다.' });
      }
      return res.status(500).json({ error: insertError.message });
    }

    const { count, error: countError } = await supabase
      .from('timetable_recommend')
      .select('*', { count: 'exact', head: true })
      .eq('timetable_id', id);

    if (countError) {
      return res.status(500).json({ error: countError.message });
    }

    res.json({ recommendCount: count });
  });

  // GET /api/timetables/shared
  // is_shared=true인 시간표를 강의/추천 정보와 함께 목록으로 반환한다 (홈 화면 선배 시간표 목록용).
  router.get('/shared', requireUser, async (req, res) => {
    const { data, error } = await supabase
      .from('timetable')
      .select(
        'id, label, timetable_lecture(lecture(*, lecture_time(day, start_time, end_time))), timetable_recommend(user_id)'
      )
      .eq('is_shared', true);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const shared = data.map((row) => ({
      id: row.id,
      label: row.label,
      lectures: row.timetable_lecture.map(({ lecture }) => ({
        id: lecture.id,
        name: lecture.name,
        professor: lecture.professor,
        credit: lecture.credit,
        category: lecture.category,
        department: lecture.department,
        required: lecture.required,
        times: lecture.lecture_time.map((t) => ({ day: t.day, start: t.start_time, end: t.end_time })),
      })),
      recommendCount: row.timetable_recommend.length,
      recommendedByMe: row.timetable_recommend.some((r) => r.user_id === req.user.id),
    }));

    res.json(shared);
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

  return router;
};
