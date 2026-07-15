import type { AppData, Notification } from '../types';
import type { ConsultRequest, ConsultRequestInput } from '../types/consult';
import { formatRelativeTime } from '../utils/date';
import { generateId } from '../utils/routine';
import { loadData, saveData } from './storage';

export const CONSULT_STORAGE_KEY = 'fitcheck-consult-requests';
export const CONSULT_CHANNEL_NAME = 'fitcheck-consult';

type ConsultChannelMessage =
  | { type: 'consult-created'; request: ConsultRequest }
  | { type: 'consult-updated' }
  | { type: 'trainer-notifications-updated' };

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  return new BroadcastChannel(CONSULT_CHANNEL_NAME);
}

function postChannel(message: ConsultChannelMessage): void {
  const channel = getChannel();
  if (!channel) return;
  channel.postMessage(message);
  channel.close();
}

export function loadConsultRequests(): ConsultRequest[] {
  try {
    const raw = localStorage.getItem(CONSULT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ConsultRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveConsultRequests(requests: ConsultRequest[]): void {
  localStorage.setItem(CONSULT_STORAGE_KEY, JSON.stringify(requests));
}

function appendTrainerNotification(notification: Notification): void {
  const data = loadData();
  const next: AppData = {
    ...data,
    notifications: [notification, ...data.notifications],
  };
  saveData(next);
  postChannel({ type: 'trainer-notifications-updated' });
}

export function addConsultRequest(input: ConsultRequestInput): ConsultRequest {
  const now = new Date().toISOString();
  const notificationId = generateId();
  const request: ConsultRequest = {
    ...input,
    id: generateId(),
    status: 'pending',
    createdAt: now,
    notificationId,
  };

  const next = [request, ...loadConsultRequests()];
  saveConsultRequests(next);

  const trainerLabel = request.trainerName
    ? ` · ${request.trainerName}`
    : '';
  appendTrainerNotification({
    id: notificationId,
    message: `${request.name}님 상담 신청 (${request.gymName}${trainerLabel})`,
    time: formatRelativeTime(now),
    read: false,
    createdAt: now,
  });

  postChannel({ type: 'consult-created', request });
  return request;
}

export function markConsultRequestRead(id: string): ConsultRequest[] {
  const next = loadConsultRequests().map((item) =>
    item.id === id ? { ...item, status: 'read' as const } : item,
  );
  saveConsultRequests(next);
  postChannel({ type: 'consult-updated' });
  return next;
}

export function markAllConsultRequestsRead(): ConsultRequest[] {
  const next = loadConsultRequests().map((item) => ({
    ...item,
    status: 'read' as const,
  }));
  saveConsultRequests(next);
  postChannel({ type: 'consult-updated' });
  return next;
}

export function countPendingConsultRequests(
  requests: ConsultRequest[] = loadConsultRequests(),
): number {
  return requests.filter((item) => item.status === 'pending').length;
}

export function subscribeConsultSync(
  onChange: (message: ConsultChannelMessage | { type: 'storage' }) => void,
): () => void {
  const channel = getChannel();
  const handleMessage = (event: MessageEvent<ConsultChannelMessage>) => {
    onChange(event.data);
  };
  const handleStorage = (event: StorageEvent) => {
    if (
      event.key === CONSULT_STORAGE_KEY ||
      event.key === 'fitcheck-trainer-data'
    ) {
      onChange({ type: 'storage' });
    }
  };

  channel?.addEventListener('message', handleMessage);
  window.addEventListener('storage', handleStorage);

  return () => {
    channel?.removeEventListener('message', handleMessage);
    channel?.close();
    window.removeEventListener('storage', handleStorage);
  };
}
