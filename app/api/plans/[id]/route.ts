// app/api/plans/[id]/route.ts
import { NextResponse } from 'next/server'
import { getSupabaseForRoute } from '@/lib/db'

type CsvCell = string | number | null | undefined
type CsvRow = CsvCell[]

function toCsv(rows: CsvRow[]): string {
  return rows
    .map((row: CsvRow) =>
      row
        .map((cell: CsvCell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n')
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { supabase, user } = await getSupabaseForRoute(req)
  if (!user) return NextResponse.json({ error: 'auth' }, { status: 401 })

  const { data: plan, error } = await supabase
    .from('meal_plans')
    .select(
      'id, title, start_date, end_date, created_at, plan_items(name, quantity, unit, section)'
    )
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (error || !plan) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format')

  if (format === 'csv') {
    const rows: CsvRow[] = [
      ['Name', 'Quantity', 'Unit', 'Section'],
      ...(((plan as any).plan_items ?? []) as Array<{
        name: string
        quantity: number
        unit?: string | null
        section?: string | null
      }>).map((i) => [i.name, i.quantity, i.unit ?? '', i.section ?? '']),
    ]

    const csv = toCsv(rows)

    return new NextResponse(csv, {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${params.id}.csv"`,
      },
    })
  }

  // Default JSON payload
  return NextResponse.json(plan)
}
