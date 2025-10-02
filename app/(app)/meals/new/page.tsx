'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

type IngredientInput = {
  name: string;
  quantity?: number | '';
  unit?: string;
  section?: string;
};

export default function NewMealPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [calories, setCalories] = useState<number | ''>('');
  const [protein, setProtein] = useState<number | ''>('');
  const [carbs, setCarbs] = useState<number | ''>('');
  const [fat, setFat] = useState<number | ''>('');
  const [tags, setTags] = useState(''); // comma-separated
  const [instructions, setInstructions] = useState('');
  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { name: '', quantity: '', unit: '', section: '' },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  function updateIngredient(idx: number, patch: Partial<IngredientInput>) {
    setIngredients((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, { name: '', quantity: '', unit: '', section: '' }]);
  }

  function removeIngredient(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setCreatedId(null);

    try {
      if (!title.trim()) throw new Error('Title is required');
      if (!calories || Number.isNaN(Number(calories))) throw new Error('Calories must be a number');

      const payload = {
        title: title.trim(),
        meal_type: mealType,
        calories: Number(calories),
        protein: protein === '' ? null : Number(protein),
        carbs: carbs === '' ? null : Number(carbs),
        fat: fat === '' ? null : Number(fat),
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        instructions: instructions.trim() || null,
        ingredients: ingredients
          .filter((i) => i.name.trim().length > 0)
          .map((i) => ({
            name: i.name.trim(),
            quantity: i.quantity === '' ? undefined : Number(i.quantity),
            unit: i.unit?.trim() || undefined,
            section: i.section?.trim() || undefined,
          })),
      };

      const res = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create meal');

      setCreatedId(json.meal?.id);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto grid gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Meal</h1>
      </header>

      {createdId && (
        <div className="rounded-md border border-green-600/40 bg-green-600/10 p-4">
          <div className="font-medium">Meal created ✅</div>
          <div className="text-sm opacity-80">ID: {createdId}</div>
          <div className="mt-3 flex gap-3">
            <button
              className="rounded-md border px-3 py-1.5 border-neutral-700 hover:bg-neutral-800"
              onClick={() => {
                // reset to create another
                setTitle('');
                setMealType('dinner');
                setCalories('');
                setProtein('');
                setCarbs('');
                setFat('');
                setTags('');
                setInstructions('');
                setIngredients([{ name: '', quantity: '', unit: '', section: '' }]);
                setCreatedId(null);
              }}
            >
              Add another
            </button>
            <button
              className="rounded-md border px-3 py-1.5 border-lime-500 hover:bg-lime-500/10"
              onClick={() => router.push('/supabase-test')}
            >
              View data
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-600/40 bg-red-600/10 p-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="grid gap-6">
        <section className="rounded-lg border border-neutral-800 p-4 grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="grid gap-1">
              <span className="text-sm opacity-80">Title</span>
              <input
                className="rounded-md border border-neutral-700 bg-transparent px-3 py-2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Chicken, rice & veg"
                required
              />
            </label>

            <label className="grid gap-1">
              <span className="text-sm opacity-80">Meal type</span>
              <select
                className="rounded-md border border-neutral-700 bg-transparent px-3 py-2"
                value={mealType}
                onChange={(e) => setMealType(e.target.value as MealType)}
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </label>

            <label className="grid gap-1">
              <span className="text-sm opacity-80">Calories (kcal)</span>
              <input
                type="number"
                className="rounded-md border border-neutral-700 bg-transparent px-3 py-2"
                value={calories}
                onChange={(e) => setCalories(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="620"
                min={0}
                required
              />
            </label>

            <div className="grid md:grid-cols-3 gap-3">
              <label className="grid gap-1">
                <span className="text-sm opacity-80">Protein (g)</span>
                <input
                  type="number"
                  className="rounded-md border border-neutral-700 bg-transparent px-3 py-2"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="40"
                  min={0}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm opacity-80">Carbs (g)</span>
                <input
                  type="number"
                  className="rounded-md border border-neutral-700 bg-transparent px-3 py-2"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="60"
                  min={0}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm opacity-80">Fat (g)</span>
                <input
                  type="number"
                  className="rounded-md border border-neutral-700 bg-transparent px-3 py-2"
                  value={fat}
                  onChange={(e) => setFat(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="12"
                  min={0}
                />
              </label>
            </div>

            <label className="grid gap-1 md:col-span-2">
              <span className="text-sm opacity-80">Tags (comma-separated)</span>
              <input
                className="rounded-md border border-neutral-700 bg-transparent px-3 py-2"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="high-protein, vegetarian"
              />
            </label>

            <label className="grid gap-1 md:col-span-2">
              <span className="text-sm opacity-80">Instructions</span>
              <textarea
                className="rounded-md border border-neutral-700 bg-transparent px-3 py-2 min-h-28"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Steps, tips, etc."
              />
            </label>
          </div>
        </section>

        <section className="rounded-lg border border-neutral-800 p-4 grid gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Ingredients</h2>
            <button
              type="button"
              onClick={addIngredient}
              className="rounded-md border border-lime-500 px-3 py-1.5 hover:bg-lime-500/10"
            >
              + Add Ingredient
            </button>
          </div>

          <div className="grid gap-3">
            {ingredients.map((row, idx) => (
              <div key={idx} className="grid md:grid-cols-5 gap-2 items-end border border-neutral-800 rounded-md p-3">
                <label className="grid gap-1 md:col-span-2">
                  <span className="text-xs opacity-70">Name</span>
                  <input
                    className="rounded-md border border-neutral-700 bg-transparent px-3 py-2"
                    value={row.name}
                    onChange={(e) => updateIngredient(idx, { name: e.target.value })}
                    placeholder="Chicken breast"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs opacity-70">Qty</span>
                  <input
                    type="number"
                    className="rounded-md border border-neutral-700 bg-transparent px-3 py-2"
                    value={row.quantity ?? ''}
                    onChange={(e) =>
                      updateIngredient(idx, {
                        quantity: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    placeholder="400"
                    min={0}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs opacity-70">Unit</span>
                  <input
                    className="rounded-md border border-neutral-700 bg-transparent px-3 py-2"
                    value={row.unit ?? ''}
                    onChange={(e) => updateIngredient(idx, { unit: e.target.value })}
                    placeholder="g"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs opacity-70">Section</span>
                  <input
                    className="rounded-md border border-neutral-700 bg-transparent px-3 py-2"
                    value={row.section ?? ''}
                    onChange={(e) => updateIngredient(idx, { section: e.target.value })}
                    placeholder="Butchery / Produce / Grains…"
                  />
                </label>
                <div className="md:col-span-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeIngredient(idx)}
                    className="text-sm rounded-md border px-3 py-1.5 border-neutral-700 hover:bg-neutral-800"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md border px-4 py-2 border-lime-500 hover:bg-lime-500/10"
          >
            {submitting ? 'Saving…' : 'Save Meal'}
          </button>
          <button
            type="button"
            className="rounded-md border px-4 py-2 border-neutral-700 hover:bg-neutral-800"
            onClick={() => router.push('/supabase-test')}
          >
            Cancel
          </button>
        </div>
      </form>
    </main>
  );
}
