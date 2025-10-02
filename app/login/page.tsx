'use client'
import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Mode = 'magic' | 'code'

export default function Login() {
  const [mode, setMode] = useState<Mode>('magic')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [otp, setOtp] = useState('')

  const base = (typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))

  async function sendEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${base}/api/auth/callback` }
      })
      if (error) setError(error.message)
      else setSent(true)
    } else {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) setError(error.message)
      else setSent(true)
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { data, error } = await supabase.auth.verifyOtp({ type: 'email', email, token: otp })
    if (error) {
      setError(error.message)
      return
    }
    const tokens = { access_token: data.session?.access_token, refresh_token: data.session?.refresh_token }
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tokens)
    })
    if (!res.ok) {
      setError('Failed to establish session.')
      return
    }
    window.location.href = '/dashboard'
  }

  return (
    <main className="card max-w-md mx-auto">
      <h1>Sign in</h1>
      <div className="mt-3 flex gap-2 text-sm">
        <button className={mode==='magic'?'btn btn-acc':'btn'} onClick={()=>setMode('magic')}>Magic link</button>
        <button className={mode==='code'?'btn btn-acc':'btn'} onClick={()=>setMode('code')}>6‑digit code</button>
      </div>

      <form onSubmit={sendEmail} className="mt-4 grid gap-3">
        <label>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com" />
        <button className="btn btn-acc" type="submit">{sent ? 'Resend' : 'Send email'}</button>
      </form>

      {mode === 'code' && sent && (
        <form onSubmit={verifyCode} className="mt-4 grid gap-3">
          <label>Enter 6‑digit code</label>
          <input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value)} placeholder="123456" />
          <button className="btn" type="submit">Verify & continue</button>
        </form>
      )}

      {sent && mode==='magic' && <p className="text-sm text-neutral-300 mt-3">Check your inbox and click the link (open in the same browser).</p>}
      {sent && mode==='code' && <p className="text-sm text-neutral-300 mt-3">We emailed you a code. Paste it above.</p>}
      {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
    </main>
  )
}
