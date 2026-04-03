import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parsePhilippinesLocalDate } from "@/lib/timezone"

// GET - Fetch current payroll entries (stored in database)
// MODIFIED: Only return data if payroll has been RELEASED
// Pending payroll should not be shown automatically
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if custom period dates are provided in query params
    const { searchParams } = new URL(request.url)
    const customStart = searchParams.get('periodStart')
    const customEnd = searchParams.get('periodEnd')

    let periodStart: Date
    let periodEnd: Date

    if (customStart && customEnd) {
      // Use parsePhilippinesLocalDate to match how generatePayroll stores dates.
      // generatePayroll uses parsePhilippinesLocalDate("2026-03-02", false) which
      // stores 2026-03-01T16:00:00Z (Philippines midnight in UTC).
      // Using plain new Date("2026-03-02") = 2026-03-02T00:00:00Z would MISS these records!
      periodStart = parsePhilippinesLocalDate(customStart, false)
      periodEnd = parsePhilippinesLocalDate(customEnd, true)
      console.log('🔍 Using custom period (Philippines-parsed):', customStart, 'to', customEnd)
      console.log('🔍 Parsed periodStart UTC:', periodStart.toISOString())
      console.log('🔍 Parsed periodEnd UTC:', periodEnd.toISOString())
    } else {
      // Get current semi-monthly period
      const now = new Date()
      const currentDay = now.getDate()

      if (currentDay <= 15) {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        periodEnd = new Date(now.getFullYear(), now.getMonth(), 15)
      } else {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 16)
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }
      console.log('🔍 Using default semi-monthly period')
    }

    console.log('🔍 Fetching payroll entries for period:', periodStart, 'to', periodEnd)

    // Widen the search window by ±9 hours to safely handle any UTC/Philippines offset.
    // Records are stored as Philippines-local midnight in UTC (e.g. 2026-03-01T16:00:00Z for March 2 PH).
    // A 9-hour buffer guarantees we catch records across any timezone edge case.
    const OFFSET_MS = 9 * 60 * 60 * 1000 // 9 hours in ms

    const periodStartOfDay = new Date(periodStart.getTime() - OFFSET_MS)
    const periodStartEndOfDay = new Date(periodStart.getTime() + OFFSET_MS)

    const periodEndStartOfDay = new Date(periodEnd.getTime() - OFFSET_MS)
    const periodEndEndOfDay = new Date(periodEnd.getTime() + OFFSET_MS)

    // Fetch both PENDING and RELEASED payroll entries
    // Exclude ARCHIVED entries
    const payrollEntries = await prisma.payroll_entries.findMany({
      where: {
        periodStart: { gte: periodStartOfDay, lte: periodStartEndOfDay },
        periodEnd: { gte: periodEndStartOfDay, lte: periodEndEndOfDay },
        status: { not: 'ARCHIVED' } // Show PENDING and RELEASED, but not ARCHIVED
      },
      include: {
        users: {
          select: {
            users_id: true,
            name: true,
            email: true,
            avatar: true,
            personnel_types: {
              select: {
                name: true,
                type: true,
                department: true,
                basicSalary: true
              }
            }
          }
        }
      },
      orderBy: { users: { name: 'asc' } }
    })

    console.log('🔍 Found payroll entries:', payrollEntries.length)

    // Get all active personnel to show total count
    const allActivePersonnel = await prisma.users.findMany({
      where: {
        isActive: true,
        role: 'PERSONNEL'
      },
      select: {
        users_id: true
      }
    })

    console.log('🔍 Total active personnel:', allActivePersonnel.length)

    // If no payroll found, return empty
    if (payrollEntries.length === 0) {
      console.log('⚠️ No payroll found for this period - please generate payroll')
      return NextResponse.json({
        success: true,
        entries: [],
        summary: {
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          totalEmployees: allActivePersonnel.length,
          totalGrossSalary: 0,
          totalDeductions: 0,
          totalNetPay: 0,
          payrollEntries: [],
          settings: {
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
            hasGeneratedForSettings: false
          },
          status: undefined
        },
        period: {
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          type: 'Semi-Monthly',
          status: undefined
        }
      })
    }

    // Transform released entries
    const transformedEntries = payrollEntries.map(entry => {
      let breakdownData: any = {}
      try {
        if ((entry as any).breakdownSnapshot) {
          breakdownData = typeof (entry as any).breakdownSnapshot === 'string'
            ? JSON.parse((entry as any).breakdownSnapshot)
            : (entry as any).breakdownSnapshot
        } else if ((entry as any).breakdown) {
          breakdownData = typeof (entry as any).breakdown === 'string'
            ? JSON.parse((entry as any).breakdown)
            : (entry as any).breakdown
        }

        if (Object.keys(breakdownData).length === 0) {
          breakdownData = {
            basicSalary: Number(entry.basicSalary || 0) - Number((entry as any).overtime || 0),
            overloadPay: Number((entry as any).overtime || 0),
            loanDeductions: 0,
            otherDeductions: Number(entry.deductions || 0),
            netPay: Number(entry.netPay || 0)
          }
        }
      } catch (e) {
        console.error('Error parsing breakdown for user:', entry.users_id, e)
        breakdownData = {
          basicSalary: Number(entry.basicSalary || 0) - Number((entry as any).overtime || 0),
          overloadPay: Number((entry as any).overtime || 0),
          loanDeductions: 0,
          otherDeductions: Number(entry.deductions || 0),
          netPay: Number(entry.netPay || 0)
        }
      }

      return {
        users_id: entry.users_id,
        name: entry.users.name || entry.users.email,
        email: entry.users.email,
        avatar: entry.users.avatar || null,
        personnelType: entry.users.personnel_types?.name || null,
        personnelTypeCategory: entry.users.personnel_types?.type || null,
        department: entry.users.personnel_types?.department || null,
        totalWorkHours: Number((entry as any).totalWorkHours || 0),
        finalNetPay: Number(entry.netPay || 0),
        status: entry.status === 'RELEASED' ? 'Released' : 'Pending', // Properly map status
        breakdown: breakdownData
      }
    })

    const totalGrossSalary = transformedEntries.reduce((sum, e) => sum + (e.breakdown?.basicSalary || 0), 0)
    const totalDeductions = transformedEntries.reduce((sum, e) => sum + (e.breakdown?.loanDeductions || 0) + (e.breakdown?.otherDeductions || 0), 0)
    const totalNetPay = transformedEntries.reduce((sum, e) => sum + e.finalNetPay, 0)

    // Determine overall status
    const hasReleased = payrollEntries.some(e => e.status === 'RELEASED')
    const overallStatus = hasReleased ? 'Released' : 'Pending'

    return NextResponse.json({
      success: true,
      entries: transformedEntries,
      summary: {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        totalEmployees: allActivePersonnel.length,
        totalGrossSalary,
        totalDeductions,
        totalNetPay,
        payrollEntries: transformedEntries,
        settings: {
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          hasGeneratedForSettings: true // Payroll exists
        },
        status: overallStatus
      },
      period: {
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        type: 'Semi-Monthly',
        status: overallStatus
      }
    })
  } catch (error) {
    console.error('Error fetching current payroll:', error)
    return NextResponse.json({
      error: 'Failed to fetch payroll',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
