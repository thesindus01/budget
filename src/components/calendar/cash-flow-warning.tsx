import { currency } from '@/lib/utils'

export default function CashFlowWarning({
  firstNegativeDay,
  lowestBalance,
  lowestBalanceDay,
}: {
  firstNegativeDay: number | null
  lowestBalance: number
  lowestBalanceDay: number
}) {
  if (firstNegativeDay == null) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="font-semibold text-emerald-700">Cash Flow Status</div>
        <div className="mt-1 text-sm text-emerald-700">
          You stay positive all month. Lowest projected balance is{' '}
          {currency(lowestBalance)} on day {lowestBalanceDay}.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="font-semibold text-red-700">Cash Flow Warning</div>
      <div className="mt-1 text-sm text-red-700">
        You go negative on day {firstNegativeDay}. Lowest projected balance is{' '}
        {currency(lowestBalance)} on day {lowestBalanceDay}.
      </div>
    </div>
  )
}