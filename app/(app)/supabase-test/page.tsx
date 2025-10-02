'use client';

import { useEffect, useState } from 'react';
import { createMealPlan, listMealPlans, addPlanItem, listPlanItems } from '@/lib/db/mealPlans';

type PlanWithItems = Awaited<ReturnType<typeof listMealPlans>>[number] & {
  items?: Awaited<ReturnType<typeof listPlanItems>>;
};

export default function SupabaseTest() {
  const [plans, setPlans] = useState<PlanWithItems[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const p = await listMealPlans();
    const withItems = await Promise.all(
      p.map(async plan => ({ ...plan, items: await listPlanItems(plan.id) }))
    );
    setPlans(withItems);
  }

  useEffect(() => { refresh(); }, []);

  async function handleCreateDemo() {
    try {
      setLoading(true);
      const today = new Date();
      const start = today.toISOString().slice(0,10);
      const end = new Date(today.getTime()+6*86400000).toISOString().slice(0,10);

      const plan = await createMealPlan({ title: 'Demo 7-day plan', start_date: start, end_date: end });
      await addPlanItem(plan.id, { day: start, meal_type: 'breakfast', recipe: 'Greek yogurt + berries', notes: 'High protein', kcal: 350 });
      await addPlanItem(plan.id, { day: start, meal_type: 'dinner', recipe: 'Chicken, rice & veg', kcal: 620, notes: null });

      await refresh();
    } catch (e:any) {
      alert(`Create failed: ${e.message ?? e}`);
    } finally { setLoading(false); }
  }

  return (
    <main className="p-6 grid gap-6">
      <section className="rounded-lg border border-neutral-800 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Supabase Test</h1>
          <button onClick={handleCreateDemo} disabled={loading}
            className="rounded-md px-4 py-2 border border-lime-500 hover:bg-lime-500/10">
            {loading ? 'Creating…' : 'Create Demo Plan'}
          </button>
        </div>
        <p className="text-sm opacity-70 mt-1">
          Uses anon key with dev-open policies. We’ll lock this down after Auth.
        </p>
      </section>

      <section className="grid gap-4">
        {plans.length === 0 && (
          <div className="rounded-md border border-neutral-800 p-4 text-neutral-300">
            No plans yet. Click “Create Demo Plan”.
          </div>
        )}

        {plans.map(p => (
          <div key={p.id} className="rounded-md border border-neutral-800 p-4">
            <div className="font-medium">{p.title}</div>
            <div className="text-sm opacity-70">{p.start_date} → {p.end_date}</div>
            <ul className="mt-3 text-sm list-disc pl-5">
              {p.items?.map(it => (
                <li key={it.id}>
                  <span className="opacity-70">{it.day}</span> · <b>{it.meal_type}</b> — {it.recipe}
                  {it.kcal ? ` (${it.kcal} kcal)` : ''}
                </li>
              )) ?? null}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
