export default function Pricing() {
  return (
    <main className="grid gap-6">
      <h1>Simple pricing</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2>Free</h2>
          <ul className="text-sm list-disc pl-5 mt-2">
            <li>3 plans / month</li>
            <li>Basic preferences</li>
            <li>In-app shopping list</li>
          </ul>
          <a href="/app/dashboard" className="btn mt-4">Start free</a>
        </div>
        <div className="card border-lime-500">
          <h2>Pro — £6.99/mo</h2>
          <ul className="text-sm list-disc pl-5 mt-2">
            <li>Unlimited plans</li>
            <li>Macro targets & exports</li>
            <li>Weekly auto-generate</li>
          </ul>
          <a href="/app/account" className="btn btn-acc mt-4">Upgrade</a>
        </div>
      </div>
    </main>
  )
}
