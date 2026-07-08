const STORAGE_KEY = "mbti-study-routine-result";
const RECORD_KEY = "mbti-study-routine-records";

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
  return raw ? JSON.parse(raw) : null;
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
  return raw ? JSON.parse(raw) : [];
}
