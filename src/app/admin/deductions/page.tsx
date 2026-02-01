"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, CheckSquare, Square, Trash2, BadgeMinus, ChevronLeft, ChevronRight, RefreshCw, CheckCheck } from "lucide-react"
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
  personnel_types?: {
    name?: string | null
    department?: string | null
    basicSalary?: number
  } | null
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
    personnel_types?: {
      department?: string | null
      basicSalary?: number
    } | null
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

  // Mandatory Deductions dialog
  const [mandatoryOpen, setMandatoryOpen] = useState(false)
  const [philHealthAmount, setPhilHealthAmount] = useState("")
  const [sssAmount, setSssAmount] = useState("")
  const [pagIbigAmount, setPagIbigAmount] = useState("")
  const [birAmount, setBirAmount] = useState("")
  const [customMandatory, setCustomMandatory] = useState<{ key: string; name: string; amount: string; description: string }[]>([])

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

  // Deduction mode - always mandatory now
  const [deductionMode, setDeductionMode] = useState<'mandatory' | 'other'>('mandatory')

  // Multi-entry support (Add Another deduction)
  const [entries, setEntries] = useState<{ key: string; typeId: string; notes: string; selectAll: boolean; employeeIds: string[] }[]>([])
  function addEntry() {
    setEntries(prev => [...prev, { key: crypto.randomUUID(), typeId: "", notes: "", selectAll: false, employeeIds: [] }])
  }
  function updateEntry(key: string, patch: Partial<{ typeId: string; notes: string; selectAll: boolean; employeeIds: string[] }>) {
    setEntries(prev => prev.map(e => e.key === key ? { ...e, ...patch } : e))
  }
  function removeEntry(key: string) { setEntries(prev => prev.filter(e => e.key !== key)) }

  // Select all for bulk delete
  const [selectedMandatoryTypesForDelete, setSelectedMandatoryTypesForDelete] = useState<string[]>([])
  const [selectedOtherTypes, setSelectedOtherTypes] = useState<string[]>([])
  const [isSelectAllMandatory, setIsSelectAllMandatory] = useState(false)
  const [isSelectAllOther, setIsSelectAllOther] = useState(false)
  const [showDeleteMandatoryModal, setShowDeleteMandatoryModal] = useState(false)
  const [showDeleteOtherModal, setShowDeleteOtherModal] = useState(false)

  // Current Deductions bulk delete
  const [selectedDeductions, setSelectedDeductions] = useState<string[]>([])
  const [isSelectAllDeductions, setIsSelectAllDeductions] = useState(false)
  const [showDeleteDeductionsModal, setShowDeleteDeductionsModal] = useState(false)
  const [archivedDeductions, setArchivedDeductions] = useState<any[]>([])
  const [showArchivedDeductions, setShowArchivedDeductions] = useState(false)
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
    } catch (e) {
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  async function loadArchivedDeductions() {
    try {
      const res = await fetch("/api/admin/deductions?archived=true")
      if (res.ok) {
        const data = await res.json()
        setArchivedDeductions(data)
      }
    } catch (e) {
      console.error("Failed to load archived deductions:", e)
    }
  }

  async function syncMandatoryDeductions() {
    try {
      if (selectedMandatoryTypes.length === 0) {
        toast.error("Please select at least one mandatory deduction type")
        return
      }

      if (!syncSelectAllPersonnel && syncSelectedPersonnel.length === 0) {
        toast.error("Please select personnel or enable 'Apply to All Personnel'")
        return
      }

      // --- Check for duplicate mandatory deductions ---
      const targetPersonnelIds = syncSelectAllPersonnel ? personnel.map(p => p.users_id) : syncSelectedPersonnel
      const duplicatesFound: { personnelName: string, deductionName: string }[] = []

      for (const typeId of selectedMandatoryTypes) {
        const deductionTypeName = types.find(t => t.deduction_types_id === typeId)?.name || 'Unknown Deduction'
        for (const userId of targetPersonnelIds) {
          const alreadyHasDeduction = deductions.some(d =>
            d.users.users_id === userId &&
            d.deduction_types.deduction_types_id === typeId &&
            d.deduction_types.isMandatory
          )

          if (alreadyHasDeduction) {
            const personnelName = personnel.find(p => p.users_id === userId)?.name || 'Unknown Personnel'
            duplicatesFound.push({ personnelName, deductionName: deductionTypeName })
          }
        }
      }

      if (duplicatesFound.length > 0) {
        setDuplicateErrorMessage(`Cannot apply deductions. The following personnel already have one or more of the selected deductions: ${duplicatesFound.map(d => `${d.personnelName} (${d.deductionName})`).join(', ')}.`)
        setShowDuplicateErrorModal(true)
        return
      }
      // --- End duplicate check ---

      toast.loading("Applying mandatory deductions...", { id: "sync-mandatory" })

      // Create deduction entries for each selected type
      const entries = selectedMandatoryTypes.map(typeId => ({
        deduction_types_id: typeId,
        selectAll: syncSelectAllPersonnel,
        employees: syncSelectAllPersonnel ? [] : syncSelectedPersonnel,
        notes: "Mandatory deduction (bulk applied)"
      }))

      const res = await fetch("/api/admin/deductions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to apply deductions")
      }

      const result = await res.json()
      toast.success(`Successfully applied ${result.count} deductions`, { id: "sync-mandatory" })

      // Reset and close
      setSyncMandatoryOpen(false)
      setSelectedMandatoryTypes([])
      setSyncSelectAllPersonnel(false)
      setSyncSelectedPersonnel([])
      setSyncPersonnelSearch("")
      await loadAll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to apply mandatory deductions", { id: "sync-mandatory" })
    }
  }

  function toggleMandatoryType(typeId: string) {
    setSelectedMandatoryTypes(prev =>
      prev.includes(typeId) ? prev.filter(id => id !== typeId) : [...prev, typeId]
    )
  }

  function toggleSyncPersonnel(userId: string) {
    setSyncSelectedPersonnel(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (showArchivedDeductions) {
      loadArchivedDeductions()
    }
  }, [showArchivedDeductions])

  // Load personnel when Add Deduction opens (so list is populated)
  useEffect(() => {
    async function loadPersonnel() {
      try {
        const res = await fetch("/api/admin/users")
        if (!res.ok) return
        const data = await res.json()
        // Filter only personnel role and active users
        const personnelOnly = data.users?.filter((u: Personnel) => u.role === 'PERSONNEL') || []
        setPersonnel(personnelOnly)
      } catch { }
    }
    if (deductionOpen || typeOpen || syncMandatoryOpen) {
      loadPersonnel()
    }
  }, [deductionOpen, typeOpen, syncMandatoryOpen])

  function toggleApplyPersonnel(id: string) {
    setApplySelectedPersonnel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function applyMandatoryDeductions() {
    try {
      if (!applySelectAll && applySelectedPersonnel.length === 0) {
        toast.error("Please select at least one personnel or enable 'Apply to all'")
        return
      }

      const mandatoryTypes = types.filter(t => t.isMandatory)
      if (mandatoryTypes.length === 0) {
        toast.error('No mandatory deductions found. Please create them first.')
        return
      }

      let targetPersonnel: string[] = []
      if (applySelectAll) {
        targetPersonnel = personnel.map(p => p.users_id)
      } else {
        targetPersonnel = applySelectedPersonnel
      }

      const allEntries = mandatoryTypes.flatMap(t =>
        targetPersonnel.map(userId => ({
          deduction_types_id: t.deduction_types_id,
          notes: 'Mandatory payroll deduction',
          selectAll: false,
          employees: [userId]
        }))
      )

      const payload = { entries: allEntries }
      const res = await fetch("/api/admin/deductions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to apply deductions')
      }

      toast.success(`Applied ${mandatoryTypes.length} mandatory deduction(s) to ${targetPersonnel.length} personnel`)
      setTypeOpen(false)
      setApplyExistingMode(false)
      setApplySelectAll(false)
      setApplySelectedPersonnel([])
      setApplyPersonnelSearch("")
      loadAll()
    } catch (error) {
      console.error('Error applying mandatory deductions:', error)
      toast.error(error instanceof Error ? error.message : "Failed to apply deductions")
    }
  }

  async function createType() {
    try {
      const res = await fetch("/api/admin/deduction-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTypeName,
          description: newTypeDesc,
          amount: newTypeCalculationType === 'FIXED' ? Number(newTypeAmount) : 0,
          calculationType: newTypeCalculationType,
          percentageValue: newTypeCalculationType === 'PERCENTAGE' ? Number(newTypePercentageValue) : undefined,
          isMandatory: true
        })
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || errorData.details || 'Failed to create type')
      }
      toast.success("Deduction type created")
      setTypeOpen(false)
      setNewTypeName("")
      setNewTypeDesc("")
      setNewTypeAmount("")
      setNewTypeCalculationType('FIXED')
      setNewTypePercentageValue("")
      setNewTypeIsMandatory(false)
      setApplyExistingMode(false)
      loadAll()
    } catch (error) {
      console.error('Error creating deduction type:', error)
      toast.error(error instanceof Error ? error.message : "Failed to create type")
    }
  }

  function openEdit(t: DeductionType) {
    setEditTypeId(t.deduction_types_id)
    setEditTypeName(t.name)
    setEditTypeDesc(t.description || "")
    setEditCalculationType(t.calculationType || 'FIXED')
    setEditTypeAmount(t.amount?.toString?.() || "")
    setEditPercentageValue(t.percentageValue != null ? String(t.percentageValue) : "")
    setEditTypeIsMandatory(t.isMandatory)
    setEditOpen(true)
  }

  async function updateType() {
    try {
      const payload: any = {
        name: editTypeName,
        description: editTypeDesc,
      }

      if (editCalculationType === 'FIXED') {
        payload.calculationType = 'FIXED'
        payload.amount = Number(editTypeAmount || 0)
        // Explicitly clear percentage on backend
        payload.percentageValue = undefined
      } else {
        payload.calculationType = 'PERCENTAGE'
        payload.percentageValue = Number(editPercentageValue || 0)
        // Amount is derived for percentage-based types
        payload.amount = 0
      }

      const res = await fetch(`/api/admin/deduction-types/${editTypeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error()
      toast.success("Deduction type updated")
      setEditOpen(false)
      loadAll()
    } catch {
      toast.error("Failed to update type")
    }
  }

  function promptDeleteType(id: string) {
    setTypeToDelete(id)
    setShowDeleteTypeModal(true)
  }

  async function deleteType() {
    setShowDeleteTypeModal(false)
    const id = typeToDelete
    try {
      const res = await fetch(`/api/admin/deduction-types/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Deduction type deleted")
      setSelectedMandatoryTypes(prev => prev.filter(typeId => typeId !== id))
      setSelectedOtherTypes(prev => prev.filter(typeId => typeId !== id))
      setTypeToDelete('')
      loadAll()
    } catch {
      toast.error("Failed to delete type")
    }
  }

  // Trigger bulk delete mandatory confirmation modal
  function promptDeleteMandatory() {
    if (selectedMandatoryTypesForDelete.length === 0) {
      toast.error('Please select at least one mandatory deduction to delete')
      return
    }
    setShowDeleteMandatoryModal(true)
  }

  // Bulk delete mandatory deductions (after confirmation)
  async function bulkDeleteMandatory() {
    setShowDeleteMandatoryModal(false)
    try {
      toast.loading('Deleting mandatory deductions...', { id: 'bulk-delete-mandatory' })
      const deletePromises = selectedMandatoryTypesForDelete.map(id =>
        fetch(`/api/admin/deduction-types/${id}`, { method: "DELETE" })
      )
      const results = await Promise.all(deletePromises)
      const failed = results.filter(r => !r.ok)
      if (failed.length > 0) throw new Error(`Failed to delete ${failed.length} deduction(s)`)

      toast.success(`Deleted ${selectedMandatoryTypesForDelete.length} mandatory deduction(s)`, { id: 'bulk-delete-mandatory' })
      setSelectedMandatoryTypesForDelete([])
      setIsSelectAllMandatory(false)
      loadAll()
    } catch (error) {
      toast.error('Failed to delete mandatory deductions', { id: 'bulk-delete-mandatory' })
    }
  }

  // Trigger bulk delete other confirmation modal
  function promptDeleteOther() {
    if (selectedOtherTypes.length === 0) {
      toast.error('Please select at least one deduction to delete')
      return
    }
    setShowDeleteOtherModal(true)
  }

  // Bulk delete other deductions (after confirmation)
  async function bulkDeleteOther() {
    setShowDeleteOtherModal(false)
    try {
      toast.loading('Deleting deduction types...', { id: 'bulk-delete-other' })
      const deletePromises = selectedOtherTypes.map(id =>
        fetch(`/api/admin/deduction-types/${id}`, { method: "DELETE" })
      )
      const results = await Promise.all(deletePromises)
      const failed = results.filter(r => !r.ok)
      if (failed.length > 0) throw new Error(`Failed to delete ${failed.length} deduction(s)`)

      toast.success(`Deleted ${selectedOtherTypes.length} deduction type(s)`, { id: 'bulk-delete-other' })
      setSelectedOtherTypes([])
      setIsSelectAllOther(false)
      loadAll()
    } catch (error) {
      toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'bulk-delete-other' })
    }
  }

  // Toggle select all mandatory
  function handleSelectAllMandatory() {
    const mandatoryTypes = types.filter(t => t.isMandatory)
    if (isSelectAllMandatory) {
      setSelectedMandatoryTypesForDelete([])
      setIsSelectAllMandatory(false)
    } else {
      setSelectedMandatoryTypesForDelete(mandatoryTypes.map(t => t.deduction_types_id))
      setIsSelectAllMandatory(true)
    }
  }

  // Toggle select all other
  function handleSelectAllOther() {
    const otherTypes = types.filter(t => !t.isMandatory)
    if (isSelectAllOther) {
      setSelectedOtherTypes([])
      setIsSelectAllOther(false)
    } else {
      setSelectedOtherTypes(otherTypes.map(t => t.deduction_types_id))
      setIsSelectAllOther(true)
    }
  }

  // Toggle individual mandatory type for delete
  function toggleMandatoryTypeForDelete(id: string) {
    setSelectedMandatoryTypesForDelete(prev => {
      if (prev.includes(id)) {
        const newSelection = prev.filter(typeId => typeId !== id)
        const mandatoryTypes = types.filter(t => t.isMandatory)
        setIsSelectAllMandatory(newSelection.length === mandatoryTypes.length)
        return newSelection
      } else {
        const newSelection = [...prev, id]
        const mandatoryTypes = types.filter(t => t.isMandatory)
        setIsSelectAllMandatory(newSelection.length === mandatoryTypes.length)
        return newSelection
      }
    })
  }

  // Toggle individual other type
  function toggleOtherType(id: string) {
    setSelectedOtherTypes(prev => {
      if (prev.includes(id)) {
        const newSelection = prev.filter(typeId => typeId !== id)
        const otherTypes = types.filter(t => !t.isMandatory)
        setIsSelectAllOther(newSelection.length === otherTypes.length)
        return newSelection
      } else {
        const newSelection = [...prev, id]
        const otherTypes = types.filter(t => !t.isMandatory)
        setIsSelectAllOther(newSelection.length === otherTypes.length)
        return newSelection
      }
    })
  }

  function promptDeleteDeduction(id: string) {
    setDeductionToDelete(id)
    setShowDeleteDeductionModal(true)
  }

  async function deleteDeduction() {
    setShowDeleteDeductionModal(false)
    const id = deductionToDelete
    try {
      const res = await fetch(`/api/admin/deductions/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Deduction removed")
      setDeductionToDelete('')
      loadAll()
    } catch {
      toast.error("Failed to remove deduction")
    }
  }

  // Toggle select all current deductions
  function handleSelectAllDeductions() {
    if (isSelectAllDeductions) {
      setSelectedDeductions([])
      setIsSelectAllDeductions(false)
    } else {
      setSelectedDeductions(deductions.map(d => d.deductions_id))
      setIsSelectAllDeductions(true)
    }
  }

  // Toggle individual deduction
  function toggleDeduction(id: string) {
    setSelectedDeductions(prev => {
      if (prev.includes(id)) {
        const newSelection = prev.filter(deductionId => deductionId !== id)
        setIsSelectAllDeductions(newSelection.length === deductions.length)
        return newSelection
      } else {
        const newSelection = [...prev, id]
        setIsSelectAllDeductions(newSelection.length === deductions.length)
        return newSelection
      }
    })
  }

  // Prompt bulk delete deductions
  function promptDeleteDeductions() {
    if (selectedDeductions.length === 0) {
      toast.error('Please select at least one deduction to delete')
      return
    }
    setShowDeleteDeductionsModal(true)
  }

  // Bulk delete deductions
  async function bulkDeleteDeductions() {
    setShowDeleteDeductionsModal(false)
    try {
      toast.loading('Deleting deductions...', { id: 'bulk-delete-deductions' })
      const deletePromises = selectedDeductions.map(id =>
        fetch(`/api/admin/deductions/${id}`, { method: "DELETE" })
      )
      const results = await Promise.all(deletePromises)
      const failed = results.filter(r => !r.ok)
      if (failed.length > 0) throw new Error(`Failed to delete ${failed.length} deduction(s)`)

      toast.success(`Deleted ${selectedDeductions.length} deduction(s)`, { id: 'bulk-delete-deductions' })
      setSelectedDeductions([])
      setIsSelectAllDeductions(false)
      loadAll()
    } catch (error) {
      toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'bulk-delete-deductions' })
    }
  }

  function toggleEmployee(id: string) {
    setSelectedEmployeeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function saveMandatoryDeductions() {
    try {
      const mandatory = [
        { name: 'PhilHealth', description: 'Philippine Health Insurance Corporation', amount: Number(philHealthAmount) || 0, isMandatory: true },
        { name: 'SSS', description: 'Social Security System', amount: Number(sssAmount) || 0, isMandatory: true },
        { name: 'Pag-IBIG', description: 'Home Development Mutual Fund', amount: Number(pagIbigAmount) || 0, isMandatory: true },
        { name: 'BIR', description: 'Bureau of Internal Revenue', amount: Number(birAmount) || 0, isMandatory: true },
        ...customMandatory.filter(c => c.name.trim()).map(c => ({
          name: c.name,
          description: c.description || 'Mandatory deduction',
          amount: Number(c.amount) || 0,
          isMandatory: true
        }))
      ]
      let addedCount = 0
      let skippedCount = 0
      let errorMessages: string[] = []

      for (const t of mandatory) {
        // Check if deduction already exists
        const existing = types.find(type => type.name === t.name)

        if (existing) {
          // Skip if already exists
          skippedCount++
        } else {
          // Create new
          const res = await fetch('/api/admin/deduction-types', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(t)
          })
          if (res.ok) {
            addedCount++
          } else {
            const errorData = await res.json()
            errorMessages.push(`${t.name}: ${errorData.error || 'Failed'}`)
          }
        }
      }

      if (addedCount > 0) {
        toast.success(`${addedCount} mandatory deduction(s) added${skippedCount > 0 ? `, ${skippedCount} already exist` : ''}`)
      } else if (skippedCount > 0) {
        toast.error('All selected deductions already exist')
      } else if (errorMessages.length > 0) {
        toast.error(`Failed: ${errorMessages.join(', ')}`)
      }

      setMandatoryOpen(false)
      setPhilHealthAmount("")
      setSssAmount("")
      setPagIbigAmount("")
      setBirAmount("")
      setCustomMandatory([])
      loadAll()
    } catch (error) {
      console.error('Error saving mandatory deductions:', error)
      toast.error('Failed to save mandatory deductions')
    }
  }


  async function saveDeductions() {
    try {
      // Build entries array
      const allEntries = []

      // Validate that either selectAll is true or employees are selected
      if (!selectAll && selectedEmployeeIds.length === 0) {
        toast.error("Please select at least one employee or enable 'Select All'")
        return
      }

      // If mandatory mode, apply all mandatory deductions
      if (deductionMode === 'mandatory') {
        const mandatoryTypes = types.filter(t => t.isMandatory)
        if (mandatoryTypes.length === 0) {
          toast.error('No mandatory deductions found. Please create them first.')
          return
        }
        mandatoryTypes.forEach(t => {
          allEntries.push({
            deduction_types_id: t.deduction_types_id,
            notes: 'Mandatory payroll deduction',
            selectAll: selectAll,
            employees: selectedEmployeeIds
          })
        })
      } else {
        // Other mode - add selected deduction
        if (selectedTypeId) {
          allEntries.push({
            deduction_types_id: selectedTypeId,
            notes: notes,
            selectAll: selectAll,
            employees: selectedEmployeeIds
          })
        }

        // Add additional entries
        if (entries.length > 0) {
          for (const entry of entries) {
            if (entry.typeId) {
              if (!entry.selectAll && entry.employeeIds.length === 0) {
                toast.error("Please select at least one employee for each deduction or enable 'Select All'")
                return
              }
              allEntries.push({
                deduction_types_id: entry.typeId,
                notes: entry.notes,
                selectAll: entry.selectAll,
                employees: entry.employeeIds
              })
            }
          }
        }
      }

      // Validate that we have at least one entry
      if (allEntries.length === 0) {
        toast.error("Please select at least one deduction type")
        return
      }

      // --- Check for duplicate mandatory deductions ---
      const duplicatesFound: { personnelName: string, deductionName: string }[] = []

      for (const entry of allEntries) {
        const deductionType = types.find(t => t.deduction_types_id === entry.deduction_types_id)
        if (deductionType?.isMandatory) {
          const targetIds = entry.selectAll ? personnel.map(p => p.users_id) : entry.employees

          for (const userId of targetIds) {
            const alreadyHasDeduction = deductions.some(d =>
              d.users.users_id === userId &&
              d.deduction_types.deduction_types_id === entry.deduction_types_id &&
              d.deduction_types.isMandatory
            )

            if (alreadyHasDeduction) {
              const personnelName = personnel.find(p => p.users_id === userId)?.name || 'Unknown Personnel'
              duplicatesFound.push({ personnelName, deductionName: deductionType.name })
            }
          }
        }
      }

      if (duplicatesFound.length > 0) {
        setDuplicateErrorMessage(`Cannot apply deductions. The following personnel already have one or more of the selected deductions: ${duplicatesFound.map(d => `${d.personnelName} (${d.deductionName})`).join(', ')}.`)
        setShowDuplicateErrorModal(true)
        return
      }
      // --- End duplicate check ---

      // Create payload
      const payload = allEntries.length === 1
        ? allEntries[0]
        : { entries: allEntries }

      console.log('Saving deductions with payload:', payload)

      const res = await fetch("/api/admin/deductions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to save deductions')
      }
      toast.success(`Deductions saved successfully (${allEntries.length} entries)`)
      setDeductionOpen(false)
      setSelectedTypeId("")
      setNotes("")
      setSelectAll(false)
      setSelectedEmployeeIds([])
      setEntries([])
      loadAll()
    } catch (error) {
      console.error('Error saving deductions:', error)
      toast.error(error instanceof Error ? error.message : "Failed to save deductions")
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between rounded-md px-4 py-3 bg-transparent dark:bg-sidebar text-foreground dark:text-sidebar-foreground">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BadgeMinus className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            Mandatory Deductions
          </h2>
          <p className="text-muted-foreground">Manage mandatory deductions for staff</p>
        </div>
        <div className="flex gap-2">
          <>
            <Button
              onClick={() => setSyncMandatoryOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Apply Mandatory Deductions
            </Button>
            <Dialog open={typeOpen} onOpenChange={setTypeOpen}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white"><Plus className="h-4 w-4 mr-2" />Add Mandatory Deduction</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Mandatory Deduction</DialogTitle>
                  <DialogDescription>
                    Create a new mandatory deduction type
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label>Name</Label>
                    <Input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="e.g. Late Penalty or PhilHealth" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Input value={newTypeDesc} onChange={e => setNewTypeDesc(e.target.value)} placeholder="Optional description" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Calculation Type</Label>
                    <Select value={newTypeCalculationType} onValueChange={(val: 'FIXED' | 'PERCENTAGE') => setNewTypeCalculationType(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXED">Fixed Amount</SelectItem>
                        <SelectItem value="PERCENTAGE">Percentage of Salary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newTypeCalculationType === 'FIXED' ? (
                    <div className="grid gap-2">
                      <Label>Amount (₱)</Label>
                      <Input type="number" value={newTypeAmount} onChange={e => setNewTypeAmount(e.target.value)} placeholder="0.00" />
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <Label>Percentage (%)</Label>
                      <Input
                        type="number"
                        value={newTypePercentageValue}
                        onChange={e => setNewTypePercentageValue(e.target.value)}
                        placeholder="e.g., 20 for 20%"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <p className="text-xs text-muted-foreground">
                        Will be calculated as {newTypePercentageValue || '0'}% of each employee's basic salary
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setTypeOpen(false)
                  }}>Cancel</Button>
                  <Button onClick={createType}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mandatory Deduction Types</CardTitle>
            <BadgeMinus className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{types.filter(t => t.isMandatory).length}</div>
            <p className="text-xs text-muted-foreground">Required deduction types</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Mandatory Types</CardTitle>
            <CheckCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{types.filter(t => t.isMandatory && t.isActive).length}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mandatory Deductions</CardTitle>
            <BadgeMinus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deductions.filter(d => d.deduction_types.isMandatory).length}</div>
            <p className="text-xs text-muted-foreground">Applied to staff</p>
          </CardContent>
        </Card>
      </div>

      {/* Mandatory Deductions Card */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <BadgeMinus className="h-5 w-5 text-blue-600" />
              <span>Mandatory Deductions</span>
            </CardTitle>
            {selectedMandatoryTypesForDelete.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={promptDeleteMandatory}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedMandatoryTypesForDelete.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-6 text-center">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-32">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAllMandatory}
                        className="h-8 w-8 p-0"
                      >
                        {isSelectAllMandatory ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                      <span className="text-sm font-medium">Select All</span>
                    </div>
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount/Percentage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.filter(t => t.isMandatory).map(t => (
                  <TableRow key={t.deduction_types_id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMandatoryTypeForDelete(t.deduction_types_id)}
                        className="h-8 w-8 p-0"
                      >
                        {selectedMandatoryTypesForDelete.includes(t.deduction_types_id) ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.description || '-'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${t.calculationType === 'PERCENTAGE'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                        {t.calculationType === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {t.calculationType === 'PERCENTAGE'
                        ? `${t.percentageValue || 0}%`
                        : `₱${t.amount.toLocaleString()}`
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">⋮</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(t)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => promptDeleteType(t.deduction_types_id)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {types.filter(t => t.isMandatory).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No mandatory deductions found. Click "Add Mandatory Deductions" to create them.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <BadgeMinus className="h-5 w-5 text-green-600" />
              <span>Current Deductions</span>
            </CardTitle>
            {selectedDeductions.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={promptDeleteDeductions}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedDeductions.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-6 text-center">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-32">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAllDeductions}
                        className="h-8 w-8 p-0"
                      >
                        {isSelectAllDeductions ? (
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
                  <TableHead>Deduction Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Salary</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deductions.map(d => (
                  <TableRow key={d.deductions_id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDeduction(d.deductions_id)}
                        className="h-8 w-8 p-0"
                      >
                        {selectedDeductions.includes(d.deductions_id) ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>{d.users.name || d.users.email}</TableCell>
                    <TableCell>
                      <div className="max-w-[150px] truncate text-muted-foreground text-xs">
                        {d.users.personnel_types?.department || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[150px] truncate text-muted-foreground text-xs">
                        {d.users.personnel_types?.name || '-'}
                      </div>
                    </TableCell>
                    <TableCell>{d.deduction_types.name}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${d.deduction_types.calculationType === 'PERCENTAGE'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                        {d.deduction_types.calculationType === 'PERCENTAGE' ? 'Percentage' : 'Fixed'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {d.users.personnel_types?.basicSalary
                          ? `₱${d.users.personnel_types.basicSalary.toLocaleString()}`
                          : <span className="text-muted-foreground">No salary</span>
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">₱{d.amount.toLocaleString()}</div>
                      {d.deduction_types.calculationType === 'PERCENTAGE' && d.deduction_types.percentageValue && d.users.personnel_types?.basicSalary ? (
                        <div className="text-xs text-muted-foreground">
                          {d.deduction_types.percentageValue}% of ₱{d.users.personnel_types.basicSalary.toLocaleString()}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>{d.notes || '-'}</TableCell>
                    <TableCell>{new Date(d.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">⋮</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive" onClick={() => promptDeleteDeduction(d.deductions_id)}>Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {deductions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No deductions found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Type Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Deduction Type</DialogTitle>
            <DialogDescription>Update name, description and calculation.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={editTypeName} onChange={e => setEditTypeName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input value={editTypeDesc} onChange={e => setEditTypeDesc(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Calculation Type</Label>
              <Select value={editCalculationType} onValueChange={(val: 'FIXED' | 'PERCENTAGE') => setEditCalculationType(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed Amount</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage of Salary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editCalculationType === 'FIXED' ? (
              <div className="grid gap-2">
                <Label>Amount (₱)</Label>
                <Input type="number" value={editTypeAmount} onChange={e => setEditTypeAmount(e.target.value)} />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Percentage (%)</Label>
                <Input
                  type="number"
                  value={editPercentageValue}
                  onChange={e => setEditPercentageValue(e.target.value)}
                  placeholder="e.g., 20 for 20%"
                  min="0"
                  max="100"
                  step="0.1"
                />
                <p className="text-xs text-muted-foreground">
                  Will be calculated as {editPercentageValue || '0'}% of each employee's basic salary
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={updateType}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Mandatory Confirmation Modal */}
      <Dialog open={showDeleteMandatoryModal} onOpenChange={setShowDeleteMandatoryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Mandatory Deductions?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedMandatoryTypesForDelete.length} mandatory deduction(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteMandatoryModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={bulkDeleteMandatory}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Current Deductions Confirmation Modal */}
      <Dialog open={showDeleteDeductionsModal} onOpenChange={setShowDeleteDeductionsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Deductions?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedDeductions.length} deduction(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDeductionsModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={bulkDeleteDeductions}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Other Deductions Confirmation Modal */}
      <Dialog open={showDeleteOtherModal} onOpenChange={setShowDeleteOtherModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Deduction Types?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedOtherTypes.length} deduction type(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteOtherModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={bulkDeleteOther}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Type Confirmation Modal */}
      <Dialog open={showDeleteTypeModal} onOpenChange={setShowDeleteTypeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Deduction Type?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this deduction type? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteTypeModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteType}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Single Deduction Confirmation Modal */}
      <Dialog open={showDeleteDeductionModal} onOpenChange={setShowDeleteDeductionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Deduction?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this deduction from the user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDeductionModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteDeduction}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Mandatory Deductions Modal */}
      <Dialog open={syncMandatoryOpen} onOpenChange={setSyncMandatoryOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply Mandatory Deductions</DialogTitle>
            <DialogDescription>
              Select mandatory deduction types and personnel to apply them to
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-8 py-4">
            {/* Select Mandatory Deduction Types */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Select Deduction Types</Label>
                {types.filter(t => t.isMandatory && t.isActive).length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const mandatoryTypes = types.filter(t => t.isMandatory && t.isActive)
                      if (selectedMandatoryTypes.length === mandatoryTypes.length) {
                        setSelectedMandatoryTypes([])
                      } else {
                        setSelectedMandatoryTypes(mandatoryTypes.map(t => t.deduction_types_id))
                      }
                    }}
                  >
                    {selectedMandatoryTypes.length === types.filter(t => t.isMandatory && t.isActive).length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>
              <div className="border rounded-md p-4 max-h-[160px] overflow-y-auto space-y-2">
                {types.filter(t => t.isMandatory && t.isActive).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No active mandatory deduction types found
                  </p>
                ) : (
                  types.filter(t => t.isMandatory && t.isActive).map(type => (
                    <div key={type.deduction_types_id} className="flex items-center gap-3 p-2 hover:bg-accent rounded-md">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMandatoryType(type.deduction_types_id)}
                        className="h-8 w-8 p-0"
                      >
                        {selectedMandatoryTypes.includes(type.deduction_types_id) ? (
                          <CheckSquare className="h-5 w-5 text-primary" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <p className="font-medium">{type.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {type.calculationType === 'PERCENTAGE'
                            ? `${type.percentageValue}% of salary`
                            : `₱${type.amount.toLocaleString()}`
                          }
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedMandatoryTypes.length} deduction type(s) selected
              </p>
            </div>

            {/* Select Personnel */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Select Personnel</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    id="sync-select-all"
                    checked={syncSelectAllPersonnel}
                    onCheckedChange={setSyncSelectAllPersonnel}
                  />
                  <Label htmlFor="sync-select-all" className="cursor-pointer text-sm">
                    Apply to All Personnel
                  </Label>
                </div>
              </div>

              {!syncSelectAllPersonnel && (
                <>
                  <Input
                    placeholder="Search staff..."
                    value={syncPersonnelSearch}
                    onChange={(e) => setSyncPersonnelSearch(e.target.value)}
                  />
                  <div className="border rounded-md p-4 max-h-[280px] overflow-y-auto">
                    <Command className="border-0">
                      <CommandList>
                        <CommandEmpty>No personnel found</CommandEmpty>
                        <CommandGroup>
                          {personnel
                            .filter(p =>
                              p.name.toLowerCase().includes(syncPersonnelSearch.toLowerCase()) ||
                              p.email.toLowerCase().includes(syncPersonnelSearch.toLowerCase())
                            )
                            .map(person => (
                              <CommandItem
                                key={person.users_id}
                                onSelect={() => toggleSyncPersonnel(person.users_id)}
                                className="flex items-center gap-3 cursor-pointer aria-selected:bg-accent hover:bg-accent data-[selected=true]:bg-accent"
                              >
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleSyncPersonnel(person.users_id)
                                  }}
                                  className="h-8 w-8 p-0 flex-shrink-0"
                                >
                                  {syncSelectedPersonnel.includes(person.users_id) ? (
                                    <CheckSquare className="h-5 w-5 text-primary" />
                                  ) : (
                                    <Square className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </Button>
                                <div className="flex-1">
                                  <p className="font-medium">{person.name}</p>
                                  <p className="text-sm text-muted-foreground">{person.email}</p>
                                  {person.personnel_types?.department && (
                                    <p className="text-xs text-muted-foreground">{person.personnel_types.department}</p>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {syncSelectedPersonnel.length} personnel selected
                  </p>
                </>
              )}

              {syncSelectAllPersonnel && (
                <div className="border rounded-md p-4 bg-muted">
                  <p className="text-sm text-center">
                    Will apply to <span className="font-semibold">{personnel.length}</span> active personnel
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncMandatoryOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={syncMandatoryDeductions}
              disabled={selectedMandatoryTypes.length === 0 || (!syncSelectAllPersonnel && syncSelectedPersonnel.length === 0)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Apply Deductions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Mandatory Deduction Error Modal */}
      <Dialog open={showDuplicateErrorModal} onOpenChange={setShowDuplicateErrorModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Apply Duplicate Mandatory Deduction</DialogTitle>
            <DialogDescription className="text-base">
              {duplicateErrorMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowDuplicateErrorModal(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


