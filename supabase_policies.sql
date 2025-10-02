alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.preferences enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meals enable row level security;
alter table public.shopping_items enable row level security;
alter table public.usage_counters enable row level security;

-- owner access policies
create policy "profiles owner" on public.profiles
for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "subscriptions owner" on public.subscriptions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "preferences owner" on public.preferences
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "meal_plans owner" on public.meal_plans
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "meals via plan" on public.meals
for all using (
  exists(select 1 from public.meal_plans p where p.id = plan_id and p.user_id = auth.uid())
) with check (
  exists(select 1 from public.meal_plans p where p.id = plan_id and p.user_id = auth.uid())
);

create policy "shopping via plan" on public.shopping_items
for all using (
  exists(select 1 from public.meal_plans p where p.id = plan_id and p.user_id = auth.uid())
) with check (
  exists(select 1 from public.meal_plans p where p.id = plan_id and p.user_id = auth.uid())
);

create policy "usage owner" on public.usage_counters
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
