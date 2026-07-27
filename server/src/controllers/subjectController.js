import {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  completeSubject,
} from "../services/subjectService.js";

// 1~7 척도 필드 목록. optional=true 인 필드는 값이 없으면 기본값(SCORE_FIELD_DEFAULT)으로 채운다.
// (구버전/오프라인 클라이언트 호환)
const SCORE_FIELDS = [
  { key: "understanding", label: "이해도", optional: false },
  { key: "difficulty", label: "난이도", optional: false },
  { key: "grading", label: "교수님 학점 성향", optional: true },
  { key: "studyAmount", label: "공부 분량", optional: true },
  { key: "availableTime", label: "확보 가능한 공부 시간", optional: true },
];

const SCORE_FIELD_DEFAULT = 4;
const SCORE_MAX = 7;

// 학점 반영 비율은 0~100(%) 범위이고, 값이 없으면 기본값 40 으로 채운다.
const GRADE_WEIGHT_DEFAULT = 40;

// 중요도(과목 학점 수)는 양의 실수(예: 3, 5, 7.5)이고, 값이 없으면 기본값 3 으로 채운다.
const CREDITS_DEFAULT = 3;

// 저장 전에 입력값을 검사한다. 잘못된 값이면 이유 문자열을, 문제없으면 null 을 돌려준다.
function validateSubjectInput(body) {
  if (!body || typeof body !== "object") {
    return "요청 본문이 필요합니다.";
  }

  const { name, examDate, gradeWeight, credits, previousScore } = body;

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
    // 0 은 "모르겠다"(중립)를 뜻하므로 0~7 을 허용한다.
    if (!Number.isInteger(value) || value < 0 || value > SCORE_MAX) {
      return `${field.label}(${field.key})는 0(모르겠다)~${SCORE_MAX} 사이 정수여야 합니다.`;
    }
  }

  if (gradeWeight !== undefined) {
    if (!Number.isInteger(gradeWeight) || gradeWeight < 0 || gradeWeight > 100) {
      return "학점 반영 비율(gradeWeight)은 0~100 사이 정수여야 합니다.";
    }
  }

  if (credits !== undefined) {
    if (typeof credits !== "number" || !Number.isFinite(credits) || credits <= 0 || credits > 30) {
      return "중요도(credits)는 0보다 큰 학점 수여야 합니다.";
    }
  }

  // 이전 시험 점수는 선택 입력이다. null/undefined 는 "해당 없음"이라 허용하고, 값이 있으면 0~100.
  if (previousScore !== undefined && previousScore !== null) {
    if (!Number.isInteger(previousScore) || previousScore < 0 || previousScore > 100) {
      return "이전 시험 점수(previousScore)는 0~100 사이 정수여야 합니다.";
    }
  }

  return null;
}

function normalize(body) {
  const normalized = {
    name: body.name.trim(),
    examDate: body.examDate,
    gradeWeight: body.gradeWeight === undefined ? GRADE_WEIGHT_DEFAULT : body.gradeWeight,
    credits: body.credits === undefined ? CREDITS_DEFAULT : body.credits,
    // 선택 입력. 값이 없으면 "해당 없음"을 뜻하는 null 그대로 저장한다(중립 기본값으로 채우지 않음).
    previousScore: body.previousScore === undefined ? null : body.previousScore,
  };

  for (const field of SCORE_FIELDS) {
    const value = body[field.key];
    normalized[field.key] = value === undefined && field.optional ? SCORE_FIELD_DEFAULT : value;
  }

  return normalized;
}

const VALID_STATUSES = new Set(["active", "done", "all"]);

export function getSubjects(req, res) {
  const { status } = req.query;
  if (status !== undefined && !VALID_STATUSES.has(status)) {
    return res.status(400).json({ error: "status는 active, done, all 중 하나여야 합니다." });
  }
  res.json({ subjects: listSubjects(status) });
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

export function patchCompleteSubject(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "올바른 과목 id가 필요합니다." });
  }

  const subject = completeSubject(id);
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
