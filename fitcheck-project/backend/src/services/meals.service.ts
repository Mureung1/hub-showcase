import { getSupabase } from '../lib/supabase.js';
import type {
  CreateMealLogInput,
  ListMealLogsQuery,
  MealLogDto,
  MealLogRow,
  MealMacros,
  MealMacrosJson,
  MealType,
  UpdateMealLogInput,
} from '../types/mealLog.js';
import { MEAL_TYPES } from '../types/mealLog.js';

const DEFAULT_MACROS: MealMacros = { carb: 0, protein: 0, fat: 0, kcal: 0 };

function normalizeMacros(value: MealMacrosJson | null | undefined): MealMacros {
  if (!value || typeof value !== 'object') return { ...DEFAULT_MACROS };

  const raw = value as Record<string, unknown>;
  return {
    carb: Number(raw.carb) || 0,
    protein: Number(raw.protein) || 0,
    fat: Number(raw.fat) || 0,
    kcal: Number(raw.kcal) || 0,
  };
}

function mergeMacros(
  existing: MealMacrosJson | null | undefined,
  patch?: Partial<MealMacros>,
): MealMacros {
  const base = normalizeMacros(existing);
  if (!patch) return base;

  return {
    carb: patch.carb !== undefined ? patch.carb : base.carb,
    protein: patch.protein !== undefined ? patch.protein : base.protein,
    fat: patch.fat !== undefined ? patch.fat : base.fat,
    kcal: patch.kcal !== undefined ? patch.kcal : base.kcal,
  };
}

function toMealLogDto(row: MealLogRow): MealLogDto {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    mealType: row.meal_type as MealType,
    time: row.time,
    memo: row.memo,
    imageUrl: row.image_url,
    macros: normalizeMacros(row.macros),
    aiFeedback: row.ai_feedback,
    createdAt: row.created_at,
  };
}
/** Ensures a profiles row exists for FK on meal_logs (fallback when auth trigger missed). */
export async function ensureProfile(userId: string): Promise<void> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) return;

  const { error: insertError } = await supabase.from('profiles').insert({
    id: userId,
    role: 'user',
  });

  if (insertError) throw new Error(insertError.message);
}

export async function listMealLogs(
  userId: string,
  query: ListMealLogsQuery,
): Promise<{ data: MealLogDto[]; total: number; page: number; limit: number }> {
  const supabase = getSupabase();
  const from = (query.page - 1) * query.limit;
  const to = from + query.limit - 1;

  let builder = supabase
    .from('meal_logs')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('time', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (query.date) {
    builder = builder.eq('date', query.date);
  } else {
    if (query.from) builder = builder.gte('date', query.from);
    if (query.to) builder = builder.lte('date', query.to);
  }

  const { data, error, count } = await builder.range(from, to);
  if (error) throw new Error(error.message);

  return {
    data: ((data ?? []) as MealLogRow[]).map(toMealLogDto),
    total: count ?? 0,
    page: query.page,
    limit: query.limit,
  };
}

export async function createMealLog(
  userId: string,
  input: CreateMealLogInput,
): Promise<MealLogDto> {
  await ensureProfile(userId);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('meal_logs')
    .insert({
      user_id: userId,
      date: input.date,
      meal_type: input.mealType,
      time: input.time ?? null,
      memo: input.memo ?? null,
      image_url: input.imageUrl ?? null,
      macros: mergeMacros(undefined, input.macros),
      ai_feedback: input.aiFeedback ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return toMealLogDto(data as MealLogRow);
}

export async function updateMealLogForUser(
  userId: string,
  id: string,
  input: UpdateMealLogInput,
): Promise<MealLogDto | null> {
  const supabase = getSupabase();

  const { data: existing, error: fetchError } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) return null;

  const row = existing as MealLogRow;
  const patch: Record<string, unknown> = {};

  if (input.date !== undefined) patch.date = input.date;
  if (input.mealType !== undefined) patch.meal_type = input.mealType;
  if (input.time !== undefined) patch.time = input.time;
  if (input.memo !== undefined) patch.memo = input.memo;
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl;
  if (input.aiFeedback !== undefined) patch.ai_feedback = input.aiFeedback;
  if (input.macros !== undefined) {
    patch.macros = mergeMacros(row.macros, input.macros);
  }

  if (Object.keys(patch).length === 0) {
    return toMealLogDto(row);
  }

  const { data, error } = await supabase
    .from('meal_logs')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return toMealLogDto(data as MealLogRow);
}

export function isMealType(value: string): value is MealType {
  return MEAL_TYPES.includes(value as MealType);
}
