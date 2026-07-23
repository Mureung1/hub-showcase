// 전체 API 라우트. 규칙 두 가지:
//   1. 채점·대화 같은 AI 판단은 반드시 서버에서 한다. 클라이언트가 보낸 결과는 믿지 않는다.
//   2. AI 가 실패한 결과는 저장하지 않는다(503 으로 돌려보낸다). 통계가 오염되기 때문이다.

import { Router } from 'express';
import { randomUUID } from 'crypto';
import * as db from './db.js';
import { gradeAnswer, chatTutor, recommendQuestions } from './ai.js';

const router = Router();

const DEFAULT_CLASSROOM_NAME = '수학 1반';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ===== 공통 헬퍼 =====

// async 핸들러의 예외를 500으로 처리해주는 래퍼.
function wrap(handler) {
  return (req, res) => {
    handler(req, res).catch((err) => {
      console.error('[route error]', err.message);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    });
  };
}

// 모범답안을 뺀 질문. 학생 브라우저로 정답이 새어나가지 않도록.
function publicQuestion(question) {
  const { model_answer, ...rest } = question;
  return rest;
}

function trimmed(value) {
  return (value || '').trim();
}

// ===== Teacher =====
router.post('/teacher/create', wrap(async (req, res) => {
  const teacherId = randomUUID();
  await db.addTeacher(teacherId, req.body.name || 'Teacher');
  res.status(201).json({ id: teacherId, name: req.body.name });
}));

// 교사의 교실을 하나 확보한다. 이미 있으면 그대로 쓰고, 없을 때만 새로 만든다.
// 매 로그인마다 새 교실이 생기면 이전에 등록한 학생이 사라져 보이기 때문이다.
async function ensureClassroom(teacher) {
  const existingId = teacher.classrooms[0];
  if (existingId) {
    const classroom = await db.getClassroom(existingId);
    return {
      id: existingId,
      name: classroom ? classroom.name : DEFAULT_CLASSROOM_NAME
    };
  }

  const classroomId = randomUUID();
  await db.addClassroom(classroomId, DEFAULT_CLASSROOM_NAME, teacher.id);
  return { id: classroomId, name: DEFAULT_CLASSROOM_NAME };
}

// 교사 로그인: 같은 이름이면 기존 교사·교실을 재사용한다.
router.post('/teacher/login', wrap(async (req, res) => {
  const name = trimmed(req.body.name);
  if (!name) {
    return res.status(400).json({ error: '선생님 이름을 입력해주세요.' });
  }

  let teacher = await db.getTeacherByName(name);
  if (!teacher) {
    const teacherId = randomUUID();
    await db.addTeacher(teacherId, name);
    teacher = { id: teacherId, name, classrooms: [] };
  }

  const classroom = await ensureClassroom(teacher);

  res.json({
    id: teacher.id,
    name: teacher.name,
    classroom_id: classroom.id,
    classroom_name: classroom.name
  });
}));

router.get('/teacher/:teacherId', wrap(async (req, res) => {
  const teacher = await db.getTeacher(req.params.teacherId);
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

  const classrooms = await Promise.all(teacher.classrooms.map((id) => db.getClassroom(id)));
  res.json({ teacher, classrooms });
}));

// ===== Classroom =====
router.post('/classroom/create', wrap(async (req, res) => {
  const classroomId = randomUUID();
  await db.addClassroom(classroomId, req.body.name || 'Classroom', req.body.teacher_id);
  res.status(201).json({ id: classroomId, name: req.body.name });
}));

router.get('/classroom/:classroomId', wrap(async (req, res) => {
  const classroom = await db.getClassroom(req.params.classroomId);
  if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

  const students = await Promise.all(classroom.students.map((id) => db.getStudent(id)));
  const questions = await Promise.all(
    classroom.questions.map(async (id) => publicQuestion(await db.getQuestion(id)))
  );
  res.json({ classroom, students, questions });
}));

router.post('/classroom/:classroomId/add-student', wrap(async (req, res) => {
  const added = await db.addStudentToClassroom(req.params.classroomId, req.body.student_id);
  if (!added) return res.status(400).json({ error: 'Failed to add student' });
  res.json({ status: 'success' });
}));

router.get('/classroom/:classroomId/students', wrap(async (req, res) => {
  const students = await db.getStudentsByClassroom(req.params.classroomId);
  const withProgress = await Promise.all(
    students.map(async (student) => ({
      ...student,
      ...(await db.getStudentProgress(student.id))
    }))
  );
  res.json(withProgress);
}));

router.get('/classroom/:classroomId/questions', wrap(async (req, res) => {
  const questions = await db.getQuestionsByClassroom(req.params.classroomId);
  res.json(questions.map(publicQuestion));
}));

// ===== Student =====
router.post('/student/create', wrap(async (req, res) => {
  const studentId = randomUUID();
  await db.addStudent(studentId, req.body.name || 'Student', req.body.classroom_id);
  res.status(201).json({ id: studentId, name: req.body.name });
}));

// 학생 로그인: 자기 등록이 아니라, 선생님이 미리 등록해 둔 학생만 통과시킨다.
router.post('/student/login', wrap(async (req, res) => {
  const name = trimmed(req.body.name);
  const classroomId = trimmed(req.body.classroom_id);

  if (!name || !classroomId) {
    return res.status(400).json({ error: '이름과 교실 ID를 입력해주세요.' });
  }
  // 형식이 어긋난 ID 로는 조회조차 하지 않는다.
  if (!UUID_PATTERN.test(classroomId) || !(await db.getClassroom(classroomId))) {
    return res.status(404).json({ error: '존재하지 않는 교실 ID입니다.' });
  }

  const student = await db.getStudentByNameInClassroom(name, classroomId);
  if (!student) {
    return res.status(403).json({ error: '등록되지 않은 학생입니다. 선생님께 이름 등록을 요청하세요.' });
  }

  res.json({ id: student.id, name: student.name });
}));

router.get('/student/:studentId', wrap(async (req, res) => {
  const student = await db.getStudent(req.params.studentId);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const [answers, progress] = await Promise.all([
    db.getAnswersByStudent(req.params.studentId),
    db.getStudentProgress(req.params.studentId)
  ]);
  res.json({ student, answers, progress });
}));

router.delete('/student/:studentId', wrap(async (req, res) => {
  const student = await db.getStudent(req.params.studentId);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  await db.deleteStudent(req.params.studentId);
  res.json({ status: 'success' });
}));

router.get('/student/:studentId/answers', wrap(async (req, res) => {
  res.json(await db.getAnswersByStudent(req.params.studentId));
}));

// ===== Question =====
// 그래프 함수식을 안전하게 정규화해 저장용 문자열(JSON 배열)로 만든다.
const MAX_GRAPH_EXPRESSIONS = 3;

function normalizeGraphForStore(input) {
  const list = Array.isArray(input) ? input : [input];
  const expressions = list
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim())
    .slice(0, MAX_GRAPH_EXPRESSIONS);
  return expressions.length ? JSON.stringify(expressions) : '';
}

router.post('/question/create', wrap(async (req, res) => {
  const questionId = randomUUID();
  const subject = trimmed(req.body.subject);
  const unit = trimmed(req.body.unit);
  const graph = normalizeGraphForStore(req.body.graph);

  await db.addQuestion(
    questionId,
    req.body.text || '',
    req.body.classroom_id,
    req.body.model_answer || '',
    subject,
    unit,
    graph
  );
  res.status(201).json({ id: questionId, text: req.body.text, subject, unit, graph });
}));

// 과목·단원에 맞는 문제를 AI가 추천한다. 저장하지 않고 후보 목록만 돌려준다.
router.post('/question/recommend', wrap(async (req, res) => {
  const result = await recommendQuestions(trimmed(req.body.subject), trimmed(req.body.unit));
  if (result.error) {
    return res.status(503).json({ error: result.message });
  }
  res.json({ questions: result.questions });
}));

router.get('/question/:questionId', wrap(async (req, res) => {
  const question = await db.getQuestion(req.params.questionId);
  if (!question) return res.status(404).json({ error: 'Question not found' });

  const answers = await db.getAnswersByQuestion(req.params.questionId);
  res.json({ question, answers });
}));

router.delete('/question/:questionId', wrap(async (req, res) => {
  const question = await db.getQuestion(req.params.questionId);
  if (!question) return res.status(404).json({ error: 'Question not found' });

  await db.deleteQuestion(req.params.questionId);
  res.json({ status: 'success' });
}));

router.get('/question/:questionId/answers', wrap(async (req, res) => {
  res.json(await db.getAnswersByQuestion(req.params.questionId));
}));

// ===== Answer =====
router.post('/answer/submit', wrap(async (req, res) => {
  const { question_id, student_id, answer_text = '' } = req.body;

  const question = await db.getQuestion(question_id);
  if (!question) return res.status(404).json({ error: 'Question not found' });

  // 채점은 서버에서만. 클라이언트가 보낸 is_correct/feedback은 신뢰하지 않는다.
  const result = await gradeAnswer(question.text, question.model_answer || '', answer_text);

  // 채점이 실패한 답변은 기록하지 않는다. 통계가 오염된다.
  if (result.error) {
    return res.status(503).json({ error: result.feedback });
  }

  const answerId = randomUUID();
  await db.addAnswer(answerId, question_id, student_id, answer_text, result.is_correct, result.feedback);
  res.status(201).json({
    id: answerId,
    is_correct: result.is_correct,
    feedback: result.feedback
  });
}));

// ===== Chat (대화형 학습) =====
router.get('/student/:studentId/question/:questionId/messages', wrap(async (req, res) => {
  const messages = await db.getMessages(req.params.studentId, req.params.questionId);
  res.json(messages.map(({ role, content, created_at }) => ({ role, content, created_at })));
}));

router.post('/chat', wrap(async (req, res) => {
  const { student_id, question_id, message } = req.body;

  if (!trimmed(message)) {
    return res.status(400).json({ error: '메시지가 비어 있습니다.' });
  }

  const question = await db.getQuestion(question_id);
  if (!question) return res.status(404).json({ error: 'Question not found' });

  const history = await db.getMessages(student_id, question_id);
  const result = await chatTutor(question.text, question.model_answer || '', history, message);

  // AI 응답 실패 시 아무것도 저장하지 않는다(스레드 오염 방지).
  if (result.error) {
    return res.status(503).json({ error: result.reply });
  }

  await db.addMessage(randomUUID(), student_id, question_id, 'user', message);
  await db.addMessage(randomUUID(), student_id, question_id, 'assistant', result.reply);
  res.status(201).json({ reply: result.reply });
}));

// ===== Dashboard =====
router.get('/classroom/:classroomId/dashboard', wrap(async (req, res) => {
  const classroom = await db.getClassroom(req.params.classroomId);
  if (!classroom) return res.status(404).json({ error: 'Classroom not found' });

  const students = await db.getStudentsByClassroom(req.params.classroomId);
  const studentsData = await Promise.all(
    students.map(async ({ id, name }) => {
      const { progress, correct, total } = await db.getStudentProgress(id);
      return { id, name, progress, correct, total };
    })
  );

  const sum = (pick) => studentsData.reduce((total, student) => total + pick(student), 0);
  const totalStudents = studentsData.length;
  const averageProgress = totalStudents ? sum((s) => s.progress) / totalStudents : 0;

  res.json({
    classroom,
    students: studentsData,
    stats: {
      total_students: totalStudents,
      average_progress: Math.round(averageProgress * 10) / 10,
      total_correct: sum((s) => s.correct),
      total_answers: sum((s) => s.total)
    }
  });
}));

export default router;
