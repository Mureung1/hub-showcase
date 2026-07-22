import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { createInitialState } from './types';
import type { TaxInputState } from './types';
import { cellsForTopic, getIn, setIn } from './engine';
import type { Cell, EngineIO } from './engine';
import { TOPIC_ORDER, TOPIC_WEIGHT, TOPIC_WEIGHT_TOTAL } from './catalog';

type DataAction =
  | { type: 'SET'; path: (string | number)[]; value: any }
  | { type: 'PUSH'; path: (string | number)[]; value: any };

function dataReducer(state: TaxInputState, action: DataAction): TaxInputState {
  if (action.type === 'SET') return setIn(state, action.path, action.value);
  const arr = (getIn(state, action.path) as any[]) || [];
  return setIn(state, action.path, [...arr, action.value]);
}

interface EngineCursor {
  topicKey: string;
  frontier: number;
  history: string[];
  editingId: string | null;
}

const initialCursor: EngineCursor = { topicKey: TOPIC_ORDER[0], frontier: 0, history: [], editingId: null };

export function useTaxInputEngine() {
  const [data, dispatch] = useReducer(dataReducer, undefined, createInitialState);
  const [gateAnswers, setGateAnswers] = useState<Record<string, boolean>>({});
  const [cursor, setCursor] = useState<EngineCursor>(initialCursor);

  const setPath = useCallback((path: (string | number)[], value: any) => dispatch({ type: 'SET', path, value }), []);
  const pushAt = useCallback((path: (string | number)[], value: any) => dispatch({ type: 'PUSH', path, value }), []);
  const setGateAnswer = useCallback((id: string, v: boolean) => setGateAnswers((prev) => ({ ...prev, [id]: v })), []);

  const io: EngineIO = useMemo(
    () => ({ data, setPath, pushAt, gateAnswers, setGateAnswer }),
    [data, setPath, pushAt, gateAnswers, setGateAnswer],
  );

  const cells = useMemo(() => cellsForTopic(cursor.topicKey, io), [cursor.topicKey, io]);

  // `dispatch`/`setGateAnswers` inside commit() below are deferred (React
  // batches them), so right after calling cell.set()/onGate() the `io` this
  // closure holds is still the PRE-commit snapshot — cellsForTopic() can't
  // yet see a gate's growth. Rather than fight that, advance frontier
  // unconditionally by 1 on commit, then let THIS effect — which runs once
  // data/gateAnswers have actually been committed — decide whether that
  // landed past the end of the topic and needs to roll over to the next one.
  useEffect(() => {
    if (cursor.editingId) return;
    if (cursor.frontier < cells.length) return;
    const idx = TOPIC_ORDER.indexOf(cursor.topicKey);
    if (idx >= TOPIC_ORDER.length - 1) return; // already the last topic (review) — nothing to roll into
    setCursor((prev) => {
      if (prev.editingId || prev.frontier < cells.length) return prev; // stale guard re-check
      return { topicKey: TOPIC_ORDER[idx + 1], frontier: 0, history: [...prev.history, prev.topicKey], editingId: null };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.frontier, cursor.topicKey, cursor.editingId, cells.length]);

  const commit = useCallback((cell: Cell, value: any) => {
    cell.set(value);
    if (cell.isGate && cell.onGate) cell.onGate(value);
    setCursor((prev) => {
      if (prev.editingId === cell.id) return { ...prev, editingId: null };
      return { ...prev, frontier: prev.frontier + 1, editingId: null };
    });
  }, []);

  const goBack = useCallback(() => {
    setCursor((prev) => {
      if (prev.editingId) return { ...prev, editingId: null };
      if (prev.frontier > 0) return { ...prev, frontier: prev.frontier - 1 };
      if (prev.history.length > 0) {
        const topicKey = prev.history[prev.history.length - 1];
        const prevCells = cellsForTopic(topicKey, io);
        return { topicKey, frontier: Math.max(0, prevCells.length - 1), history: prev.history.slice(0, -1), editingId: null };
      }
      return prev;
    });
  }, [io]);

  const startEdit = useCallback((id: string) => setCursor((prev) => ({ ...prev, editingId: id })), []);
  const cancelEdit = useCallback(() => setCursor((prev) => ({ ...prev, editingId: null })), []);

  const canGoBack = cursor.frontier > 0 || cursor.history.length > 0 || !!cursor.editingId;

  const progressPct = useMemo(() => {
    const idx = TOPIC_ORDER.indexOf(cursor.topicKey);
    let before = 0;
    for (let i = 0; i < idx; i += 1) before += TOPIC_WEIGHT[TOPIC_ORDER[i]];
    const frac = cells.length ? Math.min(1, cursor.frontier / cells.length) : 1;
    return Math.round((100 * (before + TOPIC_WEIGHT[cursor.topicKey] * frac)) / TOPIC_WEIGHT_TOTAL);
  }, [cursor.topicKey, cursor.frontier, cells.length]);

  return {
    data, cells, topicKey: cursor.topicKey, frontier: cursor.frontier, editingId: cursor.editingId,
    canGoBack, progressPct,
    commit, goBack, startEdit, cancelEdit,
  };
}
