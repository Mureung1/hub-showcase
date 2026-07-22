import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { createInitialState } from './types';
import type { TaxInputState } from './types';
import { cellsForTopic, getIn, sectionIntroCellFor, setIn } from './engine';
import type { Cell, EngineIO } from './engine';
import { ANNUAL_TOPIC_ORDER, TOPIC_WEIGHT, topicWeightTotal } from './catalog';

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

// ── localStorage 임시저장 — 새로고침/이탈해도 입력이 살아남는다 ────────────
// 자동 복원 + 계산(또는 온보딩 저장) 성공 시 clearDraft()로 지운다.
const DRAFT_VERSION = 1;

interface Draft {
  v: number;
  data: TaxInputState;
  gateAnswers: Record<string, boolean>;
  cursor: EngineCursor;
}

function loadDraft(storageKey: string | undefined, topicOrder: string[]): Draft | null {
  if (!storageKey) return null;
  try {
    const raw = localStorage.getItem(`taxwiz-draft:${storageKey}`);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    if (draft.v !== DRAFT_VERSION) return null; // 구조가 바뀐 옛 초안은 버린다
    if (!topicOrder.includes(draft.cursor.topicKey)) return null;
    return draft;
  } catch {
    return null;
  }
}

/** 위저드 엔진 훅 — 온보딩/연간 두 위저드가 topicOrder만 달리해 공유한다.
 * @param topicOrder 진행할 토픽 순서 (기본: 연간 입력 전체)
 * @param init 초기 상태 가공 — 저장된 회사 프로필을 미리 채울 때 쓴다
 * @param storageKey 주면 localStorage에 자동 임시저장·복원한다 (예: `annual:3`, `onboarding`) */
export function useTaxInputEngine(
  topicOrder: string[] = ANNUAL_TOPIC_ORDER,
  init?: (base: TaxInputState) => TaxInputState,
  storageKey?: string,
) {
  // 초안이 있으면 그걸로, 없으면 init을 거친 초기 상태로 — 셋 다 lazy initializer라
  // StrictMode의 이중 렌더에도 안전하다.
  const [draft] = useState<Draft | null>(() => loadDraft(storageKey, topicOrder));
  const [data, dispatch] = useReducer(
    dataReducer, undefined,
    () => draft?.data ?? (init ? init(createInitialState()) : createInitialState()),
  );
  const [gateAnswers, setGateAnswers] = useState<Record<string, boolean>>(() => draft?.gateAnswers ?? {});
  const [cursor, setCursor] = useState<EngineCursor>(
    () => draft?.cursor ?? { topicKey: topicOrder[0], frontier: 0, history: [], editingId: null },
  );

  useEffect(() => {
    if (!storageKey) return;
    const draft: Draft = { v: DRAFT_VERSION, data, gateAnswers, cursor: { ...cursor, editingId: null } };
    localStorage.setItem(`taxwiz-draft:${storageKey}`, JSON.stringify(draft));
  }, [storageKey, data, gateAnswers, cursor]);

  const clearDraft = useCallback(() => {
    if (storageKey) localStorage.removeItem(`taxwiz-draft:${storageKey}`);
  }, [storageKey]);

  const setPath = useCallback((path: (string | number)[], value: any) => dispatch({ type: 'SET', path, value }), []);
  const pushAt = useCallback((path: (string | number)[], value: any) => dispatch({ type: 'PUSH', path, value }), []);
  const setGateAnswer = useCallback((id: string, v: boolean) => setGateAnswers((prev) => ({ ...prev, [id]: v })), []);

  const io: EngineIO = useMemo(
    () => ({ data, setPath, pushAt, gateAnswers, setGateAnswer }),
    [data, setPath, pushAt, gateAnswers, setGateAnswer],
  );

  // 토픽의 셀 목록 — 섹션 첫 토픽이면 "미리 준비할 것" 카드가 맨 앞에 붙는다.
  // goBack의 이전 토픽 길이 계산도 반드시 이 함수를 써야 frontier가 안 어긋난다.
  const cellsFor = useCallback((topicKey: string): Cell[] => {
    const base = cellsForTopic(topicKey, io);
    const intro = sectionIntroCellFor(topicKey, topicOrder, io);
    return intro ? [intro, ...base] : base;
  }, [io, topicOrder]);

  const cells = useMemo(() => cellsFor(cursor.topicKey), [cellsFor, cursor.topicKey]);

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
    const idx = topicOrder.indexOf(cursor.topicKey);
    if (idx >= topicOrder.length - 1) return; // already the last topic — nothing to roll into
    setCursor((prev) => {
      if (prev.editingId || prev.frontier < cells.length) return prev; // stale guard re-check
      return { topicKey: topicOrder[idx + 1], frontier: 0, history: [...prev.history, prev.topicKey], editingId: null };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor.frontier, cursor.topicKey, cursor.editingId, cells.length, topicOrder]);

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
        const prevCells = cellsFor(topicKey);
        return { topicKey, frontier: Math.max(0, prevCells.length - 1), history: prev.history.slice(0, -1), editingId: null };
      }
      return prev;
    });
  }, [cellsFor]);

  const startEdit = useCallback((id: string) => setCursor((prev) => ({ ...prev, editingId: id })), []);
  const cancelEdit = useCallback(() => setCursor((prev) => ({ ...prev, editingId: null })), []);

  const canGoBack = cursor.frontier > 0 || cursor.history.length > 0 || !!cursor.editingId;

  const weightTotal = useMemo(() => topicWeightTotal(topicOrder), [topicOrder]);

  // 진행 가중치 소비량 — 진행률(%)과 잔여 문항 추정이 공유한다
  const consumedWeight = useMemo(() => {
    const idx = topicOrder.indexOf(cursor.topicKey);
    let before = 0;
    for (let i = 0; i < idx; i += 1) before += TOPIC_WEIGHT[topicOrder[i]] || 3;
    const frac = cells.length ? Math.min(1, cursor.frontier / cells.length) : 1;
    return before + (TOPIC_WEIGHT[cursor.topicKey] || 3) * frac;
  }, [cursor.topicKey, cursor.frontier, cells.length, topicOrder]);

  const progressPct = Math.round((100 * consumedWeight) / weightTotal);

  // 셀이 답변에 따라 동적 생성되므로 정확한 총 문항 수는 알 수 없다 — 가중치(≈예상 문항 수)
  // 기반 추정치. UI에서는 "약 N문항"으로 표기해 오차를 면책한다.
  const remainingEst = Math.max(0, Math.round(weightTotal - consumedWeight));

  // 마지막 토픽의 셀까지 모두 답했는가 — 온보딩처럼 "끝나면 제출 버튼"인 위저드가 쓴다
  const finished = cursor.topicKey === topicOrder[topicOrder.length - 1] && cursor.frontier >= cells.length;

  return {
    data, cells, topicKey: cursor.topicKey, frontier: cursor.frontier, editingId: cursor.editingId,
    canGoBack, progressPct, remainingEst, finished,
    restoredFromDraft: draft != null,
    commit, goBack, startEdit, cancelEdit, clearDraft,
  };
}
