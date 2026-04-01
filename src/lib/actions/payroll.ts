'use server'

import { prisma } from "@/lib/prisma"
import {
  parsePhilippinesLocalDate,
  getNowInPhilippines,
  getTodayRangeInPhilippines,
  calculateWorkingDaysInPhilippines,
  calculatePeriodDurationInPhilippines,
  generateWorkingDaysInPhilippines,
  toPhilippinesDateString,
  getPhilippinesDayOfWeek
} from '@/lib/timezone'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { startOfDay, endOfDay, startOfMonth, endOfMonth, addDays, subDays } from "date-fns"
import { revalidatePath } from "next/cache"
// Attendance-related imports removed - attendance system no longer in use

// Types
export type PayrollSummary = {
  periodStart: string
  periodEnd: string
  totalEmployees: number
  totalGrossSalary: number
  totalDeductions: number
  totalNetSalary: number
  payrollEntries: PayrollEntry[]
  hasGenerated: boolean
  hasReleased: boolean
}


export type PayrollEntry = {
  users_id: string
  name: string | null
  email: string
  avatar?: string | null
  personnelType: {
    name: string
    basicSalary: number
  } | null
  grossSalary: number
  totalDeductions: number
  totalAdditions: number
  netSalary: number
  finalNetPay: number
  breakdown?: {
    basicSalary: number
    overloadPay: number
    totalDeductions: number
  }
  status: 'Pending' | 'Released' | 'Archived'
  deductionDetails: DeductionDetail[]
  loanPayments: number
  databaseDeductions: number
}


export type DeductionDetail = {
  id: string
  amount: number
  type: string
  description: string | null
  appliedAt: string
  notes: string | null
}

export type AttendanceRecord = {
  date: string
  timeIn: string | null
  timeOut: string | null
  status: string
  workHours: number
  earnings: number
  deductions: number
}

export type PayrollSchedule = {
  periodStart: string
  periodEnd: string
  totalEmployees: number
  totalGrossSalary: number
  totalDeductions: number
  totalNetSalary: number
  payrollEntries: PayrollEntry[]
}

// Server Action: Get Payroll Summary
export async function getPayrollSummary(): Promise<{
  success: boolean
  summary?: PayrollSummary
  error?: string
}> {
  try {
    console.log('🔍 Payroll Summary - Starting function execution')
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    // Debug: Check what deduction types exist in the database (no auto-creation)
    // const allDeductionTypes = await prisma.deductions_types.findMany()
    // console.log('🔍 All Deduction Types in Database:', allDeductionTypes.map(dt => `${dt.name}: ₱${dt.amount} (Active: ${dt.isActive})`))

    // Use current semi-monthly period as default
    const now = new Date()
    const currentDay = now.getDate()
    let periodStart: Date
    let periodEnd: Date

    // Determine semi-monthly period (1-15 or 16-end of month)
    if (currentDay <= 15) {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      periodEnd = new Date(now.getFullYear(), now.getMonth(), 15)
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 16)
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0) // Last day of month
    }

    console.log(`🔧 Using semi-monthly period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`)

    // Preserve settings period separately for UI logic (Generate button state)
    const settingsPeriodStart = new Date(periodStart)
    const settingsPeriodEnd = new Date(periodEnd)

    // Decide which period to DISPLAY in the summary:
    // - Always show the settings period (what admin configured)
    // - This ensures after release, the UI shows the NEW period ready for generation
    console.log('🔧 Using settings period as configured by admin')
    // periodStart and periodEnd are already set to settings period above

    console.log('Period dates:', {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString()
    })
    const periodDays = calculatePeriodDurationInPhilippines(periodStart, periodEnd)
    // Use full monthly salary
    const perPayrollFactor = 1.0

    console.log(`💰 SALARY CALCULATION - Period Days: ${periodDays}`)
    console.log(`💰 SALARY CALCULATION - Payroll Factor: ${perPayrollFactor}x (Full Monthly)`)
    console.log(`💰 SALARY CALCULATION - Using FULL MONTHLY SALARY`)

    // Get all active personnel users
    console.log('🔍 Payroll Summary - Fetching users')
    const users = await prisma.users.findMany({
      where: {
        isActive: true,
        role: 'PERSONNEL'
      },
      select: {
        users_id: true,
        name: true,
        email: true,
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

    console.log('🔍 Payroll Summary - Users found:', users.length)

    // Use the period dates directly - they're already in correct Philippines timezone from parsePhilippinesLocalDate
    // periodStart is already 00:00:00 Philippines time
    // periodEnd is already 23:59:59 Philippines time
    const periodStartDay = periodStart
    const periodEndDay = periodEnd

    console.log(`📅 Original periodStart: ${periodStart.toISOString()}`)
    console.log(`📅 Original periodEnd: ${periodEnd.toISOString()}`)
    console.log(`📅 Querying attendance from ${periodStartDay.toISOString()} to ${periodEndDay.toISOString()}`)
    console.log(`📅 Period Start (Philippines date): ${toPhilippinesDateString(periodStartDay)}`)
    console.log(`📅 Period End (Philippines date): ${toPhilippinesDateString(periodEndDay)}`)

    // Get attendance records for the period - DISABLED (attendance removed)
    const attendanceRecords: any[] = []
    // const attendanceRecords = await prisma.attendances.findMany({
    //   where: {
    //     date: {
    //       gte: periodStartDay,
    //       lte: periodEndDay
    //     }
    //   },
    //   include: {
    //     user: {
    //       select: {
    //         users_id: true,
    //         name: true,
    //         email: true,
    //         personnelType: { select: { name: true, type: true, department: true, basicSalary: true } }
    //       }
    //     }
    //   }
    // })

    console.log('Attendance records found:', attendanceRecords.length)
    if (attendanceRecords.length > 0) {
      const uniqueDates = [...new Set(attendanceRecords.map(r => r.date.toISOString().split('T')[0]))].sort()
      console.log(`📅 Attendance dates retrieved: ${uniqueDates.join(', ')}`)
      console.log(`📅 First attendance date: ${uniqueDates[0]}`)
      console.log(`📅 Last attendance date: ${uniqueDates[uniqueDates.length - 1]}`)
    }

    // Load any existing payroll entries for this period to surface real statuses (Pending/Released)
    // Exclude archived entries so old archived payrolls don't affect current payroll status
    const existingPayrollEntries = await prisma.payroll_entries.findMany({
      where: {
        periodStart: periodStart,
        periodEnd: periodEnd,
        status: { not: 'ARCHIVED' } // Only consider active payroll entries (Pending/Released)
      },
      select: {
        users_id: true,
        status: true
      }
    })
    const usersIdToStatus = new Map<string, 'Pending' | 'Released'>()
    existingPayrollEntries.forEach(e => {
      const mapped = e.status === 'RELEASED' ? 'Released' : 'Pending'
      usersIdToStatus.set(e.users_id, mapped)
    })
    const hasGenerated = existingPayrollEntries.length > 0
    const hasReleased = existingPayrollEntries.some(e => e.status === 'RELEASED')

    // 🚫 PREVENT AUTO-GENERATION: If no payroll entries exist, return empty data
    // Payroll should ONLY be generated when admin clicks "Generate Payroll" button
    if (!hasGenerated) {
      console.log('⚠️ No payroll entries found for this period. Please click "Generate Payroll" to create payroll.')
      return {
        success: true,
        summary: {
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          totalEmployees: 0,
          totalGrossSalary: 0,
          totalDeductions: 0,
          totalNetSalary: 0,
          payrollEntries: [],
          hasGenerated: false,
          hasReleased: false
        }
      }
    }

    // Use STANDARD 22 working days for consistent daily rate calculation
    // This matches the Personnel Types page which uses 22 working days as the standard
    const currentMonth = periodStart.getMonth()
    const currentYear = periodStart.getFullYear()
    const workingDaysInMonth = 22 // Standard working days (Mon-Fri average per month)

    // For payroll period tracking
    const workingDaysInPeriod = calculateWorkingDaysInPhilippines(periodStart, periodEnd)

    console.log('🔍 WORKING DAYS DEBUG - Month:', `${currentYear}-${currentMonth + 1}`)
    console.log('🔍 WORKING DAYS DEBUG - Working Days in MONTH:', workingDaysInMonth, '(used for daily rate)')
    console.log('🔍 WORKING DAYS DEBUG - Working Days in PERIOD:', workingDaysInPeriod, '(for tracking only)')

    // Generate working days array for the period using Philippines timezone
    const today = getNowInPhilippines() // Use Philippines timezone
    const workingDays = generateWorkingDaysInPhilippines(periodStart, periodEnd)
      .filter(day => day <= toPhilippinesDateString(today)) // Only include days up to today

    // Create attendance map for quick lookup
    const attendanceMap = new Map<string, any>()
    attendanceRecords.forEach(record => {
      const key = `${record.users_id}-${record.date.toISOString().split('T')[0]}`
      attendanceMap.set(key, record)
    })

    // If payroll entries exist for the display period, use the STORED values to freeze amounts
    // This prevents net pay from changing when Attendance Settings period is adjusted after release
    let payrollEntries: PayrollEntry[] = []
    let totalGrossSalary = 0
    let totalDeductions = 0
    let totalNetSalary = 0

    const storedEntriesForPeriod = await prisma.payroll_entries.findMany({
      where: { periodStart: periodStart, periodEnd: periodEnd },
      include: {
        users: {
          select: {
            users_id: true,
            name: true,
            email: true,
            personnel_types: { select: { name: true, type: true, department: true, basicSalary: true } }
          }
        }
      }
    })

    if (storedEntriesForPeriod.length > 0) {
      // Freeze to stored amounts - no attendance tracking needed
      const periodDays = calculatePeriodDurationInPhilippines(periodStart, periodEnd)
      // Use full monthly salary
      const perPayrollFactor = 1.0

      const rebuilt: PayrollEntry[] = []
      for (const se of storedEntriesForPeriod) {
        // No attendance records - removed from system

        // Database deductions for period
        // For mandatory deductions, don't filter by date - they apply to every period
        const periodDeductions = await prisma.deductions.findMany({
          where: {
            users_id: se.users_id,
            archivedAt: null, // Exclude archived deductions — all active ones apply to current payroll
          },
          include: { deduction_types: { select: { name: true, description: true, isMandatory: true } } },
          orderBy: { appliedAt: 'desc' }
        })
        // Use all deductions - no attendance filtering
        let databaseDeductions = periodDeductions.reduce((sum: number, d: any) => sum + Number(d.amount), 0)
        let deductionDetails = periodDeductions.map((d: any) => ({
          id: d.deductions_id || '',
          amount: Number(d.amount),
          type: d.deduction_types?.name || 'Unknown Deduction',
          description: d.deduction_types?.description || null,
          appliedAt: d.appliedAt.toISOString(),
          notes: d.notes || null,
        })) as any

        // Fallback: if no period-specific deductions, use latest per type
        if (databaseDeductions === 0) {
          const latestUserDeductions = await prisma.deductions.findMany({
            where: { users_id: se.users_id, archivedAt: null },
            include: { deduction_types: { select: { name: true, description: true, isMandatory: true } } },
            orderBy: { appliedAt: 'desc' }
          })
          const seen = new Set<string>()
          const latestPerType = latestUserDeductions.filter((d: any) => {
            if (seen.has(d.deduction_types.name)) return false
            seen.add(d.deduction_types.name)
            return true
          })
          if (latestPerType.length > 0) {
            databaseDeductions = latestPerType.reduce((sum: number, d: any) => sum + Number(d.amount), 0)
            deductionDetails = latestPerType.map((d: any) => ({
              id: d.deductions_id || '',
              amount: Number(d.amount),
              type: d.deduction_types?.name || 'Unknown Deduction',
              description: d.deduction_types?.description || null,
              appliedAt: d.appliedAt.toISOString(),
              notes: d.notes || null,
            })) as any
          }
        }

        // Loans: read from stored breakdownSnapshot to avoid double-counting.
        // se.deductions already includes loanPayments (stored during generatePayroll),
        // so re-querying the loans table would cause them to appear twice in the breakdown.
        let loanPayments = 0
        try {
          const snap = typeof se.breakdownSnapshot === 'string'
            ? JSON.parse(se.breakdownSnapshot as string)
            : (se.breakdownSnapshot as any)
          if (snap?.loanDeductions != null) {
            loanPayments = Number(snap.loanDeductions)
          } else if (Array.isArray(snap?.loanDetails) && snap.loanDetails.length > 0) {
            loanPayments = snap.loanDetails.reduce(
              (s: number, l: any) => s + Number(l.payment || l.amount || 0), 0
            )
          }
        } catch {
          loanPayments = 0
        }

        // No attendance deductions - attendance system removed

        // Compose entry using STORED totals and rebuilt breakdown
        rebuilt.push({
          users_id: se.users_id,
          name: se.users?.name || null,
          email: se.users?.email || '',
          personnelType: se.users?.personnel_types ? {
            name: se.users.personnel_types.name,
            basicSalary: Number(se.users.personnel_types.basicSalary)
          } : null,
          grossSalary: (se.users?.personnel_types?.basicSalary ? Number(se.users.personnel_types.basicSalary) : Number(se.basicSalary)) * perPayrollFactor,
          totalDeductions: Number(se.deductions),
          totalAdditions: Number(se.overtime) || 0,
          netSalary: Number(se.netPay),
          finalNetPay: Number(se.netPay),  // Same as netSalary
          status: se.status === 'RELEASED' ? 'Released' : 'Pending',
          deductionDetails,
          loanPayments,
          databaseDeductions,
        })
      }

      payrollEntries = rebuilt
      totalGrossSalary = payrollEntries.reduce((s, e) => s + e.grossSalary, 0)
      totalDeductions = payrollEntries.reduce((s, e) => s + e.totalDeductions, 0)
      totalNetSalary = payrollEntries.reduce((s, e) => s + e.netSalary, 0)
    } else {
      // No stored entries yet → compute live preview for generation
      // Process each user
      const computedEntries: PayrollEntry[] = []
      let compTotalGross = 0
      let compTotalDeductions = 0
      let compTotalNet = 0

      for (const user of users) {
        if (!user.personnel_types?.basicSalary) continue

        const monthlyBasicSalary = parseFloat(user.personnel_types.basicSalary.toString())
        // Use full monthly salary
        const basicSalary = monthlyBasicSalary

        console.log(`🔍 Payroll Debug - User: ${user.name}, Monthly Basic Salary: ₱${monthlyBasicSalary.toFixed(2)}, Period Basic Salary: ₱${basicSalary.toFixed(2)}`)

        // No attendance tracking - just use basic salary
        let grossSalary = basicSalary
        let totalUserDeductions = 0

        console.log(`🔍 Payroll Summary - User: ${user.name}, Gross Salary: ₱${grossSalary.toFixed(2)}`)

        // Get deduction details for this user
        // For mandatory deductions (PhilHealth, SSS, Pag-IBIG), don't filter by date - they apply to every period
        // For other deductions, only include those within the current period
        console.log(`🔍🔍🔍 FETCHING DEDUCTIONS for ${user.name} (${user.users_id})`)
        console.log(`🔍 Period: ${periodStartDay.toISOString()} to ${periodEndDay.toISOString()}`)

        const deductionDetails = await prisma.deductions.findMany({
          where: {
            users_id: user.users_id,
            archivedAt: null, // Exclude archived deductions
            // Include ALL active deductions (both mandatory and non-mandatory)
            // Non-mandatory deductions will be archived after payroll release
          },
          include: {
            deduction_types: {
              select: {
                name: true,
                description: true,
                isMandatory: true
              }
            }
          },
          orderBy: {
            appliedAt: 'desc'
          }
        })

        console.log(`🔍🔍🔍 FOUND ${deductionDetails.length} DEDUCTIONS for ${user.name}:`)
        deductionDetails.forEach((d: any) => {
          console.log(`  - ${d.deduction_types.name}: ₱${d.amount} (Mandatory: ${d.deduction_types.isMandatory}, Applied: ${d.appliedAt.toISOString()})`)
        })

        // NOTE: Mandatory deductions are driven solely by actual rows in the deductions table.
        // We do NOT auto-inject missing mandatory types here — if an admin deleted a user's
        // mandatory deduction entry, that decision must be respected in the payroll calculation.

        // FORCE: Always fetch ALL overload pays and sum by user
        const allOverloadPays = await prisma.overload_pays.findMany({
          where: { archivedAt: null },
          include: { users: { select: { name: true } } }
        })

        const userOverloadPays = allOverloadPays.filter(op => op.users_id === user.users_id)
        const totalOverloadPay = userOverloadPays.reduce((sum, op) => sum + Number(op.amount), 0)

        console.log(`🔴 ${user.name} (${user.users_id}): Found ${userOverloadPays.length} overload records = ₱${totalOverloadPay}`)

        // Set gross salary to monthly + overload pay (overload is additional salary)
        grossSalary = basicSalary + totalOverloadPay // basicSalary is the full monthly amount

        console.log(`💰 GROSS SALARY CALCULATION - User: ${user.name}`)
        console.log(`💰 Monthly Basic Salary: ₱${monthlyBasicSalary.toFixed(2)}`)
        console.log(`💰 Full Monthly Salary (No Division)`)
        console.log(`💰 Overload Pay: ₱${totalOverloadPay.toFixed(2)}`)
        console.log(`💰 GROSS SALARY FOR THIS PERIOD: ₱${grossSalary.toFixed(2)} = ₱${basicSalary.toFixed(2)} + ₱${totalOverloadPay.toFixed(2)}`)

        // Calculate total deductions from database (excluding attendance deductions)
        // Maintain full decimal precision by using parseFloat instead of Number()
        let periodNonAttendanceDeductions = deductionDetails.filter(d =>
          !d.deduction_types?.name?.includes('Late') &&
          !d.deduction_types?.name?.includes('Absent') &&
          !d.deduction_types?.name?.includes('Early')
        )

        // Calculate total database deductions
        const totalDatabaseDeductions = deductionDetails.reduce((sum: number, d: any) => sum + Number(d.amount), 0)
        totalUserDeductions = totalDatabaseDeductions

        console.log(`🔍 Deduction Breakdown - User: ${user.name}, Database Deductions: ₱${totalDatabaseDeductions.toFixed(2)}`)

        // Get active loans for this user and calculate monthly payment
        const activeLoans = await prisma.loans.findMany({
          where: {
            users_id: user.users_id,
            status: 'ACTIVE'
          },
          select: {
            loans_id: true,
            amount: true,
            balance: true,
            monthlyPaymentPercent: true,
            purpose: true
          }
        })

        // Calculate total loan payments based on loan amount percent, scaled per payroll period
        const totalLoanPayments = activeLoans.reduce((sum, loan) => {
          const monthlyPayment = (parseFloat(loan.amount.toString()) * parseFloat(loan.monthlyPaymentPercent.toString())) / 100
          const perPayrollPayment = monthlyPayment * perPayrollFactor
          return sum + perPayrollPayment
        }, 0)

        // Map loan details for breakdown
        const loanDetails = activeLoans.map(loan => {
          const monthlyPayment = (parseFloat(loan.amount.toString()) * parseFloat(loan.monthlyPaymentPercent.toString())) / 100
          const perPayrollPayment = monthlyPayment * perPayrollFactor
          return {
            type: loan.purpose || 'Loan', // Use purpose as type to identify deductions
            amount: perPayrollPayment,
            remainingBalance: parseFloat(loan.balance.toString()),
            loans_id: loan.loans_id,
            purpose: loan.purpose,
            payment: perPayrollPayment,
            balance: parseFloat(loan.balance.toString())
          }
        })

        // Use database deductions + loan payments (no attendance)
        const finalTotalDeductions = totalDatabaseDeductions + totalLoanPayments

        // Net salary = gross - deductions
        const netSalary = grossSalary - finalTotalDeductions

        console.log(`🔍 Payroll Summary - User: ${user.name}`)
        console.log(`  💰 Gross Salary: ₱${grossSalary.toFixed(2)}`)
        console.log(`  📉 Database Deductions: ₱${totalDatabaseDeductions.toFixed(2)}`)
        console.log(`  📉 Loan Payments: ₱${totalLoanPayments.toFixed(2)}`)
        console.log(`  📉 Total Deductions: ₱${finalTotalDeductions.toFixed(2)}`)
        console.log(`  ✅ NET SALARY: ₱${netSalary.toFixed(2)}`)
        console.log(`  🔍 Calculation: ₱${grossSalary.toFixed(2)} - ₱${finalTotalDeductions.toFixed(2)} = ₱${netSalary.toFixed(2)}`)


        // Calculate finalNetPay using the EXACT same formula as the payroll summary table (line 1737)
        // Table formula: Number(entry.breakdown.basicSalary) + overloadPay - totalDeductions
        const tableNetPay = monthlyBasicSalary + totalOverloadPay - finalTotalDeductions

        console.log(`✅ TABLE NET PAY for ${user.name}: ₱${tableNetPay.toFixed(2)}`)
        console.log(`   Formula: ₱${monthlyBasicSalary} + ₱${totalOverloadPay} - ₱${finalTotalDeductions} = ₱${tableNetPay}`)

        computedEntries.push({
          users_id: user.users_id,
          name: user.name,
          email: user.email,
          personnelType: {
            name: user.personnel_types.name,
            basicSalary: monthlyBasicSalary
          },
          grossSalary,
          totalDeductions: finalTotalDeductions,
          totalAdditions: 0,
          netSalary,
          finalNetPay: tableNetPay,  // SAME calculation as table line 1737
          breakdown: {
            basicSalary: monthlyBasicSalary,
            overloadPay: totalOverloadPay,
            totalDeductions: finalTotalDeductions
          },
          status: 'Pending' as 'Pending' | 'Released',
          deductionDetails: deductionDetails.map((deduction: any) => ({
            id: deduction.deductions_id || '',
            amount: parseFloat(deduction.amount.toString()),
            type: deduction.deduction_types.name,
            description: deduction.deduction_types.description,
            appliedAt: deduction.appliedAt.toISOString(),
            notes: deduction.notes,
            isMandatory: deduction.deduction_types.isMandatory
          })),
          loanPayments: totalLoanPayments,
          databaseDeductions: totalDatabaseDeductions
        })

        compTotalGross += grossSalary
        compTotalDeductions += finalTotalDeductions
        compTotalNet += netSalary

        // Note: Deductions will be archived when payroll is RELEASED, not during generation
        // This allows viewing the breakdown before release
      }

      payrollEntries = computedEntries
      totalGrossSalary = compTotalGross
      totalDeductions = compTotalDeductions
      totalNetSalary = compTotalNet
    }

    // Determine generated state for the SETTINGS period (not the display period)
    const settingsEntries = await prisma.payroll_entries.findMany({
      where: { periodStart: settingsPeriodStart, periodEnd: settingsPeriodEnd },
      select: { status: true }
    })
    const hasGeneratedForSettings = settingsEntries.length > 0

    const summary: PayrollSummary = {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      totalEmployees: payrollEntries.length,
      totalGrossSalary,
      totalDeductions,
      totalNetSalary,
      payrollEntries,
      hasGenerated,
      hasReleased
    }

    return { success: true, summary }

  } catch (error) {
    console.error('❌ Error in getPayrollSummary:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    })
    return { success: false, error: `Failed to load payroll summary: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

// Server Action: Get Payroll Schedule
export async function getPayrollSchedule(): Promise<{
  success: boolean
  schedule?: PayrollSchedule
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    // Use the same logic as getPayrollSummary
    const summaryResult = await getPayrollSummary()

    if (!summaryResult.success) {
      return { success: false, error: summaryResult.error }
    }

    // Convert summary to schedule format
    const schedule: PayrollSchedule = {
      periodStart: summaryResult.summary!.periodStart,
      periodEnd: summaryResult.summary!.periodEnd,
      totalEmployees: summaryResult.summary!.totalEmployees,
      totalGrossSalary: summaryResult.summary!.totalGrossSalary,
      totalDeductions: summaryResult.summary!.totalDeductions,
      totalNetSalary: summaryResult.summary!.totalNetSalary,
      payrollEntries: summaryResult.summary!.payrollEntries
    }

    return { success: true, schedule }

  } catch (error) {
    console.error('Error in getPayrollSchedule:', error)
    return { success: false, error: 'Failed to load payroll schedule' }
  }
}

// Server Action: Generate Payroll
export async function generatePayroll(customPeriodStart?: string, customPeriodEnd?: string, blgu?: string): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    let periodStart: Date
    let periodEnd: Date

    // Use custom period dates if provided, otherwise use current semi-monthly period
    if (customPeriodStart && customPeriodEnd) {
      periodStart = new Date(customPeriodStart)
      periodEnd = new Date(customPeriodEnd)
      console.log('✅ Using custom period for payroll generation:', customPeriodStart, 'to', customPeriodEnd)
    } else {
      // Use current semi-monthly period for payroll generation
      const now = new Date()
      const currentDay = now.getDate()

      // Determine semi-monthly period (1-15 or 16-end of month)
      if (currentDay <= 15) {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        periodEnd = new Date(now.getFullYear(), now.getMonth(), 15)
      } else {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 16)
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
      console.log('✅ Using default semi-monthly period for payroll generation')
    }

    periodStart.setHours(0, 0, 0, 0)
    periodEnd.setHours(23, 59, 59, 999)

    console.log('📅 Generating payroll for period:', periodStart.toISOString(), 'to', periodEnd.toISOString())

    // Get active personnel — optionally filtered by BLGU department
    const blguFilter = blgu
      ? { personnel_types: { department: blgu } }
      : {}

    const users = await prisma.users.findMany({
      where: {
        isActive: true,
        role: 'PERSONNEL',
        ...blguFilter
      },
      select: {
        users_id: true,
        name: true,
        email: true,
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

    console.log(`👥 Found ${users.length} active personnel for payroll generation${blgu ? ` (BLGU: ${blgu})` : ' (all BLGU)'}`)

    if (users.length === 0) {
      return {
        success: false,
        error: 'No active personnel found. Please add personnel first.'
      }
    }

    // Delete existing PENDING entries for this BLGU group/period to prevent duplicates
    const userIdsToDelete = blgu ? users.map(u => u.users_id) : undefined
    const deletedEntries = await prisma.payroll_entries.deleteMany({
      where: {
        periodStart: periodStart,
        periodEnd: periodEnd,
        status: 'PENDING',
        ...(userIdsToDelete ? { users_id: { in: userIdsToDelete } } : {})
      }
    })
    console.log(`🗑️ Deleted ${deletedEntries.count} PENDING entries${blgu ? ` for ${blgu}` : ''} to prevent duplicates`)

    // Optimized: Batch fetch all related data
    const userIds = users.map(u => u.users_id)

    const [allDeductions, allLoans, allOverloads] = await Promise.all([
      prisma.deductions.findMany({
        where: {
          users_id: { in: userIds },
          archivedAt: null,
          deduction_types: {
            NOT: {
              OR: [
                { name: { contains: 'Late' } },
                { name: { contains: 'Absent' } },
                { name: { contains: 'Early' } },
                { name: { contains: 'Tardiness' } },
                { name: { contains: 'Partial' } }
              ]
            }
          }
        },
        include: {
          deduction_types: { select: { name: true, description: true } }
        }
      }),
      prisma.loans.findMany({
        where: { users_id: { in: userIds }, status: 'ACTIVE' }
      }),
      prisma.overload_pays.findMany({
        where: { users_id: { in: userIds }, archivedAt: null },
        select: { overload_pays_id: true, users_id: true, amount: true, notes: true, type: true }
      })
    ])

    const deductionsByUser = allDeductions.reduce((acc, d) => {
      acc[d.users_id] = acc[d.users_id] || []
      acc[d.users_id].push(d)
      return acc
    }, {} as Record<string, typeof allDeductions>)

    const loansByUser = allLoans.reduce((acc, l) => {
      acc[l.users_id] = acc[l.users_id] || []
      acc[l.users_id].push(l)
      return acc
    }, {} as Record<string, typeof allLoans>)

    const overloadsByUser = allOverloads.reduce((acc, o) => {
      acc[o.users_id] = acc[o.users_id] || []
      acc[o.users_id].push(o)
      return acc
    }, {} as Record<string, typeof allOverloads>)

    // Always create NEW payroll entries for each user
    const entriesToCreate = users.map(user => {
      const basicSalary = user.personnel_types?.basicSalary ? Number(user.personnel_types.basicSalary) : 0
      
      const deductions = deductionsByUser[user.users_id] || []
      const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount), 0)

      const loans = loansByUser[user.users_id] || []
      const loanPayments = loans.reduce((sum, l) => sum + ((Number(l.amount) * Number(l.monthlyPaymentPercent)) / 100), 0)

      const overloadPays = overloadsByUser[user.users_id] || []
      const totalOverloadPay = overloadPays.reduce((sum, op) => sum + Number(op.amount), 0)

      const grossSalary = basicSalary + totalOverloadPay
      const netPay = grossSalary - totalDeductions - loanPayments

      const breakdownSnapshot = {
        basicSalary: basicSalary,
        overloadPay: totalOverloadPay,
        overloadPayDetails: overloadPays.map(op => ({
          type: op.notes || op.type || 'Additional Pay',
          amount: Number(op.amount)
        })),
        loanDeductions: loanPayments,
        loanDetails: loans.map(l => ({
          amount: Number(l.amount),
          monthlyPaymentPercent: Number(l.monthlyPaymentPercent),
          payment: (Number(l.amount) * Number(l.monthlyPaymentPercent)) / 100,
          purpose: l.purpose
        })),
        otherDeductions: totalDeductions,
        otherDeductionDetails: deductions.map((d: any) => ({
          type: d.deduction_types.name,
          amount: Number(d.amount),
          description: d.deduction_types.description || '',
          isMandatory: false
        })),
        attendanceDeductions: 0,
        attendanceDeductionDetails: [],
        totalDeductions: totalDeductions + loanPayments,
        netPay: netPay
      }

      return {
        payroll_entries_id: `PE-${user.users_id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        users_id: user.users_id,
        periodStart: periodStart,
        periodEnd: periodEnd,
        basicSalary: basicSalary,
        overtime: totalOverloadPay,
        deductions: totalDeductions + loanPayments,
        netPay: netPay,
        status: 'PENDING' as any,
        breakdownSnapshot: JSON.stringify(breakdownSnapshot),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    if (entriesToCreate.length > 0) {
      await prisma.payroll_entries.createMany({
        data: entriesToCreate
      })
    }

    console.log(`✅ Successfully created ${entriesToCreate.length} payroll entries`)

    // Auto-archive all RELEASED payroll entries when generating new payroll
    // This ensures personnel only see the latest released payroll
    const archivedCount = await prisma.payroll_entries.updateMany({
      where: {
        status: 'RELEASED'
      },
      data: {
        status: 'ARCHIVED'
      }
    })
    console.log(`📦 Auto-archived ${archivedCount.count} released payroll entries`)

    revalidatePath('/admin/payroll')

    return {
      success: true,
      message: `Payroll generated successfully for ${users.length} ${blgu ? blgu : 'staff'}`
    }

  } catch (error) {
    console.error('Error in generatePayroll:', error)
    return { success: false, error: 'Failed to generate payroll' }
  }
}

// Server Action: Release Payroll
export async function releasePayroll(entryIds: string[]): Promise<{
  success: boolean
  message?: string
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    // Get payroll entries to find period info and user IDs
    const entries = await prisma.payroll_entries.findMany({
      where: {
        payroll_entries_id: {
          in: entryIds
        }
      },
      select: {
        users_id: true,
        periodStart: true,
        periodEnd: true
      }
    })

    // Get full payroll summary to capture breakdown snapshot
    const summaryResult = await getPayrollSummary()

    // For each entry, capture the breakdown snapshot before releasing
    for (const entry of entries) {
      // Find the matching entry in summary
      const summaryEntry = summaryResult.summary?.payrollEntries.find(
        e => e.users_id === entry.users_id
      )

      if (summaryEntry) {
        // Create snapshot of ALL breakdown information including detailed breakdowns
        const breakdownSnapshot = {
          monthlyBasicSalary: summaryEntry.personnelType?.basicSalary,
          periodSalary: summaryEntry.grossSalary,
          totalDeductions: summaryEntry.totalDeductions,
          totalAdditions: summaryEntry.totalAdditions || 0, // Overload pay total
          netPay: summaryEntry.netSalary,
          databaseDeductions: summaryEntry.databaseDeductions,
          loanPayments: summaryEntry.loanPayments,
          deductionDetails: (summaryEntry.deductionDetails || []).map((d: any) => ({
            type: d.type,
            amount: Number(d.amount),
            description: d.description || '',
            isMandatory: d.isMandatory || false,
            appliedAt: d.appliedAt,
            notes: d.notes
          })),
          loanDetails: ((summaryEntry as any).loanDetails || []).map((l: any) => ({
            type: l.purpose || l.type || 'Loan',
            amount: Number(l.amount || l.payment || 0),
            remainingBalance: Number(l.balance || l.remainingBalance || 0),
            purpose: l.purpose
          })),
          overloadPayDetails: ((summaryEntry as any).overloadPayDetails || []).map((op: any) => ({
            type: op.type || 'OVERTIME',
            amount: Number(op.amount)
          })),
          personnelType: summaryEntry.personnelType?.name
        }

        // Find the payroll_entries_id for this user
        const payrollEntry = await prisma.payroll_entries.findFirst({
          where: {
            users_id: entry.users_id,
            payroll_entries_id: { in: entryIds }
          }
        })

        if (payrollEntry) {
          // Update this specific entry with snapshot and RELEASED status
          await prisma.payroll_entries.update({
            where: {
              payroll_entries_id: payrollEntry.payroll_entries_id
            },
            data: {
              status: 'RELEASED',
              releasedAt: new Date(),
              breakdownSnapshot: JSON.stringify(breakdownSnapshot)
            }
          })
        }
      }
    }

    // Update ALL selected entries to RELEASED (whether or not they have a snapshot)
    await prisma.payroll_entries.updateMany({
      where: {
        payroll_entries_id: {
          in: entryIds
        }
      },
      data: {
        status: 'RELEASED',
        releasedAt: new Date()
      }
    })

    // Send notification to all personnel
    if (entries.length > 0) {
      const { createNotification } = await import('@/lib/notifications')
      const periodStart = new Date(entries[0].periodStart).toLocaleDateString()
      const periodEnd = new Date(entries[0].periodEnd).toLocaleDateString()

      for (const entry of entries) {
        try {
          await createNotification({
            title: 'Payroll Released',
            message: `Your payroll for ${periodStart} - ${periodEnd} has been released. View your payslip now.`,
            type: 'success',
            userId: entry.users_id
          })
        } catch (notifError) {
          console.error(`Failed to create notification for user ${entry.users_id}:`, notifError)
        }
      }
    }

    revalidatePath('/admin/payroll')

    return {
      success: true,
      message: `Payroll released successfully for ${entryIds.length} employees`
    }

  } catch (error) {
    console.error('Error in releasePayroll:', error)
    return { success: false, error: 'Failed to release payroll' }
  }
}

// Server Action: Get Payroll Entries
export async function getPayrollEntries(): Promise<{
  success: boolean
  entries?: any[]
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const entries = await prisma.payroll_entries.findMany({
      include: {
        users: {
          select: {
            users_id: true,
            name: true,
            email: true,
            personnel_types: {
              select: {
                name: true,
                basicSalary: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Serialize Decimal fields
    const serializedEntries = entries.map(entry => ({
      ...entry,
      basicSalary: Number(entry.basicSalary),
      deductions: Number(entry.deductions),
      netPay: Number(entry.netPay),
      users: {
        ...entry.users,
        personnel_types: entry.users.personnel_types ? {
          ...entry.users.personnel_types,
          basicSalary: Number(entry.users.personnel_types.basicSalary)
        } : undefined
      }
    }))

    return { success: true, entries: serializedEntries }

  } catch (error) {
    console.error('Error in getPayrollEntries:', error)
    return { success: false, error: 'Failed to load payroll entries' }
  }
}

// Server Action: Release Payroll (Admin Trigger)
export async function releasePayrollWithAudit(
  nextPeriodStart?: string,
  nextPeriodEnd?: string,
  includeAttendanceDeductions: boolean = true,
  blgu?: string // "Barangay Officials" | "Barangay Staff" | undefined (all)
): Promise<{
  success: boolean
  releasedCount?: number
  message?: string
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    const adminId = session.user.id

    console.log('📋 Release Payroll - Include Attendance Deductions:', includeAttendanceDeductions)

    // Find the PENDING entries to determine what period to release
    const pendingEntries = await prisma.payroll_entries.findMany({
      where: {
        status: 'PENDING'
      },
      select: {
        periodStart: true,
        periodEnd: true
      },
      take: 1
    })

    if (pendingEntries.length === 0) {
      console.log('⚠️ No pending payroll entries found to release')
      return {
        success: false,
        error: 'No pending payroll entries found. Please generate payroll first.'
      }
    }

    // Use the period from the pending entries
    const startOfDayPH = pendingEntries[0].periodStart
    const endOfDayPH = pendingEntries[0].periodEnd

    console.log('📋 Releasing payroll for period:', {
      start: startOfDayPH.toISOString(),
      end: endOfDayPH.toISOString()
    })

    // Get entries that will be released — optionally scoped by BLGU department
    let entriesToRelease = await prisma.payroll_entries.findMany({
      where: {
        periodStart: startOfDayPH,
        periodEnd: endOfDayPH,
        status: 'PENDING'
      },
      select: {
        payroll_entries_id: true,
        users_id: true,
        periodStart: true,
        periodEnd: true,
        netPay: true,
        deductions: true
      }
    })

    // If BLGU filter is set, further restrict to only matching users
    if (blgu) {
      const blguUsers = await prisma.users.findMany({
        where: { personnel_types: { department: blgu } },
        select: { users_id: true }
      })
      const blguUserIds = new Set(blguUsers.map(u => u.users_id))
      entriesToRelease = entriesToRelease.filter(e => blguUserIds.has(e.users_id))
      console.log(`📋 Filtered to ${entriesToRelease.length} entries for BLGU: ${blgu}`)
    }

    // PgBouncer-safe & Optimized: Batch fetch data to minimize DB round trips
    console.log('📋 Fetching data for all entries to be released...')
    
    const userIds = entriesToRelease.map(e => e.users_id)
    const entryIds = entriesToRelease.map(e => e.payroll_entries_id)

    const [allDeductions, allCurrentEntries, allLoans] = await Promise.all([
      prisma.deductions.findMany({
        where: { users_id: { in: userIds }, archivedAt: null },
        include: { deduction_types: { select: { name: true, description: true, isMandatory: true } } }
      }),
      prisma.payroll_entries.findMany({
        where: { payroll_entries_id: { in: entryIds } }
      }),
      prisma.loans.findMany({
        where: { users_id: { in: userIds }, status: 'ACTIVE', archivedAt: null }
      })
    ])

    // Group data by user/entry
    const deductionsByUser = allDeductions.reduce((acc, d) => {
      acc[d.users_id] = acc[d.users_id] || []
      acc[d.users_id].push(d)
      return acc
    }, {} as Record<string, typeof allDeductions>)

    const loansByUser = allLoans.reduce((acc, l) => {
      acc[l.users_id] = acc[l.users_id] || []
      acc[l.users_id].push(l)
      return acc
    }, {} as Record<string, typeof allLoans>)

    const entriesById = allCurrentEntries.reduce((acc, e) => {
      acc[e.payroll_entries_id] = e
      return acc
    }, {} as Record<string, typeof allCurrentEntries[0]>)

    console.log('📋 Updating breakdown snapshots with current deductions...')

    // Parallelize updates instead of sequential await
    await Promise.all(entriesToRelease.map(async (entry) => {
      const personalDeductions = deductionsByUser[entry.users_id] || []
      const currentEntry = entriesById[entry.payroll_entries_id]
      const activeLoans = loansByUser[entry.users_id] || []

      let breakdownData: any = {}
      if (currentEntry?.breakdownSnapshot) {
        try {
          breakdownData = typeof currentEntry.breakdownSnapshot === 'string'
            ? JSON.parse(currentEntry.breakdownSnapshot)
            : currentEntry.breakdownSnapshot
        } catch (e) {
          console.error('Failed to parse breakdown snapshot:', e)
        }
      }

      const totalPersonalDeductions = personalDeductions.reduce((sum, d) => sum + Number(d.amount), 0)

      const totalLoanPayments = activeLoans.reduce((sum, loan) => {
        return sum + (Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100
      }, 0)

      breakdownData.deductionDetails = personalDeductions.map(d => ({
        id: d.deductions_id,
        type: d.deduction_types.name,
        amount: Number(d.amount),
        description: d.deduction_types.description || '',
        appliedAt: d.appliedAt.toISOString(),
        notes: d.notes,
        isMandatory: d.deduction_types.isMandatory
      }))
      breakdownData.attendanceDeductionDetails = []
      breakdownData.loanDetails = activeLoans.map(loan => ({
        amount: Number(loan.amount),
        monthlyPaymentPercent: Number(loan.monthlyPaymentPercent),
        payment: (Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100,
        purpose: loan.purpose,
        balance: Number(loan.balance)
      }))
      breakdownData.databaseDeductions = totalPersonalDeductions
      breakdownData.attendanceDeductions = 0
      breakdownData.loanPayments = totalLoanPayments
      breakdownData.totalDeductions = totalPersonalDeductions + totalLoanPayments

      const grossSalary = Number(currentEntry?.basicSalary || 0) + Number(currentEntry?.overtime || 0)
      const newNetPay = grossSalary - breakdownData.totalDeductions

      await prisma.payroll_entries.update({
        where: { payroll_entries_id: entry.payroll_entries_id },
        data: {
          deductions: breakdownData.totalDeductions,
          netPay: newNetPay,
          breakdownSnapshot: JSON.stringify(breakdownData)
        }
      })

      console.log(`  📋 Updated ${entry.users_id}: Deductions: ₱${totalPersonalDeductions}, Loans: ₱${totalLoanPayments}, Net Pay: ₱${newNetPay}`)
    }))

    // Archive old RELEASED payrolls from before this period
    const archivedResult = await prisma.payroll_entries.updateMany({
      where: { status: 'RELEASED', periodEnd: { lt: startOfDayPH } },
      data: { status: 'ARCHIVED', archivedAt: new Date() }
    })
    if (archivedResult.count > 0) {
      console.log(`📦 Auto-archived ${archivedResult.count} previous RELEASED payroll entries`)
    }

    // Release selected PENDING entries
    const entryIdsToRelease = entriesToRelease.map(e => e.payroll_entries_id)
    const updateResult = await prisma.payroll_entries.updateMany({
      where: {
        payroll_entries_id: { in: entryIdsToRelease },
        status: 'PENDING'
      },
      data: { status: 'RELEASED', releasedAt: new Date() }
    })
    console.log(`✅ Released ${updateResult.count} payroll entries`)

    // Update loan balances for released users
    console.log(`💰 Updating ${allLoans.length} active loans...`)
    await Promise.all(allLoans.map(async (loan) => {
      const payment = (Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100
      const newBalance = Math.max(0, Number(loan.balance) - payment)
      const isFullyPaid = newBalance <= 0
      await prisma.loans.update({
        where: { loans_id: loan.loans_id },
        data: {
          balance: newBalance,
          status: isFullyPaid ? 'COMPLETED' : 'ACTIVE',
          archivedAt: isFullyPaid ? new Date() : null
        }
      })
      console.log(`💳 Loan ${loan.loans_id}: updated to ₱${newBalance.toFixed(2)}${isFullyPaid ? ' COMPLETED' : ''}`)
    }))

    console.log('📦 Archiving non-mandatory deductions from released payroll...')
    
    // Using already fetched allDeductions!
    const nonMandatoryIds = allDeductions.filter(d => 
      !d.deduction_types.isMandatory &&
      !d.deduction_types.name.includes('Late') &&
      !d.deduction_types.name.includes('Absent') &&
      !d.deduction_types.name.includes('Early') &&
      !d.deduction_types.name.includes('Partial') &&
      !d.deduction_types.name.includes('Tardiness') &&
      !d.deductions_id.startsWith('auto-')
    ).map(d => d.deductions_id)

    if (nonMandatoryIds.length > 0) {
      await prisma.deductions.updateMany({
        where: { deductions_id: { in: nonMandatoryIds } },
        data: { archivedAt: new Date() }
      })
      console.log(`📦 ✅ Archived ${nonMandatoryIds.length} non-mandatory deductions`)
    }

    console.log('📦 Archiving attendance-related deductions from released payroll...')
    const attendanceArchiveResult = await prisma.deductions.updateMany({
      where: {
        users_id: { in: userIds },
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
      },
      data: { archivedAt: new Date() }
    })
    console.log(`📦 ✅ Archived ${attendanceArchiveResult.count} attendance deductions`)

    // Send notification to all personnel whose payroll was released
    if (entriesToRelease.length > 0) {
      const { createNotification } = await import('@/lib/notifications')
      const periodStart = new Date(entriesToRelease[0].periodStart).toLocaleDateString()
      const periodEnd = new Date(entriesToRelease[0].periodEnd).toLocaleDateString()

      console.log(`✅ Sending notifications to ${entriesToRelease.length} personnel...`)
      await Promise.all(entriesToRelease.map(entry => 
        createNotification({
          title: 'Payroll Released',
          message: `Your payroll for ${periodStart} - ${periodEnd} has been released. View your payslip now.`,
          type: 'success',
          userId: entry.users_id
        }).catch(err => console.error(err))
      ))
      console.log(`✅ Sent payroll release notifications to ${entriesToRelease.length} personnel`)

      // Send notification to admin
      try {
        await createNotification({
          title: '🎉 Payroll Auto-Released',
          message: `Payroll for ${periodStart} - ${periodEnd} was automatically released to ${entriesToRelease.length} employees.`,
          type: 'success',
          userId: adminId
        })
        console.log(`✅ Sent admin notification for automatic payroll release`)
      } catch (notifError) {
        console.error(`Failed to create admin notification:`, notifError)
      }
    }

    // After release, archive the just-released period when the next Generate happens; for now do not reset summary here

    // Even if nothing was updated (no PENDING entries), proceed successfully
    // per UX: no hard guard on release; still persist next period and refresh UI
    // Caller can use releasedCount === 0 to show an informational toast.

    // Note: Audit logging would require adding auditLog model to schema

    revalidatePath('/admin/payroll')

    return { success: true, releasedCount: updateResult.count, message: `Payroll released successfully for ${updateResult.count} employees` }

  } catch (error) {
    console.error('Error in releasePayrollWithAudit:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, error: `Release failed: ${msg}` }
  }
}

// Server Action: Generate Payslips with Header Settings
export async function generatePayslips(periodStart?: string, periodEnd?: string): Promise<{
  success: boolean
  payslips?: any[]
  headerSettings?: any
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return { success: false, error: 'Unauthorized' }
    }

    // Get header settings for payslip generation
    const headerSettings = await prisma.header_settings.findFirst()

    if (!headerSettings) {
      return { success: false, error: 'Header settings not configured' }
    }

    // Determine period dates
    let startDate: Date
    let endDate: Date

    if (periodStart && periodEnd) {
      startDate = new Date(periodStart)
      endDate = new Date(periodEnd)
    } else {
      // Auto-determine current period
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()

      if (now.getDate() <= 15) {
        startDate = new Date(currentYear, currentMonth, 1)
        endDate = new Date(currentYear, currentMonth, 15)
      } else {
        startDate = new Date(currentYear, currentMonth, 16)
        endDate = new Date(currentYear, currentMonth + 1, 0)
      }
    }

    // Get released payroll entries
    const payrollEntries = await prisma.payroll_entries.findMany({
      where: {
        periodStart: startDate,
        periodEnd: endDate,
        status: 'RELEASED'
      },
      include: {
        users: {
          include: {
            personnel_types: true
          }
        }
      }
    })

    // Batch fetch all related data at once
    const userIds = payrollEntries.map(e => e.users_id)

    const [allLoans, allOtherDeductions] = await Promise.all([
      prisma.loans.findMany({
        where: {
          users_id: { in: userIds },
          status: 'ACTIVE'
        }
      }),
      prisma.deductions.findMany({
        where: {
          users_id: { in: userIds },
          appliedAt: {
            gte: startDate,
            lte: endDate
          }
        }
      })
    ])

    const loansByUser = allLoans.reduce((acc, l) => {
      acc[l.users_id] = acc[l.users_id] || []
      acc[l.users_id].push(l)
      return acc
    }, {} as Record<string, typeof allLoans>)

    const otherDeductionsByUser = allOtherDeductions.reduce((acc, d) => {
      acc[d.users_id] = acc[d.users_id] || []
      acc[d.users_id].push(d)
      return acc
    }, {} as Record<string, typeof allOtherDeductions>)

    // Calculate actual work hours and deductions for each entry
    const payslips = payrollEntries.map((entry: any) => {
      // Attendance system removed - no work hours tracking
      const totalWorkHours = 0

      // Get loan deductions for this user
      const loans = loansByUser[entry.users_id] || []

      let loanDeductions = 0
      const payslipPeriodDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const payslipFactor = payslipPeriodDays <= 16 ? 0.5 : 1.0
      loans.forEach(loan => {
        const monthlyPayment = Number(loan.amount) * (Number(loan.monthlyPaymentPercent) / 100)
        loanDeductions += monthlyPayment * payslipFactor
      })

      // Calculate other deductions (non-attendance, non-loan)
      const otherDeductions = otherDeductionsByUser[entry.users_id] || []

      const otherDeductionsTotal = otherDeductions.reduce((sum, deduction) => {
        return sum + Number(deduction.amount)
      }, 0)

      // Calculate attendance deductions (total deductions minus loan and other deductions)
      const attendanceDeductions = Number(entry.deductions) - loanDeductions - otherDeductionsTotal

      return {
        employeeName: entry.users.name,
        employeeEmail: entry.users.email,
        payrollPeriod: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        totalWorkHours: totalWorkHours,
        basicSalary: Number(entry.basicSalary),
        attendanceDeductions: Math.max(0, attendanceDeductions), // Ensure non-negative
        loanDeductions: loanDeductions,
        otherDeductions: otherDeductionsTotal,
        finalNetPay: Number(entry.netPay),
        headerSettings: {
          companyLogo: headerSettings.logoUrl,
          companyName: headerSettings.schoolName,
          companyAddress: headerSettings.schoolAddress
        }
      }
    })

    return {
      success: true,
      payslips,
      headerSettings
    }

  } catch (error) {
    console.error('Error in generatePayslips:', error)
    return { success: false, error: 'Failed to generate payslips' }
  }
}