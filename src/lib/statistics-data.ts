import { prisma } from "@/lib/prisma"
import { startOfMonth, endOfMonth, format } from "date-fns"

export async function getStaffBreakdown() {
  try {
    const staff = await prisma.users.findMany({
      where: { isActive: true, role: "PERSONNEL" },
      select: {
        users_id: true,
        name: true,
        email: true,
        personnel_types: {
          select: {
            name: true,
            basicSalary: true,
            department: true,
          },
        },
        payroll_entries: {
          orderBy: { processedAt: "desc" },
          take: 1,
          select: { netPay: true, processedAt: true },
        },
      },
      orderBy: { name: "asc" },
    })

    return staff.map((s) => ({
      id: s.users_id,
      name: s.name ?? "—",
      email: s.email,
      position: s.personnel_types?.name ?? "—",
      department: s.personnel_types?.department ?? "—",
      basicSalary: Number(s.personnel_types?.basicSalary ?? 0),
      latestNetPay: s.payroll_entries[0]
        ? Number(s.payroll_entries[0].netPay)
        : null,
      lastPayrollDate: s.payroll_entries[0]?.processedAt ?? null,
    }))
  } catch (error) {
    console.error("Error fetching staff breakdown:", error)
    return []
  }
}

export async function getDeductionBreakdown() {
  try {
    const today = new Date()
    const start = startOfMonth(today)
    const end = endOfMonth(today)

    const grouped = await prisma.deductions.groupBy({
      by: ["deduction_types_id"],
      where: {
        appliedAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
      _count: true,
    })

    const typeIds = grouped.map((g) => g.deduction_types_id).filter(Boolean)

    const types = await prisma.deduction_types.findMany({
      where: { deduction_types_id: { in: typeIds } },
      select: { deduction_types_id: true, name: true },
    })

    const typeMap = Object.fromEntries(types.map((t) => [t.deduction_types_id, t.name]))

    return grouped
      .map((g) => ({
        typeName: typeMap[g.deduction_types_id] ?? "Unknown",
        totalAmount: Number(g._sum?.amount ?? 0),
        count: g._count,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
  } catch (error) {
    console.error("Error fetching deduction breakdown:", error)
    return []
  }
}

export async function getLoansSummary() {
  try {
    const [active, completed, pending] = await Promise.all([
      prisma.loans.aggregate({
        where: { status: "ACTIVE" },
        _count: { loans_id: true },
        _sum: { balance: true, amount: true },
      }),
      prisma.loans.aggregate({
        where: { status: "COMPLETED" },
        _count: { loans_id: true },
        _sum: { amount: true },
      }),
      prisma.loans.aggregate({
        where: { status: "PENDING" },
        _count: { loans_id: true },
        _sum: { amount: true },
      }),
    ])

    return {
      active: {
        count: active._count.loans_id,
        balance: Number(active._sum.balance ?? 0),
        totalAmount: Number(active._sum.amount ?? 0),
      },
      completed: {
        count: completed._count.loans_id,
        totalAmount: Number(completed._sum.amount ?? 0),
      },
      pending: {
        count: pending._count.loans_id,
        totalAmount: Number(pending._sum.amount ?? 0),
      },
    }
  } catch (error) {
    console.error("Error fetching loans summary:", error)
    return {
      active: { count: 0, balance: 0, totalAmount: 0 },
      completed: { count: 0, totalAmount: 0 },
      pending: { count: 0, totalAmount: 0 },
    }
  }
}

export async function getMonthlyPayrollTrend() {
  try {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
    sixMonthsAgo.setDate(1)
    sixMonthsAgo.setHours(0, 0, 0, 0)

    const data = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(processedAt, '%Y-%m') as month,
        SUM(basicSalary) as grossPay,
        SUM(deductions) as totalDeductions,
        SUM(netPay) as netPay,
        COUNT(*) as entries
      FROM payroll_entries
      WHERE processedAt >= ${sixMonthsAgo}
      GROUP BY DATE_FORMAT(processedAt, '%Y-%m')
      ORDER BY month ASC
    ` as Array<{
      month: string
      grossPay: number
      totalDeductions: number
      netPay: number
      entries: bigint
    }>

    return data.map((row) => ({
      month: format(new Date(row.month + "-01"), "MMM yyyy"),
      grossPay: Number(row.grossPay ?? 0),
      deductions: Number(row.totalDeductions ?? 0),
      netPay: Number(row.netPay ?? 0),
      entries: Number(row.entries ?? 0),
    }))
  } catch (error) {
    console.error("Error fetching monthly payroll trend:", error)
    return []
  }
}
