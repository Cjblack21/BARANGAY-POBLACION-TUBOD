import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete all mandatory deductions
    const result = await prisma.deductions.deleteMany({
      where: {
        deduction_types: {
          isMandatory: true
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Mandatory deductions reset successfully',
      deletedCount: result.count
    })
  } catch (error) {
    console.error('Error resetting mandatory deductions:', error)
    return NextResponse.json(
      { error: 'Failed to reset mandatory deductions' },
      { status: 500 }
    )
  }
}
