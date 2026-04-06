"use client"

import { useState } from "react"
import { Search, Landmark, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function StaffSalaryTable({ staff }: { staff: any[] }) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredStaff = staff.filter((s) => {
    const searchLower = searchQuery.toLowerCase()
    return (
      s.name.toLowerCase().includes(searchLower) ||
      s.email.toLowerCase().includes(searchLower) ||
      (s.id && s.id.toLowerCase().includes(searchLower)) ||
      s.position.toLowerCase().includes(searchLower) ||
      s.department.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <Input
          placeholder="Search staff by name, position, or BLGU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 border-slate-300 dark:border-slate-700"
        />
      </div>

      <div className="rounded-md border">
        {filteredStaff.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[100px]">ID Number</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>BLGU</TableHead>
                <TableHead className="text-right">Basic Salary</TableHead>
                <TableHead className="text-right">Gross Pay</TableHead>
                <TableHead className="text-right">Latest Net Pay</TableHead>
                <TableHead className="text-center">Last Payroll</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <span className="inline-flex items-center font-mono text-xs font-medium text-muted-foreground bg-secondary/60 px-2.5 py-1 rounded-md">
                      {s.id}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="relative h-9 w-9 rounded-full overflow-hidden bg-muted flex-shrink-0">
                        {s.avatar && s.avatar.trim().length > 0 && s.avatar !== "null" ? (
                          <img src={s.avatar} alt={s.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-slate-500 text-white font-semibold text-xs">
                            {s.name?.split(' ').filter(Boolean).map((n: string) => n.charAt(0)).join('').substring(0, 2).toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-foreground">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-medium text-xs px-2.5 py-1">
                      {s.position}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                      s.department === 'Barangay Officials'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                    }`}>
                      {s.department === 'Barangay Officials' 
                        ? <span className="flex items-center gap-1"><Landmark className="h-3.5 w-3.5" /> Official</span> 
                        : <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Staff</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₱{s.basicSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-right font-medium text-blue-600">
                    {s.grossPay !== null ? (
                      `₱${s.grossPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    ) : (
                      <span className="text-muted-foreground font-normal text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {s.latestNetPay !== null ? (
                      `₱${s.latestNetPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    ) : (
                      <span className="text-muted-foreground font-normal text-xs">No payroll yet</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {s.lastPayrollDate
                      ? new Date(s.lastPayrollDate).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-10 text-muted-foreground text-sm">
            {staff.length === 0 ? "No active staff found." : "No staff matches your search."}
          </div>
        )}
      </div>
    </div>
  )
}
