import { useState } from 'react';
import { useAppStore } from '../../hooks/useAppStore';
import { todayString, daysAgo, formatDateKo } from '../../utils/date';
import './MealsPage.css';

type DateFilter = 'today' | 'yesterday' | 'week';

export default function MealsPage() {
  const { data, members, submitFeedback } = useAppStore();
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>(
    {},
  );
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);

  const today = todayString();
  const yesterday = daysAgo(1);
  const weekStart = daysAgo(6);

  const filteredMeals = data.meals
    .filter((m) => {
      if (dateFilter === 'today') return m.date === today;
      if (dateFilter === 'yesterday') return m.date === yesterday;
      return m.date >= weekStart;
    })
    .filter((m) => memberFilter === 'all' || m.memberId === memberFilter)
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  const pendingCount = filteredMeals.filter((m) => m.pending).length;

  const getMember = (memberId: string) =>
    members.find((m) => m.id === memberId);

  const handleSubmit = (mealId: string) => {
    const draft = feedbackDrafts[mealId];
    if (!draft?.trim()) return;
    submitFeedback(mealId, draft);
    setActiveFeedbackId(null);
    setFeedbackDrafts((prev) => ({ ...prev, [mealId]: '' }));
  };

  const groupedByDate = filteredMeals.reduce<Record<string, typeof filteredMeals>>(
    (acc, meal) => {
      if (!acc[meal.date]) acc[meal.date] = [];
      acc[meal.date]!.push(meal);
      return acc;
    },
    {},
  );

  return (
    <div className="meals-page">
      <div className="page-header meals-page-header">
        <div>
          <h1>식단 피드백</h1>
          <p>회원님들이 업로드한 식단을 날짜별로 피드백하세요.</p>
        </div>
        <span className="meals-pending-badge">
          피드백 대기 {pendingCount}건
        </span>
      </div>

      <div className="meals-filters">
        <div className="date-tabs">
          {(
            [
              { key: 'today', label: '오늘' },
              { key: 'yesterday', label: '어제' },
              { key: 'week', label: '이번 주' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`date-tab ${dateFilter === tab.key ? 'active' : ''}`}
              onClick={() => setDateFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select
          className="member-filter"
          value={memberFilter}
          onChange={(e) => setMemberFilter(e.target.value)}
        >
          <option value="all">전체 회원</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {Object.keys(groupedByDate).length === 0 ? (
        <div className="meals-empty">
          <p>해당 기간에 업로드된 식단이 없습니다.</p>
        </div>
      ) : (
        Object.entries(groupedByDate).map(([date, meals]) => (
          <section key={date} className="meals-date-group">
            <h2 className="date-heading">{formatDateKo(date)}</h2>
            <div className="meals-grid">
              {meals.map((meal) => {
                const member = getMember(meal.memberId);
                return (
                  <article
                    key={meal.id}
                    className={`meal-detail-card ${meal.pending ? 'pending' : 'done'}`}
                  >
                    <div className="meal-detail-photo">
                      <span>📷</span>
                    </div>
                    <div className="meal-detail-body">
                      <div className="meal-detail-top">
                        <span className="meal-detail-avatar">
                          {member?.avatar ?? '?'}
                        </span>
                        <div>
                          <strong>{member?.name ?? '알 수 없음'}</strong>
                          <span>
                            {meal.mealType} · {meal.time}
                          </span>
                        </div>
                        {meal.pending ? (
                          <span className="pending-label">대기</span>
                        ) : (
                          <span className="done-label">완료</span>
                        )}
                      </div>
                      <p className="meal-detail-memo">{meal.memo}</p>

                      {meal.feedback && (
                        <div className="existing-feedback">
                          <span>트레이너 피드백</span>
                          <p>{meal.feedback}</p>
                          {meal.feedbackAt && (
                            <time>
                              {new Date(meal.feedbackAt).toLocaleString(
                                'ko-KR',
                              )}
                            </time>
                          )}
                        </div>
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
                            rows={3}
                          />
                          <div className="feedback-actions">
                            <button
                              type="button"
                              className="btn-send-feedback"
                              onClick={() => handleSubmit(meal.id)}
                            >
                              피드백 전송
                            </button>
                            <button
                              type="button"
                              className="btn-cancel-feedback"
                              onClick={() => setActiveFeedbackId(null)}
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-write-feedback"
                          onClick={() => setActiveFeedbackId(meal.id)}
                        >
                          {meal.pending ? '피드백 작성' : '피드백 수정'}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
