import { useEffect, useRef, useState } from 'react';
import './MeetingMatch.css';
import WeekTabs from './WeekTabs';
import TimeGrid from './TimeGrid';
import RecommendedTimes from './RecommendedTimes';
import Toast from './Toast';
import { getAvailability, saveAvailability } from '../api/availability';
import { getCurrentTeam } from '../api/teams';
import { addDaysToDateString, formatMonthDaySlash, getWeekPlan } from '../utils/date';
import { buildSlotStats, getTopRecommendedSlots } from '../utils/availability';

// server/src/currentTeamId.js와 마찬가지로 다중 팀 전까지는 1로 고정
const CURRENT_TEAM_ID = 1;

function MeetingMatch({ members, currentMemberId }) {
  const [team, setTeam] = useState(null);
  const [weekIndex, setWeekIndex] = useState(0);
  const [weekSlots, setWeekSlots] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);
  const [highlightedKey, setHighlightedKey] = useState(null);
  const highlightTimerRef = useRef(null);

  // team이 아직 안 왔거나(로딩 중) start_date/end_date가 없으면
  // getWeekPlan이 "오늘이 속한 주 하나뿐"으로 안전하게 처리해줌
  const { projectStartMonday, totalWeeks } = getWeekPlan(
    team?.start_date,
    team?.end_date
  );

  const weekStart = addDaysToDateString(projectStartMonday, weekIndex * 7);
  const weekEnd = addDaysToDateString(weekStart, 6);
  const dates = Array.from({ length: 7 }, (_, i) => addDaysToDateString(weekStart, i));
  const slotStats = buildSlotStats(weekSlots, members);
  const weekLabel = `${weekIndex + 1}주차 (${formatMonthDaySlash(weekStart)}~${formatMonthDaySlash(weekEnd)})`;
  const recommendations = getTopRecommendedSlots(slotStats, 3);

  function showToast(message) {
    setToastMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 2500);
  }

  useEffect(() => {
    getCurrentTeam()
      .then((data) => {
        setTeam(data);
        const plan = getWeekPlan(data.start_date, data.end_date);
        setWeekIndex(plan.initialWeekIndex);
      })
      .catch((err) => console.error(err));
  }, []);

  async function loadAvailability() {
    const rows = await getAvailability(CURRENT_TEAM_ID, weekStart);
    setWeekSlots(rows);
    // member_id가 서버에서 문자열로 내려올 수 있어(bigint) Number로 맞춰 비교
    const mine = rows.filter((row) => Number(row.member_id) === currentMemberId);
    setSelectedKeys(new Set(mine.map((row) => `${row.slot_date}_${row.slot_hour}`)));
  }

  useEffect(() => {
    loadAvailability().catch((err) => console.error(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, currentMemberId]);

  function handleToggleCell(date, hour) {
    const key = `${date}_${hour}`;
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleSelectRecommendation(date, hour) {
    setHighlightedKey(`${date}_${hour}`);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightedKey(null), 1500);
  }

  function handlePrevWeek() {
    setWeekIndex((i) => Math.max(0, i - 1));
  }

  function handleNextWeek() {
    setWeekIndex((i) => Math.min(totalWeeks - 1, i + 1));
  }

  async function handleSave() {
    if (currentMemberId === null) {
      showToast('먼저 이름을 선택해주세요.');
      return;
    }

    setIsSaving(true);
    const slots = Array.from(selectedKeys).map((key) => {
      const [date, hour] = key.split('_');
      return { date, hour: Number(hour) };
    });

    try {
      await saveAvailability(CURRENT_TEAM_ID, currentMemberId, weekStart, slots);
      await loadAvailability(); // 히트맵을 최신으로 반영
      showToast('저장했습니다.');
    } catch (err) {
      console.error(err);
      showToast('저장하지 못했어요.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="meeting-match-card">
        <WeekTabs
          label={weekLabel}
          canGoPrev={weekIndex > 0}
          canGoNext={weekIndex < totalWeeks - 1}
          onPrev={handlePrevWeek}
          onNext={handleNextWeek}
        />
        <TimeGrid
          dates={dates}
          slotStats={slotStats}
          selectedKeys={selectedKeys}
          totalMembers={members.length}
          highlightedKey={highlightedKey}
          onToggleCell={handleToggleCell}
        />
      </div>

      <RecommendedTimes
        recommendations={recommendations}
        totalMembers={members.length}
        onSelectSlot={handleSelectRecommendation}
      />

      <button
        type="button"
        className="meeting-match-save-btn"
        onClick={handleSave}
        disabled={isSaving}
      >
        {isSaving ? '저장 중...' : '저장'}
      </button>

      <Toast message={toastMessage} />
    </>
  );
}

export default MeetingMatch;
