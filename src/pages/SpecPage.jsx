import { useNavigate } from 'react-router-dom'
import {
  EDUCATION_OPTIONS,
  MAJOR_OPTIONS,
  CERT_OPTIONS,
  FOREIGN_LANG_TEST_OPTIONS,
} from '../constants/specOptions'
import { useAppState } from '../context/AppStateContext'

function SpecPage() {
  const navigate = useNavigate()
  const { spec, setSpec: patchSpec } = useAppState()

  function toggleCertificate(cert) {
    patchSpec({
      certificates: spec.certificates.includes(cert)
        ? spec.certificates.filter((c) => c !== cert)
        : [...spec.certificates, cert],
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    // 실제 데이터(spec/filters)는 이미 Context에 있으니 라우터 state로는 "방금 제출했다"는
    // 신호만 넘긴다 — ResultPage가 이 플래그로 "새로 분석 요청" vs "새로고침 시 결과 복원"을 구분한다.
    navigate('/result', { state: { fresh: true } })
  }

  return (
    <div className="screen">
      <h1>2단계 · 스펙 입력</h1>
      <p className="sub">입력한 스펙은 이전 단계에서 고른 공고들과 항목별로 대조됩니다.</p>

      <form className="field-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">학력</span>
          <select
            value={spec.education}
            onChange={(e) => patchSpec({ education: e.target.value })}
          >
            {EDUCATION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">경력</span>
          <div className="row">
            <select
              value={spec.isExperienced ? '경력' : '신입'}
              onChange={(e) =>
                patchSpec({
                  isExperienced: e.target.value === '경력',
                  career_months: e.target.value === '경력' ? spec.career_months : 0,
                })
              }
            >
              <option value="신입">신입</option>
              <option value="경력">경력</option>
            </select>
            {spec.isExperienced && (
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="경력 개월 수"
                value={spec.career_months || ''}
                onChange={(e) =>
                  patchSpec({ career_months: Number(e.target.value.replace(/\D/g, '')) || 0 })
                }
              />
            )}
          </div>
        </label>

        <label className="field">
          <span className="field-label">전공</span>
          <select value={spec.major} onChange={(e) => patchSpec({ major: e.target.value })}>
            {MAJOR_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="field-label">외국어 성적</span>
          <div className="row">
            <select
              value={spec.foreign_lang_test}
              onChange={(e) =>
                patchSpec({
                  foreign_lang_test: e.target.value,
                  foreign_lang_score: e.target.value ? spec.foreign_lang_score : 0,
                })
              }
            >
              <option value="">없음</option>
              {FOREIGN_LANG_TEST_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {spec.foreign_lang_test && (
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="점수"
                value={spec.foreign_lang_score || ''}
                onChange={(e) =>
                  patchSpec({ foreign_lang_score: Number(e.target.value.replace(/\D/g, '')) || 0 })
                }
              />
            )}
          </div>
        </label>

        <div className="field field-full">
          <span className="field-label">보유 자격증/면허</span>
          <div className="chip-row">
            {CERT_OPTIONS.map((cert) => (
              <button
                type="button"
                key={cert}
                className={`chip-btn${spec.certificates.includes(cert) ? ' active' : ''}`}
                onClick={() => toggleCertificate(cert)}
              >
                {cert}
              </button>
            ))}
          </div>
        </div>

        <label className="field field-full">
          <span className="field-label">
            컴퓨터활용능력 보유 여부 (우대 항목 · 지원가능 판정엔 영향 없음)
          </span>
          <div className="row" style={{ alignItems: 'center' }}>
            <input
              type="checkbox"
              style={{ width: 16, height: 16, flex: 'none' }}
              checked={spec.has_computer_skill}
              onChange={(e) => patchSpec({ has_computer_skill: e.target.checked })}
            />
            <span style={{ fontSize: 13 }}>보유하고 있음</span>
          </div>
        </label>

        <div className="btn-row field-full">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/filter')}
          >
            이전
          </button>
          <button type="submit" className="btn-primary">
            갭 분석 결과 보기
          </button>
        </div>
      </form>
    </div>
  )
}

export default SpecPage
