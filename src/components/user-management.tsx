"use client"

import { useState, useEffect } from 'react'
import { SSRSafe } from "@/components/ssr-safe"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Eye,
  UserCheck,
  UserX,
  Archive,
  Trash2,
  User,
  Upload,
  Lock,
  Shield,
  Briefcase,
  UserPlus,
  EyeOff
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'react-hot-toast'
import { Checkbox } from '@/components/ui/checkbox'

interface User {
  users_id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'PERSONNEL'
  isActive: boolean
  createdAt: string
  updatedAt: string
  avatar?: string | null
  personnel_types_id?: string | null
  streetAddress?: string | null
  barangay?: string | null
  purok?: string | null
  zipCode?: string | null
  personnelType?: {
    name: string
    type?: 'TEACHING' | 'NON_TEACHING' | null
    basicSalary: number
    department?: string | null
  } | null
  personnel_types?: {
    name: string
    type?: 'TEACHING' | 'NON_TEACHING' | null
    basicSalary: number
    department?: string | null
  } | null
  currentLeave?: {
    startDate: string
    endDate: string
    type: string
    isPaid: boolean
  } | null
}

interface PersonnelTypeWithDept {
  personnel_types_id: string
  name: string
  type?: 'TEACHING' | 'NON_TEACHING' | null
  department?: string | null
}

interface UserFormData {
  email: string
  name: string
  personnelId: string
  role: 'ADMIN' | 'PERSONNEL'
  password?: string
  isActive: boolean
  personnel_types_id?: string
  streetAddress?: string
  barangay?: string
  purok?: string
  zipCode?: string
  avatar?: string
}

// Helper function to get initials for avatar
function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return email.charAt(0).toUpperCase()
}

export function UserManagement() {
  const [personnel, setPersonnel] = useState<User[]>([])
  const [filteredPersonnel, setFilteredPersonnel] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('ALL')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [selectedPersonnel, setSelectedPersonnel] = useState<User | null>(null)
  const [personnelTypes, setPersonnelTypes] = useState<PersonnelTypeWithDept[]>([])
  const [selectedPersonnelIds, setSelectedPersonnelIds] = useState<Set<string>>(new Set())
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<User | null>(null)
  const [positionSearchTerm, setPositionSearchTerm] = useState('')
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    name: '',
    personnelId: '',
    role: 'PERSONNEL',
    password: '',
    isActive: true,
    streetAddress: '',
    barangay: '',
    purok: '',
    zipCode: ''
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Generate unique 6-digit personnel ID
  const generatePersonnelId = () => {
    const randomId = Math.floor(100000 + Math.random() * 900000).toString()
    return randomId
  }

  // Check if personnel ID already exists
  const isPersonnelIdDuplicate = (personnelId: string): boolean => {
    return personnel.some(p => p.users_id === personnelId)
  }

  // Fetch personnel
  const fetchPersonnel = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      if (!response.ok) throw new Error('Failed to fetch staff')
      const data = await response.json()
      const personnelArray = data.users || data || []
      setPersonnel(personnelArray)
      setFilteredPersonnel(personnelArray)
    } catch (error) {
      console.error('Error fetching personnel:', error)
      toast.error('Failed to fetch staff')
    } finally {
      setLoading(false)
    }
  }

  // Filter personnel based on search and role
  useEffect(() => {
    let filtered = personnel

    // Filter to show only active staff
    filtered = filtered.filter(person => person.isActive)

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(person =>
        person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        person.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply role filter
    if (roleFilter !== 'ALL') {
      filtered = filtered.filter(person => person.role === roleFilter)
    }

    setFilteredPersonnel(filtered)
  }, [personnel, searchTerm, roleFilter])

  // Load personnel on mount
  useEffect(() => {
    fetchPersonnel()
      ; (async () => {
        try {
          console.log('Fetching personnel types from /api/admin/personnel-types...')
          const res = await fetch('/api/admin/personnel-types', { cache: 'no-store' })
          console.log('Personnel types response status:', res.status)

          if (!res.ok) {
            const errorText = await res.text()
            console.error('Failed to fetch personnel types:', res.status, errorText)
            toast.error('Failed to load personnel types')
            return
          }

          const data = await res.json()
          console.log('Loaded personnel types:', data)
          console.log('Number of personnel types:', data.length)
          setPersonnelTypes(data)

          if (data.length === 0) {
            console.warn('No personnel types found. Please create some in Personnel Types page.')
            toast.error('No personnel types found. Please create personnel types first.')
          }
        } catch (error) {
          console.error('Error loading personnel types:', error)
          toast.error('Failed to load personnel types')
        }
      })()
  }, [])

  // Handle create personnel
  const handleCreatePersonnel = async () => {
    // Validate required fields
    if (!formData.email || !formData.email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    if (!formData.name || formData.name.trim().length === 0) {
      toast.error('Please enter a full name')
      return
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }


    try {
      // Auto-generate ID if not manually provided (though field is read-only now)
      let finalPersonnelId = formData.personnelId;
      if (!finalPersonnelId) {
        finalPersonnelId = generatePersonnelId();
        // Ensure uniqueness
        while (isPersonnelIdDuplicate(finalPersonnelId)) {
          finalPersonnelId = generatePersonnelId();
        }
      }

      // Upload avatar image if provided
      let avatarUrl = null;
      if (avatarFile) {
        const avatarFormData = new FormData()
        avatarFormData.append('avatar', avatarFile)

        const uploadResponse = await fetch('/api/admin/upload-avatar', {
          method: 'POST',
          body: avatarFormData
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          toast.error(errorData.error || 'Failed to upload avatar image')
          return
        }

        const uploadData = await uploadResponse.json()
        avatarUrl = uploadData.avatarUrl
      }

      // Then create the user account
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          // Send generated personnelId as users_id
          users_id: finalPersonnelId,
          avatar: avatarUrl
        })
      })

      if (!response.ok) {
        let message = 'Failed to create staff'
        try {
          const text = await response.text()
          try {
            const data = JSON.parse(text)
            console.error('API Error Response:', data)
            if (data.details && Array.isArray(data.details)) {
              // Zod validation errors
              message = data.details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join(', ')
            } else {
              message = data.error || message
            }
          } catch {
            message = text || message
          }
        } catch {
          // If we can't read the response at all
        }
        toast.error(message)
        console.error('Create staff error:', message)
        return
      }

      toast.success('Staff created successfully')
      setIsCreateDialogOpen(false)
      setFormData({
        email: '',
        name: '',
        personnelId: '',
        role: 'PERSONNEL',
        password: '',
        isActive: true,
        streetAddress: '',
        barangay: '',
        purok: '',
        zipCode: ''
      })
      setAvatarFile(null)
      setAvatarPreview(null)
      setPositionSearchTerm('')
      fetchPersonnel()
    } catch (error) {
      console.error('Error creating staff:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create staff')
    }
  }

  // Handle update personnel
  const handleUpdatePersonnel = async () => {
    if (!selectedPersonnel) return

    try {
      // If avatar file is selected, upload it first
      let avatarUrl: string | undefined

      if (avatarFile) {
        const avatarFormData = new FormData()
        avatarFormData.append('avatar', avatarFile)

        const uploadResponse = await fetch('/api/admin/upload-avatar', {
          method: 'POST',
          body: avatarFormData
        })

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json()
          toast.error(errorData.error || 'Failed to upload avatar image')
          return
        }

        const data = await uploadResponse.json()
        avatarUrl = data.avatarUrl
      }

      const updateData: Record<string, unknown> = { ...formData }
      if (avatarUrl) {
        updateData.avatar = avatarUrl
      }
      if (!updateData.password) {
        delete updateData.password
      }
      // Ensure personnel_types_id key exists (empty string means clear)
      if (!Object.prototype.hasOwnProperty.call(updateData, 'personnel_types_id')) {
        ; (updateData as Record<string, unknown>).personnel_types_id = ''
      }

      const response = await fetch(`/api/admin/users/${selectedPersonnel.users_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        let message = 'Failed to update staff'
        try {
          const data = await response.json()
          message = data.error || message
        } catch {
          message = await response.text()
        }
        throw new Error(message)
      }

      toast.success('Staff updated successfully')
      setIsEditDialogOpen(false)
      setSelectedPersonnel(null)
      setAvatarFile(null)
      setAvatarPreview(null)
      fetchPersonnel()
    } catch (error) {
      console.error('Error updating staff:', error)
      toast.error('Failed to update staff')
    }
  }




  // Open edit dialog
  const openEditDialog = (person: User) => {
    setSelectedPersonnel(person)
    setFormData({
      email: person.email,
      name: person.name || '',
      personnelId: person.users_id,
      role: person.role,
      password: '',
      isActive: person.isActive,
      personnel_types_id: person.personnel_types_id || undefined,
      streetAddress: person.streetAddress || '',
      barangay: person.barangay || '',
      purok: person.purok || '',
      zipCode: person.zipCode || ''
    })
    // Reset avatar state
    setAvatarFile(null)
    setAvatarPreview(null)
    setIsEditDialogOpen(true)
  }

  // Open view dialog
  const openViewDialog = (person: User) => {
    setSelectedPersonnel(person)
    setIsViewDialogOpen(true)
  }

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPersonnelIds(new Set(filteredPersonnel.map(p => p.users_id)))
    } else {
      setSelectedPersonnelIds(new Set())
    }
  }

  // Handle individual selection
  const handleSelectPersonnel = (personnelId: string, checked: boolean) => {
    const newSelected = new Set(selectedPersonnelIds)
    if (checked) {
      newSelected.add(personnelId)
    } else {
      newSelected.delete(personnelId)
    }
    setSelectedPersonnelIds(newSelected)
  }


  // Delete flow handlers
  const [deleteRecordCounts, setDeleteRecordCounts] = useState<{
    attendance: number
    payroll: number
    loans: number
    deductions: number
  } | null>(null)

  const handleDeleteRequest = async (person: User) => {
    setPendingDelete(person)
    setDeleteRecordCounts(null)

    // First check if there are related records
    try {
      const response = await fetch(`/api/admin/users/${person.users_id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()

        // If user not found, show error and don't open dialog
        if (response.status === 404) {
          toast.error('User not found. Please refresh the page.')
          fetchPersonnel()
          return
        }

        if (data.needsForce && data.counts) {
          setDeleteRecordCounts(data.counts)
        }
      }
    } catch (error) {
      console.error('Error checking delete:', error)
      toast.error('Failed to check user deletion status')
      return
    }

    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async (force: boolean = false) => {
    if (!pendingDelete) return
    try {
      const url = force
        ? `/api/admin/users/${pendingDelete.users_id}?force=true`
        : `/api/admin/users/${pendingDelete.users_id}`

      const response = await fetch(url, {
        method: 'DELETE'
      })

      if (!response.ok) {
        let message = 'Failed to delete staff'
        try {
          const data = await response.json()
          if (data.needsForce && !force) {
            // This shouldn't happen as we check first, but handle it
            setDeleteRecordCounts(data.counts)
            return
          }
          message = data.error || message
        } catch {
          message = await response.text()
        }
        throw new Error(message)
      }

      toast.success('Staff deleted successfully')
      setIsDeleteDialogOpen(false)
      setPendingDelete(null)
      setDeleteRecordCounts(null)
      fetchPersonnel()
    } catch (error) {
      console.error('Error deleting staff:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete staff')
    }
  }

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false)
    setPendingDelete(null)
    setDeleteRecordCounts(null)
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {selectedPersonnelIds.size > 0 && (
            <Badge variant="secondary" className="px-3 py-1">
              {selectedPersonnelIds.size} selected
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <SSRSafe>
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open)
              if (!open) {
                setPositionSearchTerm('')
                setAvatarFile(null)
                setAvatarPreview(null)
                setShowPassword(false)
              }
              // ID will be generated upon creation
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Plus className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl">Create New Staff Member</DialogTitle>
                      <DialogDescription className="text-sm">
                        Add a new staff member to the system with their profile and credentials
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6 py-6">
                  {/* Profile Image Section */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-600" />
                      Profile Photo
                      <span className="text-xs text-gray-500 font-normal ml-2">(Optional)</span>
                    </h3>
                    <div className="flex items-center gap-6">
                      <div className="flex-shrink-0">
                        {avatarPreview ? (
                          <div className="relative">
                            <img
                              src={avatarPreview}
                              alt="Avatar preview"
                              className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg"
                            />
                          </div>
                        ) : (
                          <div className="h-24 w-24 rounded-full bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center">
                            <User className="h-10 w-10 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="create-avatar" className="cursor-pointer">
                          <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                            <Input
                              id="create-avatar"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  setAvatarFile(file)
                                  const reader = new FileReader()
                                  reader.onloadend = () => {
                                    setAvatarPreview(reader.result as string)
                                  }
                                  reader.readAsDataURL(file)
                                }
                              }}
                            />
                            <div className="text-center">
                              <Upload className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                              <p className="text-sm font-medium text-gray-700">Click to upload photo</p>
                              <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF (max 5MB)</p>
                            </div>
                          </div>
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Personal Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                      <User className="h-4 w-4 text-blue-600" />
                      Personal Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <Label htmlFor="create-name" className="text-sm font-medium">
                          Full Name *
                        </Label>
                        <Input
                          id="create-name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., Juan Dela Cruz"
                          className="mt-1.5"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Label htmlFor="create-email" className="text-sm font-medium">
                          Email Address *
                        </Label>
                        <Input
                          id="create-email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="e.g., juan.delacruz@example.com"
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                      <User className="h-4 w-4 text-blue-600" />
                      Address Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label htmlFor="create-street" className="text-sm font-medium">
                          Street Address
                        </Label>
                        <Input
                          id="create-street"
                          value={formData.streetAddress}
                          onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                          placeholder="e.g., 123 Rizal Street"
                          className="mt-1.5"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Label htmlFor="create-barangay" className="text-sm font-medium">
                          Barangay
                        </Label>
                        <Input
                          id="create-barangay"
                          value={formData.barangay}
                          onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                          placeholder="e.g., Poblacion"
                          className="mt-1.5"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Label htmlFor="create-purok" className="text-sm font-medium">
                          Purok
                        </Label>
                        <Input
                          id="create-purok"
                          value={formData.purok}
                          onChange={(e) => setFormData({ ...formData, purok: e.target.value })}
                          placeholder="e.g., Purok 1"
                          className="mt-1.5"
                        />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Label htmlFor="create-zipcode" className="text-sm font-medium">
                          Zip Code
                        </Label>
                        <Input
                          id="create-zipcode"
                          value={formData.zipCode}
                          onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                          placeholder="e.g., 9209"
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Account Credentials Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                      <Lock className="h-4 w-4 text-blue-600" />
                      Account Credentials
                    </h3>
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="create-password" className="text-sm font-medium">
                          Password *
                        </Label>
                        <div className="relative">
                          <Input
                            id="create-password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Minimum 6 characters"
                            className="mt-1.5 pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Must be at least 6 characters long
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Role & Position Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                      <Briefcase className="h-4 w-4 text-blue-600" />
                      Role & Position
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <Label htmlFor="create-role" className="text-sm font-medium">
                          System Role *
                        </Label>
                        <Select
                          value={formData.role}
                          onValueChange={(value: 'ADMIN' | 'PERSONNEL') =>
                            setFormData({ ...formData, role: value })
                          }
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERSONNEL">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                Staff Member
                              </div>
                            </SelectItem>
                            <SelectItem value="ADMIN">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Administrator
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <Label htmlFor="create-personnel-type" className="text-sm font-medium">
                          BLGU & Position
                        </Label>
                        <Select
                          value={formData.personnel_types_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, personnel_types_id: value })
                          }
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                          <SelectContent>
                            {personnelTypes.map((type) => {
                              const nameParts = type.name.split(': ')
                              const office = nameParts.length === 2 ? nameParts[0] : (type.department || 'N/A')
                              const position = nameParts.length === 2 ? nameParts[1] : type.name
                              return (
                                <SelectItem key={type.personnel_types_id} value={type.personnel_types_id}>
                                  {office} - {position}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="border-t pt-4 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreatePersonnel}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create Staff Member
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </SSRSafe>
        </div >
      </div >

      {/* Filters Section */}
      < Card >
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
            <div className="flex-1">
              <Label htmlFor="search">Search Staff</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Label>Filter by System Role</Label>
              <SSRSafe>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All System Roles</SelectItem>
                    <SelectItem value="ADMIN">Admin Only</SelectItem>
                    <SelectItem value="PERSONNEL">Staff Only</SelectItem>
                  </SelectContent>
                </Select>
              </SSRSafe>
            </div>
          </div>
        </CardContent>
      </Card >

      {/* Personnel Table */}
      < Card >
        <CardHeader>
          <CardTitle>
            Active Staff ({filteredPersonnel.length})
          </CardTitle>
          <CardDescription>
            Showing {filteredPersonnel.length} of {personnel.filter(p => p.isActive).length} active staff
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">Loading staff...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>ID Number</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>BLGU</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>System Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPersonnel.map((person) => {
                  // Parse office and position from personnelType name
                  const personnelTypeName = person.personnel_types?.name || person.personnelType?.name || ''
                  const nameParts = personnelTypeName.split(': ')
                  const office = nameParts.length === 2 ? nameParts[0] : (person.personnel_types?.department || person.personnelType?.department || 'N/A')
                  const position = nameParts.length === 2 ? nameParts[1] : (personnelTypeName || 'N/A')

                  return (
                    <TableRow key={person.users_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={person.avatar || ''} />
                            <AvatarFallback className="text-sm font-medium">
                              {getInitials(person.name, person.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold">{person.name || 'No name set'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{person.users_id}</TableCell>
                      <TableCell className="text-sm">{person.email}</TableCell>
                      <TableCell className="font-medium">{office}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {position}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={person.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {person.role === 'PERSONNEL' ? 'STAFF' : person.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={person.isActive ? 'default' : 'destructive'}>
                            {person.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {person.currentLeave && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 cursor-help">
                                    🏖️ On Leave
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs">
                                    <p className="font-semibold">{person.currentLeave.type}</p>
                                    <p>{new Date(person.currentLeave.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {new Date(person.currentLeave.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                                    <p className="text-muted-foreground">{person.currentLeave.isPaid ? 'Paid' : 'Unpaid'}</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(person.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openViewDialog(person)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(person)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Staff
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteRequest(person)} className="text-red-600 focus:text-red-700">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredPersonnel.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      No staff found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card >

      {/* Edit Personnel Dialog */}
      < SSRSafe >
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) {
            setAvatarFile(null)
            setAvatarPreview(null)
            setShowPassword(false)
          }
        }}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Edit className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Edit Staff Member</DialogTitle>
                  <DialogDescription className="text-sm">
                    Update staff information, credentials, and profile photo
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-6 py-6">
              {/* Profile Image Section */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Profile Photo
                </h3>
                <div className="flex items-center gap-6">
                  <div className="flex-shrink-0">
                    {avatarPreview ? (
                      <div className="relative">
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg"
                        />
                      </div>
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center">
                        <User className="h-10 w-10 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="edit-avatar" className="cursor-pointer">
                      <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                        <Input
                          id="edit-avatar"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setAvatarFile(file)
                              const reader = new FileReader()
                              reader.onloadend = () => {
                                setAvatarPreview(reader.result as string)
                              }
                              reader.readAsDataURL(file)
                            }
                          }}
                        />
                        <div className="text-center">
                          <Upload className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                          <p className="text-sm font-medium text-gray-700">Click to upload new photo</p>
                          <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF (max 5MB)</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </div>
              </div>

              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="edit-name" className="text-sm font-medium">Full Name</Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="edit-email" className="text-sm font-medium">Email Address</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Address Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                  <User className="h-4 w-4 text-blue-600" />
                  Address Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="edit-street" className="text-sm font-medium">
                      Street Address
                    </Label>
                    <Input
                      id="edit-street"
                      value={formData.streetAddress}
                      onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                      placeholder="e.g., 123 Rizal Street"
                      className="mt-1.5"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="edit-barangay" className="text-sm font-medium">
                      Barangay
                    </Label>
                    <Input
                      id="edit-barangay"
                      value={formData.barangay}
                      onChange={(e) => setFormData({ ...formData, barangay: e.target.value })}
                      placeholder="e.g., Poblacion"
                      className="mt-1.5"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="edit-purok" className="text-sm font-medium">
                      Purok
                    </Label>
                    <Input
                      id="edit-purok"
                      value={formData.purok}
                      onChange={(e) => setFormData({ ...formData, purok: e.target.value })}
                      placeholder="e.g., Purok 1"
                      className="mt-1.5"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label htmlFor="edit-zipcode" className="text-sm font-medium">
                      Zip Code
                    </Label>
                    <Input
                      id="edit-zipcode"
                      value={formData.zipCode}
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                      placeholder="e.g., 9209"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Account Settings Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 border-b pb-2">
                  <Lock className="h-4 w-4 text-blue-600" />
                  Account Settings
                </h3>
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="edit-password" className="text-sm font-medium">New Password (optional)</Label>
                    <div className="relative">
                      <Input
                        id="edit-password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Leave empty to keep current password"
                        className="mt-1.5 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit-role" className="text-sm font-medium">System Role</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: 'ADMIN' | 'PERSONNEL') =>
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERSONNEL">Staff</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-personnel-type" className="text-sm font-medium">Position</Label>
                    <Select
                      value={formData.personnel_types_id || 'none'}
                      onValueChange={(value) =>
                        setFormData({ ...formData, personnel_types_id: value === "none" ? undefined : value })
                      }
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No position</SelectItem>
                        {personnelTypes.map((type) => (
                          <SelectItem key={type.personnel_types_id} value={type.personnel_types_id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdatePersonnel}>
                Update Staff
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SSRSafe >

      {/* View Personnel Dialog */}
      < SSRSafe >
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Staff Details</DialogTitle>
              <DialogDescription>
                View detailed information about this staff member.
              </DialogDescription>
            </DialogHeader>
            {selectedPersonnel && (
              <div className="grid gap-4 py-4">
                {/* Profile Picture Section */}
                <div className="flex justify-center pb-4 border-b">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={selectedPersonnel.avatar || ''} />
                    <AvatarFallback className="text-2xl font-medium">
                      {getInitials(selectedPersonnel.name, selectedPersonnel.email)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="grid gap-2">
                  <Label>Staff ID</Label>
                  <div className="text-sm text-muted-foreground font-mono">
                    {selectedPersonnel.users_id}
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <div>{selectedPersonnel.email}</div>
                </div>
                <div className="grid gap-2">
                  <Label>Full Name</Label>
                  <div>{selectedPersonnel.name || 'No name set'}</div>
                </div>
                <div className="grid gap-2">
                  <Label>System Role</Label>
                  <Badge variant={selectedPersonnel.role === 'ADMIN' ? 'default' : 'secondary'}>
                    {selectedPersonnel.role === 'PERSONNEL' ? 'STAFF' : selectedPersonnel.role}
                  </Badge>
                </div>
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Badge variant={selectedPersonnel.isActive ? 'default' : 'destructive'}>
                    {selectedPersonnel.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {/* Address Information */}
                {(selectedPersonnel.streetAddress || selectedPersonnel.barangay || selectedPersonnel.purok || selectedPersonnel.zipCode) && (
                  <div className="border-t pt-4 mt-4">
                    <Label className="text-base font-semibold mb-3 block">Address Information</Label>
                    <div className="space-y-2">
                      {selectedPersonnel.streetAddress && (
                        <div className="grid gap-1">
                          <Label className="text-xs text-muted-foreground">Street Address</Label>
                          <div className="text-sm">{selectedPersonnel.streetAddress}</div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        {selectedPersonnel.barangay && (
                          <div className="grid gap-1">
                            <Label className="text-xs text-muted-foreground">Barangay</Label>
                            <div className="text-sm">{selectedPersonnel.barangay}</div>
                          </div>
                        )}
                        {selectedPersonnel.purok && (
                          <div className="grid gap-1">
                            <Label className="text-xs text-muted-foreground">Purok</Label>
                            <div className="text-sm">{selectedPersonnel.purok}</div>
                          </div>
                        )}
                      </div>
                      {selectedPersonnel.zipCode && (
                        <div className="grid gap-1">
                          <Label className="text-xs text-muted-foreground">Zip Code</Label>
                          <div className="text-sm">{selectedPersonnel.zipCode}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="grid gap-2 border-t pt-4 mt-4">
                  <Label>Created</Label>
                  <div>{new Date(selectedPersonnel.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                </div>
                <div className="grid gap-2">
                  <Label>Last Updated</Label>
                  <div>{new Date(selectedPersonnel.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SSRSafe >

      {/* Delete Confirmation Dialog */}
      < SSRSafe >
        <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
          setIsDeleteDialogOpen(open)
          if (!open) {
            setPendingDelete(null)
            setDeleteRecordCounts(null)
          }
        }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Delete Staff
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete the staff account.
              </DialogDescription>
            </DialogHeader>
            {pendingDelete && (
              <div className="space-y-4 py-2">
                <div className="text-sm">
                  Are you sure you want to delete
                  {' '}
                  <span className="font-semibold">{pendingDelete.name || pendingDelete.email}</span>
                  ?
                </div>
                <div className="text-xs text-muted-foreground">
                  ID: <span className="font-mono">{pendingDelete.users_id}</span>
                </div>

                {deleteRecordCounts && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-3">
                      ⚠️ Warning: This staff member has existing records
                    </p>
                    <div className="space-y-2 text-sm text-red-800 dark:text-red-200">
                      {deleteRecordCounts.attendance > 0 && (
                        <div className="flex justify-between">
                          <span>Attendance records:</span>
                          <span className="font-semibold">{deleteRecordCounts.attendance}</span>
                        </div>
                      )}
                      {deleteRecordCounts.payroll > 0 && (
                        <div className="flex justify-between">
                          <span>Payroll entries:</span>
                          <span className="font-semibold">{deleteRecordCounts.payroll}</span>
                        </div>
                      )}
                      {deleteRecordCounts.loans > 0 && (
                        <div className="flex justify-between">
                          <span>Loans:</span>
                          <span className="font-semibold">{deleteRecordCounts.loans}</span>
                        </div>
                      )}
                      {deleteRecordCounts.deductions > 0 && (
                        <div className="flex justify-between">
                          <span>Deductions:</span>
                          <span className="font-semibold">{deleteRecordCounts.deductions}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-3 font-medium">
                      All of these records will be permanently deleted. This action cannot be undone.
                    </p>
                  </div>
                )}

                {!deleteRecordCounts && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      This staff member has no attendance, payroll, loan, or deduction records.
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleCancelDelete} className="w-full sm:w-auto">
                Cancel
              </Button>
              {deleteRecordCounts ? (
                <Button
                  variant="destructive"
                  onClick={() => handleConfirmDelete(true)}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Force Delete All
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => handleConfirmDelete(false)}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Staff
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SSRSafe >
    </div >
  )
}


