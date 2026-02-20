import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE - Archive (soft-delete) an overload pay record, or permanently delete with ?permanent=true
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = await context.params
    const { id } = params
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get("permanent") === "true"

    if (permanent) {
      await prisma.overload_pays.delete({ where: { overload_pays_id: id } })
      return NextResponse.json({ success: true, message: "Permanently deleted" })
    }

    // Soft-delete: set archivedAt
    await prisma.overload_pays.update({
      where: { overload_pays_id: id },
      data: { archivedAt: new Date() }
    })

    return NextResponse.json({ success: true, message: "Additional pay archived" })
  } catch (error) {
    console.error("Error archiving overload pay:", error)
    return NextResponse.json({ error: "Failed to archive overload pay" }, { status: 500 })
  }
}

// PATCH - Restore an archived overload pay record
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = await context.params
    const { id } = params

    await prisma.overload_pays.update({
      where: { overload_pays_id: id },
      data: { archivedAt: null }
    })

    return NextResponse.json({ success: true, message: "Additional pay restored" })
  } catch (error) {
    console.error("Error restoring overload pay:", error)
    return NextResponse.json({ error: "Failed to restore overload pay" }, { status: 500 })
  }
}

// PUT - Update an overload pay record
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const params = await context.params
    const { id } = params
    const body = await request.json()
    const { amount, notes } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const updatedOverloadPay = await prisma.overload_pays.update({
      where: { overload_pays_id: id },
      data: {
        amount: Number(amount),
        notes: notes || null,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ success: true, data: updatedOverloadPay })
  } catch (error) {
    console.error("Error updating overload pay:", error)
    return NextResponse.json({ error: "Failed to update overload pay" }, { status: 500 })
  }
}

