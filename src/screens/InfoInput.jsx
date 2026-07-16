import { useRef, useState } from 'react';

const GRADE_OPTIONS = ['1학년', '2학년', '3학년', '4학년', '5학년 이상', '졸업유예'];

function InfoInput({ onSubmit, isSubmitting, submitError }) {
  const [university, setUniversity] = useState('');
  const [grade, setGrade] = useState('');
  const [major, setMajor] = useState('');
  const [doubleMajor, setDoubleMajor] = useState('');
  const [minor, setMinor] = useState('');
  const [earnedCredits, setEarnedCredits] = useState('');
  const [gpa, setGpa] = useState('');
  const [certificates, setCertificates] = useState([{ id: 1, value: '' }]);
  const [experience, setExperience] = useState('');
  const [errors, setErrors] = useState({
    university: false,
    grade: false,
    major: false,
    earnedCredits: false,
    gpa: false,
  });
  const nextCertificateId = useRef(2);

  function addCertificate() {
    setCertificates([...certificates, { id: nextCertificateId.current++, value: '' }]);
  }

  function updateCertificate(id, value) {
    setCertificates(certificates.map((cert) => (cert.id === id ? { ...cert, value } : cert)));
  }

  function removeCertificate(id) {
    setCertificates(certificates.filter((cert) => cert.id !== id));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {
      university: university.trim() === '',
      grade: grade === '',
      major: major.trim() === '',
      earnedCredits: earnedCredits.trim() === '',
      gpa: gpa.trim() === '',
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }

    onSubmit({
      university,
      grade,
      major,
      doubleMajor,
      minor,
      earnedCredits,
      gpa,
      certificates: certificates.map((cert) => cert.value).filter((value) => value.trim() !== ''),
      experience,
    });
  }

  return (
    <section className="card">
      <p className="eyebrow">STEP 1</p>
      <h1>내 정보를 입력해주세요</h1>
      <p className="subtitle">입력한 정보를 바탕으로 맞춤 공고를 추천해드려요.</p>

      <form onSubmit={handleSubmit} noValidate>
        <div className={`field${errors.university ? ' field-error' : ''}`}>
          <label htmlFor="university">대학교</label>
          <input
            id="university"
            type="text"
            className="field-input"
            placeholder="예: OO대학교"
            value={university}
            onChange={(event) => setUniversity(event.target.value)}
          />
          {errors.university && <p className="error-text">필수 항목입니다</p>}
        </div>

        <div className={`field${errors.grade ? ' field-error' : ''}`}>
          <label htmlFor="grade">학년</label>
          <select
            id="grade"
            className="field-input"
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
          >
            <option value="" disabled>
              학년 선택
            </option>
            {GRADE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {errors.grade && <p className="error-text">필수 항목입니다</p>}
        </div>

        <div className={`field${errors.major ? ' field-error' : ''}`}>
          <label htmlFor="major">전공</label>
          <input
            id="major"
            type="text"
            className="field-input"
            placeholder="예: 컴퓨터공학과"
            value={major}
            onChange={(event) => setMajor(event.target.value)}
          />
          {errors.major && <p className="error-text">필수 항목입니다</p>}
        </div>

        <div className="field">
          <label htmlFor="doubleMajor">
            복수전공 <span className="hint">(선택)</span>
          </label>
          <input
            id="doubleMajor"
            type="text"
            className="field-input"
            placeholder="예: 경영학과"
            value={doubleMajor}
            onChange={(event) => setDoubleMajor(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="minor">
            부전공 <span className="hint">(선택)</span>
          </label>
          <input
            id="minor"
            type="text"
            className="field-input"
            placeholder="예: 심리학과"
            value={minor}
            onChange={(event) => setMinor(event.target.value)}
          />
        </div>

        <div className={`field${errors.earnedCredits ? ' field-error' : ''}`}>
          <label htmlFor="earnedCredits">취득학점</label>
          <input
            id="earnedCredits"
            type="text"
            className="field-input"
            placeholder="예: 98"
            value={earnedCredits}
            onChange={(event) => setEarnedCredits(event.target.value)}
          />
          {errors.earnedCredits && <p className="error-text">필수 항목입니다</p>}
        </div>

        <div className={`field${errors.gpa ? ' field-error' : ''}`}>
          <label htmlFor="gpa">평균평점</label>
          <input
            id="gpa"
            type="text"
            className="field-input"
            placeholder="예: 3.8 / 4.5"
            value={gpa}
            onChange={(event) => setGpa(event.target.value)}
          />
          {errors.gpa && <p className="error-text">필수 항목입니다</p>}
        </div>

        <div className="field">
          <label>
            자격증 <span className="hint">(선택)</span>
          </label>
          {certificates.map((cert) => (
            <div className="field-row" key={cert.id}>
              <input
                type="text"
                className="field-input"
                placeholder="예: 정보처리기사"
                value={cert.value}
                onChange={(event) => updateCertificate(cert.id, event.target.value)}
              />
              {certificates.length > 1 && (
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => removeCertificate(cert.id)}
                  aria-label="자격증 삭제"
                >
                  삭제
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn-ghost" onClick={addCertificate}>
            + 자격증 추가
          </button>
        </div>

        <div className="field">
          <label htmlFor="experience">
            그 외 경험 <span className="hint">(현장실습 · 인턴 · 교육 등)</span>
          </label>
          <textarea
            id="experience"
            className="field-input field-textarea"
            placeholder="예: OO기업 하계 현장실습 2개월, 교내 창업 동아리 활동"
            value={experience}
            onChange={(event) => setExperience(event.target.value)}
          />
        </div>

        {submitError && <p className="error-text">{submitError}</p>}

        <button type="submit" className="btn-primary btn-block" disabled={isSubmitting}>
          {isSubmitting ? '추천 공고를 찾는 중...' : '추천받기'}
        </button>
      </form>
    </section>
  );
}

export default InfoInput;
