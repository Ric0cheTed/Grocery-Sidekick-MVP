'use client';
import { useCallback, useEffect, useState } from 'react';

type Meal = {
  id: string;
  title: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  tags: string[] | null;
  created_at: string;
};

export default function MealsPage() {
  const [type, setType] = useState<string>('all');
  const [tagDraft, setTagDraft] = useState('');      // typing buffer
  const [tag, setTag] = useState('');                // applied filter
  const [loading, setLoading] = useState(false);
  const [meals, setMeals] = useState<Meal[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (type !== 'all') qs.set('type', type);
    if (tag.trim()) qs.append('tag', tag.trim());
    const res = await fetch(`/api/meals?${qs.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    setMeals(json.meals || []);
    setLoading(false);
  }, [type, tag]); // <= only re-create when filters change

  useEffect(() => {
    // run on first render and when filters (via `load`) change
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this meal?')) return;
    const r = await fetch(`/api/meals/${id}`, { method: 'DELETE' });
    if (!r.ok) {
      const j = await r.json().catch(() => null);
      alert(j?.error || 'Delete failed');
      return;
    }
    load();
  }

  return (
    <main className="p-6 grid gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Meals</h1>
        <a href="/meals/new" className="rounded-md border px-3 py-1.5 border-lime-500 hover:bg-lime-500/10">+ New Meal</a>
      </header>

      <section className="rounded-lg border border-neutral-800 p-3 flex flex-wrap gap-3 items-end">
        <label className="grid gap-1">
          <span className="text-xs opacity-70">Type</span>
          <select
            className="rounded-md border border-neutral-700 bg-transparent px-3 py-2"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="all">All</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-xs opacity-70">Tag contains</span>
          <input
            className="rounded-md border border-neutral-700 bg-transparent px-3 py-2"
            placeholder="e.g. high-protein"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
          />
        </label>

        <button onClick={() => setTag(tagDraft)} className="rounded-md border px-3 py-2 border-neutral-700 hover:bg-neutral-800">
          Apply
        </button>

        {loading && <div className="text-sm opacity-70">Loading…</div>}
      </section>

      <section className="grid gap-3">
        {meals.length === 0 && !loading && (
          <div className="rounded-md border border-neutral-800 p-4 text-neutral-300">
            No meals found. Try adding one.
          </div>
        )}

        {meals.map((m) => (
          <div key={m.id} className="rounded-md border border-neutral-800 p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{m.title}</div>
              <div className="text-xs opacity-70">
                {m.meal_type} · {m.calories ?? 0} kcal{m.tags?.length ? ` · ${m.tags.join(', ')}` : ''}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(m.id)}
                className="text-sm rounded-md border px-3 py-1.5 border-red-600 hover:bg-red-600/10"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
