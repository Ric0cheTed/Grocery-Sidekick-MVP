// lib/shopping.ts
import type { StructuredPlan } from './ai'

export function assembleShoppingList(ai: StructuredPlan) {
  const map = new Map<
    string,
    { name: string; quantity: number; unit?: string; section?: string }
  >()

  for (const day of ai.days) {
    for (const meal of day.meals) {
      for (const item of meal.ingredients) {
        const key = `${item.name}|${item.unit ?? ''}|${item.section ?? ''}`
        const prev = map.get(key)
        if (prev) {
          prev.quantity += item.quantity
        } else {
          map.set(key, {
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            section: item.section,
          })
        }
      }
    }
  }

  return Array.from(map.values())
}
