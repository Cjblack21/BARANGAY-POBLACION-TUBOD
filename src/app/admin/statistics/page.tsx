import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  Wallet,
  Banknote,
  TrendingDown,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getDashboardStats } from "@/lib/dashboard-data"
import {
  getStaffBreakdown,
  getDeductionBreakdown,
  getLoansSummary,
  getMonthlyPayrollTrend,
} from "@/lib/statistics-data"
import {
  PayrollTrendChart,
  DeductionBreakdownChart,
} from "@/components/statistics-charts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default async function StatisticsPage() {
  await getServerSession(authOptions)

  const [dashStats, staff, deductions, loansSummary, payrollTrend] =
    await Promise.all([
      getDashboardStats(),
      getStaffBreakdown(),
      getDeductionBreakdown(),
      getLoansSummary(),
      getMonthlyPayrollTrend(),
    ])

  const kpiCards = [
    {
      title: "Total Active Staff",
      value: dashStats.totalPersonnel.toString(),
      description: "Personnel currently active",
      icon: Users,
      color: "text-blue-600",
      border: "border-l-blue-500",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      title: "Monthly Payroll",
      value: `₱${Math.round(Number(dashStats.monthlyPayroll)).toLocaleString()}`,
      description: "Net pay disbursed this month",
      icon: Wallet,
      color: "text-green-600",
      border: "border-l-green-500",
      bg: "bg-green-50 dark:bg-green-950/30",
    },
    {
      title: "Total Deductions",
      value: `₱${Math.round(Number(dashStats.totalDeductions)).toLocaleString()}`,
      description: "All deductions this month",
      icon: TrendingDown,
      color: "text-red-600",
      border: "border-l-red-500",
      bg: "bg-red-50 dark:bg-red-950/30",
    },
    {
      title: "Active Loans",
      value: loansSummary.active.count.toString(),
      description: `₱${loansSummary.active.balance.toLocaleString()} outstanding balance`,
      icon: Banknote,
      color: "text-orange-600",
      border: "border-l-orange-500",
      bg: "bg-orange-50 dark:bg-orange-950/30",
    },
  ]

  return (
    <div className="flex-1 space-y-8 p-4 pt-6">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-blue-600" />
          Statistics
        </h1>
        <p className="text-muted-foreground text-sm">
          Detailed analytics across payroll, staff, deductions, and loans.
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon
          return (
            <Card
              key={card.title}
              className={`border-l-4 ${card.border} hover:shadow-md transition-all duration-200 hover:scale-[1.01]`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`rounded-full p-1.5 ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Payroll Trend & Loans Summary */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* 6-Month Payroll Trend Chart */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-blue-600" />
              6-Month Payroll Trend
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Gross pay, net pay, and deductions over the last 6 months
            </p>
          </CardHeader>
          <CardContent>
            {payrollTrend.length > 0 ? (
              <PayrollTrendChart data={payrollTrend} />
            ) : (
              <div className="flex items-center justify-center h-56 text-muted-foreground text-sm">
                No payroll data available yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loans Summary */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-4 w-4 text-orange-600" />
              Loans Overview
            </CardTitle>
            <p className="text-xs text-muted-foreground">Current status breakdown</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Completed</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-700">{loansSummary.completed.count}</div>
                <div className="text-xs text-muted-foreground">
                  ₱{loansSummary.completed.totalAmount.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Active</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-blue-700">{loansSummary.active.count}</div>
                <div className="text-xs text-muted-foreground">
                  ₱{loansSummary.active.balance.toLocaleString()} balance
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Pending</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-yellow-700">{loansSummary.pending.count}</div>
                <div className="text-xs text-muted-foreground">
                  ₱{loansSummary.pending.totalAmount.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Outstanding Balance</span>
                <span className="font-bold text-orange-600">
                  ₱{loansSummary.active.balance.toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deduction Breakdown Chart */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-purple-600" />
              Deductions by Type
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Current month — top deduction categories by amount
            </p>
          </CardHeader>
          <CardContent>
            {deductions.length > 0 ? (
              <DeductionBreakdownChart data={deductions} />
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No deduction data this month.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deduction breakdown table */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Deduction Summary Table
            </CardTitle>
            <p className="text-xs text-muted-foreground">Current month breakdown by type</p>
          </CardHeader>
          <CardContent>
            {deductions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead>Deduction Type</TableHead>
                    <TableHead className="text-center">Count</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductions.map((d) => (
                    <TableRow key={d.typeName} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{d.typeName}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{d.count}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        ₱{d.totalAmount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No deductions recorded this month.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Staff Breakdown Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-blue-600" />
            Staff Salary Breakdown
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            All active personnel — basic salary and latest net pay
          </p>
        </CardHeader>
        <CardContent>
          {staff.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Name</TableHead>
                  <TableHead>Personnel Type</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Basic Salary</TableHead>
                  <TableHead className="text-right">Latest Net Pay</TableHead>
                  <TableHead className="text-center">Last Payroll</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => (
                  <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.position}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.department}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₱{s.basicSalary.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {s.latestNetPay !== null
                        ? `₱${s.latestNetPay.toLocaleString()}`
                        : <span className="text-muted-foreground font-normal text-xs">No payroll yet</span>}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {s.lastPayrollDate
                        ? new Date(s.lastPayrollDate).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No active staff found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
