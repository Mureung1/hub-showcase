import { Link, useParams } from "react-router-dom";
import { getMentorById } from "../data/mentors";
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
  const { mentorId } = useParams();
  const mentor = getMentorById(mentorId);

  if (!mentor) {
    return (
      <main className="mentor-detail-page">
        <section className="card mentor-detail-not-found">
          <p className="eyebrow">MENTOR PROFILE</p>
          <h1 className="page-title">멘토 정보를 찾을 수 없습니다</h1>
          <p className="body-text">멘토 목록에서 프로필을 다시 선택해 주세요.</p>
          <Link className="button button-primary" to={routePaths.menteeMentors}>멘토 목록으로</Link>
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
          <Link className="mentor-detail-close" to={routePaths.menteeMentors} aria-label="멘토 목록으로 돌아가기">
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
            {mentor.keywords.map((keyword) => <span className="tag" key={keyword}>#{keyword}</span>)}
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
