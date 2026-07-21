import {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} from "../services/subjectService.js";

// 1~5 척도 필드 목록. optional=true 인 필드는 값이 없으면 기본값 3 으로 채운다.
// (구버전/오프라인 클라이언트 호환)
const SCORE_FIELDS = [
  { key: "understanding", label: "이해도", optional: false },
  { key: "difficulty", label: "난이도", optional: false },
  { key: "grading", label: "교수님 학점 성향", optional: true },
  { key: "studyAmount", label: "공부 분량", optional: true },
];

// 학점 반영 비율은 0~100(%) 범위이고, 값이 없으면 기본값 40 으로 채운다.
const GRADE_WEIGHT_DEFAULT = 40;

// 저장 전에 입력값을 검사한다. 잘못된 값이면 이유 문자열을, 문제없으면 null 을 돌려준다.
function validateSubjectInput(body) {
  if (!body || typeof body !== "object") {
    return "요청 본문이 필요합니다.";
  }

  const { name, examDate, gradeWeight } = body;

  if (typeof name !== "string" || name.trim() === "") {
    return "과목명(name)이 필요합니다.";
  }
  if (typeof examDate !== "string" || examDate.trim() === "") {
    return "시험 날짜(examDate)가 필요합니다.";
  }

  for (const field of SCORE_FIELDS) {
    const value = body[field.key];
    if (value === undefined && field.optional) {
      continue;
    }
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return `${field.label}(${field.key})는 1~5 사이 정수여야 합니다.`;
    }
  }

  if (gradeWeight !== undefined) {
    if (!Number.isInteger(gradeWeight) || gradeWeight < 0 || gradeWeight > 100) {
      return "학점 반영 비율(gradeWeight)은 0~100 사이 정수여야 합니다.";
    }
  }

  return null;
}

function normalize(body) {
  const normalized = {
    name: body.name.trim(),
    examDate: body.examDate,
    gradeWeight: body.gradeWeight === undefined ? GRADE_WEIGHT_DEFAULT : body.gradeWeight,
  };

  for (const field of SCORE_FIELDS) {
    const value = body[field.key];
    normalized[field.key] = value === undefined && field.optional ? 3 : value;
  }

  return normalized;
}

export function getSubjects(req, res) {
  res.json({ subjects: listSubjects() });
}

export function postSubject(req, res) {
  const error = validateSubjectInput(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const subject = createSubject(normalize(req.body));
  return res.status(201).json({ subject });
}

export function putSubject(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "올바른 과목 id가 필요합니다." });
  }

  const error = validateSubjectInput(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const subject = updateSubject(id, normalize(req.body));
  if (!subject) {
    return res.status(404).json({ error: "해당 과목을 찾을 수 없습니다." });
  }
  return res.json({ subject });
}

export function removeSubject(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "올바른 과목 id가 필요합니다." });
  }

  const deleted = deleteSubject(id);
  if (!deleted) {
    return res.status(404).json({ error: "해당 과목을 찾을 수 없습니다." });
  }
  return res.status(204).end();
}
