import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { z } from "zod"
import { randomUUID } from "crypto"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  amount: z.number().min(0).optional(),
  calculationType: z.enum(['FIXED', 'PERCENTAGE']).optional(),
  percentageValue: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  isMandatory: z.boolean().optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  try {
    const body = await req.json()
    const data = updateSchema.parse(body)

    // Fetch existing type to compare and for defaults
    const existing = await prisma.deduction_types.findUnique({
      where: { deduction_types_id: id },
      include: { deductions: { select: { deductions_id: true, users_id: true } } }
    })
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    // Prepare update payload
    const updateData: any = {
      ...('name' in data ? { name: data.name } : {}),
      ...('description' in data ? { description: data.description } : {}),
      ...('isActive' in data ? { isActive: data.isActive } : {}),
      ...('isMandatory' in data ? { isMandatory: data.isMandatory } : {}),
    }
    if (data.calculationType) updateData.calculationType = data.calculationType
    if (data.calculationType === 'FIXED') {
      // For FIXED, ensure amount provided
      if (typeof data.amount === 'number') updateData.amount = data.amount
      // Clear percentage
      updateData.percentageValue = null
    } else if (data.calculationType === 'PERCENTAGE') {
      // For PERCENTAGE, ensure percentage provided
      if (typeof data.percentageValue === 'number') updateData.percentageValue = data.percentageValue
      // Amount for type is not used directly
      if (typeof data.amount === 'number') updateData.amount = data.amount
    } else {
      // No change to calculationType; allow updating fields individually
      if (typeof data.amount === 'number') updateData.amount = data.amount
      if (typeof data.percentageValue === 'number') updateData.percentageValue = data.percentageValue
    }

    const updated = await prisma.deduction_types.update({ where: { deduction_types_id: id }, data: updateData })

    // Recalculate existing deduction amounts if calculation-related fields changed
    const calcTypeChanged = data.calculationType && data.calculationType !== existing.calculationType
    const amountChanged = typeof data.amount === 'number'
    const percentChanged = typeof data.percentageValue === 'number'

    if (calcTypeChanged || amountChanged || percentChanged) {
      // Load existing deductions with user salaries
      const deductions = await prisma.deductions.findMany({
        where: { deduction_types_id: id },
        select: {
          deductions_id: true,
          users_id: true,
          users: { select: { personnel_types: { select: { basicSalary: true } } } }
        }
      })

      const tx = deductions.map(d => {
        let newAmount = updated.amount
        if (updated.calculationType === 'PERCENTAGE' && updated.percentageValue != null) {
          const salary = d.users.personnel_types?.basicSalary
          if (salary) {
            // Decimal operations: use Prisma Decimal methods via any
            // Convert to number-safe by using mul/div available on Decimal
            // @ts-ignore
            newAmount = salary.mul(updated.percentageValue).div(100)
          } else {
            // No salary available, fallback to 0
            newAmount = new Prisma.Decimal(0)
          }
        }
        return prisma.deductions.update({
          where: { deductions_id: d.deductions_id },
          data: { amount: newAmount }
        })
      })

      if (tx.length > 0) {
        await prisma.$transaction(tx)
      }
    }

    // NOTE: Removed automatic application of mandatory deductions to all personnel
    // Users should manually apply deductions using the "Apply Mandatory Deductions" button
    // This prevents unwanted automatic application when editing deduction types

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update" }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  await prisma.deductions.deleteMany({ where: { deduction_types_id: id } })
  await prisma.deduction_types.delete({ where: { deduction_types_id: id } })
  return NextResponse.json({ success: true })
}




