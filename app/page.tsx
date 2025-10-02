export default function Home() {
  return (
    <main className="grid gap-6">
      <section className="card">
        <h1>Smarter weekly meal plans in one click.</h1>
        <p className="mt-2 text-neutral-300">
          Tell us your goals, allergies, and budget. Get a 7-day plan + a shopping list that
          actually matches UK supermarkets.
        </p>
        <div className="mt-4 flex gap-3">
          <a href="/dashboard" className="btn btn-acc">Get Started</a>
          <a href="/pricing" className="btn">See Pricing</a>
        </div>
      </section>
      <section className="grid md:grid-cols-3 gap-4">
        <div className="card"><h2>Dietary filters</h2><p className="text-sm text-neutral-300">Vegetarian, halal, low-FODMAP, etc.</p></div>
        <div className="card"><h2>Budget aware</h2><p className="text-sm text-neutral-300">Targets GBP per week & servings.</p></div>
        <div className="card"><h2>Exports</h2><p className="text-sm text-neutral-300">PDF/CSV and copy to clipboard.</p></div>
      </section>
    </main>
  )
}
