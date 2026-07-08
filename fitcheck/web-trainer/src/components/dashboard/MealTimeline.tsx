import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../hooks/useAppStore';
import { todayString } from '../../utils/date';
import './MealTimeline.css';

export default function MealTimeline() {
  const { data, members, submitFeedback } = useAppStore();
  const navigate = useNavigate();
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>(
    {},
  );
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);

  const today = todayString();
  const todayMeals = data.meals.filter((m) => m.date === today);
  const pendingMeals = todayMeals.filter((m) => m.pending).length;

  const getMemberAvatar = (memberId: string) =>
    members.find((m) => m.id === memberId)?.avatar ?? '?';

  const getMemberName = (memberId: string) =>
    members.find((m) => m.id === memberId)?.name ?? '알 수 없음';

  const handleSubmit = (mealId: string) => {
    const draft = feedbackDrafts[mealId];
    if (!draft?.trim()) return;
    submitFeedback(mealId, draft);
    setActiveFeedbackId(null);
    setFeedbackDrafts((prev) => ({ ...prev, [mealId]: '' }));
  };

  return (
    <section className="panel meal-panel">
      <div className="panel-header">
        <div>
          <h2>🍽️ 식단 피드백 타임라인</h2>
          <p>회원이 업로드한 일별 식단을 한눈에 보고 즉각 피드백하세요</p>
        </div>
        <div className="meal-header-actions">
          <span className="pending-badge">피드백 대기 {pendingMeals}건</span>
          <button
            type="button"
            className="btn-view-all"
            onClick={() => navigate('/meals')}
          >
            전체 보기 →
          </button>
        </div>
      </div>

      <div className="meal-scroll">
        {todayMeals.length === 0 ? (
          <p className="meal-empty">오늘 업로드된 식단이 없습니다.</p>
        ) : (
          todayMeals.map((meal) => (
            <article key={meal.id} className="meal-card">
              <div className="meal-photo">
                <span className="meal-photo-placeholder">📷</span>
              </div>
              <div className="meal-body">
                <div className="meal-header-row">
                  <span className="meal-avatar">
                    {getMemberAvatar(meal.memberId)}
                  </span>
                  <div>
                    <strong>{getMemberName(meal.memberId)}</strong>
                    <span className="meal-time">
                      {meal.mealType} · {meal.time}
                    </span>
                  </div>
                  {meal.pending && (
                    <span className="meal-pending-dot" title="피드백 대기" />
                  )}
                </div>
                <p className="meal-memo">{meal.memo}</p>

                {meal.feedback && (
                  <p className="meal-feedback-done">✓ {meal.feedback}</p>
                )}

                {activeFeedbackId === meal.id ? (
                  <div className="feedback-form">
                    <textarea
                      placeholder="피드백을 입력하세요..."
                      value={feedbackDrafts[meal.id] ?? ''}
                      onChange={(e) =>
                        setFeedbackDrafts((prev) => ({
                          ...prev,
                          [meal.id]: e.target.value,
                        }))
                      }
                      rows={2}
                    />
                    <div className="feedback-actions">
                      <button
                        type="button"
                        className="btn-feedback-send"
                        onClick={() => handleSubmit(meal.id)}
                      >
                        전송
                      </button>
                      <button
                        type="button"
                        className="btn-feedback-cancel"
                        onClick={() => setActiveFeedbackId(null)}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn-feedback"
                    onClick={() => setActiveFeedbackId(meal.id)}
                  >
                    {meal.pending ? '피드백 작성' : '추가 피드백'}
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
