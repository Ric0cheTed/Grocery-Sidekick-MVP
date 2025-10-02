import { NextRequest, NextResponse } from 'next/server';
import { suggestMeals } from '@/lib/db/meals';

export async function POST(req: NextRequest) {
  try {
    const { targetCalories, meal_type, tagsIncludeAny, limit } = await req.json();
    if (!targetCalories) return NextResponse.json({ error: 'targetCalories required' }, { status: 400 });
    const meals = await suggestMeals({ targetCalories, meal_type, tagsIncludeAny, limit });
    return NextResponse.json({ meals });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 });
  }
}
