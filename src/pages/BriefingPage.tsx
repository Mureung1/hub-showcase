import { useState } from 'react';
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
import { MOCK_BRIEFING } from '../mocks/briefing';
import {
  MOCK_CONFIRM_RESPONSE,
  MOCK_CLARIFY_RESPONSE,
  MOCK_QUERY_RESPONSE,
} from '../mocks/responses';
import { toConfirmData } from '../lib/parseResultToConfirmData';
import type { OverlayState } from '../types/overlay';
import type { ResolvedParseResult } from '@shared/schemas';

export default function BriefingPage() {
  const briefing = MOCK_BRIEFING;
  const [overlay, setOverlay] = useState<OverlayState>({ type: 'none' });

  const closeOverlay = () => setOverlay({ type: 'none' });

  const handleSend = (message: string) => {
    if (message.includes('운동')) {
      setOverlay({ type: 'clarify', data: MOCK_CLARIFY_RESPONSE });
    } else if (message.includes('마감')) {
      setOverlay({ type: 'query', data: MOCK_QUERY_RESPONSE });
    } else {
      setOverlay({ type: 'confirm', data: MOCK_CONFIRM_RESPONSE });
    }
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
          <RoutineCard routines={briefing.routines} />
          <MealCard meal={briefing.meal} />
          <DeadlineCard deadlines={briefing.deadlines} baseDate={briefing.date} />
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
