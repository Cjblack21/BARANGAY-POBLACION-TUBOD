/**
 * Calculate net pay from payroll entry
 * This ensures the table and breakdown dialog show the SAME value
 */

export function calculateDisplayNetPay(entry: any): number {
    if (!entry) return 0

    // Use the SAME logic as PayrollBreakdownDialog
    const basicSalary = Number(entry.personnelType?.basicSalary || 0)
    const overloadPay = Number(entry.breakdown?.overloadPay || 0)

    // Gross pay
    const grossPay = basicSalary + overloadPay

    // Total deductions
    const totalDeductions = Number(entry.totalDeductions || 0)

    // Net pay = Gross - Deductions
    const netPay = grossPay - totalDeductions

    return netPay
}
