import { useEffect, useRef, useState } from 'react';
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
import ErrorOverlay from '../components/chat/ErrorOverlay';
import QueryResult from '../components/chat/QueryResult';
import CompletedView from '../components/chat/CompletedView';
import { toConfirmData } from '../lib/parseResultToConfirmData';
import { getBriefing } from '../api/briefingApi';
import {
  updateTaskCompleted,
  updateMemoCompleted,
  getCompletedTasks,
  getCompletedMemos,
  deleteItem,
} from '../api/itemsApi';
import { parseText, resolveCandidate } from '../api/parseApi';
import type { OverlayState } from '../types/overlay';
import type { CompletionPhases } from '../types/completion';
import type { Briefing, ItemType, ParseCandidate } from '@shared/schemas';

const COMPLETION_FADE_DELAY_MS = 2000;
const COMPLETION_FADE_DURATION_MS = 400;

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
  const [completionPhases, setCompletionPhases] = useState<CompletionPhases>({});
  const fadeTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    getBriefing()
      .then(setBriefing)
      .catch((err) => console.error('[BriefingPage] 브리핑 조회 실패:', err));
  }, []);

  const closeOverlay = () => setOverlay({ type: 'none' });

  const refreshBriefing = () =>
    getBriefing()
      .then(setBriefing)
      .catch((err) => console.error('[BriefingPage] 브리핑 재조회 실패:', err));

  const handleSend = (message: string) => {
    parseText(message)
      .then((result) => {
        if (result.status === 'resolved') {
          refreshBriefing();
          setOverlay({ type: 'confirm', data: toConfirmData(result) });
        } else {
          setOverlay({ type: 'clarify', data: result });
        }
      })
      .catch((err) => {
        console.error('[BriefingPage] 자연어 입력 처리 실패:', err);
        setOverlay({ type: 'error', message: err.message });
      });
  };

  const handleClarifySelect = (candidate: ParseCandidate) => {
    if (overlay.type !== 'clarify') return;
    const { rawInput } = overlay.data;
    resolveCandidate(candidate, rawInput)
      .then((result) => {
        refreshBriefing();
        setOverlay({ type: 'confirm', data: toConfirmData(result) });
      })
      .catch((err) => {
        console.error('[BriefingPage] 되묻기 선택 처리 실패:', err);
        setOverlay({ type: 'error', message: err.message });
      });
  };

  const handleUndo = () => {
    if (overlay.type !== 'confirm') return;
    const { items } = overlay.data;
    Promise.all(items.map(({ type, id }) => deleteItem(type, id)))
      .then(() => {
        refreshBriefing();
        closeOverlay();
      })
      .catch((err) => {
        console.error('[BriefingPage] 실행 취소 실패:', err);
        setOverlay({ type: 'error', message: err.message });
      });
  };

  const clearFadeTimer = (id: string) => {
    clearTimeout(fadeTimers.current[id]);
    delete fadeTimers.current[id];
  };

  const setCompletionPhase = (id: string, phase: 'done' | 'fading' | null) => {
    setCompletionPhases((prev) => {
      const next = { ...prev };
      if (phase === null) {
        delete next[id];
      } else {
        next[id] = phase;
      }
      return next;
    });
  };

  const scheduleCompletionFade = (id: string) => {
    fadeTimers.current[id] = setTimeout(() => {
      setCompletionPhase(id, 'fading');
      setTimeout(() => {
        clearFadeTimer(id);
        setCompletionPhase(id, null);
        refreshBriefing();
      }, COMPLETION_FADE_DURATION_MS);
    }, COMPLETION_FADE_DELAY_MS);
  };

  const handleToggleTask = (taskId: string, completed: boolean) => {
    if (!completed) return;
    setCompletionPhase(taskId, 'done');
    scheduleCompletionFade(taskId);
    updateTaskCompleted(taskId, completed).catch((err) => {
      console.error('[BriefingPage] 과제 완료 처리 실패:', err);
      setOverlay({ type: 'error', message: err.message });
      clearFadeTimer(taskId);
      setCompletionPhase(taskId, null);
    });
  };

  const handleToggleMemo = (memoId: string, completed: boolean) => {
    if (!completed) return;
    setCompletionPhase(memoId, 'done');
    scheduleCompletionFade(memoId);
    updateMemoCompleted(memoId, completed).catch((err) => {
      console.error('[BriefingPage] 메모 완료 처리 실패:', err);
      setOverlay({ type: 'error', message: err.message });
      clearFadeTimer(memoId);
      setCompletionPhase(memoId, null);
    });
  };

  const openCompletedView = () => {
    Promise.all([getCompletedTasks(), getCompletedMemos()])
      .then(([tasks, memos]) => setOverlay({ type: 'completed', data: { tasks, memos } }))
      .catch((err) => {
        console.error('[BriefingPage] 완료함 조회 실패:', err);
        setOverlay({ type: 'error', message: err.message });
      });
  };

  const handleRestore = (type: ItemType, id: string) => {
    const restore =
      type === 'tasks' ? updateTaskCompleted(id, false) : updateMemoCompleted(id, false);
    restore
      .then(() => {
        refreshBriefing();
        openCompletedView();
      })
      .catch((err) => {
        console.error('[BriefingPage] 복구 실패:', err);
        setOverlay({ type: 'error', message: err.message });
      });
  };

  const handlePermanentDelete = (type: ItemType, id: string) => {
    deleteItem(type, id)
      .then(() => openCompletedView())
      .catch((err) => {
        console.error('[BriefingPage] 영구 삭제 실패:', err);
        setOverlay({ type: 'error', message: err.message });
      });
  };

  const handleToggleCompletedView = () => {
    if (overlay.type === 'completed') {
      closeOverlay();
    } else {
      openCompletedView();
    }
  };

  return (
    <div className="briefing-page">
      <BriefingHeader
        date={briefing.date}
        greeting={briefing.greeting}
        showCompleted={overlay.type === 'completed'}
        onToggleCompleted={handleToggleCompletedView}
      />

      {overlay.type === 'query' ? (
        <QueryResult data={overlay.data} onBack={closeOverlay} />
      ) : overlay.type === 'completed' ? (
        <CompletedView
          data={overlay.data}
          onRestore={handleRestore}
          onPermanentDelete={handlePermanentDelete}
        />
      ) : (
        <main className="briefing-cards">
          <ScheduleCard schedules={briefing.schedules} />
          <RoutineCard routines={briefing.routines} />
          <MealCard meal={briefing.meal} />
          <DeadlineCard
            deadlines={briefing.deadlines}
            baseDate={briefing.date}
            completionPhases={completionPhases}
            onToggle={handleToggleTask}
          />
          <MemoCard
            memos={briefing.memos}
            completionPhases={completionPhases}
            onToggle={handleToggleMemo}
          />
        </main>
      )}

      <ChatInput onSend={handleSend} />

      {overlay.type === 'confirm' && (
        <ConfirmOverlay data={overlay.data} onClose={closeOverlay} onUndo={handleUndo} />
      )}
      {overlay.type === 'clarify' && (
        <ClarifyOverlay data={overlay.data} onSelect={handleClarifySelect} onClose={closeOverlay} />
      )}
      {overlay.type === 'error' && (
        <ErrorOverlay message={overlay.message} onClose={closeOverlay} />
      )}
    </div>
  );
}
