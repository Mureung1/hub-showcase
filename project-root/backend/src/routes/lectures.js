const express = require('express');
const createRequireUser = require('../middleware/requireUser');

// supabase 클라이언트를 직접 require하지 않고 인자로 받는다 (timetables.js와 동일한 이유).
module.exports = function createLecturesRouter(supabase) {
  const router = express.Router();
  const requireUser = createRequireUser(supabase);

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

    // 크라우드소싱으로 신고된 전공필수 과목명 집합(학과 기준)을 조회해서 required를 덮어쓴다.
    // 학교 API/수기 큐레이션이 놓친 과목을 사용자가 직접 채워 넣은 값이라, 재시딩 없이 바로 반영된다.
    const departments = [...new Set(data.map((row) => row.department))];
    let reportedNamesByDepartment = new Map();
    if (departments.length > 0) {
      const { data: reports, error: reportError } = await supabase
        .from('required_course_report')
        .select('department, course_name')
        .in('department', departments);

      if (reportError) {
        return res.status(500).json({ error: reportError.message });
      }

      reportedNamesByDepartment = reports.reduce((map, r) => {
        if (!map.has(r.department)) map.set(r.department, new Set());
        map.get(r.department).add(r.course_name);
        return map;
      }, new Map());
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
      required: row.required || Boolean(reportedNamesByDepartment.get(row.department)?.has(row.name)),
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

  // POST /api/lectures/required-report { department, courseName }
  // 로그인한 사용자가 "이 과목은 전공필수예요"라고 신고. 같은 (department, course_name) 신고는
  // DB unique 제약(23505)으로 막히는데, 이미 등록된 신고와 같은 뜻이므로 에러 대신 그냥 성공 처리한다.
  router.post('/required-report', requireUser, async (req, res) => {
    const { department, courseName } = req.body;

    if (!department || !courseName) {
      return res.status(400).json({ error: 'department, courseName은 필수입니다.' });
    }

    const { error } = await supabase
      .from('required_course_report')
      .insert({ department, course_name: courseName, user_id: req.user.id });

    if (error && error.code !== '23505') {
      return res.status(500).json({ error: error.message });
    }

    res.json({ ok: true });
  });

  return router;
};
