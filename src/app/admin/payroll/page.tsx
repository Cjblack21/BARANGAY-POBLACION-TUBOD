'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Calendar, Clock, Banknote, FileText, Archive, Printer, Download, Settings, Save, Eye, CheckCircle2, Trash2, CheckSquare, Square, MoreVertical, Search, X, AlertCircle, Users, TrendingUp, ClipboardMinus, CalendarRange, Activity, Edit2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getPayrollSummary, releasePayrollWithAudit, generatePayslips } from '@/lib/actions/payroll'
import {
  toPhilippinesDateString,
  calculatePeriodDurationInPhilippines,
  formatDateForDisplay,
  calculateWorkingDaysInPhilippines
} from '@/lib/timezone'
import { Label } from '@/components/ui/label'
import PayrollBreakdownDialog from '@/components/payroll/PayrollBreakdownDialog'
import ArchivedPayrollDetailsDialog from '@/components/payroll/ArchivedPayrollDetailsDialog'
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { DateRange } from "react-day-picker"
import { addDays, format, parseISO, differenceInDays } from "date-fns"

// Types
type PayrollEntry = {
  users_id: string
  name: string
  email: string
  avatar?: string | null
  personnelType?: string
  personnelTypeCategory?: 'TEACHING' | 'NON_TEACHING' | null
  department?: string | null
  totalWorkHours: number
  finalNetPay: number
  totalSalary?: number // Net pay from backend calculation
  status: 'Pending' | 'Released' | 'Archived'
  breakdown: {
    basicSalary: number
    monthlyBasicSalary?: number // Monthly reference (optional)
    overloadPay?: number // Total additional pay
    overloadPayDetails?: Array<{ type: string, amount: number }> // Additional pay breakdown by type
    grossPay?: number // Total gross pay (basic + overload)
    loanDeductions: number
    otherDeductions: number
    totalDeductions?: number // Total of all deductions
    netPay?: number // Calculated net pay from backend
    loanDetails: LoanDetail[]
    otherDeductionDetails: DeductionDetail[]
    attendanceDeductions: number
    attendanceDetails: any[]
  }
}

type LoanDetail = {
  type: string
  amount: number
  remainingBalance: number
}

type DeductionDetail = {
  type: string
  amount: number
  description: string
}

type PayrollPeriod = {
  periodStart: string
  periodEnd: string
  type: 'Weekly' | 'Semi-Monthly' | 'Monthly' | 'Custom'
  status?: 'Pending' | 'Released' | 'Archived'
}

type ArchivedPayroll = {
  id: string
  periodStart: string
  periodEnd: string
  totalEmployees: number
  totalGrossSalary: number
  totalExpenses: number
  totalDeductions: number
  totalDatabaseDeductions: number
  totalLoanPayments: number
  totalNetPay: number
  releasedAt: string
  releasedBy: string
  archivedAt: string
  payrolls?: any[] // Individual personnel payroll entries
}

export default function PayrollPage() {
  const router = useRouter()
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([])
  const [archivedPayrolls, setArchivedPayrolls] = useState<ArchivedPayroll[]>([])
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null)
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('current')
  const [hasGeneratedForSettings, setHasGeneratedForSettings] = useState(false)
  const [breakdownDialogOpen, setBreakdownDialogOpen] = useState(false)
  const [openInEditMode, setOpenInEditMode] = useState(false)
  const [liveDeductions, setLiveDeductions] = useState<any[]>([])
  const [deductionTypes, setDeductionTypes] = useState<any[]>([])
  const [personnelTypesMap, setPersonnelTypesMap] = useState<Map<string, any>>(new Map())
  const [totalEmployees, setTotalEmployees] = useState(0)

  // Reschedule state
  const [nextPeriodType, setNextPeriodType] = useState('Semi-Monthly')
  const [nextPeriodStart, setNextPeriodStart] = useState('')
  const [nextPeriodEnd, setNextPeriodEnd] = useState('')
  const [nextPeriodNotes, setNextPeriodNotes] = useState('')

  // Payroll Time Settings state
  const [payrollPeriodStart, setPayrollPeriodStart] = useState('')
  const [payrollPeriodEnd, setPayrollPeriodEnd] = useState('')
  const [payrollReleaseTime, setPayrollReleaseTime] = useState('17:00')
  const [originalReleaseTime, setOriginalReleaseTime] = useState('17:00') // Store original time-out end time
  const [savingPeriod, setSavingPeriod] = useState(false)
  const [canRelease, setCanRelease] = useState(false)
  const [settingsCustomDays, setSettingsCustomDays] = useState('')
  const [timeUntilRelease, setTimeUntilRelease] = useState('')
  const [customSeconds, setCustomSeconds] = useState('10')
  const [now, setNow] = useState(new Date())
  const [hasShownReleaseModal, setHasShownReleaseModal] = useState(false)
  const [hasAutoReleased, setHasAutoReleased] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewMode, setPreviewMode] = useState<'all' | 'single'>('all')
  const [previewSearch, setPreviewSearch] = useState('')
  const [previewStaffCount, setPreviewStaffCount] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [previewScale, setPreviewScale] = useState(1)
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const previewContainerRef = useRef<HTMLDivElement | null>(null)
  const [selectedArchives, setSelectedArchives] = useState<string[]>([])
  const [isSelectAll, setIsSelectAll] = useState(false)
  const [archivedBreakdownOpen, setArchivedBreakdownOpen] = useState(false)
  const [selectedArchivedPeriod, setSelectedArchivedPeriod] = useState<any>(null)
  const [archivedPersonnelList, setArchivedPersonnelList] = useState<any[]>([])
  const [selectedArchivedEntry, setSelectedArchivedEntry] = useState<any>(null)
  const [selectedPersonnelForPeriods, setSelectedPersonnelForPeriods] = useState<any>(null)
  const [showDeleteArchiveModal, setShowDeleteArchiveModal] = useState(false)
  const [archiveSearchTerm, setArchiveSearchTerm] = useState('')
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState('')
  const [periodSearchTerm, setPeriodSearchTerm] = useState('')
  const [archivedBreakdownSearchTerm, setArchivedBreakdownSearchTerm] = useState('')
  const [newArchivedPayrollId, setNewArchivedPayrollId] = useState<string | null>(null)
  const [showArchiveNotification, setShowArchiveNotification] = useState(false)
  const [hasViewedNewestPayroll, setHasViewedNewestPayroll] = useState(false)
  const [showReleaseConfirmModal, setShowReleaseConfirmModal] = useState(false)
  const [includeAttendanceDeductions, setIncludeAttendanceDeductions] = useState(true)
  const [attendanceDeductions, setAttendanceDeductions] = useState<any[]>([])
  const [liveLoans, setLiveLoans] = useState<any[]>([])
  const [liveOverloadPays, setLiveOverloadPays] = useState<any[]>([])
  const [liveDataLoaded, setLiveDataLoaded] = useState(false)

  // Generate payroll confirmation modal state
  const [showGenerateConfirmModal, setShowGenerateConfirmModal] = useState(false)
  const [confirmPeriodStart, setConfirmPeriodStart] = useState('')
  const [confirmPeriodEnd, setConfirmPeriodEnd] = useState('')
  const [periodValidationError, setPeriodValidationError] = useState('')
  const todayPHString = useMemo(() => toPhilippinesDateString(new Date()), [])
  const readyToGenerate = useMemo(
    () => !!payrollPeriodStart && !!payrollPeriodEnd && !hasGeneratedForSettings,
    [payrollPeriodStart, payrollPeriodEnd, hasGeneratedForSettings]
  )

  // Pan/Drag handlers for free view
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPanPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  const resetPan = () => {
    setPanPosition({ x: 0, y: 0 })
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setPreviewScale(s => Math.max(0.5, Math.min(2.5, Number((s + delta).toFixed(2)))))
    }
  }

  // Utility: inject CSS to remove scrollbars/margins in preview HTML
  const injectPreviewStyles = (html: string) => {
    const style = `\n<style>
html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
/* Hide scrollbars - Chromium/WebKit */
::-webkit-scrollbar { width: 0 !important; height: 0 !important; background: transparent !important; }
::-webkit-scrollbar-thumb { background: transparent !important; }
/* Hide scrollbars - Firefox */
* { scrollbar-width: none !important; }
@page { margin: 0 !important; }
</style>\n`;
    if (!html) return html
    return html.includes('</head>') ? html.replace('</head>', `${style}</head>`) : `${style}${html}`
  }

  // Remove any auto-print scripts from HTML when previewing
  const sanitizeForPreview = (html: string) => {
    if (!html) return html
    // Remove any <script> tags (prevents window.print on load)
    return html.replace(/<script[\s\S]*?<\/script>/gi, '')
  }

  // Consolidated function to clear archive notification
  const clearArchiveNotification = () => {
    setHasViewedNewestPayroll(true)
    setShowArchiveNotification(false)
    setNewArchivedPayrollId(null)
    localStorage.removeItem('hasNewArchivedPayroll')
  }

  // Calculate user deductions and net pay
  const calculateUserPayroll = (userId: string, basicSalary: number, overloadPay: number) => {
    // Safety checks to ensure arrays exist
    const safeLiveDeductions = Array.isArray(liveDeductions) ? liveDeductions : []
    const safeLiveLoans = Array.isArray(liveLoans) ? liveLoans : []

    // ⚠️ ATTENDANCE DEDUCTION AUTO-CALCULATION DISABLED
    // Attendance deductions are NO LONGER automatically calculated from live attendance data
    // They must be manually added through the deductions system
    const attendanceDeductionAmount = 0

    // Get all other deductions (including manually added attendance deductions if any)
    const userDeductions = safeLiveDeductions.filter((d: any) => d.users_id === userId && !d.archivedAt)
    const otherDeductionsAmount = userDeductions.reduce((sum, d) => sum + Number(d.amount || 0), 0)

    const userLoans = safeLiveLoans.filter((l: any) => l.users_id === userId && l.status === 'ACTIVE')
    const loanPayments = userLoans.reduce((sum, loan) => {
      const monthlyPayment = (Number(loan.amount) * Number(loan.monthlyPaymentPercent)) / 100
      return sum + monthlyPayment
    }, 0)

    console.log(`🔍 calculateUserPayroll for ${userId}:`)
    console.log(`  📊 Attendance Auto-Calc: DISABLED (always ₱0)`)
    console.log(`  📊 Live Deductions (${userDeductions.length}):`, userDeductions.map((d: any) => `${d.deduction_types?.name || 'Unknown'}: ₱${d.amount}`))
    console.log(`  📊 Live Loans (${userLoans.length}):`, userLoans.map((l: any) => `₱${l.amount} @ ${l.monthlyPaymentPercent}%`))

    const totalDeductions = attendanceDeductionAmount + otherDeductionsAmount + loanPayments
    const netPay = basicSalary + overloadPay - totalDeductions

    return { attendanceDeductionAmount, otherDeductionsAmount, loanPayments, totalDeductions, netPay }
  }

  // Load deduction types for mandatory flag lookup
  const loadDeductionTypes = async () => {
    try {
      const response = await fetch('/api/admin/deduction-types')
      if (response.ok) {
        const types = await response.json()
        setDeductionTypes(types)
        console.log('🔍 Loaded deduction types:', types.length)
      }
    } catch (error) {
      console.error('Error loading deduction types:', error)
    }
  }

  // Load personnel types for department and position info
  const loadPersonnelTypes = async () => {
    try {
      const response = await fetch('/api/personnel-types')
      if (response.ok) {
        const types = await response.json()
        const map = new Map()
        types.forEach((type: any) => {
          map.set(type.personnel_types_id, {
            name: type.name,
            type: type.type,
            department: type.department
          })
        })
        setPersonnelTypesMap(map)
        console.log('🔍 Loaded personnel types:', types.length)
      }
    } catch (error) {
      console.error('Error loading personnel types:', error)
    }
  }

  // Consolidated function to load all live data
  const loadLiveData = async () => {
    try {
      // Attendance deductions API call removed - auto-calculation is disabled
      const [loansRes, deductionsRes, overloadRes] = await Promise.all([
        fetch('/api/admin/loans'),
        fetch('/api/admin/deductions'),
        fetch('/api/admin/overload-pay')
      ])

      // Attendance deductions no longer loaded - auto-calc disabled
      setAttendanceDeductions([])
      
      if (loansRes.ok) {
        const data = await loansRes.json()
        setLiveLoans(Array.isArray(data) ? data : (data.items || data.loans || data.data || []))
      }
      if (deductionsRes.ok) {
        const data = await deductionsRes.json()
        setLiveDeductions(Array.isArray(data) ? data : (data.deductions || data.data || []))
      }
      if (overloadRes.ok) {
        const data = await overloadRes.json()
        setLiveOverloadPays(Array.isArray(data) ? data : (data.overloadPays || data.data || []))
      }
      setLiveDataLoaded(true)
    } catch (error) {
      console.error('Error loading live data:', error)
      // Set empty arrays on error to prevent filter errors
      setAttendanceDeductions([])
      setLiveLoans([])
      setLiveDeductions([])
      setLiveOverloadPays([])
      setLiveDataLoaded(true) // Still set as loaded even on error
    }
  }

  // Consolidated payroll data loading function
  const loadPayrollData = async (periodStart?: string, periodEnd?: string) => {
    try {
      setLoading(true)
      console.log('🔍 Loading payroll data...')

      // Build URL with period dates if provided
      let url = '/api/admin/payroll/current'
      const start = periodStart || payrollPeriodStart
      const end = periodEnd || payrollPeriodEnd

      if (start && end) {
        const params = new URLSearchParams({ periodStart: start, periodEnd: end })
        url = `${url}?${params.toString()}`
        console.log('🔍 Using period:', start, 'to', end)
      }

      // Fetch actual stored payroll entries from database
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch payroll data')
      }

      const result = await response.json()
      console.log('🔍 Payroll result:', result)

      if (!result.success) {
        console.error('❌ Payroll load failed:', result.error)
        throw new Error(result.error || 'Failed to load payroll data')
      }

      // Map payroll entries from API response
      const entries: PayrollEntry[] = (result.entries || []).map((entry: any) => ({
        users_id: entry.users_id,
        name: entry.name,
        email: entry.email,
        personnelType: entry.personnelType || 'N/A',
        personnelTypeCategory: entry.personnelTypeCategory || null,
        department: entry.department || null,
        totalWorkHours: Number(entry.totalWorkHours ?? 0),
        finalNetPay: Number(entry.finalNetPay ?? 0),
        status: entry.status || 'Pending',
        breakdown: entry.breakdown || {}
      }))

      setPayrollEntries(entries)

      // Update state from API response
      const summary = result.summary || result.period
      if (summary) {
        setCurrentPeriod({
          periodStart: summary.periodStart,
          periodEnd: summary.periodEnd,
          type: summary.type || 'Semi-Monthly',
          status: summary.status || (entries.length > 0 ? entries[0].status : 'Pending')
        })

        if (result.summary?.settings) {
          setPayrollPeriodStart(result.summary.settings.periodStart)
          setPayrollPeriodEnd(result.summary.settings.periodEnd)
          setHasGeneratedForSettings(result.summary.settings.hasGeneratedForSettings || false)
          setTotalEmployees(result.summary.totalEmployees || 0)
        } else {
          setPayrollPeriodStart(summary.periodStart)
          setPayrollPeriodEnd(summary.periodEnd)
          // Only mark as generated if there are entries AND they have valid data
          // Empty or placeholder entries should not count as "generated"
          setHasGeneratedForSettings(false)
          setTotalEmployees(0)
        }

        setPayrollReleaseTime('17:00')
        setOriginalReleaseTime('17:00')
      }
    } catch (error) {
      console.error('❌ Error loading payroll data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load payroll data'
      console.error('❌ Error details:', errorMessage)
      toast.error(`Failed to load payroll: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Automatic release function (called when countdown hits zero)
  const handleAutoReleasePayroll = async () => {
    try {
      setLoading(true)
      toast.loading('Auto-releasing payroll...', { id: 'auto-release-payroll' })

      // Calculate next period dates automatically
      let calculatedNextStart = ''
      let calculatedNextEnd = ''

      if (currentPeriod?.periodStart && currentPeriod?.periodEnd) {
        const start = new Date(currentPeriod.periodStart)
        const end = new Date(currentPeriod.periodEnd)
        const durationDays = calculatePeriodDurationInPhilippines(start, end)
        const nextStart = new Date(end)
        nextStart.setDate(end.getDate() + 1)
        const nextEnd = new Date(nextStart)
        nextEnd.setDate(nextStart.getDate() + durationDays - 1)

        calculatedNextStart = toPhilippinesDateString(nextStart)
        calculatedNextEnd = toPhilippinesDateString(nextEnd)
      }

      // Release payroll with auto-calculated next period
      const result = await releasePayrollWithAudit(calculatedNextStart, calculatedNextEnd)
      if (!result.success) {
        throw new Error(result.error || 'Failed to auto-release payroll')
      }

      toast.success(`🎉 Payroll auto-released successfully for ${result.releasedCount} staff!`, { id: 'auto-release-payroll' })

      // Update to next period
      setPayrollPeriodStart(calculatedNextStart)
      setPayrollPeriodEnd(calculatedNextEnd)

      // Save the new period to localStorage for persistence
      localStorage.setItem('payroll_period_start', calculatedNextStart)
      localStorage.setItem('payroll_period_end', calculatedNextEnd)

      setCurrentPeriod({
        periodStart: calculatedNextStart,
        periodEnd: calculatedNextEnd,
        type: currentPeriod?.type || 'Semi-Monthly',
        status: 'Pending'
      })

      // Clear entries and reset for next generation
      setPayrollEntries([])
      setHasGeneratedForSettings(false)
      setHasAutoReleased(false)

      console.log('✅ Payroll auto-released and archived! Ready for next period:', { calculatedNextStart, calculatedNextEnd })

      // Load archived payrolls after a delay to ensure database has updated
      setTimeout(async () => {
        await loadArchivedPayrolls()
        console.log('✅ Archived payrolls reloaded after auto-release')
      }, 1000)

      // Show print prompt for the archived payroll
      promptPrintPayslips()

    } catch (error) {
      console.error('Error auto-releasing payroll:', error)
      toast.error(`Failed to auto-release payroll: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'auto-release-payroll' })
    } finally {
      // Delay loading false to ensure modal has time to render
      setTimeout(() => setLoading(false), 100)
    }
  }

  // Show release confirmation modal
  const showReleaseConfirmation = async () => {
    // Fetch attendance deductions to show in modal
    try {
      const res = await fetch('/api/admin/attendance-deductions')
      if (res.ok) {
        const data = await res.json()
        setAttendanceDeductions(data.deductions || [])
      }
    } catch (error) {
      console.error('Failed to fetch attendance deductions:', error)
    }
    setShowReleaseConfirmModal(true)
  }

  // Release payroll - automatically calculate next period dates
  const handleReleasePayroll = async () => {
    setShowReleaseConfirmModal(false)
    try {
      setLoading(true)
      toast.loading('Releasing payroll...', { id: 'release-payroll' })

      // Auto-calculate next period dates based on current period duration
      let nextStart = ''
      let nextEnd = ''

      if (currentPeriod?.periodStart && currentPeriod?.periodEnd) {
        const start = new Date(currentPeriod.periodStart)
        const end = new Date(currentPeriod.periodEnd)
        const durationDays = calculatePeriodDurationInPhilippines(start, end)
        const nextStartDate = new Date(end)
        nextStartDate.setDate(end.getDate() + 1)
        const nextEndDate = new Date(nextStartDate)
        nextEndDate.setDate(nextStartDate.getDate() + durationDays - 1)

        nextStart = toPhilippinesDateString(nextStartDate)
        nextEnd = toPhilippinesDateString(nextEndDate)

        console.log('🔍 AUTO RELEASE - Period calculation:', {
          currentStart: start.toISOString(),
          currentEnd: end.toISOString(),
          durationDays,
          nextStart: nextStartDate.toISOString(),
          nextEnd: nextEndDate.toISOString(),
          nextStartString: nextStart,
          nextEndString: nextEnd
        })
      }

      // Release with auto-calculated dates and attendance deduction preference
      console.log('🔍 Releasing payroll with attendance deductions:', includeAttendanceDeductions)
      const result = await releasePayrollWithAudit(nextStart, nextEnd, includeAttendanceDeductions)
      if (!result.success) {
        throw new Error(result.error || 'Failed to release payroll')
      }

      toast.success(`Payroll released successfully for ${result.releasedCount} staff! You can now print payslips.`, { id: 'release-payroll' })

      // Show notification about new archived payroll
      toast.success('New archived payroll ready to be printed!', { duration: 5000 })

      // Set notification badge flag
      console.log('🔴 SETTING showArchiveNotification to TRUE after release')
      setShowArchiveNotification(true)
      setHasViewedNewestPayroll(false) // Reset when new payroll is released
      localStorage.setItem('hasNewArchivedPayroll', 'true') // Set sidebar notification

      // Update payroll period settings with the new period dates
      setPayrollPeriodStart(nextStart)
      setPayrollPeriodEnd(nextEnd)

      // Save the new period to localStorage for persistence
      localStorage.setItem('payroll_period_start', nextStart)
      localStorage.setItem('payroll_period_end', nextEnd)

      // Update current period to show the NEXT period (ready for new generation)
      setCurrentPeriod({
        periodStart: nextStart,
        periodEnd: nextEnd,
        type: currentPeriod?.type || 'Semi-Monthly',
        status: 'Pending'
      })

      // Clear current payroll entries since they're now archived
      setPayrollEntries([])

      // Reset states for next generation
      setHasGeneratedForSettings(false)
      setTimeUntilRelease('')
      setCanRelease(false)
      setHasShownReleaseModal(false)
      setHasAutoReleased(false)

      console.log('✅ Payroll released and archived! Ready to generate for next period:', { nextStart, nextEnd })

      // Load archived payrolls to get the newly created archive
      // Add a small delay to ensure the archive is created in the database
      setTimeout(async () => {
        try {
          await loadArchivedPayrolls() // Reload the full archived payrolls list

          // Then fetch again to get the newest ID for notification
          const res = await fetch('/api/admin/payroll/archived')
          if (res.ok) {
            const data = await res.json()
            console.log('🔔 Notification Debug - Archived payrolls data:', data)
            if (data.success && data.archivedPayrolls && data.archivedPayrolls.length > 0) {
              // Set the most recent archived payroll as new
              const newId = data.archivedPayrolls[0].id
              console.log('🔔 Setting new archived payroll ID:', newId)
              setNewArchivedPayrollId(newId)
              console.log('🔔 State should now show red dot for ID:', newId)
            } else {
              console.log('🔔 No archived payrolls found or data not successful')
            }
          } else {
            console.log('🔔 Fetch archived payrolls failed with status:', res.status)
          }
        } catch (error) {
          console.error('🔔 Error fetching archived payrolls:', error)
        }
      }, 1000)

      // Show print prompt (modal + native fallback)
      promptPrintPayslips()

    } catch (error) {
      console.error('Error releasing payroll:', error)
      toast.error(`Failed to release payroll: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'release-payroll' })
    } finally {
      // Delay loading false to ensure modal has time to render
      setTimeout(() => setLoading(false), 100)
    }
  }

  // Archive released payroll
  const handleArchivePayroll = async () => {
    try {
      if (!currentPeriod?.periodStart || !currentPeriod?.periodEnd) {
        toast.error('No payroll period found to archive')
        return
      }

      if (currentPeriod.status !== 'Released') {
        toast.error('Only released payroll can be archived')
        return
      }

      setLoading(true)
      toast.loading('Archiving payroll...', { id: 'archive-payroll' })

      const res = await fetch('/api/admin/payroll/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: currentPeriod.periodStart,
          periodEnd: currentPeriod.periodEnd
        })
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to archive payroll')
      }

      toast.success(`Payroll archived successfully for ${data.archivedCount} staff!`, { id: 'archive-payroll' })

      // Reload data to update UI
      await loadPayrollData()

    } catch (error) {
      console.error('Error archiving payroll:', error)
      toast.error(`Failed to archive payroll: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'archive-payroll' })
    } finally {
      setLoading(false)
    }
  }

  // Check if period overlaps with archived payrolls
  const checkPeriodOverlap = (startDate: string, endDate: string): boolean => {
    if (!startDate || !endDate) return false

    const start = new Date(startDate)
    const end = new Date(endDate)

    // Check against archived payrolls
    for (const archived of archivedPayrolls) {
      const archivedStart = new Date(archived.periodStart)
      const archivedEnd = new Date(archived.periodEnd)

      // Check if periods overlap
      if ((start <= archivedEnd && end >= archivedStart)) {
        return true
      }
    }

    return false
  }

  // Smart suggestion function for next payroll period (30 days)
  const suggestNextPeriod = () => {
    if (archivedPayrolls.length === 0) {
      // No archived payrolls - suggest next 30 days from today
      const today = new Date()
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const end = new Date(start)
      end.setDate(start.getDate() + 29) // 30 days total (start day + 29 more days)

      setConfirmPeriodStart(format(start, 'yyyy-MM-dd'))
      setConfirmPeriodEnd(format(end, 'yyyy-MM-dd'))

      toast.success('Suggested 30-day period from today')
      setPeriodValidationError('')
      return
    }

    // Get the most recent archived payroll
    const sortedArchived = [...archivedPayrolls].sort((a, b) =>
      new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime()
    )
    const lastPayroll = sortedArchived[0]
    const lastEnd = new Date(lastPayroll.periodEnd)

    // Suggest next 30 days starting from the day after the last period ended
    const suggestedStart = new Date(lastEnd)
    suggestedStart.setDate(lastEnd.getDate() + 1)

    const suggestedEnd = new Date(suggestedStart)
    suggestedEnd.setDate(suggestedStart.getDate() + 29) // 30 days total

    const startStr = format(suggestedStart, 'yyyy-MM-dd')
    const endStr = format(suggestedEnd, 'yyyy-MM-dd')

    setConfirmPeriodStart(startStr)
    setConfirmPeriodEnd(endStr)

    // Check for overlap
    if (checkPeriodOverlap(startStr, endStr)) {
      const overlapping = archivedPayrolls.find(archived => {
        const start = new Date(startStr)
        const end = new Date(endStr)
        const archivedStart = new Date(archived.periodStart)
        const archivedEnd = new Date(archived.periodEnd)
        return (start <= archivedEnd && end >= archivedStart)
      })
      if (overlapping) {
        const monthYear = new Date(overlapping.periodStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        setPeriodValidationError(`The period ${monthYear} has already been released.`)
        toast.error('Suggested period overlaps with existing payroll')
      } else {
        setPeriodValidationError('')
        toast.success('Next 30-day period suggested successfully!')
      }
    } else {
      setPeriodValidationError('')
      toast.success('Next 30-day period suggested successfully!')
    }
  }



  // Show modal to confirm period dates before generating
  const handleGeneratePayroll = () => {
    // Default: Pre-fill modal with current period dates
    let start = payrollPeriodStart
    let end = payrollPeriodEnd
    let isAutoSuggested = false

    // check smart suggestion
    if (start && end && archivedPayrolls.length > 0) {
      // Check if the current intended period overlaps with any ALREADY released period
      const overlaps = archivedPayrolls.some(archived => {
        const s = new Date(start)
        const e = new Date(end)
        const aStart = new Date(archived.periodStart)
        const aEnd = new Date(archived.periodEnd)
        return (s <= aEnd && e >= aStart)
      })

      if (overlaps) {
        // Find the LATEST archived period to determine the pattern
        // Assuming archivedPayrolls is sorted, or we sort it now to be safe
        const sortedArchives = [...archivedPayrolls].sort((a, b) =>
          new Date(b.periodEnd).getTime() - new Date(a.periodEnd).getTime()
        )
        const latest = sortedArchives[0]
        const latestEnd = new Date(latest.periodEnd)

        // Calculate Duration of the latest period (e.g. 15 days, 30 days)
        const durationDays = differenceInDays(new Date(latest.periodEnd), new Date(latest.periodStart))

        // Suggest NEXT period: Latest End + 1 Day
        const newStart = addDays(latestEnd, 1)
        const newEnd = addDays(newStart, durationDays)

        start = format(newStart, 'yyyy-MM-dd')
        end = format(newEnd, 'yyyy-MM-dd')
        isAutoSuggested = true
      }
    }

    setConfirmPeriodStart(start)
    setConfirmPeriodEnd(end)
    setPeriodValidationError('')
    setShowGenerateConfirmModal(true)

    if (isAutoSuggested) {
      toast('Current period already done! Suggesting next period.', {
        icon: '✨',
        duration: 5000,
        style: {
          background: '#3b82f6',
          color: '#fff',
        }
      })
    }
  }

  // Actually generate payroll after confirmation
  const confirmGeneratePayroll = async () => {
    // Validate period doesn't overlap with archived payrolls
    if (checkPeriodOverlap(confirmPeriodStart, confirmPeriodEnd)) {
      const overlappingPeriod = archivedPayrolls.find(archived => {
        const start = new Date(confirmPeriodStart)
        const end = new Date(confirmPeriodEnd)
        const archivedStart = new Date(archived.periodStart)
        const archivedEnd = new Date(archived.periodEnd)
        return (start <= archivedEnd && end >= archivedStart)
      })

      if (overlappingPeriod) {
        const monthYear = new Date(overlappingPeriod.periodStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        setPeriodValidationError(`The period ${monthYear} has already been released. Please choose a future date that doesn't overlap with existing payroll periods.`)
        return
      }
    }

    setShowGenerateConfirmModal(false)

    try {
      setLoading(true)
      setHasShownReleaseModal(true)
      toast.loading('Generating payroll...', { id: 'generate-payroll' })

      // Use the confirmed period dates from modal
      const requestBody = {
        userConfirmed: true,
        periodStart: confirmPeriodStart,
        periodEnd: confirmPeriodEnd
      }

      console.log('🔍 Generating payroll with period:', requestBody)

      // Call API endpoint to generate payroll
      const res = await fetch('/api/admin/payroll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate payroll')
      }

      toast.success(data.message || 'Payroll generated successfully!', { id: 'generate-payroll' })

      // Update the period dates with confirmed values FIRST
      setPayrollPeriodStart(confirmPeriodStart)
      setPayrollPeriodEnd(confirmPeriodEnd)
      localStorage.setItem('payroll_period_start', confirmPeriodStart)
      localStorage.setItem('payroll_period_end', confirmPeriodEnd)

      // Force refresh ALL data with the new period dates
      await Promise.all([
        loadPayrollData(confirmPeriodStart, confirmPeriodEnd),
        loadArchivedPayrolls(),
        loadLiveData() // Reload live data for fresh calculations
      ])

      // Update state immediately
      setHasGeneratedForSettings(true)
      setHasShownReleaseModal(false)

      console.log('✅ Payroll generated and data refreshed successfully')

    } catch (error) {
      console.error('Error generating payroll:', error)
      toast.error(`Failed to generate payroll: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'generate-payroll' })
      setHasShownReleaseModal(false)
    } finally {
      setLoading(false)
    }
  }

  // Generate payslips and show preview modal
  const handleGeneratePayslips = async (options?: { bypassReleaseCheck?: boolean }) => {
    try {
      console.log('🖨️ Print Payslips button clicked!')

      // Get the most recent archived payroll (released payroll) instead of currentPeriod
      // currentPeriod may contain the NEXT period dates after release
      let periodToUse = currentPeriod

      // If currentPeriod is not Released, fetch the most recent archived payroll
      if (!currentPeriod?.periodStart || !currentPeriod?.periodEnd || currentPeriod?.status !== 'Released') {
        console.log('🔍 Current period is not released. Fetching most recent archived payroll...')
        try {
          const archivedRes = await fetch('/api/admin/payroll/archived')
          if (archivedRes.ok) {
            const archivedData = await archivedRes.json()
            if (archivedData.success && archivedData.archivedPayrolls && archivedData.archivedPayrolls.length > 0) {
              const mostRecent = archivedData.archivedPayrolls[0]
              periodToUse = {
                periodStart: mostRecent.periodStart,
                periodEnd: mostRecent.periodEnd,
                type: 'Semi-Monthly',
                status: 'Released'
              }
              console.log('✅ Using most recent archived payroll period:', periodToUse)
            } else {
              toast.error('No released payroll found. Please release payroll first.', { id: 'generate-payslips' })
              console.error('❌ No archived payrolls found')
              return
            }
          } else {
            toast.error('Failed to fetch archived payroll.', { id: 'generate-payslips' })
            return
          }
        } catch (error) {
          console.error('❌ Error fetching archived payroll:', error)
          toast.error('Failed to fetch archived payroll.', { id: 'generate-payslips' })
          return
        }
      }

      if (!periodToUse?.periodStart || !periodToUse?.periodEnd) {
        toast.error('No payroll period found. Please generate payroll first.', { id: 'generate-payslips' })
        console.error('❌ Missing period data:', periodToUse)
        return
      }

      setLoading(true)
      toast.loading('Generating payslips for Long Bond Paper...', { id: 'generate-payslips' })

      console.log('🔍 Generate Payslips Debug:', {
        periodToUse,
        payrollEntries: payrollEntries.length,
        releasedEntries: payrollEntries.filter(e => e.status === 'Released').length,
        statuses: payrollEntries.map(e => e.status)
      })

      // Use the screenshot route which has proper layout
      console.log('📡 Calling print-screenshot API...')
      const response = await fetch('/api/admin/payroll/print-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodStart: periodToUse.periodStart,
          periodEnd: periodToUse.periodEnd
        })
      })

      console.log('📡 API Response status:', response.status, response.ok)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Payslip generation error - Status:', response.status, 'Response:', errorText)
        let errorData: any = {}
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          console.error('Failed to parse error response as JSON')
        }
        throw new Error(errorData.error || errorData.details || `Failed to generate payslips (Status: ${response.status})`)
      }

      // Get the HTML content from the response and show preview modal
      const rawHtml = await response.text()
      const htmlContent = injectPreviewStyles(sanitizeForPreview(rawHtml))
      console.log('✅ Received HTML content, length:', htmlContent.length)

      // Extract staff count from HTML by counting payslip sections
      // Try multiple patterns to handle different HTML formats
      let staffCount = 0
      const patterns = [
        /class="payslip"/g,
        /class='payslip'/g,
        /class=\\"payslip\\"/g,
        /<div[^>]*payslip[^>]*>/g
      ]

      for (const pattern of patterns) {
        const matches = htmlContent.match(pattern)
        if (matches && matches.length > 0) {
          staffCount = matches.length
          console.log('📊 Detected staff count using pattern:', pattern, '=', staffCount)
          break
        }
      }

      if (staffCount === 0) {
        console.warn('⚠️ Could not detect staff count from HTML, using fallback')
        // Fallback: try to count by looking for staff names or IDs
        const staffIdMatches = htmlContent.match(/Staff ID:/g)
        staffCount = staffIdMatches ? staffIdMatches.length : 0
      }

      console.log('📊 Final staff count:', staffCount)

      setPreviewHtml(htmlContent)
      setPreviewStaffCount(staffCount)
      setShowPreviewModal(true)

      // Dismiss loading toast after preview opens
      toast.dismiss('generate-payslips')

      // Clear notification badge when user views the payslip
      console.log('🔔 Clearing notification - user opened payslip preview')
      clearArchiveNotification()
    } catch (error) {
      console.error('Error generating payslips:', error)
      toast.error(`Failed to generate payslips: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'generate-payslips', duration: 5000 })
    } finally {
      setLoading(false)
    }
  }


  // Load archived payrolls
  const loadArchivedPayrolls = async () => {
    try {
      console.log('🔄 Loading archived payrolls...')
      // Fetch archived payrolls from database with cache-busting
      const response = await fetch(`/api/admin/payroll/archived?_t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      })

      console.log('📡 Archived payrolls API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Failed to load archived payrolls:', errorText)
        throw new Error('Failed to load archived payrolls')
      }

      const data = await response.json()
      console.log('✅ Loaded archived payrolls response:', {
        success: data.success,
        count: data.archivedPayrolls?.length,
        totalCount: data.totalCount,
        rawData: data,
        firstPeriod: data.archivedPayrolls?.[0] ? {
          periodStart: data.archivedPayrolls[0].periodStart,
          periodEnd: data.archivedPayrolls[0].periodEnd,
          totalEmployees: data.archivedPayrolls[0].totalEmployees,
          payrollsCount: data.archivedPayrolls[0].payrolls?.length
        } : null
      })
      console.log('📦 Full API response:', JSON.stringify(data, null, 2))

      if (data.archivedPayrolls && data.archivedPayrolls.length > 0) {
        console.log('📦 Setting archived payrolls state with', data.archivedPayrolls.length, 'periods')
        setArchivedPayrolls(data.archivedPayrolls)
      } else {
        console.log('⚠️ No archived payrolls found in response')
        setArchivedPayrolls([])
      }
    } catch (error) {
      console.error('❌ Error loading archived payrolls:', error)
      setArchivedPayrolls([])
    }
  }

  // Toggle select all archives
  const handleSelectAll = () => {
    if (isSelectAll) {
      setSelectedArchives([])
      setIsSelectAll(false)
    } else {
      setSelectedArchives(archivedPayrolls.map(p => p.id))
      setIsSelectAll(true)
    }
  }

  // Toggle individual archive selection
  const handleToggleArchive = (id: string) => {
    setSelectedArchives(prev => {
      if (prev.includes(id)) {
        const newSelection = prev.filter(item => item !== id)
        setIsSelectAll(newSelection.length === archivedPayrolls.length)
        return newSelection
      } else {
        const newSelection = [...prev, id]
        setIsSelectAll(newSelection.length === archivedPayrolls.length)
        return newSelection
      }
    })
  }

  // Trigger bulk delete confirmation modal
  const promptBulkDeleteArchives = () => {
    if (selectedArchives.length === 0) {
      toast.error('Please select at least one archived payroll to delete')
      return
    }
    setShowDeleteArchiveModal(true)
  }

  // Delete multiple archived payrolls (after confirmation)
  const handleBulkDeleteArchives = async () => {
    setShowDeleteArchiveModal(false)

    try {
      setLoading(true)
      toast.loading(`Deleting ${selectedArchives.length} archived payroll(s)...`, { id: 'bulk-delete' })

      // Delete each selected archive
      const deletePromises = selectedArchives.map(async id => {
        try {
          const response = await fetch(`/api/admin/payroll/archive/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
          })

          if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`
            try {
              const errorData = await response.json()
              errorMessage = errorData.error || errorData.details || errorMessage
              console.error(`Failed to delete ${id}:`, errorData)
            } catch {
              const text = await response.text().catch(() => '')
              errorMessage = text || errorMessage
              console.error(`Failed to delete ${id} (non-JSON):`, text)
            }
            return { success: false, id, error: errorMessage }
          }

          return { success: true, id }
        } catch (err) {
          console.error(`Error deleting ${id}:`, err)
          return { success: false, id, error: err instanceof Error ? err.message : 'Network error' }
        }
      })

      const results = await Promise.all(deletePromises)
      const failedDeletes = results.filter(r => !r.success)
      const successfulDeletes = results.filter(r => r.success)

      if (failedDeletes.length > 0) {
        console.error('Failed deletes:', failedDeletes)
        const firstError = failedDeletes[0].error
        throw new Error(`Failed to delete ${failedDeletes.length} payroll(s). First error: ${firstError}`)
      }

      toast.success(`Successfully deleted ${successfulDeletes.length} archived payroll(s)`, { id: 'bulk-delete' })
      setSelectedArchives([])
      setIsSelectAll(false)
      await loadArchivedPayrolls() // Refresh the list
    } catch (error) {
      console.error('Error bulk deleting archives:', error)
      toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'bulk-delete' })
    } finally {
      setLoading(false)
    }
  }

  // Delete archived payroll
  const handleDeleteArchivedPayroll = async (payrollId: string, periodStart: string, periodEnd: string) => {
    if (!confirm(`Are you sure you want to delete the archived payroll for ${formatDateForDisplay(new Date(periodStart))} — ${formatDateForDisplay(new Date(periodEnd))}? This action cannot be undone.`)) {
      return
    }

    try {
      setLoading(true)
      toast.loading('Deleting archived payroll...', { id: 'delete-archive' })

      const response = await fetch(`/api/admin/payroll/archive/${payrollId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete archived payroll')
      }

      toast.success('Archived payroll deleted successfully', { id: 'delete-archive' })
      setSelectedArchives(prev => prev.filter(id => id !== payrollId))
      await loadArchivedPayrolls() // Refresh the list
    } catch (error) {
      console.error('Error deleting archived payroll:', error)
      toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'delete-archive' })
    } finally {
      setLoading(false)
    }
  }

  // Preview archived payslips for a given period
  const handlePreviewArchivedPayslips = async (periodStart: string, periodEnd: string) => {
    try {
      setLoading(true)
      toast.loading('Loading archived payslips...', { id: 'preview-archived' })
      const response = await fetch('/api/admin/payroll/generate-payslips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodStart, periodEnd })
      })
      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || 'Failed to load archived payslips')
      }
      const rawHtml = await response.text()
      const htmlContent = injectPreviewStyles(sanitizeForPreview(rawHtml))
      setPreviewHtml(htmlContent)
      setShowPreviewModal(true)
      toast.dismiss('preview-archived')
    } catch (e) {
      console.error('Error previewing archived payslips:', e)
      toast.error('Failed to preview archived payslips', { id: 'preview-archived' })
    } finally {
      setLoading(false)
    }
  }

  // Save payroll period settings
  const handleSavePeriod = async () => {
    try {
      setSavingPeriod(true)
      toast.loading('Saving payroll period...', { id: 'save-period' })

      // Validate dates
      const startDate = payrollPeriodStart ? new Date(payrollPeriodStart) : null
      const endDate = payrollPeriodEnd ? new Date(payrollPeriodEnd) : null
      if (!startDate || !endDate) {
        throw new Error('Please select both start and end dates')
      }
      if (endDate < startDate) {
        throw new Error('End date cannot be before start date')
      }

      // Save period settings to localStorage
      localStorage.setItem('payroll_period_start', payrollPeriodStart)
      localStorage.setItem('payroll_period_end', payrollPeriodEnd)
      localStorage.setItem('payroll_release_time', payrollReleaseTime)

      console.log(' Saved period settings:', {
        start: payrollPeriodStart,
        end: payrollPeriodEnd,
        releaseTime: payrollReleaseTime
      })

      toast.success('Payroll period saved successfully!', { id: 'save-period' })

      // Reload data with the saved period
      await loadPayrollData()
    } catch (error) {
      console.error('Error saving payroll period:', error)
      toast.error(`Failed to save period: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'save-period' })
    } finally {
      setSavingPeriod(false)
    }
  }

  // Reschedule next payroll period
  const handleReschedulePeriod = async () => {
    try {
      setLoading(true)
      toast.loading('Rescheduling payroll period...', { id: 'reschedule-period' })

      // Validate dates
      const startDate = nextPeriodStart ? new Date(nextPeriodStart) : null
      const endDate = nextPeriodEnd ? new Date(nextPeriodEnd) : null
      if (!startDate || !endDate) {
        throw new Error('Please select both start and end dates')
      }
      if (endDate < startDate) {
        throw new Error('End date cannot be before start date')
      }

      const response = await fetch('/api/admin/payroll/next-period', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          periodStart: nextPeriodStart,
          periodEnd: nextPeriodEnd,
          type: nextPeriodType,
          notes: nextPeriodNotes,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reschedule period')
      }

      const result = await response.json()

      toast.success('Payroll period rescheduled successfully!', { id: 'reschedule-period' })

      // Reset form
      setNextPeriodStart('')
      setNextPeriodEnd('')
      setNextPeriodNotes('')

      // Reload data to show new period
      await loadPayrollData()
    } catch (error) {
      console.error('Error rescheduling period:', error)
      toast.error(`Failed to reschedule period: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'reschedule-period' })
    } finally {
      setLoading(false)
    }
  }

  // Format time from 24-hour to 12-hour format
  const formatTime12Hour = (time24: string) => {
    if (!time24) return ''
    const [hours, minutes] = time24.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  // Format currency - exactly 2 decimal places
  const formatCurrency = (amount: number) => {
    // Handle NaN, null, undefined
    const safeAmount = Number.isFinite(amount) ? amount : 0
    return '₱' + new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeAmount)
  }

  const buildArchivedPayrollOverallReportHtml = (period: any, entries: any[]) => {
    const periodStart = period?.periodStart ? formatDateForDisplay(new Date(period.periodStart)) : 'N/A'
    const periodEnd = period?.periodEnd ? formatDateForDisplay(new Date(period.periodEnd)) : 'N/A'

    const safeEntries = Array.isArray(entries) ? entries : []

    const normalized = safeEntries.map((e: any) => {
      let snapshot: any = e?.breakdownSnapshot
      if (snapshot && typeof snapshot === 'string') {
        try {
          snapshot = JSON.parse(snapshot)
        } catch {
          snapshot = null
        }
      }

      const monthlyBasic = Number(
        snapshot?.monthlyBasicSalary ??
        snapshot?.basicSalary ??
        e?.user?.personnelType?.basicSalary ??
        0
      )

      const overloadPay = Number(
        snapshot?.overloadPay ??
        snapshot?.additionalPay ??
        snapshot?.overtimePay ??
        e?.overloadPay ??
        0
      )

      const deductions = Number(
        snapshot?.deductions ??
        snapshot?.totalDeductions ??
        e?.deductions ??
        0
      )

      const netPay = Number(e?.netPay ?? snapshot?.netPay ?? 0)

      return {
        name: e?.user?.name || 'N/A',
        position: e?.user?.personnelType?.name || 'N/A',
        office: e?.user?.personnelType?.department || 'N/A',
        basicSalary: monthlyBasic,
        additionalPay: overloadPay,
        deductions,
        netPay
      }
    })

    const totals = normalized.reduce(
      (acc, row) => {
        acc.basicSalary += Number(row.basicSalary) || 0
        acc.additionalPay += Number(row.additionalPay) || 0
        acc.deductions += Number(row.deductions) || 0
        acc.netPay += Number(row.netPay) || 0
        return acc
      },
      { basicSalary: 0, additionalPay: 0, deductions: 0, netPay: 0 }
    )

    const rowsHtml = normalized
      .map((r, idx) => {
        return `
          <tr>
            <td class="td">${idx + 1}</td>
            <td class="td">${r.name}</td>
            <td class="td">${r.position}</td>
            <td class="td">${r.office}</td>
            <td class="td right">${formatCurrency(r.basicSalary)}</td>
            <td class="td right">${formatCurrency(r.additionalPay)}</td>
            <td class="td right">${formatCurrency(r.deductions)}</td>
            <td class="td right"><b>${formatCurrency(r.netPay)}</b></td>
          </tr>
        `
      })
      .join('')

    const logoUrl = '/brgy-logo.png'

    return `
      <html>
        <head>
          <title>Payroll Overall Report</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; color: #111827; padding: 24px; }
            .header { display:flex; align-items:center; gap:14px; padding-bottom: 12px; border-bottom: 2px solid #e5e7eb; }
            .logo { width: 62px; height: 62px; object-fit: contain; }
            .title { font-size: 18px; font-weight: 800; margin: 0; }
            .subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; }
            .meta { margin-top: 10px; font-size: 12px; color: #374151; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; }
            th { text-align: left; font-size: 12px; color: #374151; border-bottom: 1px solid #e5e7eb; padding: 10px 8px; }
            .td { font-size: 12px; border-bottom: 1px solid #f3f4f6; padding: 10px 8px; vertical-align: top; }
            .right { text-align: right; }
            tfoot td { border-top: 2px solid #e5e7eb; font-weight: 800; }
            .sign { margin-top: 22px; display:flex; justify-content: space-between; gap: 24px; }
            .sigbox { width: 40%; text-align: center; }
            .signame { font-size: 14px; font-weight: 700; margin-top: 42px; }
            .line { border-top: 1px solid #9ca3af; margin-top: 4px; }
            .siglabel { font-size: 12px; color: #6b7280; margin-top: 4px; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img class="logo" src="${logoUrl}" alt="Logo" />
            <div>
              <div class="title">Payroll Overall Details</div>
              <div class="subtitle">Barangay Payroll Management System</div>
              <div class="meta">Period: <b>${periodStart}</b> - <b>${periodEnd}</b> &nbsp; | &nbsp; Total Staff: <b>${normalized.length}</b></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:52px;">#</th>
                <th>Name</th>
                <th>Position</th>
                <th>Office</th>
                <th class="right">Basic Salary</th>
                <th class="right">Additional Pay</th>
                <th class="right">Deductions</th>
                <th class="right">Net Pay</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td class="td" colspan="4">TOTAL</td>
                <td class="td right">${formatCurrency(totals.basicSalary)}</td>
                <td class="td right">${formatCurrency(totals.additionalPay)}</td>
                <td class="td right">${formatCurrency(totals.deductions)}</td>
                <td class="td right">${formatCurrency(totals.netPay)}</td>
              </tr>
            </tfoot>
          </table>

          <div class="sign">
            <div class="sigbox">
              <div class="signame">EMMA L. MACTAO</div>
              <div class="line"></div>
              <div class="siglabel">Brgy Treasurer</div>
              <div class="siglabel">Prepared by</div>
            </div>
            <div class="sigbox">
              <div class="signame">ARSENIO Q. SIMANGAN</div>
              <div class="line"></div>
              <div class="siglabel">Punong Barangay</div>
              <div class="siglabel">Approved by</div>
            </div>
          </div>
        </body>
      </html>
    `
  }

  const printArchivedOverallDetails = () => {
    if (!selectedArchivedPeriod) {
      toast.error('Please open an archived payroll period first.')
      return
    }

    const html = buildArchivedPayrollOverallReportHtml(selectedArchivedPeriod, archivedPersonnelList)
    const printWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
    if (!printWindow) {
      toast.error('Popup blocked. Please allow popups for this site and try again.')
      return
    }

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    const variants = {
      'Pending': 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
      'Released': 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800'
    }
    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-muted text-muted-foreground border-border'}>
        {status}
      </Badge>
    )
  }

  // Helper: merge cached deductions with live deductions (same logic as PayrollBreakdownDialog)
  const getMergedDeductions = (entry: PayrollEntry) => {
    const deductionsMap = new Map()

    // Add cached deductions from payroll snapshot (if they exist)
    if (entry.breakdown?.otherDeductionDetails && Array.isArray(entry.breakdown.otherDeductionDetails)) {
      entry.breakdown.otherDeductionDetails.forEach((d: any) => {
        deductionsMap.set(d.type.toLowerCase(), {
          type: d.type,
          amount: d.amount,
          description: d.description,
          isMandatory: d.isMandatory
        })
      })
    }

    // Override/add with live deductions from database
    const userLiveDeductions = liveDeductions.filter((d: any) => d.users_id === entry.users_id)
    userLiveDeductions.forEach((d: any) => {
      const typeName = d.deduction_types?.name
      if (!typeName) return

      const typeNameLower = typeName.toLowerCase()

      // Skip attendance-related deductions
      if (
        typeNameLower.includes('late') ||
        typeNameLower.includes('absent') ||
        typeNameLower.includes('early') ||
        typeNameLower.includes('tardiness') ||
        typeNameLower.includes('partial')
      ) {
        return
      }

      deductionsMap.set(typeNameLower, {
        type: typeName,
        amount: parseFloat(d.amount.toString()),
        description: d.deduction_types?.description || d.notes || '',
        isMandatory: d.deduction_types?.isMandatory || false
      })
    })

    return Array.from(deductionsMap.values())
  }

  // Helper: check if deduction is mandatory
  const isMandatoryDeduction = (deduction: any): boolean => {
    if (deduction.isMandatory === true || deduction.isMandatory === 1) {
      return true
    }

    if (deductionTypes.length > 0) {
      const deductionType = deductionTypes.find((t: any) =>
        t.name.toLowerCase() === deduction.type.toLowerCase()
      )
      if (deductionType) {
        return deductionType.isMandatory === true
      }
    }

    return false
  }

  // Filter entries based on search
  const filteredEntries = payrollEntries.filter(entry =>
    entry.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Update current time every second for live counters
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const initializePayroll = async () => {
      // Load saved period settings from localStorage
      const savedPeriodStart = localStorage.getItem('payroll_period_start')
      const savedPeriodEnd = localStorage.getItem('payroll_period_end')
      const savedReleaseTime = localStorage.getItem('payroll_release_time')

      if (savedPeriodStart && savedPeriodEnd) {
        setPayrollPeriodStart(savedPeriodStart)
        setPayrollPeriodEnd(savedPeriodEnd)
        setCurrentPeriod({
          periodStart: savedPeriodStart,
          periodEnd: savedPeriodEnd,
          type: 'Custom',
          status: 'Pending'
        })

        if (savedReleaseTime) {
          setPayrollReleaseTime(savedReleaseTime)
          setOriginalReleaseTime(savedReleaseTime)
        }
      }

      // Load all data in parallel, but only load payroll if period exists
      // This prevents showing "generated" data after a release
      const loadTasks = [
        loadPersonnelTypes(),
        loadArchivedPayrolls(),
        loadLiveData(),
        loadDeductionTypes()
      ]

      // Only load payroll data if we have saved periods AND want to check for existing data
      if (savedPeriodStart && savedPeriodEnd) {
        loadTasks.push(loadPayrollData(savedPeriodStart, savedPeriodEnd))
      }

      await Promise.all(loadTasks)
    }

    initializePayroll()
  }, [])

  // Timer to update countdown every second
  useEffect(() => {
    if (!currentPeriod?.periodEnd || !payrollReleaseTime) {
      setTimeUntilRelease('')
      return
    }

    const updateCountdown = () => {
      // Get current time in Philippines (UTC+8)
      const now = new Date()
      const philippinesTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
      const [hours, minutes] = payrollReleaseTime.split(':').map(Number)

      // Use period end date with the release time
      const releaseDateTime = new Date(currentPeriod.periodEnd)
      releaseDateTime.setHours(hours, minutes, 0, 0)

      const diff = releaseDateTime.getTime() - philippinesTime.getTime()

      if (diff <= 0) {
        setTimeUntilRelease('Release available now!')
        if (!canRelease) {
          setCanRelease(true)
          console.log('🚀 Countdown complete - Release button now enabled')

          // Auto-release payroll when countdown hits zero (only once)
          if (hasGeneratedForSettings && currentPeriod.status !== 'Released' && !hasAutoReleased) {
            console.log('🚀 Auto-releasing payroll after cutoff...')
            setHasAutoReleased(true)
            handleAutoReleasePayroll()
          }
        }
        return
      }

      // If we're counting down, make sure canRelease is false
      if (canRelease) {
        setCanRelease(false)
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const secs = Math.floor((diff % (1000 * 60)) / 1000)

      let countdown = ''
      if (days > 0) countdown += `${days}d `
      countdown += `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`

      setTimeUntilRelease(countdown)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [currentPeriod?.periodEnd, payrollReleaseTime, canRelease])

  // Debug: Log newArchivedPayrollId changes
  useEffect(() => {
    console.log('🔔 newArchivedPayrollId changed:', newArchivedPayrollId)
  }, [newArchivedPayrollId])

  // Debug: Log showArchiveNotification changes
  useEffect(() => {
    console.log('🔴 showArchiveNotification changed:', showArchiveNotification)
  }, [showArchiveNotification])

  // Load archived payrolls when archive tab is accessed
  useEffect(() => {
    if (activeTab === 'archived') {
      loadArchivedPayrolls()
    }
  }, [activeTab])

  // Clear notification ONLY when user opens archived tab and sees the content
  useEffect(() => {
    if (activeTab === 'archived' && archivedPayrolls.length > 0) {
      // Clear notification immediately when viewing archived payrolls
      clearArchiveNotification()
    }
  }, [activeTab, archivedPayrolls.length])

  // Debug modal state
  useEffect(() => {
    console.log('🔍 Modal state changed - showPrintModal:', showPrintModal)
  }, [showPrintModal])

  // Note: keep page scroll functional; we will hide scrollbars visually via CSS instead

  // Prompt to print payslips with modal
  const promptPrintPayslips = () => {
    setShowPrintModal(true)
  }

  // Periodic check for reminder notifications (every 30 minutes)
  useEffect(() => {
    const checkReminders = async () => {
      try {
        const response = await fetch('/api/admin/payroll/check-release', { method: 'POST' })
        if (!response.ok) {
          // Fail silently for non-critical background checks
          return
        }
      } catch (error) {
        // Fail silently - this is a non-critical background check
        // No need to log or show errors to avoid console noise
      }
    }

    // Check immediately on mount
    checkReminders()

    // Then check every 30 minutes
    const interval = setInterval(checkReminders, 30 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <span className="text-2xl sm:text-3xl text-blue-600">₱</span>
            Payroll Management
          </h1>
          <p className="text-muted-foreground">
            Manage staff payroll, generate payslips, and track payroll history
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            <strong>Workflow:</strong> Generate Payroll → Release Payroll → Print Payslips (optional)
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGeneratePayroll} disabled={loading || hasGeneratedForSettings} aria-disabled>
            <FileText className="h-4 w-4 mr-2" />
            {hasGeneratedForSettings ? 'Payroll Generated' : 'Generate Payroll'}
          </Button>
          <Button
            onClick={showReleaseConfirmation}
            disabled={loading || !hasGeneratedForSettings || currentPeriod?.status === 'Released' || !canRelease}
            aria-disabled
            title={!canRelease && currentPeriod?.periodEnd && payrollReleaseTime ? `Release only available on or after ${formatDateForDisplay(new Date(currentPeriod.periodEnd))} at ${formatTime12Hour(payrollReleaseTime)}` : ''}
          >
            <Save className="h-4 w-4 mr-2" />
            {currentPeriod?.status === 'Released' ? 'Payroll Released' : !canRelease ? 'Release (Not Yet Period End)' : 'Release Payroll'}
          </Button>
        </div>
      </div>

      {/* Release Countdown Timer */}
      {!canRelease && currentPeriod && currentPeriod.status !== 'Released' && timeUntilRelease && hasGeneratedForSettings && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-8 border border-blue-100 dark:border-blue-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                <div className="relative bg-white dark:bg-gray-900 p-4 rounded-full shadow-lg">
                  <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Waiting for Release Time</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDateForDisplay(new Date(currentPeriod.periodEnd))} at {formatTime12Hour(payrollReleaseTime)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Time Remaining</p>
              <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 font-mono">
                {timeUntilRelease}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Release Ready Banner */}
      {canRelease && currentPeriod && currentPeriod.status !== 'Released' && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-8 border border-green-100 dark:border-green-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full"></div>
                <div className="relative bg-white dark:bg-gray-900 p-4 rounded-full shadow-lg">
                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">Ready to Release</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You can now release payroll to all employees
                </p>
              </div>
            </div>
            <Button
              onClick={showReleaseConfirmation}
              size="lg"
              className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              disabled={loading}
            >
              <Save className="h-5 w-5 mr-2" />
              Release Payroll
            </Button>
          </div>
        </div>
      )}

      {/* Current Period Info */}
      {/* Current Period Info - Simplified */}
      {currentPeriod && (
        <Card className="border shadow-sm bg-card mb-6">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x border-b md:border-b-0">

              {/* Period Date Section */}
              <div className="flex-1 p-6 flex items-start gap-4">
                <div className="mt-1">
                  <div className="h-10 w-10 rounded-full border bg-muted/30 flex items-center justify-center">
                    <CalendarRange className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Payroll Period</p>
                  <h3 className="text-lg font-semibold text-foreground tracking-tight">
                    {formatDateForDisplay(new Date(currentPeriod.periodStart))} — {formatDateForDisplay(new Date(currentPeriod.periodEnd))}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {calculateWorkingDaysInPhilippines(new Date(currentPeriod.periodStart), new Date(currentPeriod.periodEnd))} working days
                  </p>
                </div>
              </div>

              {/* Staff Count Section */}
              <div className="flex-1 p-6 flex items-start gap-4">
                <div className="mt-1">
                  <div className="h-10 w-10 rounded-full border bg-muted/30 flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Staff</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-foreground">{totalEmployees}</h3>
                    <span className="text-sm text-muted-foreground">active</span>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="flex-1 p-6 flex items-start gap-4">
                <div className="mt-1">
                  <div className={`h-10 w-10 rounded-full border flex items-center justify-center ${currentPeriod.status === 'Released'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-yellow-50 border-yellow-200'
                    }`}>
                    <Activity className={`h-5 w-5 ${currentPeriod.status === 'Released' ? 'text-green-600' : 'text-yellow-600'
                      }`} />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(currentPeriod.status || 'Pending')}
                  </div>
                  {hasGeneratedForSettings && canRelease && currentPeriod?.status !== 'Released' && (
                    <span className="text-xs font-medium text-orange-600 mt-1 block">
                      Release required
                    </span>
                  )}
                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="current">
            <Banknote className="h-4 w-4 mr-2" />
            Current Payroll
          </TabsTrigger>
          <TabsTrigger value="archived" className="relative">
            <Archive className="h-4 w-4 mr-2" />
            Archived Payrolls
            {(archivedPayrolls.length > 0 && !hasViewedNewestPayroll) && (
              <span className="absolute top-0 right-0 flex h-2 w-2 z-50">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Clock className="h-4 w-4 mr-2" />
            Payroll Time Settings
          </TabsTrigger>
        </TabsList>

        {/* Current Payroll Tab */}
        <TabsContent value="current" className="space-y-4">
          {!hasGeneratedForSettings ? (
            /* Empty State - Payroll Not Generated */
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="p-4 bg-muted rounded-lg">
                      <FileText className="h-16 w-16 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold mb-2">Payroll Waiting to be Generated</h3>
                    <p className="text-muted-foreground max-w-md">
                      Click the button below to generate payroll for the current period
                    </p>
                  </div>
                  <Button
                    onClick={handleGeneratePayroll}
                    disabled={loading}
                    size="lg"
                    className="mt-4"
                  >
                    <FileText className="h-5 w-5 mr-2" />
                    Generate Payroll Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Payroll Generated - Show Table */
            <>
              {/* Search */}
              <div className="flex justify-between items-center">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search staff..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  {filteredEntries.length} staff found
                </div>
              </div>

              {/* Payroll Table */}
              <Card className="border-0 shadow-lg bg-card">
                <CardHeader className="border-b px-6 py-4">
                  <CardTitle className="text-xl font-bold">Payroll Summary</CardTitle>

                  {/* Total Payroll Summary */}
                  {!liveDataLoaded ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-muted-foreground mb-1">Total Gross Pay</div>
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                            <span className="text-sm text-muted-foreground">Loading...</span>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-l-4 border-l-red-500">
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-muted-foreground mb-1">Total Deductions</div>
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                            <span className="text-sm text-muted-foreground">Loading...</span>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-muted-foreground mb-1">Total Net Pay</div>
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                            <span className="text-sm text-muted-foreground">Loading...</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <Card className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-muted-foreground mb-1">Total Gross Pay</div>
                          <div className="text-2xl font-bold text-foreground">
                            ₱{filteredEntries.reduce((sum, entry) => {
                              const basicSalary = Number(entry.breakdown?.basicSalary || 0)
                              const overloadPay = Number(entry.breakdown?.overloadPay || 0)
                              return sum + basicSalary + overloadPay
                            }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-l-4 border-l-red-500">
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-muted-foreground mb-1">Total Deductions</div>
                          <div className="text-2xl font-bold text-foreground">
                            ₱{filteredEntries.reduce((sum, entry) => {
                              const basicSalary = Number(entry.breakdown?.basicSalary || 0)
                              const overloadPay = Number(entry.breakdown?.overloadPay || 0)
                              const { totalDeductions, attendanceDeductionAmount, otherDeductionsAmount, loanPayments } = calculateUserPayroll(entry.users_id, basicSalary, overloadPay)
                              console.log(`🎯 SUMMARY CARD - ${entry.name}: Attendance=₱${attendanceDeductionAmount}, Other=₱${otherDeductionsAmount}, Loans=₱${loanPayments}, Total=₱${totalDeductions}`)
                              return sum + totalDeductions
                            }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-muted-foreground mb-1">Total Net Pay</div>
                          <div className="text-2xl font-bold text-foreground">
                            ₱{filteredEntries.reduce((sum, entry) => {
                              const basicSalary = Number(entry.breakdown?.basicSalary || 0)
                              const overloadPay = Number(entry.breakdown?.overloadPay || 0)
                              const { netPay } = calculateUserPayroll(entry.users_id, basicSalary, overloadPay)
                              return sum + netPay
                            }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b bg-muted/50">
                          <TableHead className="font-semibold text-xs uppercase tracking-wider h-12 px-6">ID Number</TableHead>
                          <TableHead className="font-semibold text-xs uppercase tracking-wider h-12">Personnel</TableHead>
                          <TableHead className="font-semibold text-xs uppercase tracking-wider h-12">Email</TableHead>
                          <TableHead className="font-semibold text-xs uppercase tracking-wider h-12">BLGU</TableHead>
                          <TableHead className="font-semibold text-xs uppercase tracking-wider h-12">Position</TableHead>
                          <TableHead className="font-semibold text-xs uppercase tracking-wider h-12 text-right pr-8">Net Pay</TableHead>
                          <TableHead className="font-semibold text-xs uppercase tracking-wider h-12 pl-8">Status</TableHead>
                          <TableHead className="font-semibold text-xs uppercase tracking-wider h-12 text-center px-6">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-16">
                              <div className="flex flex-col items-center gap-3">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                                <span className="text-sm text-muted-foreground">Loading payroll data...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : filteredEntries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-16">
                              <div className="flex flex-col items-center gap-3">
                                <FileText className="h-16 w-16 text-muted-foreground/30" />
                                <div>
                                  <p className="text-base font-medium text-foreground">No payroll entries found</p>
                                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your search</p>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredEntries.map((entry, index) => {
                            const basicSalary = Number(entry.breakdown?.basicSalary || 0)
                            const overloadPay = Number(entry.breakdown?.overloadPay || 0)
                            const { netPay } = calculateUserPayroll(entry.users_id, basicSalary, overloadPay)

                            return (
                              <TableRow
                                key={`${entry.users_id}-${index}`}
                                className="border-b border-border/50 hover:bg-transparent"
                              >
                                <TableCell className="px-6 py-4">
                                  <span className="inline-flex items-center font-mono text-xs font-medium text-muted-foreground bg-secondary/60 px-2.5 py-1 rounded-md">
                                    {entry.users_id}
                                  </span>
                                </TableCell>
                                <TableCell className="py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                      {entry.avatar ? (
                                        <img
                                          src={entry.avatar}
                                          alt={entry.name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-semibold text-sm">
                                          {entry.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                      )}
                                    </div>
                                    <span className="font-semibold text-sm text-foreground">{entry.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-4">
                                  <span className="text-sm">{entry.email}</span>
                                </TableCell>
                                <TableCell className="py-4">
                                  <span className="font-medium text-sm">{(() => {
                                    const personnelTypeName = entry.personnelType || ''
                                    const nameParts = personnelTypeName.split(': ')
                                    return nameParts.length === 2 ? nameParts[0] : (entry.department || 'N/A')
                                  })()}</span>
                                </TableCell>
                                <TableCell className="py-4">
                                  <Badge variant="outline" className="font-medium text-xs px-2.5 py-1">
                                    {(() => {
                                      const personnelTypeName = entry.personnelType || ''
                                      const nameParts = personnelTypeName.split(': ')
                                      return nameParts.length === 2 ? nameParts[1] : (personnelTypeName || 'N/A')
                                    })()}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-4 text-right pr-8">
                                  <span className="font-bold text-base text-green-600">
                                    ₱{netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </TableCell>
                                <TableCell className="py-4 pl-8">
                                  <div className="flex flex-col gap-1.5">
                                    {getStatusBadge(entry.status)}
                                    {entry.status === 'Released' && (
                                      <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Ready
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-4 text-center px-6">
                                  <div className="flex items-center justify-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="font-medium"
                                      onClick={() => {
                                        setSelectedEntry(entry)
                                        setOpenInEditMode(false)
                                        setBreakdownDialogOpen(true)
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      Details
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="font-medium"
                                      onClick={() => {
                                        setSelectedEntry(entry)
                                        setOpenInEditMode(true)
                                        setBreakdownDialogOpen(true)
                                      }}
                                      disabled={entry.status !== 'Pending'}
                                    >
                                      <Edit2 className="h-4 w-4 mr-2" />
                                      Edit
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Archived Payrolls Tab */}
        <TabsContent value="archived" className="space-y-6">
          {/* Search Bar */}
          <Card className="border-0 shadow-sm bg-card">
            <CardHeader className="border-b">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="mt-1">
                    <div className="h-10 w-10 rounded-full border bg-muted/30 flex items-center justify-center">
                      <Archive className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-foreground">Archived Payrolls</CardTitle>
                    <CardDescription className="mt-1">
                      History of {archivedPayrolls.length} released payroll periods
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search archives..."
                      value={archiveSearchTerm}
                      onChange={(e) => setArchiveSearchTerm(e.target.value)}
                      className="pl-9 h-9 bg-muted/50"
                    />
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={archivedPayrolls.length === 0} className="h-9 gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="hidden sm:inline">View Details</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="!max-w-none w-[98vw] h-[95vh] !max-h-none overflow-hidden flex flex-col" style={{ maxWidth: '98vw', width: '98vw', height: '95vh', maxHeight: '95vh' }}>
                      <DialogHeader className="border-b pb-4">
                        <DialogTitle className="text-xl font-semibold">View Payroll for Staff</DialogTitle>
                        <DialogDescription>
                          Select a staff member, then choose a payroll period to view their payroll details
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden p-4">
                        {/* Left: Personnel List */}
                        <div className="border-r pr-4">
                          <div className="flex items-center gap-2 mb-4">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase">Select Staff</h3>
                          </div>

                          {/* Search Bar */}
                          <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search staff..."
                              className="pl-9 h-9"
                              value={personnelSearchTerm}
                              onChange={(e) => setPersonnelSearchTerm(e.target.value)}
                            />
                          </div>

                          {/* Grand Total Card */}
                          {(() => {
                            const grandTotal = archivedPayrolls.reduce((total, payroll) => {
                              const periodTotal = payroll.payrolls?.reduce((sum: number, person: any) =>
                                sum + Number(person.netPay || 0), 0
                              ) || 0
                              return total + periodTotal
                            }, 0)

                            return (
                              <div className="mb-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase">Grand Total</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{archivedPayrolls.length} periods</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(grandTotal)}</p>
                                  </div>
                                </div>
                              </div>
                            )
                          })()}

                          <div className="space-y-2 max-h-[75vh] overflow-y-auto">
                            {(() => {
                              // Get unique personnel from all archived payrolls
                              const personnelMap = new Map()
                              archivedPayrolls.forEach(payroll => {
                                payroll.payrolls?.forEach((person: any) => {
                                  if (!personnelMap.has(person.users_id)) {
                                    personnelMap.set(person.users_id, person)
                                  }
                                })
                              })
                              let uniquePersonnel = Array.from(personnelMap.values())

                              // Filter by search term
                              if (personnelSearchTerm) {
                                const searchLower = personnelSearchTerm.toLowerCase()
                                uniquePersonnel = uniquePersonnel.filter((person: any) =>
                                  person.user?.name?.toLowerCase().includes(searchLower) ||
                                  person.user?.personnelType?.department?.toLowerCase().includes(searchLower)
                                )
                              }

                              return uniquePersonnel.map((person: any) => {
                                const isSelected = selectedPersonnelForPeriods?.users_id === person.users_id

                                // Calculate total net pay for this personnel across all periods
                                const totalNetPay = archivedPayrolls.reduce((total, payroll) => {
                                  const personnelInPeriod = payroll.payrolls?.find((p: any) => p.users_id === person.users_id)
                                  return total + (personnelInPeriod ? Number(personnelInPeriod.netPay || 0) : 0)
                                }, 0)

                                return (
                                  <div
                                    key={person.users_id}
                                    onClick={() => {
                                      setSelectedPersonnelForPeriods(person)
                                      // Get all periods for this personnel
                                      const personnelPeriods = archivedPayrolls.filter(payroll =>
                                        payroll.payrolls?.some((p: any) => p.users_id === person.users_id)
                                      )
                                      setArchivedPersonnelList(personnelPeriods)
                                    }}
                                    className={`
                                          p-3 rounded-md border cursor-pointer transition-all
                                          ${isSelected
                                        ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-500'
                                        : 'bg-background border-border hover:border-blue-300'
                                      }
                                        `}
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex-1">
                                        <p className="font-semibold text-sm">{person.user?.name || 'N/A'}</p>
                                        <p className="text-xs text-muted-foreground">{person.user?.personnelType?.department || 'N/A'}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-bold text-green-600 dark:text-green-400">
                                          {formatCurrency(totalNetPay)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">Total Net Pay</p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })
                            })()}
                          </div>
                        </div>

                        {/* Right: Period List for selected personnel */}
                        <div className="pl-4">
                          <div className="flex items-center gap-2 mb-4">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase">
                              {selectedPersonnelForPeriods ? 'Select Payroll Period' : 'Select Staff First'}
                            </h3>
                          </div>

                          {selectedPersonnelForPeriods && (
                            <>
                              {/* Total Net Pay Card for Selected Personnel */}
                              {(() => {
                                const totalNetPay = archivedPayrolls.reduce((total, payroll) => {
                                  const personnelInPeriod = payroll.payrolls?.find((p: any) => p.users_id === selectedPersonnelForPeriods.users_id)
                                  return total + (personnelInPeriod ? Number(personnelInPeriod.netPay || 0) : 0)
                                }, 0)

                                const periodCount = archivedPersonnelList.length

                                return (
                                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase">
                                          {selectedPersonnelForPeriods.user?.name || 'Staff'} - Total Net Pay
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{periodCount} period{periodCount !== 1 ? 's' : ''}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(totalNetPay)}</p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })()}

                              <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Search periods..."
                                  className="pl-9 h-9"
                                  value={periodSearchTerm}
                                  onChange={(e) => setPeriodSearchTerm(e.target.value)}
                                />
                              </div>
                            </>
                          )}

                          <div className="space-y-2 max-h-[75vh] overflow-y-auto">
                            {selectedPersonnelForPeriods && archivedPersonnelList.length > 0 ? (
                              (() => {
                                let filteredPayrolls = archivedPersonnelList

                                // Filter by search term
                                if (periodSearchTerm) {
                                  const searchLower = periodSearchTerm.toLowerCase()
                                  filteredPayrolls = filteredPayrolls.filter((payroll: any) => {
                                    const periodStart = formatDateForDisplay(new Date(payroll.periodStart)).toLowerCase()
                                    const periodEnd = formatDateForDisplay(new Date(payroll.periodEnd)).toLowerCase()
                                    const releasedAt = formatDateForDisplay(new Date(payroll.releasedAt)).toLowerCase()
                                    return periodStart.includes(searchLower) ||
                                      periodEnd.includes(searchLower) ||
                                      releasedAt.includes(searchLower)
                                  })
                                }

                                return filteredPayrolls.map((payroll: any) => {
                                  // Find this personnel's data in this period
                                  const personnelData = payroll.payrolls?.find((p: any) => p.users_id === selectedPersonnelForPeriods.users_id)
                                  const netPay = Number(personnelData?.netPay || 0)

                                  return (
                                    <div
                                      key={payroll.id}
                                      onClick={() => {
                                        setSelectedArchivedPeriod(payroll)
                                        setSelectedArchivedEntry(personnelData)
                                        clearArchiveNotification()
                                      }}
                                      className="p-3 bg-background border border-border rounded-md cursor-pointer hover:border-primary hover:bg-accent transition-all"
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1">
                                          <p className="font-semibold text-sm">
                                            {formatDateForDisplay(new Date(payroll.periodStart))} - {formatDateForDisplay(new Date(payroll.periodEnd))}
                                          </p>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            Released {formatDateForDisplay(new Date(payroll.releasedAt))}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-bold text-green-600 dark:text-green-400">
                                            {formatCurrency(netPay)}
                                          </p>
                                          <p className="text-xs text-muted-foreground">Net Pay</p>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })
                              })()
                            ) : selectedPersonnelForPeriods ? (
                              <p className="text-center text-muted-foreground py-8 text-sm">No payroll periods found for this staff member</p>
                            ) : (
                              <p className="text-center text-muted-foreground py-8 text-sm">Select a staff member to view their payroll periods</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {selectedArchives.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={promptBulkDeleteArchives}
                      disabled={loading}
                      className="shadow-lg hover:shadow-xl transition-all"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedArchives.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-muted/50">
                      <TableHead className="w-[50px]">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSelectAll}
                          className="h-8 w-8 p-0"
                        >
                          {isSelectAll ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Period</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">Staff</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-right pr-8">Net Pay</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider pl-8">Released</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider">View</TableHead>
                      <TableHead className="font-semibold text-xs uppercase tracking-wider text-center w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedPayrolls.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-20">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-6 bg-muted/30 rounded-2xl border">
                              <Archive className="h-16 w-16 text-muted-foreground/50" />
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-foreground">No Archived Payrolls Yet</p>
                              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                                Released payrolls will be automatically archived and displayed here for historical reference
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      archivedPayrolls
                        .filter(payroll => {
                          if (!archiveSearchTerm) return true
                          const searchLower = archiveSearchTerm.toLowerCase()
                          const periodStart = formatDateForDisplay(new Date(payroll.periodStart)).toLowerCase()
                          const periodEnd = formatDateForDisplay(new Date(payroll.periodEnd)).toLowerCase()
                          const releasedAt = formatDateForDisplay(new Date(payroll.releasedAt)).toLowerCase()
                          const releasedBy = payroll.releasedBy.toLowerCase()
                          return periodStart.includes(searchLower) ||
                            periodEnd.includes(searchLower) ||
                            releasedAt.includes(searchLower) ||
                            releasedBy.includes(searchLower)
                        })
                        .map((payroll) => (
                          <TableRow key={payroll.id} className="border-b border-border/50 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                            <TableCell className="py-5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleArchive(payroll.id)}
                                className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-900/30"
                              >
                                {selectedArchives.includes(payroll.id) ? (
                                  <CheckSquare className="h-4 w-4 text-primary" />
                                ) : (
                                  <Square className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="py-5">
                              <div className="flex items-center gap-3 relative">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-muted/30 rounded-lg border">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-sm text-foreground">{formatDateForDisplay(new Date(payroll.periodStart))}</span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <span>to</span>
                                      <span className="font-medium">{formatDateForDisplay(new Date(payroll.periodEnd))}</span>
                                    </span>
                                  </div>
                                </div>
                                {(archivedPayrolls.indexOf(payroll) === 0 && !hasViewedNewestPayroll) && (
                                  <span className="relative flex h-3 w-3 flex-shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600 shadow-lg"></span>
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-5">
                              <Badge variant="secondary" className="font-semibold bg-muted/50 text-muted-foreground border-border">
                                {payroll.totalEmployees} Staff
                              </Badge>
                            </TableCell>
                            <TableCell className="py-5 text-right pr-8">
                              <span className="text-lg font-bold text-green-600 dark:text-green-500">
                                {formatCurrency(payroll.payrolls?.reduce((sum: number, person: any) => sum + Number(person.netPay || 0), 0) || 0)}
                              </span>
                            </TableCell>
                            <TableCell className="py-5 pl-8">
                              <div className="flex flex-col gap-1">
                                <span className="text-sm font-medium text-foreground">{formatDateForDisplay(new Date(payroll.releasedAt))}</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                  by {payroll.releasedBy}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-5">
                              <Button
                                variant="default"
                                size="default"
                                onClick={() => {
                                  setSelectedArchivedPeriod(payroll)
                                  setArchivedPersonnelList(payroll.payrolls || [])
                                  setArchivedBreakdownOpen(true)

                                  // Clear notification if viewing the first/newest archived payroll
                                  if (archivedPayrolls.indexOf(payroll) === 0) {
                                    clearArchiveNotification()
                                  }
                                }}
                                className="gap-2 px-4 py-2"
                              >
                                <FileText className="h-4 w-4" />
                                View Payroll
                              </Button>
                            </TableCell>
                            <TableCell className="py-4 text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => {
                                    // View individual personnel payrolls
                                    setSelectedArchivedPeriod(payroll)
                                    setArchivedPersonnelList(payroll.payrolls || [])
                                    setArchivedBreakdownOpen(true)

                                    // Clear notification if viewing the first/newest archived payroll
                                    if (archivedPayrolls.indexOf(payroll) === 0) {
                                      clearArchiveNotification()
                                    }
                                  }}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    View Staff
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => {
                                    // Clear notification if viewing the first/newest archived payroll
                                    if (archivedPayrolls.indexOf(payroll) === 0) {
                                      clearArchiveNotification()
                                    }
                                    handlePreviewArchivedPayslips(payroll.periodStart, payroll.periodEnd)
                                  }}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Payslips
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    // Clear notification if viewing the first/newest archived payroll
                                    if (archivedPayrolls.indexOf(payroll) === 0) {
                                      clearArchiveNotification()
                                    }
                                    handlePreviewArchivedPayslips(payroll.periodStart, payroll.periodEnd)
                                  }}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Reprint
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={async () => {
                                    try {
                                      const response = await fetch('/api/admin/payroll/print-screenshot', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          periodStart: payroll.periodStart,
                                          periodEnd: payroll.periodEnd
                                        })
                                      })

                                      if (!response.ok) throw new Error('Failed to generate payslip')

                                      const html = await response.text()
                                      const printWindow = window.open('', '_blank')
                                      if (printWindow) {
                                        printWindow.document.write(html)
                                        printWindow.document.close()
                                      }
                                    } catch (error) {
                                      toast.error('Failed to generate payslip')
                                    }
                                  }}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteArchivedPayroll(payroll.id, payroll.periodStart, payroll.periodEnd)}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent >

        {/* Payroll Time Settings Tab */}
        < TabsContent value="settings" className="space-y-6" >
          {/* Payroll Time Settings */}
          {/* Payroll Time Settings */}
          <Card className="border shadow-sm bg-card">
            <CardHeader className="border-b">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <div className="h-10 w-10 rounded-full border bg-muted/30 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-foreground">
                    Payroll Time Settings
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set the payroll period dates. This will be used to calculate working days and generate payroll.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Quick Duration Shortcuts */}
                {/* Quick Duration Shortcuts */}
                <div className="bg-muted/30 p-4 rounded-xl border">
                  <Label className="mb-3 block text-base font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Quick Duration
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const today = new Date()
                        const end = new Date(today)
                        end.setDate(today.getDate() + 6)
                        setPayrollPeriodStart(toPhilippinesDateString(today))
                        setPayrollPeriodEnd(toPhilippinesDateString(end))
                      }}
                    >
                      7 Days
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const today = new Date()
                        const end = new Date(today)
                        end.setDate(today.getDate() + 13)
                        setPayrollPeriodStart(toPhilippinesDateString(today))
                        setPayrollPeriodEnd(toPhilippinesDateString(end))
                      }}
                    >
                      14 Days
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const today = new Date()
                        const end = new Date(today)
                        end.setDate(today.getDate() + 14)
                        setPayrollPeriodStart(toPhilippinesDateString(today))
                        setPayrollPeriodEnd(toPhilippinesDateString(end))
                      }}
                    >
                      15 Days (Semi-Monthly)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const today = new Date()
                        const end = new Date(today)
                        end.setMonth(today.getMonth() + 1)
                        end.setDate(0)
                        setPayrollPeriodStart(toPhilippinesDateString(today))
                        setPayrollPeriodEnd(toPhilippinesDateString(end))
                      }}
                    >
                      1 Month
                    </Button>
                  </div>
                  <div className="flex items-end gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex-1">
                      <Label className="font-medium">Custom Days</Label>
                      <Input
                        type="number"
                        placeholder="Enter days"
                        value={settingsCustomDays}
                        onChange={(e) => setSettingsCustomDays(e.target.value)}
                        min="1"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const days = parseInt(settingsCustomDays)
                        if (days > 0) {
                          const today = new Date()
                          const end = new Date(today)
                          end.setDate(today.getDate() + days - 1)
                          setPayrollPeriodStart(toPhilippinesDateString(today))
                          setPayrollPeriodEnd(toPhilippinesDateString(end))
                          toast.success(`Set period to ${days} days`)
                        } else {
                          toast.error('Please enter a valid number of days')
                        }
                      }}
                      disabled={!settingsCustomDays || parseInt(settingsCustomDays) <= 0}
                    >
                      Apply
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-xl border">
                  <Label className="mb-3 block text-base font-semibold">Period Configuration</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="payrollPeriodStart">Period Start Date</Label>
                      <div className="relative">
                        <Input
                          id="payrollPeriodStart"
                          type="date"
                          value={payrollPeriodStart || ''}
                          onChange={(e) => setPayrollPeriodStart(e.target.value)}
                          className="opacity-0 absolute inset-0 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={payrollPeriodStart ? formatDateForDisplay(payrollPeriodStart) : ''}
                          placeholder="dd/mm/yyyy"
                          readOnly
                          className="cursor-pointer"
                          onClick={() => document.getElementById('payrollPeriodStart')?.focus()}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="payrollPeriodEnd">Period End Date</Label>
                      <div className="relative">
                        <Input
                          id="payrollPeriodEnd"
                          type="date"
                          value={payrollPeriodEnd || ''}
                          onChange={(e) => setPayrollPeriodEnd(e.target.value)}
                          className="opacity-0 absolute inset-0 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={payrollPeriodEnd ? formatDateForDisplay(payrollPeriodEnd) : ''}
                          placeholder="dd/mm/yyyy"
                          readOnly
                          className="cursor-pointer"
                          onClick={() => document.getElementById('payrollPeriodEnd')?.focus()}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="payrollReleaseTime">Release Time</Label>
                      <Input
                        id="payrollReleaseTime"
                        type="time"
                        value={payrollReleaseTime}
                        onChange={(e) => setPayrollReleaseTime(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Set the time when payroll should be released
                      </p>
                    </div>
                  </div>

                  {payrollPeriodStart && payrollPeriodEnd && (
                    <div className="mt-4 p-3 bg-muted/50 rounded-lg border">
                      <div className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        <strong>Working Days:</strong>
                        <span className="text-slate-700 dark:text-slate-300">{
                          calculateWorkingDaysInPhilippines(new Date(payrollPeriodStart), new Date(payrollPeriodEnd))
                        } days</span>
                        <span className="text-xs text-muted-foreground">(excludes Sundays)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Testing Release Button */}
                {hasGeneratedForSettings && currentPeriod?.status !== 'Released' && (
                  <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-xl border-2 border-purple-200 dark:border-purple-800">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <span>🧪</span>
                      Testing Controls
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">Development mode only - bypass time restrictions</p>
                    <Button
                      onClick={showReleaseConfirmation}
                      disabled={loading}
                      variant="destructive"
                      className="bg-purple-600 hover:bg-purple-700 w-full"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Release Payroll Now (Bypass Time Check)
                    </Button>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2">
                      ⚠️ This will immediately release payroll, bypassing the countdown timer. You can print payslips after release.
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleSavePeriod}
                    disabled={savingPeriod || !payrollPeriodStart || !payrollPeriodEnd}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingPeriod ? 'Saving...' : 'Save Period'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card >

          <Card className="border shadow-sm bg-card">
            <CardHeader className="border-b">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <div className="h-10 w-10 rounded-full border bg-muted/30 flex items-center justify-center">
                    <Settings className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-foreground">
                    Reschedule Payroll Period
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure the next payroll period or reschedule the current one.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-xl border">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Period Type</label>
                      <select
                        className="w-full p-2 border rounded-md"
                        value={nextPeriodType}
                        onChange={(e) => setNextPeriodType(e.target.value)}
                      >
                        <option value="Weekly">Weekly</option>
                        <option value="Semi-Monthly">Semi-Monthly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Custom">Custom Range</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Start Date</label>
                      <Input
                        type="date"
                        min={todayPHString}
                        value={nextPeriodStart}
                        onChange={(e) => setNextPeriodStart(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">End Date</label>
                      <Input
                        type="date"
                        min={todayPHString}
                        value={nextPeriodEnd}
                        onChange={(e) => setNextPeriodEnd(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Notes</label>
                      <Input
                        placeholder="Optional notes..."
                        value={nextPeriodNotes}
                        onChange={(e) => setNextPeriodNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleReschedulePeriod}
                    disabled={loading || !nextPeriodStart || !nextPeriodEnd}
                    className="flex-1"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Reschedule Period
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNextPeriodStart('')
                      setNextPeriodEnd('')
                      setNextPeriodNotes('')
                    }}
                  >
                    Clear Form
                  </Button>
                </div>

                {/* Current Period Display */}
                {currentPeriod && (
                  <div className="mt-6 p-4 bg-muted/30 dark:bg-muted/20 border border-border rounded-lg">
                    <h4 className="font-medium mb-2 text-foreground">Current Period</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Start:</span>
                        <p className="font-medium text-foreground">{formatDateForDisplay(new Date(currentPeriod.periodStart))}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">End:</span>
                        <p className="font-medium text-foreground">{formatDateForDisplay(new Date(currentPeriod.periodEnd))}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type:</span>
                        <p className="font-medium text-foreground">{currentPeriod.type}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent >
      </Tabs >

      {/* Payroll Breakdown Dialog - For current payroll individual employees */}
      < PayrollBreakdownDialog
        entry={selectedEntry}
        currentPeriod={currentPeriod}
        isOpen={breakdownDialogOpen}
        onClose={() => {
          setBreakdownDialogOpen(false)
          setOpenInEditMode(false)
        }}
        openInEditMode={openInEditMode}
        showArchiveButton={true}
        onArchive={async (userId: string) => {
          if (!currentPeriod || !selectedEntry) return

          // Check if this is manual archive (Pending) or regular archive (Released)
          if (selectedEntry.status === 'Pending') {
            // Manual archive breakdown - save snapshot
            const confirmed = confirm('Archive this breakdown? This will save the current breakdown data for personnel to view.')
            if (!confirmed) return

            try {
              const response = await fetch('/api/admin/payroll/save-breakdown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  periodStart: currentPeriod.periodStart,
                  periodEnd: currentPeriod.periodEnd,
                  breakdownData: selectedEntry.breakdown
                })
              })

              const data = await response.json()

              if (response.ok) {
                alert('Breakdown archived successfully! Personnel can now view this breakdown.')
                setBreakdownDialogOpen(false)
                await loadPayrollData()
                setActiveTab('saved') // Switch to Saved Payroll Breakdown tab
              } else {
                alert(`Failed to archive breakdown: ${data.error}`)
              }
            } catch (error) {
              console.error('Error archiving breakdown:', error)
              alert('Failed to archive breakdown')
            }
          } else {
            // Regular archive for Released status
            const confirmed = confirm('Are you sure you want to archive this payroll entry? This action cannot be undone.')
            if (!confirmed) return

            try {
              const response = await fetch('/api/admin/payroll/archive-entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  periodStart: currentPeriod.periodStart,
                  periodEnd: currentPeriod.periodEnd
                })
              })

              const data = await response.json()

              if (response.ok) {
                alert('Payroll entry archived successfully!')
                setBreakdownDialogOpen(false)
                loadPayrollData()
              } else {
                alert(`Failed to archive: ${data.error}`)
              }
            } catch (error) {
              console.error('Error archiving payroll entry:', error)
              alert('Failed to archive payroll entry')
            }
          }
        }}
      />

      {/* Post-Release Prompt Modal */}
      <Dialog open={showPrintModal} onOpenChange={setShowPrintModal}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
          <div className="p-8 text-center space-y-5">
            <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">Payroll Released Successfully!</DialogTitle>
              <DialogDescription className="text-base text-muted-foreground mt-3">
                Payslips are ready for {totalEmployees} staff.
              </DialogDescription>
              {currentPeriod?.periodStart && currentPeriod?.periodEnd && (
                <div className="text-sm text-muted-foreground mt-3 font-medium">
                  Period: {formatDateForDisplay(new Date(currentPeriod.periodStart))} — {formatDateForDisplay(new Date(currentPeriod.periodEnd))}
                </div>
              )}
            </div>
            <div className="text-base text-muted-foreground">
              Would you like to preview and print the payslips now?
            </div>
          </div>
          <DialogFooter className="px-8 pb-8 flex gap-3 sm:gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={async () => {
                setShowPrintModal(false)
                console.log('🔴 SETTING showArchiveNotification to TRUE from Later button')
                setShowArchiveNotification(true)

                // Fetch the newly archived payroll ID
                try {
                  const res = await fetch('/api/admin/payroll/archived')
                  if (res.ok) {
                    const data = await res.json()
                    if (data.success && data.archivedPayrolls && data.archivedPayrolls.length > 0) {
                      setNewArchivedPayrollId(data.archivedPayrolls[0].id)
                    }
                  }
                } catch (error) {
                  console.error('Error fetching archived payroll ID:', error)
                }

                // Add a subtle reminder toast
                toast('New archived payroll ready to be printed', { icon: '📝' })
              }}
              className="flex-1"
            >
              Later
            </Button>
            <Button
              size="lg"
              onClick={() => {
                setShowPrintModal(false)
                handleGeneratePayslips({ bypassReleaseCheck: true })
              }}
              className="flex-1"
            >
              <Printer className="h-4 w-4 mr-2" />
              Preview & Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payslip Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent
          className="p-0 flex flex-col bg-gradient-to-br from-background to-muted/20"
          style={{
            maxWidth: '1800px',
            width: '95vw',
            height: '98vh'
          }}
        >
          <DialogHeader className="px-6 py-5 border-b bg-card/50 backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <FileText className="h-6 w-6 text-primary" />
                  Payslip Preview
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Review and verify payslips before printing. Use the controls below to navigate and zoom.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm px-3 py-1">
                  {currentPeriod?.periodStart && currentPeriod?.periodEnd
                    ? `${new Date(currentPeriod.periodStart).toLocaleDateString()} - ${new Date(currentPeriod.periodEnd).toLocaleDateString()}`
                    : 'Current Period'
                  }
                </Badge>
              </div>
            </div>

            {/* Quick Summary Stats - Only show if we have payroll data */}
            {payrollEntries.length > 0 && (
              <div className="grid grid-cols-4 gap-3 pt-2">
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Total Gross Pay</div>
                  <div className="text-lg font-bold text-green-900 dark:text-green-300">
                    ₱{payrollEntries.reduce((sum, e) => sum + (e.breakdown?.grossPay || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Total Deductions</div>
                  <div className="text-lg font-bold text-red-900 dark:text-red-300">
                    ₱{payrollEntries.reduce((sum, e) => sum + (e.breakdown?.totalDeductions || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Total Net Pay</div>
                  <div className="text-lg font-bold text-blue-900 dark:text-blue-300">
                    ₱{payrollEntries.reduce((sum, e) => sum + (e.finalNetPay || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <div className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">Avg. Net Pay</div>
                  <div className="text-lg font-bold text-purple-900 dark:text-purple-300">
                    ₱{(payrollEntries.reduce((sum, e) => sum + (e.finalNetPay || 0), 0) / (payrollEntries.length || 1)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Controls */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              {/* View Mode */}
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium text-muted-foreground">View:</label>
                <select
                  className="border-0 bg-transparent text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer"
                  value={previewMode}
                  onChange={(e) => setPreviewMode(e.target.value as 'all' | 'single')}
                >
                  <option value="all">All Staff</option>
                  <option value="single">Single Staff</option>
                </select>
              </div>

              {/* Search */}
              {previewMode === 'single' && (
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 flex-1 max-w-md">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    className="bg-transparent text-sm flex-1 focus:outline-none placeholder:text-muted-foreground/60"
                    placeholder="Search by name or email..."
                    value={previewSearch}
                    onChange={(e) => {
                      setPreviewSearch(e.target.value)
                      setTimeout(() => {
                        try {
                          const doc = iframeRef.current?.contentDocument
                          if (!doc) return
                          const text = e.target.value.trim().toLowerCase()
                          doc.querySelectorAll('[data-search-highlight]')?.forEach(el => {
                            el.removeAttribute('data-search-highlight')
                              ; (el as HTMLElement).style.backgroundColor = ''
                          })
                          if (!text) return
                          const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
                          let node: Node | null
                          const matches: HTMLElement[] = []
                          while ((node = walker.nextNode())) {
                            const value = (node.textContent || '').toLowerCase()
                            if (value.includes(text)) {
                              const parent = (node.parentElement as HTMLElement)
                              if (parent) {
                                parent.setAttribute('data-search-highlight', '1')
                                parent.style.backgroundColor = 'rgba(250, 204, 21, 0.35)'
                                matches.push(parent)
                              }
                            }
                          }
                          if (matches.length > 0) {
                            matches[0].scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }
                        } catch { }
                      }, 50)
                    }}
                  />
                </div>
              )}

              {/* Zoom Controls */}
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 ml-auto">
                <label className="text-sm font-medium text-muted-foreground">Zoom:</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setPreviewScale(s => Math.max(0.5, Number((s - 0.1).toFixed(2))))}
                >
                  -
                </Button>
                <span className="text-sm font-semibold w-14 text-center bg-background rounded px-2 py-1">
                  {Math.round(previewScale * 100)}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setPreviewScale(s => Math.min(2.5, Number((s + 0.1).toFixed(2))))}
                >
                  +
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setPreviewScale(1)
                    resetPan()
                  }}
                >
                  Reset View
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Preview Area with Drag & Scroll */}
          <div
            ref={previewContainerRef}
            className="flex-1 overflow-auto bg-muted/30 relative"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none'
            }}
          >
            <div
              className="flex items-center justify-center p-6"
              style={{
                minWidth: 'fit-content',
                minHeight: '100%'
              }}
            >
              <div
                style={{
                  transform: `scale(${previewScale}) translate(${panPosition.x / previewScale}px, ${panPosition.y / previewScale}px)`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                  width: '1200px',
                  position: 'relative'
                }}
              >
                <iframe
                  title="Payslip Preview"
                  ref={iframeRef}
                  srcDoc={previewHtml}
                  className="w-full border-2 border-border rounded-xl shadow-2xl bg-white"
                  style={{
                    width: '1200px',
                    height: '1600px',
                    display: 'block',
                    pointerEvents: 'none'
                  }}
                />
                {/* Transparent overlay to capture drag events */}
                <div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    pointerEvents: 'auto',
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }}
                />
              </div>
            </div>

            {/* Pan Indicator */}
            {(panPosition.x !== 0 || panPosition.y !== 0) && (
              <div className="absolute top-4 right-4 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-2 z-10">
                <Eye className="h-3 w-3" />
                Pan: {Math.round(panPosition.x)}px, {Math.round(panPosition.y)}px
              </div>
            )}

            {/* Drag Instruction */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary/90 text-primary-foreground text-sm px-4 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2 shadow-lg z-10">
              <Eye className="h-4 w-4" />
              <span className="font-medium">Click & drag to move • Scroll to navigate • Ctrl+Scroll to zoom</span>
            </div>
          </div>

          {/* Enhanced Footer */}
          <DialogFooter className="px-6 py-4 border-t bg-card/50 backdrop-blur-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>Ensure all details are correct before printing</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreviewModal(false)}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Close
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  try {
                    const blob = new Blob([previewHtml], { type: 'text/html' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `payslips-${currentPeriod?.periodStart || 'current'}.html`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    URL.revokeObjectURL(url)
                    toast.success('Payslips downloaded successfully!')
                  } catch (error) {
                    toast.error('Failed to download payslips')
                  }
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download HTML
              </Button>
              <Button
                onClick={() => {
                  const printWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes')
                  if (printWindow) {
                    printWindow.document.write(previewHtml)
                    printWindow.document.close()

                    // Wait for content to load then trigger print
                    setTimeout(() => {
                      printWindow.focus()
                      printWindow.print()
                    }, 500)

                    setShowPreviewModal(false)
                    toast.success('Opening print dialog...')
                  } else {
                    toast.error('Popup blocked. Please allow popups for this site and try again.')
                  }
                }}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Print Payslips
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Archived Payroll Confirmation Modal */}
      <Dialog open={showDeleteArchiveModal} onOpenChange={setShowDeleteArchiveModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Archived Payrolls?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedArchives.length} archived payroll(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteArchiveModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDeleteArchives}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archived Payroll Breakdown Dialog - Personnel List */}
      <Dialog open={archivedBreakdownOpen && !selectedArchivedEntry} onOpenChange={(open) => {
        if (!open) {
          setArchivedBreakdownOpen(false)
          setSelectedArchivedPeriod(null)
          setArchivedPersonnelList([])
        }
      }}>
        <DialogContent className="overflow-y-auto" style={{ maxWidth: '80vw', width: '80vw', maxHeight: '85vh' }}>
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-2xl font-bold">Archived Payroll Breakdown</DialogTitle>
                <DialogDescription className="text-base">
                  {selectedArchivedPeriod && (
                    <>Period: {formatDateForDisplay(new Date(selectedArchivedPeriod.periodStart))} - {formatDateForDisplay(new Date(selectedArchivedPeriod.periodEnd))}</>
                  )}
                </DialogDescription>
              </div>
              <Button onClick={printArchivedOverallDetails} className="gap-2" variant="outline">
                <Printer className="h-4 w-4" />
                Print Overall Details
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, position, or office..."
                className="pl-9"
                value={archivedBreakdownSearchTerm}
                onChange={(e) => setArchivedBreakdownSearchTerm(e.target.value)}
              />
            </div>

            {archivedPersonnelList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No staff found for this period</p>
            ) : (
              (() => {
                // Filter personnel by search term
                const filteredPersonnel = archivedPersonnelList.filter((person) => {
                  if (!archivedBreakdownSearchTerm) return true
                  const searchLower = archivedBreakdownSearchTerm.toLowerCase()
                  const name = person.user?.name?.toLowerCase() || ''
                  const personnelType = person.user?.personnelType?.name?.toLowerCase() || ''
                  const department = person.user?.personnelType?.department?.toLowerCase() || ''
                  return name.includes(searchLower) || personnelType.includes(searchLower) || department.includes(searchLower)
                })

                return (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID Number</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Office</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead className="text-right">Net Pay</TableHead>
                        <TableHead className="text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPersonnel.map((person) => {
                        // Calculate Net Pay exactly like ArchivedPayrollDetailsDialog does
                        const grossPay = Number(person.basicSalary || 0) + Number(person.overtime || 0)
                        const deductions = Number(person.deductions || 0)
                        const displayNetPay = grossPay - deductions

                        return (
                          <TableRow key={person.payroll_entries_id}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{person.users_id || 'N/A'}</TableCell>
                            <TableCell className="font-medium">{person.user?.name || 'N/A'}</TableCell>
                            <TableCell>{person.user?.personnelType?.department || 'N/A'}</TableCell>
                            <TableCell>{person.user?.personnelType?.name || 'N/A'}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(displayNetPay)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedArchivedEntry(person)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )
              })()
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Archived Individual Payslip Dialog - Matches Personnel/Payroll Layout */}
      <ArchivedPayrollDetailsDialog
        entry={selectedArchivedEntry}
        period={selectedArchivedPeriod}
        isOpen={!!selectedArchivedEntry}
        onClose={() => setSelectedArchivedEntry(null)}
      />

      {/* Generate Payroll Confirmation Modal */}
      <Dialog open={showGenerateConfirmModal} onOpenChange={setShowGenerateConfirmModal}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader className="pb-4 border-b">
            <DialogTitle className="text-2xl font-bold">Confirm Payroll Period</DialogTitle>
            <DialogDescription className="text-base">
              Set the range for the payroll you want to generate.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-8">
            {/* 1. Top Header: Large Date Inputs */}
            <div className="bg-muted/30 p-4 rounded-xl border flex flex-col md:flex-row items-end md:items-center gap-4 justify-between">

              <div className="flex-1 w-full relative">
                <Label htmlFor="confirmPeriodStart" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary pointer-events-none" />
                  <Input
                    id="confirmPeriodStart"
                    type="date"
                    value={confirmPeriodStart}
                    onClick={(e) => e.currentTarget.showPicker()}
                    onChange={(e) => {
                      setConfirmPeriodStart(e.target.value)
                      setPeriodValidationError('')
                      if (e.target.value && confirmPeriodEnd && checkPeriodOverlap(e.target.value, confirmPeriodEnd)) {
                        const overlapping = archivedPayrolls.find(archived => {
                          const start = new Date(e.target.value)
                          const end = new Date(confirmPeriodEnd)
                          const archivedStart = new Date(archived.periodStart)
                          const archivedEnd = new Date(archived.periodEnd)
                          return (start <= archivedEnd && end >= archivedStart)
                        })
                        if (overlapping) {
                          const monthYear = new Date(overlapping.periodStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                          setPeriodValidationError(`The period ${monthYear} has already been released.`)
                        }
                      }
                    }}
                    className="pl-10 h-14 text-lg font-semibold bg-background shadow-sm border-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all cursor-pointer"
                  />
                </div>
              </div>

              <div className="hidden md:flex items-center justify-center pt-6 text-muted-foreground/50">
                <TrendingUp className="h-6 w-6 rotate-90" />
              </div>

              <div className="flex-1 w-full relative">
                <Label htmlFor="confirmPeriodEnd" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary pointer-events-none" />
                  <Input
                    id="confirmPeriodEnd"
                    type="date"
                    value={confirmPeriodEnd}
                    onClick={(e) => e.currentTarget.showPicker()}
                    onChange={(e) => {
                      setConfirmPeriodEnd(e.target.value)
                      setPeriodValidationError('')
                      if (confirmPeriodStart && e.target.value && checkPeriodOverlap(confirmPeriodStart, e.target.value)) {
                        const overlapping = archivedPayrolls.find(archived => {
                          const start = new Date(confirmPeriodStart)
                          const end = new Date(e.target.value)
                          const archivedStart = new Date(archived.periodStart)
                          const archivedEnd = new Date(archived.periodEnd)
                          return (start <= archivedEnd && end >= archivedStart)
                        })
                        if (overlapping) {
                          const monthYear = new Date(overlapping.periodStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                          setPeriodValidationError(`The period ${monthYear} has already been released.`)
                        }
                      }
                    }}
                    className="pl-10 h-14 text-lg font-semibold bg-background shadow-sm border-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Smart Suggestion Button */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={suggestNextPeriod}
                className="gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/40 dark:hover:to-indigo-900/40 shadow-md hover:shadow-lg transition-all"
              >
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-blue-700 dark:text-blue-300">Smart Period Suggestion</span>
              </Button>
            </div>

            {/* 2. Middle: Visual Calendar */}
            <div className="flex justify-center py-6 overflow-visible min-h-[450px]">
              <div className="bg-card rounded-xl border shadow-sm p-4 w-fit mx-auto flex items-center justify-center" style={{ zoom: 1.3 }}>
                <CalendarPicker
                  mode="range"
                  selected={{
                    from: confirmPeriodStart ? parseISO(confirmPeriodStart) : undefined,
                    to: confirmPeriodEnd ? parseISO(confirmPeriodEnd) : undefined,
                  }}
                  month={confirmPeriodStart ? parseISO(confirmPeriodStart) : undefined}
                  onMonthChange={(month) => {
                    // Optional: You can add logic here if needed
                  }}
                  onSelect={(range: DateRange | undefined) => {
                    setPeriodValidationError('')
                    if (range?.from) {
                      const startStr = format(range.from, 'yyyy-MM-dd')
                      setConfirmPeriodStart(startStr)

                      if (range.to) {
                        const endStr = format(range.to, 'yyyy-MM-dd')
                        setConfirmPeriodEnd(endStr)

                        // Check Overlap
                        if (checkPeriodOverlap(startStr, endStr)) {
                          const overlapping = archivedPayrolls.find(archived => {
                            const start = new Date(startStr)
                            const end = new Date(endStr)
                            const archivedStart = new Date(archived.periodStart)
                            const archivedEnd = new Date(archived.periodEnd)
                            return (start <= archivedEnd && end >= archivedStart)
                          })
                          if (overlapping) {
                            const monthYear = new Date(overlapping.periodStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                            setPeriodValidationError(`The period ${monthYear} has already been released.`)
                          }
                        }
                      } else {
                        setConfirmPeriodEnd('')
                      }
                    } else {
                      setConfirmPeriodStart('')
                      setConfirmPeriodEnd('')
                    }
                  }}
                  disabled={(date) => date.getDay() === 0 || date.getDay() === 6}
                  numberOfMonths={2}
                  className="rounded-md border p-4"
                />
              </div>
            </div>

            {/* 3. Bottom: Status & Confirmation */}
            <div className="space-y-4">
              {/* Overlap Error */}
              {periodValidationError && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-3 justify-center text-center">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                    {periodValidationError}
                  </p>
                </div>
              )}

              {/* Working Days Summary */}
              {confirmPeriodStart && confirmPeriodEnd && !periodValidationError && (
                <div className="flex flex-col items-center justify-center gap-1 text-muted-foreground bg-muted/30 py-4 rounded-xl border border-dashed border-primary/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-6 w-6 text-green-600 mb-0.5" />
                    <span className="text-lg">
                      Selected duration: <span className="font-bold text-foreground text-2xl">{calculateWorkingDaysInPhilippines(new Date(confirmPeriodStart), new Date(confirmPeriodEnd))} working days</span>
                    </span>
                  </div>
                  <p className="text-xs uppercase tracking-wide opacity-70 font-medium">Excludes Saturdays & Sundays</p>
                </div>
              )}
            </div>

          </div>

          <DialogFooter className="gap-2 sm:gap-0 border-t pt-4">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setShowGenerateConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={confirmGeneratePayroll}
              disabled={!confirmPeriodStart || !confirmPeriodEnd || new Date(confirmPeriodEnd) < new Date(confirmPeriodStart) || !!periodValidationError}
              className="bg-blue-600 hover:bg-blue-700 min-w-[200px] ml-auto shadow-md"
            >
              <FileText className="h-5 w-5 mr-2" />
              Confirm & Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Payroll Confirmation Modal */}
      <Dialog open={showReleaseConfirmModal} onOpenChange={setShowReleaseConfirmModal}>
        <DialogContent className="!max-w-none w-[70vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-600 rounded-lg">
                <Save className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-green-900 dark:text-green-100">
                  Release Payroll Confirmation
                </DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  Please confirm the following before releasing payroll to all employees.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              {/* Top Section - Controls */}
              <div className="flex flex-wrap gap-4">
                {/* Attendance Deductions Info */}
                <div className="flex-1 min-w-[300px] bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-blue-900 dark:text-blue-100 mb-2">
                        Attendance Deductions
                      </h4>
                      <p className="text-base text-blue-700 dark:text-blue-300 leading-relaxed">
                        Do you want to include attendance deductions (late, absent, early timeout) in this payroll release?
                      </p>
                    </div>
                  </div>
                </div>

                {/* Include Attendance Deductions Toggle */}
                <div
                  className="flex-1 min-w-[280px] flex items-center gap-3 p-4 border-2 rounded-lg hover:bg-muted/50 transition-all cursor-pointer hover:border-primary/50 hover:shadow-md"
                  onClick={() => setIncludeAttendanceDeductions(!includeAttendanceDeductions)}
                >
                  <div className={`flex items-center justify-center w-6 h-6 rounded-lg border-2 transition-all ${includeAttendanceDeductions
                    ? 'bg-primary border-primary shadow-lg shadow-primary/30'
                    : 'border-gray-300 dark:border-gray-600'
                    }`}>
                    {includeAttendanceDeductions && (
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-base">Include Attendance Deductions</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Deduct for late arrivals, absences, and early timeouts
                    </p>
                  </div>
                </div>

                {/* Warning Note */}
                <div className="flex-1 min-w-[300px] bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-700 dark:text-yellow-300">
                      <p className="font-bold mb-1.5 text-base">Important Note:</p>
                      <p className="leading-relaxed">Once released, payroll cannot be modified. Please ensure all deductions are correct before proceeding.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section - Attendance Deductions Table */}
              {attendanceDeductions.length > 0 && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-2 border-orange-200 dark:border-orange-800 rounded-lg p-5 shadow-sm flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 bg-orange-600 rounded-lg">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-lg text-orange-900 dark:text-orange-100">
                        Staff with Attendance Deductions
                      </h4>
                      <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                        {new Set(attendanceDeductions.map(d => d.users_id)).size} staff have active attendance deductions • <span className="font-bold">₱1.00 per minute deduction</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto max-h-[calc(90vh-280px)]">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-orange-50 dark:bg-orange-950/30">
                        <tr className="border-b-2 border-orange-300 dark:border-orange-700">
                          <th className="text-left py-3 px-4 font-bold text-lg text-orange-900 dark:text-orange-100">Staff Name</th>
                          <th className="text-center py-3 px-3 font-bold text-lg text-orange-900 dark:text-orange-100 whitespace-nowrap">Late Time</th>
                          <th className="text-center py-3 px-3 font-bold text-lg text-orange-900 dark:text-orange-100 whitespace-nowrap">Absent Days</th>
                          <th className="text-right py-3 px-4 font-bold text-lg text-orange-900 dark:text-orange-100">Deduction</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-200 dark:divide-orange-800">
                        {Array.from(new Set(attendanceDeductions.map(d => d.users_id))).map(userId => {
                          const userDeductions = attendanceDeductions.filter(d => d.users_id === userId)
                          const totalAmount = userDeductions.reduce((sum, d) => sum + d.amount, 0)
                          const staffName = userDeductions[0]?.personnelName || 'Unknown'

                          // Parse notes to extract late and absent details
                          const parseNotes = (notes: string) => {
                            const lateMatch = notes.match(/Late:\s*(\d+)h?\s*(\d+)?m?/i) || notes.match(/Late:\s*(\d+)\s*min/i)
                            const absentMatch = notes.match(/Absent:\s*(\d+)\s*days?/i)

                            let lateHours = 0
                            let lateMinutes = 0
                            let absentDays = 0

                            if (lateMatch) {
                              if (lateMatch[2]) {
                                lateHours = parseInt(lateMatch[1]) || 0
                                lateMinutes = parseInt(lateMatch[2]) || 0
                              } else {
                                const totalMinutes = parseInt(lateMatch[1]) || 0
                                lateHours = Math.floor(totalMinutes / 60)
                                lateMinutes = totalMinutes % 60
                              }
                            }

                            if (absentMatch) {
                              absentDays = parseInt(absentMatch[1]) || 0
                            }

                            return { lateHours, lateMinutes, absentDays }
                          }

                          // Calculate total late and absent
                          let totalLateHours = 0
                          let totalLateMinutes = 0
                          let totalAbsentDays = 0

                          userDeductions.forEach(d => {
                            const parsed = parseNotes(d.notes || '')
                            totalLateHours += parsed.lateHours
                            totalLateMinutes += parsed.lateMinutes
                            totalAbsentDays += parsed.absentDays
                          })

                          totalLateHours += Math.floor(totalLateMinutes / 60)
                          totalLateMinutes = totalLateMinutes % 60

                          return (
                            <tr key={userId} className="hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors border-b border-orange-100 dark:border-orange-900">
                              <td className="py-4 px-4 font-semibold text-lg text-gray-900 dark:text-gray-100">{staffName}</td>
                              <td className="py-4 px-3 text-center text-lg text-orange-700 dark:text-orange-300">
                                {(totalLateHours > 0 || totalLateMinutes > 0) ? (
                                  <span className="font-semibold">
                                    {totalLateHours > 0 && `${totalLateHours}h `}
                                    {totalLateMinutes > 0 && `${totalLateMinutes}m`}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="py-4 px-3 text-center text-lg text-red-700 dark:text-red-300">
                                {totalAbsentDays > 0 ? (
                                  <span className="font-semibold">{totalAbsentDays} {totalAbsentDays === 1 ? 'day' : 'days'}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-right font-bold text-xl text-red-600">-₱{totalAmount.toFixed(2)}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="sticky bottom-0 bg-orange-50 dark:bg-orange-950/30">
                        <tr className="border-t-2 border-orange-300 dark:border-orange-700">
                          <td colSpan={3} className="py-4 px-4 text-right font-bold text-lg text-orange-900 dark:text-orange-100">Total Attendance Deductions:</td>
                          <td className="py-4 px-4 text-right font-bold text-2xl text-red-600">-₱{attendanceDeductions.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900 gap-3 z-10 flex-row items-center shadow-lg">
            <Button
              variant="outline"
              onClick={() => {
                setShowReleaseConfirmModal(false)
                router.push('/admin/attendance-deduction')
              }}
              disabled={loading}
              className="border-2 border-red-500 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-600 dark:border-red-600 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950 font-semibold px-6 py-3 text-lg shadow-md"
            >
              <ClipboardMinus className="h-6 w-6 mr-2" />
              Add Attendance Deduction
            </Button>
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={() => setShowReleaseConfirmModal(false)}
              disabled={loading}
              className="px-7 py-3 text-lg font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReleasePayroll}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg font-bold shadow-lg shadow-green-600/30"
            >
              <Save className="h-6 w-6 mr-2" />
              {loading ? 'Releasing...' : 'Confirm & Release Payroll'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div >
  )
}
