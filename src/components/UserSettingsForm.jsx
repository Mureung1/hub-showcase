import { useEffect, useMemo, useState } from "react";

import {
  USER_SETTINGS_CATEGORIES,
  USER_SETTINGS_CATEGORY_LABELS,
} from "../constants/userSettings.js";
import { useUserSettings } from "../settings/useUserSettings.js";

function settingsToDraft(settings) {
  return {
    ...settings,
    recommendationCategories: [...settings.recommendationCategories],
    preferredRegionsText: settings.preferredRegions.join(", "),
  };
}

function toSettingsPayload(draft) {
  return {
    recommendationCategories: draft.recommendationCategories,
    preferredRegions: draft.preferredRegionsText
      .split(",")
      .map((region) => region.trim())
      .filter(Boolean),
    includeOnline: draft.includeOnline,
    minimumMatchScore: Number(draft.minimumMatchScore),
    includeUnknownDeadline: draft.includeUnknownDeadline,
    autoSaveAnalyzedOpportunities: draft.autoSaveAnalyzedOpportunities,
    recommendationLimit: Number(draft.recommendationLimit),
  };
}

export default function UserSettingsForm() {
  const {
    isDefault,
    isSettingsLoading,
    isSettingsSaving,
    resetSettings,
    saveSettings,
    settings,
    settingsError,
  } = useUserSettings();
  const [draft, setDraft] = useState(null);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (settings) {
      setDraft(settingsToDraft(settings));
      setFormError("");
    }
  }, [settings]);

  const hasUnsavedChanges = useMemo(() => {
    if (!draft || !settings) return false;
    return JSON.stringify(toSettingsPayload(draft)) !== JSON.stringify(settings);
  }, [draft, settings]);

  function updateDraft(key, value) {
    setMessage("");
    setFormError("");
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleCategory(category) {
    updateDraft(
      "recommendationCategories",
      draft.recommendationCategories.includes(category)
        ? draft.recommendationCategories.filter((item) => item !== category)
        : [...draft.recommendationCategories, category],
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!draft || !hasUnsavedChanges) return;

    const payload = toSettingsPayload(draft);
    if (!Number.isInteger(payload.minimumMatchScore) || payload.minimumMatchScore < 0 || payload.minimumMatchScore > 100) {
      setFormError("최소 추천 점수는 0부터 100 사이의 정수로 입력해 주세요.");
      return;
    }
    if (!Number.isInteger(payload.recommendationLimit) || payload.recommendationLimit < 1 || payload.recommendationLimit > 50) {
      setFormError("추천 결과 개수는 1부터 50 사이의 정수로 입력해 주세요.");
      return;
    }

    try {
      await saveSettings(payload);
      setMessage("개인 설정을 저장했습니다. 다음 추천과 공고 목록에 반영됩니다.");
    } catch {
      // Provider exposes a user-safe error message.
    }
  }

  async function handleReset() {
    if (!window.confirm("개인 설정을 기본값으로 초기화할까요?")) return;

    try {
      await resetSettings();
      setMessage("개인 설정을 기본값으로 초기화했습니다.");
    } catch {
      // Provider exposes a user-safe error message.
    }
  }

  return (
    <section className="user-settings-panel" id="user-settings" aria-labelledby="user-settings-title">
      <div className="panel-heading user-settings-heading">
        <div>
          <span className="eyebrow">Settings</span>
          <h2 id="user-settings-title">개인 설정</h2>
          <p>추천과 공고 목록을 내 활동 조건에 맞게 조정합니다.</p>
        </div>
        <span className={`profile-state-badge ${isDefault ? "" : "is-saved"}`}>
          {isDefault ? "기본값" : "저장됨"}
        </span>
      </div>

      {isSettingsLoading || !draft ? (
        <p className="saved-analysis-empty">개인 설정을 불러오는 중입니다.</p>
      ) : (
        <form className="user-settings-form" onSubmit={handleSubmit} noValidate>
          <fieldset className="settings-fieldset">
            <legend>관심 정보 종류</legend>
            <p>사이트 추천에서 우선으로 확인할 기회 종류입니다.</p>
            <div className="settings-category-grid">
              {USER_SETTINGS_CATEGORIES.map((category) => (
                <label key={category}>
                  <input
                    checked={draft.recommendationCategories.includes(category)}
                    onChange={() => toggleCategory(category)}
                    type="checkbox"
                  />
                  <span>{USER_SETTINGS_CATEGORY_LABELS[category]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="field">
            <span>선호 활동 지역</span>
            <input
              value={draft.preferredRegionsText}
              maxLength={300}
              onChange={(event) => updateDraft("preferredRegionsText", event.target.value)}
              placeholder="예: 대구, 서울, 온라인"
            />
            <small>쉼표로 구분해 입력합니다. 프로필 지역보다 우선해 추천에 반영됩니다.</small>
          </label>

          <div className="settings-number-grid">
            <label className="field">
              <span>최소 추천 점수</span>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={draft.minimumMatchScore}
                onChange={(event) => updateDraft("minimumMatchScore", event.target.value)}
              />
              <small>저장 공고 목록에서 이 점수보다 낮은 공고는 기본적으로 숨깁니다.</small>
            </label>
            <label className="field">
              <span>추천 결과 최대 개수</span>
              <input
                type="number"
                min="1"
                max="50"
                step="1"
                value={draft.recommendationLimit}
                onChange={(event) => updateDraft("recommendationLimit", event.target.value)}
              />
              <small>한 번에 표시할 사이트 추천 개수입니다.</small>
            </label>
          </div>

          <div className="settings-toggle-list">
            <label>
              <input checked={draft.includeOnline} onChange={(event) => updateDraft("includeOnline", event.target.checked)} type="checkbox" />
              <span><strong>온라인 활동 포함</strong><small>온라인 전용 기회를 추천 후보에 포함합니다.</small></span>
            </label>
            <label>
              <input checked={draft.includeUnknownDeadline} onChange={(event) => updateDraft("includeUnknownDeadline", event.target.checked)} type="checkbox" />
              <span><strong>마감일 미확인 공고 포함</strong><small>저장 공고 목록에서 마감일이 없는 공고를 표시합니다.</small></span>
            </label>
            <label>
              <input checked={draft.autoSaveAnalyzedOpportunities} onChange={(event) => updateDraft("autoSaveAnalyzedOpportunities", event.target.checked)} type="checkbox" />
              <span><strong>분석 완료 공고 자동 저장</strong><small>사용자별 저장 공고 API 연결 후 자동 저장에 사용됩니다.</small></span>
            </label>
          </div>

          {formError || settingsError ? <p className="form-message error-message" role="alert">{formError || settingsError}</p> : null}
          {message ? <p className="form-message success-message" role="status">{message}</p> : null}

          <div className="profile-form-actions">
            <button className="primary-button" disabled={!hasUnsavedChanges || isSettingsSaving} type="submit">
              {isSettingsSaving ? "저장 중" : "설정 저장"}
            </button>
            <button className="secondary-button" disabled={isSettingsSaving || isDefault} onClick={handleReset} type="button">
              기본값으로 초기화
            </button>
          </div>
        </form>
      )}
    </section>
  );
}