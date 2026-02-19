import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { randomUUID } from "crypto"

const entrySchema = z.object({
  deduction_types_id: z.string().min(1),
  notes: z.string().optional(),
  selectAll: z.boolean().optional().default(false),
  employees: z.array(z.string()).optional(), // employees_id[] when not selectAll
})

const createSchema = z.union([
  entrySchema,
  z.object({ entries: z.array(entrySchema).min(1) })
])

type Entry = z.infer<typeof entrySchema>
type CreatePayload = Entry | { entries: Entry[] }

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const showArchived = searchParams.get('archived') === 'true'

  const deductions = await prisma.deductions.findMany({
    where: {
      archivedAt: showArchived ? { not: null } : null
    },
    include: {
      users: {
        select: {
          users_id: true,
          name: true,
          email: true,
          personnel_types: {
            select: {
              name: true,
              department: true,
              basicSalary: true
            }
          }
        }
      },
      deduction_types: true,
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(deductions)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json()
    const data: CreatePayload = createSchema.parse(body)

    const makeCreates = async (entry: Entry) => {
      let targetEmployeeIds: string[] = []
      if (entry.selectAll) {
        const activeUsers = await prisma.users.findMany({ where: { isActive: true, role: 'PERSONNEL' }, select: { users_id: true } })
        targetEmployeeIds = activeUsers.map((u) => u.users_id)
        if (targetEmployeeIds.length === 0) {
          throw new Error("No active personnel found")
        }
      } else if (entry.employees && entry.employees.length > 0) {
        targetEmployeeIds = entry.employees
      } else {
        throw new Error("No employees selected. Please select employees or enable 'Select All'")
      }

      // Get the deduction type with calculation details
      const deductionType = await prisma.deduction_types.findUnique({
        where: { deduction_types_id: entry.deduction_types_id },
        select: {
          amount: true,
          isMandatory: true,
          calculationType: true,
          percentageValue: true
        }
      })

      if (!deductionType) {
        throw new Error("Deduction type not found")
      }

      // Note: Removed automatic duplicate prevention for mandatory deductions
      // Admins can now manually create deductions even if they already exist
      // This allows for multiple instances of the same deduction type per employee if needed

      // Get user salaries for percentage calculation
      const users = await prisma.users.findMany({
        where: { users_id: { in: targetEmployeeIds } },
        select: {
          users_id: true,
          name: true,
          personnel_types: {
            select: { basicSalary: true }
          }
        }
      })

      // Get existing loans and deductions for validation
      const existingLoans = await prisma.loans.findMany({
        where: {
          users_id: { in: targetEmployeeIds },
          status: 'ACTIVE',
          archivedAt: null
        }
      })

      const existingDeductions = await prisma.deductions.findMany({
        where: {
          users_id: { in: targetEmployeeIds },
          archivedAt: null
        }
      })

      // Validate each user before creating deductions
      const validationErrors: string[] = []

      const createPromises = targetEmployeeIds.map((eid) => {
        const user = users.find(u => u.users_id === eid)

        if (!user || !user.personnel_types) {
          validationErrors.push(`User ${eid} has no salary information`)
          return null
        }

        const monthlySalary = Number(user.personnel_types.basicSalary)

        // Calculate deduction amount based on type
        let deductionAmount = deductionType.amount

        if (deductionType.calculationType === 'PERCENTAGE' && deductionType.percentageValue && user?.personnel_types) {
          // Calculate percentage of basic salary
          const salary = user.personnel_types.basicSalary
          deductionAmount = salary.mul(deductionType.percentageValue).div(100)
        }

        const newDeductionAmount = Number(deductionAmount)

        // Calculate existing obligations for this user
        const userLoans = existingLoans.filter(l => l.users_id === eid)
        const existingLoanPayments = userLoans.reduce((sum, loan) => {
          const monthlyPayment = (Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100
          return sum + monthlyPayment
        }, 0)

        const userDeductions = existingDeductions.filter(d => d.users_id === eid)
        const totalExistingDeductions = userDeductions.reduce((sum, deduction) => {
          return sum + Number(deduction.amount)
        }, 0)

        // Calculate total obligations including new deduction
        const totalMonthlyObligations = existingLoanPayments + totalExistingDeductions + newDeductionAmount

        // Validate: total obligations cannot exceed 80% of monthly salary (must keep at least 20% net pay)
        const maxAllowedDeductions = monthlySalary * 0.8 // 80% max
        const minimumNetPay = monthlySalary * 0.2 // 20% min

        if (totalMonthlyObligations > maxAllowedDeductions) {
          const available = maxAllowedDeductions - (existingLoanPayments + totalExistingDeductions)
          const projectedNetPay = monthlySalary - totalMonthlyObligations

          validationErrors.push(
            `${user.name || eid}: Cannot add deduction of ₱${newDeductionAmount.toFixed(2)}. ` +
            `Total monthly obligations (₱${totalMonthlyObligations.toFixed(2)}) would exceed the maximum allowed (₱${maxAllowedDeductions.toFixed(2)}). ` +
            `Staff must keep at least 20% of salary (₱${minimumNetPay.toFixed(2)}) as net pay. ` +
            `Available: ₱${Math.max(0, available).toFixed(2)}`
          )
          return null
        }

        return prisma.deductions.create({
          data: {
            deductions_id: randomUUID(),
            users_id: eid,
            deduction_types_id: entry.deduction_types_id,
            amount: deductionAmount,
            notes: entry.notes,
            updatedAt: new Date()
          },
        })
      })

      // If there are validation errors, return them with 400
      if (validationErrors.length > 0) {
        throw Object.assign(new Error(validationErrors[0]), { isValidation: true, errors: validationErrors })
      }

      // Filter out null values (shouldn't happen if validation passed)
      return createPromises.filter((p): p is ReturnType<typeof prisma.deductions.create> => p !== null)
    }

    const tx = 'entries' in data
      ? (await Promise.all(data.entries.map(makeCreates))).flat()
      : await makeCreates(data)

    const created = await prisma.$transaction(tx)
    return NextResponse.json({ count: created.length }, { status: 201 })
  } catch (error) {
    console.error('Error creating deductions:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 })
    }
    if (error instanceof Error && (error as any).isValidation) {
      // Net pay / validation errors - return 400 with details (same as loans route)
      return NextResponse.json({
        error: error.message,
        details: { errors: (error as any).errors }
      }, { status: 400 })
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ error: "Failed to create deductions" }, { status: 500 })
  }
}

