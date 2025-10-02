'use client'
import { useState } from 'react'

export default function Dashboard() {
  const [loading, setLoading] = useState(false)
  const [planId, setPlanId] = useState<string| null>(null)
  const onGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/generate', { method: 'POST', body: JSON.stringify({}) })
      const data = await res.json()
      setPlanId(data.planId)
    } finally { setLoading(false) }
  }
  return (
    <main className="card">
      <h1>Dashboard</h1>
      <p className="text-sm text-neutral-300">Click generate to create a 7-day plan. Works locally even without an AI key.</p>
      <button className="btn btn-acc mt-4" onClick={onGenerate} disabled={loading}>
        {loading ? 'Generating…' : 'Generate Week'}
      </button>
      {planId && <p className="mt-3 text-sm">Done. <a className="underline" href={`/plan/${planId}`}>Open your plan</a>.</p>}
    </main>
  )
}
