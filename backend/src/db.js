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
