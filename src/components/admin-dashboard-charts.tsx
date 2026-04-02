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

interface ChartData {
  attendanceData: Array<{ month: string; present: number; absent: number }>
  payrollData: Array<{ month: string; amount: number }>
  departmentData: Array<{ name: string; value: number; color: string }>
  loanTrendsData: Array<{ month: string; loans: number; amount: number }>
}

function formatCurrency(value: number) {
  if (value >= 1000000) return `₱${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `₱${(value / 1000).toFixed(0)}K`
  return `₱${value}`
}

// Custom tooltip for payroll
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

// Custom tooltip for loans
function LoansTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-800 dark:text-white mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: entry.fill }} />
          <span className="text-slate-600 dark:text-slate-300">{entry.name}:</span>
          <span className="font-semibold" style={{ color: entry.fill }}>
            {entry.dataKey === "loans" ? entry.value : `₱${Number(entry.value).toLocaleString()}`}
          </span>
        </div>
      ))}
    </div>
  )
}

const LOAN_COLORS = [
  "#f59e0b", "#8b5cf6", "#10b981", "#3b82f6",
  "#ef4444", "#ec4899", "#14b8a6", "#f97316",
]

export function AdminDashboardCharts({ chartData }: { chartData: ChartData }) {
  return (
    <div className="space-y-6">
      {/* Monthly Payroll — Grouped Vertical Bar Chart */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-6 pb-2">
          <h3 className="text-base font-semibold leading-none tracking-tight">Monthly Payroll</h3>
          <p className="text-sm text-muted-foreground mt-1">Payroll expenses over time</p>
        </div>
        <div className="p-6 pt-2 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData.payrollData}
              margin={{ top: 20, right: 12, left: 8, bottom: 4 }}
              barCategoryGap="30%"
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
              <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} iconType="square" iconSize={12} />
              <Bar dataKey="amount" name="Payroll Amount" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="amount"
                  position="top"
                  formatter={(v: number) => (v > 0 ? formatCurrency(v) : "")}
                  style={{ fontSize: 10, fill: "#3b82f6", fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Loan Statistics — Colorful Vertical Bar Chart */}
      <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
        <div className="p-6 pb-2">
          <h3 className="text-base font-semibold leading-none tracking-tight">Loan Statistics</h3>
          <p className="text-sm text-muted-foreground mt-1">Active loans count and total amount per month</p>
        </div>
        <div className="p-6 pt-2 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData.loanTrendsData}
              margin={{ top: 20, right: 12, left: 8, bottom: 4 }}
              barCategoryGap="25%"
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}K`}
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<LoansTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
              <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} iconType="square" iconSize={12} />
              <Bar yAxisId="left" dataKey="loans" name="Loans Count" radius={[4, 4, 0, 0]}>
                {chartData.loanTrendsData.map((_, i) => (
                  <Cell key={i} fill={LOAN_COLORS[i % LOAN_COLORS.length]} />
                ))}
                <LabelList
                  dataKey="loans"
                  position="top"
                  formatter={(v: number) => (v > 0 ? v : "")}
                  style={{ fontSize: 11, fontWeight: 700, fill: "#475569" }}
                />
              </Bar>
              <Bar yAxisId="right" dataKey="amount" name="Total Amount" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                <LabelList
                  dataKey="amount"
                  position="top"
                  formatter={(v: number) => (v > 0 ? formatCurrency(v) : "")}
                  style={{ fontSize: 10, fill: "#8b5cf6", fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
