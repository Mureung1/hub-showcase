const statusLabels = {
  pending: "대기",
  confirmed: "확정",
  completed: "완료",
  rejected: "거부",
};

const enrollmentStatusLabels = {
  enrolled: "재학",
  leave: "휴학",
  graduated: "졸업",
  other: "기타",
};

function formatCreatedAt(createdAt) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(createdAt));
}

function MentorApplicationCard({
  application,
  isAccepting,
  isRejecting,
  onAccept,
  onReject,
}) {
  const { applicationStatus, mentee, mentorStatus, questionnaire } = application;
  const visibleStatus = mentorStatus ?? applicationStatus;
  const showsMeetingFields = visibleStatus === "confirmed" || visibleStatus === "completed";
  const gradeLabel = mentee.grade ? `${mentee.grade}학년` : "";
  const enrollmentStatusLabel = enrollmentStatusLabels[mentee.enrollmentStatus]
    ?? mentee.enrollmentStatus;
  const applicantAcademicInfo = [gradeLabel, enrollmentStatusLabel]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="card mentor-application-card">
      <header className="mentor-application-card-header">
        <div>
          <p className="mentor-application-date">{formatCreatedAt(application.createdAt)} 신청</p>
          <h2 className="card-title">{mentee.name} 멘티</h2>
        </div>
        <span className={`mentor-application-status mentor-application-status-${visibleStatus}`}>
          {statusLabels[visibleStatus]}
        </span>
      </header>

      <dl className="mentor-applicant-info" aria-label="신청자 정보">
        <div>
          <dt>학교</dt>
          <dd>{mentee.school}</dd>
        </div>
        <div>
          <dt>전공</dt>
          <dd>{mentee.major}</dd>
        </div>
        <div>
          <dt>학년 · 학적</dt>
          <dd>{applicantAcademicInfo || "정보 없음"}</dd>
        </div>
        <div>
          <dt>희망 면담 시간</dt>
          <dd>{questionnaire.preferredTime}</dd>
        </div>
      </dl>

      <details className="mentor-questionnaire">
        <summary>사전 질문지 조회</summary>
        <dl>
          <div>
            <dt>자기소개</dt>
            <dd>{questionnaire.introduction}</dd>
          </div>
          <div>
            <dt>현재 가장 큰 고민</dt>
            <dd>{questionnaire.concern}</dd>
          </div>
          <div>
            <dt>면담을 통해 얻고 싶은 것</dt>
            <dd>{questionnaire.goal}</dd>
          </div>
          <div>
            <dt>희망 면담 시간</dt>
            <dd>{questionnaire.preferredTime}</dd>
          </div>
        </dl>
      </details>

      {visibleStatus === "pending" && (
        <div className="mentor-application-actions">
          <button
            className="button button-neutral mentor-reject-button"
            disabled={isAccepting || isRejecting}
            onClick={() => onReject(application.id)}
            type="button"
          >
            {isRejecting ? "거부 처리 중..." : "거부"}
          </button>
          <button
            className="button button-primary"
            disabled={isAccepting || isRejecting}
            onClick={() => onAccept(application.id)}
            type="button"
          >
            {isAccepting ? "수락 처리 중..." : "수락"}
          </button>
        </div>
      )}

      {showsMeetingFields && (
        <section className="mentor-meeting-fields" aria-labelledby={`meeting-${application.id}`}>
          <h3 id={`meeting-${application.id}`}>면담 약속 정보</h3>
          <div className="mentor-meeting-grid">
            <label>
              <span>약속 시간</span>
              <input
                className="field"
                defaultValue={application.meeting?.time ?? ""}
                placeholder="예: 2026년 7월 20일 19:00"
                type="text"
              />
            </label>
            <label>
              <span>장소</span>
              <input
                className="field"
                defaultValue={application.meeting?.place ?? ""}
                placeholder="예: 온라인 또는 교내 라운지"
                type="text"
              />
            </label>
          </div>
        </section>
      )}
    </article>
  );
}

export default MentorApplicationCard;
