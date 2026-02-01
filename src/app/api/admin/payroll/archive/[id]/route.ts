import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: periodKey } = await params

    console.log(`DELETE REQUEST - Period Key: ${periodKey}`)

    let periodStart: Date
    let periodEnd: Date

    // Check if it's the date-based format (YYYY-MM-DD_YYYY-MM-DD)
    if (periodKey.includes('_') && !periodKey.includes('T')) {
      // Date-based format: 2025-12-31_2026-02-01
      const [startDate, endDate] = periodKey.split('_')
      periodStart = new Date(startDate)
      periodEnd = new Date(endDate)

      // Set to start and end of day to match database entries
      periodStart.setHours(0, 0, 0, 0)
      periodEnd.setHours(23, 59, 59, 999)

      console.log(`Parsed date format - Start: ${periodStart.toISOString()}, End: ${periodEnd.toISOString()}`)
    } else {
      // ISO timestamp format: 2026-01-25T16:00:00.000Z-2026-02-01T15:59:59.999Z
      const middleIndex = periodKey.lastIndexOf('Z-')
      if (middleIndex === -1) {
        return NextResponse.json({ error: 'Invalid period ID format' }, { status: 400 })
      }

      const startISO = periodKey.substring(0, middleIndex + 1)
      const endISO = periodKey.substring(middleIndex + 2)

      periodStart = new Date(startISO)
      periodEnd = new Date(endISO)

      console.log(`Parsed ISO format - Start: ${startISO}, End: ${endISO}`)
    }

    // Get ALL payroll entries and find matching ones
    const allEntries = await prisma.payroll_entries.findMany({
      select: {
        payroll_entries_id: true,
        periodStart: true,
        periodEnd: true,
        status: true
      }
    })

    console.log(`Total entries in DB: ${allEntries.length}`)

    // Find entries that match this period (with some tolerance for time differences)
    const matchingIds = allEntries
      .filter(entry => {
        const startDiff = Math.abs(entry.periodStart.getTime() - periodStart.getTime())
        const endDiff = Math.abs(entry.periodEnd.getTime() - periodEnd.getTime())
        // Within 24 hours tolerance to account for timezone differences
        return startDiff < 86400000 && endDiff < 86400000
      })
      .map(e => e.payroll_entries_id)

    console.log(`Found ${matchingIds.length} matching entries to delete`)

    if (matchingIds.length === 0) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message: 'No matching entries found (already deleted or never existed)'
      })
    }

    // DELETE THEM ALL
    const deleteResult = await prisma.payroll_entries.deleteMany({
      where: {
        payroll_entries_id: {
          in: matchingIds
        }
      }
    })

    console.log(`✅ DELETED ${deleteResult.count} entries`)

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      message: `Deleted ${deleteResult.count} payroll entries`
    })

  } catch (error) {
    console.error('Error deleting archived payroll:', error)
    console.error('Error details:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({
      error: 'Failed to delete archived payroll',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}





