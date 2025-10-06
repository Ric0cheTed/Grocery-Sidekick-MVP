// app/api/generate/route.ts
import { NextResponse } from 'next/server'
import { getSupabaseForRoute } from '@/lib/db'
import { structuredPlan, type StructuredPlan } from '@/lib/ai'

type GenerateBody = {
  title?: string
  // add any preferences you accept from UI here (diet, budget, etc.)
}

export async function POST(req: Request) {
  const { supabase, user } = await getSupabaseForRoute(req)
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // -------- QUOTA CHECK --------
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .single()
  const isPro = sub?.status === 'pro'

  const now = new Date()
  const monthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const isoMonth = monthStartUtc.toISOString().slice(0, 10)

  // Ensure a usage row exists (idempotent upsert), then read it back
  let { data: usage, error: usageErr } = await supabase
    .from('usage_counters')
    .upsert(
      { user_id: user.id, month: isoMonth },
      { onConflict: 'user_id,month', ignoreDuplicates: true }
    )
    .select('*')
    .single()

  if (usageErr && usageErr.code !== 'PGRST116') {
    // If select failed due to race on first insert, refetch
    const refetch = await supabase
      .from('usage_counters')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', isoMonth)
      .single()
    usage = refetch.data ?? usage
  }

  if (!isPro && usage && usage.plans_created >= 3) {
    return NextResponse.json(
      {
        error: 'quota_exceeded',
        message: 'Free plan allows 3 plans per month. Upgrade for unlimited.',
      },
      { status: 402 }
    )
  }
  // -------- END QUOTA CHECK --------

  // -------- BUILD PLAN DATA --------
  let body: GenerateBody = {}
  try {
    body = await req.json()
  } catch {
    // allow empty body
  }

  // You can pass `body` into structuredPlan if you want preferences to shape the mock
  const plan: StructuredPlan = await structuredPlan(body)
  const title = body.title?.trim() || 'My Weekly Plan'

  // -------- INSERT PLAN ROW --------
  // ⚠️ Adjust column names if your schema differs.
  // Assumes meal_plans has: id (uuid), user_id (uuid), title (text), week_start (date), created_at (default now)
  const { data: planRow, error: insertPlanErr } = await supabase
    .from('meal_plans')
    .insert({
      user_id: user.id,
      title,
      week_start: plan.week_start, // (optional) remove if column not present
    } as any)
    .select('id')
    .single()

  if (insertPlanErr || !planRow) {
    return NextResponse.json(
      { error: 'insert_failed', details: insertPlanErr?.message },
      { status: 500 }
    )
  }

  // -------- INSERT SHOPPING ITEMS --------
  // ⚠️ Adjust table/columns if needed.
  // Assumes shopping_items: plan_id (uuid), name (text), quantity (numeric/int), unit (text/null), section (text/null)
  const items = (plan.shopping_list ?? []).map((i) => ({
    plan_id: planRow.id,
    name: i.name,
    quantity: i.quantity,
    unit: i.unit ?? null,
    section: i.section ?? null,
  }))

  if (items.length) {
    const { error: insertItemsErr } = await supabase
      .from('shopping_items')
      .insert(items)

    if (insertItemsErr) {
      // Optionally roll back the plan row here if you want strict integrity
      return NextResponse.json(
        { error: 'items_insert_failed', details: insertItemsErr.message },
        { status: 500 }
      )
    }
  }

  // -------- QUOTA INCREMENT --------
  await supabase
    .from('usage_counters')
    .update({ plans_created: (usage?.plans_created ?? 0) + 1 })
    .eq('user_id', user.id)
    .eq('month', isoMonth)
  // -------- END QUOTA INCREMENT --------

  return NextResponse.json({ ok: true, id: planRow.id })
}
