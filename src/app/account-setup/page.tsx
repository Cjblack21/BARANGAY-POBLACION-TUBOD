'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { Sun, Moon, Monitor, Settings, Mail, User, Lock, Briefcase, Eye, EyeOff, Loader2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PersonnelType {
  personnel_types_id: string
  name: string
  type?: string
  department?: string
  basicSalary: number
  isActive: boolean
}

export default function AccountSetupPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [personnelTypes, setPersonnelTypes] = useState<PersonnelType[]>([])
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [selectedOffice, setSelectedOffice] = useState('')

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'PERSONNEL' as 'ADMIN' | 'PERSONNEL',
    personnelTypeId: ''
  })

  // Derive unique offices from personnel types
  const uniqueOffices = Array.from(new Set(personnelTypes.map(type => {
    const nameParts = type.name.split(': ')
    return nameParts.length === 2 ? nameParts[0] : (type.department || 'N/A')
  }))).sort()

  // Filter positions based on selected office
  const filteredPositions = personnelTypes.filter(type => {
    const nameParts = type.name.split(': ')
    const office = nameParts.length === 2 ? nameParts[0] : (type.department || 'N/A')
    return office === selectedOffice
  })

  useEffect(() => {
    setMounted(true)
    fetchPersonnelTypes()
  }, [])

  const fetchPersonnelTypes = async () => {
    try {
      const response = await fetch('/api/admin/personnel-types', { cache: 'no-store' })
      if (response.ok) {
        const types = await response.json()
        setPersonnelTypes(types)
        if (types.length === 0) {
          toast.error('No personnel types found.')
        }
      } else {
        toast.error('Failed to load personnel types')
      }
    } catch (error) {
      console.error('Error fetching personnel types:', error)
      toast.error('Failed to load personnel types')
    }
  }

  // Generate unique 6-digit personnel ID
  const generatePersonnelId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email || !formData.email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    if (!formData.name || formData.name.trim().length === 0) {
      toast.error('Please enter your full name')
      return
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (!formData.personnelTypeId) {
      toast.error('Please select Office & Position')
      return
    }

    setLoading(true)

    try {
      const personnelId = generatePersonnelId()
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users_id: personnelId,
          email: formData.email.toLowerCase(),
          name: formData.name,
          password: formData.password,
          role: 'PERSONNEL',
          isActive: true,
          personnel_types_id: formData.personnelTypeId
        })
      })

      if (!response.ok) {
        let message = 'Failed to register account'
        try {
          const data = await response.json()
          console.error('Registration failed:', data)
          message = data.error || message
          if (data.details) {
            console.error('Validation details:', data.details)
          }
        } catch (e) {
          console.error('Registration error response:', await response.text())
        }
        toast.error(message)
        return
      }

      const userData = await response.json()
      console.log('Registration successful:', userData)

      toast.success('Account created successfully! Redirecting...')
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (error) {
      console.error('Error creating account:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex">
      {/* Theme Toggle */}
      {mounted && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-6 right-6 z-50 h-10 w-10 rounded-full bg-slate-800/90 hover:bg-slate-700 transition-all duration-300 border border-slate-700"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-amber-500" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-slate-400" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-slate-800/95 backdrop-blur-md border-slate-700">
            <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer gap-2 text-slate-300">
              <Sun className="h-4 w-4 text-amber-500" /> Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer gap-2 text-slate-300">
              <Moon className="h-4 w-4 text-slate-400" /> Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer gap-2 text-slate-300">
              <Monitor className="h-4 w-4 text-slate-500" /> System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Left Side - Register Form */}
      <div className="flex-1 bg-slate-50 dark:bg-[#0a1628] flex items-center justify-center px-4 py-12 transition-colors duration-500">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center space-y-6">

            {/* Logo */}
            <div className="flex justify-center">
              <img src="/brgy-logo.png" alt="Barangay Logo" className="w-40 h-40 object-contain transform translate-y-12" />
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                CREATE ACCOUNT
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Setup your staff profile
              </p>
            </div>

            {/* Form Card */}
            <div className="w-full bg-white dark:bg-white/10 dark:backdrop-blur-xl rounded-2xl p-8 border border-slate-200 dark:border-white/20 shadow-xl">
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="John Doe"
                    className="h-12 bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-white/40 focus-visible:ring-[#00A3B1] focus-visible:border-[#00A3B1]"
                    disabled={loading}
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@example.com"
                    className="h-12 bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-white/40 focus-visible:ring-[#00A3B1] focus-visible:border-[#00A3B1]"
                    disabled={loading}
                  />
                </div>

                {/* Office */}
                <div className="space-y-2">
                  <Label htmlFor="office" className="text-sm font-medium text-slate-700 dark:text-slate-300">Office</Label>
                  <div className="relative">
                    <Select
                      value={selectedOffice}
                      onValueChange={(value) => {
                        setSelectedOffice(value)
                        setFormData({ ...formData, personnelTypeId: '' }) // Reset position when office changes
                      }}
                      disabled={loading || personnelTypes.length === 0}
                    >
                      <SelectTrigger className="h-12 bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white focus:ring-[#00A3B1]">
                        <SelectValue placeholder="Select office" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueOffices.map((office) => (
                          <SelectItem key={office} value={office}>
                            {office}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <Label htmlFor="position" className="text-sm font-medium text-slate-700 dark:text-slate-300">Position</Label>
                  <div className="relative">
                    <Select
                      value={formData.personnelTypeId}
                      onValueChange={(value) => setFormData({ ...formData, personnelTypeId: value })}
                      disabled={loading || !selectedOffice}
                    >
                      <SelectTrigger className="h-12 bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white focus:ring-[#00A3B1]">
                        <SelectValue placeholder={selectedOffice ? "Select position" : "Select office first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPositions.map((type) => {
                          const nameParts = type.name.split(': ')
                          const position = nameParts.length === 2 ? nameParts[1] : type.name
                          return (
                            <SelectItem key={type.personnel_types_id} value={type.personnel_types_id}>
                              {position}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min. 6 characters"
                      className="h-12 bg-slate-100 dark:bg-white/10 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-white/40 focus-visible:ring-[#00A3B1] focus-visible:border-[#00A3B1] pr-10"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-[#00A3B1] to-[#00818c] hover:opacity-90 text-white font-semibold transition-all rounded-lg shadow-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>

                {/* Login Link */}
                <div className="mt-6 text-center text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Already have an account?{" "}
                  </span>
                  <Link
                    href="/"
                    className="font-medium text-[#00A3B1] hover:underline dark:text-[#00A3B1]"
                  >
                    Sign in here
                  </Link>
                </div>
              </form>
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-slate-500 dark:text-slate-500">
              © 2026 PMS. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Illustration */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#00A3B1] via-[#41BD87] to-[#82D65A] items-center justify-center p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1.5" fill="white" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-2xl text-center space-y-12">
          {/* Animated Gears */}
          <div className="relative h-64 flex items-center justify-center">
            {/* Large Gear - Center */}
            <Settings className="absolute w-48 h-48 text-white animate-spin-slow" style={{ animationDuration: '10s' }} />

            {/* Medium Gear - Top Right */}
            <Settings className="absolute w-32 h-32 text-white/90 top-4 right-20 animate-spin-slow" style={{ animationDuration: '7s', animationDirection: 'reverse' }} />

            {/* Small Gear - Bottom Left */}
            <Settings className="absolute w-24 h-24 text-white/85 bottom-8 left-16 animate-spin-slow" style={{ animationDuration: '6s' }} />
          </div>

          {/* Text Content */}
          <div className="space-y-6">
            <h2 className="text-5xl font-bold text-white leading-tight">
              TUBOD BARANGAY POBLACION PMS
            </h2>
            <p className="text-xl text-white/90 max-w-lg mx-auto">
              Streamline your payroll process with our comprehensive management system
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
