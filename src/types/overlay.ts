import type { Task, ClarifyParseResult } from '@shared/schemas';

export type ConfirmData = {
  message: string;
  detail: string;
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

export type OverlayState =
  | { type: 'none' }
  | { type: 'confirm'; data: ConfirmData }
  | { type: 'clarify'; data: ClarifyData }
  | { type: 'query'; data: QueryData };
