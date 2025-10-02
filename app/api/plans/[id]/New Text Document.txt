import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;

  const { data: plan, error: planErr } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (planErr || !plan) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  const { data: items, error: itemsErr } = await supabase
    .from('plan_items')
    .select('*')
    .eq('plan_id', id)
    .order('day', { ascending: true });

  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message }, { status: 400 });
  }

  return NextResponse.json({ plan, items: items ?? [] });
}
