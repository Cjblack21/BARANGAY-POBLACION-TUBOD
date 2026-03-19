"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Eye,
  FilterX,
  Filter
} from "lucide-react"
import { Calendar } from "@/components/ui/calendar"

type AttendanceRecord = {
  id: string
  date: string
  status: string
  timeIn: string | null
  timeOut: string | null
  hours: string
  dayOfWeek: string
}

type AttendanceDeduction = {
  deductions_id: string
  deductionType: string
  amount: number
  notes: string
  appliedAt: string
}

type AttendanceData = {
  records: AttendanceRecord[]
  statistics: {
    totalDays: number
    presentDays: number
    absentDays: number
    lateDays: number
    attendanceRate: number
    totalHours: string
  }
  period: {
    startDate: string
    endDate: string
  }
  deductions?: AttendanceDeduction[]
}

export default function PersonnelAttendance() {
  const [data, setData] = useState<AttendanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDateFilter, setSelectedDateFilter] = useState<Date | undefined>(undefined)
  const [selectedDeduction, setSelectedDeduction] = useState<AttendanceDeduction | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const loadAttendanceData = async (year: number) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('year', year.toString())
      
      const res = await fetch(`/api/personnel/attendance?${params.toString()}`)
      if (res.ok) {
        const attendanceData = await res.json()
        setData(attendanceData)
      } else {
        console.error('Failed to load attendance data')
      }
    } catch (error) {
      console.error('Error loading attendance data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAttendanceData(currentYear)
  }, [currentYear])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'ABSENT':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'LATE':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      PRESENT: "default" as const,
      ABSENT: "destructive" as const,
      LATE: "secondary" as const,
      PARTIAL: "secondary" as const,
      NON_WORKING: "outline" as const,
      PENDING: "secondary" as const,
    }

    const labels = {
      PRESENT: "Present",
      ABSENT: "Absent",
      LATE: "Late",
      PARTIAL: "Partial",
      NON_WORKING: "Non-Working",
      PENDING: "Pending",
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '—'
    const date = new Date(timeString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
  }

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[month - 1]
  }

  const getMonthFromDate = (dateString: string) => {
    const date = new Date(dateString)
    return getMonthName(date.getMonth() + 1)
  }

  const handleViewDetails = (deduction: AttendanceDeduction) => {
    setSelectedDeduction(deduction)
    setShowDetailsModal(true)
  }

  const filteredRecords = useMemo(() => {
    if (!data?.records) return []
    
    return data.records.filter(record => {
      // Calendar Date filter
      if (selectedDateFilter) {
        const recordDate = new Date(record.date)
        if (recordDate.toDateString() !== selectedDateFilter.toDateString()) {
          return false
        }
      }
      
      // Text search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        
        const recordDate = new Date(record.date)
        const monthName = recordDate.toLocaleString('default', { month: 'long' }).toLowerCase()
        const monthShortMatch = recordDate.toLocaleString('default', { month: 'short' }).toLowerCase()
        const yearStr = recordDate.getFullYear().toString()
        const exactDateStr = recordDate.toLocaleDateString()
        const exactDateStrEnUs = recordDate.toLocaleDateString('en-US').toLowerCase()
        
        const terms = term.split(' ').filter(t => t !== 'in' && t !== 'on' && t !== 'at' && t.length > 0)
        
        const allTermsMatch = terms.every(t => 
           record.status.toLowerCase().includes(t) || 
           monthName.includes(t) || 
           monthShortMatch.includes(t) || 
           yearStr.includes(t) || 
           exactDateStr.includes(t) ||
           exactDateStrEnUs.includes(t) ||
           record.dayOfWeek.toLowerCase().includes(t)
        )

        return allTermsMatch
      }
      
      return true
    })
  }, [data, searchTerm, selectedDateFilter])

  if (loading && !data) {
    return (
      <div className="flex-1 space-y-6 p-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Loading...</h2>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 space-y-6 p-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Error</h2>
            <p className="text-muted-foreground">Failed to load attendance data</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2 sm:gap-3">
            <CalendarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            Attendance Logs
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Your detailed attendance history</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border rounded-lg p-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentYear(y => y - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
          </Button>
          <span className="font-semibold px-4 tabular-nums">{currentYear}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentYear(y => y + 1)}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Mobile Filter Toggle */}
        <div className="lg:hidden">
          <Button 
            variant="outline" 
            className="w-full flex justify-between items-center" 
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            <span className="flex items-center gap-2"><Filter className="h-4 w-4" /> Search & Filters</span>
            {showMobileFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Left Sidebar - Filters */}
        <div className={`space-y-6 ${showMobileFilters ? 'block' : 'hidden'} lg:block`}>
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Search className="h-4 w-4" /> Search & Filter
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="e.g. absent in january..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="border rounded-lg p-3 bg-white dark:bg-slate-950 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDateFilter}
                  onSelect={setSelectedDateFilter}
                  className="rounded-md"
                  defaultMonth={new Date(currentYear, new Date().getMonth())}
                />
              </div>
              {(searchTerm || selectedDateFilter) && (
                <Button 
                  variant="ghost" 
                  onClick={() => { setSearchTerm(''); setSelectedDateFilter(undefined); }} 
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  <FilterX className="h-4 w-4 mr-2" /> Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Content - Table & Deductions */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Attendance Records
                </CardTitle>
                <Badge variant="secondary">
                  {filteredRecords.length} {filteredRecords.length === 1 ? 'Record' : 'Records'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRecords.length > 0 ? (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time In</TableHead>
                        <TableHead>Time Out</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>
                                {new Date(record.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: '2-digit',
                                  year: 'numeric'
                                })}
                              </span>
                              <span className="text-xs text-muted-foreground">{record.dayOfWeek}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(record.status)}
                              {getStatusBadge(record.status)}
                            </div>
                          </TableCell>
                          <TableCell>{formatTime(record.timeIn)}</TableCell>
                          <TableCell>{formatTime(record.timeOut)}</TableCell>
                          <TableCell className="text-right font-medium">{record.hours}h</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-lg font-medium">No records found</p>
                  <p className="text-sm">Try adjusting your search or calendar filter</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attendance Deductions */}
          {data.deductions && data.deductions.length > 0 && (
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    Attendance Deductions
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.deductions.map((deduction) => (
                    <div 
                      key={deduction.deductions_id}
                      className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-red-200 dark:border-red-800"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <Badge variant="destructive" className="w-fit">{deduction.deductionType}</Badge>
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              {new Date(deduction.appliedAt).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{deduction.notes}</p>
                        </div>
                        <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 sm:ml-4">
                          <p className="text-xl sm:text-2xl font-bold text-red-600">
                            -{formatCurrency(deduction.amount)}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(deduction)}
                          >
                            <Eye className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline">View Details</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Total Deductions */}
                  <div className="border-t border-red-200 dark:border-red-800 pt-3 mt-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-red-100 dark:bg-red-900/30 rounded-lg p-3 sm:p-4">
                      <span className="font-semibold text-sm sm:text-base text-red-900 dark:text-red-100">
                        Total Attendance Deductions:
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-red-600">
                        -{formatCurrency(
                          data.deductions.reduce((sum, d) => sum + d.amount, 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* View Details Modal for Deductions */}
          {showDetailsModal && selectedDeduction && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
              <div className="bg-white dark:bg-slate-900 rounded-lg max-w-2xl w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                      Deduction Details
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetailsModal(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Deduction Type</label>
                    <div className="mt-2">
                      <Badge variant="destructive" className="text-base px-3 py-1">
                        {selectedDeduction.deductionType}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date Applied</label>
                    <div className="mt-2 text-lg font-semibold">
                      {new Date(selectedDeduction.appliedAt).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Deduction Amount</label>
                    <div className="mt-2 text-3xl font-bold text-red-600">
                      -{formatCurrency(selectedDeduction.amount)}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Reason</label>
                    <div className="mt-2 p-4 bg-muted/30 rounded-lg border">
                      <p className="text-base">{selectedDeduction.notes}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t p-6 flex justify-end">
                  <Button onClick={() => setShowDetailsModal(false)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
