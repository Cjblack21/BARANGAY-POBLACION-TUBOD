import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generatePayslipsHTML, getHeaderSettings } from '@/lib/payslip-generator'

async function handlePayslipGeneration(periodStart: string | null, periodEnd: string | null, userId: string | null) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get header settings for payslip generation
    const headerSettings = await getHeaderSettings()
    
    if (!headerSettings) {
      return NextResponse.json({ error: 'Header settings not configured' }, { status: 400 })
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

    // Get released or archived payroll entries with all necessary data
    // Use date range to handle timezone differences
    const startOfDay = new Date(startDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(startDate)
    endOfDay.setHours(23, 59, 59, 999)
    
    const endStartOfDay = new Date(endDate)
    endStartOfDay.setHours(0, 0, 0, 0)
    const endEndOfDay = new Date(endDate)
    endEndOfDay.setHours(23, 59, 59, 999)
    
    const payrollEntries = await prisma.payroll_entries.findMany({
      where: {
        periodStart: { gte: startOfDay, lte: endOfDay },
        periodEnd: { gte: endStartOfDay, lte: endEndOfDay },
        status: { in: ['RELEASED', 'ARCHIVED'] },
        ...(userId ? { users_id: userId } : {})
      },
      include: {
        users: {
          include: {
            personnel_types: true
          }
        }
      }
    })

    if (payrollEntries.length === 0) {
      return NextResponse.json({ error: 'No released payroll entries found for this period' }, { status: 400 })
    }

    // Fetch detailed breakdown data for each employee
    const payslipData = await Promise.all(payrollEntries.map(async (entry) => {
      // Attendance system removed - no attendance records
      const attendanceRecords: any[] = []

      // Get deductions for this user
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
              appliedAt: {
                gte: startDate,
                lte: endDate
              }
            }
          ]
        },
        include: {
          deduction_types: true
        }
      })

      // Get active loans
      const loanRecords = await prisma.loans.findMany({
        where: {
          users_id: entry.users_id,
          status: 'ACTIVE'
        }
      })

      // Calculate period factor for loan payments
      const periodDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      const loanFactor = periodDays <= 16 ? 0.5 : 1.0

      // Build loan details
      const loanDetails = loanRecords.map(loan => {
        const monthlyPayment = Number(loan.amount) * Number(loan.monthlyPaymentPercent) / 100
        const periodPayment = monthlyPayment * loanFactor
        return {
          type: 'Loan Payment',
          amount: periodPayment,
          description: `${loan.purpose} (${loan.monthlyPaymentPercent}% of ₱${Number(loan.amount).toLocaleString()})`,
          remainingBalance: Number(loan.balance)
        }
      })

      // Build deduction details (excluding attendance-related deductions)
      const otherDeductionDetails = deductionRecords
        .filter((d: any) => 
          !d.deduction_types.name.includes('Late') &&
          !d.deduction_types.name.includes('Absent') &&
          !d.deduction_types.name.includes('Early') &&
          !d.deduction_types.name.includes('Partial') &&
          !d.deduction_types.name.includes('Tardiness')
        )
        .map((deduction: any) => ({
          type: deduction.deduction_types.name,
          amount: Number(deduction.amount),
          description: deduction.deduction_types.description || deduction.notes || '',
          calculationType: deduction.deduction_types.calculationType,
          percentageValue: deduction.deduction_types.percentageValue ? Number(deduction.deduction_types.percentageValue) : undefined,
          isMandatory: deduction.deduction_types.isMandatory
        }))

      // Parse breakdown snapshot to get stored deduction details
      let storedBreakdown: any = null
      if (entry.breakdownSnapshot) {
        try {
          storedBreakdown = typeof entry.breakdownSnapshot === 'string' 
            ? JSON.parse(entry.breakdownSnapshot) 
            : entry.breakdownSnapshot
        } catch (e) {
          console.error('Failed to parse breakdownSnapshot:', e)
        }
      }
      
      const attendanceDeductionDetails = storedBreakdown?.attendanceDeductionDetails || []
      const totalAttendanceDeductions = storedBreakdown?.attendanceDeductions || 0
      const storedLoanDetails = storedBreakdown?.loanDetails || []
      const storedOtherDeductionDetails = storedBreakdown?.deductionDetails || []
      
      // Calculate total work hours from attendance records
      const totalWorkHours = attendanceRecords.reduce((sum, record) => {
        let hours = 0
        if (record.timeIn && record.timeOut) {
          const timeIn = new Date(record.timeIn)
          const timeOut = new Date(record.timeOut)
          hours = Math.max(0, (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60))
        }
        return sum + hours
      }, 0)

      // Use stored breakdown details if available, otherwise fall back to live data
      const finalLoanDetails = storedLoanDetails.length > 0 ? storedLoanDetails : loanDetails
      const finalOtherDeductionDetails = storedOtherDeductionDetails.length > 0 ? storedOtherDeductionDetails : otherDeductionDetails
      
      const totalLoanPayments = finalLoanDetails.reduce((sum: number, loan: any) => sum + Number(loan.payment || loan.amount || 0), 0)
      const totalOtherDeductions = finalOtherDeductionDetails.reduce((sum: number, ded: any) => sum + Number(ded.amount || 0), 0)

      return {
        users_id: entry.users_id,
        name: entry.users.name,
        email: entry.users.email,
        totalHours: totalWorkHours,
        totalSalary: Number(entry.netPay),
        released: entry.status === 'RELEASED',
        breakdown: {
          biweeklyBasicSalary: Number(entry.basicSalary),
          realTimeEarnings: Number(entry.basicSalary) + Number(entry.overtime),
          realWorkHours: totalWorkHours,
          overtimePay: Number(entry.overtime),
          attendanceDeductions: totalAttendanceDeductions,
          nonAttendanceDeductions: totalOtherDeductions,
          loanPayments: totalLoanPayments,
          grossPay: Number(entry.basicSalary) + Number(entry.overtime),
          totalDeductions: Number(entry.deductions),
          netPay: Number(entry.netPay),
          deductionDetails: finalOtherDeductionDetails,
          loanDetails: finalLoanDetails,
          otherDeductionDetails: finalOtherDeductionDetails,
          attendanceDeductionDetails: attendanceDeductionDetails
        }
      }
    }))

    // Generate HTML using the full-featured payslip generator
    const html = generatePayslipsHTML(
      payslipData,
      {
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString()
      },
      headerSettings,
      6 // 6 payslips per page for Long Bond Paper
    )

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="payslips-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.html"`
      }
    })

  } catch (error) {
    console.error('Error generating payslips:', error)
    return NextResponse.json({ error: 'Failed to generate payslips' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const periodStart = searchParams.get('periodStart')
  const periodEnd = searchParams.get('periodEnd')
  const userId = searchParams.get('userId')
  return handlePayslipGeneration(periodStart, periodEnd, userId)
}

export async function POST(request: NextRequest) {
  const { periodStart, periodEnd, userId } = await request.json()
  return handlePayslipGeneration(periodStart, periodEnd, userId)
}
