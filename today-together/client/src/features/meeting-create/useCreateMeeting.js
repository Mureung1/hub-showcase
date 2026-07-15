import { useState } from "react";
import { createMeeting } from "./api";

const INITIAL_FORM = {
  title: "",
  description: "",
  category: "공부",
  startTime: "21:00",
  duration: "15",
};

export function useCreateMeeting() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      // 백엔드 연결 전까지는 이 호출이 실패해도 정상 (임시로 catch만 해둔다)
      await createMeeting(form);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setForm(INITIAL_FORM);
    setSubmitted(false);
    setError(null);
  }

  return { form, updateField, submit, submitting, submitted, error, reset };
}
