import { format, parseISO } from 'date-fns';
import type { ResolvedParseResult } from '@shared/schemas';
import type { ConfirmData } from '../types/overlay';

type Item = ResolvedParseResult['item'];

const TYPE_LABEL: Record<Item['type'], { subject: string; object: string }> = {
  schedules: { subject: '일정으로', object: '일정을' },
  tasks: { subject: '과제로', object: '과제를' },
  routines: { subject: '루틴으로', object: '루틴을' },
  meals: { subject: '식단으로', object: '식단을' },
  memos: { subject: '메모로', object: '메모를' },
  reminders: { subject: '리마인더로', object: '리마인더를' },
};

function itemTitle(item: Item): string {
  switch (item.type) {
    case 'schedules':
    case 'tasks':
    case 'routines':
      return item.data.title;
    case 'meals':
      return (
        [item.data.breakfast, item.data.lunch, item.data.dinner].filter(Boolean).join(' · ') ||
        '식단'
      );
    case 'memos':
      return item.data.content;
    case 'reminders':
      return `${item.data.targetType} 알림`;
  }
}

function itemDetail(item: Item): string {
  switch (item.type) {
    case 'schedules':
      return `${item.data.date} ${item.data.startTime}`;
    case 'tasks':
      return `${format(parseISO(item.data.deadline), 'M/d')} 마감`;
    case 'routines':
      return item.data.content;
    case 'meals':
      return item.data.date;
    case 'memos':
      return item.data.rawInput;
    case 'reminders':
      return item.data.remindAt;
  }
}

export function toConfirmData(resolved: ResolvedParseResult): ConfirmData {
  const { intent, item } = resolved;
  const label = TYPE_LABEL[item.type];
  const detail = `${itemTitle(item)} (${itemDetail(item)})`;

  const message =
    intent === 'create'
      ? `${label.subject} 저장했어요`
      : intent === 'update'
        ? `${label.object} 수정했어요`
        : intent === 'delete'
          ? `${label.object} 삭제했어요`
          : intent === 'complete'
            ? `${label.object} 완료로 기록했어요`
            : `${label.object} 조회했어요`;

  return {
    message,
    detail,
    actions:
      intent === 'complete'
        ? [{ label: '실행 취소', action: 'undo' }]
        : [
            { label: '수정', action: 'edit' },
            { label: '실행 취소', action: 'undo' },
          ],
  };
}
