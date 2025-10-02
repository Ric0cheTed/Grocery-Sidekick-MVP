import { headers } from 'next/headers'

type Props = { params: { id: string } }

async function getBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL
  if (explicit && explicit.startsWith('http')) return explicit.replace(/\/$/, '')
  const h = await headers()
  const host = h.get('host') || 'localhost:3000'
  const protocol = process.env.VERCEL ? 'https' : 'http'
  return `${protocol}://${host}`
}

async function getPlan(id: string) {
  const base = await getBaseUrl()
  const res = await fetch(`${base}/api/generate?id=${id}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export default async function PlanPage({ params }: Props) {
  const data = await getPlan(params.id)
  if (!data) return <main className="card"><h1>Plan not found</h1></main>
  const plan = data.plan
  return (
    <main className="grid gap-4">
      <div className="card">
        <h1>Plan for week starting {plan.week_start}</h1>
        <p className="text-sm text-neutral-300">Totals: {plan.totals.calories} kcal • P{plan.totals.protein} C{plan.totals.carbs} F{plan.totals.fat}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {plan.days.map((d: any) => (
          <div key={d.day} className="card">
            <h2>Day {d.day}</h2>
            <ul className="mt-2 space-y-2">
              {d.meals.map((m: any, i: number) => (
                <li key={i} className="border border-neutral-800 rounded-lg p-3">
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-neutral-400">{m.slot}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="card">
        <h2>Shopping list</h2>
        <ul className="text-sm mt-2 columns-2 gap-8">
          {plan.shopping_list.map((s: any, i: number) => (
            <li key={i}>{s.name} — {s.quantity ?? ''} {s.unit ?? ''}</li>
          ))}
        </ul>
      </div>
    </main>
  )
}
