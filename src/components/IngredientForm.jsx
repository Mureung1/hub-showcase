const categoryOptions = ["단백질", "채소", "주식", "소스/양념", "간편식"];

export default function IngredientForm({ formValues, errors, isEditing, isSubmitting, onChange, onSubmit, onCancel }) {
  const expiryDays = Number(formValues.expiryDays);
  const ddayHint = formValues.expiryDays === "" || !Number.isInteger(expiryDays) || expiryDays < 0
    ? "남은 일수를 입력하면 D-day로 표시됩니다."
    : expiryDays === 0 ? "D-Day로 표시됩니다." : `D-${expiryDays}로 표시됩니다.`;

  return (
    <form className="ingredient-form" onSubmit={onSubmit}>
      <label>
        <span>재료명</span>
        <input
          name="name"
          value={formValues.name}
          onChange={onChange}
          placeholder="예: 두부"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
        {errors.name && <p className="field-error" id="name-error">{errors.name}</p>}
      </label>

      <label>
        <span>수량</span>
        <input
          name="quantity"
          value={formValues.quantity}
          onChange={onChange}
          placeholder="예: 1모"
          aria-invalid={Boolean(errors.quantity)}
          aria-describedby={errors.quantity ? "quantity-error" : undefined}
        />
        {errors.quantity && <p className="field-error" id="quantity-error">{errors.quantity}</p>}
      </label>

      <label>
        <span>소비까지 남은 일수</span>
        <input
          name="expiryDays"
          type="number"
          min="0"
          step="1"
          value={formValues.expiryDays}
          onChange={onChange}
          placeholder="예: 5"
          aria-invalid={Boolean(errors.expiryDays)}
          aria-describedby={errors.expiryDays ? "expiry-days-error" : undefined}
        />
        <p className="field-hint">{ddayHint}</p>
        {errors.expiryDays && <p className="field-error" id="expiry-days-error">{errors.expiryDays}</p>}
      </label>

      <div className="form-split">
        <label>
          <span>보관위치</span>
          <select name="storage" value={formValues.storage} onChange={onChange}>
            <option value="fridge">냉장</option>
            <option value="freezer">냉동</option>
            <option value="pantry">실온</option>
          </select>
        </label>

        <label>
          <span>분류</span>
          <select name="category" value={formValues.category} onChange={onChange}>
            {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
      </div>

      <button type="submit" disabled={isSubmitting}>{isSubmitting ? "등록 중..." : isEditing ? "수정 완료" : "냉장고에 담기"}</button>
      {isEditing && <button className="ghost-action" type="button" onClick={() => onCancel()} disabled={isSubmitting}>수정 취소</button>}
    </form>
  );
}
