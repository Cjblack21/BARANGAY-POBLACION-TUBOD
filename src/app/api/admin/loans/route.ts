import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').toLowerCase()
    const archived = searchParams.get('archived') === 'true'

    const loans = await prisma.loans.findMany({
      where: archived ? { archivedAt: { not: null } } : { archivedAt: null },
      include: {
        users: {
          select: {
            users_id: true,
            name: true,
            email: true,
            personnel_types: {
              select: {
                department: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const items = loans.filter(l => {
      const name = (l.users?.name || '').toLowerCase()
      const email = (l.users?.email || '').toLowerCase()
      return !q || name.includes(q) || email.includes(q)
    }).map(l => ({
      loans_id: l.loans_id,
      users_id: l.users_id,
      userName: l.users?.name ?? null,
      userEmail: l.users?.email || '',
      department: l.users?.personnel_types?.department ?? null,
      amount: Number(l.amount),
      balance: Number(l.balance),
      monthlyPaymentPercent: Number(l.monthlyPaymentPercent),
      termMonths: l.termMonths,
      status: l.status,
      purpose: l.purpose,
      createdAt: l.createdAt.toISOString(),
    }))

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error fetching loans:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({
      error: 'Failed to fetch loans',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { users_id, amount, purpose, monthlyPaymentPercent, termMonths } = body || {}

    if (!users_id || !amount || !termMonths) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const amt = Number(amount)
    const monthlyPercent = Number(monthlyPaymentPercent || 0)
    const term = Number(termMonths)
    if (!(amt > 0) || !(term > 0) || monthlyPercent < 0) {
      return NextResponse.json({ error: 'Invalid input values' }, { status: 400 })
    }

    // Get user info + salary
    const user = await prisma.users.findUnique({
      where: { users_id },
      select: {
        name: true,
        personnel_types: {
          select: { basicSalary: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const monthlySalary = Number(user.personnel_types?.basicSalary || 0)

    if (monthlySalary > 0) {
      // Calculate monthly payment for this new loan
      const newLoanMonthlyPayment = (amt * monthlyPercent) / 100

      // Get existing active loans for this user
      const existingLoans = await prisma.loans.findMany({
        where: { users_id, status: 'ACTIVE', archivedAt: null }
      })

      const existingLoanPayments = existingLoans.reduce((sum, loan) => {
        return sum + (Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100
      }, 0)

      // Get existing deductions for this user
      const existingDeductions = await prisma.deductions.findMany({
        where: { users_id, archivedAt: null }
      })

      const totalExistingDeductions = existingDeductions.reduce((sum, d) => {
        return sum + Number(d.amount)
      }, 0)

      const totalMonthlyObligations = existingLoanPayments + totalExistingDeductions + newLoanMonthlyPayment

      // Block if total would exceed 100% of salary (can't deduct more than they earn)
      if (totalMonthlyObligations > monthlySalary) {
        const available = monthlySalary - (existingLoanPayments + totalExistingDeductions)
        return NextResponse.json({
          error: `Cannot add loan/deduction. Total monthly deductions (₱${totalMonthlyObligations.toFixed(2)}) would exceed the staff's monthly salary (₱${monthlySalary.toFixed(2)}). Available: ₱${Math.max(0, available).toFixed(2)}`
        }, { status: 400 })
      }
    }

    // Calculate start and end dates
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + term)

    // initial balance is the amount
    const created = await prisma.loans.create({
      data: {
        loans_id: randomUUID(),
        users_id,
        amount: amt,
        balance: amt,
        monthlyPaymentPercent: monthlyPercent,
        termMonths: term,
        status: 'ACTIVE',
        startDate,
        endDate,
        purpose: purpose || null,
        updatedAt: new Date(),
      }
    })

    return NextResponse.json({ loan_id: created.loans_id }, { status: 201 })
  } catch (error) {
    console.error('Error creating loan:', error)
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 })
  }
}



