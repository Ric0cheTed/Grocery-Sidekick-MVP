import Link from 'next/link';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-6">
      <nav>
        <ul className="flex items-center gap-3 text-sm">
          <li>
            <Link href="/dashboard" className="btn">Dashboard</Link>
          </li>
          <li>
            <Link href="/plans" className="btn">My Plans</Link>
          </li>
          <li>
            <Link href="/plans" className="btn">Account</Link>
          </li>

          {/* spacer pushes the CTA to the right */}
          <li className="flex-1" />

          <li>
            <Link href="/meals/new" className="btn btn-acc">+ New Meal</Link>
          </li>
        </ul>
      </nav>

      {children}
    </div>
  );
}
