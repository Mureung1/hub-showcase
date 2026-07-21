import { getSupabase } from '../lib/supabase.js';
import type {
  ConsultRequestDto,
  ConsultRequestRow,
  ConsultRequestStatus,
  CreateConsultRequestInput,
  ListMyConsultRequestsQuery,
} from '../types/consultRequest.js';

type ConsultRequestWithRelations = ConsultRequestRow & {
  gym: { name: string } | null;
  trainer: { name: string } | null;
};

function normalizeTime(value: string): string {
  const trimmed = value.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return `${trimmed}:00`;
  return trimmed;
}

function toConsultRequestDto(row: ConsultRequestWithRelations): ConsultRequestDto {
  const preferredTime = row.preferred_time.slice(0, 5);
  return {
    id: row.id,
    userId: row.user_id,
    gymId: row.gym_id,
    gymName: row.gym?.name ?? '',
    trainerId: row.trainer_id,
    trainerName: row.trainer?.name ?? null,
    name: row.name,
    phone: row.phone,
    preferredDate: row.preferred_date,
    preferredTime,
    topic: row.topic as ConsultRequestDto['topic'],
    topicDetail: row.topic_detail,
    memo: row.memo ?? '',
    shareHistoryConsent: row.share_history_consent,
    status: row.status,
    createdAt: row.created_at,
  };
}

const CONSULT_SELECT = `
  *,
  gym:gyms ( name ),
  trainer:trainers ( name )
`;

export async function createConsultRequest(
  input: CreateConsultRequestInput,
  userId?: string,
): Promise<ConsultRequestDto> {
  const supabase = getSupabase();

  const { data: gym, error: gymError } = await supabase
    .from('gyms')
    .select('id')
    .eq('id', input.gymId)
    .maybeSingle();

  if (gymError) throw new Error(gymError.message);
  if (!gym) throw new Error('NOT_FOUND');

  if (input.trainerId) {
    const { data: trainer, error: trainerError } = await supabase
      .from('trainers')
      .select('id, gym_id')
      .eq('id', input.trainerId)
      .maybeSingle();

    if (trainerError) throw new Error(trainerError.message);
    if (!trainer) throw new Error('TRAINER_NOT_FOUND');
    if (trainer.gym_id !== input.gymId) throw new Error('TRAINER_GYM_MISMATCH');
  }

  const { data, error } = await supabase
    .from('consult_requests')
    .insert({
      user_id: userId ?? null,
      gym_id: input.gymId,
      trainer_id: input.trainerId ?? null,
      name: input.name,
      phone: input.phone,
      preferred_date: input.preferredDate,
      preferred_time: normalizeTime(input.preferredTime),
      topic: input.topic,
      topic_detail: input.topicDetail ?? '',
      memo: input.memo ?? null,
      share_history_consent: input.shareHistoryConsent ?? false,
    })
    .select(CONSULT_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return toConsultRequestDto(data as ConsultRequestWithRelations);
}

export async function listMyConsultRequests(
  userId: string,
  query: ListMyConsultRequestsQuery,
): Promise<{ data: ConsultRequestDto[]; total: number; page: number; limit: number }> {
  const supabase = getSupabase();
  const from = (query.page - 1) * query.limit;
  const to = from + query.limit - 1;

  let builder = supabase
    .from('consult_requests')
    .select(CONSULT_SELECT, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (query.status) {
    builder = builder.eq('status', query.status);
  }

  const { data, error, count } = await builder.range(from, to);
  if (error) throw new Error(error.message);

  return {
    data: ((data ?? []) as ConsultRequestWithRelations[]).map(toConsultRequestDto),
    total: count ?? 0,
    page: query.page,
    limit: query.limit,
  };
}

export function isConsultRequestStatus(value: string): value is ConsultRequestStatus {
  return ['pending', 'accepted', 'rejected', 'done'].includes(value);
}
