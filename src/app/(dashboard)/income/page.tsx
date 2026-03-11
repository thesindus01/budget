import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buildPaymentMonthDate } from '@/lib/utils'

function buildIncomeUrl(params: {
  month: string
  year: string
  extra?: Record<string, string>
}) {
  const query = new URLSearchParams({
    month: params.month,
    year: params.year,
    ...(params.extra ?? {}),
  })
  return `/income?${query.toString()}`
}

async function saveStartingBalance(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const balanceMonth = String(formData.get('balance_month') || '')
  const startingBalance = Number(formData.get('starting_balance') || 0)
  const notes = String(formData.get('notes') || '')
  const month = String(formData.get('month') || '')
  const year = String(formData.get('year') || '')

  if (!balanceMonth) {
    redirect(buildIncomeUrl({ month, year, extra: { error: '1' } }))
  }

  await supabase.from('monthly_balances').upsert(
    {
      user_id: user.id,
      balance_month: balanceMonth,
      starting_balance: startingBalance,
      notes,
    },
    { onConflict: 'user_id,balance_month' }
  )

  redirect(buildIncomeUrl({ month, year, extra: { savedBalance: '1' } }))
}

async function createIncome(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const month = String(formData.get('month') || '')
  const year = String(formData.get('year') || '')

  const name = String(formData.get('name') || '')
  const amount = Number(formData.get('amount') || 0)
  const frequency = String(formData.get('frequency') || 'monthly')
  const dayOfWeekRaw = formData.get('day_of_week')
  const dayOfMonthRaw = formData.get('day_of_month')
  const startDateRaw = formData.get('start_date')

  const payload: any = {
    user_id: user.id,
    name,
    amount,
    frequency,
    is_enabled: true,
    day_of_week: null,
    day_of_month: null,
    start_date: null,
  }

  if (!name || amount <= 0) {
    redirect(buildIncomeUrl({ month, year, extra: { error: '1' } }))
  }

  if (frequency === 'weekly') {
    payload.day_of_week = Number(dayOfWeekRaw)
  } else if (frequency === 'biweekly') {
    payload.start_date = String(startDateRaw || '')
  } else if (frequency === 'monthly') {
    payload.day_of_month = Number(dayOfMonthRaw)
  }

  await supabase.from('income_sources').insert(payload)

  redirect(buildIncomeUrl({ month, year, extra: { savedIncome: '1' } }))
}

async function updateIncome(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const month = String(formData.get('month') || '')
  const year = String(formData.get('year') || '')

  const id = String(formData.get('id') || '')
  const name = String(formData.get('name') || '')
  const amount = Number(formData.get('amount') || 0)
  const frequency = String(formData.get('frequency') || 'monthly')
  const dayOfWeekRaw = formData.get('day_of_week')
  const dayOfMonthRaw = formData.get('day_of_month')
  const startDateRaw = formData.get('start_date')

  if (!id || !name || amount <= 0) {
    redirect(buildIncomeUrl({ month, year, extra: { error: '1' } }))
  }

  const payload: any = {
    name,
    amount,
    frequency,
    day_of_week: null,
    day_of_month: null,
    start_date: null,
  }

  if (frequency === 'weekly') {
    payload.day_of_week = Number(dayOfWeekRaw)
  } else if (frequency === 'biweekly') {
    payload.start_date = String(startDateRaw || '')
  } else if (frequency === 'monthly') {
    payload.day_of_month = Number(dayOfMonthRaw)
  }

  await supabase
    .from('income_sources')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)

  redirect(buildIncomeUrl({ month, year, extra: { updatedIncome: '1' } }))
}

async function deleteIncome(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const month = String(formData.get('month') || '')
  const year = String(formData.get('year') || '')
  const id = String(formData.get('id') || '')
  if (!id) return

  await supabase.from('income_sources').delete().eq('id', id).eq('user_id', user.id)

  redirect(buildIncomeUrl({ month, year, extra: { deletedIncome: '1' } }))
}

function StatusBanner({ params }: { params: Record<string, string | undefined> }) {
  if (params.savedBalance === '1') {
    return <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-700">Starting balance saved successfully.</div>
  }
  if (params.savedIncome === '1') {
    return <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">Income added successfully.</div>
  }
  if (params.updatedIncome === '1') {
    return <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-cyan-700">Income updated successfully.</div>
  }
  if (params.deletedIncome === '1') {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">Income deleted successfully.</div>
  }
  if (params.error === '1') {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">Please check the fields and try again.</div>
  }
  return null
}

export default async function IncomePage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string
    year?: string
    savedBalance?: string
    savedIncome?: string
    updatedIncome?: string
    deletedIncome?: string
    error?: string
  }>
}) {
  const params = (await searchParams) || {}
  const now = new Date()
  const selectedMonth = Number(params.month ?? now.getMonth() + 1)
  const selectedYear = Number(params.year ?? now.getFullYear())
  const balanceMonth = buildPaymentMonthDate(selectedYear, selectedMonth - 1)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <div className="p-6">You are not logged in.</div>

  const [{ data: incomes }, { data: monthlyBalance }] = await Promise.all([
    supabase
      .from('income_sources')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at'),
    supabase
      .from('monthly_balances')
      .select('*')
      .eq('user_id', user.id)
      .eq('balance_month', balanceMonth)
      .maybeSingle(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Income</h1>
          <p className="text-sm text-slate-600">
            Manage income sources and monthly starting balance here.
          </p>
        </div>

        <form className="flex flex-col gap-2 sm:flex-row">
          <select name="month" defaultValue={String(selectedMonth)} className="rounded-xl border bg-white px-3 py-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleString('en-US', { month: 'long' })}
              </option>
            ))}
          </select>

          <input name="year" type="number" defaultValue={selectedYear} className="rounded-xl border bg-white px-3 py-2" />
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">Load</button>
        </form>
      </div>

      <StatusBanner params={params} />

      <div className="rounded-2xl border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Monthly Starting Balance</h2>

        <form action={saveStartingBalance} className="grid gap-3 md:grid-cols-3">
          <input type="hidden" name="balance_month" value={balanceMonth} />
          <input type="hidden" name="month" value={selectedMonth} />
          <input type="hidden" name="year" value={selectedYear} />

          <input
            name="starting_balance"
            type="number"
            step="0.01"
            defaultValue={Number(monthlyBalance?.starting_balance || 0)}
            className="rounded-xl border p-3"
            placeholder="Starting balance"
          />

          <input
            name="notes"
            defaultValue={monthlyBalance?.notes ?? ''}
            className="rounded-xl border p-3"
            placeholder="Month note"
          />

          <button className="rounded-xl bg-blue-600 px-4 py-2 text-white">
            Save Starting Balance
          </button>
        </form>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Add Income</h2>

        <form action={createIncome} className="grid gap-3 md:grid-cols-3">
          <input type="hidden" name="month" value={selectedMonth} />
          <input type="hidden" name="year" value={selectedYear} />

          <input name="name" placeholder="Income name" className="rounded-xl border p-3" required />
          <input name="amount" type="number" step="0.01" placeholder="Amount" className="rounded-xl border p-3" required />
          <select name="frequency" defaultValue="monthly" className="rounded-xl border p-3">
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <select name="day_of_week" defaultValue="5" className="rounded-xl border p-3">
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
          </select>
          <input name="day_of_month" type="number" min="1" max="31" placeholder="Day of month" className="rounded-xl border p-3" />
          <input name="start_date" type="date" className="rounded-xl border p-3" />

          <button className="rounded-xl bg-slate-900 p-3 text-white md:col-span-3">
            Add Income
          </button>
        </form>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <h2 className="mb-4 text-lg font-semibold">Income Table</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Frequency</th>
                <th className="px-3 py-2">Day of Week</th>
                <th className="px-3 py-2">Day of Month</th>
                <th className="px-3 py-2">Start Date</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(incomes ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    No income sources yet.
                  </td>
                </tr>
              ) : (
                incomes?.map((income) => (
                  <tr key={income.id} className="border-b align-top">
                    <td className="px-3 py-3">{income.name}</td>
                    <td className="px-3 py-3">{income.amount}</td>
                    <td className="px-3 py-3">{income.frequency}</td>
                    <td className="px-3 py-3">{income.day_of_week ?? '-'}</td>
                    <td className="px-3 py-3">{income.day_of_month ?? '-'}</td>
                    <td className="px-3 py-3">{income.start_date ?? '-'}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <form action={deleteIncome}>
                          <input type="hidden" name="id" value={income.id} />
                          <input type="hidden" name="month" value={selectedMonth} />
                          <input type="hidden" name="year" value={selectedYear} />
                          <button className="rounded-lg bg-red-500 px-3 py-1 text-white">
                            Delete
                          </button>
                        </form>
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