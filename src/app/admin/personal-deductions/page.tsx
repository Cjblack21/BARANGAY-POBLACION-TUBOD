"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
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
    CreditCard as DeductionIcon,
    Trash2,
    PlusCircle,
    CheckCircle,
    Clock,
    AlertCircle,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "react-hot-toast"

type DeductionItem = {
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

type UserOption = { users_id: string; name: string | null; email: string }

function initials(name: string | null, email: string) {
    if (name) {
        const parts = name.trim().split(" ")
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        return parts[0][0].toUpperCase()
    }
    return email[0].toUpperCase()
}

export default function PersonalDeductionsPage() {
    const [items, setItems] = useState<DeductionItem[]>([])
    const [archivedItems, setArchivedItems] = useState<DeductionItem[]>([])
    const [search, setSearch] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [open, setOpen] = useState(false)
    const [users, setUsers] = useState<UserOption[]>([])
    const [form, setForm] = useState({ users_id: "", amount: "", purpose: "", monthlyPaymentPercent: "", termMonths: "" })
    const [saving, setSaving] = useState(false)
    const [userSearch, setUserSearch] = useState("")
    const [selectedItem, setSelectedItem] = useState<DeductionItem | null>(null)
    const [detailsOpen, setDetailsOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [editSaving, setEditSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<{ amount: number; purpose: string; monthlyPaymentPercent: number; termMonths: number; status: string }>({ amount: 0, purpose: "", monthlyPaymentPercent: 0, termMonths: 0, status: "ACTIVE" })
    const [activeTab, setActiveTab] = useState<"active" | "archived">("active")
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isDeleting, setIsDeleting] = useState(false)
    const [customTerm, setCustomTerm] = useState("")
    const [isCustomTerm, setIsCustomTerm] = useState(false)
    const [customPercent, setCustomPercent] = useState("")
    const [isCustomPercent, setIsCustomPercent] = useState(false)

    // Confirm modals
    const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false)
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
    const [selectedItemForArchive, setSelectedItemForArchive] = useState<DeductionItem | null>(null)
    const [selectedItemForDelete, setSelectedItemForDelete] = useState<DeductionItem | null>(null)

    // Auto-calculate monthly payment %
    useEffect(() => {
        if (isCustomPercent) return
        const amount = Number(form.amount)
        const termMonths = Number(form.termMonths)
        if (amount > 0 && termMonths > 0) {
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
            const res = await fetch("/api/admin/loans")
            const data = await res.json()
            const all: DeductionItem[] = data.items || []
            setItems(all.filter(i => i.purpose?.startsWith("[DEDUCTION]")))
        } catch (e) {
            console.error("Error loading deductions", e)
        } finally {
            setIsLoading(false)
        }
    }

    async function loadArchivedDeductions() {
        try {
            const res = await fetch("/api/admin/loans?archived=true")
            const data = await res.json()
            const all: DeductionItem[] = data.items || []
            setArchivedItems(all.filter(i => i.purpose?.startsWith("[DEDUCTION]")))
        } catch (e) {
            console.error("Error loading archived deductions", e)
        }
    }

    async function loadUsers() {
        try {
            const res = await fetch("/api/admin/users")
            const data = await res.json()
            const opts = (data.users || [])
                .filter((u: { role: string }) => u.role === "PERSONNEL")
                .map((u: { users_id: string; name: string | null; email: string }) => ({ users_id: u.users_id, name: u.name, email: u.email }))
            setUsers(opts)
        } catch (e) {
            console.error("Error loading users:", e)
        }
    }

    async function viewDetails(item: DeductionItem) {
        try {
            const res = await fetch(`/api/admin/loans/${item.loans_id}`)
            const data = await res.json()
            setSelectedItem(data)
            setDetailsOpen(true)
        } catch (e) {
            console.error("Error loading details:", e)
        }
    }

    async function startEdit(item: DeductionItem) {
        try {
            const res = await fetch(`/api/admin/loans/${item.loans_id}`)
            const data = await res.json()
            setEditingId(item.loans_id)
            setEditForm({
                amount: Number(data.amount),
                purpose: data.purpose || "",
                monthlyPaymentPercent: Number(data.monthlyPaymentPercent),
                termMonths: Number(data.termMonths),
                status: data.status || "ACTIVE",
            })
            setEditOpen(true)
        } catch (e) {
            console.error("Error loading deduction for edit:", e)
        }
    }

    async function submitEdit() {
        if (!editingId) return
        setEditSaving(true)
        try {
            let purpose = editForm.purpose
            if (!purpose.startsWith("[DEDUCTION]")) purpose = `[DEDUCTION] ${purpose}`
            const res = await fetch(`/api/admin/loans/${editingId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ purpose, monthlyPaymentPercent: editForm.monthlyPaymentPercent, termMonths: editForm.termMonths, status: editForm.status }),
            })
            if (!res.ok) throw new Error("Failed to update deduction")
            toast.success("Deduction updated successfully!")
            setEditOpen(false)
            await loadDeductions()
        } catch (e) {
            toast.error("Failed to update deduction")
        } finally {
            setEditSaving(false)
        }
    }

    function openArchiveDialog(item: DeductionItem) {
        setSelectedItemForArchive(item)
        setArchiveConfirmOpen(true)
    }

    async function confirmArchive() {
        if (!selectedItemForArchive) return
        try {
            const res = await fetch(`/api/admin/loans/${selectedItemForArchive.loans_id}/archive`, { method: "POST" })
            if (!res.ok) throw new Error("Failed to archive")
            toast.success("Deduction archived successfully!")
            setArchiveConfirmOpen(false)
            await loadDeductions()
            await loadArchivedDeductions()
        } catch (e) {
            toast.error("Failed to archive deduction")
        }
    }

    function openDeleteDialog(item: DeductionItem) {
        setSelectedItemForDelete(item)
        setDeleteConfirmOpen(true)
    }

    async function confirmDelete() {
        if (!selectedItemForDelete) return
        try {
            const res = await fetch(`/api/admin/loans/${selectedItemForDelete.loans_id}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Failed to delete")
            toast.success("Deduction deleted successfully!")
            setDeleteConfirmOpen(false)
            await loadDeductions()
            await loadArchivedDeductions()
        } catch (e) {
            toast.error("Failed to delete deduction")
        }
    }

    async function confirmBulkDelete() {
        setIsDeleting(true)
        try {
            await Promise.all(selectedIds.map(id => fetch(`/api/admin/loans/${id}`, { method: "DELETE" })))
            toast.success(`Deleted ${selectedIds.length} deduction(s)`)
            setSelectedIds([])
            setBulkDeleteConfirmOpen(false)
            await loadDeductions()
            await loadArchivedDeductions()
        } catch (e) {
            toast.error("Failed to delete selected deductions")
        } finally {
            setIsDeleting(false)
        }
    }

    function toggleSelectAll() {
        const list = activeTab === "active" ? filtered : filteredArchived
        setSelectedIds(selectedIds.length === list.length ? [] : list.map(i => i.loans_id))
    }

    function toggleSelect(id: string) {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }

    async function submitDeduction() {
        setSaving(true)
        try {
            const res = await fetch("/api/admin/loans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    users_id: form.users_id,
                    amount: Number(form.amount),
                    purpose: `[DEDUCTION] ${form.purpose}`,
                    monthlyPaymentPercent: Number(form.monthlyPaymentPercent),
                    termMonths: Number(form.termMonths),
                }),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to create deduction")
            }
            toast.success("Deduction created successfully!")
            setOpen(false)
            setForm({ users_id: "", amount: "", purpose: "", monthlyPaymentPercent: "", termMonths: "" })
            setIsCustomPercent(false)
            setIsCustomTerm(false)
            await loadDeductions()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed to create deduction")
        } finally {
            setSaving(false)
        }
    }

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return items.filter(i =>
            (i.userName || "").toLowerCase().includes(q) ||
            i.userEmail.toLowerCase().includes(q) ||
            (i.department || "").toLowerCase().includes(q) ||
            (i.purpose || "").toLowerCase().includes(q)
        )
    }, [items, search])

    const filteredArchived = useMemo(() => {
        const q = search.toLowerCase()
        return archivedItems.filter(i =>
            (i.userName || "").toLowerCase().includes(q) ||
            i.userEmail.toLowerCase().includes(q) ||
            (i.purpose || "").toLowerCase().includes(q)
        )
    }, [archivedItems, search])

    const activeCount = items.filter(i => i.status === "ACTIVE").length
    const completedCount = items.filter(i => i.status === "COMPLETED").length
    const totalAmount = items.reduce((s, i) => s + i.amount, 0)
    const totalOutstanding = items.reduce((s, i) => s + i.balance, 0)
    const totalPerPayroll = items.reduce((s, i) => s + (i.amount * i.monthlyPaymentPercent) / 100, 0)

    const currentList = activeTab === "active" ? filtered : filteredArchived

    return (
        <div className="flex-1 space-y-6 p-4 pt-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                            <DeductionIcon className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Staff Deductions</h2>
                            <p className="text-sm text-muted-foreground">Manage individual staff deductions (non-mandatory)</p>
                        </div>
                    </div>
                </div>
                <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) { loadUsers(); setUserSearch("") } }}>
                    <DialogTrigger asChild>
                        <Button className="bg-red-600 hover:bg-red-700 text-white gap-2">
                            <Plus className="h-4 w-4" />Add Staff Deduction
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="w-full sm:max-w-6xl max-h-[90vh] overflow-y-auto" style={{ width: "95vw", maxWidth: "1200px" }}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-2xl">
                                <PlusCircle className="h-6 w-6 text-red-600" />Add Staff Deduction
                            </DialogTitle>
                        </DialogHeader>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left - Form */}
                            <div className="space-y-5">
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-red-600" />Deduction Details
                                    </h3>
                                    <div className="space-y-2">
                                        <label className="text-base flex items-center gap-2 font-medium">
                                            <User className="h-4 w-4" />Select Staff
                                        </label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input placeholder="Search staff..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-10" />
                                        </div>
                                        <div className="border rounded-md max-h-[160px] overflow-y-auto">
                                            {users.filter(u => {
                                                const q = userSearch.toLowerCase()
                                                return (u.name || "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
                                            }).map(u => (
                                                <div key={u.users_id} onClick={() => setForm(f => ({ ...f, users_id: u.users_id }))}
                                                    className={`p-3 cursor-pointer hover:bg-muted transition-colors border-b last:border-b-0 ${form.users_id === u.users_id ? "bg-red-50 dark:bg-red-900/20" : ""}`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarFallback className="bg-red-100 text-red-700 text-xs font-bold">{initials(u.name, u.email)}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-medium text-sm">{u.name || u.email}</p>
                                                                <p className="text-xs text-muted-foreground">{u.email}</p>
                                                            </div>
                                                        </div>
                                                        {form.users_id === u.users_id && <CheckCircle className="h-5 w-5 text-red-600" />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-base flex items-center gap-2 font-medium">
                                            <span className="font-bold">₱</span>Deduction Amount
                                        </label>
                                        <Input type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="h-11 text-base" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-base flex items-center gap-2 font-medium">
                                            <FileText className="h-4 w-4" />Purpose
                                        </label>
                                        <Input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="e.g. Uniform, Lost Equipment" className="h-11 text-base" />
                                    </div>
                                </div>
                                <Separator />
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-red-600" />Payment Terms
                                    </h3>
                                    <div className="space-y-2">
                                        <label className="text-base font-medium">Term (Months)</label>
                                        <div className="grid grid-cols-3 gap-2 mb-2">
                                            {[1, 3, 6, 12, 18, 24].map(m => (
                                                <Button key={m} type="button" variant={!isCustomTerm && Number(form.termMonths) === m ? "default" : "outline"}
                                                    onClick={() => { setIsCustomTerm(false); setCustomTerm(""); setForm(f => ({ ...f, termMonths: m.toString() })) }}
                                                    className={!isCustomTerm && Number(form.termMonths) === m ? "bg-red-600 hover:bg-red-700" : ""}>
                                                    {m} {m === 1 ? "Month" : "Months"}
                                                </Button>
                                            ))}
                                            <Button type="button" variant={isCustomTerm ? "default" : "outline"} onClick={() => setIsCustomTerm(true)}
                                                className={isCustomTerm ? "bg-red-600 hover:bg-red-700" : ""}>Custom</Button>
                                        </div>
                                        {isCustomTerm && (
                                            <Input type="number" min="1" value={customTerm} onChange={e => { setCustomTerm(e.target.value); setForm(f => ({ ...f, termMonths: e.target.value })) }} placeholder="Enter custom months" className="h-11 text-base" />
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-base font-medium">Monthly Payment Percentage</label>
                                        <Input value={form.monthlyPaymentPercent ? `${form.monthlyPaymentPercent}% (Auto-calculated)` : ""} readOnly={!isCustomPercent} className={`h-11 text-base ${!isCustomPercent ? "bg-muted cursor-not-allowed" : ""}`} placeholder="Auto-calculated" />
                                        <Button type="button" variant="ghost" size="sm" onClick={() => setIsCustomPercent(!isCustomPercent)} className="text-xs text-red-600 hover:text-red-700 p-0 h-auto font-normal">
                                            {isCustomPercent ? "Switch to Auto-calculation" : "Switch to Custom Percentage"}
                                        </Button>
                                        {isCustomPercent && (
                                            <Input type="number" value={customPercent} onChange={e => { setCustomPercent(e.target.value); setForm(f => ({ ...f, monthlyPaymentPercent: e.target.value })) }} placeholder="Enter custom percent" className="h-11 text-base mt-2" />
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Right - Summary */}
                            <div className="md:border-l md:pl-6">
                                <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white h-full min-h-[400px]">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="flex items-center gap-2 text-xl">
                                            <TrendingUp className="h-5 w-5 text-red-600" />Payment Summary
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {form.amount && form.monthlyPaymentPercent && form.termMonths ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                                    <div className="flex items-center gap-2">
                                                        <Banknote className="h-4 w-4 text-red-600" />
                                                        <span className="text-sm font-medium text-muted-foreground">Deduction Amount</span>
                                                    </div>
                                                    <span className="text-lg font-bold text-red-600">₱{Number(form.amount).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-purple-600" />
                                                        <span className="text-sm font-medium text-muted-foreground">Term</span>
                                                    </div>
                                                    <span className="text-lg font-bold text-purple-600">{form.termMonths} months</span>
                                                </div>
                                                <Separator />
                                                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                                                    <div className="flex items-center gap-2">
                                                        <CreditCard className="h-4 w-4 text-green-600" />
                                                        <span className="text-sm font-medium text-green-700">Monthly Payment</span>
                                                    </div>
                                                    <span className="text-lg font-bold text-green-700">₱{((Number(form.amount) * Number(form.monthlyPaymentPercent)) / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                                                    <div className="flex items-center gap-2">
                                                        <CreditCard className="h-4 w-4 text-orange-600" />
                                                        <span className="text-sm font-medium text-orange-700">Per Payroll</span>
                                                    </div>
                                                    <span className="text-lg font-bold text-orange-700">₱{((Number(form.amount) * Number(form.monthlyPaymentPercent)) / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                                <Separator />
                                                <div className="flex items-center justify-between p-3 bg-blue-100 rounded-lg border border-blue-300">
                                                    <div className="flex items-center gap-2">
                                                        <TrendingUp className="h-4 w-4 text-blue-700" />
                                                        <span className="text-sm font-medium text-blue-700">Total Deduction</span>
                                                    </div>
                                                    <span className="text-lg font-bold text-blue-700">₱{(Number(form.amount) * (Number(form.monthlyPaymentPercent) / 100) * Number(form.termMonths)).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                                                <p className="text-sm text-muted-foreground">Enter details to see calculation</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end mt-6 pt-6 border-t">
                            <Button variant="outline" onClick={() => setOpen(false)} className="h-11 px-6">Cancel</Button>
                            <Button disabled={saving || !form.users_id || !form.amount || !form.termMonths} onClick={submitDeduction} className="bg-red-600 hover:bg-red-700 h-11 px-6">
                                {saving ? "Creating..." : "Create Deduction"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b overflow-x-auto">
                <Button variant={activeTab === "active" ? "default" : "ghost"} onClick={() => setActiveTab("active")} className="rounded-b-none">
                    <DeductionIcon className="h-4 w-4 mr-2" />Active Deductions
                    {activeCount > 0 && <Badge className="ml-2 bg-red-500 hover:bg-red-600 text-white border-0 h-5 px-1.5">{activeCount}</Badge>}
                </Button>
                <Button variant={activeTab === "archived" ? "default" : "ghost"} onClick={() => setActiveTab("archived")} className="rounded-b-none">
                    <Archive className="h-4 w-4 mr-2" />Archived
                    {archivedItems.length > 0 && <Badge className="ml-2 bg-gray-500 hover:bg-gray-600 text-white border-0 h-5 px-1.5">{archivedItems.length}</Badge>}
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-red-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Deductions</CardTitle>
                        <DeductionIcon className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCount}</div>
                        <p className="text-xs text-muted-foreground">Currently active</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completedCount}</div>
                        <p className="text-xs text-muted-foreground">Fully paid off</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-orange-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{totalOutstanding.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">Remaining to be paid</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-pink-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Per Payroll Collection</CardTitle>
                        <CreditCard className="h-4 w-4 text-pink-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₱{totalPerPayroll.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">Per-payroll deductions</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main List */}
            <Card className="border shadow-sm overflow-hidden">
                <CardHeader className="p-4 border-b bg-muted/40">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <DeductionIcon className="h-5 w-5 text-primary" />
                                </div>
                                <CardTitle className="text-xl">{activeTab === "active" ? "Active Deductions" : "Archived Deductions"}</CardTitle>
                            </div>
                            <div className="relative w-full md:w-80">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search by name, purpose..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
                            </div>
                        </div>
                        {selectedIds.length > 0 && (
                            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200">
                                <span className="text-sm font-medium text-red-700">{selectedIds.length} item(s) selected</span>
                                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteConfirmOpen(true)} disabled={isDeleting} className="gap-2">
                                    <Trash2 className="h-4 w-4" />{isDeleting ? "Deleting..." : "Delete Selected"}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16 text-muted-foreground">
                            <Clock className="h-5 w-5 mr-2 animate-spin" />Loading...
                        </div>
                    ) : currentList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="p-4 bg-muted/50 rounded-full mb-4">
                                <DeductionIcon className="h-12 w-12 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">No deductions found</h3>
                            <p className="text-sm text-muted-foreground">{search ? "Try adjusting your search terms" : "Get started by adding a new staff deduction"}</p>
                        </div>
                    ) : (
                        <div className="space-y-0 divide-y">
                            {currentList.map(item => (
                                <div key={item.loans_id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4 bg-card hover:bg-accent/5 transition-colors">
                                    {/* Left */}
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <input type="checkbox" className="h-4 w-4" checked={selectedIds.includes(item.loans_id)} onChange={() => toggleSelect(item.loans_id)} />
                                        <Avatar className="h-10 w-10 border-2 border-muted shrink-0">
                                            <AvatarFallback className="bg-gradient-to-br from-red-100 to-red-200 text-red-700 font-bold">{initials(item.userName, item.userEmail)}</AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-0.5 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-base">{item.userName || item.userEmail}</p>
                                                {item.department && (
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 text-[10px] h-5 px-1.5 border-red-200">{item.department}</Badge>
                                                )}
                                                <Badge className={
                                                    item.status === "ACTIVE" ? "bg-blue-100 text-blue-800 border-0 text-[10px] h-5 px-1.5" :
                                                        item.status === "COMPLETED" ? "bg-green-100 text-green-800 border-0 text-[10px] h-5 px-1.5" :
                                                            "bg-gray-100 text-gray-800 border-0 text-[10px] h-5 px-1.5"
                                                }>{item.status}</Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <FileText className="h-3 w-3 shrink-0" />
                                                <span className="font-medium text-foreground/80 truncate">{item.purpose?.replace("[DEDUCTION] ", "")}</span>
                                                <span>•</span>
                                                <span className="shrink-0">{format(new Date(item.createdAt), "MMM dd, yyyy")}</span>
                                            </div>
                                            {activeTab === "active" && (
                                                <div className="flex gap-2 mt-1.5">
                                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => viewDetails(item)}>
                                                        <Eye className="h-3 w-3 mr-1" />Details
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startEdit(item)}>
                                                        <FileText className="h-3 w-3 mr-1" />Edit
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openArchiveDialog(item)}>
                                                        <Archive className="h-3 w-3 mr-1" />Archive
                                                    </Button>
                                                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => openDeleteDialog(item)}>
                                                        <Trash2 className="h-3 w-3 mr-1" />Delete
                                                    </Button>
                                                </div>
                                            )}
                                            {activeTab === "archived" && (
                                                <div className="flex gap-2 mt-1.5">
                                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => viewDetails(item)}>
                                                        <Eye className="h-3 w-3 mr-1" />Details
                                                    </Button>
                                                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => openDeleteDialog(item)}>
                                                        <Trash2 className="h-3 w-3 mr-1" />Delete
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Right - Amounts */}
                                    <div className="ml-14 sm:ml-0 flex gap-6 shrink-0">
                                        <div className="text-center border-r pr-6">
                                            <p className="text-xs text-muted-foreground mb-0.5">Per Payroll</p>
                                            <p className="text-lg font-bold text-red-600">₱{((item.amount * item.monthlyPaymentPercent) / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                        </div>
                                        <div className="text-center border-r pr-6">
                                            <p className="text-xs text-muted-foreground mb-0.5">Balance</p>
                                            <p className="text-lg font-bold text-orange-600">₱{item.balance.toLocaleString()}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs text-muted-foreground mb-0.5">Total</p>
                                            <p className="text-lg font-bold text-gray-700">₱{item.amount.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Details Dialog */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>Deduction Details</DialogTitle></DialogHeader>
                    {selectedItem && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                                <Avatar className="h-12 w-12">
                                    <AvatarFallback className="bg-red-100 text-red-700 font-bold">{initials(selectedItem.userName, selectedItem.userEmail)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{selectedItem.userName || selectedItem.userEmail}</p>
                                    <p className="text-sm text-muted-foreground">{selectedItem.department || "N/A"}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {[
                                    { label: "Purpose", value: selectedItem.purpose?.replace("[DEDUCTION] ", "") },
                                    { label: "Status", value: selectedItem.status },
                                    { label: "Total Amount", value: `₱${selectedItem.amount.toLocaleString()}` },
                                    { label: "Balance", value: `₱${selectedItem.balance.toLocaleString()}` },
                                    { label: "Monthly Payment %", value: `${selectedItem.monthlyPaymentPercent}%` },
                                    { label: "Term", value: `${selectedItem.termMonths} months` },
                                    { label: "Per Payroll", value: `₱${((selectedItem.amount * selectedItem.monthlyPaymentPercent) / 100).toLocaleString()}` },
                                    { label: "Created At", value: format(new Date(selectedItem.createdAt), "MMM dd, yyyy") },
                                ].map(({ label, value }) => (
                                    <div key={label} className="p-2 bg-muted/30 rounded">
                                        <p className="text-xs text-muted-foreground">{label}</p>
                                        <p className="font-semibold">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Edit Deduction</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Purpose</label>
                            <Input value={editForm.purpose.replace("[DEDUCTION] ", "")} onChange={e => setEditForm(f => ({ ...f, purpose: `[DEDUCTION] ${e.target.value}` }))} placeholder="Purpose" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Monthly Payment %</label>
                            <Input type="number" value={editForm.monthlyPaymentPercent} onChange={e => setEditForm(f => ({ ...f, monthlyPaymentPercent: Number(e.target.value) }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Term (Months)</label>
                            <Input type="number" value={editForm.termMonths} onChange={e => setEditForm(f => ({ ...f, termMonths: Number(e.target.value) }))} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2 justify-end pt-2">
                            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
                            <Button onClick={submitEdit} disabled={editSaving}>{editSaving ? "Saving..." : "Save Changes"}</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Archive Confirm */}
            <Dialog open={archiveConfirmOpen} onOpenChange={setArchiveConfirmOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Archive className="h-5 w-5 text-orange-600" />Archive Deduction</DialogTitle>
                        <DialogDescription>Archive the deduction for <strong>{selectedItemForArchive?.userName || selectedItemForArchive?.userEmail}</strong>? It will be moved to archived and no longer active.</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-2">
                        <Button variant="outline" onClick={() => setArchiveConfirmOpen(false)}>Cancel</Button>
                        <Button onClick={confirmArchive} className="bg-orange-600 hover:bg-orange-700">Archive</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600"><AlertCircle className="h-5 w-5" />Delete Deduction</DialogTitle>
                        <DialogDescription>Delete the deduction for <strong>{selectedItemForDelete?.userName || selectedItemForDelete?.userEmail}</strong>? This cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-2">
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Confirm */}
            <Dialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600"><AlertCircle className="h-5 w-5" />Delete Selected</DialogTitle>
                        <DialogDescription>Delete {selectedIds.length} selected deduction(s)? This cannot be undone.</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 mt-2">
                        <Button variant="outline" onClick={() => setBulkDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button variant="destructive" disabled={isDeleting} onClick={confirmBulkDelete}>{isDeleting ? "Deleting..." : "Delete All"}</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
