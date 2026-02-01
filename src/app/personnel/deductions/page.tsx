"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TrendingUp, FileText, Clock, CheckCircle, AlertCircle, CreditCard as DeductionIcon, Archive, Banknote } from 'lucide-react'
import { format } from 'date-fns'

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

export default function PersonnelDeductionsPage() {
    const [data, setData] = useState<LoanData | null>(null)
    const [archivedLoans, setArchivedLoans] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [selectedLoan, setSelectedLoan] = useState<any>(null)
    const [showArchived, setShowArchived] = useState(false)

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
                console.error('Failed to load deductions data')
            }
        } catch (error) {
            console.error('Error loading deductions data:', error)
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
                console.error('Failed to load archived deductions')
            }
        } catch (error) {
            console.error('Error loading archived deductions:', error)
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
            case 'CANCELLED':
                return 'bg-red-100 text-red-800'
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
            case 'CANCELLED':
                return <AlertCircle className="w-4 h-4" />
            default:
                return <Clock className="w-4 h-4" />
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading deductions...</p>
                </div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <p className="text-gray-600">Failed to load deductions data</p>
                    <Button onClick={loadLoansData} className="mt-4">
                        Try Again
                    </Button>
                </div>
            </div>
        )
    }

    const { loans } = data

    const filterDeductions = (items: any[], isDeduction: boolean, includeArchived: boolean = false) => {
        const active = items.filter(l => {
            const isDed = l.purpose?.startsWith('[DEDUCTION]')
            const isActive = l.status === 'ACTIVE'
            return isDed === isDeduction && isActive
        })

        if (includeArchived && showArchived) {
            const inactive = items.filter(l => {
                const isDed = l.purpose?.startsWith('[DEDUCTION]')
                const isNotActive = l.status !== 'ACTIVE'
                return isDed === isDeduction && isNotActive
            })
            const archived = archivedLoans.filter(l => {
                const isDed = l.purpose?.startsWith('[DEDUCTION]')
                return isDed === isDeduction
            })
            return [...active, ...inactive, ...archived]
        }

        return active
    }

    const activeDeductionsList = filterDeductions(loans, true, showArchived)

    return (
        <div className="flex-1 space-y-6 p-4 pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
                        <DeductionIcon className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
                        My Deductions
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">View your active and completed deductions</p>
                </div>
                <Button
                    variant={showArchived ? 'default' : 'outline'}
                    onClick={() => setShowArchived(!showArchived)}
                    className="w-full sm:w-auto"
                >
                    <Archive className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">{showArchived ? 'Active Items Only' : 'Show Archived History'}</span>
                    <span className="sm:hidden">{showArchived ? 'Active Only' : 'Show Archived'}</span>
                </Button>
            </div>

            <div className="space-y-6">
                {/* Deduction Statistics */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                    <Card className="border-l-4 border-l-red-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active</CardTitle>
                            <FileText className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{loans.filter(l => l.purpose?.startsWith('[DEDUCTION]') && l.status === 'ACTIVE').length}</div>
                            <p className="text-xs text-muted-foreground">Currently active</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-orange-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                            <span className="text-2xl font-bold text-red-600">₱</span>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(loans.filter(l => l.purpose?.startsWith('[DEDUCTION]') && l.status === 'ACTIVE').reduce((sum, l) => sum + l.loanAmount, 0))}
                            </div>
                            <p className="text-xs text-muted-foreground">Total deduction amount</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-yellow-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Balance</CardTitle>
                            <TrendingUp className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(loans.filter(l => l.purpose?.startsWith('[DEDUCTION]') && l.status === 'ACTIVE').reduce((sum, l) => sum + l.remainingBalance, 0))}
                            </div>
                            <p className="text-xs text-muted-foreground">Remaining to be paid</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-pink-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Per Payroll</CardTitle>
                            <DeductionIcon className="h-4 w-4 text-pink-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(loans.filter(l => l.purpose?.startsWith('[DEDUCTION]') && l.status === 'ACTIVE').reduce((sum, l) => sum + (l.biweeklyPayment || 0), 0))}
                            </div>
                            <p className="text-xs text-muted-foreground">Per-payroll deduction</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-teal-500 relative">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completed</CardTitle>
                            <CheckCircle className="h-4 w-4 text-teal-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {loans.filter(l => l.purpose?.startsWith('[DEDUCTION]') && l.status === 'COMPLETED').length +
                                    archivedLoans.filter(l => l.purpose?.startsWith('[DEDUCTION]')).length}
                            </div>
                            <p className="text-xs text-muted-foreground">Successfully completed</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Active Deductions List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            {showArchived ? 'Deduction History' : 'Active Deductions'}
                        </CardTitle>
                        <CardDescription>
                            {showArchived ? 'All Deductions including completed and archived' : 'Your currently active deductions'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activeDeductionsList.length > 0 ? (
                            <div className="space-y-4">
                                {activeDeductionsList.map((loan) => (
                                    <div key={loan.loans_id} className="border rounded-lg p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <DeductionIcon className="h-4 w-4 text-red-600" />
                                                    <h3 className="font-medium text-base sm:text-lg">{loan.purpose.replace('[DEDUCTION] ', '')}</h3>
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                                                        Deduction
                                                    </Badge>
                                                </div>
                                                <p className="text-xs sm:text-sm text-gray-600">
                                                    Date: {formatDate(loan.createdAt)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Badge className={getStatusColor(loan.status)}>
                                                    {getStatusIcon(loan.status)}
                                                    <span className="ml-1">{loan.status}</span>
                                                </Badge>
                                                <Button size="sm" variant="outline" onClick={() => viewDetails(loan)}>
                                                    <FileText className="w-4 h-4 mr-1" />
                                                    <span className="hidden sm:inline">Details</span>
                                                    <span className="sm:hidden">View</span>
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                                <p className="text-xs sm:text-sm text-gray-600">Total Amount</p>
                                                <p className="font-bold text-sm sm:text-base text-blue-600">{formatCurrency(loan.loanAmount || loan.amount)}</p>
                                            </div>
                                            <div className="text-center p-3 bg-green-50 rounded-lg">
                                                <p className="text-xs sm:text-sm text-gray-600">Monthly Payment</p>
                                                <p className="font-bold text-sm sm:text-base text-green-600">{formatCurrency(loan.monthlyPayment)}</p>
                                            </div>
                                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                                                <p className="text-xs sm:text-sm text-gray-600">Per Payroll</p>
                                                <p className="font-bold text-sm sm:text-base text-purple-600">{formatCurrency(loan.biweeklyPayment || 0)}</p>
                                            </div>
                                            <div className="text-center p-3 bg-red-50 rounded-lg">
                                                <p className="text-xs sm:text-sm text-gray-600">{loan.status === 'COMPLETED' || loan.status === 'ARCHIVED' ? 'Final Balance' : 'Remaining Balance'}</p>
                                                <p className="font-bold text-sm sm:text-base text-red-600">{formatCurrency(loan.remainingBalance || loan.balance)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <DeductionIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Deductions Found</h3>
                                <p className="text-gray-600">
                                    You don't have any {showArchived ? 'deductions in history' : 'active deductions'} at this time.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Deduction Details Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Banknote className="h-5 w-5 text-red-600" />
                            Deduction Details
                        </DialogTitle>
                        <DialogDescription>
                            Detailed information about your deduction
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLoan && (
                        <div className="space-y-6">
                            {/* Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                                <div className="md:col-span-2 border-b border-border pb-3">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-sm font-medium text-muted-foreground">
                                            Purpose
                                        </span>
                                        <span className="text-2xl font-bold text-primary">
                                            {selectedLoan.purpose?.startsWith('[DEDUCTION]')
                                                ? (selectedLoan.purpose.replace('[DEDUCTION] ', '') || 'Not specified')
                                                : (selectedLoan.purpose || 'Not specified')}
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
                                                {formatCurrency(selectedLoan.biweeklyPayment)}
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
