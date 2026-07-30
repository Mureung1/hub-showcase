import { DESTINATIONS, TRANSPORTATION_OPTIONS } from '../../utils/userInfoOptions'
import CheckboxGroup from './CheckboxGroup'

function CommuteStep({ errors, form, updateField }) {
  return (
    <div className="commute-step">
      <div className="field-stack">
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
          <label htmlFor="returnTime">주요 귀가 시간 <span className="optional-label">선택</span></label>
          <input
            id="returnTime"
            name="returnTime"
            type="time"
            value={form.returnTime}
            onChange={(event) => updateField('returnTime', event.target.value)}
          />
        </div>

        <div className="field-group">
          <label htmlFor="destination">주요 이동 목적지 <span className="optional-label">선택</span></label>
          <select
            id="destination"
            name="destination"
            value={form.destination}
            onChange={(event) => updateField('destination', event.target.value)}
          >
            <option value="">선택 안 함</option>
            {DESTINATIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="maxTravelTime">최대 이동 시간 <span className="optional-label">선택</span></label>
          <div className="input-with-unit">
            <input
              id="maxTravelTime"
              name="maxTravelTime"
              type="number"
              min="1"
              inputMode="numeric"
              value={form.maxTravelTime}
              onChange={(event) => updateField('maxTravelTime', event.target.value)}
              placeholder="예: 30"
              aria-describedby={errors.maxTravelTime ? 'max-travel-time-error' : undefined}
              aria-invalid={Boolean(errors.maxTravelTime)}
            />
            <span>분</span>
          </div>
          {errors.maxTravelTime && (
            <p className="error-text" id="max-travel-time-error">{errors.maxTravelTime}</p>
          )}
        </div>
      </div>

      <CheckboxGroup
        columns="two"
        label={<>선호 교통수단 <span className="optional-label">선택</span></>}
        name="transportation"
        options={TRANSPORTATION_OPTIONS}
        values={form.transportation}
        updateField={updateField}
      />
    </div>
  )
}

export default CommuteStep
