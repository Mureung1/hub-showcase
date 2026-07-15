import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { subscribeConsultSync } from '../data/consultStorage';
import { loadData, saveData } from '../data/storage';
import type {
  AppData,
  Exercise,
  MacroType,
  MealEntry,
  MemberWithStatus,
} from '../types';
import { formatRelativeTime, todayString } from '../utils/date';
import {
  applyMacro,
  formatRoutineText,
  generateId,
} from '../utils/routine';
import { enrichMembers } from '../utils/signal';

interface AppStoreContextValue {
  data: AppData;
  members: MemberWithStatus[];
  selectedMemberId: string;
  setSelectedMemberId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  toast: string | null;
  showToast: (message: string) => void;
  sendAlert: (memberId: string, template?: string) => void;
  sendMessage: (memberId: string, message: string) => void;
  markContactComplete: (memberId: string) => void;
  copySession: (memberId: string) => Promise<void>;
  applyMacroToRoutine: (memberId: string, macro: MacroType) => void;
  applyRecommendedRoutine: (memberId: string, exercises: Exercise[]) => void;
  sendGuide: (memberId: string) => void;
  submitFeedback: (mealId: string, feedback: string) => void;
  updateRoutine: (memberId: string, exercises: Exercise[]) => void;
  addExercise: (memberId: string) => void;
  removeExercise: (memberId: string, exerciseId: string) => void;
  updateExercise: (
    memberId: string,
    exerciseId: string,
    field: keyof Exercise,
    value: string | number,
  ) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  getMemberRoutine: (memberId: string) => Exercise[];
  getMemberMeals: (memberId: string) => MealEntry[];
  draftRoutines: Record<string, Exercise[]>;
  setDraftRoutine: (memberId: string, exercises: Exercise[]) => void;
  resetDraftRoutine: (memberId: string) => void;
}

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(loadData);
  const [selectedMemberId, setSelectedMemberId] = useState('2');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [draftRoutines, setDraftRoutines] = useState<
    Record<string, Exercise[]>
  >({});

  useEffect(() => {
    saveData(data);
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => ({ ...prev }));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Keep bell notifications in sync when a consult is submitted from another tab.
  useEffect(() => {
    return subscribeConsultSync((message) => {
      if (
        message.type === 'trainer-notifications-updated' ||
        message.type === 'consult-created' ||
        message.type === 'storage'
      ) {
        setData(loadData());
      }
    });
  }, []);

  const members = useMemo(() => enrichMembers(data.members), [data.members]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const addLog = useCallback(
    (
      memberId: string,
      type: 'alert' | 'message' | 'guide' | 'feedback',
      message: string,
    ) => {
      const now = new Date().toISOString();
      setData((prev) => ({
        ...prev,
        communicationLogs: [
          {
            id: generateId(),
            memberId,
            type,
            message,
            createdAt: now,
          },
          ...prev.communicationLogs,
        ],
      }));
    },
    [],
  );

  const addNotification = useCallback((message: string) => {
    const now = new Date().toISOString();
    setData((prev) => ({
      ...prev,
      notifications: [
        {
          id: generateId(),
          message,
          time: formatRelativeTime(now),
          read: false,
          createdAt: now,
        },
        ...prev.notifications,
      ],
    }));
  }, []);

  const updateLastContact = useCallback((memberId: string) => {
    const today = todayString();
    setData((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === memberId ? { ...m, lastContactDate: today } : m,
      ),
    }));
  }, []);

  const sendAlert = useCallback(
    (memberId: string, template = '운동/식단 체크 부탁드려요!') => {
      const member = data.members.find((m) => m.id === memberId);
      if (!member) return;
      addLog(memberId, 'alert', `푸시 알림: ${template}`);
      addNotification(`${member.name} 회원에게 푸시 알림 전송`);
      updateLastContact(memberId);
      showToast(`${member.name} 회원에게 푸시 알림을 전송했습니다.`);
    },
    [data.members, addLog, addNotification, updateLastContact, showToast],
  );

  const sendMessage = useCallback(
    (memberId: string, message: string) => {
      const member = data.members.find((m) => m.id === memberId);
      if (!member || !message.trim()) return;
      addLog(memberId, 'message', message);
      updateLastContact(memberId);
      showToast(`${member.name} 회원에게 메시지를 전송했습니다.`);
    },
    [data.members, addLog, updateLastContact, showToast],
  );

  const markContactComplete = useCallback(
    (memberId: string) => {
      const member = data.members.find((m) => m.id === memberId);
      if (!member) return;
      updateLastContact(memberId);
      addLog(memberId, 'message', '연락 완료 처리');
      showToast(`${member.name} 회원 연락 완료 처리되었습니다.`);
    },
    [data.members, updateLastContact, addLog, showToast],
  );

  const getMemberRoutine = useCallback(
    (memberId: string): Exercise[] => {
      if (draftRoutines[memberId]) return draftRoutines[memberId];
      return data.routines[memberId] ?? [];
    },
    [data.routines, draftRoutines],
  );

  const setDraftRoutine = useCallback(
    (memberId: string, exercises: Exercise[]) => {
      setDraftRoutines((prev) => ({ ...prev, [memberId]: exercises }));
    },
    [],
  );

  const resetDraftRoutine = useCallback((memberId: string) => {
    setDraftRoutines((prev) => {
      const next = { ...prev };
      delete next[memberId];
      return next;
    });
  }, []);

  const copySession = useCallback(
    async (memberId: string) => {
      const member = data.members.find((m) => m.id === memberId);
      const exercises = getMemberRoutine(memberId);
      if (!member || exercises.length === 0) return;
      const text = formatRoutineText(member.name, exercises);
      try {
        await navigator.clipboard.writeText(text);
        showToast('지난 세션 루틴이 클립보드에 복사되었습니다.');
      } catch {
        showToast('클립보드 복사에 실패했습니다.');
      }
    },
    [data.members, getMemberRoutine, showToast],
  );

  const applyMacroToRoutine = useCallback(
    (memberId: string, macro: MacroType) => {
      const current = getMemberRoutine(memberId);
      const updated = applyMacro(current, macro);
      setDraftRoutine(memberId, updated);
      showToast(`점진적 과부하 매크로 적용: ${macro}`);
    },
    [getMemberRoutine, setDraftRoutine, showToast],
  );

  const applyRecommendedRoutine = useCallback(
    (memberId: string, exercises: Exercise[]) => {
      const cloned = exercises.map((ex) => ({ ...ex, id: generateId() }));
      setData((prev) => ({
        ...prev,
        routines: { ...prev.routines, [memberId]: cloned },
      }));
      setDraftRoutines((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
      showToast('추천 루틴이 적용되었습니다. 확인 후 가이드를 전송하세요.');
    },
    [showToast],
  );

  const sendGuide = useCallback(
    (memberId: string) => {
      const member = data.members.find((m) => m.id === memberId);
      const exercises = getMemberRoutine(memberId);
      if (!member || exercises.length === 0) return;
      const text = formatRoutineText(member.name, exercises);
      const now = new Date().toISOString();
      const today = todayString();
      setData((prev) => ({
        ...prev,
        routines: { ...prev.routines, [memberId]: exercises },
        sentGuides: [
          {
            id: generateId(),
            memberId,
            exercises,
            sentAt: now,
            text,
          },
          ...prev.sentGuides,
        ],
        workoutHistory: [
          {
            id: generateId(),
            memberId,
            date: today,
            exercises: structuredClone(exercises),
          },
          ...prev.workoutHistory,
        ],
      }));
      setDraftRoutines((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
      addLog(memberId, 'guide', text);
      addNotification(`${member.name} 회원에게 운동 가이드 전송`);
      updateLastContact(memberId);
      showToast(`${member.name} 회원에게 운동 가이드를 전송했습니다.`);
    },
    [
      data.members,
      getMemberRoutine,
      addLog,
      addNotification,
      updateLastContact,
      showToast,
    ],
  );

  const submitFeedback = useCallback(
    (mealId: string, feedback: string) => {
      if (!feedback.trim()) return;
      const meal = data.meals.find((m) => m.id === mealId);
      if (!meal) return;
      const member = data.members.find((m) => m.id === meal.memberId);
      const now = new Date().toISOString();
      setData((prev) => ({
        ...prev,
        meals: prev.meals.map((m) =>
          m.id === mealId
            ? { ...m, pending: false, feedback, feedbackAt: now }
            : m,
        ),
      }));
      addLog(meal.memberId, 'feedback', feedback);
      if (member) {
        addNotification(`${member.name} 회원 식단 피드백 전송`);
      }
      showToast('식단 피드백이 전송되었습니다.');
    },
    [data.meals, data.members, addLog, addNotification, showToast],
  );

  const updateRoutine = useCallback(
    (memberId: string, exercises: Exercise[]) => {
      setData((prev) => ({
        ...prev,
        routines: { ...prev.routines, [memberId]: exercises },
      }));
      showToast('루틴이 저장되었습니다.');
    },
    [showToast],
  );

  const addExercise = useCallback((memberId: string) => {
    const newEx: Exercise = {
      id: generateId(),
      name: '',
      weight: 0,
      sets: 3,
      reps: 10,
    };
    setData((prev) => ({
      ...prev,
      routines: {
        ...prev.routines,
        [memberId]: [...(prev.routines[memberId] ?? []), newEx],
      },
    }));
  }, []);

  const removeExercise = useCallback(
    (memberId: string, exerciseId: string) => {
      setData((prev) => ({
        ...prev,
        routines: {
          ...prev.routines,
          [memberId]: (prev.routines[memberId] ?? []).filter(
            (e) => e.id !== exerciseId,
          ),
        },
      }));
    },
    [],
  );

  const updateExercise = useCallback(
    (
      memberId: string,
      exerciseId: string,
      field: keyof Exercise,
      value: string | number,
    ) => {
      setData((prev) => ({
        ...prev,
        routines: {
          ...prev.routines,
          [memberId]: (prev.routines[memberId] ?? []).map((e) =>
            e.id === exerciseId ? { ...e, [field]: value } : e,
          ),
        },
      }));
    },
    [],
  );

  const markNotificationRead = useCallback((notificationId: string) => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n,
      ),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setData((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const getMemberMeals = useCallback(
    (memberId: string) => data.meals.filter((m) => m.memberId === memberId),
    [data.meals],
  );

  const value: AppStoreContextValue = {
    data,
    members,
    selectedMemberId,
    setSelectedMemberId,
    searchQuery,
    setSearchQuery,
    toast,
    showToast,
    sendAlert,
    sendMessage,
    markContactComplete,
    copySession,
    applyMacroToRoutine,
    applyRecommendedRoutine,
    sendGuide,
    submitFeedback,
    updateRoutine,
    addExercise,
    removeExercise,
    updateExercise,
    markNotificationRead,
    markAllNotificationsRead,
    getMemberRoutine,
    getMemberMeals,
    draftRoutines,
    setDraftRoutine,
    resetDraftRoutine,
  };

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore(): AppStoreContextValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}
