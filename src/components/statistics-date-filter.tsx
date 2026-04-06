"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SSRSafe } from "@/components/ssr-safe"
import { useRouter, useSearchParams } from "next/navigation"

const months = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
]

const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

export function StatisticsDateFilter({ defaultMonth, defaultYear }: { defaultMonth: number, defaultYear: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentMonth = searchParams.get("month") ? parseInt(searchParams.get("month")!) : defaultMonth
  const currentYear = searchParams.get("year") ? parseInt(searchParams.get("year")!) : defaultYear

  const updateFilters = (month: number, year: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("month", month.toString())
    params.set("year", year.toString())
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <SSRSafe>
        <Select 
          value={currentMonth.toString()} 
          onValueChange={(val) => updateFilters(parseInt(val), currentYear)}
        >
          <SelectTrigger className="w-32 h-10 border-slate-300 dark:border-slate-700 bg-white dark:bg-sidebar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value.toString()}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SSRSafe>
      <SSRSafe>
        <Select 
          value={currentYear.toString()} 
          onValueChange={(val) => updateFilters(currentMonth, parseInt(val))}
        >
          <SelectTrigger className="w-24 h-10 border-slate-300 dark:border-slate-700 bg-white dark:bg-sidebar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SSRSafe>
    </div>
  )
}
