"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Flag, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "react-hot-toast"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns"

interface Holiday {
  holidays_id: string
  name: string
  date: string
  type: 'NATIONAL' | 'RELIGIOUS' | 'COMPANY'
  description?: string
  createdAt: string
}

export default function PersonnelHolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showHolidayDetails, setShowHolidayDetails] = useState(false)

  useEffect(() => {
    fetchHolidays()
  }, [])

  const fetchHolidays = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/personnel/holidays')
      const data = await response.json()
      if (response.ok) {
        setHolidays(data.holidays || [])
      } else {
        toast.error('Failed to fetch holidays')
      }
    } catch (error) {
      console.error('Error fetching holidays:', error)
      toast.error('Failed to fetch holidays')
    } finally {
      setIsLoading(false)
    }
  }

  const getHolidaysForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return holidays.filter(h => h.date.split('T')[0] === dateStr)
  }

  const getCalendarDays = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    return eachDayOfInterval({ start: monthStart, end: monthEnd })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'NATIONAL': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'RELIGIOUS': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'COMPANY': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    if (type === 'NATIONAL') return <Flag className="h-4 w-4 text-red-500" />
    if (type === 'RELIGIOUS') return <MapPin className="h-4 w-4 text-purple-500" />
    return <Calendar className="h-4 w-4 text-blue-500" />
  }

  const handleDateClick = (date: Date) => {
    const dateHolidays = getHolidaysForDate(date)
    if (dateHolidays.length > 0) {
      setSelectedDate(date)
      setShowHolidayDetails(true)
    }
  }

  const getSelectedDateHolidays = () => {
    if (!selectedDate) return []
    return getHolidaysForDate(selectedDate)
  }

  const getUpcomingHolidays = () => {
    const today = new Date()
    const next30Days = new Date()
    next30Days.setDate(today.getDate() + 30)
    return holidays
      .filter(h => {
        const holidayDate = new Date(h.date)
        return holidayDate >= today && holidayDate <= next30Days
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5)
  }

  const monthHolidays = holidays
    .filter(h => isSameMonth(new Date(h.date), currentMonth))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Get day of week for the first day of month (for calendar offset)
  const firstDayOfMonth = startOfMonth(currentMonth).getDay()

  return (
    <div className="space-y-4 px-1">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Holidays Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">View scheduled holidays and non-working days</p>
      </div>

      {/* Upcoming Holidays - shown prominently on mobile */}
      {getUpcomingHolidays().length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Flag className="h-4 w-4 text-orange-500" />
              Upcoming Holidays
            </CardTitle>
            <CardDescription>Next 30 days</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {getUpcomingHolidays().map((holiday) => (
                <div key={holiday.holidays_id} className="flex items-center gap-3 p-2.5 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-shrink-0">{getTypeIcon(holiday.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{holiday.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(holiday.date), 'MMM dd, yyyy (EEE)')}
                    </p>
                  </div>
                  <Badge className={`${getTypeColor(holiday.type)} text-xs shrink-0`}>
                    {holiday.type === 'NATIONAL' ? 'Nat.' : holiday.type === 'RELIGIOUS' ? 'Rel.' : 'Co.'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content — calendar + list stack on mobile, side-by-side on lg */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Calendar — full width on mobile, 1col on lg */}
        <div className="lg:col-span-1 order-first lg:order-last">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold text-sm">{format(currentMonth, 'MMMM yyyy')}</h3>
                <Button variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 px-2 pb-3">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={i} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
                ))}
              </div>
              {/* Empty offset cells */}
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {getCalendarDays().map((day, index) => {
                  const dayHolidays = getHolidaysForDate(day)
                  const isToday = isSameDay(day, new Date())
                  const hasHolidays = dayHolidays.length > 0
                  const isSunday = day.getDay() === 0

                  return (
                    <div
                      key={index}
                      onClick={() => handleDateClick(day)}
                      className={`
                        relative flex flex-col items-center justify-center aspect-square rounded text-xs cursor-pointer transition-colors
                        ${isToday ? 'bg-primary text-primary-foreground font-bold' : ''}
                        ${hasHolidays && !isToday ? 'bg-yellow-50 border border-yellow-300 dark:bg-yellow-950 dark:border-yellow-800' : ''}
                        ${isSunday && !hasHolidays && !isToday ? 'text-red-500' : ''}
                        ${!hasHolidays && !isToday ? 'hover:bg-muted' : 'hover:opacity-80'}
                      `}
                    >
                      <span className="font-medium leading-none">{format(day, 'd')}</span>
                      {hasHolidays && (
                        <div className="w-1 h-1 bg-blue-500 rounded-full mt-0.5" />
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Legend */}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <span>Holiday</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded" />
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="text-red-500 font-medium">S</span>
                  <span>Sunday</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Holiday List — full width on mobile, 2col on lg */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  {format(currentMonth, 'MMMM yyyy')}
                </CardTitle>
                <div className="flex gap-1.5">
                  <Button variant="outline" size="sm" className="h-8 px-2"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-3 text-xs"
                    onClick={() => setCurrentMonth(new Date())}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-2"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                  <p className="text-muted-foreground mt-2 text-sm">Loading holidays...</p>
                </div>
              ) : monthHolidays.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No holidays in {format(currentMonth, 'MMMM yyyy')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {monthHolidays.map((holiday) => (
                    <div key={holiday.holidays_id}
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-shrink-0 mt-0.5">{getTypeIcon(holiday.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{holiday.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(holiday.date), 'MMMM dd, yyyy (EEEE)')}
                        </p>
                        {holiday.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{holiday.description}</p>
                        )}
                      </div>
                      <Badge className={`${getTypeColor(holiday.type)} text-xs shrink-0 mt-0.5`}>
                        {holiday.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Holiday Details Dialog */}
      <Dialog open={showHolidayDetails} onOpenChange={setShowHolidayDetails}>
        <DialogContent className="w-[95vw] max-w-lg sm:max-w-xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5" />
              {selectedDate && format(selectedDate, 'MMMM dd, yyyy')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {getSelectedDateHolidays().map((holiday, index) => (
              <div key={index} className="p-3 border rounded-lg bg-muted/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-sm">{holiday.name}</h5>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(holiday.date), 'MMMM dd, yyyy (EEEE)')}
                    </p>
                    {holiday.description && (
                      <p className="text-sm mt-2">{holiday.description}</p>
                    )}
                  </div>
                  <Badge className={`${getTypeColor(holiday.type)} text-xs shrink-0`}>
                    {holiday.type}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
