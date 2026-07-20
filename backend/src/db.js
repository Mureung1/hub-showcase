import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'SUPABASE_URL / SUPABASE_KEY 가 설정되지 않았습니다. backend/.env 를 확인하세요.'
  );
}

const client = createClient(SUPABASE_URL, SUPABASE_KEY);

// 단건 조회. 없으면 null.
async function one(table, id) {
  const { data, error } = await client.from(table).select('*').eq('id', id).limit(1);
  if (error) throw error;
  return data.length ? data[0] : null;
}

// 특정 컬럼 값으로 걸러 id 배열만 반환 (FK 관계 계산용).
async function ids(table, column, value) {
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
async function del(table, column, value) {
  const { error } = await client.from(table).delete().eq(column, value);
  if (error) throw error;
  return true;
}

// ===== Teacher =====
export async function addTeacher(teacherId, name) {
  return insert('teachers', { id: teacherId, name });
}

export async function getTeacher(teacherId) {
  const teacher = await one('teachers', teacherId);
  if (!teacher) return null;
  teacher.classrooms = await ids('classrooms', 'teacher_id', teacherId);
  return teacher;
}

// 이름으로 교사 조회 (교사 로그인용). 이름이 곧 신원이므로, 재로그인 시 같은
// 교사를 골라 기존 교실을 재사용한다. 중복 이름은 가장 먼저 만든 교사로 고정.
export async function getTeacherByName(name) {
  const { data, error } = await client
    .from('teachers')
    .select('*')
    .eq('name', name)
    .order('created_at', { ascending: true })
    .limit(1);
  if (error) throw error;
  if (!data.length) return null;
  const teacher = data[0];
  teacher.classrooms = await ids('classrooms', 'teacher_id', teacher.id);
  return teacher;
}

// ===== Classroom =====
export async function addClassroom(classroomId, name, teacherId) {
  return insert('classrooms', { id: classroomId, name, teacher_id: teacherId });
}

export async function getClassroom(classroomId) {
  const classroom = await one('classrooms', classroomId);
  if (!classroom) return null;
  classroom.students = await ids('students', 'classroom_id', classroomId);
  classroom.questions = await ids('questions', 'classroom_id', classroomId);
  return classroom;
}

export async function addStudentToClassroom(classroomId, studentId) {
  // 학생은 생성 시점에 classroom_id 를 가지므로 소속은 자동이다.
  // 두 대상이 실제로 존재할 때만 성공으로 본다.
  const [classroom, student] = await Promise.all([
    one('classrooms', classroomId),
    one('students', studentId)
  ]);
  return Boolean(classroom && student);
}

// ===== Student =====
export async function addStudent(studentId, name, classroomId) {
  return insert('students', { id: studentId, name, classroom_id: classroomId });
}

export async function getStudent(studentId) {
  return one('students', studentId);
}

export async function getStudentsByClassroom(classroomId) {
  const { data, error } = await client.from('students').select('*').eq('classroom_id', classroomId);
  if (error) throw error;
  return data;
}

// 학생 삭제. 딸린 답변·대화 기록도 함께 지운다(고아 데이터/통계 오염 방지).
export async function deleteStudent(studentId) {
  await del('answers', 'student_id', studentId);
  await del('messages', 'student_id', studentId);
  await del('students', 'id', studentId);
  return true;
}

// 이름 + 교실로 학생 조회 (학생 로그인용: 선생님이 먼저 등록한 학생만 통과시킨다).
export async function getStudentByNameInClassroom(name, classroomId) {
  const { data, error } = await client
    .from('students')
    .select('*')
    .eq('classroom_id', classroomId)
    .eq('name', name)
    .limit(1);
  if (error) throw error;
  return data.length ? data[0] : null;
}

// ===== Question =====
export async function addQuestion(questionId, text, classroomId, modelAnswer = '') {
  return insert('questions', {
    id: questionId,
    text,
    classroom_id: classroomId,
    model_answer: modelAnswer
  });
}

export async function getQuestion(questionId) {
  return one('questions', questionId);
}

export async function getQuestionsByClassroom(classroomId) {
  const { data, error } = await client.from('questions').select('*').eq('classroom_id', classroomId);
  if (error) throw error;
  return data;
}

// 질문 삭제. 딸린 답변·대화 기록도 함께 지운다(고아 데이터/통계 오염 방지).
export async function deleteQuestion(questionId) {
  await del('answers', 'question_id', questionId);
  await del('messages', 'question_id', questionId);
  await del('questions', 'id', questionId);
  return true;
}

// ===== Answer =====
export async function addAnswer(answerId, questionId, studentId, answerText, isCorrect = false, feedback = '') {
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
  const { data, error } = await client.from('answers').select('*').eq('student_id', studentId);
  if (error) throw error;
  return data;
}

export async function getAnswersByQuestion(questionId) {
  const { data, error } = await client.from('answers').select('*').eq('question_id', questionId);
  if (error) throw error;
  return data;
}

// ===== Message (대화형 학습) =====
export async function addMessage(id, studentId, questionId, role, content) {
  return insert('messages', {
    id,
    student_id: studentId,
    question_id: questionId,
    role,
    content
  });
}

export async function getMessages(studentId, questionId) {
  const { data, error } = await client
    .from('messages')
    .select('*')
    .eq('student_id', studentId)
    .eq('question_id', questionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getStudentProgress(studentId) {
  const answers = await getAnswersByStudent(studentId);
  if (!answers.length) {
    return { progress: 0, correct: 0, total: 0 };
  }
  const correct = answers.filter((a) => a.is_correct).length;
  const total = answers.length;
  const progress = total > 0 ? (correct / total) * 100 : 0;
  return {
    progress: Math.round(progress * 10) / 10,
    correct,
    total
  };
}
