import { NextResponse } from 'next/server'
import { getSupabaseForRoute } from '@/lib/db'

export async function POST(req: Request) {
  const { supabase } = await getSupabaseForRoute(req)
  const { access_token, refresh_token } = await req.json()
  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: 'missing tokens' }, { status: 400 })
  }
  const { error } = await supabase.auth.setSession({ access_token, refresh_token })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
