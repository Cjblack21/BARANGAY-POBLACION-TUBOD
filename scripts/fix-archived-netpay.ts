import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixArchivedNetPay() {
  console.log('🔧 Starting to fix archived payroll net pay values...')

  try {
    // Get all archived payroll entries
    const archivedEntries = await prisma.payroll_entries.findMany({
      where: {
        status: 'ARCHIVED'
      }
    })

    console.log(`📦 Found ${archivedEntries.length} archived entries to check`)

    let fixedCount = 0

    for (const entry of archivedEntries) {
      try {
        // Parse the breakdown snapshot
        let snapshot: any = null
        if (entry.breakdownSnapshot) {
          try {
            snapshot = typeof entry.breakdownSnapshot === 'string'
              ? JSON.parse(entry.breakdownSnapshot)
              : entry.breakdownSnapshot
          } catch (e) {
            console.error(`❌ Failed to parse snapshot for entry ${entry.payroll_entries_id}`)
            continue
          }
        }

        if (!snapshot) {
          console.log(`⚠️  No snapshot for entry ${entry.payroll_entries_id}, skipping`)
          continue
        }

        // Recalculate net pay from breakdown
        const grossSalary = Number(entry.basicSalary || 0) + Number(entry.overtime || 0)
        
        // Try to get totalDeductions from snapshot, or calculate from stored deductions field
        let totalDeductions = Number(snapshot.totalDeductions || 0)
        
        // If snapshot doesn't have totalDeductions, use the deductions field from entry
        if (totalDeductions === 0 && entry.deductions) {
          totalDeductions = Number(entry.deductions || 0)
        }
        
        // If still 0, try to calculate from deduction details in snapshot
        if (totalDeductions === 0) {
          const deductionDetails = snapshot.deductionDetails || []
          const attendanceDeductionDetails = snapshot.attendanceDeductionDetails || []
          const loanDetails = snapshot.loanDetails || []
          
          const deductionsSum = deductionDetails.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0)
          const attendanceSum = attendanceDeductionDetails.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0)
          const loansSum = loanDetails.reduce((sum: number, l: any) => sum + Number(l.payment || l.amount || 0), 0)
          
          totalDeductions = deductionsSum + attendanceSum + loansSum
        }
        
        const correctNetPay = grossSalary - totalDeductions
        const currentNetPay = Number(entry.netPay || 0)

        console.log(`📊 Entry ${entry.payroll_entries_id}: Gross=₱${grossSalary.toFixed(2)}, Deductions=₱${totalDeductions.toFixed(2)}, Current NetPay=₱${currentNetPay.toFixed(2)}, Correct NetPay=₱${correctNetPay.toFixed(2)}`)

        // Check if net pay needs fixing (allow 0.01 difference for rounding)
        if (Math.abs(currentNetPay - correctNetPay) > 0.01) {
          console.log(`🔧 Fixing entry ${entry.payroll_entries_id}:`)
          console.log(`   Current Net Pay: ₱${currentNetPay.toFixed(2)}`)
          console.log(`   Correct Net Pay: ₱${correctNetPay.toFixed(2)}`)
          console.log(`   Gross: ₱${grossSalary.toFixed(2)}, Deductions: ₱${totalDeductions.toFixed(2)}`)

          // Update the entry
          await prisma.payroll_entries.update({
            where: { payroll_entries_id: entry.payroll_entries_id },
            data: {
              netPay: correctNetPay,
              deductions: totalDeductions
            }
          })

          fixedCount++
        }
      } catch (error) {
        console.error(`❌ Error processing entry ${entry.payroll_entries_id}:`, error)
      }
    }

    console.log(`✅ Fixed ${fixedCount} archived payroll entries`)
    console.log(`✅ Checked ${archivedEntries.length} total entries`)

  } catch (error) {
    console.error('❌ Error fixing archived net pay:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

fixArchivedNetPay()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
