// lib/ai.ts

// ---------- Types ----------
export type Ingredient = {
  name: string;
  quantity: number;
  unit: string;
  section: string;
};

export type MealSlot = 'breakfast' | 'lunch' | 'dinner';

export type MockMeal = {
  title: string;
  slot: MealSlot;
  ingredients: Ingredient[]; // NOTE: array (not readonly tuple)
};

export type DayPlan = {
  day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  meals: MockMeal[];
};

export type StructuredPlan = {
  week_start: string;
  days: DayPlan[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  shopping_list: Ingredient[];
};

// ---------- Mock plan generator (safe typings) ----------
// No `as const` anywhere — that’s what causes the readonly literal tuple unions.
export async function structuredPlan(_opts: any): Promise<StructuredPlan> {
  const meals: MockMeal[] = [
    {
      title: 'Greek yogurt bowl',
      slot: 'breakfast',
      ingredients: [
        { name: 'Greek yogurt', quantity: 500, unit: 'g', section: 'Dairy' },
        { name: 'Mixed berries', quantity: 300, unit: 'g', section: 'Produce' },
        { name: 'Honey', quantity: 50, unit: 'g', section: 'Pantry' },
      ],
    },
    {
      title: 'Chicken wraps',
      slot: 'lunch',
      ingredients: [
        { name: 'Chicken breast', quantity: 400, unit: 'g', section: 'Meat' },
        { name: 'Tortilla wraps', quantity: 6, unit: 'pcs', section: 'Bakery' },
        { name: 'Lettuce', quantity: 1, unit: 'head', section: 'Produce' },
        { name: 'Yogurt dressing', quantity: 100, unit: 'g', section: 'Dairy' },
      ],
    },
    {
      title: 'Salmon & rice',
      slot: 'dinner',
      ingredients: [
        { name: 'Salmon fillets', quantity: 2, unit: 'pcs', section: 'Fish' },
        { name: 'Rice', quantity: 200, unit: 'g', section: 'Pantry' },
        { name: 'Asparagus', quantity: 250, unit: 'g', section: 'Produce' },
      ],
    },
  ];

  const days: DayPlan[] = Array.from({ length: 7 }, (_, i) => ({
    day: (i + 1) as DayPlan['day'],
    meals, // same mock meals each day
  }));

  const totals = {
    calories: 400 + 550 + 650,
    protein: 25 + 45 + 40,
    carbs: 45 + 50 + 55,
    fat: 10 + 18 + 25,
  };

  // Explicitly typed flatten so TS widens to Ingredient[]
  const shopping: Ingredient[] = meals.flatMap((m) => m.ingredients);

  return {
    week_start: new Date().toISOString().slice(0, 10),
    days,
    totals,
    shopping_list: shopping,
  };
}
