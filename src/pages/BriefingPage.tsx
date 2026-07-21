import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import BriefingHeader from '../components/briefing/BriefingHeader';
import ScheduleCard from '../components/briefing/ScheduleCard';
import RoutineCard from '../components/briefing/RoutineCard';
import MealCard from '../components/briefing/MealCard';
import DeadlineCard from '../components/briefing/DeadlineCard';
import MemoCard from '../components/briefing/MemoCard';
import ChatInput from '../components/chat/ChatInput';
import ConfirmOverlay from '../components/chat/ConfirmOverlay';
import ClarifyOverlay from '../components/chat/ClarifyOverlay';
import QueryResult from '../components/chat/QueryResult';
import { toConfirmData } from '../lib/parseResultToConfirmData';
import { sortByCompleted } from '../lib/sortByCompleted';
import { getBriefing } from '../api/briefingApi';
import { updateTaskCompleted, completeRoutine } from '../api/itemsApi';
import type { OverlayState } from '../types/overlay';
import type { Briefing, ResolvedParseResult } from '@shared/schemas';

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<Briefing>({
    date: format(new Date(), 'yyyy-MM-dd'),
    greeting: '오늘 하루도 힘내봐요!',
    schedules: [],
    routines: [],
    meal: null,
    deadlines: [],
    memos: [],
  });
  const [overlay, setOverlay] = useState<OverlayState>({ type: 'none' });

  useEffect(() => {
    getBriefing()
      .then(setBriefing)
      .catch((err) => console.error('[BriefingPage] 브리핑 조회 실패:', err));
  }, []);

  const closeOverlay = () => setOverlay({ type: 'none' });

  // /api/parse가 아직 없어 전송은 현재 아무 동작도 하지 않음
  const handleSend = (_message: string) => {};

  const handleToggleTask = (taskId: string, completed: boolean) => {
    setBriefing((prev) => ({
      ...prev,
      deadlines: prev.deadlines.map((t) => (t.id === taskId ? { ...t, completed } : t)),
    }));
    updateTaskCompleted(taskId, completed).catch((err) =>
      console.error('[BriefingPage] 과제 완료 처리 실패:', err),
    );
  };

  const handleToggleRoutine = (routineId: string, completed: boolean) => {
    setBriefing((prev) => ({
      ...prev,
      routines: prev.routines.map((r) =>
        r.routine.id === routineId ? { ...r, completedToday: completed } : r,
      ),
    }));
    completeRoutine(routineId, completed).catch((err) =>
      console.error('[BriefingPage] 루틴 완료 처리 실패:', err),
    );
  };

  const handleClarifySelect = (candidate: ResolvedParseResult) => {
    setOverlay({ type: 'confirm', data: toConfirmData(candidate) });
  };

  return (
    <div className="briefing-page">
      <BriefingHeader date={briefing.date} greeting={briefing.greeting} />

      {overlay.type === 'query' ? (
        <QueryResult data={overlay.data} onBack={closeOverlay} />
      ) : (
        <main className="briefing-cards">
          <ScheduleCard schedules={briefing.schedules} />
          <RoutineCard
            routines={sortByCompleted(briefing.routines, (r) => r.completedToday)}
            onToggle={handleToggleRoutine}
          />
          <MealCard meal={briefing.meal} />
          <DeadlineCard
            deadlines={sortByCompleted(briefing.deadlines, (t) => t.completed)}
            baseDate={briefing.date}
            onToggle={handleToggleTask}
          />
          <MemoCard memos={briefing.memos} />
        </main>
      )}

      <ChatInput onSend={handleSend} />

      {overlay.type === 'confirm' && <ConfirmOverlay data={overlay.data} onClose={closeOverlay} />}
      {overlay.type === 'clarify' && (
        <ClarifyOverlay data={overlay.data} onSelect={handleClarifySelect} onClose={closeOverlay} />
      )}
    </div>
  );
}
