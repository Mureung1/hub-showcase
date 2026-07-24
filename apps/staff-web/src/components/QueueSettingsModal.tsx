import { queueSettingsSchema, type QueueSettings } from "@baro-jinryo/shared";
import { Minus, Plus, Settings2 } from "lucide-react";
import { useState } from "react";

interface QueueSettingsModalProps {
  settings: QueueSettings;
  onClose: () => void;
  onSave: (settings: QueueSettings) => Promise<void>;
}

interface SettingFieldProps {
  label: string;
  description: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}

export function QueueSettingsModal({ settings, onClose, onSave }: QueueSettingsModalProps) {
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function update<K extends keyof QueueSettings>(key: K, value: QueueSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    const result = queueSettingsSchema.safeParse(draft);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "운영 설정을 확인해 주세요.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await onSave(result.data);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "운영 설정을 저장하지 못했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="queue-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="queue-settings-title"
      >
        <header className="category-settings-heading">
          <div>
            <h2 id="queue-settings-title">
              <Settings2 size={20} />
              운영 설정
            </h2>
            <p>변경한 값은 오늘 대기열의 다음 계산과 신규 원격 접수부터 적용됩니다.</p>
          </div>
        </header>

        <div className="queue-settings-list">
          <SettingField
            label="평균 진료시간"
            description="환자 1명당 예상 진료시간, 5분 단위"
            value={draft.averageMinutesPerPatient}
            step={5}
            onChange={(value) => update("averageMinutesPerPatient", value)}
          />
          <SettingField
            label="방문 준비 기준"
            description="이 순서 이내가 되면 방문 준비 알림"
            value={draft.preparationThreshold}
            onChange={(value) => update("preparationThreshold", value)}
          />
          <SettingField
            label="입장 요청 기준"
            description="이 순서 이내가 되면 입장 요청 알림"
            value={draft.entryThreshold}
            onChange={(value) => update("entryThreshold", value)}
          />
          <SettingField
            label="원격 접수 한도"
            description="활성 원격 웨이팅의 실제 환자 수 기준"
            value={draft.maxRemoteWaitingPatients}
            onChange={(value) => update("maxRemoteWaitingPatients", value)}
          />
        </div>

        <p className="queue-settings-note">
          현재 대기 인원보다 한도를 낮춰도 기존 접수는 유지되고 신규 접수만 제한됩니다.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={isSaving}
            onClick={() => void submit()}
          >
            {isSaving ? "저장 중" : "설정 저장"}
          </button>
        </div>
      </section>
    </div>
  );
}

function SettingField({ label, description, value, step = 1, onChange }: SettingFieldProps) {
  const minimum = step;
  return (
    <div className="queue-settings-row">
      <div>
        <strong>{label}</strong>
        <span>{description}</span>
      </div>
      <div className="queue-settings-stepper">
        <button
          type="button"
          title={`${label} 줄이기`}
          disabled={value <= minimum}
          onClick={() => onChange(Math.max(minimum, value - step))}
        >
          <Minus size={16} />
        </button>
        <label>
          <input
            type="number"
            aria-label={label}
            min={minimum}
            step={step}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
          />
        </label>
        <button type="button" title={`${label} 늘리기`} onClick={() => onChange(value + step)}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
