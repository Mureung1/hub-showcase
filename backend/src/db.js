// Supabase 데이터 접근 계층. 라우터가 SQL/Supabase 문법을 몰라도 되도록,
// 이 파일에서만 테이블 이름과 쿼리를 다룬다.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'SUPABASE_URL / SUPABASE_KEY 가 설정되지 않았습니다. backend/.env 를 확인하세요.'
  );
}

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== 공통 쿼리 헬퍼 =====
// where 는 { 컬럼: 값 } 형태의 동등 조건 묶음이다.

async function selectRows(table, { where = {}, orderBy, limit } = {}) {
  let query = client.from(table).select('*');
  for (const [column, value] of Object.entries(where)) {
    query = query.eq(column, value);
  }
  if (orderBy) query = query.order(orderBy, { ascending: true });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// 조건에 맞는 첫 행. 없으면 null.
async function selectFirst(table, options = {}) {
  const rows = await selectRows(table, { ...options, limit: 1 });
  return rows.length ? rows[0] : null;
}

// id 로 단건 조회. 없으면 null.
function selectById(table, id) {
  return selectFirst(table, { where: { id } });
}

// 특정 컬럼 값으로 걸러 id 배열만 반환 (FK 관계 계산용).
async function selectIds(table, column, value) {
  const { data, error } = await client.from(table).select('id').eq(column, value);
  if (error) throw error;
  return data.map((row) => row.id);
}

async function insert(table, row) {
  const { error } = await client.from(table).insert(row);
  if (error) throw error;
  return true;
}

// 특정 컬럼 값에 해당하는 행 삭제.
async function deleteWhere(table, column, value) {
  const { error } = await client.from(table).delete().eq(column, value);
  if (error) throw error;
  return true;
}

// ===== Teacher =====
export async function addTeacher(teacherId, name) {
  return insert('teachers', { id: teacherId, name });
}

export async function getTeacher(teacherId) {
  const teacher = await selectById('teachers', teacherId);
  if (!teacher) return null;
  teacher.classrooms = await selectIds('classrooms', 'teacher_id', teacherId);
  return teacher;
}

// 이름으로 교사 조회 (교사 로그인용). 이름이 곧 신원이므로, 재로그인 시 같은
// 교사를 골라 기존 교실을 재사용한다. 중복 이름은 가장 먼저 만든 교사로 고정.
export async function getTeacherByName(name) {
  const teacher = await selectFirst('teachers', {
    where: { name },
    orderBy: 'created_at'
  });
  if (!teacher) return null;
  teacher.classrooms = await selectIds('classrooms', 'teacher_id', teacher.id);
  return teacher;
}

// ===== Classroom =====
export async function addClassroom(classroomId, name, teacherId) {
  return insert('classrooms', { id: classroomId, name, teacher_id: teacherId });
}

export async function getClassroom(classroomId) {
  const classroom = await selectById('classrooms', classroomId);
  if (!classroom) return null;
  classroom.students = await selectIds('students', 'classroom_id', classroomId);
  classroom.questions = await selectIds('questions', 'classroom_id', classroomId);
  return classroom;
}

export async function addStudentToClassroom(classroomId, studentId) {
  // 학생은 생성 시점에 classroom_id 를 가지므로 소속은 자동이다.
  // 두 대상이 실제로 존재할 때만 성공으로 본다.
  const [classroom, student] = await Promise.all([
    selectById('classrooms', classroomId),
    selectById('students', studentId)
  ]);
  return Boolean(classroom && student);
}

// ===== Student =====
export async function addStudent(studentId, name, classroomId) {
  return insert('students', { id: studentId, name, classroom_id: classroomId });
}

export async function getStudent(studentId) {
  return selectById('students', studentId);
}

export async function getStudentsByClassroom(classroomId) {
  return selectRows('students', { where: { classroom_id: classroomId } });
}

// 이름 + 교실로 학생 조회 (학생 로그인용: 선생님이 먼저 등록한 학생만 통과시킨다).
export async function getStudentByNameInClassroom(name, classroomId) {
  return selectFirst('students', { where: { classroom_id: classroomId, name } });
}

// 학생 삭제. 딸린 답변·대화 기록도 함께 지운다(고아 데이터/통계 오염 방지).
export async function deleteStudent(studentId) {
  await deleteWhere('answers', 'student_id', studentId);
  await deleteWhere('messages', 'student_id', studentId);
  await deleteWhere('students', 'id', studentId);
  return true;
}

// ===== Question =====
export async function addQuestion(
  questionId,
  text,
  classroomId,
  modelAnswer = '',
  subject = '',
  unit = '',
  graph = ''
) {
  return insert('questions', {
    id: questionId,
    text,
    classroom_id: classroomId,
    model_answer: modelAnswer,
    subject,
    unit,
    graph
  });
}

export async function getQuestion(questionId) {
  return selectById('questions', questionId);
}

export async function getQuestionsByClassroom(classroomId) {
  return selectRows('questions', { where: { classroom_id: classroomId } });
}

// 질문 삭제. 딸린 답변·대화 기록도 함께 지운다(고아 데이터/통계 오염 방지).
export async function deleteQuestion(questionId) {
  await deleteWhere('answers', 'question_id', questionId);
  await deleteWhere('messages', 'question_id', questionId);
  await deleteWhere('questions', 'id', questionId);
  return true;
}

// ===== Answer =====
export async function addAnswer(
  answerId,
  questionId,
  studentId,
  answerText,
  isCorrect = false,
  feedback = ''
) {
  return insert('answers', {
    id: answerId,
    question_id: questionId,
    student_id: studentId,
    answer_text: answerText,
    is_correct: isCorrect,
    feedback
  });
}

export async function getAnswersByStudent(studentId) {
  return selectRows('answers', { where: { student_id: studentId } });
}

export async function getAnswersByQuestion(questionId) {
  return selectRows('answers', { where: { question_id: questionId } });
}

// ===== Message (대화형 학습) =====
export async function addMessage(messageId, studentId, questionId, role, content) {
  return insert('messages', {
    id: messageId,
    student_id: studentId,
    question_id: questionId,
    role,
    content
  });
}

export async function getMessages(studentId, questionId) {
  return selectRows('messages', {
    where: { student_id: studentId, question_id: questionId },
    orderBy: 'created_at'
  });
}

// ===== 학업 성취도 =====
/**
 * 학생의 진행률을 계산한다. 진행률 = 정답 수 / 전체 답변 수 (소수 첫째 자리 반올림).
 * @returns {Promise<{progress: number, correct: number, total: number}>}
 */
export async function getStudentProgress(studentId) {
  const answers = await getAnswersByStudent(studentId);
  const total = answers.length;
  const correct = answers.filter((answer) => answer.is_correct).length;
  const progress = total ? Math.round((correct / total) * 1000) / 10 : 0;
  return { progress, correct, total };
}
