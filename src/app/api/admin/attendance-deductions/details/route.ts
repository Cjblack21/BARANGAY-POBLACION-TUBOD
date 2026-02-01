import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Fetch all deductions for this user
    const deductions = await prisma.deductions.findMany({
      where: {
        users_id: userId,
        archivedAt: null,
        deduction_types: {
          OR: [
            { name: { contains: 'Attendance' } },
            { name: { contains: 'Late' } },
            { name: { contains: 'Absent' } },
            { name: { contains: 'Tardiness' } }
          ]
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

    // Calculate total late minutes from the notes field
    let totalLateMinutes = 0
    deductions.forEach(deduction => {
      const notes = deduction.notes || ''
      const lateMatch = notes.match(/Late: (\d+)h (\d+)m/)
      if (lateMatch) {
        const hours = parseInt(lateMatch[1])
        const minutes = parseInt(lateMatch[2])
        totalLateMinutes += (hours * 60) + minutes
      }
    })

    return NextResponse.json({
      deductions: deductions.map(d => ({
        deductions_id: d.deductions_id,
        deductionType: d.deduction_types.name,
        amount: Number(d.amount),
        notes: d.notes,
        appliedAt: d.appliedAt.toISOString()
      })),
      totalLateMinutes
    })

  } catch (error) {
    console.error('Error fetching attendance deduction details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attendance deduction details' },
      { status: 500 }
    )
  }
}
