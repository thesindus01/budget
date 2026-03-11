import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { buildPaymentMonthDate, currency } from '@/lib/utils'
import AddBillForm from '@/components/bills/add-bill-form'
import EditBillForm from '@/components/bills/edit-bill-form'

async function createBill(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

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

  if (!name || amount <= 0 || dueDay < 1 || dueDay > 31) return

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

  revalidatePath('/bills')
  revalidatePath('/calendar')
  revalidatePath('/analytics')
}

async function updateBill(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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

  revalidatePath('/bills')
  revalidatePath('/calendar')
  revalidatePath('/analytics')
}

async function deleteBill(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const id = String(formData.get('id') || '')
  if (!id) return

  await supabase
    .from('bill_payments')
    .delete()
    .eq('bill_id', id)
    .eq('user_id', user.id)

  await supabase.from('bills').delete().eq('id', id).eq('user_id', user.id)

  revalidatePath('/bills')
  revalidatePath('/calendar')
  revalidatePath('/analytics')
}

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

  revalidatePath('/bills')
  revalidatePath('/calendar')
  revalidatePath('/analytics')
}

export default async function BillsPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; year?: string }>
}) {
  const params = (await searchParams) || {}
  const now = new Date()
  const selectedMonth = Number(params.month ?? now.getMonth() + 1)
  const selectedYear = Number(params.year ?? now.getFullYear())
  const paymentMonth = buildPaymentMonthDate(selectedYear, selectedMonth - 1)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <div className="p-6">You are not logged in.</div>

  const [{ data: bills }, { data: payments }] = await Promise.all([
    supabase
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('due_day'),
    supabase
      .from('bill_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('payment_month', paymentMonth),
  ])

  const paymentMap = new Map((payments ?? []).map((p) => [p.bill_id, p]))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Bills</h1>
          <p className="text-sm text-slate-600">
            Add bills, set recurrence, reminders, and track paid status for the selected month.
          </p>
        </div>

        <form className="flex flex-col gap-2 sm:flex-row">
          <div>
            <div className="mb-1 text-xs font-medium text-slate-500">Month</div>
            <select
              name="month"
              defaultValue={String(selectedMonth)}
              className="w-full rounded-xl border bg-white px-3 py-2 sm:w-auto"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i, 1).toLocaleString('en-US', {
                    month: 'long',
                  })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="mb-1 text-xs font-medium text-slate-500">Year</div>
            <input
              name="year"
              type="number"
              defaultValue={selectedYear}
              className="w-full rounded-xl border bg-white px-3 py-2 sm:w-32"
            />
          </div>

          <div className="flex items-end">
            <button className="rounded-xl bg-slate-900 px-4 py-2 text-white">
              Load
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border bg-white p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Add New Bill</h2>
          <p className="text-sm text-slate-500">
            Fill in the bill details below. Use custom category only when the preset list does not fit.
          </p>
        </div>

        <AddBillForm action={createBill} />
      </div>

      <div className="rounded-xl bg-yellow-50 p-4 text-sm text-slate-700">
        Pick a preset category or enter your own. “Repeat for (Months)” controls how many future months the bill appears on the calendar.
      </div>

      <div className="space-y-4">
        {(bills ?? []).length === 0 ? (
          <div className="rounded-2xl border bg-white p-4 text-slate-600">
            No bills yet.
          </div>
        ) : (
          bills?.map((bill) => {
            const payment = paymentMap.get(bill.id)
            const isPaid = !!payment?.is_paid

            return (
              <div key={bill.id} className="rounded-2xl border bg-white p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{bill.name}</h3>
                    <div className="text-sm text-slate-500">
                      {currency(Number(bill.amount))} • Due {bill.due_day} • {bill.category}
                    </div>
                  </div>

                  <div
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${
                      isPaid
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {isPaid ? 'Paid for selected month' : 'Unpaid for selected month'}
                  </div>
                </div>

                <EditBillForm bill={bill} action={updateBill} />

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <form action={togglePaid}>
                    <input type="hidden" name="bill_id" value={bill.id} />
                    <input type="hidden" name="is_paid" value={String(isPaid)} />
                    <input type="hidden" name="payment_month" value={paymentMonth} />
                    <button
                      className={`rounded-xl px-4 py-2 text-white ${
                        isPaid ? 'bg-amber-600' : 'bg-emerald-600'
                      }`}
                    >
                      {isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                    </button>
                  </form>

                  <form action={deleteBill}>
                    <input type="hidden" name="id" value={bill.id} />
                    <button className="rounded-xl bg-red-600 px-4 py-2 text-white">
                      Delete Bill
                    </button>
                  </form>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}