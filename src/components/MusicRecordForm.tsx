import { useState, type FormEvent } from "react";
import type { MusicRecordDraft } from "../types/music";

interface MusicRecordFormProps {
  onSave: (draft: MusicRecordDraft) => Promise<void>;
  getToday?: () => Date;
}

type EditableDraft = MusicRecordDraft;
type FieldName = keyof EditableDraft;
type FormErrors = Partial<Record<FieldName, string>>;

const initialDraft: EditableDraft = {
  songTitle: "",
  artistName: "",
  emotion: "",
};

const limits: Record<FieldName, number> = {
  songTitle: 100,
  artistName: 100,
  emotion: 160,
};

const labels: Record<FieldName, string> = {
  songTitle: "노래 제목",
  artistName: "아티스트명",
  emotion: "한 줄 감정",
};

export function toLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function validate(draft: EditableDraft): FormErrors {
  const errors: FormErrors = {};

  (Object.keys(draft) as FieldName[]).forEach((field) => {
    const value = draft[field].trim();
    if (!value) {
      errors[field] = `${labels[field]}을 입력해주세요.`;
    } else if (value.length > limits[field]) {
      errors[field] = `${labels[field]}은 ${limits[field]}자 이하로 입력해주세요.`;
    }
  });

  return errors;
}

export function MusicRecordForm({ onSave, getToday = () => new Date() }: MusicRecordFormProps) {
  const [today] = useState(getToday);
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const dateKey = toLocalDateKey(today);
  const displayDate = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(today);

  const updateField = (field: FieldName, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setStatus("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(draft);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSaving(true);
    try {
      await onSave({
        songTitle: draft.songTitle.trim(),
        artistName: draft.artistName.trim(),
        emotion: draft.emotion.trim(),
      });
      setStatus("오늘의 음악 기록을 남겼어요.");
      setDraft(initialDraft);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "음악 기록을 저장하지 못했어요.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="record-form" onSubmit={handleSubmit} noValidate>
      <header className="today-header">
        <span>Today</span>
        <time dateTime={dateKey}>{displayDate}</time>
      </header>

      <section className="journal-prompt" aria-labelledby="music-prompt">
        <p id="music-prompt">오늘을 대표하는 음악은?</p>
        <div className="field-grid">
          <FormField
            id="songTitle"
            label="노래 제목"
            value={draft.songTitle}
            error={errors.songTitle}
            maxLength={101}
            placeholder="오늘의 노래"
            onChange={(value) => updateField("songTitle", value)}
          />
          <FormField
            id="artistName"
            label="아티스트명"
            value={draft.artistName}
            error={errors.artistName}
            maxLength={101}
            placeholder="아티스트"
            onChange={(value) => updateField("artistName", value)}
          />
        </div>
      </section>

      <section className="journal-prompt" aria-labelledby="emotion-prompt">
        <p id="emotion-prompt">오늘의 감정</p>
        <label className="field-label" htmlFor="emotion">한 줄로 남기기</label>
        <textarea
          id="emotion"
          rows={4}
          value={draft.emotion}
          maxLength={161}
          aria-invalid={Boolean(errors.emotion)}
          aria-describedby={errors.emotion ? "emotion-error" : "emotion-hint"}
          placeholder="오늘의 마음은 어떤 온도였나요?"
          onChange={(event) => updateField("emotion", event.target.value)}
        />
        <div className="field-meta">
          {errors.emotion ? <span id="emotion-error" className="field-error">{errors.emotion}</span> : <span id="emotion-hint">최대 160자</span>}
          <span>{draft.emotion.length}/160</span>
        </div>
      </section>

      <button className="save-button" type="submit" disabled={isSaving}>
        {isSaving ? "기록하는 중..." : "기록하기"}
      </button>
      <p className="form-status" role="status" aria-live="polite">{status}</p>
    </form>
  );
}

interface FormFieldProps {
  id: "songTitle" | "artistName";
  label: string;
  value: string;
  error?: string;
  maxLength: number;
  placeholder: string;
  onChange: (value: string) => void;
}

function FormField({ id, label, value, error, maxLength, placeholder, onChange }: FormFieldProps) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <span id={`${id}-error`} className="field-error">{error}</span>}
    </div>
  );
}
