import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'PERSONNEL') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // numeric 1..12
    const year = searchParams.get('year') // numeric YYYY

    // Build date filter
    let dateFilter: any = {}
    
    if (month && year) {
      // Filter by specific month and year
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1)
      const endDate = new Date(parseInt(year), parseInt(month), 0)
      endDate.setHours(23, 59, 59, 999)
      const today = new Date(); today.setHours(23, 59, 59, 999)
      const cappedEnd = endDate > today ? today : endDate
      
      dateFilter = {
        gte: startDate,
        lte: cappedEnd
      }
    } else if (year) {
      // Filter by year only
      const startDate = new Date(parseInt(year), 0, 1)
      const endDate = new Date(parseInt(year), 11, 31)
      endDate.setHours(23, 59, 59, 999)
      const today = new Date(); today.setHours(23, 59, 59, 999)
      const cappedEnd = endDate > today ? today : endDate
      
      dateFilter = {
        gte: startDate,
        lte: cappedEnd
      }
    } else {
      // Default: align with attendance settings period if configured; fallback to current month
      const settings = await prisma.attendance_settings.findFirst()
      if (settings?.periodStart && settings?.periodEnd) {
        const startDate = new Date(settings.periodStart)
        const endDate = new Date(settings.periodEnd)
        endDate.setHours(23, 59, 59, 999)
        const today = new Date(); today.setHours(23, 59, 59, 999)
        const cappedEnd = endDate > today ? today : endDate
        dateFilter = { gte: startDate, lte: cappedEnd }
      } else {
        const now = new Date()
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        endDate.setHours(23, 59, 59, 999)
        const today = new Date(); today.setHours(23, 59, 59, 999)
        const cappedEnd = endDate > today ? today : endDate
        dateFilter = { gte: startDate, lte: cappedEnd }
      }
    }

    // Attendance table doesn't exist yet - return empty data
    const attendanceRecords: any[] = []
    // const attendanceRecords = await prisma.attendances.findMany({
    //   where: {
    //     users_id: userId,
    //     date: dateFilter
    //   },
    //   orderBy: {
    //     date: 'desc'
    //   }
    // })

    // Calculate statistics
    const totalDays = 0
    const presentDays = 0
    const absentDays = 0
    const lateDays = 0
    const attendanceRate = '0'
    const totalHours = 0

    // Format attendance records
    const formattedRecords: any[] = []

    // Get attendance deductions for the user in the same period
    const deductions = await prisma.deductions.findMany({
      where: {
        users_id: userId,
        appliedAt: dateFilter,
        deduction_types: {
          name: {
            in: ['Late Arrival', 'Late Penalty', 'Absence Deduction', 'Absent', 'Late', 'Tardiness', 'Early Time-Out', 'Partial Attendance', 'Attendance Deduction']
          }
        }
      },
      include: {
        deduction_types: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        appliedAt: 'desc'
      }
    })

    const formattedDeductions = deductions.map(d => ({
      deductions_id: d.deductions_id,
      deductionType: d.deduction_types.name,
      amount: Number(d.amount),
      notes: d.notes || '',
      appliedAt: d.appliedAt
    }))

    return NextResponse.json({
      records: formattedRecords,
      statistics: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        attendanceRate: parseFloat(attendanceRate),
        totalHours: totalHours.toFixed(2)
      },
      period: {
        startDate: dateFilter.gte,
        endDate: dateFilter.lte
      },
      deductions: formattedDeductions
    })

  } catch (error) {
    console.error('Error fetching personnel attendance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance data' },
      { status: 500 }
    )
  }
}
