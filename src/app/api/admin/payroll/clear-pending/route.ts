import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete all pending (non-released) payroll entries
    const result = await prisma.payroll_entries.deleteMany({
      where: {
        status: 'PENDING'
      }
    })

    console.log(`✅ Deleted ${result.count} pending payroll entries`)

    return NextResponse.json({ 
      success: true, 
      deletedCount: result.count,
      message: `Deleted ${result.count} pending payroll entries` 
    })

  } catch (error) {
    console.error('Error clearing pending payroll:', error)
    return NextResponse.json({ 
      error: 'Failed to clear pending payroll',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
