"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Banknote, TrendingUp, Calendar, FileText, Clock, CheckCircle, AlertCircle, Archive } from 'lucide-react'
import { format } from 'date-fns'
import { RequestLoanDialog } from '@/components/personnel/RequestLoanDialog'

interface LoanData {
  loans: any[]
  summary: {
    totalLoans: number
    activeLoans: number
    completedLoans: number
    totalActiveLoanAmount: number
    totalMonthlyPayments: number
    totalBiweeklyPayments: number
    totalRemainingBalance: number
  }
  paymentHistory: any[]
}

export default function PersonnelLoansPage() {
  const [data, setData] = useState<LoanData | null>(null)
  const [archivedLoans, setArchivedLoans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedLoan, setSelectedLoan] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'rejected' | 'archived'>('active')

  useEffect(() => {
    loadLoansData()
    loadArchivedLoans()
  }, [])

  const loadLoansData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/personnel/loans')

      if (response.ok) {
        const loansData = await response.json()
        setData(loansData)
      } else {
        // Handle 401 Unauthorized - redirect to login
        if (response.status === 401) {
          window.location.href = '/'
          return
        }

        // Try to get error details from response
        let errorMessage = 'Unknown error'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorData.details || 'Unknown error'
        } catch (e) {
          errorMessage = response.statusText || 'Unknown error'
        }

        console.error('Failed to load loans data:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage
        })

        setData(null)
      }
    } catch (error) {
      console.error('Error loading loans data:', error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const loadArchivedLoans = async () => {
    try {
      const response = await fetch('/api/personnel/loans?archived=true')

      if (response.ok) {
        const data = await response.json()
        setArchivedLoans(data.loans || [])
      } else {
        console.error('Failed to load archived loans')
      }
    } catch (error) {
      console.error('Error loading archived loans:', error)
    }
  }

  const viewDetails = (loan: any) => {
    setSelectedLoan(loan)
    setDetailsOpen(true)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Clock className="w-4 h-4" />
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4" />
      case 'PENDING':
        return <Clock className="w-4 h-4" />
      case 'REJECTED':
        return <AlertCircle className="w-4 h-4" />
      case 'CANCELLED':
        return <Archive className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading loans data...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Failed to load loans data</p>
          <Button onClick={loadLoansData} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const { loans } = data

  const filterLoans = (items: any[], includeArchived: boolean = false) => {
    // Active tab: show ACTIVE only
    if (activeTab === 'active') {
      return items.filter(l => {
        const isDed = l.purpose?.startsWith('[DEDUCTION]')
        return !isDed && l.status === 'ACTIVE'
      })
    }

    // Pending tab: show PENDING only
    if (activeTab === 'pending') {
      return items.filter(l => {
        const isDed = l.purpose?.startsWith('[DEDUCTION]')
        return !isDed && l.status === 'PENDING'
      })
    }

    // Rejected tab: show REJECTED only
    if (activeTab === 'rejected') {
      return items.filter(l => {
        const isDed = l.purpose?.startsWith('[DEDUCTION]')
        return !isDed && l.status === 'REJECTED'
      })
    }

    // Archived tab: show COMPLETED and archived loans (excluding REJECTED)
    if (activeTab === 'archived') {
      const inactive = items.filter(l => {
        const isDed = l.purpose?.startsWith('[DEDUCTION]')
        return !isDed && l.status === 'COMPLETED'
      })
      const archived = archivedLoans.filter(l => {
        const isDed = l.purpose?.startsWith('[DEDUCTION]')
        return !isDed
      })
      return [...inactive, ...archived]
    }

    return []
  }

  const activeLoansList = filterLoans(loans, true)
  const pendingCount = loans.filter(l => !l.purpose?.startsWith('[DEDUCTION]') && l.status === 'PENDING').length
  const rejectedCount = loans.filter(l => !l.purpose?.startsWith('[DEDUCTION]') && l.status === 'REJECTED').length

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
            <Banknote className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            My Loans
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">View your active and completed loans</p>
        </div>
        <div className="flex gap-2">
          <RequestLoanDialog onSuccess={loadLoansData} />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 sm:gap-2 border-b overflow-x-auto pb-0">
        <Button
          variant={activeTab === 'active' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('active')}
          className="rounded-b-none text-xs sm:text-sm whitespace-nowrap"
          size="sm"
        >
          <span className="hidden sm:inline">Active Loans</span>
          <span className="sm:hidden">Active</span>
        </Button>
        <Button
          variant={activeTab === 'pending' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('pending')}
          className="rounded-b-none relative text-xs sm:text-sm whitespace-nowrap"
          size="sm"
        >
          <Clock className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
          <span className="hidden sm:inline">Pending</span>
          {pendingCount > 0 && (
            <Badge className="ml-1 sm:ml-2 bg-yellow-500 hover:bg-yellow-600 text-white border-0 h-4 sm:h-5 px-1 sm:px-1.5 text-xs">
              {pendingCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'rejected' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('rejected')}
          className="rounded-b-none relative text-xs sm:text-sm whitespace-nowrap"
          size="sm"
        >
          <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
          <span className="hidden sm:inline">Rejected</span>
          {rejectedCount > 0 && (
            <Badge className="ml-1 sm:ml-2 bg-red-500 hover:bg-red-600 text-white border-0 h-4 sm:h-5 px-1 sm:px-1.5 text-xs">
              {rejectedCount}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'archived' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('archived')}
          className="rounded-b-none text-xs sm:text-sm whitespace-nowrap"
          size="sm"
        >
          <Archive className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
          <span className="hidden sm:inline">Archived</span>
        </Button>
      </div>

      <div className="space-y-6">
        {/* Loan Statistics */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <Card className="border-l-4 border-l-blue-500 bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
              <CardTitle className="text-xs font-medium">Active Loans</CardTitle>
              <FileText className="h-3.5 w-3.5 text-blue-600" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl font-bold">{loans.filter(l => !l.purpose?.startsWith('[DEDUCTION]') && l.status === 'ACTIVE').length}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500 bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
              <CardTitle className="text-xs font-medium">Pending</CardTitle>
              <Clock className="h-3.5 w-3.5 text-yellow-600" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl font-bold">{loans.filter(l => !l.purpose?.startsWith('[DEDUCTION]') && l.status === 'PENDING').length}</div>
              <p className="text-xs text-muted-foreground">Waiting</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
              <CardTitle className="text-xs font-medium">Total Amount</CardTitle>
              <span className="text-base font-bold text-green-600">₱</span>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl font-bold">
                {formatCurrency(loans.filter(l => !l.purpose?.startsWith('[DEDUCTION]') && l.status === 'ACTIVE').reduce((sum, l) => sum + l.loanAmount, 0))}
              </div>
              <p className="text-xs text-muted-foreground">Active loans</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500 bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
              <CardTitle className="text-xs font-medium">Balance</CardTitle>
              <TrendingUp className="h-3.5 w-3.5 text-orange-600" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl font-bold">
                {formatCurrency(loans.filter(l => !l.purpose?.startsWith('[DEDUCTION]') && l.status === 'ACTIVE').reduce((sum, l) => sum + l.remainingBalance, 0))}
              </div>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
              <CardTitle className="text-xs font-medium">Per Payroll</CardTitle>
              <FileText className="h-3.5 w-3.5 text-purple-600" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl font-bold">
                {formatCurrency(loans.filter(l => !l.purpose?.startsWith('[DEDUCTION]') && l.status === 'ACTIVE').reduce((sum, l) => sum + (l.monthlyPayment || 0), 0))}
              </div>
              <p className="text-xs text-muted-foreground">Collection</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500 bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-4">
              <CardTitle className="text-xs font-medium">Completed</CardTitle>
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-xl font-bold">
                {loans.filter(l => !l.purpose?.startsWith('[DEDUCTION]') && l.status === 'COMPLETED').length +
                  archivedLoans.filter(l => !l.purpose?.startsWith('[DEDUCTION]')).length}
              </div>
              <p className="text-xs text-muted-foreground">Done</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Loans List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              {activeTab === 'active' ? 'Active Loans' :
                activeTab === 'pending' ? 'Pending Requests' :
                  activeTab === 'rejected' ? 'Rejected Requests' : 'Loan History'}
            </CardTitle>
            <CardDescription>
              {activeTab === 'active' ? 'Your currently active loans' :
                activeTab === 'pending' ? 'Loan requests waiting for approval' :
                  activeTab === 'rejected' ? 'Loan requests that were rejected' :
                    'All loans including completed and archived'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeLoansList.length > 0 ? (
              <div className="space-y-4">
                {activeLoansList.map((loan) => (
                  <div key={loan.loans_id} className="group relative overflow-hidden border-2 rounded-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="relative p-4 sm:p-5">
                      <div className="flex flex-col gap-3 mb-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="p-2 bg-blue-600 rounded-lg shrink-0">
                              <Banknote className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base sm:text-lg truncate">{loan.purpose}</h3>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {formatDate(loan.createdAt)}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(loan.status) + " shrink-0"}>
                            {getStatusIcon(loan.status)}
                            <span className="ml-1">{loan.status}</span>
                          </Badge>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => viewDetails(loan)}
                          className="w-full sm:w-auto shadow-sm"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          <span className="hidden sm:inline">View Details</span>
                          <span className="sm:hidden">Details</span>
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                        <div className="text-center p-3 bg-white/70 dark:bg-gray-900/50 rounded-lg backdrop-blur-sm border">
                          <p className="text-xs text-muted-foreground mb-1">Original Amount</p>
                          <p className="font-bold text-sm sm:text-base text-blue-600">{formatCurrency(loan.loanAmount || loan.amount)}</p>
                        </div>
                        <div className="text-center p-3 bg-white/70 dark:bg-gray-900/50 rounded-lg backdrop-blur-sm border">
                          <p className="text-xs text-muted-foreground mb-1">Monthly Payment</p>
                          <p className="font-bold text-sm sm:text-base text-green-600">{formatCurrency(loan.monthlyPayment)}</p>
                        </div>
                        <div className="text-center p-3 bg-white/70 dark:bg-gray-900/50 rounded-lg backdrop-blur-sm border">
                          <p className="text-xs text-muted-foreground mb-1">Per Payroll</p>
                          <p className="font-bold text-sm sm:text-base text-purple-600">{formatCurrency(loan.monthlyPayment || 0)}</p>
                        </div>
                        <div className="text-center p-3 bg-white/70 dark:bg-gray-900/50 rounded-lg backdrop-blur-sm border">
                          <p className="text-xs text-muted-foreground mb-1">{loan.status === 'COMPLETED' || loan.status === 'ARCHIVED' ? 'Final' : 'Remaining'}</p>
                          <p className="font-bold text-sm sm:text-base text-red-600">{formatCurrency(loan.remainingBalance || loan.balance)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                  <Banknote className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Loans Found</h3>
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'active' ? "You don't have any active loans at this time." :
                    activeTab === 'pending' ? "You don't have any pending loan requests." :
                      activeTab === 'rejected' ? "You don't have any rejected loan requests." :
                        "You don't have any loans in history."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Loan Details Dialog (Shared) */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-blue-600" />
              Loan Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about your loan
            </DialogDescription>
          </DialogHeader>

          {selectedLoan && (
            <div className="space-y-6">
              {/* Loan Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="md:col-span-2 border-b border-border pb-3">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Loan Purpose
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {selectedLoan.purpose || 'Not specified'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge className={getStatusColor(selectedLoan.status)}>
                    {getStatusIcon(selectedLoan.status)}
                    <span className="ml-1">{selectedLoan.status}</span>
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium">{formatDate(selectedLoan.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Term</p>
                  <p className="font-medium">{selectedLoan.termMonths} months</p>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div>
                <h4 className="font-medium mb-3">Financial Breakdown</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Original Amount</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(selectedLoan.loanAmount || selectedLoan.amount)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Monthly Payment</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(selectedLoan.monthlyPayment)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Per Payroll Deduction</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(selectedLoan.monthlyPayment)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Total Payments Made</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(selectedLoan.totalPaymentsMade || 0)}
                      </TableCell>
                    </TableRow>
                    <TableRow className="font-medium">
                      <TableCell>Remaining Balance</TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(selectedLoan.remainingBalance || selectedLoan.balance)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
