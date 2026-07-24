import db from "../db/database.js";

// DB 행(snake_case)을 프론트가 쓰는 형태(camelCase)로 바꾼다.
function toSubject(row) {
  return {
    id: row.id,
    name: row.name,
    examDate: row.exam_date,
    understanding: row.understanding,
    difficulty: row.difficulty,
    gradeWeight: row.grade_weight,
    grading: row.grading,
    studyAmount: row.study_amount,
    availableTime: row.available_time,
    credits: row.credits,
    previousScore: row.previous_score,
    createdAt: row.created_at,
  };
}

const listStatement = db.prepare(
  "SELECT * FROM subjects ORDER BY created_at ASC, id ASC"
);
const getStatement = db.prepare("SELECT * FROM subjects WHERE id = ?");
const insertStatement = db.prepare(
  `INSERT INTO subjects (name, exam_date, understanding, difficulty, grade_weight, grading, study_amount, available_time, credits, previous_score)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);
const updateStatement = db.prepare(
  `UPDATE subjects
   SET name = ?, exam_date = ?, understanding = ?, difficulty = ?, grade_weight = ?, grading = ?, study_amount = ?, available_time = ?, credits = ?, previous_score = ?
   WHERE id = ?`
);
const deleteStatement = db.prepare("DELETE FROM subjects WHERE id = ?");

export function listSubjects() {
  return listStatement.all().map(toSubject);
}

export function createSubject({
  name,
  examDate,
  understanding,
  difficulty,
  gradeWeight,
  grading,
  studyAmount,
  availableTime,
  credits,
  previousScore,
}) {
  const result = insertStatement.run(
    name,
    examDate,
    understanding,
    difficulty,
    gradeWeight,
    grading,
    studyAmount,
    availableTime,
    credits,
    previousScore ?? null
  );
  const row = getStatement.get(result.lastInsertRowid);
  return toSubject(row);
}

export function updateSubject(
  id,
  {
    name,
    examDate,
    understanding,
    difficulty,
    gradeWeight,
    grading,
    studyAmount,
    availableTime,
    credits,
    previousScore,
  }
) {
  const result = updateStatement.run(
    name,
    examDate,
    understanding,
    difficulty,
    gradeWeight,
    grading,
    studyAmount,
    availableTime,
    credits,
    previousScore ?? null,
    id
  );
  if (result.changes === 0) {
    return null;
  }
  return toSubject(getStatement.get(id));
}

export function deleteSubject(id) {
  const result = deleteStatement.run(id);
  return result.changes > 0;
}
