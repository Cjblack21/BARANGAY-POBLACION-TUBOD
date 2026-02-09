'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
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

    const deductionsRows = (() => {
      // Use attendanceDeductionDetails directly from snapshot
      const attendance = attendanceDeductionDetails
      const mandatory = deductionDetails.filter((d: any) => d.isMandatory)
      const other = deductionDetails.filter((d: any) => {
        const type = d.type?.toLowerCase() || ''
        return !d.isMandatory && !type.includes('late') && !type.includes('early') && !type.includes('absent') && !type.includes('tardiness') && !type.includes('partial')
      })

      const actualLoans = loanDetails.filter((l: any) => !l.type?.startsWith('[DEDUCTION]'))
      const deductionPayments = loanDetails.filter((l: any) => l.type?.startsWith('[DEDUCTION]'))

      console.log('🖨️ Print deductions:', {
        attendance: attendance.length,
        mandatory: mandatory.length,
        other: other.length,
        loans: actualLoans.length,
        deductionDetails: deductionDetails,
        attendanceDeductionDetails: attendanceDeductionDetails
      })

      const rows: string[] = []

      attendance.forEach((d: any) => {
        rows.push(`<tr><td class="td">Attendance: ${String(d.type || 'Attendance')}</td><td class="td right">${formatCurrencyPrint(Number(d.amount || 0))}</td></tr>`)
      })
      mandatory.forEach((d: any) => {
        rows.push(`<tr><td class="td">${String(d.type || 'Mandatory')}</td><td class="td right">-${formatCurrencyPrint(Number(d.amount || 0))}</td></tr>`)
      })
      actualLoans.forEach((l: any) => {
        rows.push(`<tr><td class="td">Loan: ${String(l.type || 'Loan')}</td><td class="td right">${formatCurrencyPrint(Number(l.amount || 0))}</td></tr>`)
      })
      deductionPayments.forEach((d: any) => {
        const label = String(d.type || '').replace(/^\[DEDUCTION\]\s*/i, '') || 'Deduction'
        rows.push(`<tr><td class="td">Deduction: ${label}</td><td class="td right">${formatCurrencyPrint(Number(d.amount || 0))}</td></tr>`)
      })
      other.forEach((d: any) => {
        rows.push(`<tr><td class="td">Other: ${String(d.type || 'Other')}</td><td class="td right">${formatCurrencyPrint(Number(d.amount || 0))}</td></tr>`)
      })

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

  // Use attendanceDeductionDetails directly from snapshot instead of filtering
  const attendanceDeductions = attendanceDeductionDetails

  const mandatoryDeductions = deductionDetails.filter((d: any) => d.isMandatory)
  const otherDeductions = deductionDetails.filter((d: any) => {
    const type = d.type?.toLowerCase() || ''
    return !d.isMandatory && !type.includes('late') && !type.includes('early') && !type.includes('absent') && !type.includes('tardiness') && !type.includes('partial')
  })

  const actualLoans = loanDetails.filter((l: any) => !l.type?.startsWith('[DEDUCTION]'))
  const deductionPayments = loanDetails.filter((l: any) => l.type?.startsWith('[DEDUCTION]'))

  const grossPay = periodSalary + overloadPay
  const netPay = grossPay - deductions

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[85vw] !max-w-[1200px] max-h-[90vh] overflow-y-auto scrollbar-hide p-0">
        {/* Header Section */}
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold">{entry.user?.name || 'N/A'}</DialogTitle>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <p className="text-sm text-muted-foreground">
                    {formatDateForDisplay(new Date(period.periodStart))} - {formatDateForDisplay(new Date(period.periodEnd))}
                  </p>
                  <span className="text-muted-foreground">•</span>
                  <p className="text-sm text-muted-foreground">{entry.user?.email || 'N/A'}</p>
                  {entry.user?.personnelType?.department && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <p className="text-sm text-muted-foreground">{entry.user.personnelType.department}</p>
                    </>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Print
              </Button>
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
            <div>
              <div className="text-lg font-bold">{entry.user?.name || 'N/A'}</div>
              <div className="muted">
                {formatDateForDisplay(new Date(period.periodStart))} - {formatDateForDisplay(new Date(period.periodEnd))}
                {entry.user?.email ? ` • ${entry.user.email}` : ''}
                {entry.user?.personnelType?.department ? ` • ${entry.user.personnelType.department}` : ''}
              </div>
            </div>

            {/* Simplified Salary Summary */}
            <div className="border rounded-lg">
              <div className="border-b px-4 py-3">
                <h3 className="text-base font-semibold">Salary Summary</h3>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-xs font-medium">Monthly Basic Salary</span>
                  <span className="text-sm font-bold">{formatCurrency(periodSalary)}</span>
                </div>

                {/* Additional Pay Section */}
                {(overloadPayDetails.length > 0 || overloadPay > 0) && (
                  <>
                    <div className="pt-2">
                      <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Additional Pay:</span>
                    </div>
                    {overloadPayDetails.length > 0 ? (
                      overloadPayDetails.map((detail: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center py-2 border-b pl-3">
                          <span className="text-xs font-medium text-green-600">
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
                        <div className="flex justify-between items-center py-2 border-b pl-3">
                          <span className="text-xs font-medium text-green-600">• Additional Pay</span>
                          <span className="text-sm font-bold text-green-600">+{formatCurrency(overloadPay)}</span>
                        </div>
                      )
                    )}
                  </>
                )}

                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-xs font-medium">Gross Pay</span>
                  <span className="text-sm font-bold">{formatCurrency(grossPay)}</span>
                </div>

                {/* Deductions Section */}
                {deductions > 0 && (
                  <>
                    <div className="pt-2">
                      <span className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">Deductions:</span>
                    </div>
                    {/* Attendance Deductions */}
                    {attendanceDeductions.map((deduction: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b pl-3">
                        <span className="text-xs font-medium text-red-600">• {deduction.type}</span>
                        <span className="text-sm font-bold text-red-600">-{formatCurrency(deduction.amount)}</span>
                      </div>
                    ))}
                    {/* Mandatory Deductions */}
                    {mandatoryDeductions.map((deduction: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b pl-3">
                        <span className="text-xs font-medium text-red-600">• {(deduction.type || 'Deduction').split('(')[0].trim()}</span>
                        <span className="text-sm font-bold text-red-600">-{formatCurrency(deduction.amount)}</span>
                      </div>
                    ))}
                    {/* Loan Payments */}
                    {actualLoans.map((loan: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b pl-3">
                        <span className="text-xs font-medium text-red-600">• {(loan.type || 'Loan').split('(')[0].trim()}</span>
                        <span className="text-sm font-bold text-red-600">-{formatCurrency(loan.amount)}</span>
                      </div>
                    ))}
                    {/* Deduction Payments */}
                    {deductionPayments.map((deduction: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b pl-3">
                        <span className="text-xs font-medium text-red-600">• {(deduction.type || 'Deduction').replace(/^\[DEDUCTION\]\s*/i, '').split('(')[0].trim()}</span>
                        <span className="text-sm font-bold text-red-600">-{formatCurrency(deduction.amount)}</span>
                      </div>
                    ))}
                    {/* Other Deductions */}
                    {otherDeductions.map((deduction: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b pl-3">
                        <span className="text-xs font-medium text-red-600">• {deduction.type}</span>
                        <span className="text-sm font-bold text-red-600">-{formatCurrency(deduction.amount)}</span>
                      </div>
                    ))}
                    {/* Total Deductions */}
                    <div className="flex justify-between items-center py-2 border-b pl-3 bg-red-50 dark:bg-red-950/20">
                      <span className="text-xs font-semibold text-red-700 dark:text-red-300">Total Deductions</span>
                      <span className="text-sm font-bold text-red-700 dark:text-red-300">-{formatCurrency(deductions)}</span>
                    </div>
                  </>
                )}

                {/* NET PAY */}
                <div className="flex justify-between items-center py-3 bg-primary/5 rounded-lg px-3 mt-2">
                  <span className="text-sm font-semibold">Net Pay</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(netPay)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
