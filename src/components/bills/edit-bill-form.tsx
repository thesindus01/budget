'use client'

import { useState } from 'react'
import { DEFAULT_BILL_CATEGORIES } from '@/lib/utils'
import { suggestBillCategory } from '@/lib/bill-categorizer'

type Bill = {
  id: string
  name: string
  amount: number | string
  due_day: number
  category: string
  reminders_enabled: boolean
  reminder_days_before: number
  recurring_type?: 'monthly' | 'one_time' | null
  recurring_months?: number | null
  start_month?: string | null
}

export default function EditBillForm({
  bill,
  action,
}: {
  bill: Bill
  action: (formData: FormData) => void | Promise<void>
}) {
  const [recurringType, setRecurringType] = useState(
    bill.recurring_type ?? 'monthly'
  )
  const [remindersEnabled, setRemindersEnabled] = useState(
    bill.reminders_enabled
  )
  const [billName, setBillName] = useState(bill.name)
  const [category, setCategory] = useState(bill.category || 'Other')

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={bill.id} />

      <div>
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Bill Info
        </h4>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Bill Name
            </label>
            <input
  		name="name"
  		value={billName}
  		onChange={(e) => {
    		const value = e.target.value
    		setBillName(value)
    		setCategory(suggestBillCategory(value))
  		}}
  		className="w-full rounded-xl border p-3"
  		required
		/>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Amount
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              defaultValue={Number(bill.amount)}
              className="w-full rounded-xl border p-3"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Due Day
            </label>
            <input
              name="due_day"
              type="number"
              min="1"
              max="31"
              defaultValue={bill.due_day}
              className="w-full rounded-xl border p-3"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Category
            </label>
            <select
  		name="category"
  		value={category}
  		onChange={(e) => setCategory(e.target.value)}
  		className="w-full rounded-xl border p-3"
		>
              {DEFAULT_BILL_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 xl:col-span-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Custom Category
            </label>
            <input
              name="custom_category"
              placeholder="Optional custom category override"
              className="w-full rounded-xl border p-3"
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Recurrence
        </h4>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Bill Type
            </label>
            <select
              name="recurring_type"
              value={recurringType}
              onChange={(e) =>
				setRecurringType(e.target.value as 'monthly' | 'one_time')
				}
              className="w-full rounded-xl border p-3"
            >
              <option value="monthly">Recurring Monthly</option>
              <option value="one_time">One Time</option>
            </select>
          </div>

          {recurringType === 'monthly' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Repeat for (Months)
              </label>
              <input
                name="recurring_months"
                type="number"
                min="1"
                max="120"
                defaultValue={bill.recurring_months ?? 12}
                className="w-full rounded-xl border p-3"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Start Month
            </label>
            <input
              name="start_month"
              type="date"
              defaultValue={bill.start_month ?? ''}
              className="w-full rounded-xl border p-3"
            />
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Reminders
        </h4>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                name="reminders_enabled"
                type="checkbox"
                checked={remindersEnabled}
                onChange={(e) => setRemindersEnabled(e.target.checked)}
              />
              Enable reminders
            </label>
          </div>

          {remindersEnabled && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Reminder Days Before
              </label>
              <input
                name="reminder_days_before"
                type="number"
                min="0"
                max="30"
                defaultValue={bill.reminder_days_before}
                className="w-full rounded-xl border p-3"
              />
            </div>
          )}

          <div className="flex items-end">
            <button className="w-full rounded-xl bg-blue-600 p-3 text-white">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}