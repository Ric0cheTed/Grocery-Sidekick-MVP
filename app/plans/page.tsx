import Link from 'next/link'
import { getSupabaseForRoute } from '@/lib/db'

export default async function Plans() {
  const { supabase, user } = await getSupabaseForRoute()
  if (!user) {
    return (
      <main className="card">
        <h1>Your meal plans</h1>
        <p className="text-sm text-neutral-300">Please sign in to view saved plans.</p>
        <div className="mt-3"><a className="btn btn-acc" href="/login">Sign in</a></div>
      </main>
    )
  }

  const { data: plans, error } = await supabase
    .from('meal_plans')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return <main className="card"><h1>Error</h1><p className="text-sm">{error.message}</p></main>
  }

  return (
    <main className="card">
      <h1>Your meal plans</h1>
      {!plans?.length ? (
        <p className="text-sm text-neutral-300">No plans yet. Generate one from the Dashboard.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {plans.map((p: any) => (
            <li key={p.id} className="border border-neutral-800 rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">Week starting {p.week_start}</div>
                <div className="text-xs text-neutral-400">Created {new Date(p.created_at).toLocaleString()}</div>
              </div>
              <Link className="btn" href={`/plan/${p.id}`}>Open</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
