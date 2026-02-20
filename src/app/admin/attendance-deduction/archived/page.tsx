"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
    ArrowLeft, Archive, Search, ArrowUpDown, ArrowUp, ArrowDown,
    Eye, CalendarDays, User, BookOpen, CircleDollarSign, Printer, Minus
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"

type ArchivedAttendanceDeduction = {
    deductions_id: string
    users_id: string
    staffName: string
    deductionType: string
    amount: number
    notes: string
    appliedAt: string
    archivedAt: string | null
}

type SortKey = "staffName" | "deductionType" | "amount" | "appliedAt" | "archivedAt"
type SortDir = "asc" | "desc"

function fmt(dateStr: string | null) {
    if (!dateStr) return "N/A"
    return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function fmtCurrency(amount: number) {
    return "₱" + amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getTypeBadgeClass(type: string) {
    const t = type.toLowerCase()
    if (t.includes("absent")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
    if (t.includes("late") || t.includes("tardiness")) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
    if (t.includes("early") || t.includes("undertime")) return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
}

export default function ArchivedAttendanceDeductionsPage() {
    const [deductions, setDeductions] = useState<ArchivedAttendanceDeduction[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [sortKey, setSortKey] = useState<SortKey>("appliedAt")
    const [sortDir, setSortDir] = useState<SortDir>("desc")
    const [selected, setSelected] = useState<ArchivedAttendanceDeduction | null>(null)
    const router = useRouter()

    useEffect(() => { load() }, [])

    async function load() {
        try {
            setLoading(true)
            const res = await fetch("/api/admin/attendance-deductions?archived=true")
            if (res.ok) {
                const data = await res.json()
                setDeductions(data.deductions || [])
            } else {
                toast.error("Failed to load archived deductions")
            }
        } catch {
            toast.error("Failed to load archived deductions")
        } finally {
            setLoading(false)
        }
    }

    function handlePrint(d: ArchivedAttendanceDeduction) {
        const win = window.open('', '_blank', 'width=600,height=700')
        if (!win) return
        win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Attendance Deduction Record</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; }
    .header { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #f97316; padding-bottom: 16px; margin-bottom: 20px; }
    .logo { width: 56px; height: 56px; object-fit: contain; flex-shrink: 0; }
    .header-text h1 { font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
    .header-text p { font-size: 11px; color: #555; margin-top: 2px; }
</style>
</head>
<body>
  <div class="header">
    <img class="logo" src="${window.location.origin}/brgy-logo.png" alt="Brgy Logo" />
    <div class="header-text">
      <h1>Barangay Poblacion Tubod</h1>
      <p>Attendance Deduction Record</p>
      <p style="margin-top:4px;font-size:10px;color:#aaa">Printed: ${new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' })}</p>
    </div>
  </div>

  <div class="section">
    <div class="label">Staff Member</div>
    <div class="value">${d.staffName}</div>
  </div>

  <div class="grid" style="margin-bottom:14px">
    <div class="card">
      <div class="label">Deduction Type</div>
      <div style="margin-top:4px"><span class="badge">${d.deductionType}</span></div>
    </div>
    <div class="card">
      <div class="label">Amount Deducted</div>
      <div class="amount">-${fmtCurrency(d.amount)}</div>
    </div>
  </div>

  <div class="card section">
    <div class="label">Notes / Reason</div>
    <div style="margin-top:4px;font-size:13px">${d.notes || '<em style="color:#aaa">No notes provided</em>'}</div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="label">Date Applied</div>
      <div class="value" style="font-size:13px">${fmt(d.appliedAt)}</div>
    </div>
    <div class="card">
      <div class="label">Archived On</div>
      <div class="value" style="font-size:13px">${fmt(d.archivedAt)}</div>
    </div>
  </div>

  <div class="footer">This is an official record from the Barangay Poblacion Tubod Payroll Management System.</div>
</body>
</html>`)
        win.document.close()
        win.focus()
        setTimeout(() => win.print(), 400)
    }


    function toggleSort(key: SortKey) {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
        else { setSortKey(key); setSortDir("asc") }
    }

    const filtered = useMemo(() => {
        const q = search.toLowerCase()
        return deductions
            .filter(d =>
                d.staffName.toLowerCase().includes(q) ||
                d.deductionType.toLowerCase().includes(q) ||
                (d.notes || "").toLowerCase().includes(q)
            )
            .sort((a, b) => {
                let av: any = a[sortKey] ?? ""
                let bv: any = b[sortKey] ?? ""
                if (sortKey === "amount") return sortDir === "asc" ? av - bv : bv - av
                if (sortKey === "appliedAt" || sortKey === "archivedAt") {
                    av = av ? new Date(av).getTime() : 0
                    bv = bv ? new Date(bv).getTime() : 0
                    return sortDir === "asc" ? av - bv : bv - av
                }
                return sortDir === "asc"
                    ? String(av).localeCompare(String(bv))
                    : String(bv).localeCompare(String(av))
            })
    }, [deductions, search, sortKey, sortDir])

    const totalAmount = useMemo(() => filtered.reduce((s, d) => s + d.amount, 0), [filtered])
    const uniqueStaff = useMemo(() => new Set(filtered.map(d => d.users_id)).size, [filtered])

    function SortIcon({ col }: { col: SortKey }) {
        if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
        return sortDir === "asc"
            ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
            : <ArrowDown className="h-3 w-3 ml-1 text-primary" />
    }

    function SortHeader({ col, label }: { col: SortKey; label: string }) {
        return (
            <button
                className="flex items-center gap-0.5 font-semibold hover:text-primary transition-colors"
                onClick={() => toggleSort(col)}
            >
                {label}<SortIcon col={col} />
            </button>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Archive className="h-8 w-8 text-blue-600" />
                        Archived Attendance Deductions
                    </h1>
                    <p className="text-muted-foreground mt-1">History of all archived attendance-based deductions</p>
                </div>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => router.push("/admin/attendance-deduction")}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>
            </div>

            {/* Stats - dashboard style */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { icon: Archive, label: "Total Records", value: String(filtered.length), desc: "Archived entries", color: "text-blue-600", border: "border-l-blue-500" },
                    { icon: User, label: "Staff Affected", value: String(uniqueStaff), desc: "Unique staff", color: "text-purple-600", border: "border-l-purple-500" },
                    { icon: Minus, label: "Total Deducted", value: fmtCurrency(totalAmount), desc: "Sum of filtered records", color: "text-red-600", border: "border-l-red-500" },
                    { icon: CalendarDays, label: "Showing", value: `${filtered.length} / ${deductions.length}`, desc: "Filtered / total", color: "text-orange-600", border: "border-l-orange-500" },
                ].map(({ icon: Icon, label, value, desc, color, border }) => (
                    <Card key={label} className={`hover:shadow-md transition-shadow duration-200 border-l-4 ${border}`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{label}</CardTitle>
                            <Icon className={`h-4 w-4 ${color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{value}</div>
                            <p className="text-xs text-muted-foreground">{desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Table Card */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-base">Archived Records</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by staff, type, or notes..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <p className="text-sm text-muted-foreground">Loading archived deductions...</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40 hover:bg-muted/40">
                                    <TableHead className="pl-4"><SortHeader col="staffName" label="Staff" /></TableHead>
                                    <TableHead><SortHeader col="deductionType" label="Type" /></TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead><SortHeader col="amount" label="Amount" /></TableHead>
                                    <TableHead><SortHeader col="archivedAt" label="Archived On" /></TableHead>
                                    <TableHead className="text-center">Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-16">
                                            <Archive className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-40" />
                                            <p className="text-base font-medium text-muted-foreground">
                                                {search ? "No results match your search" : "No archived deductions found"}
                                            </p>
                                            {search && (
                                                <Button variant="link" size="sm" onClick={() => setSearch("")} className="mt-1">
                                                    Clear search
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ) : filtered.map((d) => (
                                    <TableRow key={d.deductions_id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="pl-4">
                                            <p className="font-semibold">{d.staffName}</p>
                                            <p className="text-xs text-muted-foreground">{fmt(d.appliedAt)}</p>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getTypeBadgeClass(d.deductionType)}`}>
                                                {d.deductionType}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                            {d.notes || <span className="italic opacity-50">—</span>}
                                        </TableCell>
                                        <TableCell>
                                            <p className="font-bold text-red-600">-{fmtCurrency(d.amount)}</p>
                                            <p className="text-xs text-muted-foreground">Date applied</p>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{fmt(d.archivedAt)}</TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-xs gap-1"
                                                onClick={() => setSelected(d)}
                                            >
                                                <Eye className="h-3.5 w-3.5" />
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Details Dialog */}
            <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <BookOpen className="h-4 w-4 text-orange-500" />
                            Deduction Details
                        </DialogTitle>
                    </DialogHeader>
                    {selected && (
                        <div className="space-y-3">
                            {/* Staff */}
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                                <div className="h-9 w-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                                    <span className="text-orange-600 font-bold text-sm">
                                        {selected.staffName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Staff Member</p>
                                    <p className="font-semibold text-sm">{selected.staffName}</p>
                                </div>
                            </div>

                            {/* Type + Amount */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg border bg-muted/20">
                                    <p className="text-xs text-muted-foreground mb-1.5">Deduction Type</p>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getTypeBadgeClass(selected.deductionType)}`}>
                                        {selected.deductionType}
                                    </span>
                                </div>
                                <div className="p-3 rounded-lg border bg-muted/20">
                                    <p className="text-xs text-muted-foreground mb-1">Amount Deducted</p>
                                    <p className="text-lg font-bold text-red-600">-{fmtCurrency(selected.amount)}</p>
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="p-3 rounded-lg border bg-muted/20">
                                <p className="text-xs text-muted-foreground mb-1">Notes / Reason</p>
                                <p className="text-sm">{selected.notes || <span className="italic text-muted-foreground">No notes provided</span>}</p>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-lg border bg-muted/20">
                                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                        <CalendarDays className="h-3 w-3" /> Date Applied
                                    </p>
                                    <p className="text-sm font-medium">{fmt(selected.appliedAt)}</p>
                                </div>
                                <div className="p-3 rounded-lg border bg-muted/20">
                                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                        <Archive className="h-3 w-3" /> Archived On
                                    </p>
                                    <p className="text-sm font-medium">{fmt(selected.archivedAt)}</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="flex-1 gap-2"
                                    onClick={() => handlePrint(selected)}
                                >
                                    <Printer className="h-4 w-4" />
                                    Print
                                </Button>
                                <Button
                                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                                    onClick={() => setSelected(null)}
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
