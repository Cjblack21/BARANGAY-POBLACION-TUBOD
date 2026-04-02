"use client"

import { useState } from "react"
import { Search } from "lucide-react"
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
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>BLGU</TableHead>
                <TableHead className="text-right">Basic Salary</TableHead>
                <TableHead className="text-right">Latest Net Pay</TableHead>
                <TableHead className="text-center">Last Payroll</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((s) => (
                <TableRow key={s.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{s.position}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.department}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₱{s.basicSalary.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-green-600">
                    {s.latestNetPay !== null ? (
                      `₱${s.latestNetPay.toLocaleString()}`
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
