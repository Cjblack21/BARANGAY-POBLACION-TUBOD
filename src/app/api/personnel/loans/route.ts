import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

// Initialize Prisma client
const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const archived = searchParams.get('archived') === 'true'

    // Test database connection first
    try {
      await prisma.$connect()
    } catch (connectionError) {
      console.error('Database connection failed:', connectionError)
      return NextResponse.json(
        {
          error: 'Database connection failed',
          details: 'Please ensure MySQL is running and DATABASE_URL is configured'
        },
        { status: 500 }
      )
    }

    // Fetch loans
    const loans = await prisma.loans.findMany({
      where: {
        users_id: userId,
        archivedAt: archived ? { not: null } : null
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform data
    const loansData = loans.map(loan => {
      const loanAmount = Number(loan.amount || 0)
      const remainingBalance = Number(loan.balance || 0)
      const monthlyPaymentPercent = Number(loan.monthlyPaymentPercent || 0)
      const monthlyPayment = (loanAmount * monthlyPaymentPercent) / 100
      const biweeklyPayment = monthlyPayment / 2

      return {
        loans_id: loan.loans_id,
        users_id: loan.users_id,
        loanAmount,
        amount: loanAmount,
        balance: remainingBalance,
        remainingBalance,
        monthlyPayment,
        biweeklyPayment,
        monthlyPaymentPercent,
        termMonths: loan.termMonths,
        status: loan.status,
        startDate: loan.startDate,
        endDate: loan.endDate,
        purpose: loan.purpose,
        archivedAt: loan.archivedAt,
        createdAt: loan.createdAt,
        updatedAt: loan.updatedAt,
        totalPaymentsMade: loanAmount - remainingBalance
      }
    })

    const activeLoans = loansData.filter(l => l.status === 'ACTIVE')

    return NextResponse.json({
      loans: loansData,
      summary: {
        totalLoans: loans.length,
        activeLoans: activeLoans.length,
        completedLoans: loansData.filter(l => l.status === 'COMPLETED').length,
        totalActiveLoanAmount: activeLoans.reduce((sum, l) => sum + l.loanAmount, 0),
        totalMonthlyPayments: activeLoans.reduce((sum, l) => sum + l.monthlyPayment, 0),
        totalBiweeklyPayments: activeLoans.reduce((sum, l) => sum + l.biweeklyPayment, 0),
        totalRemainingBalance: activeLoans.reduce((sum, l) => sum + l.remainingBalance, 0)
      },
      paymentHistory: []
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch loans data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}







