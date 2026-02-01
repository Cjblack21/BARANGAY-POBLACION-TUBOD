import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📦 API: Fetching archived (released) payrolls...')

    // Get all RELEASED and ARCHIVED payroll entries
    const releasedPayrolls = await prisma.payroll_entries.findMany({
      where: {
        status: { in: ['RELEASED', 'ARCHIVED'] },
        releasedAt: { not: null }
      },
      include: {
        users: {
          select: {
            users_id: true,
            name: true,
            email: true,
            personnel_types: {
              select: {
                name: true,
                basicSalary: true,
                department: true,
                type: true
              }
            }
          }
        }
      },
      orderBy: [
        { releasedAt: 'desc' },
        { periodEnd: 'desc' }
      ]
    })

    console.log(`📦 Found ${releasedPayrolls.length} released payroll entries`)
    
    if (releasedPayrolls.length > 0) {
      console.log('📦 Sample entry:', {
        status: releasedPayrolls[0].status,
        periodStart: releasedPayrolls[0].periodStart,
        periodEnd: releasedPayrolls[0].periodEnd,
        releasedAt: releasedPayrolls[0].releasedAt,
        netPay: releasedPayrolls[0].netPay,
        hasBreakdown: !!releasedPayrolls[0].breakdownSnapshot
      })
    }

    // Group by period for better organization and calculate breakdown
    const payrollsByPeriod = releasedPayrolls.reduce((acc, payroll) => {
      const periodKey = `${payroll.periodStart.toISOString().split('T')[0]}_${payroll.periodEnd.toISOString().split('T')[0]}`
      
      if (!acc[periodKey]) {
        acc[periodKey] = {
          id: periodKey,
          periodStart: payroll.periodStart.toISOString(),
          periodEnd: payroll.periodEnd.toISOString(),
          archivedAt: payroll.archivedAt?.toISOString() || new Date().toISOString(),
          releasedAt: payroll.releasedAt?.toISOString() || new Date().toISOString(),
          releasedBy: (payroll as any).releasedBy || 'System',
          totalEmployees: 0,
          totalGrossSalary: 0,
          totalDeductions: 0,
          totalNetPay: 0,
          totalExpenses: 0,
          payrolls: []
        }
      }
      
      // Calculate breakdown
      const grossSalary = Number(payroll.basicSalary) || 0
      const deductions = Number(payroll.deductions) || 0
      const netPay = Number(payroll.netPay) || 0
      
      acc[periodKey].totalEmployees += 1
      acc[periodKey].totalGrossSalary += grossSalary
      acc[periodKey].totalDeductions += deductions
      acc[periodKey].totalNetPay += netPay
      acc[periodKey].totalExpenses += grossSalary
      
      // Transform the data to match frontend expectations
      const transformedPayroll = {
        ...payroll,
        user: {
          name: payroll.users?.name || null,
          email: payroll.users?.email || null,
          users_id: payroll.users?.users_id || payroll.users_id,
          personnelType: payroll.users?.personnel_types ? {
            name: payroll.users.personnel_types.name,
            basicSalary: payroll.users.personnel_types.basicSalary,
            department: payroll.users.personnel_types.department,
            type: payroll.users.personnel_types.type
          } : null
        }
      }
      
      acc[periodKey].payrolls.push(transformedPayroll)
      return acc
    }, {} as Record<string, any>)

    const result = Object.values(payrollsByPeriod)
    console.log(`📦 Grouped into ${result.length} periods`)
    if (result.length > 0) {
      console.log('📦 First period:', {
        periodStart: result[0].periodStart,
        periodEnd: result[0].periodEnd,
        totalEmployees: result[0].totalEmployees,
        payrollsCount: result[0].payrolls.length
      })
    }

    return NextResponse.json({
      success: true,
      archivedPayrolls: result,
      totalCount: releasedPayrolls.length
    })

  } catch (error) {
    console.error('Error fetching archived payrolls:', error)
    return NextResponse.json(
      { error: 'Failed to fetch archived payrolls' },
      { status: 500 }
    )
  }
}











