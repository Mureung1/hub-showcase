import type { ConsultRequest, ConsultTopic } from '../types/consult';
import { apiGet, apiPost } from './api';

interface ApiConsultRequest {
  id: string;
  userId: string | null;
  gymId: string;
  gymName: string;
  trainerId: string | null;
  trainerName: string | null;
  name: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  topic: ConsultTopic;
  topicDetail: string;
  memo: string;
  shareHistoryConsent: boolean;
  status: 'pending' | 'accepted' | 'rejected' | 'done';
  createdAt: string;
}

interface CreateConsultRequestResponse {
  success: boolean;
  data: ApiConsultRequest;
}

interface ListMyConsultRequestsResponse {
  success: boolean;
  data: ApiConsultRequest[];
  meta: { total: number; page: number; limit: number };
}

export interface CreateConsultRequestPayload {
  gymId: string;
  trainerId?: string | null;
  name: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  topic: ConsultTopic;
  topicDetail?: string;
  memo?: string;
  shareHistoryConsent?: boolean;
}

function mapApiStatus(
  status: ApiConsultRequest['status'],
): ConsultRequest['status'] {
  return status === 'pending' ? 'pending' : 'read';
}

export function mapApiConsultRequest(api: ApiConsultRequest): ConsultRequest {
  return {
    id: api.id,
    gymId: api.gymId,
    gymName: api.gymName,
    trainerId: api.trainerId,
    trainerName: api.trainerName,
    name: api.name,
    phone: api.phone,
    date: api.preferredDate,
    time: api.preferredTime.slice(0, 5),
    topic: api.topic,
    topicDetail: api.topicDetail,
    memo: api.memo,
    shareHistoryConsent: api.shareHistoryConsent,
    status: mapApiStatus(api.status),
    createdAt: api.createdAt,
    notificationId: api.id,
  };
}

export async function createConsultRequest(
  payload: CreateConsultRequestPayload,
): Promise<ConsultRequest> {
  const res = await apiPost<CreateConsultRequestResponse>(
    '/api/v1/consult-requests',
    payload,
  );
  return mapApiConsultRequest(res.data);
}

export async function fetchMyConsultRequests(params?: {
  status?: ApiConsultRequest['status'];
  page?: number;
  limit?: number;
}): Promise<{ requests: ConsultRequest[]; meta: ListMyConsultRequestsResponse['meta'] }> {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));
  const qs = search.toString();

  const res = await apiGet<ListMyConsultRequestsResponse>(
    `/api/v1/consult-requests/me${qs ? `?${qs}` : ''}`,
  );

  return {
    requests: res.data.map(mapApiConsultRequest),
    meta: res.meta,
  };
}

interface ConsultRequestResponse {
  success: boolean;
  data: ApiConsultRequest;
}

/** Full decrypted detail (GET /consult-requests/:id). */
export async function fetchConsultRequestById(id: string): Promise<ConsultRequest> {
  const res = await apiGet<ConsultRequestResponse>(`/api/v1/consult-requests/${id}`);
  return mapApiConsultRequest(res.data);
}
