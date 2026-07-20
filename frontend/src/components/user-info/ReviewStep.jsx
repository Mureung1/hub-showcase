function ReviewStep({ form, saved, summaryItems, updateField }) {
  return (
    <div className="review-panel">
      <div className="field-group">
        <label htmlFor="gender">성별 <span className="optional-label">선택</span></label>
        <select
          id="gender"
          name="gender"
          value={form.gender}
          onChange={(event) => updateField('gender', event.target.value)}
        >
          <option value="">선택 안 함</option>
          <option value="여성">여성</option>
          <option value="남성">남성</option>
          <option value="기타">기타</option>
        </select>
      </div>

      <fieldset className="choice-field">
        <legend>자취 경험 여부 <span className="optional-label">선택</span></legend>
        <div className="choice-grid">
          <label className={form.hasLivingAloneExperience === 'yes' ? 'choice-card selected' : 'choice-card'}>
            <input
              type="radio"
              name="hasLivingAloneExperience"
              value="yes"
              checked={form.hasLivingAloneExperience === 'yes'}
              onChange={(event) => updateField('hasLivingAloneExperience', event.target.value)}
            />
            <span>있음</span>
            <small>계약 경험이 있어요</small>
          </label>
          <label className={form.hasLivingAloneExperience === 'no' ? 'choice-card selected' : 'choice-card'}>
            <input
              type="radio"
              name="hasLivingAloneExperience"
              value="no"
              checked={form.hasLivingAloneExperience === 'no'}
              onChange={(event) => updateField('hasLivingAloneExperience', event.target.value)}
            />
            <span>없음</span>
            <small>처음 자취를 준비해요</small>
          </label>
        </div>
      </fieldset>

      <dl className="summary-list">
        {summaryItems.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {saved && (
        <p className="success-message" role="status">
          사용자 정보가 이 브라우저에 저장되었습니다.
        </p>
      )}
    </div>
  )
}

export default ReviewStep
