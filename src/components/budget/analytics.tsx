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
} from 'recharts'

export default function AnalyticsCharts({
  cashFlowData,
  categoryData,
  accountData,
}: {
  cashFlowData: Array<{
    day: number
    income: number
    due: number
    paid: number
    balance: number
  }>
  categoryData: Array<{ name: string; value: number }>
  accountData?: Array<{ name: string; balance: number }>
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-72 rounded-2xl border bg-white p-4 xl:col-span-2">
          <p className="mb-3 text-sm font-medium">Projected Balance by Day</p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="balance" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="h-72 rounded-2xl border bg-white p-4">
          <p className="mb-3 text-sm font-medium">Category Breakdown</p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={90} label>
                {categoryData.map((_, index) => (
                  <Cell key={index} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-80 rounded-2xl border bg-white p-4">
          <p className="mb-3 text-sm font-medium">Income vs Due vs Paid</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="income" radius={[8, 8, 0, 0]} />
              <Bar dataKey="due" radius={[8, 8, 0, 0]} />
              <Bar dataKey="paid" radius={[8, 8, 0, 0]} />
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
              Utilities, Food, Debt, and more.
            </div>
            <div>
              Paid/unpaid bill status changes your projected running balance for
              the month.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}