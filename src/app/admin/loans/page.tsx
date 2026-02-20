"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Search,
  Plus,
  Eye,
  Calendar,
  User,
  TrendingUp,
  CreditCard,
  Banknote,
  FileText,
  Archive,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  PlusCircle
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "react-hot-toast"

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

export default function LoansPage() {
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
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'rejected' | 'archived'>('active')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [selectedLoanForAction, setSelectedLoanForAction] = useState<LoanItem | null>(null)
  const [customTerm, setCustomTerm] = useState('')
  const [isCustomTerm, setIsCustomTerm] = useState(false)
  const [customPercent, setCustomPercent] = useState('')
  const [isCustomPercent, setIsCustomPercent] = useState(false)

  // Confirmation modal states
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [selectedLoanForApprove, setSelectedLoanForApprove] = useState<LoanItem | null>(null)
  const [selectedLoanForArchive, setSelectedLoanForArchive] = useState<LoanItem | null>(null)
  const [selectedLoanForDelete, setSelectedLoanForDelete] = useState<LoanItem | null>(null)

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
    loadLoans()
    loadArchivedLoans()
  }, [])

  async function loadLoans() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/loans')
      const data = await res.json()
      // Filter ONLY loans (exclude deductions)
      const allItems: LoanItem[] = data.items || []
      setItems(allItems.filter(i => !i.purpose?.startsWith('[DEDUCTION]')))
    } catch (e) {
      console.error('Error loading loans', e)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadArchivedLoans() {
    try {
      const res = await fetch('/api/admin/loans?archived=true')
      const data = await res.json()
      const allArchived: LoanItem[] = data.items || []
      setArchivedItems(allArchived.filter(i => !i.purpose?.startsWith('[DEDUCTION]')))
    } catch (e) {
      console.error('Error loading archived loans', e)
    }
  }

  function openApproveDialog(loan: LoanItem) {
    setSelectedLoanForApprove(loan)
    setApproveConfirmOpen(true)
  }

  async function confirmApproveLoan() {
    if (!selectedLoanForApprove) return

    try {
      const res = await fetch(`/api/admin/loans/${selectedLoanForApprove.loans_id}/approve`, {
        method: 'POST'
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to approve loan')
      }

      toast.success('Loan approved successfully!')
      setApproveConfirmOpen(false)
      await loadLoans()
    } catch (e) {
      console.error('Approval failed:', e)
      toast.error(e instanceof Error ? e.message : 'Failed to approve loan')
    }
  }

  async function openRejectDialog(loan: LoanItem) {
    setSelectedLoanForAction(loan)
    setRejectReason("")
    setRejectDialogOpen(true)
  }

  async function submitReject() {
    if (!selectedLoanForAction) return

    try {
      const res = await fetch(`/api/admin/loans/${selectedLoanForAction.loans_id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reject loan')
      }

      toast.success('Loan rejected successfully!')
      setRejectDialogOpen(false)
      await loadLoans()
    } catch (e) {
      console.error('Rejection failed:', e)
      toast.error(e instanceof Error ? e.message : 'Failed to reject loan')
    }
  }

  function openArchiveDialog(loan: LoanItem) {
    setSelectedLoanForArchive(loan)
    setArchiveConfirmOpen(true)
  }

  async function confirmArchiveLoan() {
    if (!selectedLoanForArchive) return

    try {
      const res = await fetch(`/api/admin/loans/${selectedLoanForArchive.loans_id}/archive`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to archive loan')
      toast.success('Loan archived successfully!')
      setArchiveConfirmOpen(false)
      await loadLoans()
      await loadArchivedLoans()
    } catch (e) {
      console.error('Archive failed:', e)
      toast.error('Failed to archive loan')
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

  async function viewLoanDetails(loan: LoanItem) {
    try {
      const res = await fetch(`/api/admin/loans/${loan.loans_id}`)
      const data = await res.json()
      setSelectedLoan(data)
      setDetailsOpen(true)
    } catch (e) {
      console.error('Error loading loan details:', e)
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
      console.error('Error loading loan for edit:', e)
    }
  }

  async function submitEdit() {
    if (!editingId) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/admin/loans/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purpose: editForm.purpose,
          monthlyPaymentPercent: editForm.monthlyPaymentPercent,
          termMonths: editForm.termMonths,
          status: editForm.status,
        })
      })
      if (!res.ok) throw new Error('Failed to update loan')
      setEditOpen(false)
      await loadLoans()
    } catch (e) {
      console.error('Edit failed:', e)
    } finally {
      setEditSaving(false)
    }
  }

  function openDeleteDialog(loan: LoanItem) {
    setSelectedLoanForDelete(loan)
    setDeleteConfirmOpen(true)
  }

  async function confirmDeleteLoan() {
    if (!selectedLoanForDelete) return

    try {
      const res = await fetch(`/api/admin/loans/${selectedLoanForDelete.loans_id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete loan')
      toast.success('Loan deleted successfully!')
      setDeleteConfirmOpen(false)
      await loadLoans()
      await loadArchivedLoans()
    } catch (e) {
      console.error('Delete failed:', e)
      toast.error('Failed to delete loan')
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let statusFilter = (item: LoanItem) => item.status === 'ACTIVE' || item.status === 'COMPLETED' || item.status === 'DEFAULTED'

    if (activeTab === 'pending') {
      statusFilter = (item: LoanItem) => item.status === 'PENDING'
    } else if (activeTab === 'rejected') {
      // Show REJECTED loans in rejected tab
      statusFilter = (item: LoanItem) => item.status === 'REJECTED'
    } else if (activeTab === 'archived') {
      // Archived tab shows loans from archivedItems (handled by filteredArchived)
      return []
    }

    return items.filter(i => {
      const dateStr = format(new Date(i.createdAt), 'MMM dd, yyyy').toLowerCase()
      return (
        statusFilter(i) &&
        ((i.userName || '').toLowerCase().includes(q) ||
          i.userEmail.toLowerCase().includes(q) ||
          dateStr.includes(q))
      )
    })
  }, [items, search, activeTab])

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

  function openBulkDeleteDialog() {
    if (selectedIds.length === 0) return
    setBulkDeleteConfirmOpen(true)
  }

  async function confirmBulkDelete() {
    if (selectedIds.length === 0) return

    setIsDeleting(true)
    try {
      const deletePromises = selectedIds.map(id =>
        fetch(`/api/admin/loans/${id}`, { method: 'DELETE' })
      )
      await Promise.all(deletePromises)
      toast.success(`Successfully deleted ${selectedIds.length} loan(s)!`)
      setSelectedIds([])
      setBulkDeleteConfirmOpen(false)
      await loadLoans()
      await loadArchivedLoans()
    } catch (e) {
      console.error('Bulk delete failed:', e)
      toast.error('Failed to delete some loans')
    } finally {
      setIsDeleting(false)
    }
  }

  function toggleSelectAll() {
    const currentList = activeTab === 'archived' ? filteredArchived : filtered
    if (selectedIds.length === currentList.length && currentList.length > 0) {
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

  function initials(name: string | null, email: string) {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase()
    return email.split('@')[0].substring(0, 2).toUpperCase()
  }

  async function submitLoan() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users_id: form.users_id,
          amount: Number(form.amount),
          purpose: form.purpose,
          monthlyPaymentPercent: Number(form.monthlyPaymentPercent),
          termMonths: Number(form.termMonths),
        })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create loan')
      }
      toast.success('Loan created successfully')
      setOpen(false)
      setForm({ users_id: "", amount: "", purpose: "", monthlyPaymentPercent: "", termMonths: "" })
      await loadLoans()
    } catch (e) {
      console.error(e)
      toast.error(e instanceof Error ? e.message : 'Failed to create loan')
    } finally {
      setSaving(false)
    }
  }

  const totalLoans = items.length
  const activeLoans = items.filter(item => item.status === 'ACTIVE').length
  const completedLoans = items.filter(item => item.status === 'COMPLETED').length
  const totalLoanAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const totalOutstanding = items.reduce((sum, item) => sum + item.balance, 0)
  const totalPerPayrollPayments = items
    .filter(item => item.status === 'ACTIVE')
    .reduce((sum, item) => {
      const monthlyPayment = item.amount * (item.monthlyPaymentPercent / 100)
      return sum + monthlyPayment
    }, 0)

  const activeLoansCount = items.filter(item => item.status === 'ACTIVE').length
  const pendingLoansCount = items.filter(item => item.status === 'PENDING').length
  const rejectedLoansCount = items.filter(item => item.status === 'REJECTED').length

  const currentList = activeTab === 'archived' ? filteredArchived : filtered

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 pt-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Banknote className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Loan Management
                </h2>
                <p className="text-sm text-muted-foreground">Manage staff loans and approve requests</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Dialog open={open} onOpenChange={(newOpen) => {
              setOpen(newOpen)
              if (newOpen) {
                loadUsers()
                setUserSearch("")
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Loan</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full sm:max-w-6xl max-h-[90vh] overflow-y-auto" style={{ width: '95vw', maxWidth: '1200px' }}>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-2xl">
                    <Banknote className="h-6 w-6 text-blue-600" />
                    Add New Loan
                  </DialogTitle>
                </DialogHeader>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Form Inputs */}
                  <div className="space-y-5">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Loan Details
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
                                  className={`p-3 cursor-pointer hover:bg-muted transition-colors border-b last:border-b-0 ${form.users_id === u.users_id ? 'bg-blue-50' : ''
                                    }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium text-foreground">{u.name || u.email}</p>
                                      <p className="text-sm text-muted-foreground">{u.email}</p>
                                    </div>
                                    {form.users_id === u.users_id && (
                                      <CheckCircle className="h-5 w-5 text-blue-600" />
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
                          Loan Amount
                        </label>
                        <Input
                          type="number"
                          min="1"
                          step="0.01"
                          value={form.amount}
                          onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                          placeholder="e.g. 5000"
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
                          placeholder="e.g. Personal Loan"
                          className="h-11 text-base"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        Payment Terms
                      </h3>

                      <div className="space-y-2">
                        <label className="text-base font-medium">Term (Months)</label>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {[1, 6, 12, 18, 24].map(months => (
                            <Button
                              key={months}
                              type="button"
                              variant={(!isCustomTerm && Number(form.termMonths) === months) ? "default" : "outline"}
                              onClick={() => {
                                setIsCustomTerm(false)
                                setCustomTerm('')
                                setForm(f => ({ ...f, termMonths: months.toString() }))
                              }}
                              className={(!isCustomTerm && Number(form.termMonths) === months) ? "bg-blue-600 hover:bg-blue-700" : ""}
                            >
                              {months} {months === 1 ? 'Month' : 'Months'}
                            </Button>
                          ))}
                          <Button
                            type="button"
                            variant={isCustomTerm ? "default" : "outline"}
                            onClick={() => setIsCustomTerm(true)}
                            className={isCustomTerm ? "bg-blue-600 hover:bg-blue-700" : ""}
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
                          className="text-xs text-blue-600 hover:text-blue-700 p-0 h-auto font-normal"
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
                    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white h-full min-h-[400px]">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-xl">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          Payment Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {(form.amount && form.monthlyPaymentPercent && form.termMonths) ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                              <div className="flex items-center gap-2">
                                <Banknote className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-muted-foreground">Loan Amount</span>
                              </div>
                              <span className="text-lg font-bold text-blue-600">
                                ₱{Number(form.amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-purple-600" />
                                <span className="text-sm font-medium text-muted-foreground">Term</span>
                              </div>
                              <span className="text-lg font-bold text-purple-600">
                                {form.termMonths} {Number(form.termMonths) === 1 ? 'month' : 'months'}
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
                                <span className="text-sm font-medium text-blue-700">Total Repayment</span>
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

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                  <Button variant="outline" onClick={() => setOpen(false)} className="h-11 px-6">
                    Cancel
                  </Button>
                  <Button
                    disabled={saving || !form.users_id || !form.amount || !form.termMonths}
                    onClick={submitLoan}
                    className="bg-blue-600 hover:bg-blue-700 h-11 px-6"
                  >
                    {saving ? 'Creating...' : 'Create Loan'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md border-2 font-medium text-sm transition-all
            ${activeTab === 'active'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-background text-muted-foreground border-gray-400 hover:bg-muted'}`}
        >
          <CheckCircle className="h-4 w-4" />
          Active Loans
          {activeLoansCount > 0 && (
            <span className="ml-1 bg-white/20 text-inherit text-xs font-semibold px-1.5 py-0.5 rounded-full">
              {activeLoansCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md border-2 font-medium text-sm transition-all
            ${activeTab === 'pending'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-background text-muted-foreground border-gray-400 hover:bg-muted'}`}
        >
          <Clock className="h-4 w-4" />
          Pending Requests
          {pendingLoansCount > 0 && (
            <span className={`ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full ${activeTab === 'pending' ? 'bg-white/20 text-inherit' : 'bg-yellow-100 text-yellow-700'}`}>
              {pendingLoansCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md border-2 font-medium text-sm transition-all
            ${activeTab === 'rejected'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-background text-muted-foreground border-gray-400 hover:bg-muted'}`}
        >
          <AlertCircle className="h-4 w-4" />
          Rejected
          {rejectedLoansCount > 0 && (
            <span className={`ml-1 text-xs font-semibold px-1.5 py-0.5 rounded-full ${activeTab === 'rejected' ? 'bg-white/20 text-inherit' : 'bg-red-100 text-red-700'}`}>
              {rejectedLoansCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md border-2 font-medium text-sm transition-all
            ${activeTab === 'archived'
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-background text-muted-foreground border-gray-400 hover:bg-muted'}`}
        >
          <Archive className="h-4 w-4" />
          Archived
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <User className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLoansCount}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLoansCount}</div>
            <p className="text-xs text-muted-foreground">Waiting for approval</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
            <Banknote className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{totalLoanAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">All time loan amount</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Per Payroll</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{totalPerPayrollPayments.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">Per-payroll collection</p>
          </CardContent>
        </Card>
      </div>

      {/* Loans List */}
      <Card className="border shadow-sm overflow-hidden">
        <CardHeader className="p-4 border-b bg-muted/40">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Banknote className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl">
                  {activeTab === 'active' ? 'Active Loans' :
                    activeTab === 'pending' ? 'Pending Requests' :
                      activeTab === 'rejected' ? 'Rejected Loans' : 'Archived Loans'}
                </CardTitle>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff by name or email..."
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
                  onClick={openBulkDeleteDialog}
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
        <CardContent>
          {/* Refined Table View for Rejected Loans */}
          {activeTab === 'rejected' ? (
            currentList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No rejected loans found.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[50px]">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          onChange={toggleSelectAll}
                          checked={selectedIds.length === currentList.length && currentList.length > 0}
                        />
                      </TableHead>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Date Requested</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentList.map((item) => (
                      <TableRow key={item.loans_id} className="hover:bg-muted/30">
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={selectedIds.includes(item.loans_id)}
                            onChange={() => toggleSelect(item.loans_id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border">
                              <AvatarFallback className="bg-red-100 text-red-700 text-xs font-bold">
                                {initials(item.userName, item.userEmail)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">{item.userName || item.userEmail}</p>
                              <p className="text-xs text-muted-foreground">{item.department || 'N/A'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="text-sm font-medium truncate">{item.purpose}</p>
                            <p className="text-xs text-muted-foreground">{item.termMonths} months term</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <p className="font-bold text-base">₱{item.amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            ₱{((item.amount * item.monthlyPaymentPercent) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}/mo
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{format(new Date(item.createdAt), 'MMM dd, yyyy')}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(item.createdAt), 'h:mm a')}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-200">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            REJECTED
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => viewLoanDetails(item)}>
                              <Eye className="h-3 w-3 mr-1" /> Details
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => openDeleteDialog(item)}>
                              <Trash2 className="h-3 w-3 mr-1" /> Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : (
            /* List View for Other Tabs */
            <div className="space-y-4">
              {currentList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No loans found in this category.
                </div>
              ) : (
                currentList.map((item) => (
                  <div key={item.loans_id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4 bg-card hover:bg-accent/5 transition-colors">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={selectedIds.includes(item.loans_id)}
                          onChange={() => toggleSelect(item.loans_id)}
                        />
                      </div>
                      <Avatar className="h-10 w-10 border-2 border-muted">
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                          {initials(item.userName, item.userEmail)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-lg">{item.userName || item.userEmail}</p>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 text-[10px] h-5 px-1.5 border-blue-200">
                            {item.department || 'N/A'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span className="font-medium text-foreground/80">{item.purpose}</span>
                          <span>•</span>
                          <span>{format(new Date(item.createdAt), 'MMM dd, yyyy')}</span>
                        </div>
                        {/* Show Approval Buttons for Pending Loans */}
                        {item.status === 'PENDING' && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="outline" className="h-9 text-sm" onClick={() => viewLoanDetails(item)}>
                              <Eye className="h-4 w-4 mr-1" /> View Details
                            </Button>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-9 text-sm" onClick={() => openApproveDialog(item)}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="h-9 text-sm" onClick={() => openRejectDialog(item)}>
                              <Trash2 className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                        {/* Show View Details Button for Rejected Loans */}
                        {item.status === 'REJECTED' && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="outline" className="h-9 text-sm" onClick={() => viewLoanDetails(item)}>
                              <Eye className="h-4 w-4 mr-1" /> View Details
                            </Button>
                            <Button size="sm" variant="destructive" className="h-9 text-sm" onClick={() => openDeleteDialog(item)}>
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </Button>
                          </div>
                        )}
                        {/* Show View Details Button for Archived Loans */}
                        {activeTab === 'archived' && (
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="outline" className="h-9 text-sm" onClick={() => viewLoanDetails(item)}>
                              <Eye className="h-4 w-4 mr-1" /> View Details
                            </Button>
                            <Button size="sm" variant="destructive" className="h-9 text-sm" onClick={() => openDeleteDialog(item)}>
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Simple Payment Details Table */}
                    <div className="w-full mt-3 pt-3 border-t">
                      <div className="grid grid-cols-4 gap-4 mb-2">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Per Payroll</p>
                          <p className="text-lg font-bold text-blue-600">₱{((item.amount * item.monthlyPaymentPercent) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        </div>
                        <div className="text-center border-l">
                          <p className="text-xs text-gray-500 mb-1">Remaining Balance</p>
                          <p className="text-lg font-bold text-orange-600">₱{item.balance.toLocaleString()}</p>
                        </div>
                        <div className="text-center border-l">
                          <p className="text-xs text-gray-500 mb-1">Payments Left</p>
                          <p className="text-lg font-bold text-gray-700">{Math.ceil((item.balance / item.amount) * item.termMonths)}</p>
                        </div>
                        <div className="text-center border-l">
                          <p className="text-xs text-gray-500 mb-1">Progress</p>
                          <p className="text-lg font-bold text-green-600">{Math.round(((item.amount - item.balance) / item.amount) * 100)}%</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-green-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, ((item.amount - item.balance) / item.amount) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 text-center mt-1">Original: ₱{item.amount.toLocaleString()} • Term: {item.termMonths} months</p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto mt-2 sm:mt-0">
                      <div className="flex items-center gap-2">
                        <Badge className={
                          item.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                            item.status === 'COMPLETED' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                              item.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                                item.status === 'REJECTED' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                                  'bg-gray-100 text-gray-800'
                        }>
                          {item.status}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <TrendingUp className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => viewLoanDetails(item)}>
                              <Eye className="h-4 w-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {/* Show Edit and Archive only for non-archived, non-pending loans */}
                            {item.status !== 'PENDING' && activeTab !== 'archived' && (
                              <>
                                <DropdownMenuItem onClick={() => startEdit(item)}>
                                  <FileText className="h-4 w-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openArchiveDialog(item)}>
                                  <Archive className="h-4 w-4 mr-2" /> Archive
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem onClick={() => openDeleteDialog(item)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Loan Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to reject this loan request?</p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason for Rejection (Optional)</label>
              <Input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Insufficient tenure, active loan exists"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={submitReject}>Reject Loan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loan Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-blue-600" />
              Loan Request Details
            </DialogTitle>
          </DialogHeader>

          {selectedLoan && (
            <div className="space-y-6">
              {/* Borrower Information */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Borrower Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedLoan.userName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedLoan.userEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{selectedLoan.department || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={
                      selectedLoan.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                        selectedLoan.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          selectedLoan.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            selectedLoan.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                    }>
                      {selectedLoan.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Loan Details */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Loan Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Purpose</p>
                    <p className="font-medium">{selectedLoan.purpose || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Request Date</p>
                    <p className="font-medium">{format(new Date(selectedLoan.createdAt), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Term</p>
                    <p className="font-medium">{selectedLoan.termMonths} months</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Payment %</p>
                    <p className="font-medium">{selectedLoan.monthlyPaymentPercent}%</p>
                  </div>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Financial Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Loan Amount</span>
                    <span className="font-bold text-lg">₱{selectedLoan.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Monthly Payment</span>
                    <span className="font-semibold text-blue-600">
                      ₱{((selectedLoan.amount * selectedLoan.monthlyPaymentPercent) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Per Payroll</span>
                    <span className="font-semibold text-purple-600">
                      ₱{((selectedLoan.amount * selectedLoan.monthlyPaymentPercent) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-muted-foreground">Current Balance</span>
                    <span className="font-bold text-lg text-orange-600">₱{selectedLoan.balance.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Pending Loans */}
              {selectedLoan.status === 'PENDING' && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                    Close
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setDetailsOpen(false)
                      openRejectDialog(selectedLoan)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setDetailsOpen(false)
                      openApproveDialog(selectedLoan)
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={approveConfirmOpen} onOpenChange={setApproveConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Approve Loan Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedLoanForApprove && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to approve this loan request?
                </p>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-sm"><span className="font-medium">Borrower:</span> {selectedLoanForApprove.userName || selectedLoanForApprove.userEmail}</p>
                  <p className="text-sm"><span className="font-medium">Amount:</span> ₱{selectedLoanForApprove.amount.toLocaleString()}</p>
                  <p className="text-sm"><span className="font-medium">Purpose:</span> {selectedLoanForApprove.purpose}</p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApproveConfirmOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={confirmApproveLoan}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Loan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-blue-600" />
              Archive Loan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedLoanForArchive && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to archive this loan?
                </p>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-sm"><span className="font-medium">Borrower:</span> {selectedLoanForArchive.userName || selectedLoanForArchive.userEmail}</p>
                  <p className="text-sm"><span className="font-medium">Amount:</span> ₱{selectedLoanForArchive.amount.toLocaleString()}</p>
                  <p className="text-sm"><span className="font-medium">Balance:</span> ₱{selectedLoanForArchive.balance.toLocaleString()}</p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setArchiveConfirmOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={confirmArchiveLoan}>
                <Archive className="h-4 w-4 mr-2" />
                Archive Loan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Loan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedLoanForDelete && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to delete this loan? This action cannot be undone.
                </p>
                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 space-y-1 border border-red-200 dark:border-red-800">
                  <p className="text-sm"><span className="font-medium">Borrower:</span> {selectedLoanForDelete.userName || selectedLoanForDelete.userEmail}</p>
                  <p className="text-sm"><span className="font-medium">Amount:</span> ₱{selectedLoanForDelete.amount.toLocaleString()}</p>
                  <p className="text-sm"><span className="font-medium">Status:</span> {selectedLoanForDelete.status}</p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteLoan}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Loan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Multiple Loans
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete <span className="font-bold text-foreground">{selectedIds.length}</span> selected loan(s)? This action cannot be undone.
              </p>
              <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  ⚠️ Warning: This will permanently delete all selected loans.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmBulkDelete} disabled={isDeleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Deleting...' : `Delete ${selectedIds.length} Loan(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div >
  )
}
