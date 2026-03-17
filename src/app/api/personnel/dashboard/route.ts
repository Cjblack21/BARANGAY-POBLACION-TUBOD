import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateLateDeductionSync, calculateAbsenceDeductionSync, calculateEarnings } from "@/lib/attendance-calculations-sync"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('Dashboard API called')
    const session = await getServerSession(authOptions)
    console.log('Session:', session?.user)

    if (!session || (session.user.role !== 'PERSONNEL' && session.user.role !== 'ADMIN')) {
      console.log('Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    console.log('Fetching data for user:', userId)

    // Determine current period
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    periodEnd.setHours(23, 59, 59, 999)

    // Get user details with personnel type
    console.log('Fetching user from database...')
    const user = await prisma.users.findUnique({
      where: { users_id: userId },
      include: {
        personnel_types: {
          select: {
            name: true,
            basicSalary: true,
            department: true
          }
        }
      }
    })
    console.log('User found:', user ? 'Yes' : 'No')

    if (!user) {
      console.log('User not found in database')
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const basicSalary = user.personnel_types?.basicSalary ? Number(user.personnel_types.basicSalary) : 0
    console.log('Basic salary:', basicSalary)

    // Simplified dashboard - return basic info only
    console.log('Preparing dashboard response...')
    const periodSalary = basicSalary
    const netPay = basicSalary

    console.log('Returning dashboard data')
    // Calculate biweekly salary (basicSalary / 2)
    const biweeklySalary = basicSalary / 2
    
    // Fetch Active Deductions (from `deductions` table linked to `deduction_types`)
    const activeDeductions = await prisma.deductions.findMany({
      where: {
        users_id: userId,
        archivedAt: null
      },
      include: {
        deduction_types: true
      },
      orderBy: { appliedAt: 'desc' }
    })

    // Fetch Active Loans
    const activeLoans = await prisma.loans.findMany({
      where: {
        users_id: userId,
        status: { in: ['APPROVED', 'ACTIVE'] } 
      },
      orderBy: { createdAt: 'desc' }
    })
    
    // Fetch this month's holidays
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const thisMonthHolidays = await prisma.holidays.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      orderBy: { date: 'asc' }
    });

    return NextResponse.json({
      user: {
        users_id: user.users_id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        position: user.personnel_types?.name || 'No position assigned',
        department: user.personnel_types?.department || 'No department assigned',
        basicSalary: basicSalary,
        biweeklySalary: biweeklySalary,
        periodSalary: periodSalary,
        streetAddress: user.streetAddress,
        barangay: user.barangay,
        purok: user.purok,
        zipCode: user.zipCode
      },
      todayStatus: {
        status: 'ABSENT',
        timeIn: null,
        timeOut: null,
        hours: 0
      },
      monthlyAttendance: {
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        lateDays: 0,
        attendanceRate: '0'
      },
      currentPayroll: {
        status: 'PENDING',
        netPay: 0,
        basicSalary: 0,
        deductions: 0,
        releasedAt: null
      },
      nextPayout: {
        date: periodEnd,
        amount: netPay,
        period: `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`
      },
      holidays: thisMonthHolidays.map((h: any) => ({
        name: h.name,
        date: h.date,
        type: h.type
      })),
      deductions: activeDeductions.map((d: any) => ({
        name: d.deduction_types?.name || 'Deduction',
        amount: Number(d.amount),
        appliedAt: d.appliedAt
      })),
      loans: activeLoans.map((l: any) => {
        const loanAmount = Number(l.amount || 0);
        const remainingBalance = Number(l.balance || 0);
        const monthlyPaymentPercent = Number(l.monthlyPaymentPercent || 0);
        
        // Correct calculation from the loans page
        const monthlyPayment = (loanAmount * monthlyPaymentPercent) / 100;
        const biweeklyPayment = monthlyPayment / 2;
        
        return {
          purpose: l.purpose || 'Loan',
          balance: remainingBalance,
          monthlyPayment: monthlyPayment,
          perPayrollPayment: monthlyPayment, // The dashboard uses perPayrollPayment but expects the monthly total for display. Using monthlyPayment keeps the numbers consistent.
          termMonths: Number(l.termMonths || 0)
        };
      })
    })

  } catch (error) {
    console.error('Error fetching personnel dashboard data:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// Function to get current biweekly period
function getCurrentBiweeklyPeriod() {
  const now = new Date()
  const year = now.getFullYear()

  // Find the first Monday of the year
  const firstMonday = new Date(year, 0, 1)
  const dayOfWeek = firstMonday.getDay()
  const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  firstMonday.setDate(firstMonday.getDate() + daysToAdd)

  // Calculate which biweekly period we're in
  const daysSinceFirstMonday = Math.floor((now.getTime() - firstMonday.getTime()) / (1000 * 60 * 60 * 24))
  const biweeklyPeriod = Math.floor(daysSinceFirstMonday / 14)

  // Calculate start and end of current biweekly period
  const periodStart = new Date(firstMonday)
  periodStart.setDate(periodStart.getDate() + (biweeklyPeriod * 14))

  const periodEnd = new Date(periodStart)
  periodEnd.setDate(periodEnd.getDate() + 13)
  periodEnd.setHours(23, 59, 59, 999)

  return { periodStart, periodEnd }
}

// Function to get next biweekly period
function getNextBiweeklyPeriod() {
  const { periodEnd } = getCurrentBiweeklyPeriod()

  const nextPeriodStart = new Date(periodEnd)
  nextPeriodStart.setDate(nextPeriodStart.getDate() + 1)
  nextPeriodStart.setHours(0, 0, 0, 0)

  const nextPeriodEnd = new Date(nextPeriodStart)
  nextPeriodEnd.setDate(nextPeriodEnd.getDate() + 13)
  nextPeriodEnd.setHours(23, 59, 59, 999)

  return { periodStart: nextPeriodStart, periodEnd: nextPeriodEnd }
}
