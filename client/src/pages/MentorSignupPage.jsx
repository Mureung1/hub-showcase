import { useState } from "react";
import { Link } from "react-router-dom";
import Brand from "../components/Brand";

const counselingOptions = [
  "대학원 진학 준비",
  "연구 활동 관련",
  "대학원 생활",
  "취업",
  "해외 진학",
];

function MentorSignupPage() {
  const [researchKeywords, setResearchKeywords] = useState([0, 1, 2]);
  const [nextResearchKeywordId, setNextResearchKeywordId] = useState(3);
  const [counselingFields, setCounselingFields] = useState([{ id: 0, value: "" }]);
  const [nextCounselingFieldId, setNextCounselingFieldId] = useState(1);

  const addResearchKeyword = () => {
    if (researchKeywords.length >= 8) return;
    setResearchKeywords((keywords) => [...keywords, nextResearchKeywordId]);
    setNextResearchKeywordId((id) => id + 1);
  };

  const removeResearchKeyword = (keywordId) => {
    if (researchKeywords.length <= 3) return;
    setResearchKeywords((keywords) => keywords.filter((id) => id !== keywordId));
  };

  const addCounselingField = () => {
    if (counselingFields.length >= 5) return;
    setCounselingFields((fields) => [...fields, { id: nextCounselingFieldId, value: "" }]);
    setNextCounselingFieldId((id) => id + 1);
  };

  const updateCounselingField = (fieldId, value) => {
    setCounselingFields((fields) => (
      fields.map((field) => (field.id === fieldId ? { ...field, value } : field))
    ));
  };

  const removeCounselingField = (fieldId) => {
    if (counselingFields.length <= 1) return;
    setCounselingFields((fields) => fields.filter((field) => field.id !== fieldId));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
  };

  return (
    <div className="mentor-signup-page">
      <header className="page-header signup-header">
        <Brand />
        <Link className="button button-neutral" to="/signup">역할 다시 선택</Link>
      </header>

      <main className="page-container mentor-signup-container">
        <section className="mentor-signup-heading" aria-labelledby="mentor-signup-title">
          <p className="eyebrow">MENTOR SIGN UP</p>
          <h1 className="page-title" id="mentor-signup-title">멘토 회원가입</h1>
          <p className="body-text">멘티에게 경험을 나누기 위한 기본 정보와 프로필을 입력해 주세요.</p>
        </section>

        <form className="mentor-signup-form" onSubmit={handleSubmit}>
          <section className="card mentor-signup-section" aria-labelledby="mentor-account-title">
            <div className="mentor-section-heading">
              <div className="mentor-section-title-row">
                <span className="mentor-section-number" aria-hidden="true">01</span>
                <div>
                  <p className="eyebrow">ACCOUNT</p>
                  <h2 className="card-title" id="mentor-account-title">개인정보 입력</h2>
                </div>
              </div>
              <p className="muted-text"><span aria-hidden="true">*</span> 표시는 필수 입력 항목입니다.</p>
            </div>

            <div className="mentor-field-list">
              <label className="mentor-field-group">
                <span className="mentor-field-label">이름 <span aria-hidden="true">*</span></span>
                <input className="field" type="text" name="name" autoComplete="name" placeholder="이름을 입력해 주세요" required />
              </label>

              <label className="mentor-field-group">
                <span className="mentor-field-label">닉네임 <span aria-hidden="true">*</span></span>
                <input className="field" type="text" name="nickname" autoComplete="nickname" placeholder="서비스에서 사용할 닉네임을 입력해 주세요" required />
              </label>

              <label className="mentor-field-group">
                <span className="mentor-field-label">아이디 <span aria-hidden="true">*</span></span>
                <input className="field" type="text" name="username" autoComplete="username" placeholder="영문과 숫자를 조합해 입력해 주세요" required />
              </label>

              <label className="mentor-field-group">
                <span className="mentor-field-label">비밀번호 <span aria-hidden="true">*</span></span>
                <input className="field" type="password" name="password" autoComplete="new-password" placeholder="8자 이상 입력해 주세요" minLength="8" required />
              </label>

              <div className="mentor-field-group">
                <label className="mentor-field-label" htmlFor="mentor-email">이메일 주소 <span aria-hidden="true">*</span></label>
                <div className="mentor-email-row">
                  <input className="field" id="mentor-email" type="email" name="email" autoComplete="email" placeholder="example@email.com" required />
                  <button className="button button-soft mentor-email-button" type="button">인증</button>
                </div>
              </div>

            </div>
          </section>

          <section className="card mentor-signup-section mentor-profile-section" aria-labelledby="mentor-profile-title">
            <div className="mentor-section-heading">
              <div className="mentor-section-title-row">
                <span className="mentor-section-number" aria-hidden="true">02</span>
                <div>
                  <p className="eyebrow">PROFILE</p>
                  <h2 className="card-title" id="mentor-profile-title">프로필 정보 입력</h2>
                </div>
              </div>
              <p className="muted-text">멘티가 멘토를 선택할 때 확인하는 정보입니다.</p>
            </div>

            <div className="mentor-field-list">
              <label className="mentor-field-group">
                <span className="mentor-field-label">소속 학교 <span aria-hidden="true">*</span></span>
                <input className="field" type="text" name="school" placeholder="학교명을 입력해 주세요" required />
              </label>

              <div className="mentor-profile-grid">
                <label className="mentor-field-group">
                  <span className="mentor-field-label">전공 <span aria-hidden="true">*</span></span>
                  <input className="field" type="text" name="major" placeholder="전공명을 입력해 주세요" required />
                </label>

                <label className="mentor-field-group">
                  <span className="mentor-field-label">학적 <span aria-hidden="true">*</span></span>
                  <select className="field" name="academicProgram" defaultValue="" required>
                    <option value="" disabled>학적을 선택해 주세요</option>
                    <option value="master">석사</option>
                    <option value="doctorate">박사</option>
                    <option value="combined-master-doctorate">석박 통합</option>
                    <option value="combined-bachelor-master-doctorate">학석박 통합</option>
                  </select>
                </label>

              </div>

              <label className="mentor-field-group">
                <span className="mentor-field-label">연구실 <span aria-hidden="true">*</span></span>
                <input className="field" type="text" name="lab" placeholder="소속 연구실을 입력해 주세요" required />
              </label>

              <fieldset className="mentor-keyword-fieldset">
                <legend className="sr-only">연구 주제 관련 해시태그</legend>
                <div className="mentor-keyword-heading">
                  <div>
                    <span className="mentor-field-label">연구 주제 관련 해시태그 <span aria-hidden="true">*</span></span>
                    <p className="muted-text">핵심 연구 키워드를 자유롭게 입력해 주세요.</p>
                  </div>
                  <div className="mentor-keyword-controls">
                    <span className="tag">{researchKeywords.length} / 8</span>
                    <button
                      className="button button-soft keyword-add-button"
                      type="button"
                      onClick={addResearchKeyword}
                      disabled={researchKeywords.length >= 8}
                      aria-label="연구 주제 키워드 추가"
                    >
                      <span aria-hidden="true">+</span>
                    </button>
                  </div>
                </div>

                <div className="mentor-keyword-list">
                  {researchKeywords.map((keywordId, index) => (
                    <div className="mentor-keyword-row" key={keywordId}>
                      <label className="sr-only" htmlFor={`research-keyword-${keywordId}`}>연구 주제 키워드 {index + 1}</label>
                      <span className="keyword-prefix" aria-hidden="true">#</span>
                      <input
                        className="field keyword-field"
                        id={`research-keyword-${keywordId}`}
                        type="text"
                        name={`researchKeyword${index + 1}`}
                        placeholder={`연구 키워드 ${index + 1}`}
                        required
                      />
                      {researchKeywords.length > 3 && (
                        <button
                          className="keyword-remove-button"
                          type="button"
                          onClick={() => removeResearchKeyword(keywordId)}
                          aria-label={`연구 주제 키워드 ${index + 1} 삭제`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </fieldset>

              <fieldset className="mentor-keyword-fieldset">
                <legend className="sr-only">상담 분야 관련 해시태그</legend>
                <div className="mentor-keyword-heading">
                  <div>
                    <span className="mentor-field-label">상담 분야 관련 해시태그 <span aria-hidden="true">*</span></span>
                    <p className="muted-text">자신 있는 상담 분야를 선택해 주세요.</p>
                  </div>
                  <div className="mentor-keyword-controls">
                    <span className="tag">{counselingFields.length} / 5</span>
                    <button
                      className="button button-soft keyword-add-button"
                      type="button"
                      onClick={addCounselingField}
                      disabled={counselingFields.length >= 5}
                      aria-label="상담 분야 키워드 추가"
                    >
                      <span aria-hidden="true">+</span>
                    </button>
                  </div>
                </div>

                <div className="mentor-keyword-list">
                  {counselingFields.map((field, index) => {
                    const selectedValues = counselingFields
                      .filter((item) => item.id !== field.id)
                      .map((item) => item.value);

                    return (
                      <div className="mentor-keyword-row counseling-keyword-row" key={field.id}>
                        <label className="sr-only" htmlFor={`counseling-field-${field.id}`}>상담 분야 {index + 1}</label>
                        <span className="keyword-prefix" aria-hidden="true">#</span>
                        <select
                          className="field"
                          id={`counseling-field-${field.id}`}
                          name={`counselingField${index + 1}`}
                          value={field.value}
                          onChange={(event) => updateCounselingField(field.id, event.target.value)}
                          required
                        >
                          <option value="" disabled>상담 분야를 선택해 주세요</option>
                          {counselingOptions.map((option) => (
                            <option value={option} disabled={selectedValues.includes(option)} key={option}>{option}</option>
                          ))}
                        </select>
                        {counselingFields.length > 1 && (
                          <button
                            className="keyword-remove-button"
                            type="button"
                            onClick={() => removeCounselingField(field.id)}
                            aria-label={`상담 분야 ${index + 1} 삭제`}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </fieldset>

              <label className="mentor-field-group">
                <span className="mentor-field-label">한 줄 소개 <span aria-hidden="true">*</span></span>
                <textarea className="field mentor-intro-field" name="introduction" maxLength="120" placeholder="연구 분야와 멘토링 방향을 120자 이내로 소개해 주세요" required />
              </label>

              <label className="mentor-field-group">
                <span className="mentor-field-label">상세 소개 <span aria-hidden="true">*</span></span>
                <textarea className="field mentor-detail-field" name="detailedIntroduction" maxLength="600" placeholder="연구 분야, 관심 주제와 멘토링 방향을 자세히 소개해 주세요" required />
              </label>

              <label className="mentor-field-group">
                <span className="mentor-field-label">주요 이력 <span aria-hidden="true">*</span></span>
                <textarea className="field mentor-detail-field" name="careerHighlights" maxLength="600" placeholder="연구, 프로젝트, 수상 등 주요 이력을 입력해 주세요" required />
              </label>

              <label className="mentor-field-group">
                <span className="mentor-field-label">해외 활동 <span aria-hidden="true">*</span></span>
                <textarea className="field mentor-detail-field" name="internationalExperience" maxLength="600" placeholder="교환학생, 해외 연구, 학회 참석 등 해외 활동을 입력해 주세요" required />
              </label>
            </div>
          </section>

          <div className="mentor-signup-actions">
            <Link className="button button-neutral" to="/signup">이전</Link>
            <button className="button button-primary" type="submit">가입하기</button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default MentorSignupPage;
