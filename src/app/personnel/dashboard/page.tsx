"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Clock,
  Calendar,
  User,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Home,
  CreditCard
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

type DashboardData = {
  user: {
    name: string
    email: string
    position: string
    department: string
    basicSalary: number
    periodSalary: number
  }
  todayStatus: {
    status: string
    timeIn: string | null
    timeOut: string | null
    hours: number
  }
  monthlyAttendance: {
    totalDays: number
    presentDays: number
    absentDays: number
    lateDays: number
    attendanceRate: string
  }
  currentPayroll: {
    status: string
    netPay: number
    basicSalary: number
    deductions: number
    releasedAt: string | null
  }
  nextPayout: {
    date: string
    amount: number
    period: string
  }
  holidays: {
    name: string
    date: string
    type: string
  }[]
  deductions: Array<{
    name: string
    amount: number
    appliedAt: string
  }>
  loans: Array<{
    purpose: string
    balance: number
    monthlyPayment: number
    perPayrollPayment: number
    termMonths: number
  }>
}

export default function PersonnelDashboard() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    async function loadDashboardData() {
      try {
        const res = await fetch('/api/personnel/dashboard', { cache: 'no-store' })
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
          console.error('Failed to load dashboard data:', errorData)
          console.error('Status:', res.status)
          return
        }
        const payload = await res.json()
        const dashboardData: DashboardData = {
          user: {
            name: payload.user?.name || 'User',
            email: payload.user?.email || 'user@example.com',
            position: payload.user?.position || 'Personnel',
            department: payload.user?.department || 'No department',
            basicSalary: payload.user?.basicSalary || 0,
            periodSalary: payload.user?.periodSalary || 0,
          },
          todayStatus: {
            status: payload.todayStatus?.status || 'ABSENT',
            timeIn: payload.todayStatus?.timeIn || null,
            timeOut: payload.todayStatus?.timeOut || null,
            hours: payload.todayStatus?.hours || 0,
          },
          monthlyAttendance: {
            totalDays: payload.monthlyAttendance?.totalDays || 0,
            presentDays: payload.monthlyAttendance?.presentDays || 0,
            absentDays: payload.monthlyAttendance?.absentDays || 0,
            lateDays: payload.monthlyAttendance?.lateDays || 0,
            attendanceRate: `${payload.monthlyAttendance?.attendanceRate || '0'}`,
          },
          currentPayroll: {
            status: payload.currentPayroll?.status || 'PENDING',
            netPay: payload.currentPayroll?.netPay || 0,
            basicSalary: payload.currentPayroll?.basicSalary || 0,
            deductions: payload.currentPayroll?.deductions || 0,
            releasedAt: payload.currentPayroll?.releasedAt || null,
          },
          nextPayout: {
            date: payload.nextPayout?.date || '',
            amount: payload.nextPayout?.amount || 0,
            period: payload.nextPayout?.period || '',
          },
          holidays: payload.holidays || [],
          deductions: payload.deductions || [],
          loans: payload.loans || [],
        }
        setData(dashboardData)
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-4 pt-6 animate-pulse">
        <div className="space-y-1">
          <div className="h-9 w-48 bg-muted rounded-md" />
          <div className="h-4 w-56 bg-muted/60 rounded" />
        </div>
        <div className="h-4 w-16 bg-muted/40 rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-l-4 border-l-muted bg-card p-4">
              <div className="flex justify-between mb-3">
                <div className="h-3 w-28 bg-muted rounded" />
                <div className="h-4 w-4 bg-muted rounded" />
              </div>
              <div className="h-6 w-20 bg-muted rounded mb-1" />
              <div className="h-3 w-32 bg-muted/60 rounded" />
            </div>
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6 mt-4">
          {[1, 2].map((i) => (
            <div key={i}>
              <div className="h-6 w-36 bg-muted rounded mb-4" />
              <div className="flex flex-col gap-3">
                {[1, 2].map((j) => (
                  <div key={j} className="rounded-xl border border-l-4 border-l-muted bg-card p-4">
                    <div className="h-16 bg-muted/20 rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 space-y-6 p-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Error</h2>
            <p className="text-muted-foreground">Failed to load dashboard data</p>
          </div>
        </div>
      </div>
    )
  }


  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Home className="h-8 w-8 text-blue-600" />
            Dashboard
          </h2>
          <p className="text-muted-foreground">Welcome back, {data.user.name}!</p>
        </div>
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-2">OVERVIEW</p>
      </div>
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Today's Status Removed */}

        {/* Attendance This Month */}
        <Card
          className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-all duration-150 hover:scale-[1.01]"
          onClick={() => router.push('/personnel/attendance')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
            <CardTitle className="text-xs font-medium">Attendance This Month</CardTitle>
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold">{data.monthlyAttendance.attendanceRate}%</div>
            <div className="text-sm text-muted-foreground">
              {data.monthlyAttendance.presentDays} / {data.monthlyAttendance.totalDays} days
            </div>
          </CardContent>
        </Card>

        {/* Position */}
        <Card
          className="border-l-4 border-l-green-500 cursor-pointer hover:shadow-md transition-all duration-150 hover:scale-[1.01]"
          onClick={() => router.push('/personnel/profile')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
            <CardTitle className="text-xs font-medium">Position & BLGU</CardTitle>
            <User className="h-3.5 w-3.5 text-green-600" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold">{data.user.position}</div>
            <div className="text-sm text-muted-foreground">
              BLGU: {data.user.department}
            </div>
            <div className="text-sm text-muted-foreground">
              Monthly Salary: ₱{data.user.basicSalary.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Current Salary */}
        <Card
          className="border-l-4 border-l-orange-500 cursor-pointer hover:shadow-md transition-all duration-150 hover:scale-[1.01]"
          onClick={() => router.push('/personnel/payroll')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
            <CardTitle className="text-xs font-medium">Current Period Salary</CardTitle>
            <div className="text-base font-bold text-orange-600">₱</div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold">₱{data.currentPayroll.netPay.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">
              Status: <Badge
                className={
                  data.currentPayroll.status === 'RELEASED'
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : data.currentPayroll.status === 'PENDING'
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-300'
                }
              >
                {data.currentPayroll.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* This Month's Holidays */}
        <Card
          className="border-l-4 border-l-purple-500 cursor-pointer hover:shadow-md transition-all duration-150 hover:scale-[1.01]"
          onClick={() => router.push('/personnel/holidays')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
            <CardTitle className="text-xs font-medium">Holidays This Month</CardTitle>
            <Calendar className="h-3.5 w-3.5 text-purple-600" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            {(data.holidays?.length ?? 0) > 0 ? (
              <div className="space-y-2 mt-2">
                {data.holidays!.slice(0, 2).map((holiday, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="font-medium truncate pr-2">{holiday.name}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(holiday.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
                {(data.holidays?.length ?? 0) > 2 && (
                  <div className="text-xs text-purple-600 pt-1">+{(data.holidays!.length) - 2} more</div>
                )}
              </div>
            ) : (
              <div className="flex flex-col justify-center h-full min-h-[48px]">
                <div className="text-xl font-bold">0</div>
                <div className="text-sm text-muted-foreground">No holidays this month</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-8">
        {/* Active Loans Section */}
        <div>
          <h3 className="text-lg font-bold tracking-tight flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Active Loans
          </h3>
          
          {(data.loans?.length ?? 0) > 0 ? (
            <div className="flex flex-col gap-4">
              {data.loans!.map((loan, index) => (
                <Card 
                  key={index} 
                  className="border-l-4 border-l-blue-500 hover:shadow-md transition-all duration-150 hover:scale-[1.01] cursor-pointer"
                  onClick={() => router.push('/personnel/loans')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
                    <CardTitle className="text-xs font-medium truncate pr-2 w-full" title={loan.purpose}>{loan.purpose}</CardTitle>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-2 py-0.5 h-5 flex-shrink-0">
                    {loan.termMonths} {loan.termMonths === 1 ? 'month' : 'months'} left
                  </Badge>
                </CardHeader>
                  <CardContent className="px-4 pb-3 pt-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Remaining</div>
                        <div className="text-sm font-bold text-red-600">₱{loan.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Per Payroll</div>
                        <div className="text-sm font-bold text-blue-600">₱{loan.perPayrollPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-l-4 border-l-blue-500 opacity-70">
              <CardContent className="flex items-center justify-center p-6 min-h-[100px]">
                <div className="text-sm font-medium text-muted-foreground">No active loans</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Active Deductions Section */}
        <div>
          <h3 className="text-lg font-bold tracking-tight flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-red-600" />
            Active Deductions
          </h3>
          
          {(data.deductions?.length ?? 0) > 0 ? (
            <div className="flex flex-col gap-4">
              {data.deductions!.map((deduction, index) => (
                <Card 
                  key={index} 
                  className="border-l-4 border-l-red-500 hover:shadow-md transition-all duration-150 hover:scale-[1.01] cursor-pointer"
                  onClick={() => router.push('/personnel/deductions')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
                    <CardTitle className="text-xs font-medium truncate w-full" title={deduction.name}>{deduction.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3 pt-2">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Applied</div>
                        <div className="text-xs font-medium text-muted-foreground">
                          {new Date(deduction.appliedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Amount</div>
                        <div className="text-sm font-bold text-red-600">₱{deduction.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-l-4 border-l-red-500 opacity-70">
              <CardContent className="flex items-center justify-center p-6 min-h-[100px]">
                <div className="text-sm font-medium text-muted-foreground">No active deductions</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
