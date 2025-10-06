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

export async function POST(req: Request) {
  let body: any = {}
  try { body = await req.json() } catch {}

  let supabase: any, user: any
  try {
    const bundle = await getSupabaseForRoute(req)
    supabase = bundle.supabase
    user = bundle.user
  } catch (e: any) {
    return fail('supabase_init_failed', e?.message ?? String(e))
  }

  if (!user) return fail('unauthorized', 'No session', 401)

  // Try quota, but never crash if usage/subs tables aren’t there
  let trackUsage = false
  let isoMonth = ''
  let plansCreated = 0

  try {
    const now = new Date()
    isoMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0,10)

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single()

    const isPro = sub?.status === 'pro'

    const { data: usage } = await supabase
      .from('usage_counters')
      .upsert({ user_id: user.id, month: isoMonth }, { onConflict: 'user_id,month', ignoreDuplicates: true })
      .select('*')
      .single()

    plansCreated = usage?.plans_created ?? 0
    trackUsage = !!usage // track only if table exists

    if (!isPro && trackUsage && plansCreated >= 3) {
      return fail('quota_exceeded', 'Free plan allows 3 plans per month. Upgrade for unlimited.', 402)
    }
  } catch (e) {
    // No subscriptions/usage_counters? fine, skip quota silently
    console.warn('[generate] quota skipped', (e as any)?.message ?? e)
  }

  // Build a plan
  let plan: StructuredPlan
  try {
    plan = await structuredPlan(body)
  } catch (e: any) {
    return fail('plan_build_failed', e?.message ?? String(e))
  }

  // Your schema uses start_date / end_date
  const now = new Date()
  const title = (body?.title ?? 'My Weekly Plan').toString()
  const start = plan.week_start
    ? new Date(plan.week_start + 'T00:00:00Z')
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6)
  const startDateISO = start.toISOString().slice(0,10)
  const endDateISO = end.toISOString().slice(0,10)

  // Insert plan
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

  // Insert items
  const items = (plan.shopping_list ?? []).map((i) => ({
	  plan_id: planRow.id,
	  name: String(i?.name ?? '').slice(0, 200),
	  quantity: Number.isFinite(Number(i?.quantity)) ? Number(i.quantity) : 0,
	  unit: i?.unit != null ? String(i.unit).slice(0, 50) : null,
	  section: i?.section != null ? String(i.section).slice(0, 50) : null,
	  // NEW: satisfy NOT NULL constraint in your schema
	  day:
		typeof (i as any).day === 'number' && (i as any).day >= 1 && (i as any).day <= 7
		  ? (i as any).day
		  : 1,
	}))

	if (items.length) {
	  const { error: itemsErr } = await supabase.from('plan_items').insert(items)
	  if (itemsErr) return fail('insert_plan_items_failed', itemsErr)
	}

  // Increment usage if we can track
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
