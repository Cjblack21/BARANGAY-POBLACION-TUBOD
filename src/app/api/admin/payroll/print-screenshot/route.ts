import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Function to get current biweekly period (same as payroll summary API)
function getCurrentBiweeklyPeriod() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()

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

export async function POST(request: NextRequest) {
  console.log('🔍 Screenshot route called - START')

  try {
    console.log('🔍 Getting session...')
    const session = await getServerSession(authOptions)
    console.log('🔍 Session result:', session ? 'Found' : 'Not found')

    if (!session || session.user.role !== 'ADMIN') {
      console.log('❌ Unauthorized access - session:', session)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Admin session verified - user:', session.user.email)

    // Get period dates from request body, fallback to current period
    let body: any = {}
    try {
      body = await request.json()
      console.log('📝 Request body:', body)
    } catch (error) {
      console.log('⚠️ Failed to parse request body:', error)
    }

    console.log('🔍 Proceeding with full payslip generation...')

    let periodStart: Date
    let periodEnd: Date

    if (body.periodStart && body.periodEnd) {
      periodStart = new Date(body.periodStart)
      periodEnd = new Date(body.periodEnd)
      console.log('📅 Using provided period:', {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        periodStartTime: periodStart.getTime(),
        periodEndTime: periodEnd.getTime()
      })
    } else {
      const currentPeriod = getCurrentBiweeklyPeriod()
      periodStart = currentPeriod.periodStart
      periodEnd = currentPeriod.periodEnd
      console.log('📅 Using current period:', {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        periodStartTime: periodStart.getTime(),
        periodEndTime: periodEnd.getTime()
      })
    }

    // USE STORED PAYROLL DATA APPROACH: Get existing payroll entries with correct breakdown
    console.log('🔧 Using stored payroll data from archive (correct breakdown)...')

    // Get header settings or create default
    let headerSettings = await prisma.header_settings.findFirst()
    console.log('📋 Header settings found:', !!headerSettings)

    if (!headerSettings) {
      console.log('⚠️ No header settings found, creating defaults...')
      const { randomUUID } = require('crypto')
      headerSettings = await prisma.header_settings.create({
        data: {
          id: randomUUID(),
          schoolName: "TUBOD BARANGAY POBLACION",
          schoolAddress: "Tubod, Lanao del Norte",
          systemName: "POBLACION - PMS",
          logoUrl: "/brgy-logo.png",
          showLogo: true,
          headerAlignment: 'center',
          fontSize: 'medium',
          customText: "",
          workingDays: JSON.stringify(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]),
          updatedAt: new Date()
        }
      })
      console.log('✅ Default header settings created')
    }

    // Get all users with their personnel type info first
    const usersWithPersonnelType = await prisma.users.findMany({
      select: {
        users_id: true,
        name: true,
        email: true,
        personnel_types: {
          select: {
            name: true,
            department: true,
            basicSalary: true
          }
        }
      }
    })
    console.log('👥 Users with personnel type:', usersWithPersonnelType.map(u => ({
      id: u.users_id,
      name: u.name,
      dept: u.personnel_types?.department,
      pos: u.personnel_types?.name
    })))

    // Get stored payroll entries for the period (same as archive route)
    // First, let's see what's actually in the database
    const allPayrollEntries = await prisma.payroll_entries.findMany({
      select: {
        periodStart: true,
        periodEnd: true,
        status: true
      },
      take: 10,
      orderBy: {
        periodStart: 'desc'
      }
    })
    console.log('🔍 Recent payroll entries in database:', allPayrollEntries.map(e => ({
      periodStart: e.periodStart.toISOString(),
      periodEnd: e.periodEnd.toISOString(),
      periodStartTime: e.periodStart.getTime(),
      periodEndTime: e.periodEnd.getTime(),
      status: e.status
    })))

    // First try exact date match
    let payrollEntries = await prisma.payroll_entries.findMany({
      where: {
        periodStart: periodStart,
        periodEnd: periodEnd,
        status: { not: 'ARCHIVED' } // Include PENDING and RELEASED
      },
      include: {
        users: {
          select: {
            users_id: true,
            name: true,
            email: true,
            personnel_types: {
              select: {
                name: true,
                department: true,
                basicSalary: true
              }
            }
          }
        }
      }
    })

    console.log('👥 Found stored payroll entries (exact match):', payrollEntries.length)

    // If no exact match, try with date range tolerance for timezone differences
    if (payrollEntries.length === 0) {
      console.log('⚠️ No exact match found, trying with date range tolerance...')
      payrollEntries = await prisma.payroll_entries.findMany({
        where: {
          periodStart: { gte: new Date(periodStart.getTime() - 86400000), lte: new Date(periodStart.getTime() + 86400000) },
          periodEnd: { gte: new Date(periodEnd.getTime() - 86400000), lte: new Date(periodEnd.getTime() + 86400000) },
          status: { not: 'ARCHIVED' } // Include PENDING and RELEASED
        },
        include: {
          users: {
            select: {
              users_id: true,
              name: true,
              email: true,
              personnel_types: {
                select: {
                  name: true,
                  department: true,
                  basicSalary: true
                }
              }
            }
          }
        }
      })
      console.log('👥 Found stored payroll entries (with tolerance):', payrollEntries.length)
    }

    // Use stored payroll data directly - no need for fresh calculations
    if (payrollEntries.length === 0) {
      console.log('❌ No stored payroll entries found for this period')
      console.log('💡 TIP: Make sure you have generated payroll for this period first')
      return NextResponse.json(
        { error: 'No payroll data found for the specified period. Please generate payroll first.' },
        { status: 404 }
      )
    }

    // Get detailed breakdown data (same logic as archive route)
    const payslipData = await Promise.all(payrollEntries.map(async (entry: any) => {
      // Get attendance records for this user and period
      // Attendance system removed
      const attendanceRecords: any[] = []

      // Get deduction records for this user
      // For mandatory deductions (PhilHealth, SSS, Pag-IBIG), don't filter by date - they apply to every period
      // For other deductions, only include those within the current period
      const deductionRecords = await prisma.deductions.findMany({
        where: {
          users_id: entry.users_id,
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
              appliedAt: { gte: entry.periodStart, lte: entry.periodEnd }
            }
          ]
        },
        include: {
          deduction_types: true
        }
      })

      // Get loan records for this user
      const loanRecords = await prisma.loans.findMany({
        where: {
          users_id: entry.users_id,
          status: 'ACTIVE'
        }
      })

      // Get overload pay for this user
      const overloadPayRecords = await prisma.overload_pays.findMany({
        where: {
          users_id: entry.users_id,
          archivedAt: null
        }
      })
      const totalOverloadPay = overloadPayRecords.reduce((sum, op) => sum + Number(op.amount), 0)
      const overloadPayDetails = overloadPayRecords.map(op => ({
        type: op.type || 'OVERTIME',
        amount: Number(op.amount)
      }))

      // Get attendance settings
      // Attendance settings removed
      const attendanceSettings = null

      // Calculate attendance details
      const attendanceDetails = attendanceRecords.map(record => {
        let workHours = 0
        if (record.timeIn && record.timeOut) {
          const timeIn = new Date(record.timeIn)
          const timeOut = new Date(record.timeOut)
          workHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        }
        return {
          date: record.date.toISOString().split('T')[0],
          status: record.status,
          timeIn: record.timeIn?.toISOString().split('T')[1]?.substring(0, 5) || null,
          timeOut: record.timeOut?.toISOString().split('T')[1]?.substring(0, 5) || null,
          workHours: workHours
        }
      })

      // Calculate monthly basic salary from stored payroll data
      // entry.basicSalary is the stored value, entry.overtime is additional pay
      // Actual basic = stored basicSalary - overtime (additional pay)
      const storedBasicSalary = Number(entry.basicSalary || 0)
      const storedOvertime = Number(entry.overtime || 0)
      const monthlyBasicSalary = storedBasicSalary - storedOvertime

      // Daily salary = Monthly ÷ 22 (standard working days per month)
      const dailySalary = monthlyBasicSalary / 22
      const timeInEnd = attendanceSettings?.timeInEnd || '09:30'

      let totalAttendanceDeductions = 0
      const attendanceDeductionDetails: any[] = []

      attendanceRecords.forEach(record => {
        if (record.status === 'ABSENT') {
          attendanceDeductionDetails.push({
            date: record.date.toISOString().split('T')[0],
            amount: dailySalary,
            description: 'Absence deduction'
          })
          totalAttendanceDeductions += dailySalary
        } else if (record.status === 'LATE' && record.timeIn) {
          const timeIn = new Date(record.timeIn)
          const expected = new Date(record.date)
          const [h, m] = timeInEnd.split(':').map(Number)
          expected.setHours(h, m + 1, 0, 0) // Add 1 minute grace period
          const perSecond = dailySalary / 8 / 60 / 60
          const secondsLate = Math.max(0, (timeIn.getTime() - expected.getTime()) / 1000)
          const lateAmount = secondsLate * perSecond // Remove 50% cap

          // Check for early timeout
          let earlyAmount = 0
          if (record.timeOut && attendanceSettings?.timeOutStart) {
            const timeOut = new Date(record.timeOut)
            const expectedTimeOut = new Date(record.date)
            const [outH, outM] = attendanceSettings.timeOutStart.split(':').map(Number)
            expectedTimeOut.setHours(outH, outM, 0, 0)
            const secondsEarly = Math.max(0, (expectedTimeOut.getTime() - timeOut.getTime()) / 1000)
            earlyAmount = secondsEarly * perSecond
          }

          if (lateAmount > 0) {
            attendanceDeductionDetails.push({
              date: record.date.toISOString().split('T')[0],
              amount: lateAmount,
              description: `Late arrival - ${Math.round(secondsLate / 60)} minutes late`
            })
            totalAttendanceDeductions += lateAmount
          }

          if (earlyAmount > 0 && record.timeOut) {
            const minutesEarly = Math.round(earlyAmount / perSecond / 60)
            attendanceDeductionDetails.push({
              date: record.date.toISOString().split('T')[0],
              amount: earlyAmount,
              description: `Early departure - ${minutesEarly} minutes early`
            })
            totalAttendanceDeductions += earlyAmount
          }
        } else if (record.status === 'PARTIAL') {
          let hoursWorked = 0
          if (record.timeIn && record.timeOut) {
            const timeIn = new Date(record.timeIn)
            const timeOut = new Date(record.timeOut)
            hoursWorked = Math.max(0, (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60))
          }
          const hourlyRate = dailySalary / 8
          const hoursShort = Math.max(0, 8 - hoursWorked)
          const amount = hoursShort * hourlyRate
          if (amount > 0) {
            attendanceDeductionDetails.push({
              date: record.date.toISOString().split('T')[0],
              amount: amount,
              description: `Partial attendance - ${hoursShort.toFixed(1)} hours short`
            })
            totalAttendanceDeductions += amount
          }
        }
      })

      // Get other deduction records (non-attendance related)
      const otherDeductionRecords = deductionRecords.filter(deduction =>
        !['Late Arrival', 'Late Penalty', 'Absence Deduction', 'Absent', 'Late', 'Tardiness', 'Early Time-Out', 'Partial Attendance'].includes(deduction.deduction_types.name)
      )

      // Map deduction records with isMandatory flag preserved
      const otherDeductionDetails = otherDeductionRecords.map(deduction => ({
        type: deduction.deduction_types.name,
        amount: Number(deduction.amount),
        description: deduction.deduction_types.description || '',
        appliedAt: deduction.appliedAt.toISOString().split('T')[0],
        isMandatory: deduction.deduction_types.isMandatory,
        calculationType: deduction.deduction_types.calculationType,
        percentageValue: deduction.deduction_types.percentageValue ? Number(deduction.deduction_types.percentageValue) : null
      }))

      // Calculate loan details with purpose label
      const periodDays = Math.floor((entry.periodEnd.getTime() - entry.periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const loanFactor = periodDays <= 16 ? 0.5 : 1.0
      const loanDetails = loanRecords.map(loan => {
        const monthlyPayment = Number(loan.amount) * Number(loan.monthlyPaymentPercent) / 100
        const periodPayment = monthlyPayment * loanFactor
        return {
          type: loan.purpose || 'Loan Payment',
          amount: periodPayment,
          description: `${loan.purpose || 'Loan'} (${loan.monthlyPaymentPercent}% of ₱${Number(loan.amount).toLocaleString()})`,
          originalAmount: Number(loan.amount),
          remainingBalance: Number(loan.balance || loan.amount),
          loanId: loan.loans_id
        }
      })

      // Calculate total deductions from all sources
      const totalLoanPayments = loanDetails.reduce((sum, detail) => sum + detail.amount, 0)
      const totalOtherDeductions = otherDeductionDetails.reduce((sum, detail) => sum + detail.amount, 0)
      const totalDeductions = totalAttendanceDeductions + totalLoanPayments + totalOtherDeductions

      // Calculate correct net pay: Monthly Basic + Overload - Total Deductions
      const grossPay = monthlyBasicSalary + totalOverloadPay
      const correctNetPay = grossPay - totalDeductions

      // Get user data from the separately queried list
      const userData = usersWithPersonnelType.find(u => u.users_id === entry.users_id);

      // Debug logging
      console.log('🔍 User data:', {
        userId: entry.users_id,
        userName: entry.users?.name,
        fromEntry: {
          dept: entry.users?.personnel_types?.department,
          pos: entry.users?.personnel_types?.name
        },
        fromSeparateQuery: {
          dept: userData?.personnel_types?.department,
          pos: userData?.personnel_types?.name
        }
      });

      return {
        users_id: entry.users_id,
        name: entry.users?.name || null,
        email: entry.users?.email || '',
        idNumber: entry.users_id, // Show user ID
        department: userData?.personnel_types?.department || entry.users?.personnel_types?.department || null,
        position: userData?.personnel_types?.name || entry.users?.personnel_types?.name || null,
        totalHours: attendanceDetails.reduce((sum, detail) => sum + detail.workHours, 0),
        totalSalary: correctNetPay, // Use calculated net pay
        released: entry.status === 'RELEASED',
        breakdown: {
          biweeklyBasicSalary: monthlyBasicSalary, // Use full monthly basic salary
          realTimeEarnings: monthlyBasicSalary + totalOverloadPay,
          realWorkHours: attendanceDetails.reduce((sum, detail) => sum + detail.workHours, 0),
          overtimePay: totalOverloadPay, // This is actually overload pay
          overloadPayDetails: overloadPayDetails, // Additional pay details with types
          attendanceDeductions: totalAttendanceDeductions,
          nonAttendanceDeductions: totalOtherDeductions,
          unpaidLeaveDeduction: 0,
          unpaidLeaveDays: 0,
          loanPayments: totalLoanPayments,
          grossPay: grossPay,
          totalDeductions: totalDeductions,
          netPay: correctNetPay, // Use calculated net pay
          // Detailed breakdown with sources
          attendanceDetails: attendanceDetails,
          attendanceDeductionDetails: attendanceDeductionDetails,
          totalAttendanceDeductions: totalAttendanceDeductions,
          loanDetails: loanDetails,
          otherDeductionDetails: otherDeductionDetails,
          // personnel_types name not selected in query
          personnelBasicSalary: Number(entry.users?.personnel_types?.basicSalary || 0)
        }
      }
    }))

    console.log('📊 Generated payslip data for', payslipData.length, 'users')

    // Generate HTML for payslips
    const generatePayslipHTML = (employee: any) => {
      const breakdown = employee.breakdown
      return `
        <div class="payslip-card">
          <div class="payslip-header">
            <div class="logo-container">
              ${headerSettings?.showLogo ? `
                <img src="${headerSettings.logoUrl}" alt="Logo" class="logo" onerror="this.src='/brgy-logo.png'">
              ` : ''}
            </div>
            <div class="school-name">${headerSettings?.schoolName || 'PAYSLIP'}</div>
            <div class="school-address">${headerSettings?.schoolAddress || ''}</div>
            <div class="system-name">${headerSettings?.systemName || ''}</div>
            ${headerSettings?.customText ? `<div class="custom-text">${headerSettings.customText}</div>` : ''}
            <div class="payslip-title">PAYSLIP</div>
          </div>
          
          <div class="employee-info">
            <div class="info-row">
              <span class="label">Staff:</span>
              <span class="value">${employee.name || employee.email}</span>
            </div>
            <div class="info-row">
              <span class="label">Staff ID:</span>
              <span class="value">${employee.idNumber || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Email:</span>
              <span class="value">${employee.email}</span>
            </div>
            <div class="info-row">
              <span class="label">Department:</span>
              <span class="value">BLGU</span>
            </div>
            <div class="info-row">
              <span class="label">Position:</span>
              <span class="value">${employee.position || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Period:</span>
              <span class="value">${new Date(periodStart).toLocaleDateString()} - ${new Date(periodEnd).toLocaleDateString()}</span>
            </div>
            <div class="info-row">
              <span class="label">Status:</span>
              <span class="value">Released</span>
            </div>
          </div>
          
          <div class="payroll-details">
            <!-- Earnings Section Header -->
            <div style="padding: 4px 0; margin-bottom: 4px; font-weight: bold; font-size: 11px; color: #16a34a;">
              EARNINGS
            </div>
            
            ${breakdown.overloadPayDetails && breakdown.overloadPayDetails.length > 0 ? `
              ${breakdown.overloadPayDetails.map((detail: any) => `
            <div class="detail-row">
              <span>${detail.type === 'POSITION_PAY' ? 'Position Pay' :
          detail.type === 'BONUS' ? 'Bonus' :
            detail.type === '13TH_MONTH' ? '13th Month Pay' :
              detail.type === 'OVERTIME' ? 'Overtime' :
                detail.type}:</span>
              <span style="color: #16a34a;">₱${Number(detail.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
              `).join('')}
            ` :
          ((breakdown.overtimePay || 0) > 0 ? `
            <div class="detail-row">
              <span>Additional Pay:</span>
              <span style="color: #16a34a;">₱${(breakdown.overtimePay || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
              ` : '')
        }
            <div class="detail-row total">
              <span>GROSS PAY:</span>
              <span>₱${(breakdown.grossPay || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            
            <!-- Deductions Section Header -->
            <div style="padding: 4px 0; margin: 6px 0 4px 0; font-weight: bold; font-size: 11px; color: #dc2626;">
              DEDUCTIONS
            </div>
            
            <!-- Detailed Deductions Section -->
            ${breakdown.attendanceDeductionDetails && breakdown.attendanceDeductionDetails.length > 0 ? `
              <div class="deduction-section">
                <div class="deduction-title">Attendance Deductions: (${breakdown.attendanceDeductionDetails.length} item${breakdown.attendanceDeductionDetails.length > 1 ? 's' : ''})</div>
                ${breakdown.attendanceDeductionDetails.map((deduction: any) => `
                  <div class="detail-row deduction-detail">
                    <span>${deduction.date}: ${deduction.description}</span>
                    <span class="deduction">-₱${deduction.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                `).join('')}
                <div class="detail-row deduction-detail" style="border-top: 1px solid #ddd; margin-top: 2px; padding-top: 2px; font-weight: bold;">
                  <span>Subtotal:</span>
                  <span class="deduction">-₱${(breakdown.totalAttendanceDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            ` : ''}
            
            ${(() => {
          // Separate actual loans from [DEDUCTION] items
          const allLoans = breakdown.loanDetails || []
          const actualLoans = allLoans.filter((loan: any) => !loan.type?.includes('[DEDUCTION]') && !loan.description?.includes('[DEDUCTION]'))
          const deductionLoans = allLoans.filter((loan: any) => loan.type?.includes('[DEDUCTION]') || loan.description?.includes('[DEDUCTION]'))

          let html = ''

          if (actualLoans.length > 0) {
            const loansTotal = actualLoans.reduce((sum: number, loan: any) => sum + loan.amount, 0);
            html += `
                  <div class="deduction-section">
                    <div class="deduction-title">Loan Payments: (${actualLoans.length} loan${actualLoans.length > 1 ? 's' : ''})</div>
                    ${actualLoans.map((loan: any) => {
              // Clean up loan name - remove percentage details
              const loanName = (loan.description || loan.type || 'Loan Payment').split('(')[0].trim();
              return `
                      <div style="margin-bottom: 4px;">
                        <div class="detail-row deduction-detail">
                          <span style="font-weight: 500;">${loanName}</span>
                          <span class="deduction" style="font-weight: bold;">-₱${loan.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        ${loan.originalAmount ? `<div style="font-size: 7px; color: #999; margin-left: 12px;">Total Amount: ₱${loan.originalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>` : ''}
                        ${loan.remainingBalance && loan.remainingBalance > 0 ? `<div style="font-size: 7px; color: #999; margin-left: 12px;">Remaining Balance: ₱${loan.remainingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>` : ''}
                      </div>
                    `}).join('')}
                    <div class="detail-row deduction-detail" style="border-top: 1px solid #ddd; margin-top: 2px; padding-top: 2px; font-weight: bold;">
                      <span>Subtotal:</span>
                      <span class="deduction">-₱${loansTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                `
          }

          // Show [DEDUCTION] items under Deduction Payments
          if (deductionLoans.length > 0) {
            html += `
                  <div class="deduction-section">
                    <div class="deduction-title">Deduction Payments:</div>
                    ${deductionLoans.map((loan: any) => {
              // Clean up deduction name - remove [DEDUCTION] prefix and percentage details
              let deductionName = (loan.description || loan.type || 'Deduction').replace(/^\[DEDUCTION\]\s*/i, '').split('(')[0].trim();
              return `
                      <div style="margin-bottom: 4px;">
                        <div class="detail-row deduction-detail">
                          <span style="font-weight: 500;">${deductionName}</span>
                          <span class="deduction" style="font-weight: bold;">-₱${loan.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        ${loan.originalAmount ? `<div style="font-size: 7px; color: #999; margin-left: 12px;">Total Amount: ₱${loan.originalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>` : ''}
                        ${loan.remainingBalance && loan.remainingBalance > 0 ? `<div style="font-size: 7px; color: #999; margin-left: 12px;">Remaining Balance: ₱${loan.remainingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>` : ''}
                      </div>
                    `}).join('')}
                  </div>
                `
          }

          return html
        })()}
            
            ${(() => {
          const mandatoryDeductions = breakdown.otherDeductionDetails?.filter((d: any) => d.isMandatory) || []
          const otherDeductions = breakdown.otherDeductionDetails?.filter((d: any) => !d.isMandatory) || []

          let html = ''

          if (mandatoryDeductions.length > 0) {
            const mandatoryTotal = mandatoryDeductions.reduce((sum: number, d: any) => sum + d.amount, 0);
            html += `
                  <div class="deduction-section">
                    <div class="deduction-title">Mandatory Deductions: (${mandatoryDeductions.length} item${mandatoryDeductions.length > 1 ? 's' : ''})</div>
                    ${mandatoryDeductions.map((deduction: any) => {
              // Clean up mandatory deduction name - remove percentage details
              const deductionName = (deduction.type || 'Deduction').split('(')[0].trim();
              const calcType = deduction.calculationType === 'PERCENTAGE' && deduction.percentageValue
                ? `${deduction.percentageValue}% of salary`
                : 'Fixed amount';
              return `
                      <div style="margin-bottom: 4px;">
                        <div class="detail-row deduction-detail">
                          <span style="font-weight: 500;">${deductionName}</span>
                          <span class="deduction" style="font-weight: bold;">-₱${deduction.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div style="font-size: 7px; color: #999; margin-left: 12px;">${calcType}</div>
                      </div>
                    `}).join('')}
                    <div class="detail-row deduction-detail" style="border-top: 1px solid #ddd; margin-top: 2px; padding-top: 2px; font-weight: bold;">
                      <span>Subtotal:</span>
                      <span class="deduction">-₱${mandatoryTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                `
          }

          if (otherDeductions.length > 0) {
            html += `
                  <div class="deduction-section">
                    <div class="deduction-title">Deduction Payments:</div>
                    ${otherDeductions.map((deduction: any) => {
              // Clean up deduction name - remove [DEDUCTION] prefix and percentage details
              let deductionName = deduction.type || deduction.description || 'Deduction';
              deductionName = deductionName.replace(/^\[DEDUCTION\]\s*/i, '').split('(')[0].trim();
              return `
                      <div style="margin-bottom: 4px;">
                        <div class="detail-row deduction-detail">
                          <span style="font-weight: 500;">${deductionName}</span>
                          <span class="deduction" style="font-weight: bold;">-₱${deduction.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        ${deduction.originalAmount ? `<div style="font-size: 7px; color: #999; margin-left: 12px;">Total Amount: ₱${deduction.originalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>` : ''}
                        ${deduction.remainingBalance && deduction.remainingBalance > 0 ? `<div style="font-size: 7px; color: #999; margin-left: 12px;">Remaining Balance: ₱${deduction.remainingBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>` : ''}
                      </div>
                    `}).join('')}
                  </div>
                `
          }

          return html
        })()}
            
            <div class="detail-row net-pay">
              <span>NET PAY:</span>
              <span>₱${(breakdown.netPay || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
          
          <div class="signatures">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">Emma L. Mactao</div>
              <div class="sig-sublabel">Brgy Treasurer</div>
            </div>
            <div class="sig-box">
              <div class="sig-line"></div>
              <div class="sig-label">${employee.name || 'Staff Name'}</div>
              <div class="sig-sublabel">Received by</div>
            </div>
          </div>
        </div>
      `
    }

    // Group payslips into pages of 6
    const employeesPerPage = 6
    const pages = []
    for (let i = 0; i < payslipData.length; i += employeesPerPage) {
      pages.push(payslipData.slice(i, i + employeesPerPage))
    }

    console.log('📄 Generated', pages.length, 'pages')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <!-- Version: ${Date.now()} -->
        <meta charset="utf-8">
        <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
        <meta http-equiv="Pragma" content="no-cache">
        <meta http-equiv="Expires" content="0">
        <title>Payroll Slips - Perfect Layout</title>
        <style>
          @page {
            size: 8.5in 13in;
            margin: 0.15in;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            background: white;
            margin: 0;
            padding: 0;
          }
          .page {
            width: 8.4in;
            height: 12.7in;
            margin: 0;
            padding: 0.05in;
            page-break-after: always;
            position: relative;
          }
          .page:last-child {
            page-break-after: avoid;
          }
          .payslip-card {
            width: 4.0in;
            min-height: 4.2in;
            height: auto;
            border: 2px solid #000;
            padding: 8px;
            font-size: 14px;
            line-height: 1.4;
            display: flex;
            flex-direction: column;
            background: white;
            box-sizing: border-box;
            overflow: visible;
            position: absolute;
          }
          .payslip-card:nth-child(1) { top: 0.1in; left: 0.05in; }
          .payslip-card:nth-child(2) { top: 0.1in; left: 4.15in; }
          .payslip-card:nth-child(3) { top: 4.0in; left: 0.05in; }
          .payslip-card:nth-child(4) { top: 4.0in; left: 4.15in; }
          .payslip-card:nth-child(5) { top: 7.9in; left: 0.05in; }
          .payslip-card:nth-child(6) { top: 7.9in; left: 4.15in; }
          .payslip-header {
            text-align: center;
            margin-bottom: 8px;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            font-size: 16px;
          }
          .logo-container {
            margin-bottom: 2px;
          }
          .logo {
            height: 40px;
            width: auto;
            max-width: 120px;
            object-fit: contain;
          }
          .school-name {
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 2px;
          }
          .school-address, .system-name, .custom-text {
            font-size: 9px;
            color: #666;
            margin-bottom: 2px;
          }
          .payslip-title {
            font-weight: bold;
            margin-top: 4px;
            font-size: 15px;
            text-align: center;
            border-top: 1px solid #ccc;
            padding-top: 4px;
          }
          .employee-info {
            margin-bottom: 4px;
            font-size: 12px;
          }
          .info-row {
            margin-bottom: 2px;
            display: flex;
            justify-content: space-between;
          }
          .label {
            font-weight: bold;
          }
          .value {
            margin-left: 3px;
          }
          .payroll-details {
            flex: 1;
            margin: 2px 0;
            border-top: 1px solid #ccc;
            padding-top: 2px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
            font-size: 12px;
          }
          .detail-row.total {
            border-top: 1px solid #000;
            padding-top: 0.5px;
            font-weight: bold;
          }
          .detail-row.net-pay {
            border-top: 2px solid #000;
            padding-top: 4px;
            font-weight: bold;
            font-size: 13px;
            margin-top: 3px;
          }
          .deduction {
            color: #d32f2f;
          }
          .deduction-section {
            margin: 1px 0;
            border-left: 1px solid #ccc;
            padding-left: 2px;
          }
          .deduction-title {
            font-size: 10px;
            font-weight: bold;
            color: #666;
            margin-bottom: 2px;
          }
          .deduction-detail {
            margin-left: 4px;
            font-size: 9px;
          }
          .status {
            margin-top: 4px;
            font-size: 11px;
            text-align: center;
            color: #666;
          }
          .signatures {
            margin-top: 8px;
            display: flex;
            justify-content: space-between;
            gap: 4px;
            border-top: 1px solid #ccc;
            padding-top: 6px;
          }
          .sig-box {
            flex: 1;
            text-align: center;
            font-size: 9px;
          }
          .sig-line {
            border-top: 1px solid #000;
            margin: 20px 4px 2px 4px;
          }
          .sig-label {
            font-weight: bold;
            font-size: 10px;
            margin-top: 2px;
          }
          .sig-sublabel {
            font-size: 8px;
            color: #666;
            margin-top: 1px;
          }
          .sig-date {
            font-size: 8px;
            color: #666;
            margin-top: 3px;
          }
        </style>
        <script>
          // Auto-print on load
          window.onload = function() {
            console.log('Payslip page loaded - auto printing...');
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </head>
      <body>
        ${pages.map((pageEmployees, pageIndex) => `
          <div class="page">
            ${pageEmployees.map(employee => generatePayslipHTML(employee)).join('')}
          </div>
        `).join('')}
      </body>
      </html>
    `

    console.log('✅ Generated HTML content successfully')

    // Return HTML content with cache-busting headers
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })

  } catch (error) {
    console.error('❌ Error generating screenshot payslips:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    })
    return NextResponse.json(
      {
        error: 'Failed to generate payslips',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}