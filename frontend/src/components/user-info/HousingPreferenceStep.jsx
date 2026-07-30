import {
  AVOID_CONDITION_OPTIONS,
  HOUSING_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
} from '../../utils/userInfoOptions'
import CheckboxGroup from './CheckboxGroup'

function HousingPreferenceStep({ form, updateField }) {
  return (
    <div className="preference-panel">
      <CheckboxGroup
        label="선호 주거 형태"
        name="housingTypes"
        options={HOUSING_TYPE_OPTIONS}
        values={form.housingTypes}
        updateField={updateField}
      />
      <CheckboxGroup
        label="중요하게 생각하는 조건"
        name="priorities"
        options={PRIORITY_OPTIONS}
        values={form.priorities}
        updateField={updateField}
      />
      <CheckboxGroup
        label="피하고 싶은 조건"
        name="avoidConditions"
        options={AVOID_CONDITION_OPTIONS}
        values={form.avoidConditions}
        updateField={updateField}
      />
    </div>
  )
}

export default HousingPreferenceStep
