import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyMenteeProfile, updateMyMenteeProfile } from "../api/mentees";
import { routePaths } from "../routes/routePaths";

function MenteeProfileEditPage() {
  const [profile, setProfile] = useState(null);
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name: profile.name,
      nickname: profile.nickname,
      school: profile.school,
      major: profile.major,
      grade: profile.grade,
      enrollmentStatus: profile.enrollmentStatus,
    };

    setIsSaving(true);
    setMessage("");

    try {
      const response = await updateMyMenteeProfile(payload);
      setProfile(response.data);
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
        <main className="page-container mentee-profile-container">
          <p role="status">프로필을 불러오는 중입니다.</p>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mentee-profile-page">
        <main className="page-container mentee-profile-container">
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

      <main className="page-container mentee-profile-container">
        <form className="card mentee-profile-form" onSubmit={handleSubmit}>
          <div className="form-section-heading">
            <div>
              <h2 className="card-title">기본 정보</h2>
              <p className="muted-text">멘토에게 전달되는 기본 정보를 관리합니다.</p>
            </div>
          </div>

          <div className="mentee-profile-field-grid">
            <label className="mentee-profile-field">
              <span>이름</span>
              <input className="field" name="name" onChange={handleChange} required value={profile.name} />
            </label>

            <label className="mentee-profile-field">
              <span>닉네임</span>
              <input className="field" name="nickname" onChange={handleChange} required value={profile.nickname} />
            </label>

            <label className="mentee-profile-field mentee-profile-field-wide">
              <span>이메일 주소</span>
              <input className="field" disabled name="email" type="email" value={profile.email} />
              <small>이메일은 별도 절차로 변경합니다.</small>
            </label>

            <label className="mentee-profile-field">
              <span>소속 학교</span>
              <input className="field" name="school" onChange={handleChange} required value={profile.school} />
            </label>

            <label className="mentee-profile-field">
              <span>전공</span>
              <input className="field" name="major" onChange={handleChange} required value={profile.major} />
            </label>

            <label className="mentee-profile-field">
              <span>학년</span>
              <select className="field" name="grade" onChange={handleChange} required value={profile.grade}>
                <option value="1">1학년</option>
                <option value="2">2학년</option>
                <option value="3">3학년</option>
                <option value="4">4학년</option>
                <option value="5+">5학년 이상</option>
              </select>
            </label>

            <label className="mentee-profile-field">
              <span>재학 상태</span>
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

          <p className="mentee-profile-message" role="status" aria-live="polite">{message}</p>

          <div className="mentee-profile-actions">
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
