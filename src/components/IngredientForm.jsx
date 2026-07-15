import { useEffect, useRef } from "react";

const categoryOptions = ["단백질", "채소", "주식", "소스/양념", "간편식"];

export default function IngredientForm({ formValues, errors, isEditing, isSubmitting, initialFocusField = "name", onChange, onBlur, onSubmit, onCancel }) {
  const nameRef = useRef(null);
  const quantityRef = useRef(null);
  const expiryRef = useRef(null);
  const expiryDays = Number(formValues.expiryDays);
  const ddayHint = formValues.expiryDays === "" || !Number.isInteger(expiryDays) || expiryDays < 0
    ? "남은 일수를 입력하면 D-day로 표시됩니다."
    : expiryDays === 0 ? "D-Day로 표시됩니다." : `D-${expiryDays}로 표시됩니다.`;

  useEffect(() => {
    const focusTargets = { name: nameRef, quantity: quantityRef, expiryDays: expiryRef };
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

      <div className="field-group">
        <label htmlFor="ingredient-expiry">소비기한</label>
        <input
          ref={expiryRef}
          id="ingredient-expiry"
          name="expiryDays"
          type="number"
          min="0"
          step="1"
          value={formValues.expiryDays}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="예: 5"
          aria-invalid={Boolean(errors.expiryDays)}
          aria-describedby={errors.expiryDays ? "expiry-days-error" : undefined}
        />
        <p className="field-hint">{ddayHint}</p>
        {errors.expiryDays && <p className="field-error" id="expiry-days-error">{errors.expiryDays}</p>}
      </div>

      <div className="form-split">
        <div className="field-group">
          <label htmlFor="ingredient-storage">보관 위치</label>
          <select id="ingredient-storage" name="storage" value={formValues.storage} onChange={onChange}>
            <option value="fridge">냉장</option>
            <option value="freezer">냉동</option>
            <option value="pantry">실온</option>
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="ingredient-category">분류</label>
          <select id="ingredient-category" name="category" value={formValues.category} onChange={onChange}>
            {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </div>
      </div>

      <div className="modal-actions">
        <button className="ghost-action" type="button" onClick={onCancel} disabled={isSubmitting}>취소</button>
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? "저장 중..." : isEditing ? "수정 완료" : "재료 추가하기"}</button>
      </div>
    </form>
  );
}
