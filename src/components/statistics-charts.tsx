"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
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
  if (value >= 1000000) return `₱${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `₱${(value / 1000).toFixed(0)}k`
  return `₱${value}`
}

// Custom tooltip for payroll trend
function PayrollTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-800 dark:text-white mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: entry.fill }} />
          <span className="text-slate-600 dark:text-slate-300">{entry.name}:</span>
          <span className="font-semibold" style={{ color: entry.fill }}>
            ₱{Number(entry.value).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

export function PayrollTrendChart({ data }: { data: PayrollTrendEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
        margin={{ top: 24, right: 16, left: 8, bottom: 4 }}
        barCategoryGap="25%"
        barGap={3}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCurrency}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<PayrollTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Legend
          wrapperStyle={{ fontSize: 13, paddingTop: 12 }}
          iconType="square"
          iconSize={12}
        />
        <Bar dataKey="grossPay" name="Gross Pay" fill="#3b82f6" radius={[4, 4, 0, 0]}>
          <LabelList
            dataKey="grossPay"
            position="top"
            formatter={(v: number) => (v > 0 ? formatCurrency(v) : "")}
            style={{ fontSize: 10, fill: "#3b82f6", fontWeight: 600 }}
          />
        </Bar>
        <Bar dataKey="netPay" name="Net Pay" fill="#22c55e" radius={[4, 4, 0, 0]}>
          <LabelList
            dataKey="netPay"
            position="top"
            formatter={(v: number) => (v > 0 ? formatCurrency(v) : "")}
            style={{ fontSize: 10, fill: "#22c55e", fontWeight: 600 }}
          />
        </Bar>
        <Bar dataKey="deductions" name="Deductions" fill="#ef4444" radius={[4, 4, 0, 0]}>
          <LabelList
            dataKey="deductions"
            position="top"
            formatter={(v: number) => (v > 0 ? formatCurrency(v) : "")}
            style={{ fontSize: 10, fill: "#ef4444", fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// Distinct colors for each deduction type bar
const BAR_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444",
  "#3b82f6", "#ec4899", "#14b8a6", "#f97316",
]

export function DeductionBreakdownChart({ data }: { data: DeductionEntry[] }) {
  const sliced = data.slice(0, 8)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={sliced}
        margin={{ top: 20, right: 16, left: 8, bottom: 40 }}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis
          dataKey="typeName"
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          angle={-30}
          textAnchor="end"
          interval={0}
        />
        <YAxis
          tickFormatter={formatCurrency}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
          width={58}
        />
        <Tooltip
          formatter={(v: number) => [`₱${Number(v).toLocaleString()}`, "Total Amount"]}
          cursor={{ fill: "rgba(0,0,0,0.04)" }}
        />
        <Bar dataKey="totalAmount" name="Total Amount" radius={[4, 4, 0, 0]}>
          {sliced.map((_, index) => (
            <Cell key={index} fill={BAR_COLORS[index % BAR_COLORS.length]} />
          ))}
          <LabelList
            dataKey="totalAmount"
            position="top"
            formatter={(v: number) => (v > 0 ? formatCurrency(v) : "")}
            style={{ fontSize: 10, fontWeight: 600, fill: "#475569" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
