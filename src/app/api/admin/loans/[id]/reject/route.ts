import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id || session.user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const { id: loanId } = await params
        const body = await request.json().catch(() => ({}))
        const { reason } = body

        // Find the loan
        const loan = await prisma.loans.findUnique({
            where: { loans_id: loanId },
            include: {
                users: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        })

        if (!loan) {
            return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
        }

        if (loan.status !== 'PENDING' as any) {
            return NextResponse.json(
                { error: 'Only pending loans can be rejected' },
                { status: 400 }
            )
        }

        // Update loan to REJECTED status
        const updatedLoan = await prisma.loans.update({
            where: { loans_id: loanId },
            data: {
                status: 'REJECTED' as any,
                purpose: reason ? `${loan.purpose} [REJECTED: ${reason}]` : loan.purpose,
                updatedAt: new Date()
            }
        })

        return NextResponse.json({
            success: true,
            loan: {
                loans_id: updatedLoan.loans_id,
                status: updatedLoan.status,
                userName: loan.users.name
            }
        })

    } catch (error) {
        console.error('Error rejecting loan:', error)
        return NextResponse.json(
            {
                error: 'Failed to reject loan',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    } finally {
        await prisma.$disconnect()
    }
}
