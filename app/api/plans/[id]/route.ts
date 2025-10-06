// app/api/plans/[id]/route.ts
import { NextResponse } from 'next/server'
import { getSupabaseForRoute } from '@/lib/db'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await getSupabaseForRoute(req)
  if (!user) return NextResponse.json({ error: 'auth' }, { status: 401 })

  const { data: plan, error } = await supabase
    .from('meal_plans')
    .select('id, title, start_date, end_date, created_at, plan_items(name, quantity, unit, section)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !plan) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format')

  if (format === 'csv') {
    const rows = [
      ['Name', 'Quantity', 'Unit', 'Section'],
      ...((plan as any).plan_items ?? []).map((i: any) => [
        i.name, i.quantity, i.unit ?? '', i.section ?? ''
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    return new NextResponse(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${params.id}.csv"`,
      },
    })
  }

  return NextResponse.json(plan)
}
