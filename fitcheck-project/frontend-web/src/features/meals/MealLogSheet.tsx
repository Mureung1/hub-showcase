import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import type { FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { createMeal } from '../../services/mealsApi';
import { analyzeMealWithAi } from '../../services/mealAi';
import { uploadMealImage, MEAL_IMAGE_ACCEPT_ATTR, validateMealImageFile } from '../../services/uploadsApi';
import { ApiError } from '../../services/api';
import { MEAL_TYPES, type MealType } from '../../types/meal';
import { todayString } from '../../utils/date';
import '../map/consult.css';
import './mealSheet.css';

export type MealLogSheetMode = 'photo' | 'manual';

interface MealLogSheetProps {
  open: boolean;
  mode: MealLogSheetMode;
  onClose: () => void;
  onSubmitted?: () => void;
}

function todayIsoDate() {
  return todayString();
}

function nowTimeHHmm() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

const INITIAL_FORM = {
  mealType: '점심' as MealType,
  time: nowTimeHHmm(),
  memo: '',
  carb: '',
  protein: '',
  fat: '',
  kcal: '',
};

function MealPhotoPicker({
  fileInputRef,
  photoPreview,
  onPick,
  required,
  label,
}: {
  fileInputRef: RefObject<HTMLInputElement | null>;
  photoPreview: string | null;
  onPick: (file: File | null) => void;
  required?: boolean;
  label: string;
}) {
  return (
    <div className="meal-photo-field">
      <span className="meal-photo-label">{label}</span>
      <input
        ref={fileInputRef}
        type="file"
        accept={MEAL_IMAGE_ACCEPT_ATTR}
        capture={required ? 'environment' : undefined}
        className="meal-photo-input"
        onChange={(event) => onPick(event.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        className="meal-photo-picker"
        onClick={() => fileInputRef.current?.click()}
      >
        {photoPreview ? (
          <img src={photoPreview} alt="선택한 식단 사진" className="meal-photo-preview" />
        ) : (
          <span className="meal-photo-placeholder">📷 사진 선택</span>
        )}
      </button>
    </div>
  );
}

export default function MealLogSheet({ open, mode, onClose, onSubmitted }: MealLogSheetProps) {
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    setForm({
      ...INITIAL_FORM,
      time: nowTimeHHmm(),
    });
    setPhotoFile(null);
    setPhotoPreview(null);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, mode]);

  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  if (!open) return null;

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePhotoChange = (file: File | null) => {
    if (photoPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }

    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }

    const validationError = validateMealImageFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const parseMacroField = (value: string, label: string): number | string => {
    if (!value.trim()) return `${label}을(를) 입력해 주세요.`;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return `${label}은(는) 0 이상의 숫자여야 합니다.`;
    return n;
  };

  const resolveImageUrl = async (): Promise<string | null> => {
    if (!photoFile) return null;
    return uploadMealImage(photoFile);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (mode === 'photo' && !photoFile) {
      alert('식단 사진을 선택해 주세요.');
      return;
    }

    const memo = form.memo.trim() || (mode === 'photo' ? '사진으로 기록한 식단' : '');
    const hasPhoto = Boolean(photoFile);

    if (mode === 'manual') {
      const carb = parseMacroField(form.carb, '탄수화물');
      const protein = parseMacroField(form.protein, '단백질');
      const fat = parseMacroField(form.fat, '지방');
      const kcal = parseMacroField(form.kcal, '칼로리');

      if (typeof carb === 'string') {
        alert(carb);
        return;
      }
      if (typeof protein === 'string') {
        alert(protein);
        return;
      }
      if (typeof fat === 'string') {
        alert(fat);
        return;
      }
      if (typeof kcal === 'string') {
        alert(kcal);
        return;
      }

      setSubmitting(true);
      try {
        const imageUrl = await resolveImageUrl();
        const ai = await analyzeMealWithAi(form.mealType, memo, hasPhoto);
        await createMeal({
          date: todayIsoDate(),
          mealType: form.mealType,
          time: form.time,
          memo: memo || null,
          imageUrl,
          macros: ai?.macros ?? { carb, protein, fat, kcal },
          aiFeedback: ai?.aiFeedback ?? null,
        });
        onSubmitted?.();
        onClose();
      } catch (err) {
        const message =
          err instanceof ApiError || err instanceof Error
            ? err.message
            : '식단 저장에 실패했습니다.';
        alert(message);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      const imageUrl = await resolveImageUrl();
      const ai = await analyzeMealWithAi(form.mealType, memo, true);
      await createMeal({
        date: todayIsoDate(),
        mealType: form.mealType,
        time: form.time,
        memo,
        imageUrl,
        macros: ai?.macros ?? { carb: 0, protein: 0, fat: 0, kcal: 0 },
        aiFeedback: ai?.aiFeedback ?? null,
      });
      onSubmitted?.();
      onClose();
    } catch (err) {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : '식단 저장에 실패했습니다.';
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const sheetTitle = mode === 'photo' ? '사진으로 식단 기록' : '칼로리 직접 입력';

  return createPortal(
    <div className="consult-overlay" onClick={onClose}>
      <div
        className="consult-sheet meal-log-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="consult-sheet-head">
          <div>
            <p className="consult-sheet-eyebrow">식단 기록</p>
            <h2 id={titleId}>{sheetTitle}</h2>
            <p className="consult-sheet-sub">
              {mode === 'photo'
                ? '사진과 메모를 남기면 AI가 탄단지·피드백을 추정합니다.'
                : '탄단지·칼로리를 입력하고, 원하면 사진도 함께 남길 수 있습니다.'}
            </p>
          </div>
          <button type="button" className="consult-close" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <form className="consult-form meal-log-form" onSubmit={handleSubmit}>
          <MealPhotoPicker
            fileInputRef={fileInputRef}
            photoPreview={photoPreview}
            onPick={handlePhotoChange}
            required={mode === 'photo'}
            label={mode === 'photo' ? '식단 사진' : '사진 (선택)'}
          />

          <label className="consult-field">
            <span>끼니</span>
            <select
              value={form.mealType}
              onChange={(event) => updateField('mealType', event.target.value as MealType)}
            >
              {MEAL_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="consult-field">
            <span>시간</span>
            <input
              type="time"
              value={form.time}
              onChange={(event) => updateField('time', event.target.value)}
              required
            />
          </label>

          <label className="consult-field">
            <span>{mode === 'photo' ? '메모 (선택)' : '메모'}</span>
            <textarea
              value={form.memo}
              onChange={(event) => updateField('memo', event.target.value)}
              placeholder={
                mode === 'photo'
                  ? '예: 닭가슴살 샐러드, 현미밥 반 공기'
                  : '예: 닭가슴살 샐러드'
              }
              rows={3}
            />
          </label>

          {mode === 'manual' && (
            <div className="meal-macro-grid">
              <label className="consult-field">
                <span>칼로리 (kcal)</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.kcal}
                  onChange={(event) => updateField('kcal', event.target.value)}
                  required
                />
              </label>
              <label className="consult-field">
                <span>탄수화물 (g)</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.carb}
                  onChange={(event) => updateField('carb', event.target.value)}
                  required
                />
              </label>
              <label className="consult-field">
                <span>단백질 (g)</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.protein}
                  onChange={(event) => updateField('protein', event.target.value)}
                  required
                />
              </label>
              <label className="consult-field">
                <span>지방 (g)</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={form.fat}
                  onChange={(event) => updateField('fat', event.target.value)}
                  required
                />
              </label>
            </div>
          )}

          <button type="submit" className="btn btn-primary consult-submit" disabled={submitting}>
            {submitting ? '저장 중…' : '식단 저장'}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
