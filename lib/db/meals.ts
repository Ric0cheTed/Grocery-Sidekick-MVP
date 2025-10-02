// lib/db/meals.ts
import { supabase } from '../supabaseClient';

export type MealCore = {
  id: string;
  title: string;
  meal_type: 'breakfast'|'lunch'|'dinner'|'snack';
  calories: number;
  protein: number|null;
  carbs: number|null;
  fat: number|null;
  tags: string[]|null;
  instructions: string|null;
  created_at: string;
  updated_at: string;
};

export type MealIngredient = {
  id: string;
  meal_id: string;
  name: string;
  quantity: number|null;
  unit: string|null;
  section: string|null;
  created_at: string;
};

export async function createMeal(input: {
  title: string;
  meal_type: MealCore['meal_type'];
  calories: number;
  protein?: number|null;
  carbs?: number|null;
  fat?: number|null;
  tags?: string[];
  instructions?: string|null;
  ingredients?: Array<{ name: string; quantity?: number; unit?: string; section?: string }>;
}) {
  const { data: meal, error: mealErr } = await supabase
    .from('meals')
    .insert({
      title: input.title,
      meal_type: input.meal_type,
      calories: input.calories,
      protein: input.protein ?? null,
      carbs: input.carbs ?? null,
      fat: input.fat ?? null,
      tags: input.tags ?? [],
      instructions: input.instructions ?? null
    })
    .select()
    .single();
  if (mealErr) throw mealErr;

  if (input.ingredients?.length) {
    const payload = input.ingredients.map(ing => ({
      meal_id: meal.id,
      name: ing.name,
      quantity: ing.quantity ?? null,
      unit: ing.unit ?? null,
      section: ing.section ?? null
    }));
    const { error: ingErr } = await supabase.from('meal_ingredients').insert(payload);
    if (ingErr) throw ingErr;
  }

  return meal as MealCore;
}

export async function getMealWithIngredients(mealId: string) {
  const { data: meal, error: mErr } = await supabase.from('meals').select('*').eq('id', mealId).single();
  if (mErr) throw mErr;

  const { data: ingredients, error: iErr } = await supabase
    .from('meal_ingredients')
    .select('*')
    .eq('meal_id', mealId)
    .order('name', { ascending: true });
  if (iErr) throw iErr;

  return { meal: meal as MealCore, ingredients: (ingredients ?? []) as MealIngredient[] };
}

export async function listMeals(opts?: { meal_type?: MealCore['meal_type']; tagsIncludeAny?: string[] }) {
  let q = supabase.from('meals').select('*').order('created_at', { ascending: false });
  if (opts?.meal_type) q = q.eq('meal_type', opts.meal_type);
  if (opts?.tagsIncludeAny?.length) q = q.overlaps('tags', opts.tagsIncludeAny);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MealCore[];
}

/**
 * Suggest meals by simple scoring:
 * - filter by type (optional)
 * - filter by tags (optional, overlaps)
 * - score = |calories - target| (lower is better)
 * - small recency bonus so new items appear (newer gets -5)
 */
export async function suggestMeals(params: {
  targetCalories: number;
  meal_type?: MealCore['meal_type'];
  tagsIncludeAny?: string[];
  limit?: number;
}) {
  // Pull candidates (you can add tighter SQL filters later)
  const candidates = await listMeals({
    meal_type: params.meal_type,
    tagsIncludeAny: params.tagsIncludeAny
  });

  const scored = candidates.map(m => {
    const cal = m.calories ?? 0;
    const gap = Math.abs(cal - params.targetCalories);
    const recencyBonus = -5; // nudge new items slightly (constant for now)
    const score = gap + recencyBonus;
    return { meal: m, score };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, params.limit ?? 10).map(s => s.meal);
}
