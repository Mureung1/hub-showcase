const express = require('express');

// supabase 클라이언트를 직접 require하지 않고 인자로 받는다 (timetables.js와 동일한 이유).
module.exports = function createLecturesRouter(supabase) {
  const router = express.Router();

  // GET /api/lectures?year=2026&semester=2026-2&department=컴퓨터학부&category=교양
  router.get('/', async (req, res) => {
    const { year, semester, department, category } = req.query;

    if (!year || !semester) {
      return res.status(400).json({ error: 'year, semester는 필수 쿼리 파라미터입니다.' });
    }

    let query = supabase
      .from('lecture')
      .select('*, lecture_time(day, start_time, end_time)')
      .eq('year', year)
      .eq('semester', semester);

    if (department) query = query.eq('department', department);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const lectures = data.map((row) => ({
      id: row.id,
      year: row.year,
      semester: row.semester,
      name: row.name,
      professor: row.professor,
      credit: row.credit,
      category: row.category,
      department: row.department,
      required: row.required,
      prerequisite: row.prerequisite,
      pair_group: row.pair_group,
      tier: row.tier,
      grade: row.grade,
      times: row.lecture_time.map((t) => ({
        day: t.day,
        start: t.start_time,
        end: t.end_time,
      })),
    }));

    res.json(lectures);
  });

  return router;
};
