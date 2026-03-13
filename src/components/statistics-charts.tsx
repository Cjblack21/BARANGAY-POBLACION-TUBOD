"use client"

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

type PayrollTrendEntry = {
  month: string
  grossPay: number
  deductions: number
  netPay: number
  entries: number
}

type DeductionEntry = {
  typeName: string
  totalAmount: number
  count: number
}

function formatCurrency(value: number) {
  return `₱${value.toLocaleString()}`
}

export function PayrollTrendChart({ data }: { data: PayrollTrendEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="colorDeductions" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => formatCurrency(v)} />
        <Legend />
        <Area
          type="monotone"
          dataKey="grossPay"
          name="Gross Pay"
          stroke="#3b82f6"
          fill="url(#colorGross)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="netPay"
          name="Net Pay"
          stroke="#22c55e"
          fill="url(#colorNet)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="deductions"
          name="Deductions"
          stroke="#ef4444"
          fill="url(#colorDeductions)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function DeductionBreakdownChart({ data }: { data: DeductionEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart
        data={data.slice(0, 8)}
        layout="vertical"
        margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
        <XAxis type="number" tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="typeName" width={130} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => formatCurrency(v)} />
        <Bar dataKey="totalAmount" name="Total Amount" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
