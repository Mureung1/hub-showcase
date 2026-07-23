import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';

const PRESETS = [15, 25, 45];

function storageKey(userId, bookId) {
  return `itjang:reading-session:${userId}:${bookId}`;
}

function readSession(key) {
  try {
    const session = JSON.parse(window.sessionStorage.getItem(key));
    if (!PRESETS.includes(session?.durationMinutes)) return null;

    const isPaused = session.isPaused === true;
    const startedAt = Number.isInteger(session.startedAt) ? session.startedAt : null;
    const elapsedSeconds = Number.isInteger(session.elapsedSeconds) && session.elapsedSeconds >= 0
      ? session.elapsedSeconds
      : 0;
    return isPaused || startedAt !== null
      ? { ...session, startedAt, elapsedSeconds, isPaused }
      : null;
  } catch {
    return null;
  }
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function getElapsedSeconds(session, now) {
  if (session.isPaused || session.startedAt === null) return session.elapsedSeconds;
  return session.elapsedSeconds + Math.max(0, Math.floor((now - session.startedAt) / 1000));
}

export function TimerPanel({ userId, bookId, onEndSession }) {
  const key = storageKey(userId, bookId);
  const [session, setSession] = useState(() => readSession(key));
  const [selectedMinutes, setSelectedMinutes] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!session || session.isPaused) return undefined;

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [session]);

  const elapsedSeconds = session ? getElapsedSeconds(session, now) : 0;
  const targetSeconds = session ? session.durationMinutes * 60 : 0;
  const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);

  function startSession() {
    if (!selectedMinutes) return;

    const nextSession = {
      startedAt: Date.now(),
      durationMinutes: selectedMinutes,
      elapsedSeconds: 0,
      isPaused: false,
    };
    window.sessionStorage.setItem(key, JSON.stringify(nextSession));
    setSession(nextSession);
    setNow(nextSession.startedAt);
  }

  function pauseSession() {
    const nextSession = { ...session, startedAt: null, elapsedSeconds, isPaused: true };
    window.sessionStorage.setItem(key, JSON.stringify(nextSession));
    setSession(nextSession);
  }

  function resumeSession() {
    const nextSession = { ...session, startedAt: Date.now(), isPaused: false };
    window.sessionStorage.setItem(key, JSON.stringify(nextSession));
    setSession(nextSession);
    setNow(nextSession.startedAt);
  }

  function endSession() {
    const durationSeconds = getElapsedSeconds(session, Date.now());
    window.sessionStorage.removeItem(key);
    setSession(null);
    onEndSession(durationSeconds);
  }

  return (
    <section className="timer-panel" aria-labelledby="timer-title">
      <p className="section-kicker">OPTIONAL TIMER</p>
      <h3 id="timer-title">집중 시간을 정해볼까요?</h3>
      {session ? (
        <>
          <p className="timer-panel__time">
            {session.isPaused
              ? `${formatDuration(elapsedSeconds)} 읽었어요.`
              : remainingSeconds > 0
                ? `${formatDuration(remainingSeconds)} 남았어요.`
                : `${formatDuration(elapsedSeconds)} 읽는 중이에요.`}
          </p>
          <p>{session.isPaused ? '잠시 쉬어도 괜찮아요. 다시 읽으면 이어서 시간을 셉니다.' : '시간이 지나도 알리지 않아요. 읽기를 마칠 때 직접 기록을 남겨 주세요.'}</p>
          <div className="timer-panel__actions">
            <Button type="button" variant="outline" onClick={session.isPaused ? resumeSession : pauseSession}>
              {session.isPaused ? '계속 읽기' : '일시정지'}
            </Button>
            <Button type="button" variant="outline" onClick={endSession}>세션 종료하고 기록 남기기</Button>
          </div>
        </>
      ) : (
        <>
          <div className="timer-panel__presets" aria-label="집중 시간">
            {PRESETS.map((minutes) => (
              <Button
                key={minutes}
                type="button"
                variant="outline"
                aria-pressed={selectedMinutes === minutes}
                onClick={() => setSelectedMinutes(minutes)}
              >
                {minutes}분
              </Button>
            ))}
          </div>
          <Button type="button" disabled={!selectedMinutes} onClick={startSession}>독서 시작하기</Button>
        </>
      )}
    </section>
  );
}
