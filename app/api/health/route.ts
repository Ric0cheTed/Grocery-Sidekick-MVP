import { NextResponse } from 'next/server'
import { getSupabaseForRoute } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { supabase, user } = await getSupabaseForRoute(req)

    // Check tables exist & can be selected
    const tables = ['meal_plans', 'plan_items', 'usage_counters', 'subscriptions'] as const
    const checks: Record<string, any> = {}

    for (const t of tables) {
      try {
        const { error } = await supabase.from(t as any).select('count', { count: 'exact', head: true })
        checks[t] = error ? { ok: false, error: error.message } : { ok: true }
      } catch (e: any) {
        checks[t] = { ok: false, error: e?.message ?? String(e) }
      }
    }

    return NextResponse.json({
      ok: true,
      user: user ? { id: user.id, email: user.email } : null,
      checks,
      env: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}
