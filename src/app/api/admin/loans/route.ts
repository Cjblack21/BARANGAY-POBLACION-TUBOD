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

    // Get user's monthly salary
    const user = await prisma.users.findUnique({
      where: { users_id },
      select: {
        name: true,
        personnel_types: {
          select: {
            basicSalary: true
          }
        }
      }
    })

    if (!user || !user.personnel_types) {
      return NextResponse.json({ error: 'User not found or has no salary information' }, { status: 404 })
    }

    const monthlySalary = Number(user.personnel_types.basicSalary)

    // Calculate monthly payment for this new loan
    const newLoanMonthlyPayment = (amt * monthlyPercent) / 100

    // Get existing active loans for this user
    const existingLoans = await prisma.loans.findMany({
      where: {
        users_id,
        status: 'ACTIVE',
        archivedAt: null
      }
    })

    // Calculate total existing loan payments
    const existingLoanPayments = existingLoans.reduce((sum, loan) => {
      const monthlyPayment = (Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100
      return sum + monthlyPayment
    }, 0)

    // Get existing deductions for this user
    const existingDeductions = await prisma.deductions.findMany({
      where: {
        users_id,
        archivedAt: null
      }
    })

    // Calculate total existing deductions
    const totalExistingDeductions = existingDeductions.reduce((sum, deduction) => {
      return sum + Number(deduction.amount)
    }, 0)

    // Calculate total monthly obligations
    const totalMonthlyObligations = existingLoanPayments + totalExistingDeductions + newLoanMonthlyPayment

    // Validate: total obligations cannot exceed 80% of monthly salary (must keep at least 20% net pay)
    const maxAllowedDeductions = monthlySalary * 0.8 // 80% max
    const minimumNetPay = monthlySalary * 0.2 // 20% min
    
    if (totalMonthlyObligations > maxAllowedDeductions) {
      const available = maxAllowedDeductions - (existingLoanPayments + totalExistingDeductions)
      const projectedNetPay = monthlySalary - totalMonthlyObligations
      
      return NextResponse.json({ 
        error: `Cannot add loan. Total monthly deductions (₱${totalMonthlyObligations.toFixed(2)}) would exceed the maximum allowed (₱${maxAllowedDeductions.toFixed(2)}). Staff must keep at least 20% of salary (₱${minimumNetPay.toFixed(2)}) as net pay. Available for new loans/deductions: ₱${Math.max(0, available).toFixed(2)}`,
        details: {
          monthlySalary,
          maxAllowedDeductions,
          minimumNetPay,
          existingLoanPayments,
          existingDeductions: totalExistingDeductions,
          newLoanPayment: newLoanMonthlyPayment,
          totalObligations: totalMonthlyObligations,
          projectedNetPay,
          available: Math.max(0, available)
        }
      }, { status: 400 })
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



