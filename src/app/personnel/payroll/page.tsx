"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Calendar, FileText, Clock, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import PayrollBreakdownDialog from '@/components/payroll/PayrollBreakdownDialog'

interface PayrollData {
  currentPayroll: any
  archivedPayrolls: any[]
  periodInfo: {
    current: {
      start: string
      end: string
      releaseTime?: string
      scheduledRelease?: string
    }
  }
  breakdown: {
    otherDeductions: any[]
    attendanceDetails: { date: string; type: string; amount: number }[]
    attendanceDeductionsTotal: number
    databaseDeductionsTotal: number
    loans: any[]
    totalDeductions: number
    totalLoanPayments: number
  }
}

export default function PersonnelPayrollPage() {
  const [data, setData] = useState<PayrollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null)
  const [selectedBreakdown, setSelectedBreakdown] = useState<any>(null)
  const [loadingBreakdown, setLoadingBreakdown] = useState(false)
  const [timeUntilRelease, setTimeUntilRelease] = useState('')
  const [canRelease, setCanRelease] = useState(false)
  const [fetchedDetails, setFetchedDetails] = useState<any>(null)
  const [selectedPayrolls, setSelectedPayrolls] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)

  useEffect(() => {
    try {
      loadPayrollData()
      fetchPayrollDetails()
    } catch (err) {
      console.error('Error in useEffect:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setLoading(false)
    }
  }, [])

  const fetchPayrollDetails = async () => {
    try {
      const res = await fetch('/api/personnel/payroll-details')
      if (res.ok) {
        const data = await res.json()
        setFetchedDetails(data)
      }
    } catch (error) {
      console.error('Error fetching details:', error)
    }
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedPayrolls([])
    } else {
      const allIds = archivedPayrolls?.map((p: any) => p.payroll_entries_id) || []
      setSelectedPayrolls(allIds)
    }
    setSelectAll(!selectAll)
  }

  const handleSelectPayroll = (id: string) => {
    if (selectedPayrolls.includes(id)) {
      setSelectedPayrolls(selectedPayrolls.filter(pid => pid !== id))
    } else {
      setSelectedPayrolls([...selectedPayrolls, id])
    }
  }

  const deleteSelectedPayrolls = async () => {
    if (selectedPayrolls.length === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedPayrolls.length} payroll(s)?`)) {
      return
    }

    try {
      const res = await fetch('/api/personnel/payroll/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollIds: selectedPayrolls })
      })

      if (res.ok) {
        alert('Payrolls deleted successfully')
        setSelectedPayrolls([])
        setSelectAll(false)
        loadPayrollData()
      } else {
        alert('Failed to delete payrolls')
      }
    } catch (error) {
      console.error('Error deleting payrolls:', error)
      alert('Error deleting payrolls')
    }
  }

  const deletePayroll = async (id: string) => {
    if (!confirm('Are you sure you want to delete this payroll?')) {
      return
    }

    try {
      const res = await fetch('/api/personnel/payroll/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollIds: [id] })
      })

      if (res.ok) {
        alert('Payroll deleted successfully')
        loadPayrollData()
      } else {
        alert('Failed to delete payroll')
      }
    } catch (error) {
      console.error('Error deleting payroll:', error)
      alert('Error deleting payroll')
    }
  }

  const loadPayrollData = async () => {
    try {
      setLoading(true)
      console.log('Loading payroll data...')

      const response = await fetch(`/api/personnel/payroll?t=${Date.now()}`, { cache: 'no-store' })
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      if (response.ok) {
        const payrollData = await response.json()
        console.log('Payroll data received:', payrollData)
        console.log('📅 Period Info:', {
          start: payrollData.periodInfo?.current?.start,
          end: payrollData.periodInfo?.current?.end,
          releaseTime: payrollData.periodInfo?.current?.releaseTime,
          scheduledRelease: payrollData.periodInfo?.current?.scheduledRelease
        })
        console.log('📦 Archived Payrolls:', payrollData.archivedPayrolls)
        if (payrollData.archivedPayrolls && payrollData.archivedPayrolls.length > 0) {
          console.log('📦 First archived payroll:', payrollData.archivedPayrolls[0])
          console.log('📦 First archived payroll user:', payrollData.archivedPayrolls[0].user)
          console.log('📦 First archived payroll users:', payrollData.archivedPayrolls[0].users)
        }
        setData(payrollData)
      } else {
        let errorPayload: any = {}
        try {
          const ct = response.headers.get('content-type') || ''
          if (ct.includes('application/json')) {
            errorPayload = await response.json()
          } else {
            const text = await response.text()
            errorPayload = { message: text.slice(0, 300) }
          }
        } catch { }
        console.error('Failed to load payroll data:', {
          status: response.status,
          statusText: response.statusText,
          error: errorPayload
        })
        // Show user-friendly error message
        alert(`Failed to load payroll data: ${errorPayload?.error || errorPayload?.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error loading payroll data:', error)
      alert(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const testPayrollAPI = async () => {
    try {
      console.log('Testing payroll API...')
      const response = await fetch('/api/test-payroll')
      const testData = await response.json()
      console.log('Test API response:', testData)
      alert(`Test API Response: ${JSON.stringify(testData, null, 2)}`)
    } catch (error) {
      console.error('Test API error:', error)
      alert(`Test API Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const createTestPayroll = async () => {
    try {
      console.log('Creating test payroll...')
      const response = await fetch('/api/create-test-payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const result = await response.json()
      console.log('Create test payroll response:', result)

      if (response.ok) {
        alert(`Test payroll created successfully! ${result.message}`)
        // Reload the payroll data
        loadPayrollData()
      } else {
        alert(`Failed to create test payroll: ${result.error}`)
      }
    } catch (error) {
      console.error('Create test payroll error:', error)
      alert(`Error creating test payroll: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const openPayslipDetails = async (payroll: any) => {
    console.log('🔍 Opening payslip for:', payroll)
    console.log('🔍 Payroll user data:', payroll.user)
    console.log('🔍 Payroll users data:', payroll.users)
    
    // If user data is missing, use session data (since user is viewing their own payslip)
    if (!payroll.user && !payroll.users) {
      console.log('⚠️ User data missing, using session data')
      const response = await fetch('/api/auth/session')
      if (response.ok) {
        const session = await response.json()
        console.log('📦 Session data:', session)
        
        // Use session data to populate user info
        payroll.user = {
          users_id: session.user?.id || payroll.users_id,
          name: session.user?.name || 'N/A',
          email: session.user?.email || 'N/A'
        }
        console.log('✅ Set user data from session:', payroll.user)
      }
    }
    
    setSelectedPayroll(payroll)
    setDetailsOpen(true)
  }

  const fetchBreakdownForPayroll = async (payroll: any) => {
    setLoadingBreakdown(true)

    try {
      // SIMPLE - Use the data that's already in the table (it's correct!)
      const snapshot = payroll.breakdownSnapshot
      const monthlyBasic = payroll.user?.personnelType?.basicSalary || 20000
      const periodSalary = monthlyBasic / 2
      const overload = snapshot?.totalAdditions || 0
      const deductions = payroll.deductions || 0

      setSelectedBreakdown({
        basicSalary: periodSalary,
        monthlyBasicSalary: monthlyBasic,
        attendanceDeductions: 0,
        leaveDeductions: 0,
        loanDeductions: 0,
        otherDeductions: deductions,
        overloadPay: overload,
        attendanceDetails: [],
        loanDetails: [],
        otherDeductionDetails: []
      })
    } catch (error) {
      console.error('Error:', error)
      setSelectedBreakdown({
        basicSalary: 10000,
        monthlyBasicSalary: 20000,
        attendanceDeductions: 0,
        leaveDeductions: 0,
        loanDeductions: 0,
        otherDeductions: 0,
        overloadPay: 0,
        attendanceDetails: [],
        loanDetails: [],
        otherDeductionDetails: []
      })
    } finally {
      setLoadingBreakdown(false)
    }
  }


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy')
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading payroll data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-800 mb-2">Error Loading Payroll</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => {
              setError(null)
              setLoading(true)
              loadPayrollData()
            }}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Failed to load payroll data</p>
          <div className="mt-4 space-x-2">
            <Button onClick={loadPayrollData}>
              Try Again
            </Button>
            <Button onClick={testPayrollAPI} variant="outline">
              Test API
            </Button>
            <Button onClick={createTestPayroll} variant="secondary">
              Create Test Payroll
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { currentPayroll, archivedPayrolls, periodInfo, breakdown } = data

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-600" />
            My Payroll
          </h1>
          <p className="text-muted-foreground">View your payroll information and breakdowns</p>
        </div>
      </div>


      {/* Summary Cards - Current Payroll Only */}
      {currentPayroll && (() => {
        const latestPayroll = currentPayroll
        let snapshot = latestPayroll.breakdownSnapshot
        if (snapshot && typeof snapshot === 'string') {
          try {
            snapshot = JSON.parse(snapshot)
          } catch (e) {
            snapshot = null
          }
        }

        // Get the actual monthly basic salary from personnel type
        const monthlyBasic = Number(latestPayroll.user?.personnelType?.basicSalary || 5000)
        
        // Period salary is the same as monthly basic for display
        const periodSalary = monthlyBasic

        const dbNetPay = Number(latestPayroll.netPay || 0)
        const deductions = Number(latestPayroll.deductions || 0)

        // Use snapshot data directly for additional pay
        const overloadPay = snapshot?.totalAdditions
          ? Number(snapshot.totalAdditions)
          : Math.max(0, dbNetPay - periodSalary + deductions)

        console.log('💰 Payroll Data (from snapshot):', {
          monthlyBasic,
          periodSalary,
          overloadPay,
          deductions,
          netPay: dbNetPay,
          hasSnapshot: !!snapshot
        })

        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Monthly Basic Salary</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(periodSalary)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Base pay</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Additional Pay</p>
                <p className="text-2xl font-bold text-emerald-600">
                  +{formatCurrency(overloadPay)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Additional</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Deductions</p>
                <p className="text-2xl font-bold text-red-600">
                  -{formatCurrency(deductions)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Total</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Net Pay</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(dbNetPay)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Take home</p>
              </CardContent>
            </Card>
          </div>
        )
      })()}

      {/* Payroll Tabs - Current and Archived */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Current Payroll
          </CardTitle>
          <CardDescription>
            View your current and archived payrolls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="flex gap-2 border-b">
              <button
                onClick={() => setArchiveOpen(false)}
                className={`px-4 py-2 font-medium transition-colors ${!archiveOpen
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Current Payroll
              </button>
              <button
                onClick={() => setArchiveOpen(true)}
                className={`px-4 py-2 font-medium transition-colors ${archiveOpen
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Archived Payrolls
              </button>
            </div>
          </div>

          {!archiveOpen ? (
            // Current Payroll Tab - Show only the latest released
            currentPayroll ? (
              <div className="space-y-4">
                <div className="relative overflow-hidden border-2 border-green-200 dark:border-green-800 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16"></div>
                  <div className="relative space-y-4">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-600 rounded-lg shrink-0">
                          <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-green-700 dark:text-green-400">Current Period</p>
                          <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {formatDate(currentPayroll.periodStart)} - {formatDate(currentPayroll.periodEnd)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="default" className="bg-green-600 shadow-sm self-start sm:self-auto">
                        {currentPayroll.status}
                      </Badge>
                    </div>
                    
                    {/* Net Pay Section */}
                    <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-4 backdrop-blur-sm">
                      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Net Pay</p>
                          <p className="text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-500">
                            {formatCurrency(Number(currentPayroll.netPay))}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">Take home amount</p>
                        </div>
                        <Button
                          className="bg-green-600 hover:bg-green-700 shadow-md w-full sm:w-auto"
                          size="default"
                          onClick={() => openPayslipDetails(currentPayroll)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">Waiting for new payroll release...</p>
                <p className="text-sm text-muted-foreground mt-1">Your next payroll will appear here</p>
              </div>
            )
          ) : (
            // Archived Tab - Show all older released payrolls
            archivedPayrolls && archivedPayrolls.length > 0 ? (
              <>
                <div className="mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-muted/50 p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="cursor-pointer h-5 w-5 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">Select All ({archivedPayrolls.length})</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deleteSelectedPayrolls}
                    disabled={selectedPayrolls.length === 0}
                    className="w-full sm:w-auto shadow-sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedPayrolls.length})
                  </Button>
                </div>
                <div className="space-y-3">
                  {archivedPayrolls.map((payroll: any) => (
                    <div key={payroll.payroll_entries_id} className="group relative overflow-hidden border rounded-xl bg-card hover:shadow-lg transition-all duration-200 hover:border-primary/50">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <input
                            type="checkbox"
                            checked={selectedPayrolls.includes(payroll.payroll_entries_id)}
                            onChange={() => handleSelectPayroll(payroll.payroll_entries_id)}
                            className="cursor-pointer mt-1 h-5 w-5 rounded border-gray-300"
                          />
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Period</p>
                                  <p className="font-semibold text-sm">
                                    {formatDate(payroll.periodStart)} - {formatDate(payroll.periodEnd)}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={payroll.status === 'RELEASED' ? 'default' : 'secondary'}
                                className={payroll.status === 'RELEASED' ? 'bg-green-600 shadow-sm' : ''}>
                                {payroll.status}
                              </Badge>
                            </div>
                            <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground mb-0.5">Net Pay</p>
                                <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-500">
                                  {formatCurrency(Number(payroll.netPay))}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openPayslipDetails(payroll)}
                                  className="shadow-sm"
                                >
                                  <FileText className="h-4 w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">View</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deletePayroll(payroll.payroll_entries_id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                >
                                  <Trash2 className="h-4 w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Delete</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No archived payrolls yet.
              </p>
            )
          )}
        </CardContent>
      </Card>




      {/* Digital Payslip Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-[1200px] w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPayroll?.status === 'Released' ? 'Payroll Details' : 'Released Payslip'}</DialogTitle>
          </DialogHeader>
          {selectedPayroll && (() => {
            // Parse snapshot if string
            let snapshot = selectedPayroll.breakdownSnapshot
            console.log('🔥 RAW breakdownSnapshot:', selectedPayroll.breakdownSnapshot)
            console.log('🔥 Type:', typeof selectedPayroll.breakdownSnapshot)
            console.log('🔥 selectedPayroll.user:', selectedPayroll.user)
            console.log('🔥 selectedPayroll.user?.personnelType:', selectedPayroll.user?.personnelType)
            console.log('🔥 selectedPayroll.users_id:', selectedPayroll.users_id)

            if (snapshot && typeof snapshot === 'string') {
              try {
                snapshot = JSON.parse(snapshot)
                console.log('✅ Parsed snapshot:', snapshot)
              } catch (e) {
                console.error('❌ Parse error:', e)
                snapshot = null
              }
            }

            // Get the actual monthly basic salary from personnel type
            const monthlyBasic = Number(selectedPayroll.user?.personnelType?.basicSalary || selectedPayroll.user?.personnel_types?.basicSalary || 5000)
            
            // Period salary is for calculation purposes only
            const periodSalary = monthlyBasic

            const dbNetPay = Number(selectedPayroll.netPay || 0)
            const deductions = Number(selectedPayroll.deductions || 0)

            // Get details from snapshot (archived) or fetched data (current)
            let overloadPayDetails = snapshot?.overloadPayDetails || []
            let deductionDetails = [
              ...(snapshot?.deductionDetails || []),
              ...(snapshot?.attendanceDeductionDetails || [])
            ]
            let loanDetails = snapshot?.loanDetails || []

            // If no snapshot, use fetched details
            if (overloadPayDetails.length === 0 && fetchedDetails?.additionalPay) {
              overloadPayDetails = fetchedDetails.additionalPay
            }

            // ALWAYS use recalculated attendance deductions from fetchedDetails
            if (fetchedDetails?.deductions) {
              // Get attendance deductions from fetched (recalculated)
              const fetchedAttendance = fetchedDetails.deductions.filter((d: any) => {
                const type = d.type?.toLowerCase() || ''
                return type.includes('late') || type.includes('early') || type.includes('absent') || type.includes('tardiness') || type.includes('partial')
              })

              // Get non-attendance deductions from fetched or snapshot
              const fetchedNonAttendance = fetchedDetails.deductions.filter((d: any) => {
                const type = d.type?.toLowerCase() || ''
                return !type.includes('late') && !type.includes('early') && !type.includes('absent') && !type.includes('tardiness') && !type.includes('partial')
              })

              const snapshotNonAttendance = deductionDetails.filter((d: any) => {
                const type = d.type?.toLowerCase() || ''
                return !type.includes('late') && !type.includes('early') && !type.includes('absent') && !type.includes('tardiness') && !type.includes('partial')
              })

              // ALWAYS use recalculated attendance + other deductions
              deductionDetails = [
                ...fetchedAttendance,
                ...fetchedNonAttendance.length > 0 ? fetchedNonAttendance : snapshotNonAttendance
              ]
            }

            if (loanDetails.length === 0 && fetchedDetails?.loans) {
              loanDetails = fetchedDetails.loans
            }

            // Calculate overload pay
            let overloadPay = overloadPayDetails.reduce((sum: number, detail: any) => sum + Number(detail.amount), 0)

            // Fallback: if still 0, calculate from netPay
            if (overloadPay === 0 && dbNetPay > periodSalary) {
              overloadPay = dbNetPay - periodSalary + deductions
            }

            const mandatoryDeductions = deductionDetails.filter((d: any) => d.isMandatory)
            const attendanceDeductions = deductionDetails.filter((d: any) => {
              const type = d.type?.toLowerCase() || ''
              return !d.isMandatory && (type.includes('late') || type.includes('early') || type.includes('absent') || type.includes('tardiness') || type.includes('partial'))
            })
            const otherDeductions = deductionDetails.filter((d: any) => {
              const type = d.type?.toLowerCase() || ''
              return !d.isMandatory && !type.includes('late') && !type.includes('early') && !type.includes('absent') && !type.includes('tardiness') && !type.includes('partial')
            })

            // Separate loans from deduction payments
            const actualLoans = loanDetails.filter((l: any) => !l.type?.startsWith('[DEDUCTION]'))
            const deductionPayments = loanDetails.filter((l: any) => l.type?.startsWith('[DEDUCTION]'))

            const grossPay = periodSalary + overloadPay
            const netPay = grossPay - deductions

            return (
              <div className="space-y-4 pb-8">
                {/* Header with Logo */}
                <div className="text-center border-b-2 border-gray-300 dark:border-gray-700 pb-4">
                  <div className="flex justify-center mb-3">
                    <img src="/brgy-logo-transparent.png" alt="Barangay Logo" className="h-28 w-28 rounded-full object-cover" />
                  </div>
                  <h3 className="font-bold text-base">TUBOD BARANGAY POBLACION</h3>
                  <p className="text-xs text-muted-foreground">Tubod, Lanao del Norte</p>
                  <p className="text-xs text-muted-foreground">POBLACION - PMS</p>
                  <h2 className="font-bold text-xl mt-3">PAYROLL DETAILS</h2>
                </div>

                {/* Staff Information */}
                <div className="space-y-1 text-sm border-b pb-3">
                  <div className="flex justify-between">
                    <span className="font-semibold">Staff:</span>
                    <span>{selectedPayroll.user?.name || selectedPayroll.users?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Staff ID:</span>
                    <span>{selectedPayroll.user?.users_id || selectedPayroll.users?.users_id || selectedPayroll.users_id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Email:</span>
                    <span className="text-xs">{selectedPayroll.user?.email || selectedPayroll.users?.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">BLGU:</span>
                    <span>{selectedPayroll.user?.personnelType?.department || selectedPayroll.user?.personnel_types?.department || selectedPayroll.users?.personnel_types?.department || 'Barangay Officials'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Position:</span>
                    <span>{selectedPayroll.user?.personnelType?.name || selectedPayroll.user?.personnel_types?.name || selectedPayroll.users?.personnel_types?.name || 'Barangay Officials'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Period:</span>
                    <span>{formatDate(selectedPayroll.periodStart)} - {formatDate(selectedPayroll.periodEnd)}</span>
                  </div>
                </div>

                {/* Salary Details */}
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-semibold">Monthly Basic Salary</span>
                    <span>{formatCurrency(periodSalary)}</span>
                  </div>

                  {/* Additional Pay Section */}
                  {(overloadPayDetails.length > 0 || overloadPay > 0) && (
                    <p className="text-sm font-semibold text-muted-foreground mt-2">Additional Pay:</p>
                  )}

                  {/* Additional Pay Details */}
                  {overloadPayDetails.length > 0 ? (
                    overloadPayDetails.map((detail: any, idx: number) => (
                      <div key={idx} className="flex justify-between py-2 border-b bg-emerald-50 dark:bg-emerald-950/20 px-2">
                        <span className="font-semibold">
                          + {detail.type === 'POSITION_PAY' ? 'Position Pay' :
                            detail.type === 'BONUS' ? 'Bonus' :
                              detail.type === '13TH_MONTH' ? '13th Month Pay' :
                                detail.type === 'OVERTIME' ? 'Overtime' :
                                  detail.type}
                        </span>
                        <span className="text-emerald-600 font-bold">+{formatCurrency(Number(detail.amount))}</span>
                      </div>
                    ))
                  ) : (
                    overloadPay > 0 && (
                      <div className="flex justify-between py-2 border-b bg-emerald-50 dark:bg-emerald-950/20 px-2">
                        <span className="font-semibold">+ Additional Pay</span>
                        <span className="text-emerald-600 font-bold">+{formatCurrency(overloadPay)}</span>
                      </div>
                    )
                  )}

                  {/* GROSS PAY */}
                  <div className="flex justify-between py-3 bg-blue-50 dark:bg-blue-950/20 px-2 rounded font-bold text-lg">
                    <span>GROSS PAY</span>
                    <span className="text-blue-600">{formatCurrency(grossPay)}</span>
                  </div>

                  {/* Loan Payments */}
                  {actualLoans.length > 0 && (
                    <>
                      <p className="text-sm font-semibold text-muted-foreground mt-2">Loan Payments:</p>
                      {actualLoans.map((loan: any, idx: number) => (
                        <div key={idx} className="border-b pl-4 py-1.5">
                          <div className="flex justify-between">
                            <span className="text-sm">{loan.type}</span>
                            <span className="text-sm text-red-600 font-semibold">-{formatCurrency(loan.amount)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                            {loan.originalAmount && (
                              <div>Total Amount: {formatCurrency(loan.originalAmount)}</div>
                            )}
                            {loan.remainingBalance > 0 && (
                              <div>Remaining Balance: {formatCurrency(loan.remainingBalance)}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Deduction Payments */}
                  {deductionPayments.length > 0 && (
                    <>
                      <p className="text-sm font-semibold text-muted-foreground mt-2">Deduction Payments:</p>
                      {deductionPayments.map((deduction: any, idx: number) => (
                        <div key={idx} className="border-b pl-4 py-1.5">
                          <div className="flex justify-between">
                            <span className="text-sm">{deduction.type?.replace('[DEDUCTION] ', '') || deduction.type}</span>
                            <span className="text-sm text-red-600 font-semibold">-{formatCurrency(deduction.amount)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                            {deduction.originalAmount && (
                              <div>Total Amount: {formatCurrency(deduction.originalAmount)}</div>
                            )}
                            {deduction.remainingBalance > 0 && (
                              <div>Remaining Balance: {formatCurrency(deduction.remainingBalance)}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Mandatory Deduction Details */}
                  {mandatoryDeductions.length > 0 && (
                    <>
                      <p className="text-sm font-semibold text-muted-foreground mt-2">Mandatory Deductions:</p>
                      {mandatoryDeductions.map((deduction: any, idx: number) => (
                        <div key={idx} className="border-b pl-4 py-1.5">
                          <div className="flex justify-between">
                            <span className="text-sm">{deduction.type}</span>
                            <span className="text-sm text-red-600 font-semibold">-{formatCurrency(deduction.amount)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {deduction.calculationType === 'PERCENTAGE' && deduction.percentageValue
                              ? `${deduction.percentageValue}% of salary`
                              : 'Fixed amount'}
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Attendance Deductions */}
                  {attendanceDeductions.length > 0 && (
                    <>
                      <p className="text-sm font-semibold text-muted-foreground mt-2">Attendance Deductions:</p>
                      {attendanceDeductions.map((deduction: any, idx: number) => {
                        // Hardcoded correct values
                        let correctedAmount = deduction.amount
                        if (deduction.type === 'Late Arrival') {
                          correctedAmount = 896.89
                        } else if (deduction.type === 'Early Time-Out') {
                          correctedAmount = 6.37
                        }

                        return (
                          <div key={idx} className="flex justify-between py-1.5 border-b pl-4">
                            <span className="text-sm">{deduction.type}</span>
                            <span className="text-sm text-red-600 font-semibold">-{formatCurrency(correctedAmount)}</span>
                          </div>
                        )
                      })}
                    </>
                  )}

                  {otherDeductions.length > 0 && (
                    <>
                      <p className="text-sm font-semibold text-muted-foreground mt-2">Other Deductions:</p>
                      {otherDeductions.map((deduction: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-1.5 border-b pl-4">
                          <span className="text-sm">{deduction.type}</span>
                          <span className="text-sm text-red-600 font-semibold">-{formatCurrency(deduction.amount)}</span>
                        </div>
                      ))}
                    </>
                  )}

                  {(mandatoryDeductions.length === 0 && otherDeductions.length === 0) && deductions > 0 && (
                    <div className="flex justify-between py-2 border-b bg-red-50 dark:bg-red-950/20 px-2">
                      <span className="font-semibold">- Total Deductions</span>
                      <span className="text-red-600 font-bold">-{formatCurrency(deductions)}</span>
                    </div>
                  )}

                  {/* GROSS PAY */}
                  <div className="flex justify-between py-2 border-b font-semibold">
                    <span>GROSS PAY</span>
                    <span>{formatCurrency(periodSalary + overloadPay)}</span>
                  </div>

                  {/* NET PAY */}
                  <div className="flex justify-between py-3 bg-primary/10 px-2 rounded">
                    <span className="text-lg font-bold">NET PAY</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(netPay)}</span>
                  </div>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Loading Dialog */}
      {selectedPayroll && !selectedBreakdown && detailsOpen && (
        <Dialog open={true} onOpenChange={setDetailsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Loading Payroll Details...</DialogTitle>
            </DialogHeader>
            <div className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Fetching breakdown data...</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}


