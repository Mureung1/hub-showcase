import { useEffect, useRef, useState } from 'react';
import './MeetingMatch.css';
import WeekTabs from './WeekTabs';
import TimeGrid from './TimeGrid';
import Toast from './Toast';
import { getAvailability, saveAvailability } from '../api/availability';
import { getMonday, addDaysToDateString } from '../utils/date';
import { safeGetStoredMemberId } from '../utils/storage';

// server/src/currentTeamId.js와 마찬가지로 다중 팀 전까지는 1로 고정
const CURRENT_TEAM_ID = 1;

function MeetingMatch() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);

  const storedMemberId = safeGetStoredMemberId();
  const currentMemberId = Number.isNaN(storedMemberId) ? null : storedMemberId;

  const weekStart = addDaysToDateString(getMonday(), weekOffset * 7);
  const dates = Array.from({ length: 7 }, (_, i) => addDaysToDateString(weekStart, i));

  function showToast(message) {
    setToastMessage(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMessage(''), 2500);
  }

  useEffect(() => {
    getAvailability(CURRENT_TEAM_ID, weekStart)
      .then((rows) => {
        // member_id가 서버에서 문자열로 내려올 수 있어(bigint) Number로 맞춰 비교
        const mine = rows.filter((row) => Number(row.member_id) === currentMemberId);
        setSelectedKeys(new Set(mine.map((row) => `${row.slot_date}_${row.slot_hour}`)));
      })
      .catch((err) => console.error(err));
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
      <div className="meeting-match-page">
        <header className="meeting-match-header">
          <h1>회의시간 매칭</h1>
          <p className="subtitle">가능한 시간을 클릭해서 선택해주세요</p>
        </header>

        <div className="meeting-match-card">
          <WeekTabs weekOffset={weekOffset} onSelectWeek={setWeekOffset} />
          <TimeGrid dates={dates} selectedKeys={selectedKeys} onToggleCell={handleToggleCell} />
        </div>

        <button
          type="button"
          className="meeting-match-save-btn"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>
      <Toast message={toastMessage} />
    </>
  );
}

export default MeetingMatch;
