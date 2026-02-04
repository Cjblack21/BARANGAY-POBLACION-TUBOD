import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { amount, purpose, termMonths, monthlyPaymentPercent } = body

        // Validation
        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid loan amount' }, { status: 400 })
        }

        if (!purpose || purpose.trim() === '') {
            return NextResponse.json({ error: 'Purpose is required' }, { status: 400 })
        }

        if (!termMonths || termMonths <= 0) {
            return NextResponse.json({ error: 'Invalid term months' }, { status: 400 })
        }

        if (!monthlyPaymentPercent || monthlyPaymentPercent <= 0) {
            return NextResponse.json({ error: 'Invalid monthly payment percentage' }, { status: 400 })
        }

        // Calculate dates
        const startDate = new Date()
        const endDate = new Date()
        endDate.setMonth(endDate.getMonth() + termMonths)

        // Create loan request with PENDING status
        const loan = await prisma.loans.create({
            data: {
                loans_id: uuidv4(),
                users_id: session.user.id,
                amount: amount,
                balance: amount, // Full amount until approved
                monthlyPaymentPercent: monthlyPaymentPercent,
                termMonths: termMonths,
                status: 'PENDING' as any,
                startDate: startDate,
                endDate: endDate,
                purpose: purpose.trim(),
                updatedAt: new Date()
            }
        })

        return NextResponse.json({
            success: true,
            loan: {
                loans_id: loan.loans_id,
                amount: Number(loan.amount),
                purpose: loan.purpose,
                termMonths: loan.termMonths,
                monthlyPaymentPercent: Number(loan.monthlyPaymentPercent),
                status: loan.status,
                createdAt: loan.createdAt
            }
        })

    } catch (error) {
        console.error('Error creating loan request:', error)
        return NextResponse.json(
            {
                error: 'Failed to create loan request',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
