// app/api/generate/route.ts
import { NextResponse } from 'next/server'
import { getSupabaseForRoute } from '@/lib/db'
import { structuredPlan, type StructuredPlan } from '@/lib/ai'

export const dynamic = 'force-dynamic'

const ok = (data: any, status = 200) => NextResponse.json(data, { status })
const fail = (code: string, details?: any, status = 500) => {
  console.error(`[generate ${code}]`, details ?? '')
  return NextResponse.json({ error: code, details }, { status })
}

const addDaysUTC = (d: Date, n: number) => {
  const x = new Date(d)
  x.setUTCDate(x.getUTCDate() + n)
  return x
}
const toISODate = (d: Date) => d.toISOString().slice(0, 10)

export async function POST(req: Request) {
  // Parse optional body
  let body: any = {}
  try { body = await req.json() } catch {}

  // Auth
  let supabase: any, user: any
  try {
    const bundle = await getSupabaseForRoute(req)
    supabase = bundle.supabase
    user = bundle.user
  } catch (e: any) {
    return fail('supabase_init_failed', e?.message ?? String(e))
  }
  if (!user) return fail('unauthorized', 'No session', 401)

  // -------- Soft quota (skip silently if tables aren’t present) --------
  let trackUsage = false
  let isoMonth = ''
  let plansCreated = 0
  try {
    const now = new Date()
    isoMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10)

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single()
    const isPro = sub?.status === 'pro'

    const { data: usage } = await supabase
      .from('usage_counters')
      .upsert(
        { user_id: user.id, month: isoMonth },
        { onConflict: 'user_id,month', ignoreDuplicates: true }
      )
      .select('*')
      .single()

    if (usage) {
      trackUsage = true
      plansCreated = usage.plans_created ?? 0
      if (!isPro && plansCreated >= 3) {
        return fail(
          'quota_exceeded',
          'Free plan allows 3 plans per month. Upgrade for unlimited.',
          402
        )
      }
    }
  } catch (e) {
    console.warn('[generate] quota skipped:', (e as any)?.message ?? e)
  }

  // -------- Build plan data --------
  let plan: StructuredPlan
  try {
    plan = await structuredPlan(body)
  } catch (e: any) {
    return fail('plan_build_failed', e?.message ?? String(e))
  }

  const now = new Date()
  const title = (body?.title ?? 'My Weekly Plan').toString()

  // Your schema uses start_date / end_date
  const start = plan.week_start
    ? new Date(plan.week_start + 'T00:00:00Z')
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const end = addDaysUTC(start, 6)
  const startDateISO = toISODate(start)
  const endDateISO = toISODate(end)

  // -------- Insert meal_plans --------
  const { data: planRow, error: e1 } = await supabase
    .from('meal_plans')
    .insert({
      user_id: user.id,
      title,
      start_date: startDateISO,
      end_date: endDateISO,
    } as any)
    .select('id')
    .single()
  if (e1 || !planRow) return fail('insert_plan_failed', e1 ?? 'no plan id')

  // -------- Insert plan_items (with DATE "day") --------
  const items = (plan.shopping_list ?? []).map((i: any) => {
  const rawDay = i?.day
  const offset = typeof rawDay === 'number' && rawDay >= 1 && rawDay <= 7 ? rawDay - 1 : 0
  const dayISO = toISODate(addDaysUTC(start, offset))

  const mealType = normalizeMealType(i?.meal_type ?? i?.slot ?? i?.type)

  // recipe: prefer explicit field; otherwise derive from the meal/item name
  // (NOT NULL in DB, so always provide a string)
  const recipe =
    (i?.recipe != null && String(i.recipe).trim() !== '')
      ? String(i.recipe).slice(0, 200)
      : String(i?.name ?? 'Untitled recipe').slice(0, 200)

  return {
    plan_id: planRow.id,
    name: String(i?.name ?? '').slice(0, 200),
    quantity: Number.isFinite(Number(i?.quantity)) ? Number(i.quantity) : 0,
    unit: i?.unit != null ? String(i.unit).slice(0, 50) : null,
    section: i?.section != null ? String(i.section).slice(0, 50) : null,
    day: dayISO,          // DATE (NOT NULL)
    meal_type: mealType,  // TEXT (NOT NULL)
    recipe,               // TEXT (NOT NULL)
  }
})

if (items.length) {
  const { error: itemsErr } = await supabase.from('plan_items').insert(items)
  if (itemsErr) return fail('insert_plan_items_failed', itemsErr)
}

if (items.length) {
  const { error: e2 } = await supabase.from('plan_items').insert(items)
  if (e2) return fail('insert_plan_items_failed', e2)
}

  // -------- Increment usage if tracked --------
  if (trackUsage) {
    const { error: e3 } = await supabase
      .from('usage_counters')
      .update({ plans_created: plansCreated + 1 })
      .eq('user_id', user.id)
      .eq('month', isoMonth)
    if (e3) console.warn('[generate] usage_increment_failed', e3)
  }

  return ok({ ok: true, id: planRow.id })
}

function normalizeMealType(mt: any): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const s = String(mt ?? '').trim().toLowerCase()
  if (s === 'breakfast' || s === 'lunch' || s === 'dinner' || s === 'snack') return s
  return 'dinner'
}
