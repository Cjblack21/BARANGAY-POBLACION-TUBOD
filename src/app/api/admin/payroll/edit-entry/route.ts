import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { entryId, updates } = body

    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 })
    }

    // Get the existing entry
    const existingEntry = await prisma.payroll_entries.findUnique({
      where: { payroll_entries_id: entryId }
    })

    if (!existingEntry) {
      return NextResponse.json({ error: 'Payroll entry not found' }, { status: 404 })
    }

    // Only allow editing PENDING entries
    if (existingEntry.status !== 'PENDING') {
      return NextResponse.json({ 
        error: 'Can only edit pending payroll entries. Released or archived entries cannot be modified.' 
      }, { status: 400 })
    }

    // Parse existing breakdown
    let breakdownSnapshot = existingEntry.breakdownSnapshot 
      ? JSON.parse(existingEntry.breakdownSnapshot as string) 
      : {}

    // Update fields based on what's provided
    const updateData: any = {
      updatedAt: new Date()
    }

    // Update basic salary if provided
    if (updates.basicSalary !== undefined) {
      updateData.basicSalary = Number(updates.basicSalary)
      breakdownSnapshot.basicSalary = Number(updates.basicSalary)
    }

    // Update overtime/overload pay if provided
    if (updates.overloadPay !== undefined) {
      updateData.overtime = Number(updates.overloadPay)
      breakdownSnapshot.overloadPay = Number(updates.overloadPay)
    }

    // Update deductions if provided
    if (updates.deductions !== undefined) {
      updateData.deductions = Number(updates.deductions)
      breakdownSnapshot.otherDeductions = Number(updates.deductions)
    }

    // Recalculate net pay
    const basicSalary = updates.basicSalary !== undefined ? Number(updates.basicSalary) : Number(existingEntry.basicSalary)
    const overloadPay = updates.overloadPay !== undefined ? Number(updates.overloadPay) : Number(existingEntry.overtime)
    const deductions = updates.deductions !== undefined ? Number(updates.deductions) : Number(existingEntry.deductions)
    
    const grossPay = basicSalary + overloadPay
    const netPay = grossPay - deductions

    updateData.netPay = netPay
    breakdownSnapshot.grossPay = grossPay
    breakdownSnapshot.netPay = netPay
    breakdownSnapshot.totalDeductions = deductions

    // Update breakdown snapshot
    updateData.breakdownSnapshot = JSON.stringify(breakdownSnapshot)

    // Perform the update
    const updatedEntry = await prisma.payroll_entries.update({
      where: { payroll_entries_id: entryId },
      data: updateData
    })

    console.log(`✅ Updated payroll entry ${entryId}`)

    return NextResponse.json({ 
      success: true, 
      message: 'Payroll entry updated successfully',
      entry: updatedEntry
    })

  } catch (error) {
    console.error('Error updating payroll entry:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update payroll entry' 
    }, { status: 500 })
  }
}
