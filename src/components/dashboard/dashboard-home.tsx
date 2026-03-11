import Link from 'next/link'
import { buildMonthlyBudgetEngine } from '@/lib/budget-engine'
import { currency } from '@/lib/utils'

type IncomeRow = {
  id: string
  name: string
  amount: number | string
  frequency: 'weekly' | 'biweekly' | 'monthly'
  day_of_week?: number | null
  day_of_month?: number | null
  start_date?: string | null
  is_enabled: boolean
}

type BillRow = {
  id: string
  name: string
  amount: number | string
  due_day: number
  category: string
  is_active: boolean
  recurring_type?: 'monthly' | 'one_time' | null
  recurring_months?: number | null
  start_month?: string | null
}

type PaymentRow = {
  id: string
  bill_id: string
  payment_month: string
  is_paid: boolean
  paid_at: string | null
}

export default function DashboardHome({
  selectedMonth,
  selectedYear,
  monthIndex,
  incomes,
  bills,
  payments,
}: {
  selectedMonth: number
  selectedYear: number
  monthIndex: number
  incomes: IncomeRow[]
  bills: BillRow[]
  payments: PaymentRow[]
}) {
  const now = new Date()

  const engine = buildMonthlyBudgetEngine({
    year: selectedYear,
    monthIndex,
    incomes,
    bills,
    payments,
  })

  const projectedMonthEnd = engine.projectedMonthEnd

  const overdueBills = bills.filter((bill) => {
    const payment = payments.find(
      (p) => p.bill_id === bill.id && p.payment_month === engine.paymentMonth
    )
    const dueDate = new Date(selectedYear, monthIndex, Number(bill.due_day))
    const isCurrentMonth =
      selectedMonth === now.getMonth() + 1 && selectedYear === now.getFullYear()

    return isCurrentMonth && !payment?.is_paid && dueDate < now
  })

  const unpaidBillsCount = bills.filter((bill) => {
    const payment = payments.find(
      (p) => p.bill_id === bill.id && p.payment_month === engine.paymentMonth
    )
    return !payment?.is_paid
  }).length

  return (
    <main className="mx-auto max-w-7xl px-6 py-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-600">
            Projected monthly view based on income, bills, and paid status.
          </p>
        </div>

        <form className="flex flex-wrap gap-2" action="/">
          <select
            name="month"
            defaultValue={String(selectedMonth)}
            className="rounded-xl border bg-white px-3 py-2"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleString('en-US', {
                  month: 'long',
                })}
              </option>
            ))}
          </select>

          <input
            name="year"
            type="number"
            defaultValue={selectedYear}
            className="rounded-xl border bg-white px-3 py-2"
          />

          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">
            Load
          </button>
        </form>
      </div>

      {incomes.length === 0 && bills.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-8 text-center">
          <h2 className="text-xl font-semibold">Your budget is empty</h2>
          <p className="mt-2 text-slate-600">Start by adding income and bills.</p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/income" className="rounded-xl bg-slate-900 px-4 py-2 text-white">
              Add income
            </Link>
            <Link href="/bills" className="rounded-xl border px-4 py-2">
              Add bill
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-slate-500">Monthly Income</div>
          <div className="text-2xl font-bold">{currency(engine.totalIncome)}</div>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-slate-500">Bills Due</div>
          <div className="text-2xl font-bold">{currency(engine.totalDue)}</div>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-slate-500">Bills Paid</div>
          <div className="text-2xl font-bold">{currency(engine.totalPaid)}</div>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-slate-500">Projected Month End</div>
          <div className="text-2xl font-bold">{currency(projectedMonthEnd)}</div>
        </div>
      </div>

      {overdueBills.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="font-semibold text-red-800">Overdue Bills</div>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {overdueBills.map((bill) => (
              <li key={bill.id}>
                {bill.name} — {currency(Number(bill.amount))}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-slate-500">Income Sources</div>
          <div className="text-2xl font-bold">{incomes.length}</div>
          <Link href="/income" className="mt-3 inline-block text-sm underline">
            Manage income
          </Link>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-slate-500">Unpaid Bills This Month</div>
          <div className="text-2xl font-bold">{unpaidBillsCount}</div>
          <Link href="/bills" className="mt-3 inline-block text-sm underline">
            Manage bills
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Daily Requirement Ledger</h2>
          <div className="flex gap-4 text-sm">
            <Link
              href={`/calendar?month=${selectedMonth}&year=${selectedYear}`}
              className="underline"
            >
              Open calendar
            </Link>
            <Link
              href={`/analytics?month=${selectedMonth}&year=${selectedYear}`}
              className="underline"
            >
              Open analytics
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          {engine.daysData.map((day) => (
            <div
              key={day.day}
              className="grid gap-3 rounded-xl border p-4 md:grid-cols-5"
            >
              <div>
                <div className="text-sm text-slate-500">Day</div>
                <div className="font-semibold">{day.day}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Income</div>
                <div className="font-semibold">{currency(day.incomeTotal)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Due</div>
                <div className="font-semibold">{currency(day.dueTotal)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Paid</div>
                <div className="font-semibold">{currency(day.paidTotal)}</div>
              </div>

              <div>
                <div className="text-sm text-slate-500">Projected Balance</div>
                <div className="font-semibold">
                  {currency(day.runningAllAccounts)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}