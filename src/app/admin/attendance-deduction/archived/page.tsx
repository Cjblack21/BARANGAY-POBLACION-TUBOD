"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Archive } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "react-hot-toast"
import { Badge } from "@/components/ui/badge"

type ArchivedAttendanceDeduction = {
    deductions_id: string
    users_id: string
    staffName: string
    deductionType: string
    amount: number
    notes: string
    appliedAt: string
    archivedAt: string | null
}

export default function ArchivedAttendanceDeductionsPage() {
    const [archivedDeductions, setArchivedDeductions] = useState<ArchivedAttendanceDeduction[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        loadArchivedDeductions()
    }, [])

    async function loadArchivedDeductions() {
        try {
            setLoading(true)
            const res = await fetch("/api/admin/attendance-deductions?archived=true")
            if (res.ok) {
                const data = await res.json()
                setArchivedDeductions(data.deductions || [])
            } else {
                toast.error("Failed to load archived deductions")
            }
        } catch (e) {
            console.error("Failed to load archived deductions:", e)
            toast.error("Failed to load archived deductions")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Archive className="h-8 w-8 text-blue-600" />
                        Archived Attendance Deductions
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        View all archived attendance-based deductions
                    </p>
                </div>
                <Button variant="outline" onClick={() => router.push('/admin/attendance-deduction')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Attendance Deduction
                </Button>
            </div>

            {/* Archived Deductions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Archived Deductions History</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                            <p className="mt-4 text-muted-foreground">Loading archived deductions...</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Staff</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Date Added</TableHead>
                                    <TableHead>Archived Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {archivedDeductions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12">
                                            <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                            <p className="text-lg font-medium text-muted-foreground">No archived deductions found</p>
                                            <p className="text-sm text-muted-foreground mt-2">
                                                Deleted attendance deductions will appear here
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    archivedDeductions.map((deduction) => (
                                        <TableRow key={deduction.deductions_id}>
                                            <TableCell className="font-medium">{deduction.staffName}</TableCell>
                                            <TableCell>
                                                <Badge variant="destructive">{deduction.deductionType}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{deduction.notes}</TableCell>
                                            <TableCell className="text-right font-medium text-red-600">
                                                -₱{deduction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(deduction.appliedAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {deduction.archivedAt ? new Date(deduction.archivedAt).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                }) : 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
