import type { Task, Memo, ClarifyParseResult, ItemType } from '@shared/schemas';

export type ConfirmData = {
  message: string;
  detail: string;
  items: { type: ItemType; id: string }[];
  actions: { label: string; action: string }[];
};

export type ClarifyData = ClarifyParseResult;

export type QueryData = {
  title: string;
  count: number;
  sortLabel: string;
  items: Task[];
  baseDate: string;
};

export type CompletedData = {
  tasks: Task[];
  memos: Memo[];
};

export type OverlayState =
  | { type: 'none' }
  | { type: 'confirm'; data: ConfirmData }
  | { type: 'clarify'; data: ClarifyData }
  | { type: 'query'; data: QueryData }
  | { type: 'completed'; data: CompletedData }
  | { type: 'error'; message: string };
