"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface ChartData {
  attendanceData: Array<{ month: string; present: number; absent: number }>
  payrollData: Array<{ month: string; amount: number }>
  departmentData: Array<{ name: string; value: number; color: string }>
  loanTrendsData: Array<{ month: string; loans: number; amount: number }>
}

export function AdminDashboardCharts({ chartData }: { chartData: ChartData }) {
  return (
    <div className="space-y-6">
      {/* Payroll Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Payroll</CardTitle>
          <CardDescription>Payroll expenses over time</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.payrollData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(value) => {
                  if (value >= 1000000) return `₱${(value / 1000000).toFixed(1)}M`
                  if (value >= 1000) return `₱${(value / 1000).toFixed(0)}K`
                  return `₱${value}`
                }}
              />
              <Tooltip
                formatter={(value) => [`₱${Number(value).toLocaleString()}`, "Amount"]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="amount"
                name="Payroll Amount"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Loan Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Statistics</CardTitle>
          <CardDescription>Active loans count and total amount</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.loanTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                formatter={(value, name) => [
                  name === "loans" ? value : `₱${Number(value).toLocaleString()}`,
                  name === "loans" ? "Loans Count" : "Total Amount"
                ]}
              />
              <Bar yAxisId="left" dataKey="loans" fill="#f59e0b" />
              <Bar yAxisId="right" dataKey="amount" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
