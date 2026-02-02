"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
    Search,
    Plus,
    Eye,
    Calendar,
    User,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Clock,
    CreditCard,
    Banknote,
    FileText,
    Archive,
    CreditCard as DeductionIcon,
    Trash2,
    PlusCircle
} from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

type LoanItem = {
    loans_id: string
    users_id: string
    userName: string | null
    userEmail: string
    department?: string | null
    amount: number
    balance: number
    monthlyPaymentPercent: number
    termMonths: number
    status: string
    purpose?: string | null
    createdAt: string
}

type UserOption = { users_id: string, name: string | null, email: string }

export default function PersonalDeductionsPage() {
    const [items, setItems] = useState<LoanItem[]>([])
    const [archivedItems, setArchivedItems] = useState<LoanItem[]>([])
    const [search, setSearch] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [users, setUsers] = useState<UserOption[]>([])
    const [form, setForm] = useState({ users_id: "", amount: "", purpose: "", monthlyPaymentPercent: "", termMonths: "" })
    const [saving, setSaving] = useState(false)
    const [userSearch, setUserSearch] = useState("")
    const [selectedLoan, setSelectedLoan] = useState<LoanItem | null>(null)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [editSaving, setEditSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<{ amount: number; purpose: string; monthlyPaymentPercent: number; termMonths: number; status: string }>({ amount: 0, purpose: "", monthlyPaymentPercent: 0, termMonths: 0, status: "ACTIVE" })
    const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active')
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDeleting, setIsDeleting] = useState(false)
    const [customTerm, setCustomTerm] = useState('')
    const [isCustomTerm, setIsCustomTerm] = useState(false)
    const [customPercent, setCustomPercent] = useState('')
    const [isCustomPercent, setIsCustomPercent] = useState(false)

    // Auto-calculate monthly payment percentage when amount or term changes
    // Auto-calculate monthly payment percentage when amount or term changes
    useEffect(() => {
        if (isCustomPercent) return

        const amount = Number(form.amount)
        const termMonths = Number(form.termMonths)

        if (amount > 0 && termMonths > 0) {
            // Calculate percentage needed to pay off loan in the given term
            const calculatedPercent = (100 / termMonths).toFixed(2)
            setForm(f => ({ ...f, monthlyPaymentPercent: calculatedPercent }))
        }
    }, [form.amount, form.termMonths, isCustomPercent])

    useEffect(() => {
        loadDeductions()
        loadArchivedDeductions()
    }, [])

    async function loadDeductions() {
        setIsLoading(true)
        try {
            const res = await fetch('/api/admin/loans') // Using same API
            const data = await res.json()
            // Filter for deductions
            const allItems: LoanItem[] = data.items || []
            setItems(allItems.filter(i => i.purpose?.startsWith('[DEDUCTION]')))
        } catch (e) {
            console.error('Error loading deductions', e)
        } finally {
            setIsLoading(false)
        }
    }

    async function loadArchivedDeductions() {
        try {
            const res = await fetch('/api/admin/loans?archived=true')
            const data = await res.json()
            const allArchived: LoanItem[] = data.items || []
            setArchivedItems(allArchived.filter(i => i.purpose?.startsWith('[DEDUCTION]')))
        } catch (e) {
            console.error('Error loading archived deductions', e)
        }
    }

    async function archiveDeduction(loan: LoanItem) {
        try {
            const ok = window.confirm(`Archive this deduction for ${loan.userName || loan.userEmail}?`)
            if (!ok) return
            const res = await fetch(`/api/admin/loans/${loan.loans_id}/archive`, { method: 'POST' })
            if (!res.ok) throw new Error('Failed to archive deduction')
            await loadDeductions()
            await loadArchivedDeductions()
        } catch (e) {
            console.error('Archive failed:', e)
        }
    }

    async function loadUsers() {
        try {
            const res = await fetch('/api/admin/users')
            const data = await res.json()
            const opts = (data.users || [])
                .filter((u: { role: string }) => u.role === 'PERSONNEL')
                .map((u: { users_id: string, name: string | null, email: string }) => ({ users_id: u.users_id, name: u.name, email: u.email }))
            setUsers(opts)
        } catch (e) {
            console.error('Error loading users:', e)
        }
    }

    async function viewDetails(loan: LoanItem) {
        try {
            const res = await fetch(`/api/admin/loans/${loan.loans_id}`)
            const data = await res.json()
            setSelectedLoan(data)
            setDetailsOpen(true)
        } catch (e) {
            console.error('Error loading details:', e)
        }
    }

    async function startEdit(loan: LoanItem) {
        try {
            const res = await fetch(`/api/admin/loans/${loan.loans_id}`)
            const data = await res.json()
            setEditingId(loan.loans_id)
            setEditForm({
                amount: Number(data.amount),
                purpose: data.purpose || "",
                monthlyPaymentPercent: Number(data.monthlyPaymentPercent),
                termMonths: Number(data.termMonths),
                status: data.status || 'ACTIVE'
            })
            setEditOpen(true)
        } catch (e) {
            console.error('Error loading deduction for edit:', e)
        }
    }

    async function submitEdit() {
        if (!editingId) return
        setEditSaving(true)
        try {
            // Ensure purpose has prefix if missing (shouldn't happen if created correctly, but safe to check)
            let purpose = editForm.purpose
            if (!purpose.startsWith('[DEDUCTION]')) {
                purpose = `[DEDUCTION] ${purpose}`
            }

            const res = await fetch(`/api/admin/loans/${editingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    purpose: purpose,
                    monthlyPaymentPercent: editForm.monthlyPaymentPercent,
                    termMonths: editForm.termMonths,
                    status: editForm.status,
                })
            })
            if (!res.ok) throw new Error('Failed to update deduction')
            setEditOpen(false)
            await loadDeductions()
        } catch (e) {
            console.error('Edit failed:', e)
        } finally {
            setEditSaving(false)
        }
    }

    async function deleteDeduction(loan: LoanItem) {
        try {
            const ok = window.confirm('Delete this deduction? This action cannot be undone.')
            if (!ok) return
            const res = await fetch(`/api/admin/loans/${loan.loans_id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete deduction')
            await loadDeductions()
            await loadArchivedDeductions()
        } catch (e) {
            console.error('Delete failed:', e)
        }
    }

    async function bulkDelete() {
        if (selectedIds.length === 0) return
        const ok = window.confirm(`Delete ${selectedIds.length} selected item(s)? This action cannot be undone.`)
        if (!ok) return
        setIsDeleting(true)
        try {
            const deletePromises = selectedIds.map(id =>
                fetch(`/api/admin/loans/${id}`, { method: 'DELETE' })
            )
            await Promise.all(deletePromises)
            setSelectedIds([])
            await loadDeductions()
            await loadArchivedDeductions()
        } catch (e) {
            console.error('Bulk delete failed:', e)
        } finally {
            setIsDeleting(false)
        }
    }

    function toggleSelectAll() {
        const currentList = activeTab === 'active' ? filtered : filteredArchived
        if (selectedIds.length === currentList.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(currentList.map(item => item.loans_id))
        }
    }

    function toggleSelect(id: string) {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return items.filter(i => {
            const dateStr = format(new Date(i.createdAt), 'MMM dd, yyyy').toLowerCase()
            return (
                (i.userName || '').toLowerCase().includes(q) ||
                i.userEmail.toLowerCase().includes(q) ||
                dateStr.includes(q)
            )
        })
    }, [items, search])

    const filteredArchived = useMemo(() => {
        const q = search.toLowerCase()
        return archivedItems.filter(i => {
            const dateStr = format(new Date(i.createdAt), 'MMM dd, yyyy').toLowerCase()
            return (
                (i.userName || '').toLowerCase().includes(q) ||
                i.userEmail.toLowerCase().includes(q) ||
                dateStr.includes(q)
            )
        })
    }, [archivedItems, search])

    function initials(name: string | null, email: string) {
        if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase()
        return email.split('@')[0].substring(0, 2).toUpperCase()
    }

    async function submitDeduction() {
        setSaving(true)
        try {
            const res = await fetch('/api/admin/loans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    users_id: form.users_id,
                    amount: Number(form.amount),
                    purpose: `[DEDUCTION] ${form.purpose}`,
                    monthlyPaymentPercent: Number(form.monthlyPaymentPercent),
                    termMonths: Number(form.termMonths),
                })
            })
            if (!res.ok) throw new Error('Failed to create deduction')
            setOpen(false)
            setForm({ users_id: "", amount: "", purpose: "", monthlyPaymentPercent: "", termMonths: "" })
            await loadDeductions()
        } catch (e) {
            console.error(e)
        } finally {
            setSaving(false)
        }
    }

    const totalDeductions = items.length
    const activeDeductionsCount = items.filter(item => item.status === 'ACTIVE').length
    const completedDeductionsCount = items.filter(item => item.status === 'COMPLETED').length
    const totalDeductionAmount = items.reduce((sum, item) => sum + item.amount, 0)
    const totalDeductionOutstanding = items.reduce((sum, item) => sum + item.balance, 0)
    const totalDeductionPerPayrollPayments = items.reduce((sum, item) => {
        const monthlyPayment = item.amount * (item.monthlyPaymentPercent / 100)
        const perPayroll = monthlyPayment // Monthly payroll
        return sum + perPayroll
    }, 0)

    return (
        <div className="flex-1 space-y-6 p-4 md:p-6 pt-6">
            {/* Header Section */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                                <DeductionIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                                    Staff Deductions
                                </h2>
                                <p className="text-sm text-muted-foreground">Manage individual staff deductions (non-mandatory)</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant={activeTab === 'archived' ? 'default' : 'outline'}
                            onClick={() => setActiveTab(activeTab === 'active' ? 'archived' : 'active')}
                            className="gap-2"
                        >
                            <Archive className="h-4 w-4" />
                            <span className="hidden sm:inline">{activeTab === 'archived' ? 'Active Deductions' : 'Archived Deductions'}</span>
                            <span className="sm:hidden">{activeTab === 'archived' ? 'Active' : 'Archived'}</span>
                        </Button>
                        <Dialog open={open} onOpenChange={(newOpen) => {
                            setOpen(newOpen)
                            if (newOpen) {
                                loadUsers()
                                setUserSearch("")
                            }
                        }}>
                        <DialogTrigger asChild>
                            <Button className="bg-red-600 hover:bg-red-700 text-white gap-2">
                                <Plus className="h-4 w-4" />
                                <span className="hidden sm:inline">Add Staff Deduction</span>
                                <span className="sm:hidden">Add</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="w-full sm:max-w-6xl max-h-[90vh] overflow-y-auto" style={{ width: '95vw', maxWidth: '1200px' }}>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-2xl">
                                    <PlusCircle className="h-6 w-6 text-red-600" />
                                    Add Staff Deduction
                                </DialogTitle>
                            </DialogHeader>

                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Column - Form Inputs */}
                                <div className="space-y-5">
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-red-600" />
                                            Deduction Details
                                        </h3>

                                        <div className="space-y-2">
                                            <label className="text-base flex items-center gap-2 font-medium">
                                                <User className="h-4 w-4" />
                                                Select Staff
                                            </label>
                                            <div className="space-y-2">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="Search staff..."
                                                        value={userSearch}
                                                        onChange={(e) => setUserSearch(e.target.value)}
                                                        className="w-full pl-10"
                                                    />
                                                </div>
                                                <div className="border rounded-md max-h-[150px] overflow-y-auto">
                                                    {users
                                                        .filter(u => {
                                                            const q = userSearch.toLowerCase()
                                                            return (u.name || '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
                                                        })
                                                        .map(u => (
                                                            <div
                                                                key={u.users_id}
                                                                onClick={() => setForm(f => ({ ...f, users_id: u.users_id }))}
                                                                className={`p-3 cursor-pointer hover:bg-muted transition-colors border-b last:border-b-0 ${form.users_id === u.users_id ? 'bg-red-50' : ''
                                                                    }`}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <p className="font-medium text-foreground">{u.name || u.email}</p>
                                                                        <p className="text-sm text-muted-foreground">{u.email}</p>
                                                                    </div>
                                                                    {form.users_id === u.users_id && (
                                                                        <CheckCircle className="h-5 w-5 text-red-600" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-base flex items-center gap-2 font-medium">
                                                <span className="font-bold">₱</span>
                                                Deduction Amount
                                            </label>
                                            <Input
                                                type="number"
                                                min="1"
                                                step="0.01"
                                                value={form.amount}
                                                onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                                                placeholder="0.00"
                                                className="h-11 text-base"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-base flex items-center gap-2 font-medium">
                                                <FileText className="h-4 w-4" />
                                                Purpose
                                            </label>
                                            <Input
                                                value={form.purpose}
                                                onChange={(e) => setForm(f => ({ ...f, purpose: e.target.value }))}
                                                placeholder="e.g. Uniform, Lost Equipment"
                                                className="h-11 text-base"
                                            />
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            <Calendar className="h-5 w-5 text-red-600" />
                                            Payment Terms
                                        </h3>

                                        <div className="space-y-2">
                                            <label className="text-base font-medium">Term (Months)</label>
                                            {/* Use Select for Term to match Loan UI */}
                                            <div className="grid grid-cols-3 gap-2 mb-2">
                                                {[6, 12, 18, 24].map(months => (
                                                    <Button
                                                        key={months}
                                                        type="button"
                                                        variant={(!isCustomTerm && Number(form.termMonths) === months) ? "default" : "outline"}
                                                        onClick={() => {
                                                            setIsCustomTerm(false)
                                                            setCustomTerm('')
                                                            setForm(f => ({ ...f, termMonths: months.toString() }))
                                                        }}
                                                        className={(!isCustomTerm && Number(form.termMonths) === months) ? "bg-red-600 hover:bg-red-700" : ""}
                                                    >
                                                        {months} Months
                                                    </Button>
                                                ))}
                                                <Button
                                                    type="button"
                                                    variant={isCustomTerm ? "default" : "outline"}
                                                    onClick={() => setIsCustomTerm(true)}
                                                    className={isCustomTerm ? "bg-red-600 hover:bg-red-700" : ""}
                                                >
                                                    Custom
                                                </Button>
                                            </div>
                                            {isCustomTerm && (
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={customTerm}
                                                    onChange={(e) => {
                                                        setCustomTerm(e.target.value)
                                                        setForm(f => ({ ...f, termMonths: e.target.value }))
                                                    }}
                                                    placeholder="Enter custom months"
                                                    className="h-11 text-base"
                                                />
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-base font-medium">Monthly Payment Percentage</label>
                                            <div className="relative">
                                                <Input
                                                    value={form.monthlyPaymentPercent ? `${form.monthlyPaymentPercent}% (Auto-calculated)` : ''}
                                                    readOnly={!isCustomPercent}
                                                    className={`h-11 text-base ${!isCustomPercent ? 'bg-muted cursor-not-allowed' : ''}`}
                                                    placeholder="Auto-calculated"
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setIsCustomPercent(!isCustomPercent)}
                                                className="text-xs text-red-600 hover:text-red-700 p-0 h-auto font-normal"
                                            >
                                                {isCustomPercent ? 'Switch to Auto-calculation' : 'Switch to Custom Percentage'}
                                            </Button>
                                            {isCustomPercent && (
                                                <Input
                                                    type="number"
                                                    value={customPercent}
                                                    onChange={(e) => {
                                                        setCustomPercent(e.target.value)
                                                        setForm(f => ({ ...f, monthlyPaymentPercent: e.target.value }))
                                                    }}
                                                    placeholder="Enter custom percent"
                                                    className="h-11 text-base mt-2"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column - Payment Summary */}
                                <div className="md:border-l md:pl-6">
                                    <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white h-full min-h-[400px]">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="flex items-center gap-2 text-xl">
                                                <TrendingUp className="h-5 w-5 text-red-600" />
                                                Payment Summary
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {(form.amount && form.monthlyPaymentPercent && form.termMonths) ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                                        <div className="flex items-center gap-2">
                                                            <Banknote className="h-4 w-4 text-red-600" />
                                                            <span className="text-sm font-medium text-muted-foreground">Deduction Amount</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-red-600">
                                                            ₱{Number(form.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-4 w-4 text-purple-600" />
                                                            <span className="text-sm font-medium text-muted-foreground">Term</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-purple-600">
                                                            {form.termMonths} months
                                                        </span>
                                                    </div>

                                                    <Separator />

                                                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                                        <div className="flex items-center gap-2">
                                                            <CreditCard className="h-4 w-4 text-green-600" />
                                                            <span className="text-sm font-medium text-green-700">Monthly Payment</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-green-700">
                                                            ₱{((Number(form.amount) * Number(form.monthlyPaymentPercent)) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                                                        <div className="flex items-center gap-2">
                                                            <CreditCard className="h-4 w-4 text-orange-600" />
                                                            <span className="text-sm font-medium text-orange-700">Per Payroll</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-orange-700">
                                                            ₱{((Number(form.amount) * Number(form.monthlyPaymentPercent)) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>

                                                    <Separator />

                                                    <div className="flex items-center justify-between p-3 bg-blue-100 rounded-lg border border-blue-300">
                                                        <div className="flex items-center gap-2">
                                                            <TrendingUp className="h-4 w-4 text-blue-700" />
                                                            <span className="text-sm font-medium text-blue-700">Total Deduction</span>
                                                        </div>
                                                        <span className="text-lg font-bold text-blue-700">
                                                            ₱{(Number(form.amount) * (Number(form.monthlyPaymentPercent) / 100) * Number(form.termMonths)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-8">
                                                    <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                                                    <p className="text-sm text-muted-foreground">
                                                        Enter details to see calculation
                                                    </p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end mt-6 pt-6 border-t">
                                <Button variant="outline" onClick={() => setOpen(false)} className="h-11 px-6">
                                    Cancel
                                </Button>
                                <Button
                                    disabled={saving || !form.users_id || !form.amount || !form.termMonths}
                                    onClick={submitDeduction}
                                    className="bg-red-600 hover:bg-red-700 h-11 px-6"
                                >
                                    {saving ? 'Creating...' : 'Create Deduction'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-red-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Deductions</CardTitle>
                        <FileText className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeDeductionsCount}</div>
                        <p className="text-xs text-muted-foreground">Currently active</p>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-orange-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                        <Banknote className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{totalDeductionAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">All time deductions</p>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-yellow-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
                        <TrendingUp className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{totalDeductionOutstanding.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">Remaining to be paid</p>
                    </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-pink-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Per Payroll</CardTitle>
                        <CreditCard className="h-4 w-4 text-pink-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{totalDeductionPerPayrollPayments.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">Per-payroll collection</p>
                    </CardContent>
                </Card>
            </div>

            {/* Deductions List */}
            <Card className="border-0 shadow-md">
                <CardHeader className="border-b bg-muted/30">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <DeductionIcon className="h-5 w-5 text-primary" />
                                </div>
                                <CardTitle className="text-xl">{activeTab === 'active' ? 'Active Deductions' : 'Archived Deductions'}</CardTitle>
                            </div>
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, email, or date..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10"
                                />
                            </div>
                        </div>
                        {selectedIds.length > 0 && (
                            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                                    {selectedIds.length} item(s) selected
                                </span>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={bulkDelete}
                                    disabled={isDeleting}
                                    className="gap-2"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    {isDeleting ? 'Deleting...' : 'Delete Selected'}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {(activeTab === 'active' ? filtered : filteredArchived).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="p-4 bg-muted/50 rounded-full mb-4">
                                <DeductionIcon className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No deductions found</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                {search ? 'Try adjusting your search terms' : 'Get started by adding a new staff deduction'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {(activeTab === 'active' ? filtered : filteredArchived).map((item) => (
                                <div key={item.loans_id} className="p-4 md:p-6 hover:bg-muted/30 transition-colors">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        {/* Checkbox & Avatar */}
                                        <div className="flex items-center gap-4 flex-1">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300"
                                                checked={selectedIds.includes(item.loans_id)}
                                                onChange={() => toggleSelect(item.loans_id)}
                                            />
                                            <Avatar className="h-12 w-12 border-2 border-muted">
                                                <AvatarFallback className="bg-gradient-to-br from-red-100 to-red-200 text-red-700 font-bold text-base">
                                                    {initials(item.userName, item.userEmail)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <p className="font-semibold text-base md:text-lg truncate">{item.userName || item.userEmail}</p>
                                                    <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs border-red-200 dark:border-red-800">
                                                        {item.department || 'N/A'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                                    <FileText className="h-3.5 w-3.5" />
                                                    <span className="font-medium">{item.purpose?.replace('[DEDUCTION] ', '')}</span>
                                                    <span className="hidden sm:inline">•</span>
                                                    <Clock className="h-3.5 w-3.5 hidden sm:inline" />
                                                    <span className="hidden sm:inline">{format(new Date(item.createdAt), 'MMM dd, yyyy')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Amount & Actions */}
                                        <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6 ml-16 md:ml-0">
                                            <div className="flex gap-4 md:gap-6">
                                                <div className="text-left md:text-right">
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Amount</p>
                                                    <p className="font-bold text-base md:text-lg">₱{item.amount.toLocaleString()}</p>
                                                </div>
                                                <div className="text-left md:text-right">
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Balance</p>
                                                    <p className="font-bold text-base md:text-lg text-red-600 dark:text-red-400">₱{item.balance.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge className={
                                                    item.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300' :
                                                        item.status === 'COMPLETED' ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300' :
                                                            'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                                }>
                                                    {item.status}
                                                </Badge>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9">
                                                            <TrendingUp className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuItem onClick={() => viewDetails(item)} className="gap-2">
                                                            <Eye className="h-4 w-4" /> View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => startEdit(item)} className="gap-2">
                                                            <FileText className="h-4 w-4" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => archiveDeduction(item)} className="gap-2">
                                                            <Archive className="h-4 w-4" /> Archive
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => deleteDeduction(item)} className="text-red-600 gap-2">
                                                            <Trash2 className="h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* View Details Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Deduction Details</DialogTitle>
                    </DialogHeader>
                    {selectedLoan && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Staff Name</p>
                                    <p className="font-semibold">{selectedLoan.userName || selectedLoan.userEmail}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Department</p>
                                    <p className="font-semibold">{selectedLoan.department || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Purpose</p>
                                    <p className="font-semibold">{selectedLoan.purpose?.replace('[DEDUCTION] ', '')}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    <Badge className={
                                        selectedLoan.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                                            selectedLoan.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                'bg-gray-100 text-gray-800'
                                    }>
                                        {selectedLoan.status}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Amount</p>
                                    <p className="font-semibold text-lg">₱{selectedLoan.amount.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Balance</p>
                                    <p className="font-semibold text-lg text-red-600">₱{selectedLoan.balance.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Monthly Payment %</p>
                                    <p className="font-semibold">{selectedLoan.monthlyPaymentPercent}%</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Term</p>
                                    <p className="font-semibold">{selectedLoan.termMonths} months</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Created At</p>
                                    <p className="font-semibold">{format(new Date(selectedLoan.createdAt), 'MMM dd, yyyy')}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Deduction</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Purpose</label>
                            <Input
                                value={editForm.purpose.replace('[DEDUCTION] ', '')}
                                onChange={(e) => setEditForm(f => ({ ...f, purpose: `[DEDUCTION] ${e.target.value}` }))}
                                placeholder="Purpose"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Monthly Payment %</label>
                            <Input
                                type="number"
                                value={editForm.monthlyPaymentPercent}
                                onChange={(e) => setEditForm(f => ({ ...f, monthlyPaymentPercent: Number(e.target.value) }))}
                                placeholder="Percentage"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Term (Months)</label>
                            <Input
                                type="number"
                                value={editForm.termMonths}
                                onChange={(e) => setEditForm(f => ({ ...f, termMonths: Number(e.target.value) }))}
                                placeholder="Months"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <select
                                value={editForm.status}
                                onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                                className="w-full border rounded-md px-3 py-2"
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="COMPLETED">Completed</option>
                            </select>
                        </div>
                        <div className="flex gap-2 justify-end pt-4">
                            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                            <Button onClick={submitEdit} disabled={editSaving}>
                                {editSaving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
