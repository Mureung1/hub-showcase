import {
  listSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  completeSubject,
} from "../services/subjectService.js";

// 1~7 척도 필드 목록. 값이 없으면 "모르겠다"(0)로 둔다.
// 중립값 4 로 채우면 사용자가 답한 적 없는 값이 점수에 섞인다. (priorityService.js 참고)
const SCORE_FIELDS = [
  { key: "understanding", label: "이해도" },
  { key: "difficulty", label: "난이도" },
  { key: "grading", label: "교수님 학점 성향" },
  { key: "studyAmount", label: "공부 분량" },
  { key: "availableTime", label: "확보 가능한 공부 시간" },
];

// 0 은 "모르겠다"다. 값을 안 보낸 것도 아직 answered 되지 않았다는 뜻이라 같게 본다.
const SCORE_FIELD_DEFAULT = 0;
const SCORE_MAX = 7;

// 중요도(과목 학점 수)는 양의 실수(예: 3, 5, 7.5)다. 값이 없으면 모름(NULL)으로 둔다.

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
    if (value === undefined || value === null) {
      continue;
    }
    // 0 은 "모르겠다"를 뜻하므로 0~7 을 허용한다.
    if (!Number.isInteger(value) || value < 0 || value > SCORE_MAX) {
      return `${field.label}(${field.key})는 0(모르겠다)~${SCORE_MAX} 사이 정수여야 합니다.`;
    }
  }

  // 성적 반영 비율도 선택 입력이다. null 은 "모름"이라 허용하고, 값이 있으면 0~100.
  if (gradeWeight !== undefined && gradeWeight !== null) {
    if (!Number.isInteger(gradeWeight) || gradeWeight < 0 || gradeWeight > 100) {
      return "학점 반영 비율(gradeWeight)은 0~100 사이 정수여야 합니다.";
    }
  }

  // 학점도 선택 입력이다. null 은 "모름"이라 허용하고, 값이 있으면 0보다 큰 수.
  if (credits !== undefined && credits !== null) {
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
    // 안 보냈으면 "모름"(null)이다. 40 으로 채우면 답한 적 없는 값이 점수에 섞인다.
    gradeWeight: body.gradeWeight ?? null,
    // 학점도 이제 가중 평균에 들어가는 요인이라, 안 보냈으면 모름(null)이다.
    credits: body.credits ?? null,
    // 선택 입력. 값이 없으면 "해당 없음"을 뜻하는 null 그대로 저장한다.
    previousScore: body.previousScore ?? null,
  };

  for (const field of SCORE_FIELDS) {
    normalized[field.key] = body[field.key] ?? SCORE_FIELD_DEFAULT;
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
