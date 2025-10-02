import { NextResponse } from 'next/server'
import { getSupabaseForRoute } from '@/lib/db'

export async function GET(req: Request) {
  const { supabase } = await getSupabaseForRoute(req)
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', req.url))
}
