import type { CreateMealPayload, MealLog, UpdateMealPayload } from '../types/meal';
import { apiGet, apiPatch, apiPost } from './api';

interface ApiMealLog {
  id: string;
  userId: string;
  date: string;
  mealType: MealLog['mealType'];
  time: string | null;
  memo: string | null;
  imageUrl: string | null;
  macros: MealLog['macros'];
  aiFeedback: string | null;
  createdAt: string;
  aiAnalysisPending?: boolean;
}

interface MealResponse {
  success: boolean;
  data: ApiMealLog;
}

interface ListMealsResponse {
  success: boolean;
  data: ApiMealLog[];
  meta: { total: number; page: number; limit: number };
}

function mapMealLog(api: ApiMealLog): MealLog {
  return {
    id: api.id,
    userId: api.userId,
    date: api.date,
    mealType: api.mealType,
    time: api.time,
    memo: api.memo,
    imageUrl: api.imageUrl,
    macros: api.macros,
    aiFeedback: api.aiFeedback,
    createdAt: api.createdAt,
    aiAnalysisPending: api.aiAnalysisPending,
  };
}

export async function fetchMeals(params?: {
  date?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<{ meals: MealLog[]; meta: ListMealsResponse['meta'] }> {
  const search = new URLSearchParams();
  if (params?.date) search.set('date', params.date);
  if (params?.from) search.set('from', params.from);
  if (params?.to) search.set('to', params.to);
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));
  const qs = search.toString();

  const res = await apiGet<ListMealsResponse>(`/api/v1/meals${qs ? `?${qs}` : ''}`);
  return {
    meals: res.data.map(mapMealLog),
    meta: res.meta,
  };
}

export async function createMeal(payload: CreateMealPayload): Promise<MealLog> {
  const res = await apiPost<MealResponse>('/api/v1/meals', payload);
  return mapMealLog(res.data);
}

export async function updateMeal(id: string, payload: UpdateMealPayload): Promise<MealLog> {
  const res = await apiPatch<MealResponse>(`/api/v1/meals/${id}`, payload);
  return mapMealLog(res.data);
}
