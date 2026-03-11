'use client'

import {
  LineChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { currency } from '@/lib/utils'

export default function CalendarBalanceChart({
  data,
}: {
  data: Array<{ day: number; balance: number }>
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-3 text-lg font-semibold">Projected Balance This Month</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={(value: number) => currency(Number(value))} />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}