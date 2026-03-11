import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import CashFlowWarning from '@/components/calendar/cash-flow-warning'
import DayProgressBadge from '@/components/calendar/day-progress-badge'
import CalendarBalanceChart from '@/components/calendar/calendar-balance-chart'
import CashCrashDetector from '@/components/calendar/cash-crash-detector'

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
  DEFAULT_BILL_CATEGORIES,
} from '@/lib/utils'

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

async function saveStartingBalance(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const balanceMonth = String(formData.get('balance_month') || '')
  const startingBalance = Number(formData.get('starting_balance') || 0)
  const notes = String(formData.get('notes') || '')

  if (!balanceMonth) return

  await supabase.from('monthly_balances').upsert(
    {
      user_id: user.id,
      balance_month: balanceMonth,
      starting_balance: startingBalance,
      notes,
    },
    { onConflict: 'user_id,balance_month' }
  )

  revalidatePath('/')
  revalidatePath('/calendar')
  revalidatePath('/analytics')
}

async function togglePaid(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

async function updateBillInline(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const id = String(formData.get('id') || '')
  const name = String(formData.get('name') || '').trim()
  const amount = Number(formData.get('amount') || 0)
  const dueDay = Number(formData.get('due_day') || 1)

  const selectedCategory = String(formData.get('category') || 'Other')
  const customCategory = String(formData.get('custom_category') || '').trim()
  const category = customCategory || selectedCategory || 'Other'

  const reminderDaysBefore = Number(formData.get('reminder_days_before') || 3)
  const remindersEnabled = formData.get('reminders_enabled') === 'on'
  const recurringType = String(formData.get('recurring_type') || 'monthly')
  const recurringMonths = Number(formData.get('recurring_months') || 12)
  const startMonth = String(formData.get('start_month') || '')

  if (!id || !name || amount <= 0 || dueDay < 1 || dueDay > 31) return

  await supabase
    .from('bills')
    .update({
      name,
      amount,
      due_day: dueDay,
      category,
      reminders_enabled: remindersEnabled,
      reminder_days_before: reminderDaysBefore,
      recurring_type: recurringType,
      recurring_months: recurringMonths,
      start_month: startMonth || null,
      is_recurring: recurringType === 'monthly',
    })
    .eq('id', id)
    .eq('user_id', user.id)

  revalidatePath('/')
  revalidatePath('/calendar')
  revalidatePath('/analytics')
  revalidatePath('/bills')
}

async function deleteBillInline(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const id = String(formData.get('id') || '')
  if (!id) return

  await supabase.from('bill_payments').delete().eq('bill_id', id).eq('user_id', user.id)
  await supabase.from('bills').delete().eq('id', id).eq('user_id', user.id)

  revalidatePath('/')
  revalidatePath('/calendar')
  revalidatePath('/analytics')
  revalidatePath('/bills')
}

function SummaryCard({
  label,
  value,
  valueClassName = '',
}: {
  label: string
  value: string
  valueClassName?: string
}) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-2xl font-bold ${valueClassName}`}>{value}</div>
    </div>
  )
}

function ReminderSection({
  title,
  tone,
  items,
  selectedMonth,
  selectedYear,
  paymentMonth,
}: {
  title: string
  tone: 'red' | 'amber' | 'blue'
  items: Array<{
    bill_id: string
    bill_name: string
    amount: number
    category: string
    due_day: number
    due_date: Date
    is_paid: boolean
  }>
  selectedMonth: number
  selectedYear: number
  paymentMonth: string
}) {
  const toneClass =
    tone === 'red'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-blue-200 bg-blue-50 text-blue-700'

  return (
    <div>
      <div className={`mb-2 rounded-lg border px-3 py-1 text-sm font-semibold ${toneClass}`}>
        {title}
      </div>

      {items.length === 0 && <div className="text-sm text-slate-500">None</div>}

      {items.map((item) => (
        <div key={`${title}-${item.bill_id}-${item.due_date.toISOString()}`} className="mt-2 rounded-xl border p-3">
          <div className="font-semibold">{item.bill_name}</div>
          <div className="text-sm text-slate-500">
            Due: {item.due_date.toLocaleDateString()}
          </div>
          <div className="text-sm text-slate-500">
            {currency(item.amount)} • {item.category}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/calendar?month=${selectedMonth}&year=${selectedYear}&day=${item.due_day}`}
              className="rounded-xl border px-3 py-2 text-sm"
            >
              Go to Day
            </Link>

            <form action={togglePaid}>
              <input type="hidden" name="bill_id" value={item.bill_id} />
              <input type="hidden" name="is_paid" value={String(item.is_paid)} />
              <input type="hidden" name="payment_month" value={paymentMonth} />
              <button
                className={`rounded-xl px-3 py-2 text-sm text-white ${
                  item.is_paid ? 'bg-amber-600' : 'bg-emerald-600'
                }`}
              >
                {item.is_paid ? 'Mark Unpaid' : 'Mark Paid'}
              </button>
            </form>

            <Link
              href={`/calendar?month=${selectedMonth}&year=${selectedYear}&day=${item.due_day}`}
              className="rounded-xl bg-blue-600 px-3 py-2 text-sm text-white"
            >
              Edit Bill
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
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
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <div className="p-6">You are not logged in.</div>
  }

  const [incomeRes, billsRes, paymentsRes, balancesRes] = await Promise.all([
    supabase.from('income_sources').select('*').eq('user_id', user.id).eq('is_enabled', true).order('created_at'),
    supabase.from('bills').select('*').eq('user_id', user.id).eq('is_active', true).order('due_day'),
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

  const currentMonthlyBalance =
    safeMonthlyBalances.find((m) => m.balance_month === paymentMonth) || null

  const engine = buildMonthlyBudgetEngine({
    year: selectedYear,
    monthIndex,
    incomes: safeIncomes,
    bills: safeBills,
    payments: safePayments,
    startingBalance,
  })

  const balanceChartData = engine.daysData.map((d) => ({
	day: d.day,
	balance: d.runningAllAccounts,
  }))

 const crashDetector = buildCashCrashDetector({
	year: selectedYear,
	monthIndex,
	engine,
 })

  const reminderList = buildReminderList({
    year: selectedYear,
    monthIndex,
    bills: safeBills,
    payments: safePayments,
  }) 
 
 const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueToday = reminderList.filter((item) => {
    const due = new Date(item.due_date)
    due.setHours(0, 0, 0, 0)
    return due.getTime() === today.getTime()
  })

  const dueThisWeek = reminderList.filter((item) => {
    const due = new Date(item.due_date)
    due.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 1 && diffDays <= 7
  })

  const upcomingLaterThisMonth = reminderList.filter((item) => {
    const due = new Date(item.due_date)
    due.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays > 7
  })

  const firstDay = new Date(selectedYear, monthIndex, 1).getDay()
  const totalDays = daysInMonth(selectedYear, monthIndex)

  const cells: Array<number | null> = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let day = 1; day <= totalDays; day++) cells.push(day)

  const selectedDayData =
    selectedDay != null
      ? engine.daysData.find((d) => d.day === selectedDay) ?? null
      : null

  const selectedDateLabel =
    selectedDay != null
      ? new Date(selectedYear, monthIndex, selectedDay).toLocaleDateString()
      : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Calendar Dashboard</h1>
          <p className="text-sm text-slate-600">
            Your month at a glance: income, bills, reminders, spending, and savings.
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="mb-3 text-lg font-semibold">Starting Balance</h2>

          <form action={saveStartingBalance} className="grid gap-3 sm:grid-cols-3">
            <input type="hidden" name="balance_month" value={paymentMonth} />

            <div>
              <div className="mb-1 text-sm font-medium text-slate-700">
                Starting Balance
              </div>
              <input
                name="starting_balance"
                type="number"
                step="0.01"
                defaultValue={startingBalance}
                className="w-full rounded-xl border p-3"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="mb-1 text-sm font-medium text-slate-700">Notes</div>
              <input
                name="notes"
                defaultValue={currentMonthlyBalance?.notes ?? ''}
                placeholder="Optional notes for this month"
                className="w-full rounded-xl border p-3"
              />
            </div>

            <button className="rounded-xl bg-blue-600 px-4 py-3 text-white sm:col-span-3">
              Save Starting Balance
            </button>
          </form>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold">Reminder List</h2>

          {reminderList.length === 0 ? (
            <div className="rounded-xl border p-3 text-slate-600">
              No reminders for this month.
            </div>
          ) : (
            <div className="space-y-5">
              <ReminderSection
                title="Due Today"
                tone="red"
                items={dueToday}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                paymentMonth={paymentMonth}
              />

              <ReminderSection
                title="Due This Week"
                tone="amber"
                items={dueThisWeek}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                paymentMonth={paymentMonth}
              />

              <ReminderSection
                title="Upcoming Later This Month"
                tone="blue"
                items={upcomingLaterThisMonth}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                paymentMonth={paymentMonth}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <SummaryCard label="Start Balance" value={currency(engine.startingBalance)} />
        <SummaryCard label="Income" value={currency(engine.totalIncome)} valueClassName="text-emerald-600" />
        <SummaryCard label="Spent" value={currency(engine.totalPaid)} valueClassName="text-rose-600" />
        <SummaryCard label="Savings" value={currency(engine.monthSavingsActual)} valueClassName="text-blue-600" />
        <SummaryCard label="Projected Month End" value={currency(engine.projectedMonthEnd)} />
      </div>
	
	<CashCrashDetector detector={crashDetector} />
	
	<CashFlowWarning
  		firstNegativeDay={engine.firstNegativeDay}
  		lowestBalance={engine.lowestBalance}
  		lowestBalanceDay={engine.lowestBalanceDay}
	/>

	<CalendarBalanceChart data={balanceChartData} />

      <div className="rounded-2xl border bg-white p-4 overflow-x-auto">
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
                  href={`/calendar?month=${selectedMonth}&year=${selectedYear}&day=${day}`}
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
                    {(dayData?.incomes ?? []).slice(0, 2).map((income) => (
                      <div
                        key={income.id}
                        className="rounded-lg bg-emerald-100 px-2 py-1 text-emerald-800"
                      >
                        + {income.name}: {currency(Number(income.amount))}
                      </div>
                    ))}

                    {(dayData?.bills ?? []).slice(0, 3).map((bill) => (
                      <div
                        key={bill.id}
                        className={`rounded-lg px-2 py-1 ${
                          bill.is_paid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
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

      {selectedDayData && selectedDateLabel && (
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="text-xl font-semibold">Details for {selectedDateLabel}</h2>

          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-lg font-semibold">Income</h3>

              <div className="space-y-3">
                {selectedDayData.incomes.length === 0 ? (
                  <div className="rounded-xl border p-3 text-slate-600">
                    No income on this day.
                  </div>
                ) : (
                  selectedDayData.incomes.map((income) => (
                    <div key={income.id} className="rounded-xl border p-3">
                      <div className="font-semibold">{income.name}</div>
                      <div className="text-sm text-slate-500">
                        {currency(Number(income.amount))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-lg font-semibold">Bills</h3>

              <div className="space-y-4">
                {selectedDayData.bills.length === 0 ? (
                  <div className="rounded-xl border p-3 text-slate-600">
                    No bills due on this day.
                  </div>
                ) : (
                  selectedDayData.bills.map((bill) => (
                    <div key={bill.id} className="rounded-xl border p-3 space-y-3">
                      <form action={updateBillInline} className="grid gap-3 md:grid-cols-3">
                        <input type="hidden" name="id" value={bill.id} />

                        <input
                          name="name"
                          defaultValue={bill.name}
                          className="rounded-xl border p-3"
                          required
                        />

                        <input
                          name="amount"
                          type="number"
                          step="0.01"
                          defaultValue={Number(bill.amount)}
                          className="rounded-xl border p-3"
                          required
                        />

                        <input
                          name="due_day"
                          type="number"
                          min="1"
                          max="31"
                          defaultValue={bill.due_day}
                          className="rounded-xl border p-3"
                          required
                        />

                        <select
                          name="category"
                          defaultValue={bill.category}
                          className="rounded-xl border p-3"
                        >
                          {DEFAULT_BILL_CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>

                        <input
                          name="custom_category"
                          placeholder="Optional custom category"
                          className="rounded-xl border p-3"
                        />

                        <select
                          name="recurring_type"
                          defaultValue={bill.recurring_type ?? 'monthly'}
                          className="rounded-xl border p-3"
                        >
                          <option value="monthly">Recurring Monthly</option>
                          <option value="one_time">One Time</option>
                        </select>

                        <input
                          name="recurring_months"
                          type="number"
                          min="1"
                          max="120"
                          defaultValue={bill.recurring_months ?? 12}
                          className="rounded-xl border p-3"
                        />

                        <input
                          name="start_month"
                          type="date"
                          defaultValue={bill.start_month ?? ''}
                          className="rounded-xl border p-3"
                        />

                        <input
                          name="reminder_days_before"
                          type="number"
                          min="0"
                          max="30"
                          defaultValue={bill.reminder_days_before}
                          className="rounded-xl border p-3"
                        />

                        <label className="flex items-center gap-2 text-sm">
                          <input
                            name="reminders_enabled"
                            type="checkbox"
                            defaultChecked={bill.reminders_enabled}
                          />
                          Enable reminders
                        </label>

                        <button className="rounded-xl bg-blue-600 px-4 py-2 text-white md:col-span-3">
                          Save Changes
                        </button>
                      </form>

                      <div className="flex flex-wrap gap-2">
                        <form action={togglePaid}>
                          <input type="hidden" name="bill_id" value={bill.id} />
                          <input type="hidden" name="is_paid" value={String(bill.is_paid)} />
                          <input type="hidden" name="payment_month" value={paymentMonth} />
                          <button
                            className={`rounded-xl px-4 py-2 text-white ${
                              bill.is_paid ? 'bg-amber-600' : 'bg-emerald-600'
                            }`}
                          >
                            {bill.is_paid ? 'Mark Unpaid' : 'Mark Paid'}
                          </button>
                        </form>

                        <form action={deleteBillInline}>
                          <input type="hidden" name="id" value={bill.id} />
                          <button className="rounded-xl bg-red-600 px-4 py-2 text-white">
                            Delete Bill
                          </button>
                        </form>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Month Summary</h2>
          <Link
            href={`/analytics?month=${selectedMonth}&year=${selectedYear}`}
            className="text-sm underline"
          >
            Open analytics
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <div className="text-sm text-slate-500">Income</div>
            <div className="text-xl font-bold text-emerald-600">
              {currency(engine.totalIncome)}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Spent</div>
            <div className="text-xl font-bold text-rose-600">
              {currency(engine.totalPaid)}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Savings</div>
            <div className="text-xl font-bold text-blue-600">
              {currency(engine.monthSavingsActual)}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-500">Till Today Balance</div>
            <div className="text-xl font-bold">
              {currency(engine.tillToday.balance)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}