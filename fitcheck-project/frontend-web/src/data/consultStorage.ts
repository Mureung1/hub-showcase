import type {
  ConsultReportInput,
  ConsultRequest,
} from '../types/consult';

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
    const parsed = JSON.parse(raw) as Partial<ConsultRequest>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      ...(item as ConsultRequest),
      shareHistoryConsent: item.shareHistoryConsent === true,
      shareMemoWithMember: item.shareMemoWithMember === true,
      trainerReportMemo: item.trainerReportMemo ?? '',
      userFeedback: item.userFeedback ?? '',
      reportSavedAt: item.reportSavedAt,
    }));
  } catch {
    return [];
  }
}

function saveConsultRequests(requests: ConsultRequest[]): void {
  localStorage.setItem(CONSULT_STORAGE_KEY, JSON.stringify(requests));
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

export function saveConsultReport(
  id: string,
  input: ConsultReportInput,
): ConsultRequest[] {
  const now = new Date().toISOString();
  const next = loadConsultRequests().map((item) =>
    item.id === id
      ? {
          ...item,
          trainerReportMemo: input.trainerReportMemo.trim(),
          userFeedback: input.userFeedback.trim(),
          shareMemoWithMember: input.shareMemoWithMember,
          reportSavedAt: now,
          status: 'read' as const,
        }
      : item,
  );
  saveConsultRequests(next);
  postChannel({ type: 'consult-updated' });
  return next;
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
