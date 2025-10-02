import type { z } from 'zod'
import { PlanOutput } from './ai'

export function assembleShoppingList(ai: z.infer<typeof PlanOutput>) {
  const map = new Map<string, { name: string, quantity: number, unit?: string, section?: string }>()
  for (const day of ai.days) {
    for (const meal of day.meals) {
      for (const ing of meal.ingredients) {
        const key = (ing.name + '|' + (ing.unit||'') + '|' + (ing.section||'')).toLowerCase()
        const prev = map.get(key)
        if (prev) prev.quantity = (prev.quantity || 0) + (ing.quantity || 0)
        else map.set(key, { name: ing.name, quantity: ing.quantity || 0, unit: ing.unit, section: ing.section })
      }
    }
  }
  return Array.from(map.values()).sort((a,b)=> (a.section||'').localeCompare(b.section||''))
}
