# Grocery Sidekick — Starter (Next.js + Tailwind)

This starter lets you run end‑to‑end **today**. It works locally **without** API keys (uses a mock meal plan)
and upgrades automatically to AI‑generated plans when you provide `OPENAI_API_KEY`,
and to full persistence when you wire **Supabase** (SQL included).

## 1) Install
```bash
npm install
npm run dev
```
Open http://localhost:3000 and click **Open App → Generate Week**.
You should get a working 7‑day plan + shopping list (from the mock engine).

## 2) Add Env
Copy `.env.example` to `.env.local` and fill values when ready:
- `OPENAI_API_KEY` → enables AI planning
- Supabase keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE`)
- Stripe keys later

Restart dev server after editing env.

## 3) Connect Supabase
1. Create a Supabase project.
2. Open the SQL editor and run the contents of `supabase_schema.sql` then `supabase_policies.sql`.
3. Replace the in‑memory store in `app/api/generate/route.ts` with Supabase inserts (see comments in code).

## 4) Tailwind
Already configured. Edit styles in `app/globals.css` and components in `/components`.

## 5) Next steps
- Implement Supabase writes in `/api/generate` (meal_plans, meals, shopping_items).
- Add auth (Supabase Auth + magic link).
- Add Stripe checkout + billing (Pro plan), webhook route, and an `/app/account` page.
- Add exports (PDF/CSV).

---

## Supabase SQL
See `supabase_schema.sql` and `supabase_policies.sql` in the repo root.
"# Grocery-Sidekick-MVP" 
