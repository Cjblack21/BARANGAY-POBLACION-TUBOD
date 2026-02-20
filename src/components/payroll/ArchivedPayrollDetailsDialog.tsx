'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, X } from 'lucide-react'
import { formatDateForDisplay } from '@/lib/timezone'

interface ArchivedPayrollDetailsDialogProps {
  entry: any
  period: any
  isOpen: boolean
  onClose: () => void
}

export default function ArchivedPayrollDetailsDialog({
  entry,
  period,
  isOpen,
  onClose
}: ArchivedPayrollDetailsDialogProps) {
  const [liveData, setLiveData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [archivedAttendance, setArchivedAttendance] = useState<any[]>([])
  const printRef = useRef<HTMLDivElement | null>(null)

  const handlePrint = () => {
    if (!entry || !period) return

    const formatCurrencyPrint = (amount: number) => {
      const safeAmount = Number.isFinite(amount) ? amount : 0
      return '₱' + new Intl.NumberFormat('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(safeAmount)
    }

    const periodStart = formatDateForDisplay(new Date(period.periodStart))
    const periodEnd = formatDateForDisplay(new Date(period.periodEnd))
    const logoUrl = '/BRGY PICTURE LOG TUBOD.png'

    // Use live data if available
    const overloadPayDetails = liveData?.overloadPayDetails || []
    const deductionDetails = liveData?.deductionDetails || []
    const loanDetails = liveData?.loanDetails || []
    const attendanceDeductionDetails = liveData?.attendanceDeductionDetails || []

    const monthlyBasic = Number(entry.user?.personnelType?.basicSalary || 0)
    const deductions = Number(entry.deductions || 0)

    let overloadPay = overloadPayDetails.reduce((sum: number, detail: any) => sum + Number(detail.amount), 0)
    const dbNetPay = Number(entry.netPay || 0)
    if (overloadPay === 0 && dbNetPay > monthlyBasic) {
      overloadPay = dbNetPay - monthlyBasic + deductions
    }

    const grossPay = monthlyBasic + overloadPay
    const netPay = grossPay - deductions

    const additionalRows = overloadPayDetails.length
      ? overloadPayDetails
        .filter((x: any) => (Number(x.amount) || 0) > 0)
        .map((x: any) => {
          const label =
            x.type === 'POSITION_PAY' ? 'Position Pay' :
              x.type === 'BONUS' ? 'Bonus' :
                x.type === '13TH_MONTH' ? '13th Month Pay' :
                  x.type === 'OVERTIME' ? 'Overtime' :
                    x.type === 'OVERLOAD' ? 'Overload' :
                      String(x.type || 'Additional Pay')
          return `
            <tr>
              <td class="td">${label}</td>
              <td class="td right">${formatCurrencyPrint(Number(x.amount || 0))}</td>
            </tr>
          `
        })
        .join('')
      : (overloadPay > 0 ? `
          <tr>
            <td class="td">Additional Pay</td>
            <td class="td right">${formatCurrencyPrint(overloadPay)}</td>
          </tr>
        ` : '')

    // Resolve attendance the same way the dialog view does
    const mandatoryTotal = deductionDetails
      .filter((d: any) => d.isMandatory)
      .reduce((s: number, d: any) => s + Number(d.amount), 0)
    const loanTotalPrint = loanDetails.reduce((s: number, l: any) => s + Number(l.amount || l.payment || 0), 0)
    const derivedAttendanceTotal = Math.max(0, deductions - mandatoryTotal - loanTotalPrint)

    const resolvedAttendance: any[] = attendanceDeductionDetails.length > 0
      ? attendanceDeductionDetails
      : archivedAttendance.length > 0
        ? archivedAttendance.map((d: any) => ({
          type: d.deductionType || 'Attendance Deduction',
          amount: Number(d.amount),
          description: d.notes || '',
          appliedAt: d.appliedAt,
          notes: d.notes
        }))
        : derivedAttendanceTotal > 0
          ? [{ type: 'Attendance Deduction', amount: derivedAttendanceTotal, description: 'Attendance-based deduction for this period', appliedAt: null }]
          : []

    const deductionsRows = (() => {
      const mandatory = deductionDetails.filter((d: any) => d.isMandatory)
      const other = deductionDetails.filter((d: any) => {
        const type = d.type?.toLowerCase() || ''
        return !d.isMandatory && !type.includes('late') && !type.includes('early') && !type.includes('absent') && !type.includes('tardiness') && !type.includes('partial') && !type.includes('attendance')
      })

      const actualLoans = loanDetails.filter((l: any) => !l.type?.startsWith('[DEDUCTION]'))
      const deductionPayments = loanDetails.filter((l: any) => l.type?.startsWith('[DEDUCTION]'))

      const rows: string[] = []

      if (resolvedAttendance.length > 0) {
        rows.push(`<tr><td class="td" colspan="2" style="font-weight:700;font-size:13px;color:#ea580c;background:#fff7ed;padding:8px 10px;letter-spacing:0.5px">ATTENDANCE</td></tr>`)
        resolvedAttendance.forEach((d: any) => {
          const dateStr = d.appliedAt ? new Date(d.appliedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : ''
          const desc = d.description || d.notes || ''
          rows.push(`<tr><td class="td">${String(d.type || 'Attendance')}${dateStr ? ` <span style="color:#6b7280;font-size:13px">— ${dateStr}</span>` : ''}${desc ? `<br/><span style="color:#6b7280;font-size:12px">${desc}</span>` : ''}</td><td class="td right" style="color:#dc2626">-${formatCurrencyPrint(Number(d.amount || 0))}</td></tr>`)
        })
      }

      if (mandatory.length > 0) {
        rows.push(`<tr><td class="td" colspan="2" style="font-weight:700;font-size:13px;color:#7c3aed;background:#f5f3ff;padding:8px 10px;letter-spacing:0.5px">MANDATORY DEDUCTIONS</td></tr>`)
        mandatory.forEach((d: any) => {
          rows.push(`<tr><td class="td">${String(d.type || 'Mandatory')}</td><td class="td right" style="color:#dc2626">-${formatCurrencyPrint(Number(d.amount || 0))}</td></tr>`)
        })
      }

      if (actualLoans.length > 0) {
        rows.push(`<tr><td class="td" colspan="2" style="font-weight:700;font-size:13px;color:#0369a1;background:#f0f9ff;padding:8px 10px;letter-spacing:0.5px">LOANS</td></tr>`)
        actualLoans.forEach((l: any) => {
          rows.push(`<tr><td class="td">Loan: ${String(l.type || 'Loan')}</td><td class="td right" style="color:#dc2626">-${formatCurrencyPrint(Number(l.amount || 0))}</td></tr>`)
        })
      }

      deductionPayments.forEach((d: any) => {
        const label = String(d.type || '').replace(/^\[DEDUCTION\]\s*/i, '') || 'Deduction'
        rows.push(`<tr><td class="td">Deduction: ${label}</td><td class="td right" style="color:#dc2626">-${formatCurrencyPrint(Number(d.amount || 0))}</td></tr>`)
      })

      if (other.length > 0) {
        rows.push(`<tr><td class="td" colspan="2" style="font-weight:700;font-size:13px;color:#374151;background:#f9fafb;padding:8px 10px;letter-spacing:0.5px">OTHER DEDUCTIONS</td></tr>`)
        other.forEach((d: any) => {
          rows.push(`<tr><td class="td">${String(d.type || 'Other')}</td><td class="td right" style="color:#dc2626">-${formatCurrencyPrint(Number(d.amount || 0))}</td></tr>`)
        })
      }

      return rows.join('')
    })()


    const html = `
      <html>
        <head>
          <title>Payroll Details</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; color: #111827; padding: 32px; font-size: 16px; }
            .header { display:flex; align-items:center; gap:18px; padding-bottom: 16px; border-bottom: 3px solid #e5e7eb; }
            .logo { width: 90px; height: 90px; object-fit: contain; }
            .title { font-size: 24px; font-weight: 800; margin: 0; }
            .subtitle { font-size: 16px; color: #6b7280; margin-top: 6px; }
            .meta { margin-top: 12px; font-size: 16px; color: #374151; }
            .section { margin-top: 18px; border: 2px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
            .section-title { padding: 14px 16px; border-bottom: 2px solid #e5e7eb; font-weight: 800; font-size: 16px; background: #f9fafb; }
            table { width: 100%; border-collapse: collapse; }
            .td { font-size: 16px; border-bottom: 1px solid #f3f4f6; padding: 12px 10px; vertical-align: top; }
            .right { text-align: right; }
            .sign { margin-top: 40px; display:flex; justify-content: space-between; gap: 20px; }
            .sigbox { width: 30%; }
            .sig-label-top { font-size: 14px; color: #374151; margin-bottom: 30px; }
            .signame { font-size: 18px; font-weight: 700; text-align: center; }
            .line { border-top: 2px solid #9ca3af; margin-top: 6px; }
            .siglabel { font-size: 14px; color: #6b7280; margin-top: 6px; text-align: center; }
            .sig-date { font-size: 14px; color: #374151; margin-top: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <img class="logo" src="${logoUrl}" alt="Logo" />
            <div>
              <div class="title">Payslip</div>
              <div class="subtitle">Barangay Payroll Management System</div>
              <div class="meta"><b>${entry.user?.name || 'N/A'}</b>${entry.user?.personnelType?.name ? ` • ${entry.user.personnelType.name}` : ''}${entry.user?.personnelType?.department ? ` • ${entry.user.personnelType.department}` : ''}</div>
              <div class="meta">Period: <b>${periodStart}</b> - <b>${periodEnd}</b> &nbsp; | &nbsp; Staff ID: <b>${entry.users_id || ''}</b></div>
              <div class="meta">Status: <b>Released</b> &nbsp; | &nbsp; ID Number: <b>${entry.users_id || 'N/A'}</b></div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Salary Summary</div>
            <table>
              <tbody>
                <tr>
                  <td class="td">Monthly Basic Salary</td>
                  <td class="td right">${formatCurrencyPrint(monthlyBasic)}</td>
                </tr>
                ${additionalRows}
                <tr>
                  <td class="td"><b>Gross Pay</b></td>
                  <td class="td right"><b>${formatCurrencyPrint(grossPay)}</b></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Deductions</div>
            <table>
              <tbody>
                ${deductionsRows || `<tr><td class=\"td\">No deductions</td><td class=\"td right\">${formatCurrencyPrint(0)}</td></tr>`}
                <tr>
                  <td class="td"><b>Total Deductions</b></td>
                  <td class="td right"><b>${formatCurrencyPrint(deductions)}</b></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Net Pay</div>
            <table>
              <tbody>
                <tr>
                  <td class="td"><b>Net Pay</b></td>
                  <td class="td right"><b>${formatCurrencyPrint(netPay)}</b></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="sign">
            <div class="sigbox">
              <div class="sig-label-top">Prepared by:</div>
              <div class="signame">EMMA L. MAGTAO</div>
              <div class="line"></div>
              <div class="siglabel">Brgy Treasurer</div>
              <div class="sig-date">Date: _________________</div>
            </div>
            <div class="sigbox">
              <div class="sig-label-top">Approved by:</div>
              <div class="signame">ARSENIO Q. SIMANGAN</div>
              <div class="line"></div>
              <div class="siglabel">Punong Barangay</div>
              <div class="sig-date">Date: _________________</div>
            </div>
            <div class="sigbox">
              <div class="sig-label-top">Received by:</div>
              <div class="signame">${entry.user?.name || 'N/A'}</div>
              <div class="line"></div>
              <div class="siglabel">Staff Signature</div>
              <div class="sig-date">Date: _________________</div>
            </div>
          </div>
        </body>
      </html>
    `

    const win = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
    if (!win) return
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  useEffect(() => {
    async function fetchLiveBreakdown() {
      if (!entry || !isOpen) return

      setLoading(true)
      try {
        let overloadPayDetails: any[] = []
        let deductionDetails: any[] = []
        let loanDetails: any[] = []

        // Parse snapshot if string
        let snapshot = entry.breakdownSnapshot
        if (snapshot && typeof snapshot === 'string') {
          try {
            snapshot = JSON.parse(snapshot)
          } catch (e) {
            console.error('Parse error:', e)
            snapshot = null
          }
        }

        // Get from snapshot first
        overloadPayDetails = snapshot?.overloadPayDetails || []
        deductionDetails = snapshot?.deductionDetails || []
        loanDetails = snapshot?.loanDetails || []

        // Keep attendance deduction details separate to avoid duplicates
        const attendanceDeductionDetails = snapshot?.attendanceDeductionDetails || []

        // Map loan details to have the correct 'amount' field (should be 'payment')
        if (loanDetails.length > 0) {
          loanDetails = loanDetails.map((loan: any) => ({
            ...loan,
            amount: loan.payment || loan.amount || 0,
            type: loan.purpose || loan.type || 'Loan'
          }))
        }

        console.log('📦 Snapshot data:', {
          overloadPayDetails: overloadPayDetails.length,
          deductionDetails: deductionDetails.length,
          loanDetails: loanDetails.length,
          attendanceDeductionDetails: attendanceDeductionDetails.length
        })

        // Store attendance deduction details separately
        const snapshotAttendanceDeductionDetails = attendanceDeductionDetails

        // If snapshot doesn't have detailed breakdown, fetch live data as fallback
        if (deductionDetails.length === 0 && loanDetails.length === 0) {
          console.log('📦 Snapshot missing details, fetching live data for user:', entry.users_id)

          try {
            // Fetch live deductions
            const deductionsRes = await fetch('/api/admin/deductions')
            if (deductionsRes.ok) {
              const allDeductions = await deductionsRes.json()
              const userDeductions = allDeductions.filter((d: any) =>
                d.users_id === entry.users_id && !d.archivedAt
              )

              if (userDeductions.length > 0) {
                deductionDetails = userDeductions.map((d: any) => ({
                  type: d.deduction_types?.name || 'Unknown',
                  amount: Number(d.amount),
                  description: d.deduction_types?.description || '',
                  isMandatory: d.deduction_types?.isMandatory || false,
                  calculationType: d.deduction_types?.calculationType || 'FIXED',
                  percentageValue: Number(d.deduction_types?.percentageValue || 0)
                }))
                console.log('📦 Loaded', deductionDetails.length, 'live deductions')
              }
            }

            // Fetch live loans
            const loansRes = await fetch('/api/admin/loans')
            if (loansRes.ok) {
              const loansData = await loansRes.json()
              const allLoans = loansData.items || loansData
              const userLoans = allLoans.filter((l: any) =>
                l.users_id === entry.users_id && l.status === 'ACTIVE'
              )

              if (userLoans.length > 0) {
                loanDetails = userLoans.map((l: any) => {
                  const monthlyPayment = Number(l.amount) * (Number(l.monthlyPaymentPercent) / 100)
                  return {
                    type: l.purpose || 'Loan',
                    amount: monthlyPayment,
                    remainingBalance: Number(l.balance),
                    originalAmount: Number(l.amount)
                  }
                })
                console.log('📦 Loaded', loanDetails.length, 'live loans')
              }
            }

            // Fetch overload pays
            const overloadRes = await fetch('/api/admin/overload-pay')
            if (overloadRes.ok) {
              const allOverload = await overloadRes.json()
              const userOverload = allOverload.filter((op: any) =>
                op.users_id === entry.users_id && !op.archivedAt
              )
              if (userOverload.length > 0) {
                overloadPayDetails = userOverload.map((op: any) => ({
                  type: op.type || 'OVERTIME',
                  amount: Number(op.amount)
                }))
                console.log('📦 Loaded', overloadPayDetails.length, 'overload pays')
              }
            }
          } catch (error) {
            console.error('Error fetching live data:', error)
          }
        } else {
          // Use snapshot data including attendance deduction details
          setLiveData({
            overloadPayDetails,
            deductionDetails,
            loanDetails,
            attendanceDeductionDetails: snapshotAttendanceDeductionDetails
          })
          return
        }

        setLiveData({
          overloadPayDetails,
          deductionDetails,
          loanDetails,
          attendanceDeductionDetails: snapshotAttendanceDeductionDetails
        })
      } catch (error) {
        console.error('Error fetching live breakdown:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLiveBreakdown()

    // Fetch archived attendance deductions and filter to this payroll period
    if (entry?.users_id && period?.periodStart && period?.periodEnd) {
      const start = new Date(period.periodStart).getTime()
      const end = new Date(period.periodEnd).getTime()
      fetch(`/api/admin/attendance-deductions?archived=true&userId=${entry.users_id}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.deductions) {
            const periodFiltered = data.deductions.filter((d: any) => {
              const appliedAt = new Date(d.appliedAt).getTime()
              return appliedAt >= start && appliedAt <= end
            })
            setArchivedAttendance(periodFiltered)
          }
        })
        .catch(() => { })
    }
  }, [entry?.users_id, isOpen])

  if (!entry || !period) return null

  const formatCurrency = (amount: number) => {
    const safeAmount = Number.isFinite(amount) ? amount : 0
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeAmount)
  }

  const monthlyBasic = Number(entry.user?.personnelType?.basicSalary || 20000)
  const periodSalary = monthlyBasic // Use full monthly salary
  const dbNetPay = Number(entry.netPay || 0)
  const deductions = Number(entry.deductions || 0)

  // Use live data if available
  const overloadPayDetails = liveData?.overloadPayDetails || []
  const deductionDetails = liveData?.deductionDetails || []
  const loanDetails = liveData?.loanDetails || []
  const attendanceDeductionDetails = liveData?.attendanceDeductionDetails || []

  // Calculate overload pay
  let overloadPay = overloadPayDetails.reduce((sum: number, detail: any) => sum + Number(detail.amount), 0)
  if (overloadPay === 0 && dbNetPay > periodSalary) {
    overloadPay = dbNetPay - periodSalary + deductions
  }

  // Only show attendance deductions from the payroll snapshot.
  // If snapshot has none, use period-filtered archived attendance deductions.
  // If still none, derive total from stored deductions as a single fallback line.
  const mandatoryDeductions = deductionDetails.filter((d: any) => d.isMandatory)
  const mandatoryTotal = mandatoryDeductions.reduce((s: number, d: any) => s + Number(d.amount), 0)
  const loanTotal = loanDetails.reduce((s: number, l: any) => s + Number(l.amount || l.payment || 0), 0)
  const derivedAttendanceTotal = Math.max(0, deductions - mandatoryTotal - loanTotal)

  const attendanceDeductions: any[] = attendanceDeductionDetails.length > 0
    ? attendanceDeductionDetails
    : archivedAttendance.length > 0
      ? archivedAttendance.map((d: any) => ({
        type: d.deductionType || 'Attendance Deduction',
        amount: Number(d.amount),
        description: d.notes || '',
        appliedAt: d.appliedAt,
        notes: d.notes
      }))
      : derivedAttendanceTotal > 0
        ? [{ type: 'Attendance Deduction', amount: derivedAttendanceTotal, description: 'Attendance-based deduction for this period', appliedAt: null, notes: null }]
        : []

  const otherDeductions = deductionDetails.filter((d: any) => {
    const type = d.type?.toLowerCase() || ''
    return !d.isMandatory &&
      !type.includes('late') &&
      !type.includes('early') &&
      !type.includes('absent') &&
      !type.includes('tardiness') &&
      !type.includes('partial') &&
      !type.includes('attendance')
  })

  const actualLoans = loanDetails.filter((l: any) => !l.type?.startsWith('[DEDUCTION]'))
  const deductionPayments = loanDetails.filter((l: any) => l.type?.startsWith('[DEDUCTION]'))

  const grossPay = periodSalary + overloadPay
  const netPay = grossPay - deductions

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[85vw] !max-w-[1200px] max-h-[90vh] overflow-y-auto scrollbar-minimal p-0">
        {/* Header Section */}
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Profile Avatar */}
                <div className="relative h-14 w-14 rounded-full overflow-hidden bg-muted flex-shrink-0 border-2 border-border">
                  {entry.user?.avatar || entry.user?.profilePicture ? (
                    <img
                      src={entry.user?.avatar || entry.user?.profilePicture}
                      alt={entry.user?.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xl">
                      {(entry.user?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold">{entry.user?.name || 'N/A'}</DialogTitle>
                  <p className="text-base text-muted-foreground mt-0.5">{entry.user?.email || ''}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <p className="text-sm text-muted-foreground">
                      {formatDateForDisplay(new Date(period.periodStart))} - {formatDateForDisplay(new Date(period.periodEnd))}
                    </p>
                    <span className="text-muted-foreground">•</span>
                    <p className="text-sm text-muted-foreground">ID: {entry.users_id || 'N/A'}</p>
                    {entry.user?.personnelType?.department && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          {entry.user.personnelType.department}
                        </span>
                      </>
                    )}
                    {entry.user?.personnelType?.name && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-2 py-0.5 rounded-full">
                          {entry.user.personnelType.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handlePrint} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </DialogHeader>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}

        {!loading && (
          <div className="px-4 py-4 space-y-4" ref={printRef}>


            {/* Salary Summary */}
            <div className="border rounded-lg overflow-hidden">
              <div className="border-b px-4 py-3 bg-muted/30">
                <h3 className="text-base font-semibold">Salary Summary</h3>
              </div>
              <div className="p-4 space-y-1">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-xs font-medium">Monthly Basic Salary</span>
                  <span className="text-sm font-bold">{formatCurrency(periodSalary)}</span>
                </div>

                {/* Additional Pay Section */}
                {(overloadPayDetails.length > 0 || overloadPay > 0) && (
                  <>
                    <div className="pt-3 pb-1">
                      <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">Additional Pay</span>
                    </div>
                    {overloadPayDetails.length > 0 ? (
                      overloadPayDetails.map((detail: any, idx: number) => (
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
                    ) : (
                      overloadPay > 0 && (
                        <div className="flex justify-between items-center py-2 border-b pl-4">
                          <span className="text-xs font-medium text-green-700 dark:text-green-400">• Additional Pay</span>
                          <span className="text-sm font-bold text-green-600">+{formatCurrency(overloadPay)}</span>
                        </div>
                      )
                    )}
                  </>
                )}

                <div className="flex justify-between items-center py-2 border-b font-semibold">
                  <span className="text-xs">Gross Pay</span>
                  <span className="text-sm">{formatCurrency(grossPay)}</span>
                </div>
              </div>
            </div>

            {/* Deductions Section - Separated */}
            {deductions > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="border-b px-4 py-3 bg-red-50 dark:bg-red-950/20">
                  <h3 className="text-base font-semibold text-red-700 dark:text-red-400">Deductions</h3>
                </div>
                <div className="p-4 space-y-1">

                  {/* Attendance Deductions - Detailed Grouped (merged snapshot + archived API) */}
                  {(() => {
                    // Normalize snapshot items to a common shape
                    const snapshotItems = attendanceDeductions.map((d: any) => ({
                      _id: d.deductions_id || null,
                      type: d.type || 'Attendance',
                      amount: Number(d.amount || 0),
                      label: d.description || d.notes || d.type || 'Attendance',
                      dateStr: d.appliedAt
                        ? new Date(d.appliedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                        : d.date
                          ? new Date(d.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                          : null,
                      source: 'snapshot'
                    }))

                    // Normalize fetched archived API items (richer data)
                    const apiItems = archivedAttendance.map((d: any) => ({
                      _id: d.deductions_id,
                      type: d.deductionType || 'Attendance',
                      amount: Number(d.amount || 0),
                      label: d.notes || d.deductionType || 'Attendance',
                      dateStr: d.appliedAt
                        ? new Date(d.appliedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                        : null,
                      source: 'api'
                    }))

                    // Merge: API items take priority, snapshot fills gaps
                    const apiIds = new Set(apiItems.map((i: any) => i._id).filter(Boolean))
                    const merged = [
                      ...apiItems,
                      ...snapshotItems.filter((i: any) => !i._id || !apiIds.has(i._id))
                    ]

                    if (merged.length === 0) return null

                    // Group by category
                    const getCategory = (type: string) => {
                      const t = (type || '').toLowerCase()
                      if (t.includes('absent')) return 'Absent'
                      if (t.includes('late') || t.includes('tardiness')) return 'Late / Tardiness'
                      if (t.includes('early') || t.includes('undertime')) return 'Early Departure'
                      if (t.includes('partial')) return 'Partial Day'
                      return 'Attendance'
                    }
                    const groups: Record<string, any[]> = {}
                    merged.forEach((d: any) => {
                      const cat = getCategory(d.type)
                      if (!groups[cat]) groups[cat] = []
                      groups[cat].push(d)
                    })

                    return (
                      <>
                        <div className="pt-1 pb-1 flex items-center justify-between">
                          <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Attendance</span>
                          <span className="text-xs text-muted-foreground">{merged.length} item{merged.length !== 1 ? 's' : ''}</span>
                        </div>
                        {Object.entries(groups).map(([cat, items]) => {
                          const subtotal = items.reduce((sum: number, d: any) => sum + d.amount, 0)
                          return (
                            <div key={cat} className="pl-3 mb-2">
                              {/* Category header */}
                              <div className="flex justify-between items-center py-1.5 border-b border-orange-100 dark:border-orange-900/30">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">{cat}</span>
                                  <span className="text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded-full font-bold">
                                    ×{items.length}
                                  </span>
                                </div>
                                <span className="text-xs font-semibold text-red-600">-{formatCurrency(subtotal)}</span>
                              </div>
                              {/* Individual items */}
                              {items.map((d: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center py-1.5 pl-4 text-[11px] text-muted-foreground border-b last:border-b-0">
                                  <span>
                                    {d.dateStr ? <span className="font-medium text-foreground">{d.dateStr}</span> : null}
                                    {d.dateStr ? ' — ' : ''}
                                    {d.label}
                                  </span>
                                  <span className="text-red-500 font-medium ml-4 shrink-0">-{formatCurrency(d.amount)}</span>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </>
                    )
                  })()}

                  {/* Mandatory Deductions (SSS, PhilHealth, Pag-IBIG, BIR, etc.) */}
                  {mandatoryDeductions.length > 0 && (
                    <>
                      <div className="pt-3 pb-1">
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Mandatory Deductions</span>
                      </div>
                      {mandatoryDeductions.map((deduction: any, idx: number) => (
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
                      {actualLoans.map((loan: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b pl-4">
                          <span className="text-xs font-medium text-red-600">• {(loan.type || 'Loan').split('(')[0].trim()}</span>
                          <span className="text-sm font-bold text-red-600">-{formatCurrency(loan.amount)}</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Other Deduction Payments */}
                  {deductionPayments.length > 0 && (
                    <>
                      <div className="my-2 border-t border-dashed border-muted-foreground/30" />
                      <div className="pt-1 pb-1">
                        <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Other Deductions</span>
                      </div>
                      {deductionPayments.map((deduction: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b pl-4">
                          <span className="text-xs font-medium text-red-600">• {(deduction.type || 'Deduction').replace(/^\[DEDUCTION\]\s*/i, '').split('(')[0].trim()}</span>
                          <span className="text-sm font-bold text-red-600">-{formatCurrency(deduction.amount)}</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Other (non-mandatory) Deductions */}
                  {otherDeductions.length > 0 && (
                    <>
                      {deductionPayments.length === 0 && (
                        <div className="pt-3 pb-1">
                          <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">Other Deductions</span>
                        </div>
                      )}
                      {otherDeductions.map((deduction: any, idx: number) => (
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
                    <span className="text-sm font-bold text-red-700 dark:text-red-300">-{formatCurrency(deductions)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* NET PAY */}
            <div className="flex justify-between items-center py-4 bg-primary/5 border border-primary/20 rounded-lg px-4">
              <span className="text-sm font-bold">Net Pay</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(netPay)}</span>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
