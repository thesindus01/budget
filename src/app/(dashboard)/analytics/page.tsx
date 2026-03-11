import { createClient } from '@/lib/supabase/server'
import { buildMonthlyBudgetEngine, buildYearlyAnalytics, resolveStartingBalance } from '@/lib/budget-engine'
import { currency, buildPaymentMonthDate } from '@/lib/utils'
import AnalyticsCharts from '@/components/budget/analytics-charts'

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; year?: string }>
}) {
  const params = (await searchParams) || {}
  const now = new Date()
  const selectedMonth = Number(params.month ?? now.getMonth() + 1)
  const selectedYear = Number(params.year ?? now.getFullYear())
  const monthIndex = selectedMonth - 1
  const paymentMonth = buildPaymentMonthDate(selectedYear, monthIndex)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <div className="p-6">You are not logged in.</div>

  const [
    { data: incomes, error: incomeError },
    { data: bills, error: billError },
    { data: payments, error: paymentError },
    { data: monthlyBalance },
    { data: yearlyBalances },
  ] = await Promise.all([
    supabase.from('income_sources').select('*').eq('user_id', user.id).eq('is_enabled', true).order('created_at'),
    supabase.from('bills').select('*').eq('user_id', user.id).eq('is_active', true).order('due_day'),
    supabase.from('bill_payments').select('*').eq('user_id', user.id),
    supabase.from('monthly_balances').select('*').eq('user_id', user.id).eq('balance_month', paymentMonth).maybeSingle(),
    supabase
      .from('monthly_balances')
      .select('*')
      .eq('user_id', user.id)
      .gte('balance_month', `${selectedYear}-01-01`)
      .lte('balance_month', `${selectedYear}-12-01`),
  ])

  if (incomeError || billError || paymentError) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Failed to load analytics data.
        </div>
        <div className="text-sm text-slate-600">
          {incomeError?.message || billError?.message || paymentError?.message}
        </div>
      </div>
    )
  }

  const startingBalance = resolveStartingBalance({
	  year: selectedYear,
	  monthIndex,
	  incomes: incomes ?? [],
	  bills: bills ?? [],
	  payments: payments ?? [],
	  monthlyBalances: [
		...(yearlyBalances ?? []),
		...(monthlyBalance ? [monthlyBalance] : []),
	  ],
	})

  const engine = buildMonthlyBudgetEngine({
    year: selectedYear,
    monthIndex,
    incomes: incomes ?? [],
    bills: bills ?? [],
    payments: payments ?? [],
    startingBalance,
  })

  const yearly = buildYearlyAnalytics({
    year: selectedYear,
    incomes: incomes ?? [],
    bills: bills ?? [],
    payments: payments ?? [],
    monthlyBalances: yearlyBalances ?? [],
  })

  const cashFlowData = engine.daysData.map((d) => ({
    day: d.day,
    income: d.incomeTotal,
    due: d.dueTotal,
    paid: d.paidTotal,
    balance: d.runningAllAccounts,
  }))

  const categoryData = Object.entries(engine.categoryTotals).map(([name, value]) => ({
    name,
    value,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-sm text-slate-600">
            Monthly, year-to-date, and full-year financial outlook.
          </p>
        </div>

        <form className="flex flex-wrap gap-2">
          <select
            name="month"
            defaultValue={String(selectedMonth)}
            className="rounded-xl border bg-white px-3 py-2"
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' })}
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

      <div className="grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-slate-500">Income</div>
          <div className="text-2xl font-bold text-emerald-600">{currency(engine.totalIncome)}</div>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-slate-500">Expenditure</div>
          <div className="text-2xl font-bold text-rose-600">{currency(engine.totalPaid)}</div>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-slate-500">Savings</div>
          <div className="text-2xl font-bold text-blue-600">{currency(engine.monthSavingsActual)}</div>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-slate-500">Till Today Income</div>
          <div className="text-2xl font-bold text-emerald-600">{currency(engine.tillToday.income)}</div>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm text-slate-500">Till Today Balance</div>
          <div className="text-2xl font-bold">{currency(engine.tillToday.balance)}</div>
        </div>
      </div>

      <AnalyticsCharts
        cashFlowData={cashFlowData}
        categoryData={categoryData}
        accountData={[]}
      />

      <div className="rounded-2xl border bg-white p-4">
        <h2 className="mb-4 text-xl font-semibold">Monthly Outcome</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-emerald-50 p-4">
            <div className="text-sm text-emerald-700">Money In</div>
            <div className="text-xl font-bold text-emerald-700">{currency(engine.totalIncome)}</div>
          </div>
          <div className="rounded-xl bg-rose-50 p-4">
            <div className="text-sm text-rose-700">Money Out</div>
            <div className="text-xl font-bold text-rose-700">{currency(engine.totalPaid)}</div>
          </div>
          <div className="rounded-xl bg-blue-50 p-4">
            <div className="text-sm text-blue-700">Saved This Month</div>
            <div className="text-xl font-bold text-blue-700">{currency(engine.monthSavingsActual)}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-sm text-slate-700">Projected Month End</div>
            <div className="text-xl font-bold text-slate-700">{currency(engine.projectedMonthEnd)}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <h2 className="mb-4 text-xl font-semibold">Yearly Overview ({selectedYear})</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-emerald-50 p-4">
            <div className="text-sm text-emerald-700">Year Income</div>
            <div className="text-xl font-bold text-emerald-700">{currency(yearly.totals.income)}</div>
          </div>
          <div className="rounded-xl bg-rose-50 p-4">
            <div className="text-sm text-rose-700">Year Expenditure</div>
            <div className="text-xl font-bold text-rose-700">{currency(yearly.totals.expenditure)}</div>
          </div>
          <div className="rounded-xl bg-blue-50 p-4">
            <div className="text-sm text-blue-700">Year Savings</div>
            <div className="text-xl font-bold text-blue-700">{currency(yearly.totals.savings)}</div>
          </div>
          <div className="rounded-xl bg-amber-50 p-4">
            <div className="text-sm text-amber-700">Year Bills Due</div>
            <div className="text-xl font-bold text-amber-700">{currency(yearly.totals.due)}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <h2 className="mb-4 text-xl font-semibold">Full Year by Month</h2>
        <div className="space-y-3">
          {yearly.months.map((m) => (
            <div key={m.month} className="grid gap-3 rounded-xl border p-4 md:grid-cols-6">
              <div>
                <div className="text-sm text-slate-500">Month</div>
                <div className="font-semibold">{m.month}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Income</div>
                <div className="font-semibold text-emerald-600">{currency(m.income)}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Expenditure</div>
                <div className="font-semibold text-rose-600">{currency(m.expenditure)}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Savings</div>
                <div className="font-semibold text-blue-600">{currency(m.savings)}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Bills Due</div>
                <div className="font-semibold">{currency(m.due)}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500">Projected End</div>
                <div className="font-semibold">{currency(m.projectedEnd)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}