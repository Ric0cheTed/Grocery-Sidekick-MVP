import OpenAI from 'openai'
import { z } from 'zod'
// ---- Types for plan generation ----
export type Ingredient = {
  name: string;
  quantity: number;
  unit: string;
  section: string;
};

export type MockMeal = {
  title: string;
  slot: 'breakfast' | 'lunch' | 'dinner';
  ingredients: Ingredient[];
};


export const Ingredient = z.object({
  name: z.string(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  section: z.string().optional(),
})
export const Meal = z.object({
  title: z.string(),
  slot: z.enum(['breakfast','lunch','dinner','snack']),
  ingredients: z.array(Ingredient),
  steps: z.array(z.string()),
  nutrition: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }),
  prep_time_min: z.number(),
  cook_time_min: z.number(),
  cost_estimate_gbp: z.number().optional(),
})
export const Day = z.object({
  day: z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4),z.literal(5),z.literal(6),z.literal(7)]),
  meals: z.array(Meal),
})
export const PlanOutput = z.object({
  week_start: z.string(),
  days: z.array(Day),
  totals: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }),
  shopping_list: z.array(Ingredient),
})

const mockPlan = (): z.infer<typeof PlanOutput> => {
  const meals: MockMeal[] = [
    { title: 'Greek Yogurt & Berries', slot: 'breakfast',
      ingredients:[{name:'Greek yogurt',quantity:500,unit:'g',section:'Dairy'},{name:'Mixed berries',quantity:300,unit:'g',section:'Produce'},{name:'Honey',quantity:2,unit:'tbsp',section:'Grocery'}],
      steps:['Spoon yogurt','Top with berries','Drizzle honey'],
      nutrition:{calories:400,protein:25,carbs:45,fat:10},
      prep_time_min:5,cook_time_min:0},
    { title: 'Chicken Salad Wrap', slot: 'lunch',
      ingredients:[{name:'Chicken breast',quantity:400,unit:'g',section:'Meat'},{name:'Tortilla wraps',quantity:6,unit:'pcs',section:'Bakery'},{name:'Lettuce',quantity:1,unit:'head',section:'Produce'},{name:'Light mayo',quantity:50,unit:'g',section:'Grocery'}],
      steps:['Cook chicken','Slice and mix with mayo','Assemble wrap with lettuce'],
      nutrition:{calories:550,protein:45,carbs:50,fat:18},
      prep_time_min:10,cook_time_min:12},
    { title: 'One-pan Salmon & Veg', slot: 'dinner',
      ingredients:[{name:'Salmon fillets',quantity:4,unit:'pcs',section:'Fish'},{name:'Broccoli',quantity:2,unit:'heads',section:'Produce'},{name:'New potatoes',quantity:600,unit:'g',section:'Produce'},{name:'Olive oil',quantity:2,unit:'tbsp',section:'Grocery'}],
      steps:['Preheat oven to 200C','Toss veg with oil','Bake veg 15m','Add salmon 12m'],
      nutrition:{calories:650,protein:40,carbs:55,fat:25},
      prep_time_min:10,cook_time_min:27},
  ]

  const days = Array.from({length:7},(_,i)=>({day:i+1 as 1|2|3|4|5|6|7, meals: meals as any}))
  const totals = { calories: (400+550+650), protein: (25+45+40), carbs:(45+50+55), fat:(10+18+25) }
  const shopping: Ingredient[] = meals.flatMap(m=>m.ingredients)
  return { week_start: new Date().toISOString().slice(0,10), days, totals, shopping_list: shopping }
}

export async function structuredPlan(args: any) {
  // If no OpenAI key present, return a mock plan for reliable local testing.
  if (!process.env.OPENAI_API_KEY) return mockPlan()

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const system = `You are Grocery Sidekick. Generate a 7-day meal plan with breakfast/lunch/dinner.
Return JSON strictly matching the provided structure.`

  // Lightweight: we ask the model for JSON; zod will validate.
  const user = {
    role: 'user',
    content: JSON.stringify({
      preferences: args?.preferences ?? {},
      weekStart: args?.weekStart,
      lockMap: args?.lockMap ?? {}
    })
  } as const

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      user
    ],
    temperature: 0.7
  })

  const raw = response.choices[0].message?.content ?? ""
  // Attempt to parse JSON from the response; fallback to mock if parse fails.
  try {
    const parsed = JSON.parse(raw)
    return PlanOutput.parse(parsed)
  } catch {
    return mockPlan()
  }
}