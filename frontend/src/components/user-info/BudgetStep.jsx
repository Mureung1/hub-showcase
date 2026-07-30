function BudgetStep({ errors, form, updateField }) {
  return (
    <div className="budget-step">
      <div className="form-grid">
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
              placeholder="예: 60"
              aria-describedby={errors.budget ? 'budget-helper budget-error' : 'budget-helper'}
              aria-invalid={Boolean(errors.budget)}
            />
            <span>만원</span>
          </div>
          <p className="helper-text" id="budget-helper">
            월세와 관리비까지 감당 가능한 월 기준 금액입니다.
          </p>
          {errors.budget && <p className="error-text" id="budget-error">{errors.budget}</p>}
        </div>

        <div className="field-group">
          <label htmlFor="maxDeposit">최대 보증금 <span className="optional-label">선택</span></label>
          <div className="input-with-unit">
            <input
              id="maxDeposit"
              name="maxDeposit"
              type="number"
              min="0"
              inputMode="numeric"
              value={form.maxDeposit}
              onChange={(event) => updateField('maxDeposit', event.target.value)}
              placeholder="예: 500"
              aria-describedby={errors.maxDeposit ? 'max-deposit-error' : undefined}
              aria-invalid={Boolean(errors.maxDeposit)}
            />
            <span>만원</span>
          </div>
          {errors.maxDeposit && (
            <p className="error-text" id="max-deposit-error">{errors.maxDeposit}</p>
          )}
        </div>

        <div className="field-group">
          <label htmlFor="maxMonthlyRent">최대 월세 <span className="optional-label">선택</span></label>
          <div className="input-with-unit">
            <input
              id="maxMonthlyRent"
              name="maxMonthlyRent"
              type="number"
              min="0"
              inputMode="numeric"
              value={form.maxMonthlyRent}
              onChange={(event) => updateField('maxMonthlyRent', event.target.value)}
              placeholder="예: 45"
              aria-describedby={errors.maxMonthlyRent ? 'max-monthly-rent-error' : undefined}
              aria-invalid={Boolean(errors.maxMonthlyRent)}
            />
            <span>만원</span>
          </div>
          {errors.maxMonthlyRent && (
            <p className="error-text" id="max-monthly-rent-error">{errors.maxMonthlyRent}</p>
          )}
        </div>

        <div className="field-group">
          <label htmlFor="maxMaintenanceFee">최대 관리비 <span className="optional-label">선택</span></label>
          <div className="input-with-unit">
            <input
              id="maxMaintenanceFee"
              name="maxMaintenanceFee"
              type="number"
              min="0"
              inputMode="numeric"
              value={form.maxMaintenanceFee}
              onChange={(event) => updateField('maxMaintenanceFee', event.target.value)}
              placeholder="예: 10"
              aria-describedby={errors.maxMaintenanceFee ? 'max-maintenance-fee-error' : undefined}
              aria-invalid={Boolean(errors.maxMaintenanceFee)}
            />
            <span>만원</span>
          </div>
          {errors.maxMaintenanceFee && (
            <p className="error-text" id="max-maintenance-fee-error">{errors.maxMaintenanceFee}</p>
          )}
        </div>
      </div>

      <label className="inline-check">
        <input
          type="checkbox"
          checked={form.useTotalBudget}
          onChange={(event) => updateField('useTotalBudget', event.target.checked)}
        />
        <span>월세와 관리비를 합친 총액 기준으로 판단해주세요.</span>
      </label>
    </div>
  )
}

export default BudgetStep
