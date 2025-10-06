// app/api/generate/route.ts
import { NextResponse } from 'next/server'
import { getSupabaseForRoute } from '@/lib/db'
import { structuredPlan, type StructuredPlan } from '@/lib/ai'

function jerr(status: number, code: string, details?: any) {
  // See in Vercel -> Deployments -> Function Logs
  console.error(`[generate ${code}]`, details ?? '')
  return NextResponse.json({ error: code, details }, { status })
}

export async function POST(req: Request) {
  const { supabase, user } = await getSupabaseForRoute(req)
  if (!user) return jerr(401, 'unauthorized')

  // optional body
  let body: any = {}
  try { body = await req.json() } catch {}

  // ---------- Soft quota (won’t 500 if tables don’t exist) ----------
  let quotaOK = true
  let usageRow:
    | { user_id: string; month: string; plans_created: number }
    | null = null
  let isoMonth = ''

  try {
    // Try subscriptions (OK if table missing)
    const { data: sub, error: subErr } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single()

    const isPro = sub?.status === 'pro' // if table missing, sub is undefined

    // Prepare usage month
    const now = new Date()
    const monthStartUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    )
    isoMonth = monthStartUtc.toISOString().slice(0, 10)

    // Try upsert usage (OK if table missing)
    let { data: usage, error: upErr } = await supabase
      .from('usage_counters')
      .upsert(
        { user_id: user.id, month: isoMonth },
        { onConflict: 'user_id,month', ignoreDuplicates: true }
      )
      .select('*')
      .single()

    if ((upErr && upErr.code !== 'PGRST116') || !usage) {
      // refetch in case of race
      const ref = await supabase
        .from('usage_counters')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', isoMonth)
        .single()
      if (!ref.error) usage = ref.data ?? usage
    }

    usageRow = usage ?? null

    // Enforce cap only if we have the tables available
    if (!isPro && usageRow && usageRow.plans_created >= 3) {
      return jerr(
        402,
        'quota_exceeded',
        'Free plan allows 3 plans per month. Upgrade for unlimited.'
      )
    }
  } catch (e) {
    // If any of the above tables don’t exist: skip quota silently
    quotaOK = false
    console.warn('[generate quota_skipped]', (e as any)?.message ?? e)
  }

  // ---------- Build plan data ----------
  const plan: StructuredPlan = await structuredPlan(body)
  const now = new Date()
  const title = (body?.title ?? 'My Weekly Plan').toString()

  // Your schema uses start_date/end_date
  const start = plan.week_start
    ? new Date(plan.week_start + 'T00:00:00Z')
    : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)

  const startDateISO = start.toISOString().slice(0, 10)
  const endDateISO = end.toISOString().slice(0, 10)

  // ---------- Insert meal_plans ----------
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
    return jerr(500, 'insert_plan_failed', planInsertErr ?? 'no plan id')
  }

  // ---------- Insert plan_items ----------
  const items = (plan.shopping_list ?? []).map((i) => ({
    plan_id: planRow.id,
    name: i.name,
    quantity: i.quantity,
    unit: i.unit ?? null,
    section: i.section ?? null,
  }))

  if (items.length) {
    const { error: itemsErr } = await supabase.from('plan_items').insert(items)
    if (itemsErr) return jerr(500, 'insert_plan_items_failed', itemsErr)
  }

  // ---------- Increment usage if we’re tracking ----------
  if (quotaOK && usageRow && isoMonth) {
    const { error: usageIncErr } = await supabase
      .from('usage_counters')
      .update({ plans_created: (usageRow.plans_created ?? 0) + 1 })
      .eq('user_id', user.id)
      .eq('month', isoMonth)
    if (usageIncErr) console.warn('[generate usage_increment_failed]', usageIncErr)
  }

  return NextResponse.json({ ok: true, id: planRow.id })
}
