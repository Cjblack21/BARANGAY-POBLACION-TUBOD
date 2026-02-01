import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, format } from "date-fns"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get('month') || '1')
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())

    // Validate month and year
    if (month < 1 || month > 12) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
    }

    if (year < 2020 || year > 2030) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }

    // Create date range for the selected month
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = endOfMonth(monthStart)

    console.log(`Generating monthly report for ${format(monthStart, 'MMMM yyyy')}`)

    // Get all active personnel
    const users = await prisma.users.findMany({
      where: { 
        isActive: true, 
        role: 'PERSONNEL' 
      },
      include: {
        personnel_types: {
          select: {
            name: true,
            type: true,
            department: true,
            basicSalary: true
          }
        }
      }
    })

    const userIds = users.map(u => u.users_id)

    // Get payroll entries for the month (using periodStart/periodEnd)
    const payrollEntries = await prisma.payroll_entries.findMany({
      where: {
        users_id: { in: userIds },
        OR: [
          {
            periodStart: {
              gte: monthStart,
              lte: monthEnd
            }
          },
          {
            periodEnd: {
              gte: monthStart,
              lte: monthEnd
            }
          }
        ]
      },
      include: {
        users: {
          select: {
            name: true,
            email: true,
            personnel_types: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    // Get deductions for the month
    const deductions = await prisma.deductions.findMany({
      where: {
        users_id: { in: userIds },
        appliedAt: {
          gte: monthStart,
          lte: monthEnd
        }
      },
      include: {
        deduction_types: true
      }
    })

    // Get loans for the month
    const loans = await prisma.loans.findMany({
      where: {
        users_id: { in: userIds },
        status: 'ACTIVE',
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart }
      }
    })

    // Get attendance for the month
    const attendance = await prisma.attendances.findMany({
      where: {
        users_id: { in: userIds },
        date: {
          gte: monthStart,
          lte: monthEnd
        }
      }
    })

    // Calculate summary statistics
    const totalEmployees = users.length
    const totalPayroll = payrollEntries.reduce((sum, entry) => sum + Number(entry.netPay), 0)
    const totalDeductions = deductions.reduce((sum, deduction) => sum + Number(deduction.amount), 0)
    
    // Calculate loan payments for the month
    const totalLoans = loans.reduce((sum, loan) => {
      const monthlyPayment = (Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100
      return sum + monthlyPayment
    }, 0)

    const averageSalary = totalEmployees > 0 ? totalPayroll / totalEmployees : 0

    // Calculate attendance rate
    const attendanceByUser = new Map()
    attendance.forEach(record => {
      const userId = record.users_id
      if (!attendanceByUser.has(userId)) {
        attendanceByUser.set(userId, { present: 0, total: 0 })
      }
      const userAttendance = attendanceByUser.get(userId)
      userAttendance.total++
      if (record.status === 'PRESENT') {
        userAttendance.present++
      }
    })

    const totalAttendanceDays = Array.from(attendanceByUser.values()).reduce((sum, user) => sum + user.present, 0)
    const totalPossibleDays = Array.from(attendanceByUser.values()).reduce((sum, user) => sum + user.total, 0)
    const attendanceRate = totalPossibleDays > 0 ? (totalAttendanceDays / totalPossibleDays) * 100 : 0

    // Create detailed payroll summary
    const payrollSummary = users.map(user => {
      const userPayroll = payrollEntries.filter(entry => entry.users_id === user.users_id)
      const userDeductions = deductions.filter(deduction => deduction.users_id === user.users_id)
      const userLoans = loans.filter(loan => loan.users_id === user.users_id)
      const userAttendance = attendanceByUser.get(user.users_id) || { present: 0, total: 0 }

      const totalUserDeductions = userDeductions.reduce((sum, deduction) => sum + Number(deduction.amount), 0)
      const totalUserLoans = userLoans.reduce((sum, loan) => {
        const monthlyPayment = (Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100
        return sum + monthlyPayment
      }, 0)

      const netPay = userPayroll.reduce((sum, entry) => sum + Number(entry.netPay), 0)
      const basicSalary = user.personnel_types?.basicSalary ? Number(user.personnel_types.basicSalary) : 0
      const userAttendanceRate = userAttendance.total > 0 ? (userAttendance.present / userAttendance.total) * 100 : 0

      return {
        users_id: user.users_id,
        name: user.name,
        email: user.email,
        position: user.personnel_types?.name || 'No Position',
        personnelType: user.personnel_types?.name || 'No Type',
        department: user.personnel_types?.department || 'No Department',
        basicSalary,
        totalDeductions: totalUserDeductions,
        totalLoans: totalUserLoans,
        netPay,
        attendanceDays: userAttendance.present,
        totalDays: userAttendance.total,
        attendanceRate: userAttendanceRate
      }
    })

    const summary = {
      month: format(monthStart, 'MMMM'),
      year,
      totalEmployees,
      totalPayroll,
      totalDeductions,
      totalLoans,
      averageSalary,
      attendanceRate,
      payrollEntries: payrollEntries.length
    }

    console.log('Monthly report generated:', {
      month: summary.month,
      year: summary.year,
      totalEmployees: summary.totalEmployees,
      totalPayroll: summary.totalPayroll,
      attendanceRate: summary.attendanceRate
    })

    return NextResponse.json({
      summary,
      payrollSummary
    })

  } catch (error) {
    console.error('Error generating monthly report:', error)
    return NextResponse.json({
      error: 'Failed to generate monthly report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}










