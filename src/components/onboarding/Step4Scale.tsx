import { useOnboarding } from '../../context/OnboardingContext'
import {
  BUSINESS_YEARS_OPTIONS,
  EMPLOYEE_OPTIONS,
  REVENUE_OPTIONS,
} from '../../data/onboardingSteps'
import OptionButton from '../OptionButton'

const EMPLOYEE_VALUES = new Set(EMPLOYEE_OPTIONS.map((o) => o.value))

/** step4 — 직원 수 + 연매출 + 업력 선택 완료 여부 (이슈 #51) */
export function isStep4Complete(
  employees: string,
  revenue: string,
  businessYears: string,
): boolean {
  return (
    EMPLOYEE_VALUES.has(employees) &&
    REVENUE_OPTIONS.includes(revenue) &&
    BUSINESS_YEARS_OPTIONS.includes(businessYears)
  )
}

/** step4 — 직원 수 옵션 + 연매출 select + 업력 select */
export default function Step4Scale() {
  const { profile, setField } = useOnboarding()

  return (
    <>
      <div className="field-label field-label--employees">직원 수</div>
      <div className="options">
        {EMPLOYEE_OPTIONS.map((opt) => (
          <OptionButton
            key={opt.value}
            label={opt.label}
            icon={opt.icon}
            selected={profile.employees === opt.value}
            onClick={() => setField('employees', opt.value)}
          />
        ))}
      </div>

      <div className="field-group field-group--revenue">
        <div className="field-label">연매출</div>
        <div className="select-wrap">
          <select
            value={profile.revenue}
            onChange={(e) => setField('revenue', e.target.value)}
          >
            <option value="" disabled>
              연매출 구간을 선택하세요
            </option>
            {REVENUE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="field-group field-group--business-years">
        <div className="field-label">업력</div>
        <div className="select-wrap">
          <select
            value={profile.businessYears ?? ''}
            onChange={(e) => setField('businessYears', e.target.value)}
          >
            <option value="" disabled>
              업력을 선택하세요
            </option>
            {BUSINESS_YEARS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  )
}
