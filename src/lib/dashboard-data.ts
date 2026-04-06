import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, startOfDay, endOfDay, format } from "date-fns"

export async function getDashboardStats(month?: number, year?: number) {
  const today = new Date()
  let targetMonth = today;
  if (month !== undefined && year !== undefined) {
    targetMonth = new Date(year, month - 1, 15);
  }
  
  const startOfToday = startOfDay(today)
  const endOfToday = endOfDay(today)
  const startOfCurrentMonth = startOfMonth(targetMonth)
  const endOfCurrentMonth = endOfMonth(targetMonth)

  try {
    // Run all queries in parallel for maximum performance
    const [
      totalPersonnel,
      officialsCount,
      staffCount,
      monthlyPayroll,
      archivedAttendanceDeductions,
      currentAttendanceDeductions,
      activeLoans,
      totalLoanAmount,
      holidaysThisMonth,
      totalDeductions,
    ] = await Promise.all([
      // Total personnel count
      prisma.users.count({
        where: { isActive: true, role: 'PERSONNEL' }
      }),
      // Officials count
      prisma.users.count({
        where: {
          isActive: true,
          role: 'PERSONNEL',
          personnel_types: { department: 'Barangay Officials' }
        }
      }),
      // Staff count
      prisma.users.count({
        where: {
          isActive: true,
          role: 'PERSONNEL',
          personnel_types: { department: 'Barangay Staff' }
        }
      }),
      // Monthly payroll (current month)
      prisma.payroll_entries.aggregate({
        where: {
          processedAt: { gte: startOfCurrentMonth, lte: endOfCurrentMonth }
        },
        _sum: { netPay: true }
      }),
      // Archived attendance deductions
      prisma.deductions.count({
        where: {
          archivedAt: { not: null },
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
      }),
      // Current (non-archived) attendance deductions
      prisma.deductions.count({
        where: {
          archivedAt: null,
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
      }),
      // Active loans count
      prisma.loans.count({ where: { status: "ACTIVE" } }),
      // Total loan amount
      prisma.loans.aggregate({
        where: { status: "ACTIVE" },
        _sum: { balance: true }
      }),
      // Holidays this month
      prisma.holidays.count({
        where: {
          date: { gte: startOfCurrentMonth, lte: endOfCurrentMonth }
        }
      }),
      // Total deductions this month
      prisma.deductions.aggregate({
        where: {
          appliedAt: { gte: startOfCurrentMonth, lte: endOfCurrentMonth }
        },
        _sum: { amount: true }
      }),
    ])

    return {
      totalPersonnel,
      officialsCount,
      staffCount,
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
      officialsCount: 0,
      staffCount: 0,
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
        TO_CHAR("date", 'YYYY-MM') as month,
        SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absent
      FROM attendances 
      WHERE "date" >= ${sixMonthsAgo}
      GROUP BY TO_CHAR("date", 'YYYY-MM')
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
        TO_CHAR("processedAt", 'YYYY-MM') as month,
        SUM("netPay") as amount
      FROM payroll_entries 
      WHERE "processedAt" >= ${sixMonthsAgo}
      GROUP BY TO_CHAR("processedAt", 'YYYY-MM')
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
        TO_CHAR("createdAt", 'YYYY-MM') as month,
        COUNT(*) as loans,
        SUM("amount") as amount
      FROM loans 
      WHERE "createdAt" >= ${sixMonthsAgo}
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
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

