import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buildPaymentMonthDate, currency, DEFAULT_BILL_CATEGORIES } from '@/lib/utils'
import { suggestBillCategory } from '@/lib/bill-categorizer'

function buildBillsUrl(params: {
  month: string
  year: string
  sort: string
  dir: string
  extra?: Record<string, string>
}) {
  const query = new URLSearchParams({
    month: params.month,
    year: params.year,
    sort: params.sort,
    dir: params.dir,
    ...(params.extra ?? {}),
  })
  return `/bills?${query.toString()}`
}

async function createBill(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const month = String(formData.get('month') || '')
  const year = String(formData.get('year') || '')
  const sort = String(formData.get('sort') || 'due_day')
  const dir = String(formData.get('dir') || 'asc')

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

  if (!name || amount <= 0 || dueDay < 1 || dueDay > 31) {
    redirect(buildBillsUrl({ month, year, sort, dir, extra: { error: '1' } }))
  }

  await supabase.from('bills').insert({
    user_id: user.id,
    name,
    amount,
    due_day: dueDay,
    category,
    reminders_enabled: remindersEnabled,
    reminder_days_before: reminderDaysBefore,
    is_active: true,
    is_recurring: recurringType === 'monthly',
    recurring_type: recurringType,
    recurring_months: recurringMonths,
    start_month: startMonth || null,
  })

  redirect(buildBillsUrl({ month, year, sort, dir, extra: { saved: '1' } }))
}

async function updateBill(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const month = String(formData.get('month') || '')
  const year = String(formData.get('year') || '')
  const sort = String(formData.get('sort') || 'due_day')
  const dir = String(formData.get('dir') || 'asc')

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

  if (!id || !name || amount <= 0 || dueDay < 1 || dueDay > 31) {
    redirect(buildBillsUrl({ month, year, sort, dir, extra: { error: '1' } }))
  }

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

  redirect(buildBillsUrl({ month, year, sort, dir, extra: { updated: '1' } }))
}

async function deleteBill(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const month = String(formData.get('month') || '')
  const year = String(formData.get('year') || '')
  const sort = String(formData.get('sort') || 'due_day')
  const dir = String(formData.get('dir') || 'asc')
  const id = String(formData.get('id') || '')
  if (!id) return

  await supabase.from('bill_payments').delete().eq('bill_id', id).eq('user_id', user.id)
  await supabase.from('bills').delete().eq('id', id).eq('user_id', user.id)

  redirect(buildBillsUrl({ month, year, sort, dir, extra: { deleted: '1' } }))
}

async function togglePaid(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const month = String(formData.get('month') || '')
  const year = String(formData.get('year') || '')
  const sort = String(formData.get('sort') || 'due_day')
  const dir = String(formData.get('dir') || 'asc')

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

  redirect(buildBillsUrl({ month, year, sort, dir, extra: { toggled: '1' } }))
}

function StatusBanner({ params }: { params: Record<string, string | undefined> }) {
  if (params.saved === '1') {
    return <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">Bill added successfully.</div>
  }
  if (params.updated === '1') {
    return <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-700">Bill updated successfully.</div>
  }
  if (params.deleted === '1') {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">Bill deleted successfully.</div>
  }
  if (params.toggled === '1') {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-700">Bill payment status updated.</div>
  }
  if (params.error === '1') {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">Please check the bill fields and try again.</div>
  }
  return null
}

export default async function BillsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    month?: string
    year?: string
    sort?: string
    dir?: string
    edit?: string
    saved?: string
    updated?: string
    deleted?: string
    toggled?: string
    error?: string
  }>
}) {
  const params = (await searchParams) || {}
  const now = new Date()
  const selectedMonth = Number(params.month ?? now.getMonth() + 1)
  const selectedYear = Number(params.year ?? now.getFullYear())
  const sort = params.sort ?? 'due_day'
  const dir = params.dir ?? 'asc'
  const editId = params.edit ?? ''
  const paymentMonth = buildPaymentMonthDate(selectedYear, selectedMonth - 1)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="p-6">You are not logged in.</div>

  const [billsRes, paymentsRes] = await Promise.all([
    supabase.from('bills').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('bill_payments').select('*').eq('user_id', user.id).eq('payment_month', paymentMonth),
  ])

  const bills = billsRes.data ?? []
  const payments = paymentsRes.data ?? []
  const paymentMap = new Map(payments.map((p) => [p.bill_id, p]))
  const editBill = bills.find((b) => b.id === editId) ?? null

  const sortedBills = [...bills].sort((a, b) => {
    const factor = dir === 'desc' ? -1 : 1

    if (sort === 'amount') return (Number(a.amount) - Number(b.amount)) * factor
    if (sort === 'name') return a.name.localeCompare(b.name) * factor
    if (sort === 'category') return (a.category || '').localeCompare(b.category || '') * factor
    return (Number(a.due_day) - Number(b.due_day)) * factor
  })

  const toggleDir = (field: string) => (sort === field && dir === 'asc' ? 'desc' : 'asc')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Bills</h1>
          <p className="text-sm text-slate-600">
            Add, sort, edit, delete, and mark bills paid from one place.
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

      <div id="editor" className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Add Bill</h2>

          <form action={createBill} className="grid gap-3">
            <input type="hidden" name="month" value={selectedMonth} />
            <input type="hidden" name="year" value={selectedYear} />
            <input type="hidden" name="sort" value={sort} />
            <input type="hidden" name="dir" value={dir} />

            <div className="grid gap-3 md:grid-cols-2">
              <input name="name" placeholder="Bill name" className="rounded-xl border p-3" required />
              <input name="amount" type="number" step="0.01" placeholder="Amount" className="rounded-xl border p-3" required />
              <input name="due_day" type="number" min="1" max="31" placeholder="Due day" className="rounded-xl border p-3" required />
              <select name="category" defaultValue="Other" className="rounded-xl border p-3">
                {DEFAULT_BILL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <input name="custom_category" placeholder="Optional custom category" className="rounded-xl border p-3" />
              <select name="recurring_type" defaultValue="monthly" className="rounded-xl border p-3">
                <option value="monthly">Recurring Monthly</option>
                <option value="one_time">One Time</option>
              </select>
              <input name="recurring_months" type="number" min="1" max="120" defaultValue="12" className="rounded-xl border p-3" />
              <input name="start_month" type="date" className="rounded-xl border p-3" />
              <input name="reminder_days_before" type="number" min="0" max="30" defaultValue="3" className="rounded-xl border p-3" />
              <label className="flex items-center gap-2 rounded-xl border p-3 text-sm">
                <input name="reminders_enabled" type="checkbox" defaultChecked />
                Enable reminders
              </label>
            </div>

            <button className="rounded-xl bg-slate-900 p-3 text-white">Add Bill</button>
          </form>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Edit Bill</h2>

          {!editBill ? (
            <div className="rounded-xl border p-4 text-slate-600">
              Pick a bill from the table below and click <strong>Edit</strong>.
            </div>
          ) : (
            <form action={updateBill} className="grid gap-3">
              <input type="hidden" name="id" value={editBill.id} />
              <input type="hidden" name="month" value={selectedMonth} />
              <input type="hidden" name="year" value={selectedYear} />
              <input type="hidden" name="sort" value={sort} />
              <input type="hidden" name="dir" value={dir} />

              <div className="grid gap-3 md:grid-cols-2">
                <input name="name" defaultValue={editBill.name} className="rounded-xl border p-3" required />
                <input name="amount" type="number" step="0.01" defaultValue={Number(editBill.amount)} className="rounded-xl border p-3" required />
                <input name="due_day" type="number" min="1" max="31" defaultValue={editBill.due_day} className="rounded-xl border p-3" required />
                <select name="category" defaultValue={editBill.category} className="rounded-xl border p-3">
                  {DEFAULT_BILL_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <input name="custom_category" placeholder="Optional custom category" className="rounded-xl border p-3" />
                <select name="recurring_type" defaultValue={editBill.recurring_type ?? 'monthly'} className="rounded-xl border p-3">
                  <option value="monthly">Recurring Monthly</option>
                  <option value="one_time">One Time</option>
                </select>
                <input name="recurring_months" type="number" min="1" max="120" defaultValue={editBill.recurring_months ?? 12} className="rounded-xl border p-3" />
                <input name="start_month" type="date" defaultValue={editBill.start_month ?? ''} className="rounded-xl border p-3" />
                <input name="reminder_days_before" type="number" min="0" max="30" defaultValue={editBill.reminder_days_before} className="rounded-xl border p-3" />
                <label className="flex items-center gap-2 rounded-xl border p-3 text-sm">
                  <input name="reminders_enabled" type="checkbox" defaultChecked={editBill.reminders_enabled} />
                  Enable reminders
                </label>
              </div>

              <div className="flex gap-2">
                <button className="rounded-xl bg-blue-600 px-4 py-2 text-white">Save Changes</button>
                <Link
                  href={buildBillsUrl({
                    month: String(selectedMonth),
                    year: String(selectedYear),
                    sort,
                    dir,
                  })}
                  className="rounded-xl border px-4 py-2"
                >
                  Cancel
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Bills Table</h2>
          <div className="text-sm text-slate-500">{sortedBills.length} bill(s)</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-2">
                  <Link href={buildBillsUrl({ month: String(selectedMonth), year: String(selectedYear), sort: 'name', dir: toggleDir('name') })}>
                    Name
                  </Link>
                </th>
                <th className="px-3 py-2">
                  <Link href={buildBillsUrl({ month: String(selectedMonth), year: String(selectedYear), sort: 'amount', dir: toggleDir('amount') })}>
                    Amount
                  </Link>
                </th>
                <th className="px-3 py-2">
                  <Link href={buildBillsUrl({ month: String(selectedMonth), year: String(selectedYear), sort: 'due_day', dir: toggleDir('due_day') })}>
                    Due Day
                  </Link>
                </th>
                <th className="px-3 py-2">
                  <Link href={buildBillsUrl({ month: String(selectedMonth), year: String(selectedYear), sort: 'category', dir: toggleDir('category') })}>
                    Category
                  </Link>
                </th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Paid</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    No bills found.
                  </td>
                </tr>
              ) : (
                sortedBills.map((bill) => {
                  const isPaid = !!paymentMap.get(bill.id)?.is_paid

                  return (
                    <tr key={bill.id} className="border-b align-top">
                      <td className="px-3 py-3">{bill.name}</td>
                      <td className="px-3 py-3">{currency(Number(bill.amount))}</td>
                      <td className="px-3 py-3">{bill.due_day}</td>
                      <td className="px-3 py-3">{bill.category}</td>
                      <td className="px-3 py-3">{bill.recurring_type ?? 'monthly'}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`${buildBillsUrl({
                              month: String(selectedMonth),
                              year: String(selectedYear),
                              sort,
                              dir,
                              extra: { edit: bill.id },
                            })}#editor`}
                            className="rounded-lg bg-cyan-500 px-3 py-1 text-white"
                          >
                            Edit
                          </Link>

                          <form action={togglePaid}>
                            <input type="hidden" name="bill_id" value={bill.id} />
                            <input type="hidden" name="is_paid" value={String(isPaid)} />
                            <input type="hidden" name="payment_month" value={paymentMonth} />
                            <input type="hidden" name="month" value={selectedMonth} />
                            <input type="hidden" name="year" value={selectedYear} />
                            <input type="hidden" name="sort" value={sort} />
                            <input type="hidden" name="dir" value={dir} />
                            <button className={`rounded-lg px-3 py-1 text-white ${isPaid ? 'bg-amber-600' : 'bg-emerald-600'}`}>
                              {isPaid ? 'Unpay' : 'Pay'}
                            </button>
                          </form>

                          <form action={deleteBill}>
                            <input type="hidden" name="id" value={bill.id} />
                            <input type="hidden" name="month" value={selectedMonth} />
                            <input type="hidden" name="year" value={selectedYear} />
                            <input type="hidden" name="sort" value={sort} />
                            <input type="hidden" name="dir" value={dir} />
                            <button className="rounded-lg bg-red-500 px-3 py-1 text-white">
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}