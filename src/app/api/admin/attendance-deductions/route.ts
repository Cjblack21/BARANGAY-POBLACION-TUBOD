import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch all attendance deductions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if we should fetch archived deductions
    const { searchParams } = new URL(request.url)
    const archived = searchParams.get('archived') === 'true'
    const userId = searchParams.get('userId') || undefined

    // Get attendance-related deductions based on archived flag
    const deductions = await prisma.deductions.findMany({
      where: {
        archivedAt: archived ? { not: null } : null,
        ...(userId ? { users_id: userId } : {}),
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
      include: {
        users: {
          select: {
            name: true,
            email: true
          }
        },
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
      users_id: d.users_id,
      staffName: d.users.name || d.users.email,
      deductionType: d.deduction_types.name,
      amount: Number(d.amount),
      notes: d.notes || '',
      appliedAt: d.appliedAt.toISOString(),
      archivedAt: d.archivedAt?.toISOString() || null
    }))

    return NextResponse.json({
      success: true,
      deductions: formattedDeductions
    })
  } catch (error) {
    console.error('Error fetching attendance deductions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deductions' },
      { status: 500 }
    )
  }
}

// POST - Add new attendance deduction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { users_id, lateMinutes, absentDays, amount, notes } = body

    if (!users_id || (lateMinutes === 0 && absentDays === 0)) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      )
    }

    // Get or create "Attendance Deduction" deduction type
    let deductionType = await prisma.deduction_types.findFirst({
      where: { name: 'Attendance Deduction' }
    })

    if (!deductionType) {
      // Create the deduction type if it doesn't exist
      deductionType = await prisma.deduction_types.create({
        data: {
          deduction_types_id: `DT-ATTENDANCE-${Date.now()}`,
          name: 'Attendance Deduction',
          description: 'Deductions for late arrivals and absences',
          amount: 0, // Variable amount
          isMandatory: false,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

    // Create the deduction
    const deduction = await prisma.deductions.create({
      data: {
        deductions_id: `DED-${users_id}-${Date.now()}`,
        users_id: users_id,
        deduction_types_id: deductionType.deduction_types_id,
        amount: amount,
        notes: notes || `Late: ${lateMinutes} min, Absent: ${absentDays} days`,
        appliedAt: new Date(),
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })

    console.log(`✅ Created attendance deduction for user ${users_id}: ₱${amount}`)

    return NextResponse.json({
      success: true,
      deduction: {
        deductions_id: deduction.deductions_id,
        amount: Number(deduction.amount)
      }
    })
  } catch (error) {
    console.error('Error creating attendance deduction:', error)
    return NextResponse.json(
      { error: 'Failed to create deduction' },
      { status: 500 }
    )
  }
}

// DELETE - Remove attendance deduction
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const deductionId = searchParams.get('id')

    if (!deductionId) {
      return NextResponse.json(
        { error: 'Deduction ID required' },
        { status: 400 }
      )
    }

    // Archive the deduction instead of deleting
    await prisma.deductions.update({
      where: { deductions_id: deductionId },
      data: {
        archivedAt: new Date()
      }
    })

    console.log(`✅ Archived attendance deduction ${deductionId}`)

    return NextResponse.json({
      success: true,
      message: 'Deduction deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting attendance deduction:', error)
    return NextResponse.json(
      { error: 'Failed to delete deduction' },
      { status: 500 }
    )
  }
}
