const STORAGE_KEY = "mbti-study-routine-result";
const RECORD_KEY = "mbti-study-routine-records";
const FEEDBACK_KEY = "mbti-study-routine-feedback";
// 메타인지 보정(예측→회상→대조) 결과. 수용성·실행 기록과 다른 축(학습결과)으로 분리 저장한다.
const CALIBRATION_KEY = "mbti-study-routine-recall";

function safeParse(raw, fallback) {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveResult(payload) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...payload,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function loadResult() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = safeParse(raw, null);
  return parsed && typeof parsed === "object" ? parsed : null;
}

export function saveRecord(record) {
  const records = loadRecords();
  const nextRecords = [
    {
      ...record,
      date: new Date().toISOString(),
    },
    ...records,
  ].slice(0, 5);

  localStorage.setItem(RECORD_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}

export function loadRecords() {
  const raw = localStorage.getItem(RECORD_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveFeedback(feedback) {
  const records = loadFeedback().filter((item) => item.resultId !== feedback.resultId);
  const nextRecords = [
    {
      ...feedback,
      createdAt: new Date().toISOString(),
    },
    ...records,
  ].slice(0, 10);

  localStorage.setItem(FEEDBACK_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}

export function loadFeedback() {
  const raw = localStorage.getItem(FEEDBACK_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveCalibration(entry) {
  const records = loadCalibration().filter((item) => item.resultId !== entry.resultId);
  const nextRecords = [
    {
      ...entry,
      createdAt: new Date().toISOString(),
    },
    ...records,
  ].slice(0, 10);

  localStorage.setItem(CALIBRATION_KEY, JSON.stringify(nextRecords));
  return nextRecords;
}

export function loadCalibration() {
  const raw = localStorage.getItem(CALIBRATION_KEY);
  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function clearStoredData() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(RECORD_KEY);
  localStorage.removeItem(FEEDBACK_KEY);
  localStorage.removeItem(CALIBRATION_KEY);
}
