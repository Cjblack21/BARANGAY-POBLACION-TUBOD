"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ClipboardMinus, Plus, Trash2, Save, Search, AlertCircle, Archive, Users, Eye, Info } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type Personnel = {
  users_id: string
  name: string
  email: string
  avatar?: string | null
  idNumber?: string
  personnelType: string
  department: string
  office?: string
  position?: string
}

type AttendanceDeduction = {
  deductions_id: string
  users_id: string
  staffName: string
  deductionType: string
  amount: number
  notes: string
  appliedAt: string
}


export default function AttendanceDeductionPage() {
  const router = useRouter()
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [deductions, setDeductions] = useState<AttendanceDeduction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null)
  const [showReminderBanner, setShowReminderBanner] = useState(false)
  const [deductionSearch, setDeductionSearch] = useState('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedStaffDetails, setSelectedStaffDetails] = useState<any>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deductionToDelete, setDeductionToDelete] = useState<string | null>(null)

  // Form state
  const [lateHours, setLateHours] = useState('')
  const [lateMinutes, setLateMinutes] = useState('')
  const [absentDays, setAbsentDays] = useState('')
  const [notes, setNotes] = useState('')
  const [deductionRate] = useState(1) // ₱1 per minute


  useEffect(() => {
    loadPersonnel()
    loadDeductions()
  }, [])

  const loadPersonnel = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        // Filter to only show PERSONNEL role (exclude ADMIN)
        const personnelOnly = (data.users || [])
          .filter((user: any) => user.role === 'PERSONNEL')
          .map((user: any) => ({
            users_id: user.users_id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            idNumber: user.idNumber,
            personnelType: user.personnel_types?.name || '',
            department: user.personnel_types?.department || '',
            office: user.personnel_types?.department || '',
            position: user.personnel_types?.name || ''
          }))
        setPersonnel(personnelOnly)
      }
    } catch (error) {
      console.error('Error loading personnel:', error)
      toast.error('Failed to load personnel')
    }
  }

  const loadDeductions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/attendance-deductions')
      if (response.ok) {
        const data = await response.json()
        setDeductions(data.deductions || [])
      }
    } catch (error) {
      console.error('Error loading deductions:', error)
      toast.error('Failed to load deductions')
    } finally {
      setLoading(false)
    }
  }

  const handleAddDeduction = async () => {
    if (!selectedPersonnel) return

    const totalMinutes = (Number(lateHours) * 60) + Number(lateMinutes) + (Number(absentDays) * 480)
    const totalAmount = totalMinutes * deductionRate

    if (totalMinutes === 0) {
      toast.error('Please enter late time or absent days')
      return
    }

    try {
      toast.loading('Adding deduction...', { id: 'add-deduction' })

      const response = await fetch('/api/admin/attendance-deductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users_id: selectedPersonnel.users_id,
          lateMinutes: (Number(lateHours) * 60) + Number(lateMinutes),
          absentDays: Number(absentDays),
          amount: totalAmount,
          notes: notes || `Late: ${lateHours}h ${lateMinutes}m, Absent: ${absentDays} days`
        })
      })

      if (!response.ok) {
        throw new Error('Failed to add deduction')
      }

      toast.success('Deduction added successfully', { id: 'add-deduction' })
      setShowAddModal(false)
      resetForm()
      loadDeductions()
      setShowReminderBanner(true)
      // Auto-hide banner after 10 seconds
      setTimeout(() => setShowReminderBanner(false), 10000)
    } catch (error) {
      console.error('Error adding deduction:', error)
      toast.error('Failed to add deduction', { id: 'add-deduction' })
    }
  }

  const handleDeleteDeduction = (deductionId: string) => {
    setDeductionToDelete(deductionId)
    setShowDeleteModal(true)
  }

  const confirmDeleteDeduction = async () => {
    if (!deductionToDelete) return
    setShowDeleteModal(false)
    try {
      toast.loading('Deleting deduction...', { id: 'delete-deduction' })
      const response = await fetch(`/api/admin/attendance-deductions?id=${deductionToDelete}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete deduction')
      toast.success('Deduction deleted successfully', { id: 'delete-deduction' })
      loadDeductions()
    } catch (error) {
      console.error('Error deleting deduction:', error)
      toast.error('Failed to delete deduction', { id: 'delete-deduction' })
    } finally {
      setDeductionToDelete(null)
    }
  }

  const resetForm = () => {
    setLateHours('')
    setLateMinutes('')
    setAbsentDays('')
    setNotes('')
    setSelectedPersonnel(null)
  }

  const handleViewDetails = async (userId: string, staffName: string, avatar?: string | null, email?: string) => {
    try {
      setLoadingDetails(true)
      setShowDetailsModal(true)

      const response = await fetch(`/api/admin/attendance-deductions/details?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedStaffDetails({
          ...data,
          staffName,
          userId,
          avatar,
          email
        })
      } else {
        toast.error('Failed to load attendance details')
      }
    } catch (error) {
      console.error('Error loading details:', error)
      toast.error('Failed to load attendance details')
    } finally {
      setLoadingDetails(false)
    }
  }

  const filteredPersonnel = personnel.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalMinutes = (Number(lateHours) * 60) + Number(lateMinutes) + (Number(absentDays) * 480)
  const totalAmount = totalMinutes * deductionRate

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardMinus className="h-8 w-8" />
            Attendance Deduction
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage attendance-based deductions for staff
          </p>
        </div>
        <Button
          onClick={() => router.push('/admin/attendance-deduction/archived')}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <Archive className="h-4 w-4 mr-2" />
          View Archived
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                How Attendance Deductions Work
              </h3>
              <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  Deductions added here will automatically be included in payroll calculations.
                  Rate: <strong>₱{deductionRate.toFixed(2)} per minute</strong> (8 hours = 480 minutes per day)
                </p>
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Next Steps:</p>
                  <p>
                    After adding attendance deductions, proceed to the <strong>Payroll</strong> page to review and release payroll.
                    All active deductions will be automatically applied to the respective staff during payroll release.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card >

      {/* Reminder Banner - above Staff Overview */}
      {
        showReminderBanner && (
          <div className="border-2 border-green-400 bg-green-50 dark:bg-green-950/30 dark:border-green-700 rounded-xl p-6 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-600 rounded-lg">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-green-900 dark:text-green-100 text-base">Deduction Added Successfully!</p>
                <p className="text-green-700 dark:text-green-300 text-sm mt-0.5">Go to <strong>Release Payroll</strong> to include this in the next payroll.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button
                size="lg"
                onClick={() => router.push('/admin/payroll')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="h-5 w-5 mr-2" />
                Release Payroll
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowReminderBanner(false)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )
      }

      {/* Personnel Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Staff Overview
              </CardTitle>
              <CardDescription>Summary of staff with attendance deductions</CardDescription>
            </div>
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={deductionSearch}
                onChange={(e) => setDeductionSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Total Personnel with Deductions */}
            <Card className="cursor-default hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Staff with Deductions</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{new Set(deductions.map(d => d.users_id)).size}</div>
                <p className="text-xs text-muted-foreground mt-1">Active staff members</p>
              </CardContent>
            </Card>

            {/* Total Deductions */}
            <Card className="cursor-default hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
                <ClipboardMinus className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{deductions.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Current period</p>
              </CardContent>
            </Card>

            {/* Total Amount */}
            <Card className="cursor-default hover:shadow-lg transition-all duration-300 border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₱{deductions.reduce((sum, d) => sum + d.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Total deductions</p>
              </CardContent>
            </Card>
          </div>

          {/* Current Attendance Deductions */}
          {deductions.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Staff</TableHead>
                    <TableHead>ID Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductions
                    .filter(d =>
                      !deductionSearch ||
                      d.staffName?.toLowerCase().includes(deductionSearch.toLowerCase())
                    )
                    .map((deduction) => (
                      <TableRow key={deduction.deductions_id}>
                        <TableCell className="font-medium">
                          {deduction.staffName || <span className="text-muted-foreground italic">Unknown</span>}
                        </TableCell>
                        <TableCell>
                          <span className="inline-block bg-muted text-muted-foreground font-mono px-2 py-0.5 rounded" style={{ fontSize: '11px' }}>{deduction.users_id}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">{deduction.deductionType}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{deduction.notes}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          -₱{deduction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(deduction.appliedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => {
                                const person = personnel.find(p => p.users_id === deduction.users_id)
                                handleViewDetails(deduction.users_id, deduction.staffName, person?.avatar, person?.email)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteDeduction(deduction.deductions_id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No attendance deductions yet</p>
              <p className="text-sm mt-1">Add deductions for staff using the table below</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Personnel List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Staff List</CardTitle>
              <CardDescription>Select staff to add attendance deductions</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>ID Number</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>BLGU</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading staff...
                  </TableCell>
                </TableRow>
              ) : filteredPersonnel.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No staff found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPersonnel.map((person) => {
                  // Parse BLGU and position from personnelType name (format: "BLGU: Position")
                  const personnelTypeName = person.personnelType || ''
                  const nameParts = personnelTypeName.split(': ')
                  const blgu = nameParts.length === 2 ? nameParts[0] : (person.department || 'BLGU')
                  const position = nameParts.length === 2 ? nameParts[1] : (personnelTypeName || 'N/A')

                  return (
                    <TableRow key={person.users_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={person.avatar || ''} />
                            <AvatarFallback className="text-sm font-medium">
                              {person.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{person.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><span className="inline-block bg-muted text-muted-foreground font-mono px-2 py-0.5 rounded" style={{ fontSize: '11px' }}>{person.idNumber || person.users_id}</span></TableCell>
                      <TableCell className="text-muted-foreground">{person.email}</TableCell>
                      <TableCell>{blgu}</TableCell>
                      <TableCell>{position}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPersonnel(person)
                            setShowAddModal(true)
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Deduction
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={selectedStaffDetails?.avatar || ''} />
                <AvatarFallback className="text-lg font-semibold">
                  {selectedStaffDetails?.staffName?.split(' ').map((n: string) => n.charAt(0)).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {selectedStaffDetails?.staffName || 'Attendance Details'}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{selectedStaffDetails?.email || ''}</p>
                <span className="inline-block bg-muted text-muted-foreground font-mono px-2 py-0.5 rounded text-xs mt-1">
                  ID: {selectedStaffDetails?.userId || '—'}
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {loadingDetails ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading attendance details...</p>
              </div>
            ) : selectedStaffDetails ? (
              <>
                {/* Deductions Summary */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-muted-foreground mb-1">Total Deductions</p>
                    <p className="text-2xl font-bold">{selectedStaffDetails.deductions?.length || 0}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-red-600">
                      ₱{(selectedStaffDetails.deductions?.reduce((sum: number, d: any) => sum + d.amount, 0) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-xs text-muted-foreground mb-1">Late Minutes</p>
                    <p className="text-2xl font-bold">
                      {selectedStaffDetails.totalLateMinutes || 0}
                    </p>
                  </div>
                </div>

                {/* Deductions List */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-3 border-b">
                    <h3 className="font-semibold">Deduction History</h3>
                  </div>
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {selectedStaffDetails.deductions && selectedStaffDetails.deductions.length > 0 ? (
                      selectedStaffDetails.deductions.map((deduction: any) => (
                        <div key={deduction.deductions_id} className="p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="destructive" className="text-xs">
                                  {deduction.deductionType}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(deduction.appliedAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">{deduction.notes}</p>
                            </div>
                            <div className="text-right ml-4">
                              <p className="text-lg font-bold text-red-600">
                                -₱{deduction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No deductions found for this staff member</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No data available</p>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Deduction Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[900px] max-h-[95vh] p-0 flex flex-col gap-0 overflow-hidden">
          <DialogHeader className="px-8 py-6 border-b bg-muted/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                <ClipboardMinus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">
                  Add Attendance Deduction
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Calculate and apply attendance-based deductions for {selectedPersonnel?.name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {/* Personnel Info Card */}
            <div className="bg-muted/30 rounded-lg p-5 border">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedPersonnel?.avatar || ''} />
                  <AvatarFallback className="text-lg font-medium">
                    {selectedPersonnel?.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedPersonnel?.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{selectedPersonnel?.email}</p>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="bg-background rounded p-3 border">
                      <p className="text-xs text-muted-foreground">ID Number</p>
                      <p className="font-medium text-sm mt-1">{selectedPersonnel?.users_id || 'N/A'}</p>
                    </div>
                    <div className="bg-background rounded p-3 border">
                      <p className="text-xs text-muted-foreground">BLGU</p>
                      <p className="font-medium text-sm mt-1">{selectedPersonnel?.office || 'BLGU'}</p>
                    </div>
                    <div className="bg-background rounded p-3 border">
                      <p className="text-xs text-muted-foreground">Position</p>
                      <p className="font-medium text-sm mt-1">{selectedPersonnel?.position || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Deduction Rate</span>
                      <span className="font-semibold text-base">₱{deductionRate.toFixed(2)} / minute</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Existing Deductions Warning */}
            {selectedPersonnel && deductions.filter(d => d.users_id === selectedPersonnel.users_id).length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">
                      Existing Deductions Found
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedPersonnel.name} currently has {deductions.filter(d => d.users_id === selectedPersonnel.users_id).length} active deduction(s)
                    </p>
                  </div>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {deductions
                    .filter(d => d.users_id === selectedPersonnel.users_id)
                    .map((deduction) => (
                      <div key={deduction.deductions_id} className="bg-background rounded p-2.5 border text-sm">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="destructive" className="text-xs">{deduction.deductionType}</Badge>
                              <span className="text-xs text-muted-foreground">{new Date(deduction.appliedAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{deduction.notes}</p>
                          </div>
                          <p className="font-semibold text-red-600">-₱{deduction.amount.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  <span className="text-sm font-medium">Total Existing:</span>
                  <span className="text-lg font-bold text-red-600">
                    -₱{deductions
                      .filter(d => d.users_id === selectedPersonnel.users_id)
                      .reduce((sum, d) => sum + d.amount, 0)
                      .toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Deduction Input Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Late Time Card */}
              <div className="border rounded-lg p-5 bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-base">Late Time</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <Label className="text-sm">Hours</Label>
                    <Input
                      type="number"
                      value={lateHours}
                      onChange={(e) => setLateHours(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      min="0"
                      max="23"
                      placeholder="0"
                      className="mt-1 h-12 text-base"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Minutes</Label>
                    <Input
                      type="number"
                      value={lateMinutes}
                      onChange={(e) => setLateMinutes(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      min="0"
                      max="59"
                      placeholder="0"
                      className="mt-1 h-12 text-base"
                    />
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold">{(Number(lateHours) * 60) + Number(lateMinutes)} min</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Deduction</span>
                    <span className="text-lg font-bold text-red-600">
                      ₱{((Number(lateHours) * 60) + Number(lateMinutes)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Absent Days Card */}
              <div className="border rounded-lg p-5 bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <h3 className="font-semibold text-base">Absent Days</h3>
                </div>
                <div className="mb-4">
                  <Label className="text-sm">Number of Days</Label>
                  <Input
                    type="number"
                    value={absentDays}
                    onChange={(e) => setAbsentDays(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    min="0"
                    step="1"
                    placeholder="0"
                    className="mt-1 h-12 text-base"
                  />
                </div>
                <div className="bg-muted/50 rounded-lg border p-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-semibold">{Number(absentDays) * 480} min</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{Number(absentDays)} days × 480 min</p>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Deduction</span>
                    <span className="text-lg font-bold text-red-600">
                      ₱{(Number(absentDays) * 480).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <Label className="text-sm font-medium">Additional Notes (Optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Late on January 10, 2026"
                className="mt-2 h-11 border-2 border-gray-300 dark:border-gray-600"
              />
            </div>

            {/* Total Summary Card */}
            <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Save className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-base">Deduction Summary</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-background rounded border p-3">
                  <p className="text-xs text-muted-foreground">Late Time</p>
                  <p className="font-semibold text-base mt-1">{(Number(lateHours) * 60) + Number(lateMinutes)} minutes</p>
                </div>
                <div className="bg-background rounded border p-3">
                  <p className="text-xs text-muted-foreground">Absent Days</p>
                  <p className="font-semibold text-base mt-1">{Number(absentDays) * 480} minutes</p>
                </div>
              </div>
              <div className="bg-background rounded border p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Minutes</p>
                    <p className="text-2xl font-bold mt-1">{totalMinutes}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total Deduction</p>
                    <p className="text-3xl font-bold text-red-600 mt-1">
                      ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-8 py-5 border-t bg-muted/20 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddDeduction}
              disabled={totalMinutes === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Deduction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Deduction
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this attendance deduction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteDeduction}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
