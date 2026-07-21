import { useEffect, useRef } from "react";
import { INGREDIENT_CATEGORIES } from "../data/ingredientDefaults";
import { getAllowedStorageOptions, getSuggestedShelfLifeDays, getSuggestedUseByDate, isCheckDateCategory } from "../data/shelfLifeRules";
import { getTodayDateString } from "../utils/expiration";
import { INGREDIENT_TAG_LABELS, INGREDIENT_TAGS } from "../../shared/ingredientTags";

const categoryOptions = Object.entries(INGREDIENT_CATEGORIES);

export default function IngredientForm({ formValues, errors, isEditing, isSubmitting, initialFocusField = "name", onChange, onBlur, onTagToggle, onApplySuggestedDate, onSubmit, onCancel }) {
  const nameRef = useRef(null);
  const quantityRef = useRef(null);
  const expiryRef = useRef(null);
  const allowedStorageOptions = getAllowedStorageOptions(formValues.category);
  const suggestedDays = getSuggestedShelfLifeDays(formValues.category, formValues.storage);
  const suggestedDate = getSuggestedUseByDate(formValues.category, formValues.storage);
  const isSuggestedValue = formValues.expirySource === "suggested" && formValues.expirationDate === suggestedDate;
  const recommendationLabel = isCheckDateCategory(formValues.category) ? "보유 상태 확인일" : "권장 사용 날짜";

  useEffect(() => {
    const focusTargets = { name: nameRef, quantity: quantityRef, expirationDate: expiryRef };
    focusTargets[initialFocusField]?.current?.focus();
  }, [initialFocusField]);

  return (
    <form className="ingredient-form" onSubmit={onSubmit}>
      <div className="field-group">
        <label htmlFor="ingredient-name">재료명</label>
        <input
          ref={nameRef}
          id="ingredient-name"
          name="name"
          value={formValues.name}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="예: 두부"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && <p className="field-error" id="name-error">{errors.name}</p>}
      </div>

      <div className="field-group">
        <label htmlFor="ingredient-quantity">수량</label>
        <input
          ref={quantityRef}
          id="ingredient-quantity"
          name="quantity"
          value={formValues.quantity}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="예: 1모"
          aria-invalid={Boolean(errors.quantity)}
          aria-describedby={errors.quantity ? "quantity-error" : undefined}
        />
        {errors.quantity && <p className="field-error" id="quantity-error">{errors.quantity}</p>}
      </div>

      <div className="form-split">
        <div className="field-group">
          <label htmlFor="ingredient-category">재료 분류</label>
          <select id="ingredient-category" name="category" value={formValues.category} onChange={onChange}>
            {categoryOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="ingredient-storage">보관 방법</label>
          <select id="ingredient-storage" name="storage" value={formValues.storage} onChange={onChange}>
            {allowedStorageOptions.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
      </div>

      <div className="field-group expiry-field">
        <div className="field-label-row"><label htmlFor="ingredient-expiry">{recommendationLabel}</label>{isSuggestedValue && <span>자동 제안</span>}</div>
        <input
          ref={expiryRef}
          id="ingredient-expiry"
          name="expirationDate"
          type="date"
          min={getTodayDateString()}
          value={formValues.expirationDate}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={Boolean(errors.expirationDate)}
          aria-describedby={errors.expirationDate ? "expiration-date-error" : "expiration-date-hint"}
        />
        <div className="expiry-recommendation" id="expiration-date-hint"><p>{suggestedDays}일 기준으로 <strong>{suggestedDate}</strong>을 제안했어요.</p>{!isSuggestedValue && <button type="button" onClick={onApplySuggestedDate}>권장값 적용</button>}</div>
        <p className="field-hint">재료 종류와 보관 방법을 기준으로 제안한 날짜예요. 포장지의 소비기한과 실제 상태를 우선해 주세요.</p>
        {errors.expirationDate && <p className="field-error" id="expiration-date-error">{errors.expirationDate}</p>}
      </div>

      <fieldset className="tag-fieldset">
        <legend>추천용 재료 태그</legend>
        <p>분류에 맞춰 자동으로 제안했어요. 실제 재료 성격에 맞게 조정할 수 있습니다.</p>
        <div className="tag-selector">
          {INGREDIENT_TAGS.map((tag) => <label key={tag} className={formValues.tags.includes(tag) ? "selected" : ""}>
            <input type="checkbox" checked={formValues.tags.includes(tag)} onChange={() => onTagToggle(tag)} />
            <span>{INGREDIENT_TAG_LABELS[tag]}</span>
          </label>)}
        </div>
      </fieldset>

      <div className="modal-actions">
        <button className="ghost-action" type="button" onClick={onCancel} disabled={isSubmitting}>취소</button>
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? "저장 중..." : isEditing ? "수정 완료" : "재료 추가하기"}</button>
      </div>
    </form>
  );
}
