import { currency } from '@/lib/utils'

export default function CashCrashDetector({
  detector,
}: {
  detector: {
    hasCrash: boolean
    firstCrashDay: number | null
    firstCrashDate: Date | null
    lowestBalance: number
    lowestBalanceDay: number
    lowestBalanceDate: Date
    triggerBills: Array<{
      id: string
      name: string
      amount: number
    }>
    sameDayIncome: Array<{
      id: string
      name: string
      amount: number
    }>
    recoveryDay: number | null
    recoveryDate: Date | null
  }
}) {
  if (!detector.hasCrash) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="font-semibold text-emerald-700">
          Future Cash Crash Detector
        </div>
        <div className="mt-1 text-sm text-emerald-700">
          No projected cash crash this month. Lowest balance is{' '}
          {currency(detector.lowestBalance)} on{' '}
          {detector.lowestBalanceDate.toLocaleDateString()}.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="font-semibold text-red-700">
        Future Cash Crash Detector
      </div>

      <div className="mt-2 text-sm text-red-700">
        Your balance goes below zero on{' '}
        <strong>{detector.firstCrashDate?.toLocaleDateString()}</strong>.
      </div>

      <div className="mt-1 text-sm text-red-700">
        Lowest projected balance is{' '}
        <strong>{currency(detector.lowestBalance)}</strong> on{' '}
        <strong>{detector.lowestBalanceDate.toLocaleDateString()}</strong>.
      </div>

      {detector.triggerBills.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-semibold text-red-700">
            Bills contributing that day
          </div>
          <div className="mt-2 space-y-2">
            {detector.triggerBills.map((bill) => (
              <div
                key={bill.id}
                className="rounded-xl border border-red-200 bg-white p-3 text-sm"
              >
                {bill.name} — {currency(bill.amount)}
              </div>
            ))}
          </div>
        </div>
      )}

      {detector.sameDayIncome.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-semibold text-red-700">
            Income on the same day
          </div>
          <div className="mt-2 space-y-2">
            {detector.sameDayIncome.map((income) => (
              <div
                key={income.id}
                className="rounded-xl border border-emerald-200 bg-white p-3 text-sm"
              >
                {income.name} — {currency(income.amount)}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-red-700">
        {detector.recoveryDate
          ? `Projected recovery date: ${detector.recoveryDate.toLocaleDateString()}.`
          : 'No recovery back to positive balance is projected within this month.'}
      </div>
    </div>
  )
}