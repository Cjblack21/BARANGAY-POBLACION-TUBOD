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
            archivedAt: null, // Exclude archived deductions
            OR: [
              // Mandatory deductions - always include
              {
                deduction_types: {
                  isMandatory: true
                }
              },
              // Other deductions - only within period
              {
                deduction_types: {
                  isMandatory: false
                },
                appliedAt: { gte: periodStart, lte: periodEnd }
              }
            ]
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

        // Loans
        const loans = await prisma.loans.findMany({
          where: { users_id: se.users_id, status: 'ACTIVE' },
          select: { amount: true, monthlyPaymentPercent: true }
        })
        const loanPayments = loans.reduce((sum, l) => {
          const monthly = (Number(l.amount) * Number(l.monthlyPaymentPercent)) / 100
          return sum + monthly * perPayrollFactor
        }, 0)

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

        // Get all active mandatory deduction types
        const activeMandatoryTypes = await prisma.deduction_types.findMany({
          where: {
            isMandatory: true,
            isActive: true
          }
        })

        console.log(`🔍 Found ${activeMandatoryTypes.length} active mandatory deduction types`)

        // For each active mandatory type, ensure it's in deductionDetails
        for (const mandatoryType of activeMandatoryTypes) {
          const exists = deductionDetails.find(d => d.deduction_types_id === mandatoryType.deduction_types_id)
          if (!exists) {
            // Add it automatically
            console.log(`  ✅ AUTO-ADDING ${mandatoryType.name} (₱${mandatoryType.amount}) to ${user.name}`)
            deductionDetails.push({
              deductions_id: 'auto-' + mandatoryType.deduction_types_id,
              users_id: user.users_id,
              deduction_types_id: mandatoryType.deduction_types_id,
              amount: mandatoryType.amount,
              appliedAt: new Date(),
              notes: 'Auto-applied mandatory deduction',
              createdAt: new Date(),
              updatedAt: new Date(),
              deduction_types: {
                name: mandatoryType.name,
                description: mandatoryType.description,
                isMandatory: true
              }
            } as any)
          }
        }

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
export async function generatePayroll(customPeriodStart?: string, customPeriodEnd?: string): Promise<{
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

    // Get all active personnel
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

    console.log('👥 Found', users.length, 'active personnel for payroll generation')

    if (users.length === 0) {
      return {
        success: false,
        error: 'No active personnel found. Please add personnel first.'
      }
    }

    // Delete existing PENDING entries for this period to prevent duplicates
    const deletedEntries = await prisma.payroll_entries.deleteMany({
      where: {
        periodStart: periodStart,
        periodEnd: periodEnd,
        status: 'PENDING'
      }
    })
    console.log(`🗑️ Deleted ${deletedEntries.count} existing PENDING entries for this period to prevent duplicates`)

    let createdCount = 0

    // Always create NEW payroll entries for each user
    for (const user of users) {
      try {
        const basicSalary = user.personnel_types?.basicSalary ? Number(user.personnel_types.basicSalary) : 0

        console.log(`💰 ${user.name} - Personnel Type: ${user.personnel_types?.name}, Basic Salary from DB: ₱${basicSalary.toFixed(2)}`)

        // Get deductions for this user (EXCLUDE attendance-related deductions)
        // Attendance deductions will be applied during release if user chooses to include them
        const deductions = await prisma.deductions.findMany({
          where: {
            users_id: user.users_id,
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
            deduction_types: {
              select: {
                name: true,
                description: true
              }
            }
          }
        })

        console.log(`📋 Non-Attendance Deductions for ${user.name}:`)
        deductions.forEach(d => {
          console.log(`  - ${d.deduction_types.name}: ₱${Number(d.amount).toFixed(2)} (${d.notes || 'No notes'})`)
        })

        const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount), 0)
        console.log(`  📊 Total Non-Attendance Deductions: ₱${totalDeductions.toFixed(2)} (from ${deductions.length} deduction entries)`)
        console.log(`  ℹ️  Attendance deductions will be applied during release if selected`)

        // Get loans for this user
        const loans = await prisma.loans.findMany({
          where: {
            users_id: user.users_id,
            status: 'ACTIVE'
          }
        })
        const loanPayments = loans.reduce((sum, l) => {
          const monthly = (Number(l.amount) * Number(l.monthlyPaymentPercent)) / 100
          return sum + monthly
        }, 0)
        console.log(`  📊 Total Loan Payments: ₱${loanPayments.toFixed(2)} (from ${loans.length} active loans)`)

        // Get overload pay
        const overloadPays = await prisma.overload_pays.findMany({
          where: {
            users_id: user.users_id,
            archivedAt: null
          },
          select: {
            overload_pays_id: true,
            amount: true,
            notes: true,
            type: true
          }
        })
        const totalOverloadPay = overloadPays.reduce((sum, op) => sum + Number(op.amount), 0)

        const grossSalary = basicSalary + totalOverloadPay
        const netPay = grossSalary - totalDeductions - loanPayments
        const totalDeductionsToStore = totalDeductions + loanPayments

        console.log(`💰 Creating payroll for ${user.name}:`)
        console.log(`  📊 Gross Salary: ₱${grossSalary.toFixed(2)} (Basic: ₱${basicSalary.toFixed(2)} + Overload: ₱${totalOverloadPay.toFixed(2)})`)
        console.log(`  📊 Total Deductions to Store: ₱${totalDeductionsToStore.toFixed(2)} (Deductions: ₱${totalDeductions.toFixed(2)} + Loans: ₱${loanPayments.toFixed(2)})`)
        console.log(`  📊 Net Pay: ₱${netPay.toFixed(2)}`)

        // Create breakdown snapshot with detailed deduction information
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
          otherDeductionDetails: deductions.map(d => ({
            type: d.deduction_types.name,
            amount: Number(d.amount),
            description: d.deduction_types.description || '',
            isMandatory: false // Will be determined from deduction_types if needed
          })),
          attendanceDeductions: 0, // Will be added during release if selected
          attendanceDeductionDetails: [], // Will be populated during release if selected
          totalDeductions: totalDeductions + loanPayments,
          netPay: netPay
        }

        // Always create a new entry
        const payrollEntryId = `PE-${user.users_id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        await prisma.payroll_entries.create({
          data: {
            payroll_entries_id: payrollEntryId,
            users_id: user.users_id,
            periodStart: periodStart,
            periodEnd: periodEnd,
            basicSalary: basicSalary,  // Store actual basic salary, not gross
            overtime: totalOverloadPay,
            deductions: totalDeductions + loanPayments,
            netPay: netPay,
            status: 'PENDING',
            breakdownSnapshot: JSON.stringify(breakdownSnapshot),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })

        createdCount++
        console.log(`✅ Created payroll entry for ${user.name}`)
      } catch (error) {
        console.error(`❌ Error creating payroll for ${user.name}:`, error)
        throw error
      }
    }

    console.log(`✅ Successfully created ${createdCount} payroll entries`)

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
      message: `Payroll generated successfully for ${users.length} staff`
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

    // Fallback: update any remaining entries without snapshot
    await prisma.payroll_entries.updateMany({
      where: {
        payroll_entries_id: {
          in: entryIds
        },
        breakdownSnapshot: null
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
  includeAttendanceDeductions: boolean = true
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

    // Get entries that will be released
    const entriesToRelease = await prisma.payroll_entries.findMany({
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

    console.log(`📋 Found ${entriesToRelease.length} payroll entries to release`)

    // Atomically: release current period entries and persist next period in AttendanceSettings
    const updateResult = await prisma.$transaction(async (tx) => {
      // FIRST: Update ALL deductions in the breakdown snapshot (including personal deductions added after generation)
      console.log('📋 Updating breakdown snapshots with current deductions...')
      
      for (const entry of entriesToRelease) {
        // Get ALL current non-archived deductions for this user (both attendance and personal)
        const allCurrentDeductions = await tx.deductions.findMany({
          where: {
            users_id: entry.users_id,
            archivedAt: null
          },
          include: {
            deduction_types: {
              select: {
                name: true,
                description: true,
                isMandatory: true
              }
            }
          }
        })

        // Get the current payroll entry to access existing breakdown
        const currentEntry = await tx.payroll_entries.findUnique({
          where: { payroll_entries_id: entry.payroll_entries_id }
        })

        // Parse existing breakdown snapshot or create new one
        let breakdownData: any = {}
        if (currentEntry?.breakdownSnapshot) {
          try {
            breakdownData = typeof currentEntry.breakdownSnapshot === 'string'
              ? JSON.parse(currentEntry.breakdownSnapshot)
              : currentEntry.breakdownSnapshot
          } catch (e) {
            console.error('Failed to parse existing breakdown snapshot:', e)
          }
        }

        // Separate attendance and non-attendance deductions
        const attendanceRelatedTypes = ['Late Arrival', 'Early Time-Out', 'Absence Deduction', 'Partial Attendance', 'Absent', 'Late', 'Tardiness', 'Attendance']
        const attendanceDeductions = allCurrentDeductions.filter(d => 
          attendanceRelatedTypes.some(type => d.deduction_types.name.includes(type))
        )
        const personalDeductions = allCurrentDeductions.filter(d => 
          !attendanceRelatedTypes.some(type => d.deduction_types.name.includes(type))
        )

        const totalAttendanceDeductions = attendanceDeductions.reduce((sum, d) => sum + Number(d.amount), 0)
        const totalPersonalDeductions = personalDeductions.reduce((sum, d) => sum + Number(d.amount), 0)
        const totalAllDeductions = totalAttendanceDeductions + totalPersonalDeductions

        // Get loans
        const activeLoans = await tx.loans.findMany({
          where: {
            users_id: entry.users_id,
            status: 'ACTIVE',
            archivedAt: null
          }
        })
        
        const totalLoanPayments = activeLoans.reduce((sum, loan) => {
          const monthlyPayment = (Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100
          return sum + monthlyPayment
        }, 0)

        // Update breakdown with non-attendance deductions only (mandatory + other)
        // Attendance deductions are stored separately to avoid duplicates
        breakdownData.deductionDetails = personalDeductions.map(d => ({
          id: d.deductions_id,
          type: d.deduction_types.name,
          amount: Number(d.amount),
          description: d.deduction_types.description || '',
          appliedAt: d.appliedAt.toISOString(),
          notes: d.notes,
          isMandatory: d.deduction_types.isMandatory
        }))
        
        // Add attendance deduction details separately for payslip display
        breakdownData.attendanceDeductionDetails = attendanceDeductions.map(d => ({
          type: d.deduction_types.name,
          amount: Number(d.amount),
          description: d.deduction_types.description || '',
          appliedAt: d.appliedAt.toISOString(),
          notes: d.notes
        }))
        
        // Add loan details for payslip display
        breakdownData.loanDetails = activeLoans.map(loan => ({
          amount: Number(loan.amount),
          monthlyPaymentPercent: Number(loan.monthlyPaymentPercent),
          payment: (Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100,
          purpose: loan.purpose,
          balance: Number(loan.balance)
        }))
        
        breakdownData.databaseDeductions = totalPersonalDeductions
        breakdownData.attendanceDeductions = includeAttendanceDeductions ? totalAttendanceDeductions : 0
        breakdownData.loanPayments = totalLoanPayments
        
        // Calculate total deductions based on whether attendance deductions are included
        const actualDeductionsToApply = includeAttendanceDeductions 
          ? (totalAttendanceDeductions + totalPersonalDeductions) 
          : totalPersonalDeductions
        breakdownData.totalDeductions = actualDeductionsToApply + totalLoanPayments

        // Recalculate net pay based on current breakdown
        const grossSalary = Number(currentEntry?.basicSalary || 0) + Number(currentEntry?.overtime || 0)
        const newNetPay = grossSalary - breakdownData.totalDeductions

        // Update the payroll entry with updated breakdown and recalculated totals
        await tx.payroll_entries.update({
          where: { payroll_entries_id: entry.payroll_entries_id },
          data: {
            deductions: breakdownData.totalDeductions,
            netPay: newNetPay,
            breakdownSnapshot: JSON.stringify(breakdownData)
          }
        })

        console.log(`  📋 Updated ${entry.users_id}: Personal Deductions: ₱${totalPersonalDeductions}, Attendance: ₱${totalAttendanceDeductions}, Loans: ₱${totalLoanPayments}, Net Pay: ₱${newNetPay}`)
      }

      // SECOND: Check what entries exist for this period
      const existingEntries = await tx.payroll_entries.findMany({
        where: {
          periodStart: { gte: startOfDayPH },
          periodEnd: { lte: endOfDayPH }
        },
        select: {
          payroll_entries_id: true,
          users_id: true,
          status: true,
          periodStart: true,
          periodEnd: true
        }
      })
      console.log(`📋 Found ${existingEntries.length} payroll entries for period ${startOfDayPH.toISOString()} to ${endOfDayPH.toISOString()}`)
      console.log(`📋 Entry statuses:`, existingEntries.map(e => e.status))

      // SECOND: Auto-archive all previous RELEASED payrolls (before releasing new ones)
      const archivedResult = await tx.payroll_entries.updateMany({
        where: {
          status: 'RELEASED',
          // Archive payrolls from periods before the current one
          periodEnd: { lt: startOfDayPH }
        },
        data: {
          status: 'ARCHIVED',
          archivedAt: new Date()
        }
      })

      if (archivedResult.count > 0) {
        console.log(`📦 Auto-archived ${archivedResult.count} previous RELEASED payroll entries`)
      }

      // THEN: Release all pending entries for current period
      const res = await tx.payroll_entries.updateMany({
        where: {
          periodStart: { gte: startOfDayPH },
          periodEnd: { lte: endOfDayPH },
          status: { in: ['PENDING'] }
        },
        data: {
          status: 'RELEASED',
          releasedAt: new Date()
        }
      })

      console.log(`✅ Released ${res.count} payroll entries (changed status from PENDING to RELEASED)`)

      // Get user IDs from released entries to ensure we only update their loans
      const releasedUserIds = entriesToRelease.map(e => e.users_id)
      console.log(`📋 Updating loans for ${releasedUserIds.length} users:`, releasedUserIds)

      // Update loan balances for all users with active loans who are in this payroll
      const activeLoans = await tx.loans.findMany({
        where: {
          users_id: { in: releasedUserIds },
          status: 'ACTIVE',
          archivedAt: null
        }
      })

      console.log(`💰 Found ${activeLoans.length} active loans to update`)

      // Use full monthly salary
      const periodDays = Math.floor((endOfDayPH.getTime() - startOfDayPH.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const payrollFactor = 1.0

      // Update each active loan
      for (const loan of activeLoans) {
        const loanAmount = Number(loan.amount)
        const monthlyPaymentPercent = Number(loan.monthlyPaymentPercent)
        const monthlyPayment = (loanAmount * monthlyPaymentPercent) / 100
        const paymentAmount = monthlyPayment * payrollFactor

        // Calculate new balance
        const currentBalance = Number(loan.balance)
        const newBalance = Math.max(0, currentBalance - paymentAmount)

        console.log(`💳 Processing loan ${loan.loans_id}:`)
        console.log(`   User: ${loan.users_id}`)
        console.log(`   Original Amount: ₱${loanAmount.toFixed(2)}`)
        console.log(`   Current Balance: ₱${currentBalance.toFixed(2)}`)
        console.log(`   Monthly Payment %: ${monthlyPaymentPercent}%`)
        console.log(`   Payment Amount: ₱${paymentAmount.toFixed(2)}`)
        console.log(`   New Balance: ₱${newBalance.toFixed(2)}`)

        // Check if loan is fully paid
        const isFullyPaid = newBalance <= 0

        // Update loan - auto-archive when completed
        const updatedLoan = await tx.loans.update({
          where: { loans_id: loan.loans_id },
          data: {
            balance: newBalance,
            status: isFullyPaid ? 'COMPLETED' : 'ACTIVE',
            archivedAt: isFullyPaid ? new Date() : null
          }
        })

        if (isFullyPaid) {
          console.log(`🎉 Loan ${loan.loans_id} COMPLETED and AUTO-ARCHIVED: ₱${currentBalance.toFixed(2)} → ₱0.00 (final payment: ₱${paymentAmount.toFixed(2)})`)
        } else {
          console.log(`✅ Updated loan ${loan.loans_id}: ₱${currentBalance.toFixed(2)} → ₱${newBalance.toFixed(2)} (paid: ₱${paymentAmount.toFixed(2)})`)
        }
        console.log(`   Database updated balance: ₱${Number(updatedLoan.balance).toFixed(2)}`)
      }

      // Period management removed - attendance settings no longer used
      // Next period will be automatically determined on next payroll generation

      return res
    })

    // Archive non-mandatory deductions after payroll is released
    // This moves them to archived section so they don't appear in future payrolls
    console.log('📦 Archiving non-mandatory deductions from released payroll...')

    for (const entry of entriesToRelease) {
      // Get all non-mandatory deductions for this user in this period
      const userDeductions = await prisma.deductions.findMany({
        where: {
          users_id: entry.users_id,
          archivedAt: null,
          OR: [
            {
              deduction_types: {
                isMandatory: false
              },
              appliedAt: {
                gte: startOfDayPH,
                lte: endOfDayPH
              }
            }
          ]
        },
        include: {
          deduction_types: {
            select: {
              name: true,
              isMandatory: true
            }
          }
        }
      })

      const nonMandatory = userDeductions.filter((d: any) =>
        !d.deduction_types.isMandatory &&
        !d.deduction_types.name.includes('Late') &&
        !d.deduction_types.name.includes('Absent') &&
        !d.deduction_types.name.includes('Early') &&
        !d.deduction_types.name.includes('Partial') &&
        !d.deduction_types.name.includes('Tardiness')
      )

      if (nonMandatory.length > 0) {
        const idsToArchive = nonMandatory
          .map((d: any) => d.deductions_id)
          .filter((id: any) => !id.startsWith('auto-'))

        if (idsToArchive.length > 0) {
          console.log(`📦 Archiving ${idsToArchive.length} non-mandatory deductions for user ${entry.users_id}:`)
          nonMandatory.forEach((d: any) => {
            console.log(`   - ${d.deduction_types.name}: ₱${d.amount}`)
          })

          // ARCHIVE the deductions by setting archivedAt timestamp
          await prisma.deductions.updateMany({
            where: {
              deductions_id: { in: idsToArchive }
            },
            data: {
              archivedAt: new Date()
            }
          })
          console.log(`📦 ✅ Archived ${idsToArchive.length} non-mandatory deductions for user ${entry.users_id}`)
        }
      }
    }

    // Archive ALL attendance-related deductions after payroll is released
    // This prevents attendance deductions from stacking up across multiple payroll periods
    console.log('📦 Archiving attendance-related deductions from released payroll...')

    for (const entry of entriesToRelease) {
      // Archive ALL attendance deductions for this user (regardless of mandatory status or date)
      const attendanceArchiveResult = await prisma.deductions.updateMany({
        where: {
          users_id: entry.users_id,
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
          // ❌ REMOVED DATE FILTER - Archive ALL attendance deductions, not just those in the period
          // This ensures attendance deductions don't carry over to next payroll
        },
        data: {
          archivedAt: new Date()
        }
      })

      if (attendanceArchiveResult.count > 0) {
        console.log(`📦 ✅ Archived ${attendanceArchiveResult.count} attendance deduction(s) for user ${entry.users_id}`)
      } else {
        console.log(`📦 ℹ️ No attendance deductions to archive for user ${entry.users_id}`)
      }
    }

    // Send notification to all personnel whose payroll was released
    if (entriesToRelease.length > 0) {
      const { createNotification } = await import('@/lib/notifications')
      const periodStart = new Date(entriesToRelease[0].periodStart).toLocaleDateString()
      const periodEnd = new Date(entriesToRelease[0].periodEnd).toLocaleDateString()

      // Send notification to each personnel
      for (const entry of entriesToRelease) {
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
    return { success: false, error: 'Failed to release payroll' }
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

    // Calculate actual work hours and deductions for each entry
    const payslips = await Promise.all(payrollEntries.map(async (entry: any) => {
      // Attendance system removed - no work hours tracking
      const totalWorkHours = 0

      // Get loan deductions for this user
      const loans = await prisma.loans.findMany({
        where: {
          users_id: entry.users_id,
          status: 'ACTIVE'
        }
      })

      let loanDeductions = 0
      const payslipPeriodDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const payslipFactor = payslipPeriodDays <= 16 ? 0.5 : 1.0
      loans.forEach(loan => {
        const monthlyPayment = Number(loan.amount) * (Number(loan.monthlyPaymentPercent) / 100)
        loanDeductions += monthlyPayment * payslipFactor
      })

      // Calculate other deductions (non-attendance, non-loan)
      const otherDeductions = await prisma.deductions.findMany({
        where: {
          users_id: entry.users_id,
          appliedAt: {
            gte: startDate,
            lte: endDate
          }
        }
      })

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
    }))

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