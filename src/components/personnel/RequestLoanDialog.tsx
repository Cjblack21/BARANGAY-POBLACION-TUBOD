"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PlusCircle, Banknote, Calendar, TrendingUp, FileText, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'

interface RequestLoanDialogProps {
    onSuccess?: () => void
}

export function RequestLoanDialog({ onSuccess }: RequestLoanDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        amount: '',
        purpose: '',
        termMonths: '',
        monthlyPaymentPercent: ''
    })
    const [customTerm, setCustomTerm] = useState('')
    const [customPercent, setCustomPercent] = useState('')
    const [isCustomTerm, setIsCustomTerm] = useState(false)
    const [isCustomPercent, setIsCustomPercent] = useState(false)

    // Auto-calculate monthly payment percentage when term changes
    useEffect(() => {
        const termMonths = parseInt(formData.termMonths)
        if (termMonths > 0 && !isCustomPercent) {
            // Calculate percentage needed to pay off loan in the given term
            const autoPercent = (100 / termMonths).toFixed(2)
            setFormData(prev => ({ ...prev, monthlyPaymentPercent: autoPercent }))
        }
    }, [formData.termMonths, isCustomPercent])

    const calculatePayments = () => {
        const amount = parseFloat(formData.amount) || 0
        const percent = parseFloat(formData.monthlyPaymentPercent) || 0
        const termMonths = parseInt(formData.termMonths) || 0
        const monthlyPayment = (amount * percent) / 100
        const perPayroll = monthlyPayment // Payroll is monthly, so per payroll = monthly payment
        const totalPayments = monthlyPayment * termMonths
        return { monthlyPayment, biweeklyPayment: perPayroll, totalPayments }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch('/api/personnel/loans/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(formData.amount),
                    purpose: formData.purpose,
                    termMonths: parseInt(formData.termMonths),
                    monthlyPaymentPercent: parseFloat(formData.monthlyPaymentPercent)
                })
            })

            const data = await response.json()

            if (response.ok) {
                toast.success('Loan request submitted successfully!')
                setOpen(false)
                setFormData({ amount: '', purpose: '', termMonths: '', monthlyPaymentPercent: '' })
                onSuccess?.()
            } else {
                toast.error(data.error || 'Failed to submit loan request')
            }
        } catch (error) {
            console.error('Error submitting loan request:', error)
            toast.error('Failed to submit loan request')
        } finally {
            setLoading(false)
        }
    }

    const { monthlyPayment, biweeklyPayment, totalPayments } = calculatePayments()
    const hasValues = formData.amount && formData.monthlyPaymentPercent && formData.termMonths

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Request New Loan
                </Button>
            </DialogTrigger>
            <DialogContent className="w-full sm:max-w-6xl max-h-[90vh] overflow-y-auto" style={{ width: '95vw', maxWidth: '1200px' }}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Banknote className="h-6 w-6 text-blue-600" />
                        Request New Loan
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        Complete the form below to submit your loan request. Your request will be reviewed by the admin for approval.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column - Form Inputs */}
                        <div className="space-y-5">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                    Loan Details
                                </h3>

                                <div className="space-y-2">
                                    <Label htmlFor="amount" className="text-base flex items-center gap-2">
                                        <Banknote className="h-4 w-4" />
                                        Loan Amount
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₱</span>
                                        <Input
                                            id="amount"
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            required
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            placeholder="0.00"
                                            className="pl-8 h-11 text-base"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Enter the total amount you wish to borrow</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="purpose" className="text-base">Purpose</Label>
                                    <Textarea
                                        id="purpose"
                                        required
                                        value={formData.purpose}
                                        onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                        placeholder="e.g., Medical expenses, Emergency, Home improvement..."
                                        rows={4}
                                        className="text-base resize-none"
                                    />
                                    <p className="text-xs text-muted-foreground">Briefly explain the reason for your loan request</p>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-blue-600" />
                                    Payment Terms
                                </h3>

                                <div className="space-y-2">
                                    <Label htmlFor="termMonths" className="text-base">Loan Term</Label>
                                    <Select
                                        value={isCustomTerm ? 'custom' : formData.termMonths}
                                        onValueChange={(value) => {
                                            if (value === 'custom') {
                                                setIsCustomTerm(true)
                                                setFormData({ ...formData, termMonths: customTerm })
                                            } else {
                                                setIsCustomTerm(false)
                                                setCustomTerm('')
                                                setFormData({ ...formData, termMonths: value })
                                            }
                                        }}
                                        required
                                    >
                                        <SelectTrigger className="h-11 text-base">
                                            <SelectValue placeholder="Select repayment period" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="6">6 months</SelectItem>
                                            <SelectItem value="12">12 months (1 year)</SelectItem>
                                            <SelectItem value="18">18 months</SelectItem>
                                            <SelectItem value="24">24 months (2 years)</SelectItem>
                                            <SelectItem value="custom">Custom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {isCustomTerm && (
                                        <Input
                                            type="number"
                                            min="1"
                                            max="60"
                                            required
                                            value={customTerm}
                                            placeholder="Enter custom term in months"
                                            onChange={(e) => {
                                                setCustomTerm(e.target.value)
                                                setFormData({ ...formData, termMonths: e.target.value })
                                            }}
                                            className="h-11 text-base mt-2"
                                        />
                                    )}
                                    <p className="text-xs text-muted-foreground">Choose how long you need to repay the loan</p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="monthlyPaymentPercent" className="text-base">Monthly Payment Percentage</Label>
                                    <div className="relative">
                                        <Input
                                            type="text"
                                            value={formData.monthlyPaymentPercent ? `${formData.monthlyPaymentPercent}% (Auto-calculated)` : 'Select a term first'}
                                            className="h-11 text-base bg-muted cursor-not-allowed"
                                            readOnly
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Auto-calculated to pay off the loan evenly over {formData.termMonths || 'selected'} months</p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsCustomPercent(!isCustomPercent)}
                                        className="text-xs"
                                    >
                                        {isCustomPercent ? 'Use Auto-calculation' : 'Use Custom Percentage'}
                                    </Button>
                                    {isCustomPercent && (
                                        <Input
                                            type="number"
                                            min="1"
                                            max="100"
                                            step="0.1"
                                            required
                                            value={customPercent}
                                            placeholder="Enter custom percentage (1-100)"
                                            onChange={(e) => {
                                                setCustomPercent(e.target.value)
                                                setFormData({ ...formData, monthlyPaymentPercent: e.target.value })
                                            }}
                                            className="h-11 text-base mt-2"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Payment Summary */}
                        <div className="md:border-l md:pl-6">
                            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white h-full min-h-[400px]">
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center gap-2 text-xl">
                                        <TrendingUp className="h-5 w-5 text-blue-600" />
                                        Payment Summary
                                    </CardTitle>
                                    <CardDescription>
                                        {hasValues ? 'Live calculation based on your inputs' : 'Fill in the form to see your payment breakdown'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {hasValues ? (
                                        <>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                                    <div className="flex items-center gap-2">
                                                        <Banknote className="h-4 w-4 text-blue-600" />
                                                        <span className="text-sm font-medium text-muted-foreground">Loan Amount</span>
                                                    </div>
                                                    <span className="text-lg font-bold text-blue-600">
                                                        ₱{parseFloat(formData.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-purple-600" />
                                                        <span className="text-sm font-medium text-muted-foreground">Loan Term</span>
                                                    </div>
                                                    <span className="text-lg font-bold text-purple-600">
                                                        {formData.termMonths} months
                                                    </span>
                                                </div>

                                                <Separator />

                                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                                    <div className="flex items-center gap-2">
                                                        <CreditCard className="h-4 w-4 text-green-600" />
                                                        <span className="text-sm font-medium text-green-700">Monthly Payment</span>
                                                    </div>
                                                    <span className="text-lg font-bold text-green-700">
                                                        ₱{monthlyPayment.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                                                    <div className="flex items-center gap-2">
                                                        <CreditCard className="h-4 w-4 text-orange-600" />
                                                        <span className="text-sm font-medium text-orange-700">Per Payroll</span>
                                                    </div>
                                                    <span className="text-lg font-bold text-orange-700">
                                                        ₱{biweeklyPayment.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>

                                                <Separator />

                                                <div className="flex items-center justify-between p-3 bg-blue-100 rounded-lg border border-blue-300">
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="h-4 w-4 text-blue-700" />
                                                        <span className="text-sm font-medium text-blue-700">Total to be Paid</span>
                                                    </div>
                                                    <span className="text-lg font-bold text-blue-700">
                                                        ₱{totalPayments.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                                <p className="text-xs text-yellow-800">
                                                    <strong>Note:</strong> Your loan request will be reviewed by the admin. You will be notified once a decision has been made.
                                                </p>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center py-8">
                                            <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                                            <p className="text-sm text-muted-foreground">
                                                Enter loan details to see your payment breakdown
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-end mt-6 pt-6 border-t">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11 px-6">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 h-11 px-6">
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
