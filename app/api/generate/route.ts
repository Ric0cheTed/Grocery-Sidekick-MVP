// app/api/generate/route.ts
import { NextResponse } from 'next/server'
import { getSupabaseForRoute } from '@/lib/db'
import { structuredPlan, type StructuredPlan } from '@/lib/ai'

type Json = Record<string, any>
const ok = (data: Json, status = 200) => NextResponse.json(data, { status })
const fail = (code: string, details?: any, status = 500) => {
  console.error(`[generate ${code}]`, details ?? '')
  return NextResponse.json({ error: code, details }, { status })
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  const debug = Number(url.searchParams.get('debug') ?? '0') // 0..4
  let body: any = {}
  try { body = await req.json() } catch {}

  const { supabase, user } = await getSupabaseForRoute(req)
  if (!user) return fail('unauthorized', null, 401)

  const diag: Json = { step: 'start', debug }

  // ---------- SOFT QUOTA (skip if tables missing) ----------
  let quotaOK = true
  let usageRow: { plans_created?: number } | null = null
  let isoMonth = ''
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single()
      // if the table isn't there, Supabase may throw PGRST error; we catch below

    const isPro = sub?.status === 'pro'
    diag.sub = sub ?? null

    const now = new Date()
    const monthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    isoMonth = monthStartUtc.toISOString().slice(0, 10)
    diag.isoMonth = isoMonth

    let { data: usage } = await supabase
      .from('usage_counters')
      .upsert(
        { user_id: user.id, month: isoMonth },
        { onConflict: 'user_id,month', ignoreDuplicates: true }
      )
      .select('*')
      .single()

    if (!usage) {
      const ref = await supabase
        .from('usage_counters')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', isoMonth)
        .single()
      usage = ref.data ?? null
    }

    usageRow = usage
    diag.usage = usageRow

    if (!isPro && usageRow && (usageRow.plans_created ?? 0) >= 3) {
      return fail('quota_exceeded', 'Free plan allows 3 plans per month. Upgrade for unlimited.', 402)
    }
  } catch (e: any) {
    // If subscriptions/usage_counters don’t exist, continue without quota
    quotaOK = false
    diag.quota_skipped = e?.message ?? String(e)
  }

  if (debug === 1) return ok({ diag, note: 'stopped at debug=1 (after quota)' })

  // ---------- BUILD PLAN ----------
  const plan: StructuredPlan = await structuredPlan(body)
  const now = new Date()
  const title = (body?.title ?? 'My Weekly Plan').toString()

  // your schema: start_date / end_date
  const start = plan.week_start
    ? new Date(plan.week_start + 'T00:00:00Z')
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6)
  const startDateISO = start.toISOString().slice(0, 10)
  const endDateISO = end.toISOString().slice(0, 10)
  diag.planDates = { startDateISO, endDateISO }

  // ---------- INSERT meal_plans ----------
  const { data: planRow, error: planInsertErr } = await supabase
    .from('meal_plans')
    .insert({
      user_id: user.id,
      title,
      start_date: startDateISO,
      end_date: endDateISO,
    } as any)
    .select('id')
    .single()

  if (planInsertErr || !planRow) {
    return fail('insert_plan_failed', planInsertErr ?? 'no plan id')
  }
  diag.planId = planRow.id
  if (debug === 2) return ok({ diag, note: 'stopped at debug=2 (after plan insert)' })

  // ---------- INSERT plan_items ----------
  const items = (plan.shopping_list ?? []).map((i) => ({
    plan_id: planRow.id,
    name: i.name,
    quantity: i.quantity,
    unit: i.unit ?? null,
    section: i.section ?? null,
  }))

  if (items.length) {
    const { error: itemsErr } = await supabase.from('plan_items').insert(items)
    if (itemsErr) return fail('insert_plan_items_failed', itemsErr)
  }
  diag.itemsInserted = items.length
  if (debug === 3) return ok({ diag, note: 'stopped at debug=3 (after items insert)' })

  // ---------- INCREMENT usage (if tracking) ----------
  if (quotaOK && usageRow && isoMonth) {
    const { error: usageIncErr } = await supabase
      .from('usage_counters')
      .update({ plans_created: (usageRow.plans_created ?? 0) + 1 })
      .eq('user_id', user.id)
      .eq('month', isoMonth)
    if (usageIncErr) diag.usageIncrement = { error: usageIncErr }
    else diag.usageIncrement = { ok: true }
  }

  if (debug === 4) return ok({ diag, note: 'stopped at debug=4 (end of flow)' })

  return ok({ ok: true, id: planRow.id })
}
