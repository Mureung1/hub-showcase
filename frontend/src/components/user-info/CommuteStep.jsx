function CommuteStep({ errors, form, updateField }) {
  return (
    <div className="form-grid">
      <div className="field-group">
        <label htmlFor="commuteDaysPerWeek">주당 등교 횟수</label>
        <select
          id="commuteDaysPerWeek"
          name="commuteDaysPerWeek"
          value={form.commuteDaysPerWeek}
          onChange={(event) => updateField('commuteDaysPerWeek', event.target.value)}
          aria-describedby={errors.commuteDaysPerWeek ? 'commute-error' : undefined}
          aria-invalid={Boolean(errors.commuteDaysPerWeek)}
        >
          <option value="">선택해주세요</option>
          <option value="1">1회</option>
          <option value="2">2회</option>
          <option value="3">3회</option>
          <option value="4">4회</option>
          <option value="5">5회 이상</option>
        </select>
        {errors.commuteDaysPerWeek && (
          <p className="error-text" id="commute-error">{errors.commuteDaysPerWeek}</p>
        )}
      </div>

      <div className="field-group">
        <label htmlFor="returnTime">주요 귀가 시간</label>
        <input
          id="returnTime"
          name="returnTime"
          type="time"
          value={form.returnTime}
          onChange={(event) => updateField('returnTime', event.target.value)}
          aria-describedby={errors.returnTime ? 'return-time-error' : undefined}
          aria-invalid={Boolean(errors.returnTime)}
        />
        {errors.returnTime && (
          <p className="error-text" id="return-time-error">{errors.returnTime}</p>
        )}
      </div>
    </div>
  )
}

export default CommuteStep
