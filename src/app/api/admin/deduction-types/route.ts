import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { randomUUID } from "crypto"

const typeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().min(0),
  calculationType: z.enum(['FIXED', 'PERCENTAGE']).optional().default('FIXED'),
  percentageValue: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional().default(true),
  isMandatory: z.boolean().optional().default(false),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const types = await prisma.deduction_types.findMany({
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(types)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await req.json()
    const data = typeSchema.parse(body)

    const created = await prisma.deduction_types.create({
      data: {
        deduction_types_id: randomUUID(),
        ...data,
        updatedAt: new Date()
      }
    })

    // Note: Removed automatic application of mandatory deductions to all personnel
    // Admins must manually apply deductions using the Deductions page
    // This gives full control over which personnel receive which deductions

    return NextResponse.json(created, { status: 201 })
  } catch (error: any) {
    console.error('Error creating deduction type:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 })
    }
    // Handle Prisma unique constraint error
    if (error.code === 'P2002') {
      return NextResponse.json({
        error: "A deduction type with this name already exists. Please use a different name."
      }, { status: 400 })
    }
    return NextResponse.json({
      error: "Failed to create deduction type",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}




