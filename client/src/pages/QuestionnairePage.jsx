import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createApplication } from "../api/applications";
import { mentors } from "../data/mentors";
import { routePaths } from "../routes/routePaths";

function QuestionnairePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const mentorIds = Array.isArray(location.state?.mentorIds)
    ? location.state.mentorIds
    : [];
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedMentors = useMemo(
    () => mentorIds
      .map((mentorId) => mentors.find((mentor) => mentor.id === mentorId))
      .filter(Boolean),
    [mentorIds],
  );
  const selectedMentorIds = selectedMentors.map((mentor) => mentor.id);

  const handleBack = () => {
    navigate(routePaths.menteeMentors, {
      replace: true,
      state: { mentorIds },
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmissionError("");

    if (selectedMentorIds.length === 0) {
      setSubmissionError("면담을 신청할 멘토를 1명 이상 선택해 주세요.");
      return;
    }

    if (selectedMentorIds.length > 3) {
      setSubmissionError("멘토는 최대 3명까지만 선택할 수 있습니다.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const questionnaire = {
      introduction: formData.get("introduction")?.trim() ?? "",
      concern: formData.get("concern")?.trim() ?? "",
      goal: formData.get("goal")?.trim() ?? "",
      preferredTime: formData.get("preferredTime")?.trim() ?? "",
    };
    const missingQuestion = Object.values(questionnaire).some((answer) => !answer);

    if (missingQuestion) {
      setSubmissionError("사전 질문지의 모든 필수 항목을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await createApplication({
        mentorIds: selectedMentorIds,
        questionnaire,
      });
      const application = response.data;
      const completePath = routePaths.menteeApplicationComplete.replace(
        ":applicationId",
        application.id,
      );

      navigate(completePath, {
        replace: true,
        state: { application, selectedMentors },
      });
    } catch (error) {
      setSubmissionError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="questionnaire-page">
      <section className="card questionnaire-card">
        <header className="questionnaire-header">
          <p className="eyebrow">MENTORING APPLICATION</p>
          <h1 className="page-title">사전 질문지</h1>
          <p className="muted-text">멘토가 면담을 준비할 수 있도록 질문에 답해 주세요.</p>
        </header>

        <section className="questionnaire-mentors" aria-labelledby="selected-mentors-title">
          <h2 id="selected-mentors-title">선택한 멘토</h2>
          {selectedMentors.length > 0 ? (
            <div className="tag-list">
              {selectedMentors.map((mentor) => (
                <span className="tag" key={mentor.id}>{mentor.name} 멘토</span>
              ))}
            </div>
          ) : (
            <div className="card-muted-box questionnaire-empty-mentors">
              <p>선택한 멘토가 없습니다. 멘토 목록에서 먼저 멘토를 선택해 주세요.</p>
              <button className="button button-soft" onClick={handleBack} type="button">
                멘토 선택하러 가기
              </button>
            </div>
          )}
        </section>

        <form className="questionnaire-form" noValidate onSubmit={handleSubmit}>
          <label className="questionnaire-field">
            <span><strong>1. 자기소개</strong><em>필수</em></span>
            <textarea
              className="field"
              name="introduction"
              placeholder="학년, 전공, 관심 분야를 간단히 적어주세요."
              required
            />
          </label>

          <label className="questionnaire-field">
            <span><strong>2. 현재 가장 큰 고민</strong><em>필수</em></span>
            <textarea
              className="field"
              name="concern"
              placeholder="진로, 연구실, 전공 수업, 대학원 준비 중 가장 궁금한 점을 적어주세요."
              required
            />
          </label>

          <label className="questionnaire-field">
            <span><strong>3. 면담을 통해 얻고 싶은 것</strong><em>필수</em></span>
            <textarea
              className="field"
              name="goal"
              placeholder="면담 후 어떤 판단이나 정보를 얻고 싶은지 적어주세요."
              required
            />
          </label>

          <label className="questionnaire-field">
            <span><strong>4. 희망 면담 시간</strong><em>필수</em></span>
            <input
              className="field"
              name="preferredTime"
              placeholder="예: 화요일 19:00, 금요일 15:00"
              required
              type="text"
            />
          </label>

          {submissionError && (
            <div className="questionnaire-error" role="alert">
              {submissionError}
            </div>
          )}

          <div className="questionnaire-actions">
            <button className="button button-neutral" onClick={handleBack} type="button">
              이전 화면으로
            </button>
            <button
              className="button button-primary"
              disabled={
                selectedMentorIds.length === 0
                || selectedMentorIds.length > 3
                || isSubmitting
              }
              type="submit"
            >
              {isSubmitting ? "신청 중..." : "면담 신청 제출"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default QuestionnairePage;
