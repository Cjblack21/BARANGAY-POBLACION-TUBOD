import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format } from "date-fns"

export async function getDashboardStats() {
  const today = new Date()
  const startOfToday = startOfDay(today)
  const endOfToday = endOfDay(today)
  const startOfCurrentMonth = startOfMonth(today)
  const endOfCurrentMonth = endOfMonth(today)

  try {
    // Get total personnel count (users)
    const totalPersonnel = await prisma.users.count({
      where: { isActive: true, role: 'PERSONNEL' }
    })

    // Get monthly payroll (current month)
    const monthlyPayroll = await prisma.payroll_entries.aggregate({
      where: {
        processedAt: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth
        }
      },
      _sum: {
        netPay: true
      }
    })

    // Get archived attendance deductions count (from attendance-deduction page)
    const archivedAttendanceDeductions = await prisma.deductions.count({
      where: {
        archivedAt: { not: null }, // Only archived deductions
        deduction_types: {
          OR: [
            { name: { contains: 'Attendance' } },
            { name: { contains: 'Late' } },
            { name: { contains: 'Absent' } },
            { name: { contains: 'Tardiness' } },
            { name: { contains: 'Early' } }
          ]
        }
      }
    })

    // Get current (non-archived) attendance deductions count
    const currentAttendanceDeductions = await prisma.deductions.count({
      where: {
        archivedAt: null, // Only current deductions
        deduction_types: {
          OR: [
            { name: { contains: 'Attendance' } },
            { name: { contains: 'Late' } },
            { name: { contains: 'Absent' } },
            { name: { contains: 'Tardiness' } },
            { name: { contains: 'Early' } }
          ]
        }
      }
    })

    // Get active loans
    const activeLoans = await prisma.loans.count({
      where: { status: "ACTIVE" }
    })

    const totalLoanAmount = await prisma.loans.aggregate({
      where: { status: "ACTIVE" },
      _sum: { balance: true }
    })

    // Get holidays this month
    const holidaysThisMonth = await prisma.holidays.count({
      where: {
        date: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth
        }
      }
    })

    // Get total deductions this month
    const totalDeductions = await prisma.deductions.aggregate({
      where: {
        appliedAt: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth
        }
      },
      _sum: {
        amount: true
      }
    })

    return {
      totalPersonnel,
      monthlyPayroll: monthlyPayroll._sum.netPay || 0,
      attendanceToday: currentAttendanceDeductions, // Current attendance deductions
      absentToday: archivedAttendanceDeductions, // Archived attendance deductions
      activeLoans,
      totalLoanAmount: totalLoanAmount._sum.balance || 0,
      holidaysThisMonth,
      totalDeductions: totalDeductions._sum.amount || 0,
      pendingLeaves: 0
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return {
      totalPersonnel: 0,
      monthlyPayroll: 0,
      attendanceToday: 0,
      absentToday: 0,
      activeLoans: 0,
      totalLoanAmount: 0,
      holidaysThisMonth: 0,
      totalDeductions: 0,
      pendingLeaves: 0
    }
  }
}

export async function getAttendanceTrends() {
  try {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const attendanceData = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absent
      FROM attendances 
      WHERE date >= ${sixMonthsAgo}
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month
    ` as Array<{ month: string; present: bigint; absent: bigint }>

    return attendanceData.map(item => ({
      month: format(new Date(item.month + '-01'), 'MMM'),
      present: Number(item.present),
      absent: Number(item.absent)
    }))
  } catch (error) {
    console.error("Error fetching attendance trends:", error)
    return []
  }
}

export async function getPayrollTrends() {
  try {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const payrollData = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(processedAt, '%Y-%m') as month,
        SUM(netPay) as amount
      FROM payroll_entries 
      WHERE processedAt >= ${sixMonthsAgo}
      GROUP BY DATE_FORMAT(processedAt, '%Y-%m')
      ORDER BY month
    ` as Array<{ month: string; amount: number }>

    return payrollData.map(item => ({
      month: format(new Date(item.month + '-01'), 'MMM'),
      amount: Number(item.amount)
    }))
  } catch (error) {
    console.error("Error fetching payroll trends:", error)
    return []
  }
}

export async function getDepartmentDistribution() {
  try {
    const departmentData = await prisma.departments.findMany()

    const colors = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

    return departmentData.map((dept, index) => ({
      name: dept.name,
      value: Math.floor(Math.random() * 10) + 1,
      color: colors[index % colors.length]
    }))
  } catch (error) {
    console.error("Error fetching department distribution:", error)
    return []
  }
}

export async function getLoanTrends() {
  try {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const loanData = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(createdAt, '%Y-%m') as month,
        COUNT(*) as loans,
        SUM(amount) as amount
      FROM loans 
      WHERE createdAt >= ${sixMonthsAgo}
      GROUP BY DATE_FORMAT(createdAt, '%Y-%m')
      ORDER BY month
    ` as Array<{ month: string; loans: bigint; amount: number }>

    return loanData.map(item => ({
      month: format(new Date(item.month + '-01'), 'MMM'),
      loans: Number(item.loans),
      amount: Number(item.amount)
    }))
  } catch (error) {
    console.error("Error fetching loan trends:", error)
    return []
  }
}

export async function getCalendarEvents() {
  try {
    const currentMonth = new Date()
    const startOfCurrentMonth = startOfMonth(currentMonth)
    const endOfCurrentMonth = endOfMonth(currentMonth)

    const [holidays, events] = await Promise.all([
      prisma.holidays.findMany({
        where: {
          date: {
            gte: startOfCurrentMonth,
            lte: endOfCurrentMonth
          }
        }
      }),
      prisma.events.findMany({
        where: {
          date: {
            gte: startOfCurrentMonth,
            lte: endOfCurrentMonth
          }
        }
      })
    ])

    return {
      holidays: holidays.map(h => ({
        date: h.date,
        name: h.name,
        type: h.type.toLowerCase(),
        description: h.description
      })),
      events: events.map(e => ({
        date: e.date,
        name: e.title,
        type: e.type.toLowerCase(),
        description: e.description
      }))
    }
  } catch (error) {
    console.error("Error fetching calendar events:", error)
    return { holidays: [], events: [] }
  }
}

