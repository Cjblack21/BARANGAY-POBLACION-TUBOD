import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.users.findUnique({
      where: { users_id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 })
    }

    // Reset EVERYTHING to zero - Delete all system data
    const results = await prisma.$transaction(async (tx) => {
      // 1. Delete all deductions
      const deductions = await tx.deductions.deleteMany({})
      
      // 2. Delete all payroll entries
      const payrollEntries = await tx.payroll_entries.deleteMany({})
      
      // 3. Delete all overload pays
      const overloadPays = await tx.overload_pays.deleteMany({})
      
      // 4. Delete all loans
      const loans = await tx.loans.deleteMany({})
      
      // 5. Set all users' personnel_types_id to null
      await tx.users.updateMany({
        where: { personnel_types_id: { not: null } },
        data: { personnel_types_id: null },
      })
      
      // 6. Delete all personnel types
      const personnelTypes = await tx.personnel_types.deleteMany({})
      
      // 7. Reset payroll release countdown (period dates) in attendance_settings
      const settings = await tx.attendance_settings.findFirst()
      if (settings) {
        await tx.attendance_settings.update({
          where: { attendance_settings_id: settings.attendance_settings_id },
          data: {
            periodStart: null,
            periodEnd: null,
          },
        })
      }

      return {
        deductions: deductions.count,
        payrollEntries: payrollEntries.count,
        overloadPays: overloadPays.count,
        loans: loans.count,
        personnelTypes: personnelTypes.count,
      }
    })

    return NextResponse.json({ 
      message: "ALL system data has been reset to zero successfully",
      deleted: results
    })
  } catch (error) {
    console.error("Error resetting all data:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to reset all data"
    return NextResponse.json(
      { error: `Failed to reset all data: ${errorMessage}` },
      { status: 500 }
    )
  }
}
