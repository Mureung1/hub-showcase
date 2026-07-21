import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyMentorProfile, updateMyMentorProfile } from "../api/mentors";
import { routePaths } from "../routes/routePaths";

const counselingOptions = [
  "대학원 진학 준비",
  "연구 활동 관련",
  "대학원 생활",
  "취업",
  "해외 진학",
];

function toFormValues(profile) {
  return {
    personalInformation: {
      name: profile.name,
      nickname: profile.nickname,
      email: profile.email,
    },
    profileInformation: {
      school: profile.school,
      major: profile.major,
      academicStatus: profile.academicStatus,
      program: profile.program,
      lab: profile.lab,
      availableTime: profile.availableTime,
      introduction: profile.introduction,
      detailedIntroduction: profile.detailedIntroduction,
      researchFields: profile.researchFields.join(", "),
      counselingFields: profile.counselingFields,
      careerHighlights: profile.careerHighlights.join("\n"),
      internationalActivities: profile.internationalActivities.join("\n"),
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
  const [formValues, setFormValues] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    getMyMentorProfile()
      .then((response) => {
        if (!isCancelled) setFormValues(toFormValues(response.data));
      })
      .catch((error) => {
        if (!isCancelled) setMessage(error.message);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { profileInformation } = formValues;
    const payload = {
      nickname: formValues.personalInformation.nickname,
      school: profileInformation.school,
      major: profileInformation.major,
      academicStatus: profileInformation.academicStatus,
      program: profileInformation.program,
      lab: profileInformation.lab,
      availableTime: profileInformation.availableTime,
      introduction: profileInformation.introduction,
      detailedIntroduction: profileInformation.detailedIntroduction,
      researchFields: splitValues(profileInformation.researchFields, ","),
      counselingFields: profileInformation.counselingFields,
      careerHighlights: splitValues(profileInformation.careerHighlights, "\n"),
      internationalActivities: splitValues(profileInformation.internationalActivities, "\n"),
    };

    setIsSaving(true);
    setMessage("");

    try {
      const response = await updateMyMentorProfile(payload);
      setFormValues(toFormValues(response.data));
      setMessage("개인 정보와 프로필 정보가 저장되었습니다.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mentor-profile-edit-page">
        <main className="page-container mentor-profile-edit-container">
          <p role="status">프로필을 불러오는 중입니다.</p>
        </main>
      </div>
    );
  }

  if (!formValues) {
    return (
      <div className="mentor-profile-edit-page">
        <main className="page-container mentor-profile-edit-container">
          <p role="alert">{message || "프로필을 불러오지 못했습니다."}</p>
        </main>
      </div>
    );
  }

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
                <input className="field" disabled name="name" value={personalInformation.name} />
              </label>
              <label className="mentor-field-group">
                <span className="mentor-field-label">닉네임</span>
                <input className="field" name="nickname" onChange={handlePersonalChange} required value={personalInformation.nickname} />
              </label>
              <label className="mentor-field-group mentor-profile-edit-wide">
                <span className="mentor-field-label">이메일 주소</span>
                <input className="field" disabled name="email" type="email" value={personalInformation.email} />
                <small>이메일은 별도 절차로 변경합니다.</small>
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
                <small>쉼표로 구분해 3개 이상 8개 이하로 입력해 주세요.</small>
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
                <small>항목마다 줄을 바꿔 1개 이상 5개 이하로 입력해 주세요.</small>
              </label>
              <label className="mentor-field-group mentor-profile-edit-wide">
                <span className="mentor-field-label">해외 활동</span>
                <textarea className="field" name="internationalActivities" onChange={handleProfileChange} required value={profileInformation.internationalActivities} />
                <small>항목마다 줄을 바꿔 1개 이상 5개 이하로 입력해 주세요.</small>
              </label>
            </div>
          </section>

          <p className="mentor-profile-edit-message" role="status" aria-live="polite">{message}</p>
          <div className="mentor-profile-edit-actions">
            <Link className="button button-neutral" to={routePaths.mentorHome}>취소</Link>
            <button className="button button-primary" disabled={isSaving} type="submit">
              {isSaving ? "저장 중..." : "변경 내용 저장"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default MentorProfileEditPage;
