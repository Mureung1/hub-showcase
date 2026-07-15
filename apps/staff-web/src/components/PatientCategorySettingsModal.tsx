import type { PatientCategoryDefinition, PatientInputMode } from "@baro-jinryo/shared";
import { defaultPatientCategories } from "@baro-jinryo/shared";
import { ArrowDown, ArrowUp, Info, Plus, Trash2, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

interface PatientCategorySettingsModalProps {
  inputMode: PatientInputMode;
  categories: PatientCategoryDefinition[];
  onClose: () => void;
  onSave: (inputMode: PatientInputMode, categories: PatientCategoryDefinition[]) => void;
}

function normalizeOrder(categories: PatientCategoryDefinition[]): PatientCategoryDefinition[] {
  return categories.map((category, index) => ({ ...category, sortOrder: index }));
}

export function PatientCategorySettingsModal({
  inputMode,
  categories,
  onClose,
  onSave,
}: PatientCategorySettingsModalProps) {
  const [draftInputMode, setDraftInputMode] = useState(inputMode);
  const [draft, setDraft] = useState(() =>
    (categories.length > 0 ? categories : defaultPatientCategories)
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((category) => ({ ...category })),
  );

  const validationMessage = useMemo(() => {
    if (draftInputMode === "total_only") return null;
    if (draft.some((category) => !category.name.trim())) return "모든 분류의 이름을 입력해 주세요.";
    if (draft.some((category) => category.name.trim().length > 20)) {
      return "분류명은 20자 이하로 입력해 주세요.";
    }
    if (draft.some((category) => category.description.trim().length > 50)) {
      return "설명은 50자 이하로 입력해 주세요.";
    }

    const normalizedNames = draft.map((category) =>
      category.name.trim().toLocaleLowerCase("ko-KR"),
    );
    if (new Set(normalizedNames).size !== normalizedNames.length) {
      return "같은 이름의 분류를 중복해서 사용할 수 없습니다.";
    }
    return null;
  }, [draft, draftInputMode]);

  function updateCategory(id: string, field: "name" | "description", value: string) {
    setDraft((current) =>
      current.map((category) => (category.id === id ? { ...category, [field]: value } : category)),
    );
  }

  function addCategory() {
    if (draft.length >= 5) return;
    setDraft((current) => [
      ...current,
      {
        id: `category-${Date.now()}`,
        name: "",
        description: "",
        sortOrder: current.length,
      },
    ]);
  }

  function removeCategory(id: string) {
    if (draft.length <= 1) return;
    setDraft((current) => normalizeOrder(current.filter((category) => category.id !== id)));
  }

  function moveCategory(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= draft.length) return;

    setDraft((current) => {
      const reordered = [...current];
      const [target] = reordered.splice(index, 1);
      if (!target) return current;
      reordered.splice(targetIndex, 0, target);
      return normalizeOrder(reordered);
    });
  }

  function save() {
    if (validationMessage) return;
    onSave(
      draftInputMode,
      draftInputMode === "categorized"
        ? normalizeOrder(
            draft.map((category) => ({
              ...category,
              name: category.name.trim(),
              description: category.description.trim(),
            })),
          )
        : [],
    );
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="category-settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-settings-title"
      >
        <div className="category-settings-heading">
          <div>
            <h2 id="category-settings-title">환자 분류 설정</h2>
            <p>환자가 웨이팅을 등록할 때 선택할 분류를 설정합니다.</p>
          </div>
          {draftInputMode === "categorized" && <span>{draft.length}/5</span>}
        </div>

        <div className="notice notice--info">
          <Info size={20} />
          <div>
            <strong>변경 내용은 다음 날 대기열부터 적용됩니다</strong>
            <p>오늘 운영 중인 대기열과 이미 등록한 환자의 분류는 유지됩니다.</p>
          </div>
        </div>

        <div className="segmented-control category-mode-control" aria-label="환자 인원 입력 방식">
          <button
            className={draftInputMode === "categorized" ? "is-selected" : ""}
            type="button"
            onClick={() => setDraftInputMode("categorized")}
          >
            분류별 입력
          </button>
          <button
            className={draftInputMode === "total_only" ? "is-selected" : ""}
            type="button"
            onClick={() => setDraftInputMode("total_only")}
          >
            총인원만 입력
          </button>
        </div>

        {draftInputMode === "categorized" ? (
          <>
            <div className="category-settings-list">
              {draft.map((category, index) => (
                <div className="category-settings-row" key={category.id}>
                  <div className="category-order-actions">
                    <button
                      type="button"
                      aria-label={`${category.name || `${index + 1}번째 분류`} 위로 이동`}
                      onClick={() => moveCategory(index, -1)}
                      disabled={index === 0}
                    >
                      <ArrowUp size={17} />
                    </button>
                    <button
                      type="button"
                      aria-label={`${category.name || `${index + 1}번째 분류`} 아래로 이동`}
                      onClick={() => moveCategory(index, 1)}
                      disabled={index === draft.length - 1}
                    >
                      <ArrowDown size={17} />
                    </button>
                  </div>
                  <div className="category-inputs">
                    <label>
                      분류명
                      <input
                        value={category.name}
                        maxLength={20}
                        onChange={(event) =>
                          updateCategory(category.id, "name", event.target.value)
                        }
                        placeholder="예: 소아"
                      />
                    </label>
                    <label>
                      설명 <span>선택</span>
                      <input
                        value={category.description}
                        maxLength={50}
                        onChange={(event) =>
                          updateCategory(category.id, "description", event.target.value)
                        }
                        placeholder="예: 만 13세 미만"
                      />
                    </label>
                  </div>
                  <button
                    className="category-delete-button"
                    type="button"
                    aria-label={`${category.name || `${index + 1}번째 분류`} 삭제`}
                    onClick={() => removeCategory(category.id)}
                    disabled={draft.length === 1}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            <button
              className="secondary-button category-add-button"
              type="button"
              onClick={addCategory}
              disabled={draft.length >= 5}
            >
              <Plus size={18} /> 분류 추가
            </button>
          </>
        ) : (
          <div className="total-only-description">
            <UsersRound size={24} aria-hidden="true" />
            <div>
              <strong>분류 없이 총인원만 받습니다</strong>
              <p>환자와 직원 모두 함께 접수할 전체 인원만 입력합니다.</p>
            </div>
          </div>
        )}

        {validationMessage && <p className="field-error">{validationMessage}</p>}

        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            닫기
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={save}
            disabled={Boolean(validationMessage)}
          >
            다음 날 설정 저장
          </button>
        </div>
      </section>
    </div>
  );
}
