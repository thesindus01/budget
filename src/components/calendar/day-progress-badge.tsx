export default function DayProgressBadge({
  dueCount,
  paidCount,
}: {
  dueCount: number
  paidCount: number
}) {
  if (dueCount === 0) return null

  let tone = 'bg-rose-100 text-rose-700'
  if (paidCount === dueCount) tone = 'bg-emerald-100 text-emerald-700'
  else if (paidCount > 0) tone = 'bg-amber-100 text-amber-700'

  return (
    <div className={`mt-1 inline-block rounded-full px-2 py-1 text-[10px] font-medium ${tone}`}>
      {paidCount}/{dueCount} paid
    </div>
  )
}