import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'fitcheck-user-courses';

export interface CourseLibraryState {
  favoriteIds: string[];
  watchHistory: Array<{ courseId: string; watchedAt: string }>;
}

type Listener = () => void;

const listeners = new Set<Listener>();

function emptyState(): CourseLibraryState {
  return { favoriteIds: [], watchHistory: [] };
}

function readState(): CourseLibraryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<CourseLibraryState>;
    return {
      favoriteIds: Array.isArray(parsed.favoriteIds) ? parsed.favoriteIds : [],
      watchHistory: Array.isArray(parsed.watchHistory) ? parsed.watchHistory : [],
    };
  } catch {
    return emptyState();
  }
}

let snapshot = readState();

function emit() {
  snapshot = readState();
  listeners.forEach((listener) => listener());
}

function writeState(next: CourseLibraryState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emit();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return emptyState();
}

export function toggleFavorite(courseId: string) {
  const current = readState();
  const exists = current.favoriteIds.includes(courseId);
  writeState({
    ...current,
    favoriteIds: exists
      ? current.favoriteIds.filter((id) => id !== courseId)
      : [...current.favoriteIds, courseId],
  });
}

export function recordWatch(courseId: string) {
  const current = readState();
  const rest = current.watchHistory.filter((item) => item.courseId !== courseId);
  writeState({
    ...current,
    watchHistory: [
      { courseId, watchedAt: new Date().toISOString() },
      ...rest,
    ].slice(0, 30),
  });
}

export function useCourseLibrary() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    favoriteIds: state.favoriteIds,
    watchHistory: state.watchHistory,
    isFavorite: (courseId: string) => state.favoriteIds.includes(courseId),
    isWatched: (courseId: string) =>
      state.watchHistory.some((item) => item.courseId === courseId),
    toggleFavorite,
    recordWatch,
  };
}
