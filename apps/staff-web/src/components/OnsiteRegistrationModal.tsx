import type {
  NotificationReceipt,
  PatientCategoryDefinition,
  PatientCounts,
  PatientInputMode,
  PatientRegistrationInput,
} from "@baro-jinryo/shared";
import {
  calculatePatientCount,
  createEmptyPatientCounts,
  formatKoreanMobileNumber,
} from "@baro-jinryo/shared";
import { PatientCountStepper } from "@baro-jinryo/web-shared";
import { useState } from "react";

interface OnsiteRegistrationModalProps {
  inputMode: PatientInputMode;
  categories: PatientCategoryDefinition[];
  onClose: () => void;
  onSubmit: (
    phoneNumber: string,
    registration: PatientRegistrationInput,
  ) => Promise<NotificationReceipt>;
  onRegistered: (receipt: NotificationReceipt) => void;
}

export function OnsiteRegistrationModal({
  inputMode,
  categories,
  onClose,
  onSubmit,
  onRegistered,
}: OnsiteRegistrationModalProps) {
  const [counts, setCounts] = useState<PatientCounts>(() => createEmptyPatientCounts(categories));
  const [totalOnlyCount, setTotalOnlyCount] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const phoneNumberValid = /^01[016789]-?\d{3,4}-?\d{4}$/.test(phoneNumber.trim());
  const patientCount = inputMode === "categorized" ? calculatePatientCount(counts) : totalOnlyCount;

  async function submit() {
    const registration: PatientRegistrationInput =
      inputMode === "categorized"
        ? { inputMode: "categorized", patientCounts: counts }
        : { inputMode: "total_only", totalCount: totalOnlyCount };
    setSubmitting(true);
    setSubmitError("");
    try {
      onRegistered(await onSubmit(phoneNumber, registration));
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "현장 접수를 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="onsite-modal" role="dialog" aria-modal="true" aria-labelledby="onsite-title">
        <h2 id="onsite-title">현장 환자 등록</h2>
        <p>데스크 접수를 마친 환자의 연락처와 가족 인원을 입력합니다.</p>
        <label className="onsite-phone-field">
          휴대전화 번호
          <input
            type="tel"
            inputMode="numeric"
            maxLength={13}
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(formatKoreanMobileNumber(event.target.value))}
            placeholder="010-1234-5678"
            autoComplete="tel"
          />
        </label>
        {!phoneNumberValid && phoneNumber.length > 0 && (
          <p className="field-error">국내 휴대전화 번호를 입력해 주세요.</p>
        )}
        {inputMode === "categorized" ? (
          <div className="onsite-count-list">
            {categories
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((category) => (
                <PatientCountStepper
                  key={category.id}
                  category={category}
                  count={counts[category.id] ?? 0}
                  total={patientCount}
                  onChange={(categoryId, nextCount) =>
                    setCounts((current) => ({
                      ...current,
                      [categoryId]: Math.max(0, nextCount),
                    }))
                  }
                />
              ))}
          </div>
        ) : (
          <label className="onsite-total-field">
            총인원
            <input
              type="number"
              min={1}
              max={9}
              value={totalOnlyCount}
              onChange={(event) => {
                const nextCount = event.target.valueAsNumber;
                setTotalOnlyCount(Number.isFinite(nextCount) ? nextCount : 0);
              }}
            />
          </label>
        )}
        {patientCount < 1 && (
          <p className="field-error">접수할 환자 인원을 1명 이상 선택해 주세요.</p>
        )}
        <div className="notice notice--info onsite-notification-notice">
          등록하면 접수 완료 알림톡 mock과 상태 확인 링크가 생성됩니다.
        </div>
        {submitError && <p className="field-error">{submitError}</p>}
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>닫기</button>
          <button
            className="primary-button"
            type="button"
            onClick={() => void submit()}
            disabled={
              submitting ||
              !phoneNumberValid ||
              !Number.isInteger(patientCount) ||
              patientCount < 1 ||
              patientCount > 9
            }
          >
            {submitting ? "등록 중" : "대기열에 추가"}
          </button>
        </div>
      </section>
    </div>
  );
}
