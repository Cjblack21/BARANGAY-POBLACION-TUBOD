"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, CheckSquare, Square, Trash2, BadgeMinus, CheckCheck, Pencil, AlertCircle } from "lucide-react"
import { toast } from "react-hot-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type DeductionType = {
  deduction_types_id: string
  name: string
  description?: string | null
  amount: number
  calculationType?: 'FIXED' | 'PERCENTAGE'
  percentageValue?: number | null
  isActive: boolean
  isMandatory: boolean
}

type Personnel = {
  users_id: string
  name: string
  email: string
  role: string
  dateHired?: Date | null
  personnel_types?: { name?: string | null; department?: string | null; basicSalary?: number } | null
}

type Deduction = {
  deductions_id: string
  amount: number
  notes?: string | null
  deduction_types: DeductionType
  users: {
    users_id: string
    name: string | null
    email: string
    personnel_types?: { name?: string | null; department?: string | null; basicSalary?: number } | null
  }
  createdAt: string
}

export default function DeductionsPage() {
  const [types, setTypes] = useState<DeductionType[]>([])
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [deductions, setDeductions] = useState<Deduction[]>([])
  const [loading, setLoading] = useState(true)

  // Create Type dialog
  const [typeOpen, setTypeOpen] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")
  const [newTypeDesc, setNewTypeDesc] = useState("")
  const [newTypeAmount, setNewTypeAmount] = useState("")
  const [newTypeCalculationType, setNewTypeCalculationType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED')
  const [newTypePercentageValue, setNewTypePercentageValue] = useState("")
  const [newTypeIsMandatory, setNewTypeIsMandatory] = useState(false)
  const [applyExistingMode, setApplyExistingMode] = useState(false)
  const [applySelectAll, setApplySelectAll] = useState(false)
  const [applySelectedPersonnel, setApplySelectedPersonnel] = useState<string[]>([])
  const [applyPersonnelSearch, setApplyPersonnelSearch] = useState("")

  // Sync Mandatory Deductions Modal
  const [syncMandatoryOpen, setSyncMandatoryOpen] = useState(false)
  const [selectedMandatoryTypes, setSelectedMandatoryTypes] = useState<string[]>([])
  const [syncSelectAllPersonnel, setSyncSelectAllPersonnel] = useState(false)
  const [syncSelectedPersonnel, setSyncSelectedPersonnel] = useState<string[]>([])
  const [syncPersonnelSearch, setSyncPersonnelSearch] = useState("")

  // Edit Type dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editTypeId, setEditTypeId] = useState<string>("")
  const [editTypeName, setEditTypeName] = useState("")
  const [editTypeDesc, setEditTypeDesc] = useState("")
  const [editTypeAmount, setEditTypeAmount] = useState("")
  const [editCalculationType, setEditCalculationType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED')
  const [editPercentageValue, setEditPercentageValue] = useState("")
  const [editTypeIsMandatory, setEditTypeIsMandatory] = useState(false)

  // Create Deductions dialog
  const [deductionOpen, setDeductionOpen] = useState(false)
  const [selectedTypeId, setSelectedTypeId] = useState<string>("")
  const [selectAll, setSelectAll] = useState(false)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [notes, setNotes] = useState<string>("")
  const [employeeSearch, setEmployeeSearch] = useState("")
  const [showDuplicateErrorModal, setShowDuplicateErrorModal] = useState(false)
  const [duplicateErrorMessage, setDuplicateErrorMessage] = useState("")
  const [deductionMode, setDeductionMode] = useState<'mandatory' | 'other'>('mandatory')

  const [entries, setEntries] = useState<{ key: string; typeId: string; notes: string; selectAll: boolean; employeeIds: string[] }[]>([])
  function addEntry() { setEntries(prev => [...prev, { key: crypto.randomUUID(), typeId: "", notes: "", selectAll: false, employeeIds: [] }]) }
  function updateEntry(key: string, patch: Partial<{ typeId: string; notes: string; selectAll: boolean; employeeIds: string[] }>) {
    setEntries(prev => prev.map(e => e.key === key ? { ...e, ...patch } : e))
  }
  function removeEntry(key: string) { setEntries(prev => prev.filter(e => e.key !== key)) }

  // Bulk / single delete
  const [selectedMandatoryTypesForDelete, setSelectedMandatoryTypesForDelete] = useState<string[]>([])
  const [selectedOtherTypes, setSelectedOtherTypes] = useState<string[]>([])
  const [isSelectAllMandatory, setIsSelectAllMandatory] = useState(false)
  const [isSelectAllOther, setIsSelectAllOther] = useState(false)
  const [showDeleteMandatoryModal, setShowDeleteMandatoryModal] = useState(false)
  const [showDeleteOtherModal, setShowDeleteOtherModal] = useState(false)
  const [selectedDeductions, setSelectedDeductions] = useState<string[]>([])
  const [isSelectAllDeductions, setIsSelectAllDeductions] = useState(false)
  const [showDeleteDeductionsModal, setShowDeleteDeductionsModal] = useState(false)
  const [showDeleteTypeModal, setShowDeleteTypeModal] = useState(false)
  const [typeToDelete, setTypeToDelete] = useState<string>('')
  const [showDeleteDeductionModal, setShowDeleteDeductionModal] = useState(false)
  const [deductionToDelete, setDeductionToDelete] = useState<string>('')

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return personnel
    const q = employeeSearch.toLowerCase()
    return personnel.filter(p => p.name?.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
  }, [personnel, employeeSearch])

  const filteredApplyPersonnel = useMemo(() => {
    if (!applyPersonnelSearch) return personnel
    const q = applyPersonnelSearch.toLowerCase()
    return personnel.filter(p => p.name?.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
  }, [personnel, applyPersonnelSearch])

  async function loadAll() {
    try {
      setLoading(true)
      const [t, d] = await Promise.all([
        fetch("/api/admin/deduction-types").then(r => r.json()),
        fetch("/api/admin/deductions").then(r => r.json()),
      ])
      setTypes(t)
      setDeductions(d)
    } catch { toast.error("Failed to load data") } finally { setLoading(false) }
  }

  async function syncMandatoryDeductions() {
    try {
      if (selectedMandatoryTypes.length === 0) { toast.error("Please select at least one mandatory deduction type"); return }
      if (!syncSelectAllPersonnel && syncSelectedPersonnel.length === 0) { toast.error("Please select personnel or enable 'Apply to All'"); return }
      const targetPersonnelIds = syncSelectAllPersonnel ? personnel.map(p => p.users_id) : syncSelectedPersonnel
      const duplicatesFound: { personnelName: string, deductionName: string }[] = []
      for (const typeId of selectedMandatoryTypes) {
        const deductionTypeName = types.find(t => t.deduction_types_id === typeId)?.name || 'Unknown Deduction'
        for (const userId of targetPersonnelIds) {
          const already = deductions.some(d => d.users.users_id === userId && d.deduction_types.deduction_types_id === typeId && d.deduction_types.isMandatory)
          if (already) duplicatesFound.push({ personnelName: personnel.find(p => p.users_id === userId)?.name || 'Unknown', deductionName: deductionTypeName })
        }
      }
      if (duplicatesFound.length > 0) {
        setDuplicateErrorMessage(`Cannot apply deductions. The following personnel already have one or more of the selected deductions: ${duplicatesFound.map(d => `${d.personnelName} (${d.deductionName})`).join(', ')}.`)
        setShowDuplicateErrorModal(true); return
      }
      toast.loading("Applying mandatory deductions...", { id: "sync-mandatory" })
      const res = await fetch("/api/admin/deductions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: selectedMandatoryTypes.map(typeId => ({ deduction_types_id: typeId, selectAll: syncSelectAllPersonnel, employees: syncSelectAllPersonnel ? [] : syncSelectedPersonnel, notes: "Mandatory deduction (bulk applied)" })) })
      })
      if (!res.ok) { const error = await res.json(); throw new Error(error.error || "Failed to apply deductions") }
      const result = await res.json()
      toast.success(`Successfully applied ${result.count} deductions`, { id: "sync-mandatory" })
      setSyncMandatoryOpen(false); setSelectedMandatoryTypes([]); setSyncSelectAllPersonnel(false); setSyncSelectedPersonnel([]); setSyncPersonnelSearch("")
      await loadAll()
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to apply mandatory deductions", { id: "sync-mandatory" }) }
  }

  function toggleMandatoryType(typeId: string) { setSelectedMandatoryTypes(prev => prev.includes(typeId) ? prev.filter(id => id !== typeId) : [...prev, typeId]) }
  function toggleSyncPersonnel(userId: string) { setSyncSelectedPersonnel(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]) }

  useEffect(() => { loadAll() }, [])
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
    if (deductionOpen || typeOpen || syncMandatoryOpen) loadPersonnel()
  }, [deductionOpen, typeOpen, syncMandatoryOpen])

  function toggleApplyPersonnel(id: string) { setApplySelectedPersonnel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) }

  async function applyMandatoryDeductions() {
    try {
      if (!applySelectAll && applySelectedPersonnel.length === 0) { toast.error("Please select at least one personnel or enable 'Apply to all'"); return }
      const mandatoryTypes = types.filter(t => t.isMandatory)
      if (mandatoryTypes.length === 0) { toast.error('No mandatory deductions found. Please create them first.'); return }
      const targetPersonnel: string[] = applySelectAll ? personnel.map(p => p.users_id) : applySelectedPersonnel
      const allEntries = mandatoryTypes.flatMap(t => targetPersonnel.map(userId => ({ deduction_types_id: t.deduction_types_id, notes: 'Mandatory payroll deduction', selectAll: false, employees: [userId] })))
      const res = await fetch("/api/admin/deductions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entries: allEntries }) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed') }
      toast.success(`Applied ${mandatoryTypes.length} mandatory deduction(s) to ${targetPersonnel.length} personnel`)
      setTypeOpen(false); setApplyExistingMode(false); setApplySelectAll(false); setApplySelectedPersonnel([]); setApplyPersonnelSearch(""); loadAll()
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to apply deductions") }
  }

  async function createType() {
    try {
      const res = await fetch("/api/admin/deduction-types", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTypeName, description: newTypeDesc, amount: newTypeCalculationType === 'FIXED' ? Number(newTypeAmount) : 0, calculationType: newTypeCalculationType, percentageValue: newTypeCalculationType === 'PERCENTAGE' ? Number(newTypePercentageValue) : undefined, isMandatory: true })
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || e.details || 'Failed to create type') }
      toast.success("Deduction type created"); setTypeOpen(false); setNewTypeName(""); setNewTypeDesc(""); setNewTypeAmount(""); setNewTypeCalculationType('FIXED'); setNewTypePercentageValue(""); setNewTypeIsMandatory(false); setApplyExistingMode(false); loadAll()
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to create type") }
  }

  function openEdit(t: DeductionType) {
    setEditTypeId(t.deduction_types_id); setEditTypeName(t.name); setEditTypeDesc(t.description || ""); setEditCalculationType(t.calculationType || 'FIXED'); setEditTypeAmount(t.amount?.toString?.() || ""); setEditPercentageValue(t.percentageValue != null ? String(t.percentageValue) : ""); setEditTypeIsMandatory(t.isMandatory); setEditOpen(true)
  }

  async function updateType() {
    try {
      const payload: any = { name: editTypeName, description: editTypeDesc }
      if (editCalculationType === 'FIXED') { payload.calculationType = 'FIXED'; payload.amount = Number(editTypeAmount || 0) }
      else { payload.calculationType = 'PERCENTAGE'; payload.percentageValue = Number(editPercentageValue || 0); payload.amount = 0 }
      const res = await fetch(`/api/admin/deduction-types/${editTypeId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      toast.success("Deduction type updated"); setEditOpen(false); loadAll()
    } catch { toast.error("Failed to update type") }
  }

  function promptDeleteType(id: string) { setTypeToDelete(id); setShowDeleteTypeModal(true) }
  async function deleteType() {
    setShowDeleteTypeModal(false)
    try { const res = await fetch(`/api/admin/deduction-types/${typeToDelete}`, { method: "DELETE" }); if (!res.ok) throw new Error(); toast.success("Deduction type deleted"); setSelectedMandatoryTypesForDelete(p => p.filter(id => id !== typeToDelete)); setTypeToDelete(''); loadAll() }
    catch { toast.error("Failed to delete type") }
  }

  function promptDeleteMandatory() { if (selectedMandatoryTypesForDelete.length === 0) { toast.error('Please select at least one mandatory deduction to delete'); return }; setShowDeleteMandatoryModal(true) }
  async function bulkDeleteMandatory() {
    setShowDeleteMandatoryModal(false)
    try {
      toast.loading('Deleting...', { id: 'bulk-delete-mandatory' })
      const results = await Promise.all(selectedMandatoryTypesForDelete.map(id => fetch(`/api/admin/deduction-types/${id}`, { method: "DELETE" })))
      if (results.some(r => !r.ok)) throw new Error()
      toast.success(`Deleted ${selectedMandatoryTypesForDelete.length} deduction(s)`, { id: 'bulk-delete-mandatory' }); setSelectedMandatoryTypesForDelete([]); setIsSelectAllMandatory(false); loadAll()
    } catch { toast.error('Failed to delete mandatory deductions', { id: 'bulk-delete-mandatory' }) }
  }

  function promptDeleteOther() { if (selectedOtherTypes.length === 0) { toast.error('Please select at least one deduction to delete'); return }; setShowDeleteOtherModal(true) }
  async function bulkDeleteOther() {
    setShowDeleteOtherModal(false)
    try {
      toast.loading('Deleting...', { id: 'bulk-delete-other' })
      const results = await Promise.all(selectedOtherTypes.map(id => fetch(`/api/admin/deduction-types/${id}`, { method: "DELETE" })))
      if (results.some(r => !r.ok)) throw new Error()
      toast.success(`Deleted ${selectedOtherTypes.length} deduction type(s)`, { id: 'bulk-delete-other' }); setSelectedOtherTypes([]); setIsSelectAllOther(false); loadAll()
    } catch (error) { toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'bulk-delete-other' }) }
  }

  function handleSelectAllMandatory() {
    const m = types.filter(t => t.isMandatory)
    if (isSelectAllMandatory) { setSelectedMandatoryTypesForDelete([]); setIsSelectAllMandatory(false) }
    else { setSelectedMandatoryTypesForDelete(m.map(t => t.deduction_types_id)); setIsSelectAllMandatory(true) }
  }
  function handleSelectAllOther() {
    const o = types.filter(t => !t.isMandatory)
    if (isSelectAllOther) { setSelectedOtherTypes([]); setIsSelectAllOther(false) }
    else { setSelectedOtherTypes(o.map(t => t.deduction_types_id)); setIsSelectAllOther(true) }
  }
  function toggleMandatoryTypeForDelete(id: string) {
    setSelectedMandatoryTypesForDelete(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      setIsSelectAllMandatory(next.length === types.filter(t => t.isMandatory).length); return next
    })
  }
  function toggleOtherType(id: string) {
    setSelectedOtherTypes(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      setIsSelectAllOther(next.length === types.filter(t => !t.isMandatory).length); return next
    })
  }

  function promptDeleteDeduction(id: string) { setDeductionToDelete(id); setShowDeleteDeductionModal(true) }
  async function deleteDeduction() {
    setShowDeleteDeductionModal(false)
    try { const res = await fetch(`/api/admin/deductions/${deductionToDelete}`, { method: "DELETE" }); if (!res.ok) throw new Error(); toast.success("Deduction removed"); setDeductionToDelete(''); loadAll() }
    catch { toast.error("Failed to remove deduction") }
  }

  function handleSelectAllDeductions() {
    if (isSelectAllDeductions) { setSelectedDeductions([]); setIsSelectAllDeductions(false) }
    else { setSelectedDeductions(deductions.map(d => d.deductions_id)); setIsSelectAllDeductions(true) }
  }
  function toggleDeduction(id: string) {
    setSelectedDeductions(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      setIsSelectAllDeductions(next.length === deductions.length); return next
    })
  }
  function promptDeleteDeductions() { if (selectedDeductions.length === 0) { toast.error('Please select at least one deduction to delete'); return }; setShowDeleteDeductionsModal(true) }
  async function bulkDeleteDeductions() {
    setShowDeleteDeductionsModal(false)
    try {
      toast.loading('Deleting...', { id: 'bd' })
      const results = await Promise.all(selectedDeductions.map(id => fetch(`/api/admin/deductions/${id}`, { method: "DELETE" })))
      if (results.some(r => !r.ok)) throw new Error()
      toast.success(`Deleted ${selectedDeductions.length} deduction(s)`, { id: 'bd' }); setSelectedDeductions([]); setIsSelectAllDeductions(false); loadAll()
    } catch (error) { toast.error(`Failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'bd' }) }
  }

  async function saveDeductions() {
    try {
      const allEntries: any[] = []
      if (!selectAll && selectedEmployeeIds.length === 0) { toast.error("Please select at least one employee or enable 'Select All'"); return }
      if (deductionMode === 'mandatory') {
        const mandatoryTypes = types.filter(t => t.isMandatory)
        if (mandatoryTypes.length === 0) { toast.error('No mandatory deductions found. Please create them first.'); return }
        mandatoryTypes.forEach(t => allEntries.push({ deduction_types_id: t.deduction_types_id, notes: 'Mandatory payroll deduction', selectAll, employees: selectedEmployeeIds }))
      } else {
        if (selectedTypeId) allEntries.push({ deduction_types_id: selectedTypeId, notes, selectAll, employees: selectedEmployeeIds })
        for (const entry of entries) {
          if (entry.typeId) {
            if (!entry.selectAll && entry.employeeIds.length === 0) { toast.error("Please select at least one employee for each deduction"); return }
            allEntries.push({ deduction_types_id: entry.typeId, notes: entry.notes, selectAll: entry.selectAll, employees: entry.employeeIds })
          }
        }
      }
      if (allEntries.length === 0) { toast.error("Please select at least one deduction type"); return }
      const duplicatesFound: { personnelName: string, deductionName: string }[] = []
      for (const entry of allEntries) {
        const deductionType = types.find(t => t.deduction_types_id === entry.deduction_types_id)
        if (deductionType?.isMandatory) {
          const targetIds = entry.selectAll ? personnel.map(p => p.users_id) : entry.employees
          for (const userId of targetIds) {
            const already = deductions.some(d => d.users.users_id === userId && d.deduction_types.deduction_types_id === entry.deduction_types_id && d.deduction_types.isMandatory)
            if (already) duplicatesFound.push({ personnelName: personnel.find(p => p.users_id === userId)?.name || 'Unknown', deductionName: deductionType.name })
          }
        }
      }
      if (duplicatesFound.length > 0) { setDuplicateErrorMessage(`Cannot apply deductions. Already have: ${duplicatesFound.map(d => `${d.personnelName} (${d.deductionName})`).join(', ')}.`); setShowDuplicateErrorModal(true); return }
      const payload = allEntries.length === 1 ? allEntries[0] : { entries: allEntries }
      const res = await fetch("/api/admin/deductions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed') }
      toast.success(`Deductions saved (${allEntries.length} entries)`); setDeductionOpen(false); setSelectedTypeId(""); setNotes(""); setSelectAll(false); setSelectedEmployeeIds([]); setEntries([]); loadAll()
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to save deductions") }
  }

  const calcBadge = (t: DeductionType) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${t.calculationType === 'PERCENTAGE' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
      {t.calculationType === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}
    </span>
  )

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
            <BadgeMinus className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Mandatory Deductions</h2>
            <p className="text-sm text-muted-foreground">Manage mandatory deductions for staff</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setSyncMandatoryOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow gap-2">
            <CheckCheck className="h-4 w-4" />Apply Mandatory Deductions
          </Button>
          <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white shadow gap-2"><Plus className="h-4 w-4" />Add Mandatory Deduction</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Mandatory Deduction</DialogTitle>
                <DialogDescription>Create a new mandatory deduction type</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2"><Label>Name</Label><Input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="e.g. PhilHealth" /></div>
                <div className="grid gap-2"><Label>Description</Label><Input value={newTypeDesc} onChange={e => setNewTypeDesc(e.target.value)} placeholder="Optional description" /></div>
                <div className="grid gap-2">
                  <Label>Calculation Type</Label>
                  <Select value={newTypeCalculationType} onValueChange={(v: 'FIXED' | 'PERCENTAGE') => setNewTypeCalculationType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="FIXED">Fixed Amount</SelectItem><SelectItem value="PERCENTAGE">Percentage of Salary</SelectItem></SelectContent>
                  </Select>
                </div>
                {newTypeCalculationType === 'FIXED'
                  ? <div className="grid gap-2"><Label>Amount (₱)</Label><Input type="number" value={newTypeAmount} onChange={e => setNewTypeAmount(e.target.value)} placeholder="0.00" /></div>
                  : <div className="grid gap-2"><Label>Percentage (%)</Label><Input type="number" value={newTypePercentageValue} onChange={e => setNewTypePercentageValue(e.target.value)} placeholder="e.g. 20" min="0" max="100" step="0.1" /><p className="text-xs text-muted-foreground">Will be calculated as {newTypePercentageValue || '0'}% of each employee's basic salary</p></div>
                }
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTypeOpen(false)}>Cancel</Button>
                <Button onClick={createType}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mandatory Types</CardTitle>
            <BadgeMinus className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{types.filter(t => t.isMandatory).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Required deduction types</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Types</CardTitle>
            <CheckCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{types.filter(t => t.isMandatory && t.isActive).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently active</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Applied Deductions</CardTitle>
            <BadgeMinus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{deductions.filter(d => d.deduction_types.isMandatory).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Applied to staff</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Mandatory Deduction Types Table ── */}
      <Card className="shadow-sm">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BadgeMinus className="h-4 w-4 text-blue-600" />Mandatory Deductions
            </CardTitle>
            {selectedMandatoryTypesForDelete.length > 0 && (
              <Button variant="destructive" size="sm" onClick={promptDeleteMandatory} className="h-8 gap-1 text-xs">
                <Trash2 className="h-3 w-3" />Delete Selected ({selectedMandatoryTypesForDelete.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-muted-foreground text-sm">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-12">
                      <Button variant="ghost" size="sm" onClick={handleSelectAllMandatory} className="h-8 w-8 p-0">
                        {isSelectAllMandatory ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Amount / %</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {types.filter(t => t.isMandatory).map(t => (
                    <TableRow key={t.deduction_types_id} className="hover:bg-muted/20">
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => toggleMandatoryTypeForDelete(t.deduction_types_id)} className="h-8 w-8 p-0">
                          {selectedMandatoryTypesForDelete.includes(t.deduction_types_id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{t.description || '—'}</TableCell>
                      <TableCell>{calcBadge(t)}</TableCell>
                      <TableCell className="font-semibold">
                        {t.calculationType === 'PERCENTAGE' ? `${t.percentageValue || 0}%` : `₱${t.amount.toLocaleString()}`}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground">⋯</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(t)} className="gap-2"><Pencil className="h-3 w-3" />Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive gap-2" onClick={() => promptDeleteType(t.deduction_types_id)}><Trash2 className="h-3 w-3" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {types.filter(t => t.isMandatory).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground text-sm">No mandatory deductions found. Click "Add Mandatory Deduction" to create them.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Current Deductions Table ── */}
      <Card className="shadow-sm">
        <CardHeader className="border-b bg-muted/30 px-5 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BadgeMinus className="h-4 w-4 text-green-600" />Current Deductions
              <Badge variant="secondary" className="ml-1">{deductions.length}</Badge>
            </CardTitle>
            {selectedDeductions.length > 0 && (
              <Button variant="destructive" size="sm" onClick={promptDeleteDeductions} className="h-8 gap-1 text-xs">
                <Trash2 className="h-3 w-3" />Delete Selected ({selectedDeductions.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-muted-foreground text-sm">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-12">
                      <Button variant="ghost" size="sm" onClick={handleSelectAllDeductions} className="h-8 w-8 p-0">
                        {isSelectAllDeductions ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                      </Button>
                    </TableHead>
                    <TableHead className="font-semibold">Staff</TableHead>
                    <TableHead className="font-semibold">Position</TableHead>
                    <TableHead className="font-semibold">Deduction</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Salary</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Notes</TableHead>
                    <TableHead className="font-semibold">Date Added</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductions.map(d => (
                    <TableRow key={d.deductions_id} className="hover:bg-muted/20">
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => toggleDeduction(d.deductions_id)} className="h-8 w-8 p-0">
                          {selectedDeductions.includes(d.deductions_id) ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{d.users.name || d.users.email}</TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{d.users.personnel_types?.name || '—'}</span></TableCell>
                      <TableCell>{d.deduction_types.name}</TableCell>
                      <TableCell>{calcBadge(d.deduction_types)}</TableCell>
                      <TableCell className="text-sm">
                        {d.users.personnel_types?.basicSalary ? `₱${d.users.personnel_types.basicSalary.toLocaleString()}` : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-red-600">₱{d.amount.toLocaleString()}</span>
                        {d.deduction_types.calculationType === 'PERCENTAGE' && d.deduction_types.percentageValue && d.users.personnel_types?.basicSalary && (
                          <div className="text-[10px] text-muted-foreground">{d.deduction_types.percentageValue}% of ₱{d.users.personnel_types.basicSalary.toLocaleString()}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.notes || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(d.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-muted-foreground">⋯</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="text-destructive gap-2" onClick={() => promptDeleteDeduction(d.deductions_id)}><Trash2 className="h-3 w-3" />Remove</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {deductions.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="py-10 text-center text-muted-foreground text-sm">No deductions found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Type Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Deduction Type</DialogTitle><DialogDescription>Update name, description and calculation.</DialogDescription></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2"><Label>Name</Label><Input value={editTypeName} onChange={e => setEditTypeName(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Description</Label><Input value={editTypeDesc} onChange={e => setEditTypeDesc(e.target.value)} /></div>
            <div className="grid gap-2">
              <Label>Calculation Type</Label>
              <Select value={editCalculationType} onValueChange={(v: 'FIXED' | 'PERCENTAGE') => setEditCalculationType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="FIXED">Fixed Amount</SelectItem><SelectItem value="PERCENTAGE">Percentage of Salary</SelectItem></SelectContent>
              </Select>
            </div>
            {editCalculationType === 'FIXED'
              ? <div className="grid gap-2"><Label>Amount (₱)</Label><Input type="number" value={editTypeAmount} onChange={e => setEditTypeAmount(e.target.value)} /></div>
              : <div className="grid gap-2"><Label>Percentage (%)</Label><Input type="number" value={editPercentageValue} onChange={e => setEditPercentageValue(e.target.value)} min="0" max="100" step="0.1" /><p className="text-xs text-muted-foreground">{editPercentageValue || '0'}% of each employee's basic salary</p></div>
            }
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={updateType}>Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmation Dialogs ── */}
      {[
        { open: showDeleteMandatoryModal, setOpen: setShowDeleteMandatoryModal, title: "Delete Mandatory Deductions?", desc: `Delete ${selectedMandatoryTypesForDelete.length} mandatory deduction(s)? Cannot be undone.`, onConfirm: bulkDeleteMandatory },
        { open: showDeleteDeductionsModal, setOpen: setShowDeleteDeductionsModal, title: "Delete Deductions?", desc: `Delete ${selectedDeductions.length} deduction(s)? Cannot be undone.`, onConfirm: bulkDeleteDeductions },
        { open: showDeleteOtherModal, setOpen: setShowDeleteOtherModal, title: "Delete Deduction Types?", desc: `Delete ${selectedOtherTypes.length} type(s)? Cannot be undone.`, onConfirm: bulkDeleteOther },
        { open: showDeleteTypeModal, setOpen: setShowDeleteTypeModal, title: "Delete Deduction Type?", desc: "Delete this deduction type? Cannot be undone.", onConfirm: deleteType },
        { open: showDeleteDeductionModal, setOpen: setShowDeleteDeductionModal, title: "Remove Deduction?", desc: "Remove this deduction from the user? Cannot be undone.", onConfirm: deleteDeduction, confirmLabel: "Remove" },
      ].map(({ open, setOpen, title, desc, onConfirm, confirmLabel }) => (
        <Dialog key={title} open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{desc}</DialogDescription></DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={onConfirm}><Trash2 className="h-4 w-4 mr-2" />{confirmLabel || 'Delete'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ))}

      {/* ── Apply Mandatory Modal ── */}
      <Dialog open={syncMandatoryOpen} onOpenChange={setSyncMandatoryOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Apply Mandatory Deductions</DialogTitle><DialogDescription>Select deduction types and staff to apply them to</DialogDescription></DialogHeader>
          <div className="grid gap-8 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Select Deduction Types</Label>
                {types.filter(t => t.isMandatory && t.isActive).length > 0 && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
                    const m = types.filter(t => t.isMandatory && t.isActive)
                    setSelectedMandatoryTypes(selectedMandatoryTypes.length === m.length ? [] : m.map(t => t.deduction_types_id))
                  }}>
                    {selectedMandatoryTypes.length === types.filter(t => t.isMandatory && t.isActive).length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>
              <div className="border rounded-lg p-3 max-h-[160px] overflow-y-auto space-y-1">
                {types.filter(t => t.isMandatory && t.isActive).length === 0
                  ? <p className="text-sm text-muted-foreground text-center py-4">No active mandatory deduction types found</p>
                  : types.filter(t => t.isMandatory && t.isActive).map(type => (
                    <div key={type.deduction_types_id} className="flex items-center gap-3 p-2 hover:bg-accent rounded-md cursor-pointer" onClick={() => toggleMandatoryType(type.deduction_types_id)}>
                      {selectedMandatoryTypes.includes(type.deduction_types_id) ? <CheckSquare className="h-5 w-5 text-primary" /> : <Square className="h-5 w-5 text-muted-foreground" />}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{type.name}</p>
                        <p className="text-xs text-muted-foreground">{type.calculationType === 'PERCENTAGE' ? `${type.percentageValue}% of salary` : `₱${type.amount.toLocaleString()}`}</p>
                      </div>
                    </div>
                  ))
                }
              </div>
              <p className="text-xs text-muted-foreground">{selectedMandatoryTypes.length} type(s) selected</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Select Staff</Label>
                <div className="flex items-center gap-2">
                  <Switch id="sync-select-all" checked={syncSelectAllPersonnel} onCheckedChange={setSyncSelectAllPersonnel} />
                  <Label htmlFor="sync-select-all" className="cursor-pointer text-xs">Apply to all active staff</Label>
                </div>
              </div>
              {!syncSelectAllPersonnel && (
                <>
                  <Input placeholder="Search staff..." value={syncPersonnelSearch} onChange={e => setSyncPersonnelSearch(e.target.value)} />
                  <div className="border rounded-lg max-h-[280px] overflow-y-auto">
                    <Command className="border-0">
                      <CommandList>
                        <CommandEmpty>No personnel found</CommandEmpty>
                        <CommandGroup>
                          {personnel.filter(p => p.name.toLowerCase().includes(syncPersonnelSearch.toLowerCase()) || p.email.toLowerCase().includes(syncPersonnelSearch.toLowerCase())).map(person => (
                            <CommandItem key={person.users_id} onSelect={() => toggleSyncPersonnel(person.users_id)} className="flex items-center gap-3 cursor-pointer px-4 py-2.5">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
                                {person.name?.[0]?.toUpperCase() || person.email[0].toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{person.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{person.email}</p>
                                {person.personnel_types?.department && <p className="text-xs text-muted-foreground">{person.personnel_types.department}</p>}
                              </div>
                              {syncSelectedPersonnel.includes(person.users_id) ? <CheckSquare className="h-5 w-5 text-primary shrink-0" /> : <Square className="h-5 w-5 text-muted-foreground shrink-0" />}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>
                  <p className="text-xs text-muted-foreground">{syncSelectedPersonnel.length} staff selected</p>
                </>
              )}
              {syncSelectAllPersonnel && (
                <div className="border rounded-lg p-4 bg-muted/30 text-sm text-center">
                  Will apply to <span className="font-semibold">{personnel.length}</span> active staff
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncMandatoryOpen(false)}>Cancel</Button>
            <Button onClick={syncMandatoryDeductions} disabled={selectedMandatoryTypes.length === 0 || (!syncSelectAllPersonnel && syncSelectedPersonnel.length === 0)} className="bg-blue-600 hover:bg-blue-700">
              <CheckCheck className="h-4 w-4 mr-2" />Apply Deductions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Duplicate Error ── */}
      <Dialog open={showDuplicateErrorModal} onOpenChange={setShowDuplicateErrorModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><AlertCircle className="h-5 w-5" />Cannot Apply Duplicate Mandatory Deduction</DialogTitle>
            <DialogDescription className="text-sm">{duplicateErrorMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter><Button onClick={() => setShowDuplicateErrorModal(false)}>OK</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
