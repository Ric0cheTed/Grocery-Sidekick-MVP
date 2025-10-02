import { supabase } from '../supabaseClient';

export type MealPlan = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
};

export type PlanItem = {
  id: string;
  plan_id: string;
  day: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe: string;
  notes?: string | null;
  kcal?: number | null;
  created_at: string;
  updated_at: string;
};

export async function createMealPlan(input: {
  title: string;
  start_date: string;
  end_date: string;
}) {
  const { data, error } = await supabase
    .from('meal_plans')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as MealPlan;
}

export async function addPlanItem(planId: string, item: Omit<PlanItem,'id'|'plan_id'|'created_at'|'updated_at'>) {
  const { data, error } = await supabase
    .from('plan_items')
    .insert({ ...item, plan_id: planId })
    .select()
    .single();
  if (error) throw error;
  return data as PlanItem;
}

export async function listMealPlans() {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as MealPlan[];
}

export async function listPlanItems(planId: string) {
  const { data, error } = await supabase
    .from('plan_items')
    .select('*')
    .eq('plan_id', planId)
    .order('day', { ascending: true });
  if (error) throw error;
  return (data ?? []) as PlanItem[];
}
