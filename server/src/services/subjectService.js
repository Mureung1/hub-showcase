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
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

const listActiveStatement = db.prepare(
  "SELECT * FROM subjects WHERE completed_at IS NULL ORDER BY created_at ASC, id ASC"
);
const listDoneStatement = db.prepare(
  "SELECT * FROM subjects WHERE completed_at IS NOT NULL ORDER BY created_at ASC, id ASC"
);
const listAllStatement = db.prepare(
  "SELECT * FROM subjects ORDER BY created_at ASC, id ASC"
);
const getStatement = db.prepare("SELECT * FROM subjects WHERE id = ?");
const completeStatement = db.prepare(
  "UPDATE subjects SET completed_at = ? WHERE id = ?"
);
const uncompleteStatement = db.prepare(
  "UPDATE subjects SET completed_at = NULL WHERE id = ?"
);
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

// status: "active"(기본, 완료 제외) | "done"(완료만) | "all"(전체)
export function listSubjects(status = "active") {
  const statement =
    status === "done"
      ? listDoneStatement
      : status === "all"
      ? listAllStatement
      : listActiveStatement;
  return statement.all().map(toSubject);
}

export function completeSubject(id) {
  const result = completeStatement.run(new Date().toISOString(), id);
  if (result.changes === 0) {
    return null;
  }
  return toSubject(getStatement.get(id));
}

// 완료를 되돌린다. 실수로 "공부 끝"을 눌렀을 때 쓴다.
// 이미 활성인 과목에 걸어도 그대로 활성이라 문제가 없다.
export function uncompleteSubject(id) {
  const row = getStatement.get(id);
  if (!row) {
    return null;
  }

  uncompleteStatement.run(id);
  return toSubject(getStatement.get(id));
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
