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

const academicStatusOptions = ["석사과정", "박사과정", "석박통합과정", "학석박통합과정"];

function toEntries(values) {
  return values.map((value, index) => ({ id: index, value }));
}

function KeywordTextFields({
  addLabel, entries, fieldLabel, idPrefix, maxCount, minCount, onAdd, onChange, onRemove, placeholder,
}) {
  return (
    <fieldset className="mentor-keyword-fieldset">
      <legend className="sr-only">{fieldLabel}</legend>
      <div className="mentor-keyword-heading">
        <div>
          <span className="mentor-field-label">{fieldLabel}</span>
        </div>
        <div className="mentor-keyword-controls">
          <span className="tag">{entries.length} / {maxCount}</span>
          <button
            aria-label={addLabel}
            className="button button-soft keyword-add-button"
            disabled={entries.length >= maxCount}
            onClick={onAdd}
            type="button"
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>

      <div className="mentor-keyword-list">
        {entries.map((entry, index) => (
          <div className="mentor-keyword-row" key={entry.id}>
            <label className="sr-only" htmlFor={`${idPrefix}-${entry.id}`}>{fieldLabel} {index + 1}</label>
            <span className="keyword-prefix" aria-hidden="true">#</span>
            <input
              className="field keyword-field"
              id={`${idPrefix}-${entry.id}`}
              maxLength="200"
              onChange={(event) => onChange(entry.id, event.target.value)}
              placeholder={`${placeholder} ${index + 1}`}
              required
              type="text"
              value={entry.value}
            />
            {entries.length > minCount && (
              <button
                aria-label={`${fieldLabel} ${index + 1} 삭제`}
                className="keyword-remove-button"
                onClick={() => onRemove(entry.id)}
                type="button"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function CounselingFields({ entries, maxCount, minCount, onAdd, onChange, onRemove }) {
  return (
    <fieldset className="mentor-keyword-fieldset">
      <legend className="sr-only">상담 분야 관련 해시태그</legend>
      <div className="mentor-keyword-heading">
        <div>
          <span className="mentor-field-label">상담 분야 관련 해시태그</span>
        </div>
        <div className="mentor-keyword-controls">
          <span className="tag">{entries.length} / {maxCount}</span>
          <button
            aria-label="상담 분야 키워드 추가"
            className="button button-soft keyword-add-button"
            disabled={entries.length >= maxCount}
            onClick={onAdd}
            type="button"
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>

      <div className="mentor-keyword-list">
        {entries.map((entry, index) => {
          const selectedValues = entries
            .filter((item) => item.id !== entry.id)
            .map((item) => item.value);

          return (
            <div className="mentor-keyword-row counseling-keyword-row" key={entry.id}>
              <label className="sr-only" htmlFor={`counseling-field-${entry.id}`}>상담 분야 {index + 1}</label>
              <span className="keyword-prefix" aria-hidden="true">#</span>
              <select
                className="field"
                id={`counseling-field-${entry.id}`}
                onChange={(event) => onChange(entry.id, event.target.value)}
                required
                value={entry.value}
              >
                <option disabled value="">상담 분야를 선택해 주세요</option>
                {counselingOptions.map((option) => (
                  <option disabled={selectedValues.includes(option)} key={option} value={option}>{option}</option>
                ))}
              </select>
              {entries.length > minCount && (
                <button
                  aria-label={`상담 분야 ${index + 1} 삭제`}
                  className="keyword-remove-button"
                  onClick={() => onRemove(entry.id)}
                  type="button"
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function ProfileEntryFields({
  addLabel, entries, fieldLabel, idPrefix, maxCount, minCount, onAdd, onChange, onRemove, placeholder,
}) {
  return (
    <fieldset className="mentor-keyword-fieldset">
      <legend className="sr-only">{fieldLabel}</legend>
      <div className="mentor-keyword-heading">
        <div>
          <span className="mentor-field-label">{fieldLabel}</span>
        </div>
        <div className="mentor-keyword-controls">
          <span className="tag">{entries.length} / {maxCount}</span>
          <button
            aria-label={addLabel}
            className="button button-soft keyword-add-button"
            disabled={entries.length >= maxCount}
            onClick={onAdd}
            type="button"
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>

      <div className="mentor-keyword-list">
        {entries.map((entry, index) => (
          <div className="mentor-keyword-row" key={entry.id}>
            <label className="sr-only" htmlFor={`${idPrefix}-${entry.id}`}>{fieldLabel} {index + 1}</label>
            <span className="keyword-prefix" aria-hidden="true">{index + 1}</span>
            <input
              className="field keyword-field"
              id={`${idPrefix}-${entry.id}`}
              maxLength="200"
              onChange={(event) => onChange(entry.id, event.target.value)}
              placeholder={`${placeholder} ${index + 1}`}
              required
              type="text"
              value={entry.value}
            />
            {entries.length > minCount && (
              <button
                aria-label={`${fieldLabel} ${index + 1} 삭제`}
                className="keyword-remove-button"
                onClick={() => onRemove(entry.id)}
                type="button"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function useEntryList(initialValues) {
  const [entries, setEntries] = useState(() => toEntries(initialValues));
  const [nextId, setNextId] = useState(initialValues.length);

  const add = (maxCount) => {
    setEntries((current) => {
      if (current.length >= maxCount) return current;
      return [...current, { id: nextId, value: "" }];
    });
    setNextId((id) => id + 1);
  };

  const update = (id, value) => {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, value } : entry)));
  };

  const remove = (id, minCount) => {
    setEntries((current) => (current.length > minCount ? current.filter((entry) => entry.id !== id) : current));
  };

  const reset = (values) => {
    setEntries(toEntries(values));
    setNextId(values.length);
  };

  return { add, entries, remove, reset, update };
}

function MentorProfileEditPage() {
  const [personalInformation, setPersonalInformation] = useState(null);
  const [profileFields, setProfileFields] = useState(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const researchFields = useEntryList([]);
  const counselingFields = useEntryList([]);
  const careerHighlights = useEntryList([]);
  const internationalActivities = useEntryList([]);

  useEffect(() => {
    let isCancelled = false;

    getMyMentorProfile()
      .then((response) => {
        if (isCancelled) return;

        const profile = response.data;
        setPersonalInformation({
          name: profile.name,
          nickname: profile.nickname,
          email: profile.email,
          password: "",
        });
        setProfileFields({
          school: profile.school,
          major: profile.major,
          academicStatus: profile.academicStatus,
          lab: profile.lab,
          availableTime: profile.availableTime,
          introduction: profile.introduction,
          detailedIntroduction: profile.detailedIntroduction,
        });
        researchFields.reset(profile.researchFields);
        counselingFields.reset(profile.counselingFields);
        careerHighlights.reset(profile.careerHighlights);
        internationalActivities.reset(profile.internationalActivities);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePersonalChange = (event) => {
    const { name, value } = event.target;
    setPersonalInformation((current) => ({ ...current, [name]: value }));
    setMessage("");
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileFields((current) => ({ ...current, [name]: value }));
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name: personalInformation.name,
      nickname: personalInformation.nickname,
      email: personalInformation.email,
      school: profileFields.school,
      major: profileFields.major,
      academicStatus: profileFields.academicStatus,
      program: `${profileFields.major} ${profileFields.academicStatus}`.trim(),
      lab: profileFields.lab,
      availableTime: profileFields.availableTime,
      introduction: profileFields.introduction,
      detailedIntroduction: profileFields.detailedIntroduction,
      researchFields: researchFields.entries.map((entry) => entry.value),
      counselingFields: counselingFields.entries.map((entry) => entry.value),
      careerHighlights: careerHighlights.entries.map((entry) => entry.value),
      internationalActivities: internationalActivities.entries.map((entry) => entry.value),
    };

    if (personalInformation.password) {
      payload.password = personalInformation.password;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await updateMyMentorProfile(payload);
      const profile = response.data;
      setPersonalInformation({
        name: profile.name,
        nickname: profile.nickname,
        email: profile.email,
        password: "",
      });
      setProfileFields({
        school: profile.school,
        major: profile.major,
        academicStatus: profile.academicStatus,
        lab: profile.lab,
        availableTime: profile.availableTime,
        introduction: profile.introduction,
        detailedIntroduction: profile.detailedIntroduction,
      });
      researchFields.reset(profile.researchFields);
      counselingFields.reset(profile.counselingFields);
      careerHighlights.reset(profile.careerHighlights);
      internationalActivities.reset(profile.internationalActivities);
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
        <main className="page-container mentor-signup-container">
          <p role="status">프로필을 불러오는 중입니다.</p>
        </main>
      </div>
    );
  }

  if (!personalInformation || !profileFields) {
    return (
      <div className="mentor-profile-edit-page">
        <main className="page-container mentor-signup-container">
          <p role="alert">{message || "프로필을 불러오지 못했습니다."}</p>
        </main>
      </div>
    );
  }

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

      <main className="page-container mentor-signup-container">
        <form className="mentor-signup-form" onSubmit={handleSubmit}>
          <section className="card mentor-signup-section" aria-labelledby="mentor-account-title">
            <div className="mentor-section-heading">
              <div className="mentor-section-title-row">
                <span className="mentor-section-number" aria-hidden="true">01</span>
                <div>
                  <p className="eyebrow">ACCOUNT</p>
                  <h2 className="card-title" id="mentor-account-title">개인정보 수정</h2>
                </div>
              </div>
            </div>

            <div className="mentor-field-list">
              <label className="mentor-field-group">
                <span className="mentor-field-label">이름</span>
                <input className="field" name="name" onChange={handlePersonalChange} required value={personalInformation.name} />
              </label>

              <label className="mentor-field-group">
                <span className="mentor-field-label">닉네임</span>
                <input className="field" name="nickname" onChange={handlePersonalChange} required value={personalInformation.nickname} />
              </label>

              <label className="mentor-field-group">
                <span className="mentor-field-label">비밀번호</span>
                <input autoComplete="new-password" className="field" minLength="8" name="password" onChange={handlePersonalChange} placeholder="변경하려면 8자 이상 입력해 주세요" type="password" value={personalInformation.password} />
              </label>

              <div className="mentor-field-group">
                <label className="mentor-field-label" htmlFor="mentor-profile-email">이메일 주소</label>
                <input className="field" id="mentor-profile-email" name="email" onChange={handlePersonalChange} required type="email" value={personalInformation.email} />
              </div>
            </div>
          </section>

          <section className="card mentor-signup-section mentor-profile-section" aria-labelledby="mentor-profile-title">
            <div className="mentor-section-heading">
              <div className="mentor-section-title-row">
                <span className="mentor-section-number" aria-hidden="true">02</span>
                <div>
                  <p className="eyebrow">PROFILE</p>
                  <h2 className="card-title" id="mentor-profile-title">프로필 정보 수정</h2>
                </div>
              </div>
              <p className="muted-text">멘티가 멘토를 선택할 때 확인하는 정보입니다.</p>
            </div>

            <div className="mentor-field-list">
              <label className="mentor-field-group">
                <span className="mentor-field-label">소속 학교</span>
                <input className="field" name="school" onChange={handleProfileChange} required value={profileFields.school} />
              </label>

              <div className="mentor-profile-grid">
                <label className="mentor-field-group">
                  <span className="mentor-field-label">전공</span>
                  <input className="field" name="major" onChange={handleProfileChange} required value={profileFields.major} />
                </label>

                <label className="mentor-field-group">
                  <span className="mentor-field-label">학적</span>
                  <select className="field" name="academicStatus" onChange={handleProfileChange} required value={profileFields.academicStatus}>
                    {academicStatusOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="mentor-field-group">
                <span className="mentor-field-label">연구실</span>
                <input className="field" name="lab" onChange={handleProfileChange} required value={profileFields.lab} />
              </label>

              <KeywordTextFields
                addLabel="연구 주제 키워드 추가"
                entries={researchFields.entries}
                fieldLabel="연구 주제 관련 해시태그"
                idPrefix="research-keyword"
                maxCount={8}
                minCount={3}
                onAdd={() => researchFields.add(8)}
                onChange={researchFields.update}
                onRemove={(id) => researchFields.remove(id, 3)}
                placeholder="연구 키워드"
              />

              <CounselingFields
                entries={counselingFields.entries}
                maxCount={5}
                minCount={1}
                onAdd={() => counselingFields.add(5)}
                onChange={counselingFields.update}
                onRemove={(id) => counselingFields.remove(id, 1)}
              />

              <label className="mentor-field-group">
                <span className="mentor-field-label">한 줄 소개</span>
                <textarea className="field mentor-intro-field" maxLength="120" name="introduction" onChange={handleProfileChange} required value={profileFields.introduction} />
              </label>

              <label className="mentor-field-group">
                <span className="mentor-field-label">상세 소개</span>
                <textarea className="field mentor-detail-field" maxLength="600" name="detailedIntroduction" onChange={handleProfileChange} required value={profileFields.detailedIntroduction} />
              </label>

              <ProfileEntryFields
                addLabel="주요 이력 추가"
                entries={careerHighlights.entries}
                fieldLabel="주요 이력"
                idPrefix="career-highlight"
                maxCount={5}
                minCount={1}
                onAdd={() => careerHighlights.add(5)}
                onChange={careerHighlights.update}
                onRemove={(id) => careerHighlights.remove(id, 1)}
                placeholder="주요 이력"
              />

              <ProfileEntryFields
                addLabel="해외 활동 추가"
                entries={internationalActivities.entries}
                fieldLabel="해외 활동"
                idPrefix="international-activity"
                maxCount={5}
                minCount={1}
                onAdd={() => internationalActivities.add(5)}
                onChange={internationalActivities.update}
                onRemove={(id) => internationalActivities.remove(id, 1)}
                placeholder="해외 활동"
              />

              <label className="mentor-field-group">
                <span className="mentor-field-label">면담 가능 시간</span>
                <input className="field" name="availableTime" onChange={handleProfileChange} placeholder="예: 화요일 19:00, 금요일 15:00" required value={profileFields.availableTime} />
              </label>
            </div>
          </section>

          {message && (
            <p className="mentor-profile-edit-message" role="status" aria-live="polite">{message}</p>
          )}

          <div className="mentor-signup-actions">
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
