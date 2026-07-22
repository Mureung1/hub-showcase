import { Link } from "react-router-dom";
import MeetingScheduleEditor from "./MeetingScheduleEditor";
import { routePaths } from "../routes/routePaths";

const statusLabels = {
  pending: "대기",
  confirmed: "확정",
  completed: "완료",
  rejected: "거부",
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const agreedStatuses = new Set(["confirmed", "completed"]);

function MentorSummary({ applicationStatus, mentor }) {
  return (
    <article className="application-mentor-card">
      <Link
        className="application-mentor-name"
        state={{
          applicationStatus,
          returnTo: routePaths.menteeApplications,
        }}
        to={`/mentee/mentors/${mentor.id}`}
      >
        {mentor.name} 멘토
      </Link>
      <dl className="application-mentor-details">
        <div><dt>학교</dt><dd>{mentor.school}</dd></div>
        <div><dt>전공</dt><dd>{mentor.major}</dd></div>
        <div><dt>학적</dt><dd>{mentor.academicStatus}</dd></div>
      </dl>
    </article>
  );
}

function QuestionnaireDetails({ questionnaire }) {
  return (
    <details className="application-questionnaire">
      <summary>사전 질문지 조회</summary>
      <dl>
        <div><dt>자기소개</dt><dd>{questionnaire.introduction}</dd></div>
        <div><dt>현재 가장 큰 고민</dt><dd>{questionnaire.concern}</dd></div>
        <div><dt>면담을 통해 얻고 싶은 것</dt><dd>{questionnaire.goal}</dd></div>
        <div><dt>희망 면담 시간</dt><dd>{questionnaire.preferredTime}</dd></div>
      </dl>
    </details>
  );
}

function ApplicationCard({ application, onMeetingUpdated }) {
  const hasAgreedMeeting = agreedStatuses.has(application.status);
  const applicationMentors = application.mentors ?? [];
  const visibleMentors = hasAgreedMeeting
    ? applicationMentors.filter(
      (mentor) => mentor.id === application.acceptedMentorId,
    )
    : applicationMentors;

  return (
    <article className="card application-card">
      <header className="application-card-header">
        <div>
          <h2 className="card-title">
            {hasAgreedMeeting ? "면담을 수락한 멘토" : "면담을 신청한 멘토"}
          </h2>
          <p className="muted-text application-created-at">
            신청일 {dateFormatter.format(new Date(application.createdAt))}
          </p>
        </div>
        <span className={`application-status application-status-${application.status}`}>
          {statusLabels[application.status]}
        </span>
      </header>

      <section className="application-mentor-list" aria-label="멘토 정보">
        {visibleMentors.map((mentor) => (
          <MentorSummary
            applicationStatus={application.status}
            key={mentor.id}
            mentor={mentor}
          />
        ))}
      </section>

      <div className="card-muted-box application-preferred-time">
        <span>희망 면담 시간</span>
        <strong>{application.questionnaire.preferredTime}</strong>
      </div>

      {hasAgreedMeeting && application.meeting && (
        <section className="application-meeting" aria-labelledby={`meeting-${application.id}`}>
          <h3 id={`meeting-${application.id}`}>합의된 면담 정보</h3>
          <MeetingScheduleEditor
            meeting={application.meeting}
            onUpdated={(updatedMeeting) => onMeetingUpdated(application.id, updatedMeeting)}
          />
        </section>
      )}

      <QuestionnaireDetails questionnaire={application.questionnaire} />
    </article>
  );
}

export default ApplicationCard;
