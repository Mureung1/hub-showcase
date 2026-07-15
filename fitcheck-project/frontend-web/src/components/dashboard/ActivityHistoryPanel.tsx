import { useMemo } from 'react';
import { Dumbbell, History, UtensilsCrossed } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { buildActivityTimeline } from '../../utils/activityTimeline';
import { formatDateKo } from '../../utils/date';
import type { NutritionPeriod } from '../../utils/nutrition';
import './ActivityHistoryPanel.css';

interface ActivityHistoryPanelProps {
  period: NutritionPeriod;
  onPeriodChange: (period: NutritionPeriod) => void;
}

export default function ActivityHistoryPanel({
  period,
  onPeriodChange,
}: ActivityHistoryPanelProps) {
  const { members, data, selectedMemberId, setSelectedMemberId } = useAppStore();

  const selectedMember =
    members.find((member) => member.id === selectedMemberId) ?? members[0];

  const groups = useMemo(() => {
    if (!selectedMember) return [];
    return buildActivityTimeline(
      selectedMember.id,
      data.meals,
      data.workoutHistory,
      period,
    );
  }, [selectedMember, data.meals, data.workoutHistory, period]);

  if (!selectedMember) return null;

  const periodLabel = period === 7 ? '최근 7일' : '최근 30일';
  const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section className="panel activity-panel">
      <div className="panel-header activity-panel-header">
        <div>
          <h2>
            <span className="panel-icon">
              <History size={14} />
            </span>
            식단·운동 통합 히스토리
          </h2>
          <p>
            {selectedMember.name} 회원 · {periodLabel} 기록을 시간순으로 확인하세요
          </p>
        </div>

        <div className="activity-controls">
          <label className="activity-member-select">
            <span>회원</span>
            <select
              value={selectedMember.id}
              onChange={(event) => setSelectedMemberId(event.target.value)}
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <div className="activity-period-toggle" role="group" aria-label="기간 선택">
            <button
              type="button"
              className={period === 7 ? 'is-active' : ''}
              onClick={() => onPeriodChange(7)}
            >
              7일
            </button>
            <button
              type="button"
              className={period === 30 ? 'is-active' : ''}
              onClick={() => onPeriodChange(30)}
            >
              30일
            </button>
          </div>
        </div>
      </div>

      <div className="activity-meta">
        <span>
          {groups.length}일 · {totalItems}건
        </span>
      </div>

      <div className="activity-scroll">
        {groups.length === 0 ? (
          <p className="activity-empty">해당 기간에 기록된 식단/운동이 없습니다.</p>
        ) : (
          groups.map((group) => (
            <section key={group.date} className="activity-day">
              <h3 className="activity-day-title">{formatDateKo(group.date)}</h3>
              <div className="activity-day-cards">
                {group.items.map((item) =>
                  item.kind === 'meal' ? (
                    <article key={item.id} className="activity-card activity-card-meal">
                      <div className="activity-card-media">
                        {item.meal.photoUrl ? (
                          <img
                            src={item.meal.photoUrl}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <span className="activity-card-fallback">
                            <UtensilsCrossed size={22} />
                          </span>
                        )}
                      </div>
                      <div className="activity-card-body">
                        <div className="activity-card-top">
                          <span className="activity-chip meal">식단</span>
                          <time>
                            {item.meal.mealType} · {item.time}
                          </time>
                        </div>
                        <h4>{item.meal.memo}</h4>
                        <p className="activity-card-macros">
                          {item.meal.calories.toLocaleString()} kcal · 탄 {item.meal.carbs}g ·
                          단 {item.meal.protein}g · 지 {item.meal.fat}g
                        </p>
                        {item.meal.feedback && (
                          <p className="activity-card-feedback">✓ {item.meal.feedback}</p>
                        )}
                      </div>
                    </article>
                  ) : (
                    <article key={item.id} className="activity-card activity-card-workout">
                      <div className="activity-card-media activity-card-media-workout">
                        <Dumbbell size={22} />
                      </div>
                      <div className="activity-card-body">
                        <div className="activity-card-top">
                          <span className="activity-chip workout">운동</span>
                          <time>
                            세션 · {item.time}
                          </time>
                        </div>
                        <h4>
                          {item.workout.exercises[0]?.name ?? '운동 세션'} 외{' '}
                          {Math.max(item.workout.exercises.length - 1, 0)}종
                        </h4>
                        <ul className="activity-exercise-list">
                          {item.summaryLines.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  ),
                )}
              </div>
            </section>
          ))
        )}
      </div>
    </section>
  );
}
