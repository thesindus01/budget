import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  buildMonthlyBudgetEngine,
  resolveStartingBalance,
  buildReminderList,
  buildCashCrashDetector,
} from '@/lib/budget-engine'
import {
  currency,
  daysInMonth,
  buildPaymentMonthDate,
} from '@/lib/utils'
import CashFlowWarning from '@/components/calendar/cash-flow-warning'
import DayProgressBadge from '@/components/calendar/day-progress-badge'
import CalendarBalanceChart from '@/components/calendar/calendar-balance-chart'
import CashCrashDetector from '@/components/calendar/cash-crash-detector'

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

async function togglePaid(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return

  const billId = String(formData.get('bill_id') || '')
  const isPaid = formData.get('is_paid') === 'true'
  const paymentMonth = String(formData.get('payment_month') || '')

  if (!billId || !paymentMonth) return

  await supabase.from('bill_payments').upsert(
    {
      user_id: user.id,
      bill_id: billId,
      payment_month: paymentMonth,
      is_paid: !isPaid,
      paid_at: !isPaid ? new Date().toISOString() : null,
      amount_paid: null,
    },
    { onConflict: 'bill_id,payment_month' }
  )

  revalidatePath('/')
  revalidatePath('/calendar')
  revalidatePath('/analytics')
  revalidatePath('/bills')
}

function SummaryStrip({
  startingBalance,
  totalIncome,
  totalPaid,
  monthSavingsActual,
  projectedMonthEnd,
}: {
  startingBalance: number
  totalIncome: number
  totalPaid: number
  monthSavingsActual: number
  projectedMonthEnd: number
}) {
  const items = [
    ['Start Balance', currency(startingBalance), 'text-slate-900'],
    ['Income', currency(totalIncome), 'text-emerald-600'],
    ['Spent', currency(totalPaid), 'text-rose-600'],
    ['Savings', currency(monthSavingsActual), 'text-blue-600'],
    ['Projected End', currency(projectedMonthEnd), 'text-slate-900'],
  ] as const

  return (
    <div className="rounded-2xl border bg-white p-3">
      <div className="grid gap-3 md:grid-cols-5">
        {items.map(([label, value, tone]) => (
          <div key={label} className="rounded-xl border p-3">
            <div className="text-xs text-slate-500">{label}</div>
            <div className={`text-xl font-bold ${tone}`}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function buildBillsEditUrl(params: {
  month: number
  year: number
  billId: string
}) {
  const search = new URLSearchParams({
    month: String(params.month),
    year: String(params.year),
    sort: 'due_day',
    dir: 'asc',
    edit: params.billId,
  })

  return `/bills?${search.toString()}#editor`
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; year?: string; day?: string }>
}) {
  const params = (await searchParams) || {}
  const now = new Date()
  const selectedMonth = Number(params.month ?? now.getMonth() + 1)
  const selectedYear = Number(params.year ?? now.getFullYear())
  const selectedDay = params.day ? Number(params.day) : null
  const monthIndex = selectedMonth - 1
  const paymentMonth = buildPaymentMonthDate(selectedYear, monthIndex)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <div className="p-6">You are not logged in.</div>
  }

  const [incomeRes, billsRes, paymentsRes, balancesRes] = await Promise.all([
    supabase
      .from('income_sources')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_enabled', true)
      .order('created_at'),
    supabase
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('due_day'),
    supabase.from('bill_payments').select('*').eq('user_id', user.id),
    supabase.from('monthly_balances').select('*').eq('user_id', user.id),
  ])

  const fatalError =
    incomeRes.error?.message ||
    billsRes.error?.message ||
    paymentsRes.error?.message ||
    balancesRes.error?.message

  if (fatalError) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Calendar Dashboard</h1>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Failed to load calendar data.
        </div>
        <div className="text-sm text-slate-600">{fatalError}</div>
      </div>
    )
  }

  const safeIncomes = incomeRes.data ?? []
  const safeBills = billsRes.data ?? []
  const safePayments = paymentsRes.data ?? []
  const safeMonthlyBalances = balancesRes.data ?? []

  const startingBalance = resolveStartingBalance({
    year: selectedYear,
    monthIndex,
    incomes: safeIncomes,
    bills: safeBills,
    payments: safePayments,
    monthlyBalances: safeMonthlyBalances,
  })

  const engine = buildMonthlyBudgetEngine({
    year: selectedYear,
    monthIndex,
    incomes: safeIncomes,
    bills: safeBills,
    payments: safePayments,
    startingBalance,
  })

  const reminderList = buildReminderList({
    year: selectedYear,
    monthIndex,
    bills: safeBills,
    payments: safePayments,
  })

  const crashDetector = buildCashCrashDetector({
    year: selectedYear,
    monthIndex,
    engine,
  })

  const balanceChartData = engine.daysData.map((d) => ({
    day: d.day,
    balance: d.runningAllAccounts,
  }))

  const firstDay = new Date(selectedYear, monthIndex, 1).getDay()
  const totalDays = daysInMonth(selectedYear, monthIndex)

  const cells: Array<number | null> = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let day = 1; day <= totalDays; day++) cells.push(day)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar Dashboard</h1>
          <p className="text-sm text-slate-600">
            Month summary first, then warnings, chart, calendar, and reminders table.
          </p>
        </div>

        <form className="flex flex-wrap gap-2" action="/calendar">
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

      <SummaryStrip
        startingBalance={engine.startingBalance}
        totalIncome={engine.totalIncome}
        totalPaid={engine.totalPaid}
        monthSavingsActual={engine.monthSavingsActual}
        projectedMonthEnd={engine.projectedMonthEnd}
      />  
    
      <div id="calendar-grid" className="rounded-2xl border bg-white p-4 overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="mb-3 grid grid-cols-7 gap-2 text-center text-sm font-medium text-slate-500">
            {dayNames.map((name) => (
              <div key={name}>{name}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {cells.map((day, index) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-28 rounded-2xl border border-transparent"
                  />
                )
              }

              const dayData = engine.daysData.find((d) => d.day === day)
              const isSelected = selectedDay === day

              return (
                <Link
                  key={`day-${day}`}
                  href={`/calendar?month=${selectedMonth}&year=${selectedYear}&day=${day}#calendar-grid`}
                  className={`min-h-28 rounded-2xl border p-2 ${
                    isSelected ? 'bg-slate-200 ring-2 ring-slate-500' : 'bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{day}</div>
                    {Number(dayData?.dueTotal || 0) > 0 && (
                      <div className="rounded-full bg-slate-900 px-2 py-1 text-xs text-white">
                        {currency(Number(dayData?.dueTotal || 0))}
                      </div>
                    )}
                  </div>

                  <DayProgressBadge
                    dueCount={Number(dayData?.dueCount || 0)}
                    paidCount={Number(dayData?.paidCount || 0)}
                  />

                  <div className="mt-2 space-y-1 text-xs">
                    {(dayData?.incomes ?? []).slice(0, 1).map((income) => (
                      <div
                        key={income.id}
                        className="rounded-lg bg-emerald-100 px-2 py-1 text-emerald-800"
                      >
                        + {income.name}: {currency(Number(income.amount))}
                      </div>
                    ))}

                    {(dayData?.bills ?? []).slice(0, 2).map((bill) => (
                      <div
                        key={bill.id}
                        className={`rounded-lg px-2 py-1 ${
                          bill.is_paid
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {bill.name}: {currency(Number(bill.amount))}
                      </div>
                    ))}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>	

	<CashCrashDetector detector={crashDetector} />

      <CashFlowWarning
        firstNegativeDay={engine.firstNegativeDay}
        lowestBalance={engine.lowestBalance}
        lowestBalanceDay={engine.lowestBalanceDay}
      />
	  
      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Reminder Table</h2>
          <div className="text-sm text-slate-500">{reminderList.length} reminder(s)</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-2">Bill</th>
                <th className="px-3 py-2">Due Date</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reminderList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No reminders for this month.
                  </td>
                </tr>
              ) : (
                reminderList.map((item) => (
                  <tr key={`${item.bill_id}-${item.due_date.toISOString()}`} className="border-b">
                    <td className="px-3 py-3">{item.bill_name}</td>
                    <td className="px-3 py-3">{item.due_date.toLocaleDateString()}</td>
                    <td className="px-3 py-3">{item.category}</td>
                    <td className="px-3 py-3">{currency(item.amount)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          item.is_paid
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.is_paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/calendar?month=${selectedMonth}&year=${selectedYear}&day=${item.due_day}#calendar-grid`}
                          className="rounded-lg border px-3 py-1"
                        >
                          Go to Day
                        </Link>

                        <form action={togglePaid}>
                          <input type="hidden" name="bill_id" value={item.bill_id} />
                          <input type="hidden" name="is_paid" value={String(item.is_paid)} />
                          <input type="hidden" name="payment_month" value={paymentMonth} />
                          <button
                            className={`rounded-lg px-3 py-1 text-white ${
                              item.is_paid ? 'bg-amber-600' : 'bg-emerald-600'
                            }`}
                          >
                            {item.is_paid ? 'Mark Unpaid' : 'Mark Paid'}
                          </button>
                        </form>

                        <Link
                          href={buildBillsEditUrl({
                            month: selectedMonth,
                            year: selectedYear,
                            billId: item.bill_id,
                          })}
                          className="rounded-lg bg-blue-600 px-3 py-1 text-white"
                        >
                          Edit Bill
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}