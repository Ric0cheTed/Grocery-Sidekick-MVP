// app/api/generate/route.ts
import { NextResponse } from 'next/server'
import { getSupabaseForRoute } from '@/lib/db'
import { structuredPlan, type StructuredPlan } from '@/lib/ai'

function err(status: number, code: string, details?: any) {
  // Visible in Vercel “Function Logs”
  console.error(`[generate ${code}]`, details ?? '')
  return NextResponse.json({ error: code, details }, { status })
}

export async function POST(req: Request) {
  const { supabase, user } = await getSupabaseForRoute(req)
  if (!user) return err(401, 'unauthorized')

  // Parse body (optional)
  let body: any = {}
  try { body = await req.json() } catch {}

  // ---------- QUOTA CHECK ----------
  const { data: sub, error: subErr } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .single()

  if (subErr && subErr.code !== 'PGRST116') {
    return err(500, 'subscriptions_select_failed', subErr)
  }
  const isPro = sub?.status === 'pro'

  const now = new Date()
  const monthStartUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const isoMonth = monthStartUtc.toISOString().slice(0, 10)

  let { data: usage, error: usageUpsertErr } = await supabase
    .from('usage_counters')
    .upsert(
      { user_id: user.id, month: isoMonth },
      { onConflict: 'user_id,month', ignoreDuplicates: true }
    )
    .select('*')
    .single()

  if ((usageUpsertErr && usageUpsertErr.code !== 'PGRST116') || !usage) {
    const ref = await supabase
      .from('usage_counters')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', isoMonth)
      .single()
    if (ref.error && ref.error.code !== 'PGRST116') {
      return err(500, 'usage_read_failed', ref.error)
    }
    usage = ref.data ?? usage
  }

  if (!isPro && usage && usage.plans_created >= 3) {
    return err(402, 'quota_exceeded', 'Free plan allows 3 plans per month. Upgrade for unlimited.')
  }
  // ---------- END QUOTA CHECK ----------

  // ---------- BUILD PLAN ----------
  const plan: StructuredPlan = await structuredPlan(body)
  const title: string = (body?.title ?? 'My Weekly Plan').toString()

  // Your table uses start_date / end_date (no week_start)
  const start = plan.week_start
    ? new Date(plan.week_start + 'T00:00:00Z')
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6)

  const startDateISO = start.toISOString().slice(0, 10)
  const endDateISO = end.toISOString().slice(0, 10)

  // ---------- INSERT meal_plans ----------
  // Columns in your screenshot: id (uuid), user_id (uuid), title (text), start_date (date), end_date (date), created_at, updated_at
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
    return err(500, 'insert_plan_failed', planInsertErr ?? 'no plan row returned')
  }

  // ---------- INSERT plan_items (NOT shopping_items) ----------
  // Expected columns: plan_id (uuid), name (text), quantity (numeric/int), unit (text/null), section (text/null)
  const items = (plan.shopping_list ?? []).map(i => ({
    plan_id: planRow.id,
    name: i.name,
    quantity: i.quantity,
    unit: i.unit ?? null,
    section: i.section ?? null,
  }))

  if (items.length) {
    const { error: itemsErr } = await supabase.from('plan_items').insert(items)
    if (itemsErr) return err(500, 'insert_plan_items_failed', itemsErr)
  }

  // ---------- INCREMENT QUOTA ----------
  const { error: usageIncErr } = await supabase
    .from('usage_counters')
    .update({ plans_created: (usage?.plans_created ?? 0) + 1 })
    .eq('user_id', user.id)
    .eq('month', isoMonth)

  if (usageIncErr) return err(500, 'usage_increment_failed', usageIncErr)

  return NextResponse.json({ ok: true, id: planRow.id })
}
