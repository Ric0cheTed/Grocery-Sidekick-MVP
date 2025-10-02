export async function incrementUsageOrThrow(supabase: any, userId: string) {
  const first = new Date(); first.setDate(1)
  const monthISO = first.toISOString().slice(0,10)
  const { data: sub } = await supabase.from('subscriptions').select('status').eq('user_id', userId).maybeSingle()
  const { data: u } = await supabase.from('usage_counters').select('*')
    .eq('user_id', userId).eq('month', monthISO).maybeSingle()

  const limit = sub?.status === 'pro' ? 1000 : 3
  const used = u?.plans_generated ?? 0
  if (used >= limit) throw new Error('Quota exceeded')

  if (u) {
    await supabase.from('usage_counters').update({ plans_generated: used + 1 })
      .eq('user_id', userId).eq('month', monthISO)
  } else {
    await supabase.from('usage_counters').insert({ user_id: userId, month: monthISO, plans_generated: 1 })
  }
}
