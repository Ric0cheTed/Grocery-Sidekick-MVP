import { NextRequest, NextResponse } from 'next/server'
import { structuredPlan } from '@/lib/ai'
import { assembleShoppingList } from '@/lib/shopping'
import { getSupabaseForRoute } from '@/lib/db'

// Ephemeral memory store so non-auth/local users can still open a plan page.
const memory = new Map<string, any>()

export async function POST(req: NextRequest) {
  const { supabase, user } = await getSupabaseForRoute(req as any)
  const ai = await structuredPlan({})
  const shopping = assembleShoppingList(ai)
  const plan = { ...ai, shopping_list: shopping }

  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (hasSupabase && user?.id) {
    const { data: planRow, error: planErr } = await supabase.from('meal_plans')
      .insert({ user_id: user.id, week_start: plan.week_start, summary: plan.totals })
      .select()
      .single()
    if (planErr) {
      // Fall back to memory
      const id = crypto.randomUUID()
      memory.set(id, plan)
      return NextResponse.json({ planId: id, persisted: false, error: planErr.message })
    }

    // Insert meals
    const mealRows: any[] = []
    for (const day of plan.days) {
      for (const m of day.meals) {
        mealRows.push({
          plan_id: planRow.id,
          day: day.day,
          slot: m.slot,
          title: m.title,
          recipe_json: m,
        })
      }
    }
    await supabase.from('meals').insert(mealRows)

    // Insert shopping items
    const items = plan.shopping_list.map((it: any) => ({ plan_id: planRow.id, ...it }))
    await supabase.from('shopping_items').insert(items)

    return NextResponse.json({ planId: planRow.id, persisted: true })
  }

  // Not signed in or Supabase not configured: use memory
  const id = crypto.randomUUID()
  memory.set(id, plan)
  return NextResponse.json({ planId: id, persisted: false })
}

export async function GET(req: NextRequest) {
  const { supabase, user } = await getSupabaseForRoute(req as any)
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (hasSupabase && user?.id) {
    const { data: planRow } = await supabase.from('meal_plans').select('*').eq('id', id).maybeSingle()
    if (planRow) {
      const { data: meals } = await supabase.from('meals').select('*').eq('plan_id', id).order('day')
      const { data: items } = await supabase.from('shopping_items').select('*').eq('plan_id', id).order('section')
      const days: any[] = []
      for (let d = 1; d <= 7; d++) {
        const dayMeals = (meals || []).filter(m => m.day === d).map(m => m.recipe_json)
        days.push({ day: d, meals: dayMeals })
      }
      const plan = {
        week_start: planRow.week_start,
        days,
        totals: planRow.summary,
        shopping_list: (items || []).map(i => ({ name: i.name, quantity: i.quantity, unit: i.unit, section: i.section })),
      }
      return NextResponse.json({ plan })
    }
  }

  // Fallback: serve from memory store for local/anon users
  if (memory.has(id)) {
    return NextResponse.json({ plan: memory.get(id) })
  }
  return NextResponse.json({ error: 'not-found' }, { status: 404 })
}
