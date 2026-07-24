import { format, parseISO } from 'date-fns';
import type { Item, ResolvedParseResult } from '@shared/schemas';
import type { ConfirmData } from '../types/overlay';

const TYPE_LABEL: Record<Item['type'], { subject: string; object: string; noun: string }> = {
  schedules: { subject: '일정으로', object: '일정을', noun: '일정' },
  tasks: { subject: '과제로', object: '과제를', noun: '과제' },
  routines: { subject: '루틴으로', object: '루틴을', noun: '루틴' },
  meals: { subject: '식단으로', object: '식단을', noun: '식단' },
  memos: { subject: '메모로', object: '메모를', noun: '메모' },
  reminders: { subject: '리마인더로', object: '리마인더를', noun: '리마인더' },
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
  const { intent, items } = resolved;
  const [primary] = items;
  const label = TYPE_LABEL[primary.type];

  const detail = items.map((item) => `${itemTitle(item)} (${itemDetail(item)})`).join(' · ');

  const typeNouns = [...new Set(items.map((item) => TYPE_LABEL[item.type].noun))].join(' + ');
  const message =
    items.length > 1
      ? `${typeNouns}로 저장했어요`
      : intent === 'update'
        ? `${label.object} 수정했어요`
        : intent === 'delete'
          ? `${label.object} 삭제했어요`
          : intent === 'complete'
            ? `${label.object} 완료로 기록했어요`
            : intent === 'query'
              ? `${label.object} 조회했어요`
              : `${label.subject} 저장했어요`;

  return {
    message,
    detail,
    items: items.map((item) => ({ type: item.type, id: item.data.id })),
    actions:
      intent === 'complete'
        ? [{ label: '실행 취소', action: 'undo' }]
        : [
            { label: '수정', action: 'edit' },
            { label: '실행 취소', action: 'undo' },
          ],
  };
}
