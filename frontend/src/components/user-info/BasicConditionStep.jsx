import { CONTRACT_TYPES, NATIONAL_FLAGSHIP_UNIVERSITIES } from '../../utils/userInfoOptions'

function BasicConditionStep({ errors, form, updateField }) {
  return (
    <div className="field-stack">
      <div className="field-group">
        <label htmlFor="school">소속 학교</label>
        <select
          id="school"
          name="school"
          value={form.school}
          onChange={(event) => updateField('school', event.target.value)}
          aria-describedby={errors.school ? 'school-helper school-error' : 'school-helper'}
          aria-invalid={Boolean(errors.school)}
        >
          <option value="">학교를 선택해주세요</option>
          {NATIONAL_FLAGSHIP_UNIVERSITIES.map((school) => (
            <option key={school} value={school}>{school}</option>
          ))}
        </select>
        <p className="helper-text" id="school-helper">
          현재는 국가거점국립대 10개교를 기준으로 분석합니다.
        </p>
        {errors.school && <p className="error-text" id="school-error">{errors.school}</p>}
      </div>

      <div className="field-group">
        <label htmlFor="contractType">계약 유형</label>
        <select
          id="contractType"
          name="contractType"
          value={form.contractType}
          onChange={(event) => updateField('contractType', event.target.value)}
          aria-describedby={errors.contractType ? 'contract-type-error' : undefined}
          aria-invalid={Boolean(errors.contractType)}
        >
          <option value="">선택해주세요</option>
          {CONTRACT_TYPES.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {errors.contractType && (
          <p className="error-text" id="contract-type-error">{errors.contractType}</p>
        )}
      </div>

      <div className="field-group">
        <label htmlFor="moveInDate">입주 희망 시기 <span className="optional-label">선택</span></label>
        <input
          id="moveInDate"
          name="moveInDate"
          type="month"
          value={form.moveInDate}
          onChange={(event) => updateField('moveInDate', event.target.value)}
        />
      </div>
    </div>
  )
}

export default BasicConditionStep
