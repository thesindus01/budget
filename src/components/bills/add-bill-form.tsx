'use client'

import { useState } from 'react'
import { DEFAULT_BILL_CATEGORIES } from '@/lib/utils'
import { suggestBillCategory } from '@/lib/bill-categorizer'

export default function AddBillForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>
}) {
  const [recurringType, setRecurringType] = useState('monthly')
  const [remindersEnabled, setRemindersEnabled] = useState(true)
  const [billName, setBillName] = useState('')
  const [category, setCategory] = useState('Other')

  return (
    <form action={action} className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Bill Info
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Bill Name
            </label>
            <input
  		name="name"
  		placeholder="e.g. Mortgage"
  		className="w-full rounded-xl border p-3"
  		value={billName}
  		onChange={(e) => {
    		const value = e.target.value
    		setBillName(value)
    		setCategory(suggestBillCategory(value))
  		}}
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
              placeholder="e.g. 1385"
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
              placeholder="1-31"
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
  		className="w-full rounded-xl border p-3"
  		value={category}
  		onChange={(e) => setCategory(e.target.value)}
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
              placeholder="Optional custom category"
              className="w-full rounded-xl border p-3"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Recurrence
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Bill Type
            </label>
            <select
              name="recurring_type"
              className="w-full rounded-xl border p-3"
              value={recurringType}
              onChange={(e) => setRecurringType(e.target.value)}
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
                defaultValue="12"
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
              className="w-full rounded-xl border p-3"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Reminders
        </h3>

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
                defaultValue="3"
                className="w-full rounded-xl border p-3"
              />
            </div>
          )}

          <div className="flex items-end">
            <button className="w-full rounded-xl bg-slate-900 p-3 text-white">
              Add Bill
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}