"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Eye, UserCheck, Home, Banknote } from "lucide-react"
import { toast } from "react-hot-toast"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { SSRSafe } from "@/components/ssr-safe"
import { getPersonnelTypes, createPersonnelType, updatePersonnelType, deletePersonnelType, type PersonnelType as ServerPersonnelType } from "@/lib/actions/personnel"

type PersonnelType = {
    personnel_types_id: string
    name: string
    type?: string | null
    department?: string | null
    basicSalary: number
    isActive: boolean
    createdAt: string
}

function parseSalary(input: string): number {
    const s = input.trim().toLowerCase().replace(/[\s,]/g, "")
    const m = s.match(/^(\d*\.?\d+)([kmb])?$/)
    if (!m) return Number(s) || 0
    const v = Number(m[1])
    const suf = m[2]
    if (suf === 'k') return v * 1_000
    if (suf === 'm') return v * 1_000_000
    if (suf === 'b') return v * 1_000_000_000
    return v
}

export default function PersonnelTypesPage() {
    const [types, setTypes] = useState<PersonnelType[]>([])
    const [loading, setLoading] = useState(true)
    const [open, setOpen] = useState(false)
    const [editOpen, setEditOpen] = useState(false)
    const [viewOpen, setViewOpen] = useState(false)
    const [selectedType, setSelectedType] = useState<PersonnelType | null>(null)
    const [name, setName] = useState("")
    const [personnelType, setPersonnelType] = useState("NON_TEACHING")
    const [office, setOffice] = useState("")
    const [positionName, setPositionName] = useState("")
    const [department, setDepartment] = useState("")
    const [basicSalaryInput, setBasicSalaryInput] = useState("")
    const [isActive, setIsActive] = useState(true)
    const [attendanceSettings, setAttendanceSettings] = useState<any>(null)
    const [workingDays, setWorkingDays] = useState(22) // Default fallback
    const [categoryFilter, setCategoryFilter] = useState<string>("all")
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [typeToDelete, setTypeToDelete] = useState<PersonnelType | null>(null)
    const [confirmCreateOpen, setConfirmCreateOpen] = useState(false)

    const basic = useMemo(() => parseSalary(basicSalaryInput), [basicSalaryInput])
    const semiMonthly = useMemo(() => basic / 2, [basic])
    const weekly = useMemo(() => basic / 4, [basic])
    const daily = useMemo(() => basic / workingDays, [basic, workingDays]) // Daily based on actual working days in period
    const hourly = useMemo(() => daily / 8, [daily])
    const min = useMemo(() => hourly / 60, [hourly])
    const sec = useMemo(() => min / 60, [min])

    // Filter positions by category
    const filteredTypes = useMemo(() => {
        if (categoryFilter === "all") return types
        return types.filter(t => {
            if (categoryFilter === "Barangay Staff" && t.department === "Barangay Personnel") return true
            return t.department === categoryFilter
        })
    }, [types, categoryFilter])

    async function load() {
        try {
            setLoading(true)

            // Load positions
            const result = await getPersonnelTypes()

            if (!result.success) {
                toast.error(result.error || 'Failed to load types')
                return
            }

            // Transform server data to match local type
            const transformedTypes: PersonnelType[] = (result.personnelTypes || []).map((type: ServerPersonnelType) => ({
                personnel_types_id: type.personnel_types_id,
                name: type.name,
                type: type.type || null,
                department: type.department || null,
                basicSalary: type.basicSalary,
                isActive: type.isActive,
                createdAt: type.createdAt.toISOString()
            }))
            setTypes(transformedTypes)

            // Load attendance settings to get working days
            await loadAttendanceSettings()
        } catch {
            toast.error('Failed to load types')
        } finally {
            setLoading(false)
        }
    }

    async function loadAttendanceSettings() {
        try {
            const response = await fetch('/api/admin/attendance-settings')
            if (response.ok) {
                const data = await response.json()
                setAttendanceSettings(data.settings)

                // Calculate working days if period is set
                if (data.settings?.periodStart && data.settings?.periodEnd) {
                    const startDate = new Date(data.settings.periodStart)
                    const endDate = new Date(data.settings.periodEnd)
                    let days = 0

                    const currentDate = new Date(startDate)
                    while (currentDate <= endDate) {
                        if (currentDate.getDay() !== 0) { // Exclude Sundays
                            days++
                        }
                        currentDate.setDate(currentDate.getDate() + 1)
                    }

                    console.log('Calculated working days from period:', days, 'Period:', data.settings.periodStart, 'to', data.settings.periodEnd)

                    // Ensure minimum working days is reasonable (at least 22 for monthly salary calculations)
                    // This prevents incorrect daily rates when period is set incorrectly
                    if (days >= 22 && days <= 31) {
                        setWorkingDays(days)
                        console.log('Using calculated working days:', days)
                    } else {
                        console.warn('Calculated working days is out of valid range:', days, '- using default 22')
                        setWorkingDays(22)
                    }
                } else {
                    console.log('No attendance period set - using default 22 working days')
                    setWorkingDays(22)
                }
            }
        } catch (error) {
            console.error('Error loading attendance settings:', error)
        }
    }

    useEffect(() => { load() }, [])

    const resetForm = () => {
        setOffice('')
        setPositionName('')
        setDepartment('')
        setBasicSalaryInput('')
        setIsActive(true)
        setSelectedType(null)
    }

    // Reset position name when office changes
    const handleOfficeChange = (value: string) => {
        setOffice(value)
        setPositionName('') // Clear position when office changes
    }

    const handleCreateClick = () => {
        // Validation
        if (!office) {
            toast.error('Office is required')
            return
        }

        if (!positionName) {
            toast.error('Position name is required')
            return
        }

        if (!basicSalaryInput.trim() || basic <= 0) {
            toast.error('Valid monthly salary is required')
            return
        }

        // Show confirmation modal
        setConfirmCreateOpen(true)
    }

    async function create() {
        const fullPositionName = `${office}: ${positionName}`

        try {
            console.log('Creating position with data:', {
                name: fullPositionName,
                type: personnelType,
                department: office,
                basicSalary: basic,
                isActive
            })

            const result = await createPersonnelType({
                name: fullPositionName,
                type: personnelType,
                department: office,
                basicSalary: basic,
                isActive
            })

            console.log('Create result:', result)

            if (!result.success) {
                console.error('Failed to create position:', result.error)
                toast.error(result.error || 'Failed to add position')
                return
            }

            toast.success('Position added successfully!')
            setConfirmCreateOpen(false)
            setOpen(false)
            resetForm()
            load()
        } catch (error) {
            console.error('Error creating position:', error)
            const errorMsg = error instanceof Error ? error.message : 'Failed to add position'
            toast.error(errorMsg)
        }
    }

    async function update() {
        if (!selectedType) return

        if (!office) {
            toast.error('Office is required')
            return
        }

        if (!positionName) {
            toast.error('Position name is required')
            return
        }

        const fullPositionName = `${office}: ${positionName}`

        try {
            const result = await updatePersonnelType(selectedType.personnel_types_id, {
                name: fullPositionName,
                type: personnelType,
                department: office,
                basicSalary: basic,
                isActive
            })

            if (!result.success) {
                toast.error(result.error || 'Failed to update')
                return
            }

            toast.success('Position updated')
            setEditOpen(false)
            resetForm()
            load()
        } catch {
            toast.error('Failed to update')
        }
    }

    const openDeleteDialog = (type: PersonnelType) => {
        setTypeToDelete(type)
        setDeleteOpen(true)
    }

    async function confirmDelete() {
        if (!typeToDelete) return

        try {
            const result = await deletePersonnelType(typeToDelete.personnel_types_id)

            if (!result.success) {
                toast.error(result.error || 'Failed to delete')
                return
            }

            toast.success('Position deleted')
            setDeleteOpen(false)
            setTypeToDelete(null)
            load()
        } catch {
            toast.error('Failed to delete')
        }
    }

    const openEditDialog = (type: PersonnelType) => {
        setSelectedType(type)
        setPersonnelType(type.type || 'NON_TEACHING')

        // Parse the name to extract office and position
        const nameParts = type.name.split(': ')
        let extractedOffice = ''
        if (nameParts.length === 2) {
            extractedOffice = nameParts[0]
            setPositionName(nameParts[1])
        } else {
            extractedOffice = type.department || ''
            setPositionName(type.name)
        }

        // Normalize Barangay Personnel to Barangay Staff for the form
        if (extractedOffice === 'Barangay Personnel') {
            extractedOffice = 'Barangay Staff'
        }
        setOffice(extractedOffice)

        setDepartment(type.department || type.name || '')
        setBasicSalaryInput(type.basicSalary.toString())
        setIsActive(type.isActive)
        setEditOpen(true)
    }

    const openViewDialog = (type: PersonnelType) => {
        setSelectedType(type)
        setViewOpen(true)
    }

    return (
        <div className="flex-1 space-y-6 p-4 pt-6">
            <div className="flex items-center justify-between rounded-md px-4 py-3 bg-transparent dark:bg-sidebar text-foreground dark:text-sidebar-foreground">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <UserCheck className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                        Brgy Position
                    </h2>
                    <p className="text-muted-foreground text-sm">Manage positions and configure salary structures</p>
                </div>
                <SSRSafe>
                    <Dialog open={open} onOpenChange={(isOpen) => {
                        setOpen(isOpen)
                        if (isOpen) {
                            resetForm()
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button><Plus className="h-4 w-4 mr-2" />Add New Position</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle className="text-2xl flex items-center gap-2">
                                    <Plus className="h-6 w-6 text-primary" />
                                    Add Brgy Position
                                </DialogTitle>
                                <DialogDescription>
                                    Create a new position and configure salary details.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="py-6 space-y-6">
                                {/* Input Section */}
                                <div className="bg-muted/30 rounded-lg p-6 border space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label htmlFor="office" className="text-sm font-semibold flex items-center gap-2">
                                                <Home className="h-4 w-4 text-muted-foreground" />
                                                BLGU
                                            </Label>
                                            <Select value={office} onValueChange={handleOfficeChange}>
                                                <SelectTrigger className="w-full h-11">
                                                    <SelectValue placeholder="Select BLGU" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Barangay Officials">Barangay Officials</SelectItem>
                                                    <SelectItem value="Barangay Staff">Barangay Staff</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-3">
                                            <Label htmlFor="position-name" className="text-sm font-semibold flex items-center gap-2">
                                                <UserCheck className="h-4 w-4 text-muted-foreground" />
                                                Position Title
                                            </Label>
                                            <Select value={positionName} onValueChange={setPositionName} disabled={!office}>
                                                <SelectTrigger className="w-full h-11">
                                                    <SelectValue placeholder={office ? "Select Position" : "Select BLGU First"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {office === "Barangay Officials" && (
                                                        <>
                                                            <SelectItem value="Punong Barangay">Punong Barangay</SelectItem>
                                                            <SelectItem value="Barangay Kagawad">Barangay Kagawad</SelectItem>
                                                            <SelectItem value="Barangay Secretary">Barangay Secretary</SelectItem>
                                                            <SelectItem value="Barangay Treasurer">Barangay Treasurer</SelectItem>
                                                        </>
                                                    )}
                                                    {office === "Barangay Staff" && (
                                                        <>
                                                            <SelectItem value="Collector">Collector</SelectItem>
                                                            <SelectItem value="Encoder">Encoder</SelectItem>
                                                            <SelectItem value="Accounting Clerk">Accounting Clerk</SelectItem>
                                                            <SelectItem value="Driver">Driver</SelectItem>
                                                            <SelectItem value="Electrician">Electrician</SelectItem>
                                                            <SelectItem value="Lupon Recorder">Lupon Recorder</SelectItem>
                                                            <SelectItem value="Child Development Worker">Child Development Worker</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="monthly-salary" className="text-sm font-semibold flex items-center gap-2">
                                            <Banknote className="h-4 w-4 text-muted-foreground" />
                                            Monthly Salary
                                        </Label>
                                        <div className="relative group">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">₱</span>
                                            <Input
                                                id="monthly-salary"
                                                value={basicSalaryInput}
                                                onChange={(e) => setBasicSalaryInput(e.target.value)}
                                                placeholder="e.g. 25,000"
                                                className="w-full h-12 pl-8 text-lg font-medium"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 pl-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                                            Tip: Use shorthand like "25k" for 25,000
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="gap-3 sm:justify-end">
                                <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }} className="sm:w-32">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreateClick}
                                    disabled={!office || !positionName || !basicSalaryInput.trim()}
                                    className="sm:w-40 bg-primary hover:bg-primary/90"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Position
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </SSRSafe>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Positions</CardTitle>
                </CardHeader>
                <CardContent>
                    <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-4">
                            <TabsTrigger value="all">All Positions</TabsTrigger>
                            <TabsTrigger value="Barangay Officials">Barangay Officials</TabsTrigger>
                            <TabsTrigger value="Barangay Staff">Barangay Staff</TabsTrigger>
                        </TabsList>

                        <TabsContent value={categoryFilter} className="mt-0">
                            {loading ? (
                                <div className="py-6">Loading...</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>BLGU</TableHead>
                                            <TableHead>Position</TableHead>
                                            <TableHead>Net Pay</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTypes.map(t => {
                                            const nameParts = t.name.split(': ')
                                            let office = nameParts.length === 2 ? nameParts[0] : (t.department || 'N/A')
                                            if (office === 'Barangay Personnel') office = 'Barangay Staff'
                                            const position = nameParts.length === 2 ? nameParts[1] : t.name

                                            return (
                                                <TableRow key={t.personnel_types_id}>
                                                    <TableCell className="font-medium">{office}</TableCell>
                                                    <TableCell>{position}</TableCell>
                                                    <TableCell>₱{Number(t.basicSalary).toLocaleString()}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={t.isActive ? 'default' : 'secondary'}>
                                                            {t.isActive ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(t.createdAt).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <SSRSafe>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                                        <span className="sr-only">Open menu</span>
                                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                                        </svg>
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => openViewDialog(t)}>
                                                                        <Eye className="mr-2 h-4 w-4" />
                                                                        View Details
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => openEditDialog(t)}>
                                                                        <Edit className="mr-2 h-4 w-4" />
                                                                        Edit
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        onClick={() => openDeleteDialog(t)}
                                                                        className="text-red-600"
                                                                    >
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </SSRSafe>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                        {filteredTypes.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    {categoryFilter === "all" ? "No positions yet." : `No ${categoryFilter} positions yet.`}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <SSRSafe>
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl flex items-center gap-2">
                                <Edit className="h-6 w-6 text-primary" />
                                Edit Brgy Position
                            </DialogTitle>
                            <DialogDescription>
                                Update position information and view automatic salary calculations.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-6 space-y-6">
                            {/* Input Section */}
                            <div className="bg-muted/30 rounded-lg p-6 border space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="edit-office" className="text-sm font-semibold flex items-center gap-2">
                                            <Home className="h-4 w-4 text-muted-foreground" />
                                            BLGU
                                        </Label>
                                        <Select value={office} onValueChange={handleOfficeChange}>
                                            <SelectTrigger className="w-full h-11">
                                                <SelectValue placeholder="Select BLGU" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Barangay Officials">Barangay Officials</SelectItem>
                                                <SelectItem value="Barangay Staff">Barangay Staff</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="edit-position-name" className="text-sm font-semibold flex items-center gap-2">
                                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                                            Position Title
                                        </Label>
                                        <Select value={positionName} onValueChange={setPositionName} disabled={!office}>
                                            <SelectTrigger className="w-full h-11">
                                                <SelectValue placeholder={office ? "Select Position" : "Select BLGU First"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {office === "Barangay Officials" && (
                                                    <>
                                                        <SelectItem value="Punong Barangay">Punong Barangay</SelectItem>
                                                        <SelectItem value="Barangay Kagawad">Barangay Kagawad</SelectItem>
                                                        <SelectItem value="Barangay Secretary">Barangay Secretary</SelectItem>
                                                        <SelectItem value="Barangay Treasurer">Barangay Treasurer</SelectItem>
                                                    </>
                                                )}
                                                {office === "Barangay Staff" && (
                                                    <>
                                                        <SelectItem value="Collector">Collector</SelectItem>
                                                        <SelectItem value="Encoder">Encoder</SelectItem>
                                                        <SelectItem value="Accounting Clerk">Accounting Clerk</SelectItem>
                                                        <SelectItem value="Driver">Driver</SelectItem>
                                                        <SelectItem value="Electrician">Electrician</SelectItem>
                                                        <SelectItem value="Lupon Recorder">Lupon Recorder</SelectItem>
                                                        <SelectItem value="Child Development Worker">Child Development Worker</SelectItem>
                                                    </>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="edit-monthly-salary" className="text-sm font-semibold flex items-center gap-2">
                                        <Banknote className="h-4 w-4 text-muted-foreground" />
                                        Monthly Salary
                                    </Label>
                                    <div className="relative group">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">₱</span>
                                        <Input
                                            id="edit-monthly-salary"
                                            value={basicSalaryInput}
                                            onChange={(e) => setBasicSalaryInput(e.target.value)}
                                            placeholder="e.g. 25,000"
                                            className="w-full h-12 pl-8 text-lg font-medium"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 pl-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                                        Tip: Use shorthand like "25k" for 25,000
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold">Status</Label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="edit-isActive"
                                            checked={isActive}
                                            onChange={(e) => setIsActive(e.target.checked)}
                                            className="rounded h-4 w-4"
                                        />
                                        <Label htmlFor="edit-isActive" className="text-sm font-normal">Active</Label>
                                    </div>
                                </div>
                            </div>

                            {/* Salary Breakdown Section */}
                            {basic > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-px flex-1 bg-border"></div>
                                        <h4 className="font-semibold text-base text-muted-foreground">Automatic Salary Breakdown</h4>
                                        <div className="h-px flex-1 bg-border"></div>
                                    </div>

                                    {/* Unified Salary Breakdown Card */}
                                    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20 rounded-lg p-6 border border-green-200 dark:border-green-900 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h5 className="font-semibold text-base text-green-700 dark:text-green-400 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                                Complete Salary Breakdown
                                            </h5>
                                            <span className="text-2xl font-bold text-green-600 dark:text-green-400">₱{basic.toLocaleString()}</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
                                                <div className="flex justify-between items-center pb-2 border-b border-green-200/50 dark:border-green-900/50">
                                                    <span className="text-sm text-muted-foreground">Semi-Monthly</span>
                                                    <span className="text-base font-semibold">₱{semiMonthly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">÷ 2 (half month)</p>
                                            </div>

                                            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 space-y-2">
                                                <div className="flex justify-between items-center pb-2 border-b border-green-200/50 dark:border-green-900/50">
                                                    <span className="text-sm text-muted-foreground">Weekly</span>
                                                    <span className="text-base font-semibold">₱{weekly.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">÷ 4 weeks</p>
                                            </div>
                                        </div>

                                        <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-900">
                                            <p className="text-xs text-muted-foreground">
                                                {attendanceSettings?.periodStart && attendanceSettings?.periodEnd
                                                    ? `Period: ${new Date(attendanceSettings.periodStart).toLocaleDateString()} - ${new Date(attendanceSettings.periodEnd).toLocaleDateString()}`
                                                    : 'No attendance period set - using 22 working days default'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!basic && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p className="text-sm">Enter a monthly salary to see automatic breakdown</p>
                                </div>
                            )}
                        </div>

                        <DialogFooter className="gap-3 sm:justify-end">
                            <Button variant="outline" onClick={() => { setEditOpen(false); resetForm(); }} className="sm:w-32">
                                Cancel
                            </Button>
                            <Button onClick={update} disabled={!office || !positionName || !basicSalaryInput.trim()} className="sm:w-40 bg-primary hover:bg-primary/90">
                                <Edit className="h-4 w-4 mr-2" />
                                Update Position
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SSRSafe>

            {/* View Dialog */}
            <SSRSafe>
                <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl">{selectedType?.name}</DialogTitle>
                            <DialogDescription>Complete position information and salary breakdown.</DialogDescription>
                        </DialogHeader>
                        {selectedType && (
                            <div className="space-y-6 py-4">
                                {/* Position Info Card */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6 border">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold">{selectedType.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                {selectedType.department && (
                                                    <span className="text-sm text-muted-foreground">{selectedType.department}</span>
                                                )}
                                            </div>
                                        </div>
                                        <Badge variant={selectedType.isActive ? 'default' : 'secondary'} className="text-sm px-3 py-1">
                                            {selectedType.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly Salary</p>
                                            <p className="text-2xl font-bold text-green-600">₱{Number(selectedType.basicSalary).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created On</p>
                                            <p className="text-sm font-medium">{new Date(selectedType.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Salary Breakdown Card */}
                                <div className="bg-muted/30 rounded-lg p-6 border">
                                    <h4 className="font-semibold text-base mb-4 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                        Salary Breakdown
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                                <span className="text-sm text-muted-foreground">Monthly</span>
                                                <span className="font-semibold">₱{Number(selectedType.basicSalary).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                                <span className="text-sm text-muted-foreground">Semi-Monthly</span>
                                                <span className="font-semibold">₱{(Number(selectedType.basicSalary) / 2).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center py-2 border-b border-border/50">
                                                <span className="text-sm text-muted-foreground">Weekly</span>
                                                <span className="font-semibold">₱{(Number(selectedType.basicSalary) / 4).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            <Button onClick={() => setViewOpen(false)} className="w-full sm:w-auto">
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SSRSafe>

            {/* Delete Confirmation Dialog */}
            <SSRSafe>
                <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-xl flex items-center gap-2">
                                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                                    <Trash2 className="h-5 w-5 text-red-600" />
                                </div>
                                Delete Position
                            </DialogTitle>
                            <DialogDescription>
                                This action cannot be undone. This will permanently delete the position.
                            </DialogDescription>
                        </DialogHeader>

                        {typeToDelete && (
                            <div className="py-4">
                                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
                                    <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                                        You are about to delete:
                                    </p>
                                    <p className="text-base font-semibold text-red-700 dark:text-red-300">
                                        {typeToDelete.name}
                                    </p>
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                        Monthly Salary: ₱{Number(typeToDelete.basicSalary).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setDeleteOpen(false)
                                    setTypeToDelete(null)
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmDelete}
                                className="flex-1"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Position
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SSRSafe>

            {/* Confirmation Dialog for Create */}
            <SSRSafe>
                <Dialog open={confirmCreateOpen} onOpenChange={setConfirmCreateOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Confirm Create Position</DialogTitle>
                            <DialogDescription>
                                Please review the position details before creating.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">BLGU</p>
                                <p className="text-base font-semibold">{office}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Position</p>
                                <p className="text-base font-semibold">{positionName}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Monthly Salary</p>
                                <p className="text-base font-semibold">₱{basic.toLocaleString()}</p>
                            </div>
                        </div>
                        <DialogFooter className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setConfirmCreateOpen(false)}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={create}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                                Confirm & Create
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SSRSafe>
        </div>
    )
}


