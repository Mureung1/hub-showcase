import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyMenteeProfile, updateMyMenteeProfile } from "../api/mentees";
import { routePaths } from "../routes/routePaths";

function MenteeProfileEditPage() {
  const [profile, setProfile] = useState(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    getMyMenteeProfile()
      .then((response) => {
        if (!isCancelled) setProfile(response.data);
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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((currentProfile) => ({ ...currentProfile, [name]: value }));
    setMessage("");
  };

  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name: profile.name,
      nickname: profile.nickname,
      email: profile.email,
      school: profile.school,
      major: profile.major,
      grade: profile.grade,
      enrollmentStatus: profile.enrollmentStatus,
    };

    if (password) {
      payload.password = password;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await updateMyMenteeProfile(payload);
      setProfile(response.data);
      setPassword("");
      setMessage("개인 정보가 저장되었습니다.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mentee-profile-page">
        <main className="page-container mentee-signup-container">
          <p role="status">프로필을 불러오는 중입니다.</p>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mentee-profile-page">
        <main className="page-container mentee-signup-container">
          <p role="alert">{message || "프로필을 불러오지 못했습니다."}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="mentee-profile-page">
      <header className="page-header mentee-profile-header">
        <div>
          <p className="eyebrow">MENTEE PROFILE</p>
          <h1 className="page-title">개인 정보 수정</h1>
        </div>
        <Link className="button button-soft" to={routePaths.menteeMentors}>
          멘토 프로필 목록으로
        </Link>
      </header>

      <main className="page-container mentee-signup-container">
        <form className="card mentee-signup-form" onSubmit={handleSubmit}>
          <div className="form-section-heading">
            <h2 className="card-title">개인정보 수정</h2>
          </div>

          <div className="signup-field-list">
            <label className="signup-field-group">
              <span className="signup-field-label">이름</span>
              <input className="field" name="name" onChange={handleChange} required value={profile.name} />
            </label>

            <label className="signup-field-group">
              <span className="signup-field-label">닉네임</span>
              <input className="field" name="nickname" onChange={handleChange} required value={profile.nickname} />
            </label>

            <label className="signup-field-group">
              <span className="signup-field-label">비밀번호</span>
              <input autoComplete="new-password" className="field" minLength="8" name="password" onChange={handlePasswordChange} placeholder="변경하려면 8자 이상 입력해 주세요" type="password" value={password} />
            </label>

            <div className="signup-field-group">
              <label className="signup-field-label" htmlFor="mentee-profile-email">이메일 주소</label>
              <input className="field" id="mentee-profile-email" name="email" onChange={handleChange} required type="email" value={profile.email} />
            </div>

            <label className="signup-field-group">
              <span className="signup-field-label">소속 학교</span>
              <input className="field" name="school" onChange={handleChange} required value={profile.school} />
            </label>

            <label className="signup-field-group">
              <span className="signup-field-label">전공</span>
              <input className="field" name="major" onChange={handleChange} required value={profile.major} />
            </label>

            <fieldset className="signup-field-group student-status-fieldset">
              <legend className="signup-field-label">학년 · 재학 상태</legend>
              <div className="student-status-row">
                <label>
                  <span className="sr-only">학년</span>
                  <select className="field" name="grade" onChange={handleChange} required value={profile.grade}>
                    <option value="1">1학년</option>
                    <option value="2">2학년</option>
                    <option value="3">3학년</option>
                    <option value="4">4학년</option>
                    <option value="5+">5학년 이상</option>
                  </select>
                </label>
                <label>
                  <span className="sr-only">재학 상태</span>
                  <select
                    className="field"
                    name="enrollmentStatus"
                    onChange={handleChange}
                    required
                    value={profile.enrollmentStatus}
                  >
                    <option value="enrolled">재학</option>
                    <option value="leave">휴학</option>
                    <option value="graduated">졸업</option>
                    <option value="other">기타</option>
                  </select>
                </label>
              </div>
            </fieldset>
          </div>

          {message && (
            <p className="mentee-profile-message" role="status" aria-live="polite">{message}</p>
          )}

          <div className="mentee-signup-actions">
            <Link className="button button-neutral" to={routePaths.menteeMentors}>취소</Link>
            <button className="button button-primary" disabled={isSaving} type="submit">
              {isSaving ? "저장 중..." : "변경 내용 저장"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default MenteeProfileEditPage;
