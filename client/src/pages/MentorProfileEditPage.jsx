import { useState } from "react";
import { Link } from "react-router-dom";
import { routePaths } from "../routes/routePaths";
import { getMentorProfile, saveMentorProfile } from "../utils/mentorProfileStorage";

const counselingOptions = [
  "대학원 진학 준비",
  "연구 활동 관련",
  "대학원 생활",
  "취업",
  "해외 진학",
];

function createFormValues() {
  const savedProfile = getMentorProfile();

  return {
    personalInformation: savedProfile.personalInformation,
    profileInformation: {
      ...savedProfile.profileInformation,
      researchFields: savedProfile.profileInformation.researchFields.join(", "),
      careerHighlights: savedProfile.profileInformation.careerHighlights.join("\n"),
      internationalActivities: savedProfile.profileInformation.internationalActivities.join("\n"),
    },
  };
}

function splitValues(value, separator) {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function MentorProfileEditPage() {
  const [formValues, setFormValues] = useState(createFormValues);
  const [message, setMessage] = useState("");

  const handlePersonalChange = (event) => {
    const { name, value } = event.target;
    setFormValues((currentValues) => ({
      ...currentValues,
      personalInformation: {
        ...currentValues.personalInformation,
        [name]: value,
      },
    }));
    setMessage("");
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setFormValues((currentValues) => ({
      ...currentValues,
      profileInformation: {
        ...currentValues.profileInformation,
        [name]: value,
      },
    }));
    setMessage("");
  };

  const handleCounselingChange = (event) => {
    const { checked, value } = event.target;
    setFormValues((currentValues) => {
      const currentFields = currentValues.profileInformation.counselingFields;
      const counselingFields = checked
        ? [...currentFields, value]
        : currentFields.filter((field) => field !== value);

      return {
        ...currentValues,
        profileInformation: {
          ...currentValues.profileInformation,
          counselingFields,
        },
      };
    });
    setMessage("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const profileToSave = {
      personalInformation: formValues.personalInformation,
      profileInformation: {
        ...formValues.profileInformation,
        researchFields: splitValues(formValues.profileInformation.researchFields, ","),
        careerHighlights: splitValues(formValues.profileInformation.careerHighlights, "\n"),
        internationalActivities: splitValues(
          formValues.profileInformation.internationalActivities,
          "\n",
        ),
      },
    };
    const isSaved = saveMentorProfile(profileToSave);
    setMessage(
      isSaved
        ? "개인 정보와 프로필 정보가 저장되었습니다."
        : "저장하지 못했습니다. 다시 시도해 주세요.",
    );
  };

  const { personalInformation, profileInformation } = formValues;

  return (
    <div className="mentor-profile-edit-page">
      <header className="page-header mentor-profile-edit-header">
        <div>
          <p className="eyebrow">MENTOR PROFILE</p>
          <h1 className="page-title">개인 정보 및 프로필 수정</h1>
        </div>
        <Link className="button button-soft" to={routePaths.mentorHome}>
          멘토 홈으로
        </Link>
      </header>

      <main className="page-container mentor-profile-edit-container">
        <form className="mentor-profile-edit-form" onSubmit={handleSubmit}>
          <section className="card mentor-profile-edit-section" aria-labelledby="mentor-personal-title">
            <div className="mentor-section-heading">
              <div className="mentor-section-title-row">
                <span className="mentor-section-number" aria-hidden="true">01</span>
                <div>
                  <p className="eyebrow">PERSONAL INFORMATION</p>
                  <h2 className="card-title" id="mentor-personal-title">개인 정보 입력</h2>
                </div>
              </div>
              <p className="muted-text">계정과 연락에 사용하는 정보를 관리합니다.</p>
            </div>

            <div className="mentor-profile-edit-grid">
              <label className="mentor-field-group">
                <span className="mentor-field-label">이름</span>
                <input className="field" name="name" onChange={handlePersonalChange} required value={personalInformation.name} />
              </label>
              <label className="mentor-field-group">
                <span className="mentor-field-label">아이디</span>
                <input className="field" name="loginId" readOnly value={personalInformation.loginId} />
                <small>아이디는 변경할 수 없습니다.</small>
              </label>
              <label className="mentor-field-group">
                <span className="mentor-field-label">이메일 주소</span>
                <input className="field" name="email" onChange={handlePersonalChange} required type="email" value={personalInformation.email} />
              </label>
              <label className="mentor-field-group">
                <span className="mentor-field-label">연락처</span>
                <input className="field" name="phone" onChange={handlePersonalChange} required type="tel" value={personalInformation.phone} />
              </label>
            </div>
          </section>

          <section className="card mentor-profile-edit-section mentor-profile-section" aria-labelledby="mentor-profile-edit-title">
            <div className="mentor-section-heading">
              <div className="mentor-section-title-row">
                <span className="mentor-section-number" aria-hidden="true">02</span>
                <div>
                  <p className="eyebrow">PROFILE INFORMATION</p>
                  <h2 className="card-title" id="mentor-profile-edit-title">프로필 정보 입력</h2>
                </div>
              </div>
              <p className="muted-text">멘티의 멘토 선택 화면에 표시되는 정보입니다.</p>
            </div>

            <div className="mentor-profile-edit-grid">
              <label className="mentor-field-group">
                <span className="mentor-field-label">소속 학교</span>
                <input className="field" name="school" onChange={handleProfileChange} required value={profileInformation.school} />
              </label>
              <label className="mentor-field-group">
                <span className="mentor-field-label">전공</span>
                <input className="field" name="major" onChange={handleProfileChange} required value={profileInformation.major} />
              </label>
              <label className="mentor-field-group">
                <span className="mentor-field-label">학적</span>
                <select className="field" name="academicStatus" onChange={handleProfileChange} required value={profileInformation.academicStatus}>
                  <option value="석사과정">석사과정</option>
                  <option value="박사과정">박사과정</option>
                  <option value="석박통합과정">석박통합과정</option>
                  <option value="학석박통합과정">학석박통합과정</option>
                </select>
              </label>
              <label className="mentor-field-group">
                <span className="mentor-field-label">학과 및 과정</span>
                <input className="field" name="program" onChange={handleProfileChange} required value={profileInformation.program} />
              </label>
              <label className="mentor-field-group">
                <span className="mentor-field-label">연구실</span>
                <input className="field" name="lab" onChange={handleProfileChange} required value={profileInformation.lab} />
              </label>
              <label className="mentor-field-group">
                <span className="mentor-field-label">면담 가능 시간</span>
                <input className="field" name="availableTime" onChange={handleProfileChange} required value={profileInformation.availableTime} />
              </label>

              <label className="mentor-field-group mentor-profile-edit-wide">
                <span className="mentor-field-label">연구 주제 관련 해시태그</span>
                <input className="field" name="researchFields" onChange={handleProfileChange} required value={profileInformation.researchFields} />
                <small>쉼표로 구분해 입력해 주세요.</small>
              </label>

              <fieldset className="mentor-counseling-fieldset mentor-profile-edit-wide">
                <legend className="mentor-field-label">상담 분야</legend>
                <div className="mentor-counseling-options">
                  {counselingOptions.map((option) => (
                    <label className="mentor-counseling-option" key={option}>
                      <input
                        checked={profileInformation.counselingFields.includes(option)}
                        onChange={handleCounselingChange}
                        type="checkbox"
                        value={option}
                      />
                      <span>#{option}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="mentor-field-group mentor-profile-edit-wide">
                <span className="mentor-field-label">한 줄 소개</span>
                <textarea className="field mentor-profile-short-textarea" maxLength="120" name="introduction" onChange={handleProfileChange} required value={profileInformation.introduction} />
              </label>
              <label className="mentor-field-group mentor-profile-edit-wide">
                <span className="mentor-field-label">상세 소개</span>
                <textarea className="field" maxLength="600" name="detailedIntroduction" onChange={handleProfileChange} required value={profileInformation.detailedIntroduction} />
              </label>
              <label className="mentor-field-group mentor-profile-edit-wide">
                <span className="mentor-field-label">주요 이력</span>
                <textarea className="field" name="careerHighlights" onChange={handleProfileChange} required value={profileInformation.careerHighlights} />
                <small>항목마다 줄을 바꿔 입력해 주세요.</small>
              </label>
              <label className="mentor-field-group mentor-profile-edit-wide">
                <span className="mentor-field-label">해외 활동</span>
                <textarea className="field" name="internationalActivities" onChange={handleProfileChange} required value={profileInformation.internationalActivities} />
                <small>항목마다 줄을 바꿔 입력해 주세요.</small>
              </label>
            </div>
          </section>

          <p className="mentor-profile-edit-message" role="status" aria-live="polite">{message}</p>
          <div className="mentor-profile-edit-actions">
            <Link className="button button-neutral" to={routePaths.mentorHome}>취소</Link>
            <button className="button button-primary" type="submit">변경 내용 저장</button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default MentorProfileEditPage;
