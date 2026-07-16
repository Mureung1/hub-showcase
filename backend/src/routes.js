import { Router } from 'express';
import { randomUUID } from 'crypto';
import * as db from './db.js';
import { gradeAnswer, chatTutor } from './ai.js';

const router = Router();

// 모범답안을 뺀 질문. 학생 브라우저로 정답이 새어나가지 않도록.
function publicQuestion(question) {
  const { model_answer, ...rest } = question;
  return rest;
}

// async 핸들러의 예외를 500으로 처리해주는 래퍼.
function wrap(handler) {
  return (req, res) => {
    handler(req, res).catch((err) => {
      console.error('[route error]', err.message);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    });
  };
}

// ===== Teacher =====
router.post('/teacher/create', wrap(async (req, res) => {
  const teacherId = randomUUID();
  await db.addTeacher(teacherId, req.body.name || 'Teacher');
  res.status(201).json({ id: teacherId, name: req.body.name });
}));

router.get('/teacher/:teacherId', wrap(async (req, res) => {
  const teacher = await db.getTeacher(req.params.teacherId);
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
  const classrooms = await Promise.all(teacher.classrooms.map((cid) => db.getClassroom(cid)));
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
  const students = await Promise.all(classroom.students.map((sid) => db.getStudent(sid)));
  const questions = await Promise.all(
    classroom.questions.map(async (qid) => publicQuestion(await db.getQuestion(qid)))
  );
  res.json({ classroom, students, questions });
}));

router.post('/classroom/:classroomId/add-student', wrap(async (req, res) => {
  const ok = await db.addStudentToClassroom(req.params.classroomId, req.body.student_id);
  if (ok) return res.json({ status: 'success' });
  res.status(400).json({ error: 'Failed to add student' });
}));

// ===== Student =====
router.post('/student/create', wrap(async (req, res) => {
  const studentId = randomUUID();
  await db.addStudent(studentId, req.body.name || 'Student', req.body.classroom_id);
  res.status(201).json({ id: studentId, name: req.body.name });
}));

router.get('/student/:studentId', wrap(async (req, res) => {
  const student = await db.getStudent(req.params.studentId);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  const answers = await db.getAnswersByStudent(req.params.studentId);
  const progress = await db.getStudentProgress(req.params.studentId);
  res.json({ student, answers, progress });
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

// ===== Question =====
router.post('/question/create', wrap(async (req, res) => {
  const questionId = randomUUID();
  await db.addQuestion(
    questionId,
    req.body.text || '',
    req.body.classroom_id,
    req.body.model_answer || ''
  );
  res.status(201).json({ id: questionId, text: req.body.text });
}));

router.get('/question/:questionId', wrap(async (req, res) => {
  const question = await db.getQuestion(req.params.questionId);
  if (!question) return res.status(404).json({ error: 'Question not found' });
  const answers = await db.getAnswersByQuestion(req.params.questionId);
  res.json({ question, answers });
}));

router.get('/classroom/:classroomId/questions', wrap(async (req, res) => {
  const questions = await db.getQuestionsByClassroom(req.params.classroomId);
  res.json(questions.map(publicQuestion));
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

router.get('/student/:studentId/answers', wrap(async (req, res) => {
  res.json(await db.getAnswersByStudent(req.params.studentId));
}));

router.get('/question/:questionId/answers', wrap(async (req, res) => {
  res.json(await db.getAnswersByQuestion(req.params.questionId));
}));

// ===== Chat (대화형 학습) =====
router.get('/student/:studentId/question/:questionId/messages', wrap(async (req, res) => {
  const messages = await db.getMessages(req.params.studentId, req.params.questionId);
  res.json(messages.map(({ role, content, created_at }) => ({ role, content, created_at })));
}));

router.post('/chat', wrap(async (req, res) => {
  const { student_id, question_id, message } = req.body;

  if (!message || !message.trim()) {
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
    students.map(async (student) => {
      const progress = await db.getStudentProgress(student.id);
      return {
        id: student.id,
        name: student.name,
        progress: progress.progress,
        correct: progress.correct,
        total: progress.total
      };
    })
  );

  const totalStudents = students.length;
  const totalCorrect = studentsData.reduce((sum, s) => sum + s.correct, 0);
  const totalAnswers = studentsData.reduce((sum, s) => sum + s.total, 0);
  const averageProgress = totalStudents > 0
    ? studentsData.reduce((sum, s) => sum + s.progress, 0) / totalStudents
    : 0;

  res.json({
    classroom,
    students: studentsData,
    stats: {
      total_students: totalStudents,
      average_progress: Math.round(averageProgress * 10) / 10,
      total_correct: totalCorrect,
      total_answers: totalAnswers
    }
  });
}));

export default router;
