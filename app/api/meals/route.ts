import { NextRequest, NextResponse } from 'next/server';
import { createMeal, listMeals } from '@/lib/db/meals';
import { supabase } from '@/lib/supabaseClient';
export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type') as any;
    const tags = req.nextUrl.searchParams.getAll('tag'); // ?tag=high-protein&tag=vegetarian
    const data = await listMeals({
      meal_type: type || undefined,
      tagsIncludeAny: tags.length ? tags : undefined,
    });
    return NextResponse.json({ meals: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const meal = await createMeal(body);
    return NextResponse.json({ meal }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 400 });
  }
}
