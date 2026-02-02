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
      <div className="flex-1 space-y-6 p-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Loading...</h2>
          </div>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Today's Status Removed */}

        {/* Attendance This Month */}
        <Card
          className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
          onClick={() => router.push('/personnel/attendance')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold">Attendance This Month</CardTitle>
            <Calendar className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Attendance Rate</span>
                <span className="text-2xl font-bold text-blue-600">{data.monthlyAttendance.attendanceRate}%</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs">Present</span>
                  </div>
                  <span className="text-sm font-semibold">{data.monthlyAttendance.presentDays} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-xs">Absent</span>
                  </div>
                  <span className="text-sm font-semibold">{data.monthlyAttendance.absentDays} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs">Late</span>
                  </div>
                  <span className="text-sm font-semibold">{data.monthlyAttendance.lateDays} days</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Position */}
        <Card
          className="border-l-4 border-l-purple-500 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
          onClick={() => router.push('/personnel/profile')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
            <CardTitle className="text-xs font-medium">Position & BLGU</CardTitle>
            <User className="h-3.5 w-3.5 text-purple-600" />
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold">{data.user.position}</div>
            <div className="text-xs text-muted-foreground">
              BLGU: {data.user.department}
            </div>
            <div className="text-xs text-muted-foreground">
              Monthly Salary: ₱{data.user.basicSalary.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Current Salary */}
        <Card
          className="border-l-4 border-l-orange-500 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
          onClick={() => router.push('/personnel/payslips')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
            <CardTitle className="text-xs font-medium">Current Period Salary</CardTitle>
            <div className="text-base font-bold text-orange-600">₱</div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="text-xl font-bold">₱{data.currentPayroll.netPay.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">
              Status: <Badge variant={data.currentPayroll.status === 'RELEASED' ? 'default' : 'secondary'}>
                {data.currentPayroll.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Loans */}
      <Card
        className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
        onClick={() => router.push('/personnel/loans')}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Active Loans
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(data.loans?.length ?? 0) > 0 ? (
            <div className="space-y-2">
              {data.loans!.map((loan, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{loan.purpose}</div>
                    <div className="text-sm text-muted-foreground">
                      {loan.termMonths} months remaining
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₱{loan.perPayrollPayment.toLocaleString()}/payroll</div>
                    <div className="text-sm text-muted-foreground">
                      Balance: ₱{loan.balance.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No active loans</div>
          )}
        </CardContent>
      </Card>

      {/* Active Deductions */}
      <Card
        className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
        onClick={() => router.push('/personnel/deductions')}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Active Deductions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(data.deductions?.length ?? 0) > 0 ? (
            <div className="space-y-2">
              {data.deductions!.map((deduction, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{deduction.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Applied: {new Date(deduction.appliedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-600">₱{deduction.amount.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground">No active deductions</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

