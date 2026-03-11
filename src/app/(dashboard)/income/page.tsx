import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function createIncome(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

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

  if (!name || amount <= 0) return

  if (frequency === 'weekly') {
    payload.day_of_week = Number(dayOfWeekRaw)
  } else if (frequency === 'biweekly') {
    payload.start_date = String(startDateRaw || '')
  } else if (frequency === 'monthly') {
    payload.day_of_month = Number(dayOfMonthRaw)
  }

  await supabase.from('income_sources').insert(payload)

  revalidatePath('/income')
  revalidatePath('/calendar')
  revalidatePath('/analytics')
}

async function updateIncome(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const id = String(formData.get('id') || '')
  const name = String(formData.get('name') || '')
  const amount = Number(formData.get('amount') || 0)
  const frequency = String(formData.get('frequency') || 'monthly')
  const dayOfWeekRaw = formData.get('day_of_week')
  const dayOfMonthRaw = formData.get('day_of_month')
  const startDateRaw = formData.get('start_date')

  if (!id || !name || amount <= 0) return

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

  revalidatePath('/income')
  revalidatePath('/calendar')
  revalidatePath('/analytics')
}

async function deleteIncome(formData: FormData) {
  'use server'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const id = String(formData.get('id') || '')
  if (!id) return

  await supabase.from('income_sources').delete().eq('id', id).eq('user_id', user.id)

  revalidatePath('/income')
  revalidatePath('/calendar')
  revalidatePath('/analytics')
}

export default async function IncomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return <div className="p-6">You are not logged in.</div>

  const { data: incomes } = await supabase
    .from('income_sources')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold sm:text-3xl">Income Sources</h1>

      <form action={createIncome} className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2 xl:grid-cols-3">
        <input
          name="name"
          placeholder="Income name"
          className="rounded-xl border p-3"
          required
        />

        <input
          name="amount"
          type="number"
          step="0.01"
          placeholder="Amount"
          className="rounded-xl border p-3"
          required
        />

        <select
          name="frequency"
          className="rounded-xl border p-3"
          defaultValue="monthly"
        >
          <option value="weekly">Weekly</option>
          <option value="biweekly">Bi-Weekly</option>
          <option value="monthly">Monthly</option>
        </select>

        <select
          name="day_of_week"
          className="rounded-xl border p-3"
          defaultValue="5"
        >
          <option value="0">Sunday</option>
          <option value="1">Monday</option>
          <option value="2">Tuesday</option>
          <option value="3">Wednesday</option>
          <option value="4">Thursday</option>
          <option value="5">Friday</option>
          <option value="6">Saturday</option>
        </select>

        <input
          name="day_of_month"
          type="number"
          min="1"
          max="31"
          placeholder="Day of month"
          className="rounded-xl border p-3"
        />

        <input
          name="start_date"
          type="date"
          className="rounded-xl border p-3"
        />

        <button className="rounded-xl bg-slate-900 p-3 text-white sm:col-span-2 xl:col-span-3">
          Add income
        </button>
      </form>

      <div className="rounded-xl bg-yellow-50 p-4 text-sm text-slate-700">
        Weekly uses <strong>day of week</strong>. Bi-weekly uses <strong>start date</strong>. Monthly uses <strong>day of month</strong>.
      </div>

      <div className="grid gap-4">
        {(incomes ?? []).length === 0 ? (
          <div className="rounded-2xl border bg-white p-4 text-slate-600">
            No income sources yet.
          </div>
        ) : (
          incomes?.map((income) => (
            <div key={income.id} className="rounded-2xl border bg-white p-4 space-y-4">
              <form action={updateIncome} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <input type="hidden" name="id" value={income.id} />

                <input
                  name="name"
                  defaultValue={income.name}
                  className="rounded-xl border p-3"
                  required
                />

                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={Number(income.amount)}
                  className="rounded-xl border p-3"
                  required
                />

                <select
                  name="frequency"
                  defaultValue={income.frequency}
                  className="rounded-xl border p-3"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>

                <select
                  name="day_of_week"
                  defaultValue={income.day_of_week ?? 5}
                  className="rounded-xl border p-3"
                >
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>

                <input
                  name="day_of_month"
                  type="number"
                  min="1"
                  max="31"
                  defaultValue={income.day_of_month ?? ''}
                  className="rounded-xl border p-3"
                />

                <input
                  name="start_date"
                  type="date"
                  defaultValue={income.start_date ?? ''}
                  className="rounded-xl border p-3"
                />

                <button className="rounded-xl bg-blue-600 p-3 text-white sm:col-span-2 xl:col-span-3">
                  Save
                </button>
              </form>

              <form action={deleteIncome}>
                <input type="hidden" name="id" value={income.id} />
                <button className="rounded-xl bg-red-600 px-4 py-2 text-white">
                  Delete
                </button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  )
}