import { getSupabaseClient } from '../lib/supabaseClient';
import type { Meal, MealCreate, MealUpdate } from '@shared/schemas';

type MealRow = {
  id: string;
  date: string;
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
  raw_input: string;
  created_at: string;
};

function rowToMeal(row: MealRow): Meal {
  return {
    id: row.id,
    date: row.date,
    breakfast: row.breakfast ?? undefined,
    lunch: row.lunch ?? undefined,
    dinner: row.dinner ?? undefined,
    rawInput: row.raw_input,
    createdAt: row.created_at,
  };
}

function mealToRow(input: MealCreate | MealUpdate) {
  const row: Record<string, unknown> = {};
  if (input.date !== undefined) row.date = input.date;
  if (input.breakfast !== undefined) row.breakfast = input.breakfast;
  if (input.lunch !== undefined) row.lunch = input.lunch;
  if (input.dinner !== undefined) row.dinner = input.dinner;
  if (input.rawInput !== undefined) row.raw_input = input.rawInput;
  return row;
}

export class MealNotFoundError extends Error {}

export async function listMeals(date?: string): Promise<Meal[]> {
  const client = getSupabaseClient();
  let query = client.from('meals').select('*').order('date', { ascending: true });
  if (date) query = query.eq('date', date);
  const { data, error } = await query;
  if (error) throw new Error(`[mealService] 조회 실패: ${error.message}`);
  return (data as MealRow[]).map(rowToMeal);
}

export async function createMeal(input: MealCreate): Promise<Meal> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('meals').insert(mealToRow(input)).select('*').single();
  if (error) throw new Error(`[mealService] 생성 실패: ${error.message}`);
  return rowToMeal(data as MealRow);
}

export async function updateMeal(id: string, input: MealUpdate): Promise<Meal> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('meals')
    .update(mealToRow(input))
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`[mealService] 수정 실패: ${error.message}`);
  if (!data) {
    throw new MealNotFoundError(`[mealService] id=${id} 식단을 찾을 수 없습니다.`);
  }
  return rowToMeal(data as MealRow);
}

export async function deleteMeal(id: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from('meals').delete().eq('id', id);
  if (error) throw new Error(`[mealService] 삭제 실패: ${error.message}`);
}
