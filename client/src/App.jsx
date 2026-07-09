import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BookMarked,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  DoorOpen,
  History,
  Library,
  MessageSquareText,
  PenLine,
  Play,
  Plus,
  RefreshCcw,
  Sparkles,
  TimerReset,
  Trash2,
  User,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'hub-reading-mvp';

const quickStartTemplates = [
  {
    id: 'quiet-30',
    title: '30분 조용히 읽기',
    durationMinutes: 30,
    discussionEnabled: false,
    beginnerFriendly: true,
    description: '공강이나 저녁에 방해 없이 한 챕터를 읽기 좋은 기본 세션입니다.',
    recommendedFor: '읽을 책은 정했지만 시작이 늦어질 때',
    accent: 'bg-emerald-900',
  },
  {
    id: 'short-15',
    title: '15분 짧게 시작',
    durationMinutes: 15,
    discussionEnabled: false,
    beginnerFriendly: true,
    description: '부담을 낮추고 첫 장을 넘기는 데 집중하는 짧은 세션입니다.',
    recommendedFor: '과제 사이에 잠깐 읽고 싶을 때',
    accent: 'bg-stone-800',
  },
  {
    id: 'one-line-30',
    title: '토론 없이 한 줄 감상',
    durationMinutes: 30,
    discussionEnabled: false,
    beginnerFriendly: false,
    description: '읽고 난 뒤 한 줄 감상만 남기며 흐름을 가볍게 이어갑니다.',
    recommendedFor: '생각을 길게 정리할 힘은 없지만 기록은 남기고 싶을 때',
    accent: 'bg-amber-800',
  },
  {
    id: 'starter-60',
    title: '입문자 환영 방',
    durationMinutes: 60,
    discussionEnabled: true,
    beginnerFriendly: true,
    description: '긴 호흡으로 읽되, 처음 참여해도 부담 없는 분위기의 세션입니다.',
    recommendedFor: '주말에 충분한 시간을 두고 읽고 싶을 때',
    accent: 'bg-slate-800',
  },
];

const defaultRoomDraft = {
  title: '',
  description: '',
  durationMinutes: '30',
  discussionEnabled: false,
  beginnerFriendly: true,
};

const defaultRecordDraft = {
  bookTitle: '',
  impression: '',
  startPage: '',
  endPage: '',
};

function emptyStore() {
  return {
    user: null,
    rooms: [],
    sessions: [],
    readingRecords: [],
  };
}

function loadStore() {
  if (typeof window === 'undefined') {
    return emptyStore();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyStore();
    }

    const parsed = JSON.parse(raw);
    return normalizeExpiredSessions({
      user: parsed.user ?? null,
      rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      readingRecords: Array.isArray(parsed.readingRecords) ? parsed.readingRecords : [],
    });
  } catch {
    return emptyStore();
  }
}

function normalizeExpiredSessions(store) {
  const now = Date.now();
  let changed = false;
  const sessions = store.sessions.map((session) => {
    if (session.status === 'active' && new Date(session.endsAt).getTime() <= now) {
      changed = true;
      return { ...session, status: 'readyToRecord' };
    }
    return session;
  });

  return changed ? { ...store, sessions } : store;
}

function initialView(store) {
  if (!store.user?.hasOnboarded) {
    return { name: 'onboarding' };
  }

  const pending = store.sessions.find((session) => session.status === 'readyToRecord');
  if (pending) {
    return { name: 'record', sessionId: pending.id };
  }

  const active = store.sessions.find((session) => session.status === 'active');
  if (active) {
    return { name: 'timer', sessionId: active.id };
  }

  return { name: 'rooms' };
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDate(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
  }).format(new Date(value));
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function createQuickStartRoom(template) {
  return {
    id: createId('room'),
    title: template.title,
    description: template.description,
    durationMinutes: template.durationMinutes,
    discussionEnabled: template.discussionEnabled,
    beginnerFriendly: template.beginnerFriendly,
    participantCount: 0,
    recentCompletionText: '아직 완료 기록이 없어요',
    impressionCount: 0,
    createdBy: 'quick-start',
    createdAt: new Date().toISOString(),
    source: 'quickStart',
    templateId: template.id,
  };
}

function createSampleStore(currentStore) {
  const now = Date.now();
  const rooms = [
    {
      id: 'sample-room-calm',
      title: '밤 30분 조용한 문장',
      description: '잠들기 전 휴대폰을 내려놓고 에세이나 소설을 차분히 읽는 방입니다.',
      durationMinutes: 30,
      discussionEnabled: false,
      beginnerFriendly: true,
      participantCount: 18,
      recentCompletionText: '김초엽 단편집 22쪽',
      impressionCount: 9,
      createdBy: 'sample',
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 6).toISOString(),
      source: 'sample',
      templateId: 'quiet-30',
    },
    {
      id: 'sample-room-campus',
      title: '공강 사이 15분 시작',
      description: '강의 사이 애매하게 남은 시간에 부담 없이 첫 장을 넘기는 방입니다.',
      durationMinutes: 15,
      discussionEnabled: false,
      beginnerFriendly: true,
      participantCount: 31,
      recentCompletionText: '데미안 14쪽',
      impressionCount: 13,
      createdBy: 'sample',
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
      source: 'sample',
      templateId: 'short-15',
    },
    {
      id: 'sample-room-talk',
      title: '주말 한 줄 감상',
      description: '다 읽고 나서 긴 토론 대신 짧은 감상 하나만 남기는 느슨한 방입니다.',
      durationMinutes: 60,
      discussionEnabled: true,
      beginnerFriendly: false,
      participantCount: 12,
      recentCompletionText: '물고기는 존재하지 않는다 38쪽',
      impressionCount: 7,
      createdBy: 'sample',
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 9).toISOString(),
      source: 'sample',
      templateId: null,
    },
  ];

  const sessions = [
    {
      id: 'sample-session-completed-1',
      roomId: 'sample-room-calm',
      status: 'completed',
      startedAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
      endsAt: new Date(now - 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 30).toISOString(),
      leaveCount: 0,
    },
    {
      id: 'sample-session-completed-2',
      roomId: 'sample-room-campus',
      status: 'completed',
      startedAt: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(),
      endsAt: new Date(now - 1000 * 60 * 60 * 24 * 5 + 1000 * 60 * 15).toISOString(),
      leaveCount: 1,
    },
    {
      id: 'sample-session-pending',
      roomId: 'sample-room-talk',
      status: 'readyToRecord',
      startedAt: new Date(now - 1000 * 60 * 75).toISOString(),
      endsAt: new Date(now - 1000 * 60 * 15).toISOString(),
      leaveCount: 0,
    },
  ];

  const readingRecords = [
    {
      id: 'sample-record-1',
      sessionId: 'sample-session-completed-1',
      roomId: 'sample-room-calm',
      bookTitle: '우리가 빛의 속도로 갈 수 없다면',
      startPage: 18,
      endPage: 40,
      impression: '짧은 장면인데도 관계의 거리가 선명하게 남았다.',
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString(),
      source: 'sample',
    },
    {
      id: 'sample-record-2',
      sessionId: 'sample-session-completed-2',
      roomId: 'sample-room-campus',
      bookTitle: '데미안',
      startPage: 44,
      endPage: 58,
      impression: '혼란스러운 문장이 오히려 지금 상태와 잘 맞았다.',
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 5).toISOString(),
      source: 'sample',
    },
  ];

  return {
    user: currentStore.user?.hasOnboarded
      ? currentStore.user
      : {
          id: 'sample-user',
          nickname: '샘플 독서인',
          lastUsedNickname: '샘플 독서인',
          hasOnboarded: true,
        },
    rooms: [...currentStore.rooms.filter((room) => room.source !== 'sample'), ...rooms],
    sessions: [
      ...currentStore.sessions.filter((session) => {
        const room = currentStore.rooms.find((item) => item.id === session.roomId);
        return room?.source !== 'sample';
      }),
      ...sessions,
    ],
    readingRecords: [
      ...currentStore.readingRecords.filter((record) => record.source !== 'sample'),
      ...readingRecords,
    ],
  };
}

function getRoomTone(room) {
  const tone = [];
  tone.push(`${room.durationMinutes}분`);
  tone.push(room.discussionEnabled ? '짧은 대화' : '토론 없음');
  if (room.beginnerFriendly) {
    tone.push('입문자 환영');
  }
  return tone;
}

export default function App() {
  const [store, setStore] = useState(() => loadStore());
  const [view, setView] = useState(() => initialView(loadStore()));
  const [now, setNow] = useState(Date.now());
  const [storageError, setStorageError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [recordDetailId, setRecordDetailId] = useState(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      setStorageError('');
    } catch {
      setStorageError('저장 공간이 부족해요. 현재 입력값을 유지한 채 다시 시도해 주세요.');
    }
  }, [store]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setStore((current) => normalizeExpiredSessions(current));
  }, [now]);

  const roomsById = useMemo(
    () => new Map(store.rooms.map((room) => [room.id, room])),
    [store.rooms],
  );
  const sessionsById = useMemo(
    () => new Map(store.sessions.map((session) => [session.id, session])),
    [store.sessions],
  );
  const recordsById = useMemo(
    () => new Map(store.readingRecords.map((record) => [record.id, record])),
    [store.readingRecords],
  );
  const activeSession = store.sessions.find((session) => session.status === 'active');
  const pendingRecordSession = store.sessions.find((session) => session.status === 'readyToRecord');
  const selectedRoom = view.roomId ? roomsById.get(view.roomId) : null;
  const selectedSession = view.sessionId ? sessionsById.get(view.sessionId) : null;
  const selectedRecord = recordDetailId ? recordsById.get(recordDetailId) : null;
  const hasSampleData =
    store.rooms.some((room) => room.source === 'sample') ||
    store.readingRecords.some((record) => record.source === 'sample');

  function updateStore(updater) {
    setStore((current) => updater(current));
  }

  function goRooms() {
    setView({ name: 'rooms' });
  }

  function goRecords() {
    setView({ name: 'records' });
  }

  function createSampleData() {
    if (hasSampleData) {
      setSampleOpen(true);
      return;
    }

    const next = createSampleStore(store);
    setStore(next);
    setView({ name: 'rooms' });
  }

  function replaceSampleData() {
    const next = createSampleStore(store);
    setStore(next);
    setSampleOpen(false);
    setView({ name: 'rooms' });
  }

  function resetAllData() {
    setStore(emptyStore());
    setResetOpen(false);
    setRecordDetailId(null);
    setView({ name: 'onboarding' });
  }

  function createRoomFromDraft(roomDraft) {
    const room = {
      id: createId('room'),
      title: roomDraft.title.trim(),
      description: roomDraft.description.trim(),
      durationMinutes: Number(roomDraft.durationMinutes),
      discussionEnabled: roomDraft.discussionEnabled,
      beginnerFriendly: roomDraft.beginnerFriendly,
      participantCount: 0,
      recentCompletionText: '아직 완료 기록이 없어요',
      impressionCount: 0,
      createdBy: store.user?.nickname ?? 'user',
      createdAt: new Date().toISOString(),
      source: 'manual',
      templateId: null,
    };

    updateStore((current) => ({ ...current, rooms: [room, ...current.rooms] }));
    setView({ name: 'roomDetail', roomId: room.id });
  }

  function selectQuickTemplate(template) {
    if (activeSession) {
      setView({ name: 'timer', sessionId: activeSession.id });
      return;
    }

    if (pendingRecordSession) {
      setView({ name: 'record', sessionId: pendingRecordSession.id });
      return;
    }

    const room = createQuickStartRoom(template);
    updateStore((current) => ({ ...current, rooms: [room, ...current.rooms] }));
    setView({ name: 'roomDetail', roomId: room.id, fromQuickStart: true });
  }

  function discardQuickStartRoom(roomId) {
    updateStore((current) => ({
      ...current,
      rooms: current.rooms.filter((room) => room.id !== roomId),
    }));
    setView({ name: 'quickStart' });
  }

  function startSession(room) {
    if (activeSession) {
      setView({ name: 'timer', sessionId: activeSession.id });
      return;
    }

    if (pendingRecordSession) {
      setView({ name: 'record', sessionId: pendingRecordSession.id });
      return;
    }

    const startedAt = new Date();
    const session = {
      id: createId('session'),
      roomId: room.id,
      status: 'active',
      startedAt: startedAt.toISOString(),
      endsAt: new Date(startedAt.getTime() + room.durationMinutes * 60 * 1000).toISOString(),
      leaveCount: 0,
    };

    updateStore((current) => ({ ...current, sessions: [session, ...current.sessions] }));
    setView({ name: 'timer', sessionId: session.id });
  }

  function markSessionPending(sessionId) {
    updateStore((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.id === sessionId ? { ...session, status: 'readyToRecord' } : session,
      ),
    }));
    setView({ name: 'record', sessionId });
  }

  function abandonSession(sessionId) {
    updateStore((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              status: 'abandoned',
              leaveCount: session.leaveCount + 1,
              abandonedAt: new Date().toISOString(),
            }
          : session,
      ),
    }));
    setView({ name: 'rooms' });
  }

  function saveRecord(session, recordDraft) {
    const startPage = Number(recordDraft.startPage);
    const endPage = Number(recordDraft.endPage);
    const record = {
      id: createId('record'),
      sessionId: session.id,
      roomId: session.roomId,
      bookTitle: recordDraft.bookTitle.trim(),
      startPage,
      endPage,
      impression: recordDraft.impression.trim(),
      createdAt: new Date().toISOString(),
      source: 'user',
    };

    updateStore((current) => {
      if (current.readingRecords.some((item) => item.sessionId === session.id)) {
        return current;
      }

      return {
        ...current,
        sessions: current.sessions.map((item) =>
          item.id === session.id ? { ...item, status: 'completed' } : item,
        ),
        rooms: current.rooms.map((room) =>
          room.id === session.roomId
            ? {
                ...room,
                participantCount: room.participantCount + 1,
                impressionCount: room.impressionCount + 1,
                recentCompletionText: `${record.bookTitle} ${endPage - startPage + 1}쪽`,
              }
            : room,
        ),
        readingRecords: [record, ...current.readingRecords],
      };
    });
    setView({ name: 'records' });
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(119,142,97,0.16),transparent_32rem),linear-gradient(180deg,#f8f6ee,#f2efe4)] text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 lg:px-8">
        {store.user?.hasOnboarded && (
          <AppHeader
            activeSession={activeSession}
            pendingRecordSession={pendingRecordSession}
            onGoRooms={goRooms}
            onGoRecords={goRecords}
            onResumeActive={() => setView({ name: 'timer', sessionId: activeSession.id })}
            onResumePending={() =>
              setView({ name: 'record', sessionId: pendingRecordSession.id })
            }
            user={store.user}
          />
        )}

        {storageError && (
          <NoticeBanner
            tone="danger"
            icon={AlertCircle}
            title="저장할 수 없어요"
            description={storageError}
          />
        )}

        {store.user?.hasOnboarded && activeSession && view.name !== 'timer' && (
          <NoticeBanner
            icon={Clock3}
            title="진행 중인 세션이 있어요"
            description={`${roomsById.get(activeSession.roomId)?.title ?? '독서방'}에서 ${formatRemaining(
              new Date(activeSession.endsAt).getTime() - now,
            )} 남았어요.`}
            actionLabel="타이머로 돌아가기"
            onAction={() => setView({ name: 'timer', sessionId: activeSession.id })}
          />
        )}

        {store.user?.hasOnboarded && pendingRecordSession && view.name !== 'record' && (
          <NoticeBanner
            icon={PenLine}
            title="기록 대기 세션이 남아 있어요"
            description="끝난 독서 세션의 책과 감상을 저장하면 목표 진행률에 반영됩니다."
            actionLabel="기록 작성"
            onAction={() => setView({ name: 'record', sessionId: pendingRecordSession.id })}
          />
        )}

        <section className="flex flex-1 py-5">
          {view.name === 'onboarding' && (
            <OnboardingScreen
              lastUsedNickname={store.user?.lastUsedNickname}
              onCreateSampleData={createSampleData}
              onReset={() => setResetOpen(true)}
              onStart={(nickname) => {
                setStore((current) => ({
                  ...current,
                  user: {
                    id: current.user?.id ?? createId('user'),
                    nickname,
                    lastUsedNickname: nickname,
                    hasOnboarded: true,
                  },
                }));
                setView({ name: 'rooms' });
              }}
            />
          )}

          {view.name === 'rooms' && (
            <RoomListScreen
              rooms={store.rooms}
              records={store.readingRecords}
              sessions={store.sessions}
              activeSession={activeSession}
              pendingRecordSession={pendingRecordSession}
              onAddSampleData={createSampleData}
              onCreateRoom={() => setView({ name: 'createRoom' })}
              onOpenRoom={(room) => setView({ name: 'roomDetail', roomId: room.id })}
              onOpenRecords={goRecords}
              onQuickStart={() => setView({ name: 'quickStart' })}
              onReset={() => setResetOpen(true)}
              onResumeActive={() => setView({ name: 'timer', sessionId: activeSession.id })}
              onResumePending={() =>
                setView({ name: 'record', sessionId: pendingRecordSession.id })
              }
            />
          )}

          {view.name === 'quickStart' && (
            <QuickStartScreen
              activeSession={activeSession}
              pendingRecordSession={pendingRecordSession}
              onBack={goRooms}
              onSelectTemplate={selectQuickTemplate}
            />
          )}

          {view.name === 'createRoom' && (
            <RoomCreateScreen onBack={goRooms} onSubmit={createRoomFromDraft} />
          )}

          {view.name === 'roomDetail' && (
            <RoomDetailScreen
              room={selectedRoom}
              activeSession={activeSession}
              pendingRecordSession={pendingRecordSession}
              records={store.readingRecords.filter((record) => record.roomId === selectedRoom?.id)}
              onBack={goRooms}
              onDiscardQuickStart={discardQuickStartRoom}
              onOpenRecords={goRecords}
              onResumeActive={() => setView({ name: 'timer', sessionId: activeSession.id })}
              onResumePending={() =>
                setView({ name: 'record', sessionId: pendingRecordSession.id })
              }
              onStart={startSession}
            />
          )}

          {view.name === 'timer' && (
            <TimerScreen
              now={now}
              room={selectedSession ? roomsById.get(selectedSession.roomId) : null}
              session={selectedSession}
              onAbandon={abandonSession}
              onBack={goRooms}
              onRecord={markSessionPending}
            />
          )}

          {view.name === 'record' && (
            <RecordFormScreen
              room={selectedSession ? roomsById.get(selectedSession.roomId) : null}
              session={selectedSession}
              onBack={goRooms}
              onSave={saveRecord}
            />
          )}

          {view.name === 'records' && (
            <RecordsScreen
              roomsById={roomsById}
              sessions={store.sessions}
              records={store.readingRecords}
              pendingSessions={store.sessions.filter((session) => session.status === 'readyToRecord')}
              onBack={goRooms}
              onOpenRecord={(recordId) => setRecordDetailId(recordId)}
              onResumePending={(sessionId) => setView({ name: 'record', sessionId })}
              onReenterRoom={(roomId) => setView({ name: 'roomDetail', roomId })}
            />
          )}
        </section>
      </div>

      <ResetDialog open={resetOpen} onOpenChange={setResetOpen} onConfirm={resetAllData} />
      <SampleDialog
        open={sampleOpen}
        onOpenChange={setSampleOpen}
        onConfirm={replaceSampleData}
      />
      <RecordDetailDialog
        record={selectedRecord}
        room={selectedRecord ? roomsById.get(selectedRecord.roomId) : null}
        onOpenChange={(open) => {
          if (!open) {
            setRecordDetailId(null);
          }
        }}
        onReenterRoom={(roomId) => {
          setRecordDetailId(null);
          setView({ name: 'roomDetail', roomId });
        }}
      />
    </main>
  );
}

function AppHeader({
  activeSession,
  pendingRecordSession,
  onGoRecords,
  onGoRooms,
  onResumeActive,
  onResumePending,
  user,
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-border/80 pb-4 lg:flex-row lg:items-center lg:justify-between">
      <button
        className="flex w-fit items-center gap-3 text-left"
        type="button"
        onClick={onGoRooms}
      >
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BookOpen className="size-5" />
        </span>
        <span>
          <span className="block text-lg font-semibold">읽는 방</span>
          <span className="block text-sm text-muted-foreground">짧게 시작하고 기록으로 돌아오기</span>
        </span>
      </button>

      <div className="flex flex-wrap items-center gap-2">
        <Badge className="h-8 rounded-lg border-stone-300 bg-white/70 text-stone-700" variant="outline">
          <User className="size-3.5" />
          {user.nickname}
        </Badge>
        <Button variant="outline" onClick={onGoRooms}>
          <Library />
          방 목록
        </Button>
        <Button variant="outline" onClick={onGoRecords}>
          <History />
          내 기록
        </Button>
        {activeSession && (
          <Button onClick={onResumeActive}>
            <Clock3 />
            진행 중
          </Button>
        )}
        {pendingRecordSession && (
          <Button onClick={onResumePending}>
            <PenLine />
            기록 대기
          </Button>
        )}
      </div>
    </header>
  );
}

function NoticeBanner({ actionLabel, description, icon: Icon, onAction, title, tone = 'default' }) {
  return (
    <div
      className={cn(
        'mt-4 flex flex-col gap-3 rounded-lg border p-4 shadow-sm md:flex-row md:items-center md:justify-between',
        tone === 'danger'
          ? 'border-red-200 bg-red-50 text-red-950'
          : 'border-emerald-200 bg-emerald-50 text-emerald-950',
      )}
    >
      <div className="flex gap-3">
        <Icon className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="mb-1 font-semibold">{title}</p>
          <p className="mb-0 text-sm opacity-80">{description}</p>
        </div>
      </div>
      {actionLabel && (
        <Button className="w-full md:w-fit" onClick={onAction} variant="outline">
          {actionLabel}
          <ChevronRight />
        </Button>
      )}
    </div>
  );
}

function OnboardingScreen({ lastUsedNickname, onCreateSampleData, onReset, onStart }) {
  const [nickname, setNickname] = useState(lastUsedNickname ?? '');
  const [showExamples, setShowExamples] = useState(false);
  const [error, setError] = useState('');
  const examples = ['공강독서', '밤책갈피', '한챕터만'];

  function submit(event) {
    event.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError('닉네임을 입력해 주세요.');
      return;
    }
    if (trimmed.length > 20) {
      setError('닉네임은 20자 이내로 입력해 주세요.');
      return;
    }
    setError('');
    onStart(trimmed);
  }

  return (
    <div className="grid w-full items-center gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.7fr)]">
      <section className="max-w-3xl">
        <Badge className="mb-5 h-7 rounded-lg border-emerald-200 bg-emerald-50 text-emerald-900" variant="outline">
          <Sparkles className="size-3.5" />
          14일 내 3회 세션
        </Badge>
        <h1 className="mb-5 max-w-2xl text-5xl font-semibold leading-tight text-stone-950 lg:text-7xl">
          읽기 시작을 가볍게 만드는 독서방
        </h1>
        <p className="max-w-xl text-lg leading-8 text-stone-700">
          닉네임만 정하고 방에 들어가 정해진 시간 동안 읽은 뒤, 바로 책과 감상을 남깁니다.
        </p>
        <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-3">
          {[
            ['짧게 시작', '15분 또는 30분 템플릿'],
            ['기록 대기', '나중에 작성해도 복귀'],
            ['샘플 제외', '목표는 실제 기록만 반영'],
          ].map(([title, text]) => (
            <div className="rounded-lg border border-stone-200 bg-white/65 p-4" key={title}>
              <p className="mb-1 text-sm font-semibold text-stone-950">{title}</p>
              <p className="mb-0 text-sm leading-6 text-stone-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <Card className="rounded-lg bg-card/95 shadow-xl shadow-stone-900/5">
        <CardHeader>
          <CardTitle className="text-xl">바로 시작하기</CardTitle>
          <CardDescription>회원가입 없이 이 브라우저에만 저장됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="nickname">닉네임</Label>
              <Input
                id="nickname"
                maxLength={24}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="예: 공강독서"
                value={nickname}
              />
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className={cn(error ? 'text-destructive' : 'text-muted-foreground')}>
                  {error || '20자 이내로 입력해 주세요.'}
                </span>
                <span className="text-muted-foreground">{nickname.length}/20</span>
              </div>
            </div>

            {lastUsedNickname && (
              <Button
                className="w-full justify-start"
                onClick={() => setNickname(lastUsedNickname)}
                type="button"
                variant="outline"
              >
                <History />
                {lastUsedNickname}
              </Button>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowExamples((current) => !current)} type="button" variant="ghost">
                <Sparkles />
                예시 닉네임
              </Button>
              {showExamples &&
                examples.map((example) => (
                  <Button
                    key={example}
                    onClick={() => setNickname(example)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {example}
                  </Button>
                ))}
            </div>

            <Button className="h-10 w-full" type="submit">
              <Play />
              시작하기
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2 bg-muted/35">
          <Button onClick={onCreateSampleData} variant="outline">
            <BookMarked />
            샘플 데이터로 둘러보기
          </Button>
          <Button onClick={onReset} variant="ghost">
            <Trash2 />
            데이터 초기화
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function RoomListScreen({
  activeSession,
  onAddSampleData,
  onCreateRoom,
  onOpenRecords,
  onOpenRoom,
  onQuickStart,
  onReset,
  onResumeActive,
  onResumePending,
  pendingRecordSession,
  records,
  rooms,
  sessions,
}) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const completedUserRecords = records.filter((record) => {
    const createdAt = new Date(record.createdAt).getTime();
    const fourteenDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 14;
    return record.source === 'user' && createdAt >= fourteenDaysAgo;
  });
  const goalPercent = Math.min(100, (completedUserRecords.length / 3) * 100);

  const visibleRooms = rooms
    .filter((room) => {
      if (filter === 'sample') {
        return room.source === 'sample';
      }
      if (filter === 'user') {
        return room.source !== 'sample';
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === 'popular') {
        return b.participantCount - a.participantCount;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="w-full space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-stone-200 bg-white/70 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <Badge className="mb-3 rounded-lg border-emerald-200 bg-emerald-50 text-emerald-900" variant="outline">
                방 목록
              </Badge>
              <h2 className="mb-2 text-3xl font-semibold text-stone-950">오늘 들어갈 독서방</h2>
              <p className="mb-0 max-w-2xl text-sm leading-6 text-stone-600">
                빠른 시작으로 방을 준비하거나 직접 방을 만들 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={onQuickStart}>
                <TimerReset />
                빠른 시작
              </Button>
              <Button onClick={onCreateRoom} variant="outline">
                <Plus />
                방 만들기
              </Button>
              <Button onClick={onOpenRecords} variant="outline">
                <History />
                내 기록
              </Button>
            </div>
          </div>
        </section>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>14일 목표</CardTitle>
            <CardDescription>실제 완료 기록만 반영, 샘플 제외</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-semibold">{completedUserRecords.length}/3</span>
              <span className="text-sm text-muted-foreground">세션</span>
            </div>
            <Progress className="h-2 bg-stone-200" value={goalPercent} />
          </CardContent>
        </Card>
      </div>

      {(activeSession || pendingRecordSession) && (
        <div className="grid gap-3 md:grid-cols-2">
          {activeSession && (
            <ActionStrip
              icon={Clock3}
              title="진행 중인 세션"
              description="새 방을 만들기 전에 현재 타이머로 돌아갑니다."
              label="타이머 열기"
              onClick={onResumeActive}
            />
          )}
          {pendingRecordSession && (
            <ActionStrip
              icon={PenLine}
              title="기록 대기"
              description="완료 기록을 저장해야 목표에 반영됩니다."
              label="기록 작성"
              onClick={onResumePending}
            />
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white/60 p-3 md:flex-row md:items-center md:justify-between">
        <Tabs onValueChange={setFilter} value={filter}>
          <TabsList className="h-auto flex-wrap" variant="line">
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="user">내 방</TabsTrigger>
            <TabsTrigger value="sample">샘플</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select onValueChange={setSort} value={sort}>
          <SelectTrigger className="w-full bg-white md:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">최근 생성순</SelectItem>
            <SelectItem value="popular">참여 많은순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visibleRooms.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleRooms.map((room) => (
            <RoomCard key={room.id} onOpen={() => onOpenRoom(room)} room={room} />
          ))}
        </div>
      ) : (
        <EmptyState
          actions={
            <>
              <Button onClick={onQuickStart}>
                <TimerReset />
                빠른 시작
              </Button>
              <Button onClick={onCreateRoom} variant="outline">
                <Plus />
                방 만들기
              </Button>
            </>
          }
          description="아직 표시할 방이 없습니다. 짧은 템플릿으로 시작하거나 직접 방을 만들어 보세요."
          icon={Library}
          title="독서방이 비어 있어요"
        />
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={onAddSampleData} variant="outline">
          <BookMarked />
          샘플 데이터로 둘러보기
        </Button>
        <Button onClick={onReset} variant="ghost">
          <Trash2 />
          전체 데이터 초기화
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        현재 저장된 세션 {sessions.length}개, 기록 {records.length}개
      </p>
    </div>
  );
}

function ActionStrip({ description, icon: Icon, label, onClick, title }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex gap-3">
        <Icon className="mt-0.5 size-5 text-emerald-900" />
        <div>
          <p className="mb-1 font-semibold text-emerald-950">{title}</p>
          <p className="mb-0 text-sm text-emerald-800">{description}</p>
        </div>
      </div>
      <Button onClick={onClick} variant="outline">
        {label}
        <ChevronRight />
      </Button>
    </div>
  );
}

function RoomCard({ onOpen, room }) {
  return (
    <Card
      className="cursor-pointer rounded-lg bg-white/85 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-stone-900/6"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onOpen();
        }
      }}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {room.source === 'sample' && <Badge variant="secondary">샘플</Badge>}
              {room.source === 'quickStart' && <Badge variant="outline">템플릿</Badge>}
              {room.beginnerFriendly && <Badge variant="outline">입문자 환영</Badge>}
            </div>
            <CardTitle>{room.title}</CardTitle>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
        </div>
        <CardDescription className="line-clamp-2 min-h-10">{room.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Metric icon={Clock3} label={`${room.durationMinutes}분`} />
          <Metric icon={Users} label={`${room.participantCount}회`} />
          <Metric icon={MessageSquareText} label={`${room.impressionCount}개`} />
        </div>
        <div className="rounded-lg bg-stone-50 p-3">
          <p className="mb-1 text-xs font-medium text-stone-500">최근 완료 기록</p>
          <p className="mb-0 text-sm text-stone-800">{room.recentCompletionText}</p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 bg-muted/35">
        {getRoomTone(room).map((tone) => (
          <Badge key={tone} variant="outline">
            {tone}
          </Badge>
        ))}
      </CardFooter>
    </Card>
  );
}

function Metric({ icon: Icon, label }) {
  return (
    <div className="flex min-h-16 flex-col justify-center rounded-lg border border-stone-200 bg-white px-3">
      <Icon className="mb-1 size-4 text-stone-500" />
      <span className="text-sm font-semibold text-stone-900">{label}</span>
    </div>
  );
}

function QuickStartScreen({ activeSession, onBack, onSelectTemplate, pendingRecordSession }) {
  return (
    <div className="w-full space-y-5">
      <PageTop
        action={
          <Button onClick={onBack} variant="outline">
            <ArrowLeft />
            방 목록
          </Button>
        }
        eyebrow="빠른 시작"
        title="지금 읽을 방을 고르세요"
        description="선택하면 방 상세에서 조건을 확인한 뒤 바로 시작할 수 있어요."
      />

      {(activeSession || pendingRecordSession) && (
        <NoticeBanner
          icon={activeSession ? Clock3 : PenLine}
          title={activeSession ? '진행 중인 세션이 우선입니다' : '기록 대기 세션이 우선입니다'}
          description="새 템플릿 방을 만들기 전에 이어서 진행할 흐름으로 이동합니다."
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickStartTemplates.map((template) => (
          <Card key={template.id} className="rounded-lg bg-white/85">
            <div className={cn('h-1.5', template.accent)} />
            <CardHeader>
              <CardTitle>{template.title}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{template.durationMinutes}분</Badge>
                <Badge variant="outline">
                  {template.discussionEnabled ? '짧은 대화' : '토론 없음'}
                </Badge>
                {template.beginnerFriendly && <Badge variant="outline">입문자 환영</Badge>}
              </div>
              <p className="mb-0 rounded-lg bg-stone-50 p-3 text-sm leading-6 text-stone-700">
                {template.recommendedFor}
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => onSelectTemplate(template)}>
                <Check />
                선택
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RoomCreateScreen({ onBack, onSubmit }) {
  const [draft, setDraft] = useState(defaultRoomDraft);
  const [errors, setErrors] = useState({});

  function updateDraft(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!draft.title.trim()) {
      nextErrors.title = '방 제목을 입력해 주세요.';
    }
    if (!draft.description.trim()) {
      nextErrors.description = '방 설명을 입력해 주세요.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onSubmit(draft);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageTop
        action={
          <Button onClick={onBack} variant="outline">
            <ArrowLeft />
            취소
          </Button>
        }
        eyebrow="방 만들기"
        title="읽을 시간과 분위기를 정하세요"
        description="직접 만든 방은 목록에 남아 다음 세션에서도 다시 사용할 수 있습니다."
      />

      <Card className="mt-5 rounded-lg bg-white/90">
        <CardContent>
          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="room-title">제목</Label>
              <Input
                id="room-title"
                onChange={(event) => updateDraft('title', event.target.value)}
                placeholder="예: 공강 30분 소설 읽기"
                value={draft.title}
              />
              {errors.title && <p className="mb-0 text-sm text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-description">설명</Label>
              <Textarea
                id="room-description"
                onChange={(event) => updateDraft('description', event.target.value)}
                placeholder="어떤 책이나 분위기에 어울리는 방인지 적어 주세요."
                value={draft.description}
              />
              {errors.description && (
                <p className="mb-0 text-sm text-destructive">{errors.description}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>세션 시간</Label>
                <Select
                  onValueChange={(value) => updateDraft('durationMinutes', value)}
                  value={draft.durationMinutes}
                >
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15분</SelectItem>
                    <SelectItem value="30">30분</SelectItem>
                    <SelectItem value="60">60분</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ToggleField
                checked={draft.discussionEnabled}
                label="짧은 대화"
                onCheckedChange={(value) => updateDraft('discussionEnabled', value)}
              />
              <ToggleField
                checked={draft.beginnerFriendly}
                label="입문자 환영"
                onCheckedChange={(value) => updateDraft('beginnerFriendly', value)}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button onClick={onBack} type="button" variant="outline">
                취소
              </Button>
              <Button type="submit">
                <Plus />
                방 만들기
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleField({ checked, label, onCheckedChange }) {
  return (
    <div className="flex min-h-20 items-center justify-between rounded-lg border border-stone-200 bg-white px-4">
      <Label className="text-sm font-medium">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function RoomDetailScreen({
  activeSession,
  onBack,
  onDiscardQuickStart,
  onOpenRecords,
  onResumeActive,
  onResumePending,
  onStart,
  pendingRecordSession,
  records,
  room,
}) {
  if (!room) {
    return (
      <EmptyState
        actions={
          <Button onClick={onBack}>
            <ArrowLeft />
            방 목록
          </Button>
        }
        description="삭제되었거나 더 이상 저장되어 있지 않은 방입니다."
        icon={AlertCircle}
        title="존재하지 않는 방이에요"
      />
    );
  }

  const template = quickStartTemplates.find((item) => item.id === room.templateId);
  const hasStartedSession = records.length > 0 || activeSession?.roomId === room.id;
  const ctaLabel = template ? `${template.durationMinutes}분 읽기 시작` : '세션 시작';

  return (
    <div className="w-full space-y-5">
      <PageTop
        action={
          <Button onClick={onBack} variant="outline">
            <ArrowLeft />
            목록으로
          </Button>
        }
        eyebrow={room.source === 'quickStart' ? '시작 전 확인' : '방 상세'}
        title={room.title}
        description={
          room.source === 'quickStart'
            ? `${room.durationMinutes}분 ${room.discussionEnabled ? '짧은 대화' : '조용히 읽기'} 방이 준비됐어요.`
            : room.description
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-lg bg-white/90">
          <CardHeader>
            <CardTitle>세션 조건</CardTitle>
            <CardDescription>{room.description}</CardDescription>
            <CardAction>
              {room.source === 'sample' && <Badge variant="secondary">샘플</Badge>}
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              <Metric icon={Clock3} label={`${room.durationMinutes}분`} />
              <Metric icon={MessageSquareText} label={room.discussionEnabled ? '짧은 대화' : '토론 없음'} />
              <Metric icon={Users} label={room.beginnerFriendly ? '입문자 환영' : '차분한 집중'} />
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <Stat label="누적 참여" value={`${room.participantCount}회`} />
              <Stat label="최근 완료" value={room.recentCompletionText} />
              <Stat label="방 감상" value={`${room.impressionCount}개`} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2 bg-muted/35 sm:flex-row sm:justify-end">
            {room.source === 'quickStart' && !hasStartedSession && (
              <Button onClick={() => onDiscardQuickStart(room.id)} variant="outline">
                <RefreshCcw />
                다시 고르기
              </Button>
            )}
            {activeSession ? (
              <Button onClick={onResumeActive}>
                <Clock3 />
                진행 중인 세션
              </Button>
            ) : pendingRecordSession ? (
              <Button onClick={onResumePending}>
                <PenLine />
                기록 대기
              </Button>
            ) : (
              <Button onClick={() => onStart(room)}>
                <Play />
                {ctaLabel}
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card className="rounded-lg bg-white/90">
          <CardHeader>
            <CardTitle>이 방의 기록</CardTitle>
            <CardDescription>저장된 감상은 내 기록에서 다시 열 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {records.length > 0 ? (
              records.slice(0, 3).map((record) => (
                <div className="rounded-lg border border-stone-200 bg-white p-3" key={record.id}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="mb-0 font-medium">{record.bookTitle}</p>
                    {record.source === 'sample' && <Badge variant="secondary">샘플</Badge>}
                  </div>
                  <p className="mb-0 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {record.impression}
                  </p>
                </div>
              ))
            ) : (
              <p className="mb-0 rounded-lg bg-stone-50 p-4 text-sm leading-6 text-stone-600">
                아직 완료 기록이 없습니다.
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={onOpenRecords} variant="outline">
              <History />
              내 기록 보기
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function TimerScreen({ now, onAbandon, onBack, onRecord, room, session }) {
  const [leaveOpen, setLeaveOpen] = useState(false);

  if (!session || !room) {
    return (
      <EmptyState
        actions={
          <Button onClick={onBack}>
            <ArrowLeft />
            방 목록
          </Button>
        }
        description="복구할 수 있는 세션을 찾지 못했습니다."
        icon={AlertCircle}
        title="세션이 없어요"
      />
    );
  }

  const startedAt = new Date(session.startedAt).getTime();
  const endsAt = new Date(session.endsAt).getTime();
  const remaining = endsAt - now;
  const elapsed = Math.max(0, Math.min(endsAt - startedAt, now - startedAt));
  const progress = Math.min(100, (elapsed / (endsAt - startedAt)) * 100);
  const isReady = session.status === 'readyToRecord' || remaining <= 0;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <PageTop
        action={
          <Button onClick={onBack} variant="outline">
            <ArrowLeft />
            목록으로
          </Button>
        }
        eyebrow={isReady ? '기록 대기' : '세션 타이머'}
        title={room.title}
        description={isReady ? '읽은 책과 감상을 남길 차례입니다.' : '정해진 시간 동안 책에만 집중합니다.'}
      />

      <Card className="rounded-lg bg-white/95">
        <CardContent className="py-8">
          <div className="mx-auto max-w-xl text-center">
            <Badge className="mb-5 rounded-lg" variant={isReady ? 'default' : 'outline'}>
              {isReady ? '기록 대기' : `${room.durationMinutes}분 집중`}
            </Badge>
            <div className="mb-4 font-mono text-7xl font-semibold tabular-nums text-stone-950 md:text-8xl">
              {formatRemaining(remaining)}
            </div>
            <Progress className="mb-6 h-2 bg-stone-200" value={isReady ? 100 : progress} />
            <div className="grid gap-3 text-left md:grid-cols-3">
              <Stat label="시작" value={formatDateTime(session.startedAt)} />
              <Stat label="종료 예정" value={formatDateTime(session.endsAt)} />
              <Stat label="이탈 횟수" value={`${session.leaveCount}회`} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 bg-muted/35 sm:flex-row sm:justify-end">
          {isReady ? (
            <>
              <Button onClick={onBack} variant="outline">
                나중에 작성
              </Button>
              <Button onClick={() => onRecord(session.id)}>
                <PenLine />
                기록 작성하기
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setLeaveOpen(true)} variant="outline">
                <DoorOpen />
                세션 나가기
              </Button>
              <Button disabled variant="secondary">
                <PenLine />
                기록 작성하기
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {!isReady && (
        <NoticeBanner
          icon={BookOpen}
          title="타이머가 끝나면 기록 작성이 열립니다"
          description="새로고침해도 종료 시각 기준으로 남은 시간이 복구됩니다."
        />
      )}

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>세션을 나갈까요?</DialogTitle>
            <DialogDescription>
              이 세션은 중단 상태로 남고 완료 기록에는 포함되지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setLeaveOpen(false)} variant="outline">
              계속 읽기
            </Button>
            <Button onClick={() => onAbandon(session.id)} variant="destructive">
              세션 나가기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RecordFormScreen({ onBack, onSave, room, session }) {
  const [draft, setDraft] = useState(defaultRecordDraft);
  const [errors, setErrors] = useState({});

  if (!session || !room) {
    return (
      <EmptyState
        actions={
          <Button onClick={onBack}>
            <ArrowLeft />
            방 목록
          </Button>
        }
        description="기록할 세션을 찾지 못했습니다."
        icon={AlertCircle}
        title="기록 대기 세션이 없어요"
      />
    );
  }

  function updateDraft(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const startPage = Number(draft.startPage);
    const endPage = Number(draft.endPage);
    const nextErrors = {};

    if (!draft.bookTitle.trim()) {
      nextErrors.bookTitle = '책 제목을 입력해 주세요.';
    }
    if (!draft.impression.trim()) {
      nextErrors.impression = '감상을 입력해 주세요.';
    }
    if (!Number.isInteger(startPage) || startPage < 1) {
      nextErrors.startPage = '1 이상의 정수를 입력해 주세요.';
    }
    if (!Number.isInteger(endPage) || endPage < 1) {
      nextErrors.endPage = '1 이상의 정수를 입력해 주세요.';
    }
    if (Number.isInteger(startPage) && Number.isInteger(endPage) && endPage < startPage) {
      nextErrors.endPage = '끝 페이지는 시작 페이지보다 작을 수 없습니다.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onSave(session, draft);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <PageTop
        action={
          <Button onClick={onBack} variant="outline">
            <ArrowLeft />
            나중에 작성
          </Button>
        }
        eyebrow="완료 기록"
        title="방금 읽은 내용을 남기세요"
        description="정확하지 않아도 괜찮아요. 오늘 읽은 범위를 대략 남겨주세요."
      />

      <Card className="rounded-lg bg-white/95">
        <CardHeader>
          <CardTitle>세션 요약</CardTitle>
          <CardDescription>
            {room.title} · {room.durationMinutes}분 · {formatDate(session.startedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="book-title">책 제목</Label>
              <Input
                id="book-title"
                onChange={(event) => updateDraft('bookTitle', event.target.value)}
                placeholder="오늘 읽은 책"
                value={draft.bookTitle}
              />
              {errors.bookTitle && <p className="mb-0 text-sm text-destructive">{errors.bookTitle}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="impression">감상</Label>
              <Textarea
                id="impression"
                onChange={(event) => updateDraft('impression', event.target.value)}
                placeholder="읽고 난 직후 남는 생각을 짧게 적어 주세요."
                value={draft.impression}
              />
              {errors.impression && <p className="mb-0 text-sm text-destructive">{errors.impression}</p>}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start-page">시작 페이지</Label>
                <Input
                  id="start-page"
                  inputMode="numeric"
                  onChange={(event) => updateDraft('startPage', event.target.value)}
                  placeholder="1"
                  type="number"
                  value={draft.startPage}
                />
                {errors.startPage && <p className="mb-0 text-sm text-destructive">{errors.startPage}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-page">끝 페이지</Label>
                <Input
                  id="end-page"
                  inputMode="numeric"
                  onChange={(event) => updateDraft('endPage', event.target.value)}
                  placeholder="24"
                  type="number"
                  value={draft.endPage}
                />
                {errors.endPage && <p className="mb-0 text-sm text-destructive">{errors.endPage}</p>}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button onClick={onBack} type="button" variant="outline">
                나중에 작성
              </Button>
              <Button type="submit">
                <Check />
                기록 저장
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function RecordsScreen({
  onBack,
  onOpenRecord,
  onReenterRoom,
  onResumePending,
  pendingSessions,
  records,
  roomsById,
}) {
  const [filter, setFilter] = useState('all');
  const visibleRecords = records.filter((record) => {
    if (filter === 'sample') {
      return record.source === 'sample';
    }
    if (filter === 'user') {
      return record.source === 'user';
    }
    return true;
  });

  return (
    <div className="w-full space-y-5">
      <PageTop
        action={
          <Button onClick={onBack} variant="outline">
            <ArrowLeft />
            방 목록
          </Button>
        }
        eyebrow="내 기록"
        title="완료 기록과 기록 대기"
        description="샘플과 실제 기록을 구분하고, 이전 방으로 다시 돌아갈 수 있습니다."
      />

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="h-fit rounded-lg bg-white/90">
          <CardHeader>
            <CardTitle>필터</CardTitle>
            <CardDescription>목표 진행률은 실제 완료 기록만 계산합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs onValueChange={setFilter} orientation="vertical" value={filter}>
              <TabsList className="w-full items-stretch" orientation="vertical">
                <TabsTrigger className="justify-start" value="all">
                  전체
                </TabsTrigger>
                <TabsTrigger className="justify-start" value="user">
                  실제 기록
                </TabsTrigger>
                <TabsTrigger className="justify-start" value="sample">
                  샘플
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {pendingSessions.length > 0 && (
            <div className="space-y-3">
              {pendingSessions.map((session) => {
                const room = roomsById.get(session.roomId);
                return (
                  <div
                    className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 md:flex-row md:items-center md:justify-between"
                    key={session.id}
                  >
                    <div>
                      <Badge className="mb-2 rounded-lg bg-amber-900 text-white">기록 대기</Badge>
                      <p className="mb-1 font-semibold text-amber-950">{room?.title ?? '삭제된 방'}</p>
                      <p className="mb-0 text-sm text-amber-800">
                        {formatDateTime(session.endsAt)} 종료 · 저장 전까지 목표에 포함되지 않음
                      </p>
                    </div>
                    <Button onClick={() => onResumePending(session.id)}>
                      <PenLine />
                      기록 작성
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {visibleRecords.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {visibleRecords.map((record) => {
                const room = roomsById.get(record.roomId);
                return (
                  <Card className="rounded-lg bg-white/90" key={record.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="mb-2 flex gap-2">
                            {record.source === 'sample' && <Badge variant="secondary">샘플</Badge>}
                            <Badge variant="outline">{record.startPage}-{record.endPage}쪽</Badge>
                          </div>
                          <CardTitle>{record.bookTitle}</CardTitle>
                          <CardDescription>
                            {room?.title ?? '삭제된 방'} · {formatDate(record.createdAt)}
                          </CardDescription>
                        </div>
                        <BookMarked className="size-5 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-0 line-clamp-3 leading-7 text-stone-700">{record.impression}</p>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2 bg-muted/35 sm:flex-row sm:justify-end">
                      <Button onClick={() => onOpenRecord(record.id)} variant="outline">
                        상세
                      </Button>
                      {room && (
                        <Button onClick={() => onReenterRoom(room.id)}>
                          <BookOpen />
                          같은 방 다시 읽기
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <EmptyState
              description="선택한 필터에 맞는 완료 기록이 없습니다."
              icon={History}
              title="표시할 기록이 없어요"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <p className="mb-1 text-xs font-medium text-stone-500">{label}</p>
      <p className="mb-0 text-sm font-semibold leading-6 text-stone-950">{value}</p>
    </div>
  );
}

function PageTop({ action, description, eyebrow, title }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-stone-200 bg-white/70 p-5 shadow-sm md:flex-row md:items-start md:justify-between">
      <div>
        <Badge className="mb-3 rounded-lg border-emerald-200 bg-emerald-50 text-emerald-900" variant="outline">
          {eyebrow}
        </Badge>
        <h2 className="mb-2 text-3xl font-semibold leading-tight text-stone-950 md:text-4xl">{title}</h2>
        <p className="mb-0 max-w-2xl text-sm leading-6 text-stone-600">{description}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ actions, description, icon: Icon, title }) {
  return (
    <div className="flex min-h-80 w-full items-center justify-center rounded-lg border border-dashed border-stone-300 bg-white/55 p-6 text-center">
      <div className="max-w-md">
        <Icon className="mx-auto mb-4 size-10 text-stone-500" />
        <h3 className="mb-2 text-xl font-semibold text-stone-950">{title}</h3>
        <p className="mb-5 text-sm leading-6 text-stone-600">{description}</p>
        {actions && <div className="flex flex-wrap justify-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

function ResetDialog({ onConfirm, onOpenChange, open }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>전체 데이터를 초기화할까요?</DialogTitle>
          <DialogDescription>
            실제 기록과 샘플 데이터를 모두 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            취소
          </Button>
          <Button onClick={onConfirm} variant="destructive">
            <Trash2 />
            전체 데이터 초기화
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SampleDialog({ onConfirm, onOpenChange, open }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>샘플 데이터를 다시 만들까요?</DialogTitle>
          <DialogDescription>
            기존 샘플 방과 샘플 기록만 교체합니다. 사용자가 직접 만든 실제 기록은 유지됩니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            취소
          </Button>
          <Button onClick={onConfirm}>
            <RefreshCcw />
            샘플 다시 만들기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordDetailDialog({ onOpenChange, onReenterRoom, record, room }) {
  return (
    <Dialog open={Boolean(record)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {record && (
          <>
            <DialogHeader>
              <div className="mb-2 flex flex-wrap gap-2">
                {record.source === 'sample' && <Badge variant="secondary">샘플</Badge>}
                <Badge variant="outline">
                  {record.startPage}-{record.endPage}쪽
                </Badge>
              </div>
              <DialogTitle>{record.bookTitle}</DialogTitle>
              <DialogDescription>
                {room?.title ?? '삭제된 방'} · {formatDateTime(record.createdAt)}
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg bg-stone-50 p-4">
              <p className="mb-0 leading-7 text-stone-800">{record.impression}</p>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} variant="outline">
                닫기
              </Button>
              {room && (
                <Button onClick={() => onReenterRoom(room.id)}>
                  <BookOpen />
                  방에 다시 입장
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
