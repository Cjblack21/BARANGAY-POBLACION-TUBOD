'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { formatDateForDisplay } from '@/lib/timezone'

type AttendanceDetail = {
  date: string
  timeIn: string | null
  timeOut: string | null
  workHours: number
  status: string
  deduction: number
}

type LoanDetail = {
  type: string
  amount: number
  remainingBalance: number
}

type DeductionDetail = {
  type: string
  amount: number
  description: string
  isMandatory?: boolean
  calculationType?: 'FIXED' | 'PERCENTAGE'
  percentageValue?: number
  basicSalary?: number
}

type PayrollBreakdown = {
  basicSalary: number
  monthlyBasicSalary?: number
  attendanceDeductions: number
  leaveDeductions?: number
  loanDeductions: number
  otherDeductions: number
  overloadPay?: number
  overloadPayDetails?: Array<{type: string, amount: number}>
  attendanceDetails: AttendanceDetail[]
  loanDetails: LoanDetail[]
  otherDeductionDetails: DeductionDetail[]
}

type PayrollEntry = {
  users_id: string
  name: string
  email: string
  personnelType?: string
  department?: string | null
  personnelTypeCategory?: 'TEACHING' | 'NON_TEACHING' | null
  totalWorkHours: number
  finalNetPay: number
  status: 'Pending' | 'Released' | 'Archived'
  breakdown: PayrollBreakdown
}

type PayrollPeriod = {
  periodStart: string
  periodEnd: string
  type: 'Weekly' | 'Semi-Monthly' | 'Monthly' | 'Custom'
  status?: 'Pending' | 'Released' | 'Archived'
}

interface PayrollBreakdownDialogProps {
  entry: PayrollEntry | null
  currentPeriod: PayrollPeriod | null
  isOpen: boolean
  onClose: () => void
  onArchive?: (userId: string) => void
  showArchiveButton?: boolean
  openInEditMode?: boolean
}

export default function PayrollBreakdownDialog({
  entry,
  currentPeriod,
  isOpen,
  onClose,
}: PayrollBreakdownDialogProps) {
  if (!entry) return null

  const formatCurrency = (amount: number) => {
    const safeAmount = Number.isFinite(amount) ? amount : 0
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeAmount)
  }

  // ── Pull values directly from the pre-computed breakdown snapshot ──
  const breakdown = entry.breakdown || {}

  const monthlyBasic = Number(breakdown.monthlyBasicSalary || breakdown.basicSalary || 0)
  const overloadPayDetails: Array<{type: string; amount: number}> = breakdown.overloadPayDetails || []
  const overloadPay = Number(breakdown.overloadPay || 0) ||
    overloadPayDetails.reduce((s, d) => s + Number(d.amount), 0)

  const grossPay = monthlyBasic + overloadPay

  // Deduction categories from snapshot
  const deductionDetails: DeductionDetail[] = breakdown.otherDeductionDetails || []
  const loanDetails: LoanDetail[] = breakdown.loanDetails || []

  const mandatoryDeductions = deductionDetails.filter(d => d.isMandatory)
  const otherDeductions = deductionDetails.filter(d => {
    const t = (d.type || '').toLowerCase()
    return !d.isMandatory &&
      !t.includes('late') && !t.includes('early') && !t.includes('absent') &&
      !t.includes('tardiness') && !t.includes('partial') && !t.includes('attendance')
  })
  const actualLoans = loanDetails.filter(l => !(l.type || '').startsWith('[DEDUCTION]'))
  const deductionPayments = loanDetails.filter(l => (l.type || '').startsWith('[DEDUCTION]'))

  // Attendance deductions from snapshot
  const attendanceDeductionAmount = Number(breakdown.attendanceDeductions || 0)

  // Total deductions: prefer stored netPay-derived value for accuracy
  const totalDeductions =
    attendanceDeductionAmount +
    mandatoryDeductions.reduce((s, d) => s + d.amount, 0) +
    actualLoans.reduce((s, l) => s + l.amount, 0) +
    deductionPayments.reduce((s, d) => s + d.amount, 0) +
    otherDeductions.reduce((s, d) => s + d.amount, 0)

  const netPay = grossPay - totalDeductions

  const periodStart = currentPeriod ? formatDateForDisplay(new Date(currentPeriod.periodStart)) : 'N/A'
  const periodEnd = currentPeriod ? formatDateForDisplay(new Date(currentPeriod.periodEnd)) : 'N/A'

  const isDepartmentOfficial = (entry.department || '').toLowerCase().includes('official')

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[85vw] !max-w-[1200px] max-h-[90vh] overflow-y-auto scrollbar-minimal p-0">
        {/* Payslip-style Header */}
        <div className="relative">
          {/* Close button */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Centered payslip header */}
          <div className="text-center border-b-2 border-gray-300 dark:border-gray-700 pb-4 pt-6 px-4">
            <div className="flex justify-center mb-3">
              <div className="h-28 w-28 rounded-full overflow-hidden mx-auto">
                <img src="/BRGY PICTURE LOG TUBOD.png" alt="Barangay Logo" className="w-full h-full object-contain" />
              </div>
            </div>
            <DialogHeader>
              <DialogTitle asChild>
                <h3 className="font-bold text-base">TUBOD BARANGAY POBLACION</h3>
              </DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">Tubod, Lanao del Norte</p>
            <p className="text-xs text-muted-foreground">POBLACION - PMS</p>
            <h2 className="font-bold text-xl mt-3">HONORARIUM</h2>
          </div>

          {/* Staff info row */}
          <div className="space-y-0.5 text-[15px] border-b pb-2 px-6 pt-3">
            <div className="flex justify-between">
              <span className="font-semibold uppercase text-xs text-muted-foreground mr-4">
                {isDepartmentOfficial ? 'BRGY OFFICIALS:' : 'BRGY STAFF:'}
              </span>
              <span className="font-medium text-right">{entry.name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold uppercase text-xs text-muted-foreground mr-4">Staff ID:</span>
              <span className="font-medium text-right">{entry.users_id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold uppercase text-xs text-muted-foreground mr-4">Email:</span>
              <span className="text-sm text-right text-muted-foreground">{entry.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold uppercase text-xs text-muted-foreground mr-4">BLGU:</span>
              <span className="font-medium text-right">{entry.department || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold uppercase text-xs text-muted-foreground mr-4">Position:</span>
              <span className="font-medium text-right">{entry.personnelType || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold uppercase text-xs text-muted-foreground mr-4">Period:</span>
              <span className="font-medium text-right">{periodStart} - {periodEnd}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold uppercase text-xs text-muted-foreground mr-4">Status:</span>
              <span className="font-medium text-right">{entry.status}</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">

          {/* Salary Summary */}
          <div className="border rounded-lg overflow-hidden">
            <div className="border-b px-4 py-3 bg-muted/30">
              <h3 className="text-base font-semibold">Salary Summary</h3>
            </div>
            <div className="p-4 space-y-1">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-xs font-medium">Monthly Basic Salary</span>
                <span className="text-sm font-bold">{formatCurrency(monthlyBasic)}</span>
              </div>

              {/* Additional Pay */}
              {(overloadPayDetails.length > 0 || overloadPay > 0) && (
                <>
                  <div className="pt-3 pb-1">
                    <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Additional Pay</span>
                  </div>
                  {overloadPayDetails.length > 0 ? (
                    overloadPayDetails.map((detail, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b pl-4">
                        <span className="text-xs font-medium text-green-700 dark:text-green-400">
                          • {detail.type === 'POSITION_PAY' ? 'Position Pay' :
                            detail.type === 'BONUS' ? 'Bonus' :
                            detail.type === '13TH_MONTH' ? '13th Month Pay' :
                            detail.type === 'OVERTIME' ? 'Overtime' :
                            detail.type === 'OVERLOAD' ? 'Overload' :
                            detail.type}
                        </span>
                        <span className="text-sm font-bold text-green-600">+{formatCurrency(Number(detail.amount))}</span>
                      </div>
                    ))
                  ) : overloadPay > 0 && (
                    <div className="flex justify-between items-center py-2 border-b pl-4">
                      <span className="text-xs font-medium text-green-700 dark:text-green-400">• Additional Pay</span>
                      <span className="text-sm font-bold text-green-600">+{formatCurrency(overloadPay)}</span>
                    </div>
                  )}
                </>
              )}

              {/* Gross Pay */}
              <div className="flex justify-between items-center py-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg px-3 mx-4 mb-3 mt-2">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Gross Pay</span>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{formatCurrency(grossPay)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          {totalDeductions > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="border-b px-4 py-3 bg-red-50 dark:bg-red-950/20">
                <h3 className="text-base font-semibold text-red-700 dark:text-red-400">Deductions</h3>
              </div>
              <div className="p-4 space-y-1">

                {/* Attendance Deductions */}
                {attendanceDeductionAmount > 0 && (
                  <>
                    <div className="pt-1 pb-1">
                      <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Attendance</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b pl-4">
                      <span className="text-xs font-medium text-red-600">• Attendance Deductions</span>
                      <span className="text-sm font-bold text-red-600">-{formatCurrency(attendanceDeductionAmount)}</span>
                    </div>
                  </>
                )}

                {/* Mandatory Deductions */}
                {mandatoryDeductions.length > 0 && (
                  <>
                    <div className="pt-3 pb-1">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Mandatory Deductions</span>
                    </div>
                    {mandatoryDeductions.map((deduction, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b pl-4">
                        <span className="text-xs font-medium text-red-600">• {(deduction.type || 'Deduction').split('(')[0].trim()}</span>
                        <span className="text-sm font-bold text-red-600">-{formatCurrency(deduction.amount)}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* Loan Payments */}
                {actualLoans.length > 0 && (
                  <>
                    <div className="pt-3 pb-1">
                      <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider">Loan Payments</span>
                    </div>
                    {actualLoans.map((loan, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b pl-4">
                        <span className="text-xs font-medium text-red-600">• {(loan.type || 'Loan').split('(')[0].trim()}</span>
                        <span className="text-sm font-bold text-red-600">-{formatCurrency(loan.amount)}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* Deduction Payments */}
                {deductionPayments.length > 0 && (
                  <>
                    <div className="my-2 border-t border-dashed border-muted-foreground/30" />
                    <div className="pt-1 pb-1">
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Other Deductions</span>
                    </div>
                    {deductionPayments.map((deduction, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b pl-4">
                        <span className="text-xs font-medium text-red-600">• {(deduction.type || 'Deduction').replace(/^\[DEDUCTION\]\s*/i, '').split('(')[0].trim()}</span>
                        <span className="text-sm font-bold text-red-600">-{formatCurrency(deduction.amount)}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* Other Deductions */}
                {otherDeductions.length > 0 && (
                  <>
                    {deductionPayments.length === 0 && (
                      <div className="pt-3 pb-1">
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Other Deductions</span>
                      </div>
                    )}
                    {otherDeductions.map((deduction, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b pl-4">
                        <span className="text-xs font-medium text-red-600">• {deduction.type}</span>
                        <span className="text-sm font-bold text-red-600">-{formatCurrency(deduction.amount)}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* Total Deductions */}
                <div className="flex justify-between items-center py-3 pl-4 mt-1 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <span className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wide">Total Deductions</span>
                  <span className="text-sm font-bold text-red-700 dark:text-red-300">-{formatCurrency(totalDeductions)}</span>
                </div>
              </div>
            </div>
          )}

          {/* NET PAY */}
          <div className="flex justify-between items-center py-4 bg-muted/30 border border-border rounded-lg px-4">
            <span className="text-sm font-bold">Net Pay</span>
            <span className="text-xl font-bold">{formatCurrency(netPay)}</span>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
