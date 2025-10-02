import './globals.css'
import type { Metadata } from 'next'
import { getSupabaseForRoute } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Grocery Sidekick',
  description: 'Weekly meal plans + smart shopping lists for real people.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getSupabaseForRoute()
  return (
    <html lang="en">
      <body>
        <div className="max-w-5xl mx-auto p-6">
          <header className="flex items-center justify-between mb-6">
            <a href="/" className="text-xl font-semibold">Grocery <span className="text-lime-400">Sidekick</span></a>
            <nav className="space-x-3 text-sm">
              <a href="/pricing">Pricing</a>
              <a href="/plans">Plans</a>
              <a href="/dashboard">Dashboard</a>
              {user ? (
                <a href="/logout" className="btn">Sign out</a>
              ) : (
                <a href="/login" className="btn btn-acc">Sign in</a>
              )}
            </nav>
          </header>
          {children}
          <footer className="mt-16 text-xs text-neutral-400">
            <div className="border-t border-neutral-800 pt-4">© {new Date().getFullYear()} Grocery Sidekick</div>
          </footer>
        </div>
      </body>
    </html>
  )
}
