function BudgetStep({ errors, form, updateField }) {
  return (
    <div className="field-group">
      <label htmlFor="budget">월 주거 예산</label>
      <div className="input-with-unit">
        <input
          id="budget"
          name="budget"
          type="number"
          min="1"
          inputMode="numeric"
          value={form.budget}
          onChange={(event) => updateField('budget', event.target.value)}
          placeholder="예: 600000"
          aria-describedby="budget-helper budget-error"
          aria-invalid={Boolean(errors.budget)}
        />
        <span>원</span>
      </div>
      <p className="helper-text" id="budget-helper">월세와 관리비까지 감당 가능한 월 기준 금액을 입력해주세요.</p>
      {errors.budget && <p className="error-text" id="budget-error">{errors.budget}</p>}
    </div>
  )
}

export default BudgetStep
