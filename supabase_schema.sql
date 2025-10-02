-- SCHEMA for Grocery Sidekick

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- subscriptions
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text check (status in ('free','pro')) not null default 'free',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz
);

-- preferences
create table if not exists public.preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  calories_target int,
  protein_target int,
  carbs_target int,
  fat_target int,
  cuisine_tags text[] default '{}',
  diet_tags text[] default '{}',
  exclude_ingredients text[] default '{}',
  budget_per_week numeric(10,2),
  servings_per_meal int default 1,
  primary key (user_id)
);

-- meal plans
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  week_start date not null,
  summary jsonb,
  created_at timestamptz default now()
);
create index if not exists meal_plans_user_idx on public.meal_plans(user_id);

-- meals
create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.meal_plans(id) on delete cascade,
  day integer check (day between 1 and 7),
  slot text check (slot in ('breakfast','lunch','dinner','snack')),
  title text not null,
  recipe_json jsonb,
  locked boolean default false
);
create index if not exists meals_plan_idx on public.meals(plan_id);

-- shopping items
create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.meal_plans(id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text,
  section text,
  estimated_price numeric(10,2),
  acquired boolean default false
);
create index if not exists shopping_plan_idx on public.shopping_items(plan_id);

-- monthly generation quota
create table if not exists public.usage_counters (
  user_id uuid references auth.users(id) on delete cascade,
  month date not null,
  plans_generated int default 0,
  primary key (user_id, month)
);
