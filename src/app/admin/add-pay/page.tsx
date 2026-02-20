"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, CheckSquare, Square, Trash2, Edit, Search, Archive, RotateCcw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-hot-toast"

type Personnel = {
  users_id: string
  name: string
  email: string
  role: string
  personnel_types?: {
    name?: string | null
    department?: string | null
  } | null
}

type OverloadPay = {
  overload_pays_id: string
  amount: number
  notes?: string | null
  type?: string | null
  users: {
    users_id: string
    name: string | null
    email: string
    personnel_types?: {
      name?: string | null
      department?: string | null
    } | null
  }
  appliedAt: string
  createdAt: string
}

export default function AddPayPage() {
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [overloadPays, setOverloadPays] = useState<OverloadPay[]>([])
  const [archivedOverloadPays, setArchivedOverloadPays] = useState<OverloadPay[]>([])
  const [activeTab, setActiveTab] = useState("active")
  const [loading, setLoading] = useState(true)

  // Add Pay dialog
  const [overloadPayOpen, setOverloadPayOpen] = useState(false)
  const [overloadAmount, setOverloadAmount] = useState("")
  const [overloadNotes, setOverloadNotes] = useState("")
  const [overloadPayType, setOverloadPayType] = useState("OVERTIME")
  const [overloadCustomType, setOverloadCustomType] = useState("")
  const [overloadSelectAll, setOverloadSelectAll] = useState(false)
  const [overloadSelectedEmployees, setOverloadSelectedEmployees] = useState<string[]>([])
  const [overloadEmployeeSearch, setOverloadEmployeeSearch] = useState("")
  const [showOverloadConfirmModal, setShowOverloadConfirmModal] = useState(false)
  const [duplicatePersonnel, setDuplicatePersonnel] = useState<string[]>([])

  // Bulk delete and edit
  const [selectedOverloadPays, setSelectedOverloadPays] = useState<string[]>([])
  const [isSelectAllOverloadPays, setIsSelectAllOverloadPays] = useState(false)
  const [showDeleteOverloadPaysModal, setShowDeleteOverloadPaysModal] = useState(false)
  const [showDeleteOverloadPayModal, setShowDeleteOverloadPayModal] = useState(false)
  const [overloadPayToDelete, setOverloadPayToDelete] = useState<string>('')
  const [editOverloadPayOpen, setEditOverloadPayOpen] = useState(false)
  const [editOverloadPayId, setEditOverloadPayId] = useState<string>("")
  const [editOverloadPayAmount, setEditOverloadPayAmount] = useState("")
  const [editOverloadPayNotes, setEditOverloadPayNotes] = useState("")

  const [searchQuery, setSearchQuery] = useState("")

  const filteredOverloadPays = useMemo(() => {
    if (!searchQuery) return overloadPays
    const q = searchQuery.toLowerCase()
    return overloadPays.filter(op => {
      return (
        op.users.name?.toLowerCase().includes(q) ||
        op.users.email.toLowerCase().includes(q) ||
        op.users.personnel_types?.department?.toLowerCase().includes(q) ||
        op.users.personnel_types?.name?.toLowerCase().includes(q) ||
        op.notes?.toLowerCase().includes(q)
      )
    })
  }, [overloadPays, searchQuery])

  const filteredOverloadPersonnel = useMemo(() => {
    if (!overloadEmployeeSearch) return personnel
    const q = overloadEmployeeSearch.toLowerCase()
    return personnel.filter(p => p.name?.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
  }, [personnel, overloadEmployeeSearch])

  async function loadAll() {
    try {
      setLoading(true)
      const [activeRes, archivedRes] = await Promise.all([
        fetch("/api/admin/overload-pay"),
        fetch("/api/admin/overload-pay?archived=true")
      ])
      if (activeRes.ok) setOverloadPays(await activeRes.json())
      if (archivedRes.ok) setArchivedOverloadPays(await archivedRes.json())
    } catch (e) {
      toast.error("Failed to load additional pay data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    async function loadPersonnel() {
      try {
        const res = await fetch("/api/admin/users")
        if (!res.ok) return
        const data = await res.json()
        const personnelOnly = data.users?.filter((u: Personnel) => u.role === 'PERSONNEL') || []
        setPersonnel(personnelOnly)
      } catch { }
    }
    if (overloadPayOpen) {
      loadPersonnel()
    }
  }, [overloadPayOpen])

  function toggleSelectAllOverloadPays() {
    if (isSelectAllOverloadPays) {
      setSelectedOverloadPays([])
      setIsSelectAllOverloadPays(false)
    } else {
      setSelectedOverloadPays(filteredOverloadPays.map(o => o.overload_pays_id))
      setIsSelectAllOverloadPays(true)
    }
  }

  function toggleOverloadPay(id: string) {
    setSelectedOverloadPays(prev => {
      if (prev.includes(id)) {
        const newSelection = prev.filter(overloadPayId => overloadPayId !== id)
        setIsSelectAllOverloadPays(false) // If unselecting one, select all is false
        return newSelection
      } else {
        const newSelection = [...prev, id]
        setIsSelectAllOverloadPays(newSelection.length === filteredOverloadPays.length)
        return newSelection
      }
    })
  }

  function promptDeleteOverloadPays() {
    if (selectedOverloadPays.length === 0) {
      toast.error('Please select at least one additional pay to delete')
      return
    }
    setShowDeleteOverloadPaysModal(true)
  }

  async function bulkDeleteOverloadPays() {
    setShowDeleteOverloadPaysModal(false)
    try {
      toast.loading('Archiving additional pays...', { id: 'bulk-delete-overload' })
      const results = await Promise.all(
        selectedOverloadPays.map(id => fetch(`/api/admin/overload-pay/${id}`, { method: "DELETE" }))
      )
      const failed = results.filter(r => !r.ok)
      if (failed.length > 0) throw new Error(`Failed to archive ${failed.length} additional pay(s)`)
      toast.success(`Archived ${selectedOverloadPays.length} additional pay(s)`, { id: 'bulk-delete-overload' })
      setSelectedOverloadPays([])
      setIsSelectAllOverloadPays(false)
      loadAll()
    } catch (error) {
      toast.error(`Failed to archive: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'bulk-delete-overload' })
    }
  }

  async function restoreOverloadPay(id: string) {
    try {
      const res = await fetch(`/api/admin/overload-pay/${id}`, { method: "PATCH" })
      if (!res.ok) throw new Error()
      toast.success("Additional pay restored")
      loadAll()
    } catch {
      toast.error("Failed to restore additional pay")
    }
  }

  async function permanentlyDeleteOverloadPay(id: string) {
    try {
      const res = await fetch(`/api/admin/overload-pay/${id}?permanent=true`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Permanently deleted")
      loadAll()
    } catch {
      toast.error("Failed to permanently delete")
    }
  }

  function promptDeleteOverloadPay(id: string) {
    setOverloadPayToDelete(id)
    setShowDeleteOverloadPayModal(true)
  }

  async function deleteOverloadPay() {
    setShowDeleteOverloadPayModal(false)
    const id = overloadPayToDelete
    try {
      const res = await fetch(`/api/admin/overload-pay/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Additional pay archived")
      setOverloadPayToDelete('')
      loadAll()
    } catch {
      toast.error("Failed to archive additional pay")
    }
  }

  function openEditOverloadPay(o: OverloadPay) {
    setEditOverloadPayId(o.overload_pays_id)
    setEditOverloadPayAmount(o.amount.toString())
    setEditOverloadPayNotes(o.notes || "")
    setEditOverloadPayOpen(true)
  }

  async function updateOverloadPay() {
    try {
      const res = await fetch(`/api/admin/overload-pay/${editOverloadPayId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(editOverloadPayAmount),
          notes: editOverloadPayNotes
        })
      })
      if (!res.ok) throw new Error()
      toast.success("Additional pay updated")
      setEditOverloadPayOpen(false)
      loadAll()
    } catch {
      toast.error("Failed to update additional pay")
    }
  }

  function toggleOverloadEmployee(id: string) {
    setOverloadSelectedEmployees(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function checkAndSaveOverloadPay() {
    try {
      if (!overloadAmount || Number(overloadAmount) <= 0) {
        toast.error("Please enter a valid amount")
        return
      }

      if (!overloadSelectAll && overloadSelectedEmployees.length === 0) {
        toast.error("Please select at least one staff or enable 'Select All'")
        return
      }

      let targetEmployees: string[] = []
      if (overloadSelectAll) {
        targetEmployees = personnel.map(p => p.users_id)
      } else {
        targetEmployees = overloadSelectedEmployees
      }

      const finalType = overloadPayType === 'CUSTOM' ? overloadCustomType : overloadPayType

      if (overloadPayType === 'CUSTOM' && !overloadCustomType.trim()) {
        toast.error("Please enter a custom type name")
        return
      }

      const existingIdsWithSameType = overloadPays
        .filter(op => op.type === finalType)
        .map(op => op.users.users_id)
      const duplicates = targetEmployees.filter(id => existingIdsWithSameType.includes(id))

      if (duplicates.length > 0) {
        const duplicateNames = duplicates
          .map(id => {
            const person = personnel.find(p => p.users_id === id)
            return person?.name || person?.email || 'Unknown'
          })
        setDuplicatePersonnel(duplicateNames)
        setShowOverloadConfirmModal(true)
        return
      }

      await saveOverloadPay()
    } catch (error) {
      console.error('Error checking additional pay:', error)
      toast.error(error instanceof Error ? error.message : "Failed to check additional pay")
    }
  }

  async function saveOverloadPay() {
    try {
      const payload = {
        amount: Number(overloadAmount),
        notes: overloadNotes,
        type: overloadPayType === 'CUSTOM' ? overloadCustomType : overloadPayType,
        selectAll: overloadSelectAll,
        employees: overloadSelectedEmployees
      }

      const res = await fetch("/api/admin/overload-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        console.error('API Error Response:', errorData)
        toast.error(errorData.error || 'Failed to add additional pay')
        throw new Error(errorData.error || 'Failed to add additional pay')
      }

      const data = await res.json()
      toast.success(data.message || "Additional pay added successfully")
      setOverloadPayOpen(false)
      setShowOverloadConfirmModal(false)
      setOverloadAmount("")
      setOverloadNotes("")
      setOverloadPayType("OVERTIME")
      setOverloadCustomType("")
      setOverloadSelectAll(false)
      setOverloadSelectedEmployees([])
      setOverloadEmployeeSearch("")
      setDuplicatePersonnel([])
      loadAll()
    } catch (error) {
      console.error('Error adding additional pay:', error)
      toast.error(error instanceof Error ? error.message : "Failed to add additional pay")
    }
  }

  const totalAmount = overloadPays.reduce((sum, op) => sum + Number(op.amount), 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Plus className="h-8 w-8 text-green-600" />
            Additional Pay
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage overtime, overload, and other additional compensation
          </p>
        </div>
        <Button onClick={() => setOverloadPayOpen(true)} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Pay
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="gap-2 bg-transparent p-0">
          <TabsTrigger value="active" className="flex items-center gap-2 px-4 py-2 rounded-md border-2 font-medium text-sm transition-all
              data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm
              data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground data-[state=inactive]:border-gray-400 hover:bg-muted">
            <Plus className="h-4 w-4" />
            Active
            {overloadPays.length > 0 && <Badge variant="secondary" className="ml-1">{overloadPays.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2 px-4 py-2 rounded-md border-2 font-medium text-sm transition-all
              data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary data-[state=active]:shadow-sm
              data-[state=inactive]:bg-background data-[state=inactive]:text-muted-foreground data-[state=inactive]:border-gray-400 hover:bg-muted">
            <Archive className="h-4 w-4" />
            Archived
            {archivedOverloadPays.length > 0 && <Badge variant="secondary" className="ml-1">{archivedOverloadPays.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Additional Pays</CardTitle>
                <Plus className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overloadPays.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Active entries</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Staff with Additional Pay</CardTitle>
                <Search className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{new Set(overloadPays.map(op => op.users.users_id)).size}</div>
                <p className="text-xs text-muted-foreground mt-1">Unique staff members</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <span className="text-emerald-600 font-bold text-sm">₱</span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Combined additional pay</p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Pays Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle>Current Additional Pays</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search staff..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {selectedOverloadPays.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={promptDeleteOverloadPays}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedOverloadPays.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-6">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleSelectAllOverloadPays}
                            className="h-8 w-8 p-0"
                          >
                            {isSelectAllOverloadPays ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                          <span className="text-sm font-medium">Select All</span>
                        </div>
                      </TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>BLGU</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Date Added</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOverloadPays.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No additional pays found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOverloadPays.map(op => (
                        <TableRow key={op.overload_pays_id}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleOverloadPay(op.overload_pays_id)}
                              className="h-8 w-8 p-0"
                            >
                              {selectedOverloadPays.includes(op.overload_pays_id) ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{op.users.name}</div>
                              <div className="text-sm text-muted-foreground">{op.users.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {op.users.personnel_types?.department || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {op.users.personnel_types?.name || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                              {op.type || 'OVERTIME'}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            +₱{op.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {op.notes || '—'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(op.appliedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditOverloadPay(op)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => promptDeleteOverloadPay(op.overload_pays_id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="archived" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-muted-foreground" />
                Archived Additional Pays
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-6">Loading...</div>
              ) : archivedOverloadPays.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>No archived additional pays</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>BLGU</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Archived</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedOverloadPays.map(op => (
                      <TableRow key={op.overload_pays_id} className="opacity-75">
                        <TableCell>
                          <div>
                            <div className="font-medium">{op.users.name}</div>
                            <div className="text-sm text-muted-foreground">{op.users.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {op.users.personnel_types?.department || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {op.users.personnel_types?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20">
                            {op.type || 'OVERTIME'}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-muted-foreground">
                          ₱{op.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{op.notes || '—'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(op.appliedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => restoreOverloadPay(op.overload_pays_id)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Restore
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => permanentlyDeleteOverloadPay(op.overload_pays_id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Additional Pay Dialog */}
      <Dialog open={overloadPayOpen} onOpenChange={setOverloadPayOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Additional Pay</DialogTitle>
            <DialogDescription>Add overtime, overload, or other additional compensation for staff.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="overload-type">Type</Label>
              <Select value={overloadPayType} onValueChange={setOverloadPayType}>
                <SelectTrigger id="overload-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OVERTIME">Overtime</SelectItem>
                  <SelectItem value="OVERLOAD">Overload</SelectItem>
                  <SelectItem value="CUSTOM">Custom</SelectItem>
                </SelectContent>
              </Select>
              {overloadPayType === 'CUSTOM' && (
                <Input
                  className="mt-2 focus-visible:ring-green-600"
                  placeholder="Enter custom type name"
                  value={overloadCustomType}
                  onChange={(e) => setOverloadCustomType(e.target.value)}
                />
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="overload-amount">Amount (₱)</Label>
              <Input
                id="overload-amount"
                type="number"
                placeholder="0.00"
                value={overloadAmount}
                onChange={(e) => setOverloadAmount(e.target.value)}
                className="focus-visible:ring-green-600"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="overload-notes">Notes (Optional)</Label>
              <Input
                id="overload-notes"
                placeholder="e.g., Extra hours compensation"
                value={overloadNotes}
                onChange={(e) => setOverloadNotes(e.target.value)}
                className="focus-visible:ring-green-600"
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch
                id="overload-select-all"
                checked={overloadSelectAll}
                onCheckedChange={setOverloadSelectAll}
              />
              <Label htmlFor="overload-select-all" className="cursor-pointer">
                Apply to all active staff
              </Label>
            </div>
            {!overloadSelectAll && (
              <div className="grid gap-2">
                <Label>Select Staff</Label>
                <Command className="border rounded-md">
                  <CommandInput
                    placeholder="Search staff..."
                    value={overloadEmployeeSearch}
                    onValueChange={setOverloadEmployeeSearch}
                  />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>No staff found.</CommandEmpty>
                    <CommandGroup>
                      {filteredOverloadPersonnel.map((person) => (
                        <CommandItem
                          key={person.users_id}
                          onSelect={() => toggleOverloadEmployee(person.users_id)}
                          className="flex items-center gap-2 cursor-pointer aria-selected:bg-green-50 data-[selected=true]:bg-green-50"
                        >
                          {overloadSelectedEmployees.includes(person.users_id) ? (
                            <CheckSquare className="h-4 w-4 text-green-600" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{person.name}</div>
                            <div className="text-sm text-muted-foreground">{person.email}</div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
                {overloadSelectedEmployees.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {overloadSelectedEmployees.length} staff selected
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverloadPayOpen(false)}>Cancel</Button>
            <Button onClick={checkAndSaveOverloadPay} className="bg-green-500 hover:bg-green-600">Save Additional Pay</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Confirmation Modal */}
      <Dialog open={showOverloadConfirmModal} onOpenChange={setShowOverloadConfirmModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate Additional Pay Detected</DialogTitle>
            <DialogDescription>
              The following staff already have additional pay:
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 p-3 bg-muted rounded-md">
            <ul className="list-disc list-inside text-sm space-y-1">
              {duplicatePersonnel.map((name, idx) => (
                <li key={idx}>{name}</li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Do you want to add additional pay to them?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverloadConfirmModal(false)}>
              Cancel
            </Button>
            <Button onClick={saveOverloadPay} className="bg-green-500 hover:bg-green-600">
              Yes, Add Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOverloadPayOpen} onOpenChange={setEditOverloadPayOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Additional Pay</DialogTitle>
            <DialogDescription>Update the amount and notes for this additional pay.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-overload-amount">Amount (₱)</Label>
              <Input
                id="edit-overload-amount"
                type="number"
                placeholder="0.00"
                value={editOverloadPayAmount}
                onChange={(e) => setEditOverloadPayAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-overload-notes">Notes (Optional)</Label>
              <Input
                id="edit-overload-notes"
                placeholder="e.g., Extra hours compensation"
                value={editOverloadPayNotes}
                onChange={(e) => setEditOverloadPayNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOverloadPayOpen(false)}>Cancel</Button>
            <Button onClick={updateOverloadPay}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Confirmation */}
      <Dialog open={showDeleteOverloadPayModal} onOpenChange={setShowDeleteOverloadPayModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Additional Pay?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this additional pay? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteOverloadPayModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteOverloadPay}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Bulk Confirmation */}
      <Dialog open={showDeleteOverloadPaysModal} onOpenChange={setShowDeleteOverloadPaysModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Additional Pays?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedOverloadPays.length} additional pay(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteOverloadPaysModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={bulkDeleteOverloadPays}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  )
}
