'use client'

import {
  BarChart,
  Bar,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import { currency } from '@/lib/utils'

type CashFlowPoint = {
  day: number
  income: number
  due: number
  paid: number
  balance: number
}

type CategoryPoint = {
  name: string
  value: number
}

type AccountPoint = {
  name: string
  balance: number
}

const PIE_COLORS = [
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#ea580c',
  '#4f46e5',
  '#65a30d',
  '#db2777',
  '#0f766e',
  '#9333ea',
]

function shortCurrency(value: number) {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`
  }
  return `$${value}`
}

export default function AnalyticsCharts({
  cashFlowData,
  categoryData,
  accountData = [],
}: {
  cashFlowData: CashFlowPoint[]
  categoryData: CategoryPoint[]
  accountData?: AccountPoint[]
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-80 rounded-2xl border bg-white p-4 xl:col-span-2">
          <p className="mb-3 text-sm font-medium">Projected Balance by Day</p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cashFlowData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis tickFormatter={(value) => shortCurrency(Number(value))} />
              <Tooltip formatter={(value: number) => currency(Number(value))} />
              <Legend verticalAlign="bottom" height={36} />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 3 }}
                name="Projected Balance"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="h-80 rounded-2xl border bg-white p-4">
          <p className="mb-3 text-sm font-medium">Category Breakdown</p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label={({ value }) => currency(Number(value))}
              >
                {categoryData.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => currency(Number(value))} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-80 rounded-2xl border bg-white p-4">
          <p className="mb-3 text-sm font-medium">Income vs Due vs Paid</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlowData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis tickFormatter={(value) => shortCurrency(Number(value))} />
              <Tooltip formatter={(value: number) => currency(Number(value))} />
              <Legend verticalAlign="bottom" height={36} />
              <Bar dataKey="income" fill="#16a34a" radius={[8, 8, 0, 0]} name="Income" />
              <Bar dataKey="due" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Due" />
              <Bar dataKey="paid" fill="#2563eb" radius={[8, 8, 0, 0]} name="Paid" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <p className="mb-3 text-sm font-medium">Analytics Notes</p>
          <div className="space-y-3 text-sm text-slate-600">
            <div>
              This view tracks monthly income, total bills due, bills paid,
              unpaid amount, and projected month-end balance.
            </div>
            <div>
              Category breakdown is based on your bill categories like Housing,
              Utilities, Food, Debt, and any custom categories you add.
            </div>
            <div>
              Paid/unpaid bill status changes your projected running balance for
              the month.
            </div>
            {accountData.length > 0 && (
              <div>
                Account-level balance data is available, but currently optional.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}