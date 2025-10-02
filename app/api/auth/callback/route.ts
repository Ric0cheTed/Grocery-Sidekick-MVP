import { NextResponse } from 'next/server'
import { getSupabaseForRoute } from '@/lib/db'

export async function GET(req: Request) {
  // Supabase will redirect here with a code in the URL.
  const { supabase } = await getSupabaseForRoute(req)
  const { data, error } = await supabase.auth.exchangeCodeForSession(
    new URL(req.url).searchParams.get('code') || ''
  )
  // If cookies were set correctly by the SSR client, redirect to dashboard.
  const redirectTo = new URL(req.url).origin + '/dashboard'
  if (error) {
    return NextResponse.redirect(redirectTo + '?signin=failed')
  }
  return NextResponse.redirect(redirectTo)
}
