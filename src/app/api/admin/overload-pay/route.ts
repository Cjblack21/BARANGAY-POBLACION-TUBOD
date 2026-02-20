import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

// GET - Fetch all overload pay records (active by default, archived with ?archived=true)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const archived = searchParams.get("archived") === "true"

    const overloadPays = await prisma.overload_pays.findMany({
      where: archived ? { archivedAt: { not: null } } : { archivedAt: null },
      include: {
        users: {
          select: {
            users_id: true,
            name: true,
            email: true,
            personnel_types: {
              select: {
                name: true,
                department: true
              }
            }
          }
        }
      },
      orderBy: archived ? { archivedAt: "desc" } : { createdAt: "desc" }
    })

    return NextResponse.json(overloadPays)
  } catch (error) {
    console.error("Error fetching overload pay:", error)
    return NextResponse.json({ error: "Failed to fetch overload pay" }, { status: 500 })
  }
}

// POST - Create new overload pay record(s)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { amount, notes, type, selectAll, employees } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    let targetEmployees: string[] = []

    if (selectAll) {
      // Get all active personnel
      const allPersonnel = await prisma.users.findMany({
        where: { role: "PERSONNEL", isActive: true },
        select: { users_id: true }
      })
      targetEmployees = allPersonnel.map(p => p.users_id)
    } else {
      if (!employees || employees.length === 0) {
        return NextResponse.json({ error: "No employees selected" }, { status: 400 })
      }
      targetEmployees = employees
    }

    // Create overload pay records for all target employees
    const records = await prisma.overload_pays.createMany({
      data: targetEmployees.map(userId => ({
        overload_pays_id: randomUUID(),
        users_id: userId,
        amount: Number(amount),
        notes: notes || null,
        type: type || 'OVERTIME',
        appliedAt: new Date(),
        updatedAt: new Date()
      }))
    })

    return NextResponse.json({
      success: true,
      message: `Additional pay added to ${targetEmployees.length} employee(s)`,
      count: records.count
    })
  } catch (error) {
    console.error("Error creating additional pay:", error)
    console.error("Error details:", error instanceof Error ? error.message : String(error))
    return NextResponse.json({
      error: "Failed to create additional pay",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
