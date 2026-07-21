import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getMentorById } from "../api/mentors";
import { routePaths } from "../routes/routePaths";

function MentorAvatar({ mentorName }) {
  return (
    <div className="mentor-profile-avatar" role="img" aria-label={`${mentorName} 프로필 이미지`}>
      <svg viewBox="0 0 96 96" aria-hidden="true">
        <circle cx="48" cy="48" r="48" fill="currentColor" opacity="0.12" />
        <path d="M20 88c3-19 13-29 28-29s25 10 28 29" fill="currentColor" />
        <circle cx="48" cy="40" r="19" fill="#f2c7b5" />
        <path d="M28 42c0-19 8-29 21-29 14 0 21 11 21 28-5-9-13-14-24-14-8 0-14 5-18 15Z" fill="#17212b" />
        <circle cx="41" cy="41" r="2" fill="#17212b" />
        <circle cx="55" cy="41" r="2" fill="#17212b" />
      </svg>
    </div>
  );
}

function MentorDetailPage() {
  const location = useLocation();
  const { mentorId } = useParams();
  const [mentor, setMentor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const returnTo = location.state?.returnTo ?? routePaths.menteeMentors;
  const returnState = location.state?.applicationStatus
    ? { activeStatus: location.state.applicationStatus }
    : undefined;
  const returnLabel = returnTo === routePaths.menteeApplications
    ? "면담 신청 목록으로 돌아가기"
    : "멘토 목록으로 돌아가기";

  useEffect(() => {
    let isCancelled = false;

    setIsLoading(true);
    getMentorById(mentorId)
      .then((response) => {
        if (!isCancelled) setMentor(response.data);
      })
      .catch(() => {
        if (!isCancelled) setMentor(null);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [mentorId]);

  if (isLoading) {
    return (
      <main className="mentor-detail-page">
        <section className="card mentor-detail-not-found" role="status">
          <p className="eyebrow">MENTOR PROFILE</p>
          <h1 className="page-title">프로필을 불러오는 중입니다</h1>
        </section>
      </main>
    );
  }

  if (!mentor) {
    return (
      <main className="mentor-detail-page">
        <section className="card mentor-detail-not-found">
          <p className="eyebrow">MENTOR PROFILE</p>
          <h1 className="page-title">멘토 정보를 찾을 수 없습니다</h1>
          <p className="body-text">멘토 목록에서 프로필을 다시 선택해 주세요.</p>
          <Link className="button button-primary" state={returnState} to={returnTo}>이전 화면으로</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mentor-detail-page">
      <article className="card mentor-detail-card">
        <header className="mentor-detail-header">
          <div>
            <p className="eyebrow">MENTOR PROFILE</p>
            <h1 className="page-title">프로필 상세</h1>
          </div>
          <Link
            aria-label={returnLabel}
            className="mentor-detail-close"
            state={returnState}
            to={returnTo}
          >
            <span aria-hidden="true" />
          </Link>
        </header>

        <section className="mentor-profile-identity" aria-labelledby="mentor-profile-name">
          <MentorAvatar mentorName={mentor.name} />
          <div>
            <h2 className="card-title" id="mentor-profile-name">{mentor.name}</h2>
            <dl className="mentor-identity-list">
              <div><dt>학교</dt><dd>{mentor.school}</dd></div>
              <div><dt>연구실</dt><dd>{mentor.lab}</dd></div>
              <div><dt>학적</dt><dd>{mentor.academicStatus}</dd></div>
            </dl>
          </div>
        </section>

        <section className="mentor-detail-section" aria-labelledby="mentor-introduction-title">
          <h2 id="mentor-introduction-title">소개</h2>
          <p className="body-text">{mentor.detailedIntroduction}</p>
        </section>

        <section className="mentor-detail-section" aria-labelledby="mentor-research-title">
          <h2 id="mentor-research-title">연구 분야</h2>
          <div className="tag-list">
            {mentor.researchFields.map((keyword) => <span className="tag" key={keyword}>#{keyword}</span>)}
          </div>
        </section>

        <section className="mentor-detail-section" aria-labelledby="mentor-counseling-title">
          <h2 id="mentor-counseling-title">자신 있는 상담 분야</h2>
          <div className="tag-list mentor-counseling-tags">
            {mentor.counselingFields.map((field) => <span className="tag" key={field}>#{field}</span>)}
          </div>
        </section>

        <section className="mentor-detail-section" aria-labelledby="mentor-career-title">
          <h2 id="mentor-career-title">주요 이력</h2>
          <ul className="mentor-detail-list">
            {mentor.careerHighlights.map((career) => <li key={career}>{career}</li>)}
          </ul>
        </section>

        <section className="mentor-detail-section" aria-labelledby="mentor-international-title">
          <h2 id="mentor-international-title">해외 활동</h2>
          <ul className="mentor-detail-list">
            {mentor.internationalActivities.map((activity) => <li key={activity}>{activity}</li>)}
          </ul>
        </section>
      </article>
    </main>
  );
}

export default MentorDetailPage;
