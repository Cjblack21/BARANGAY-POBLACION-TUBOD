import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixEmmaArchived() {
  console.log('🔧 Fixing EMMA MAGPATAO archived entry...')

  try {
    // Find EMMA's archived entry for period 02/05/2026 - 17/05/2026
    const emmaEntry = await prisma.payroll_entries.findFirst({
      where: {
        users_id: '880325',
        status: 'ARCHIVED',
        periodStart: {
          gte: new Date('2026-02-04T16:00:00.000Z'), // Start of Feb 5 in PH time
          lte: new Date('2026-02-05T16:00:00.000Z')
        }
      },
      include: {
        users: {
          include: {
            personnel_types: true
          }
        }
      }
    })

    if (!emmaEntry) {
      console.log('❌ Could not find EMMA MAGPATAO archived entry')
      return
    }

    console.log(`📦 Found entry: ${emmaEntry.payroll_entries_id}`)
    console.log(`   Current Net Pay: ₱${Number(emmaEntry.netPay).toFixed(2)}`)
    console.log(`   Current Deductions: ₱${Number(emmaEntry.deductions).toFixed(2)}`)
    console.log(`   Gross Salary: ₱${Number(emmaEntry.basicSalary).toFixed(2)}`)
    console.log(`   Overtime: ₱${Number(emmaEntry.overtime).toFixed(2)}`)

    // Parse snapshot
    let snapshot: any = null
    if (emmaEntry.breakdownSnapshot) {
      try {
        snapshot = typeof emmaEntry.breakdownSnapshot === 'string'
          ? JSON.parse(emmaEntry.breakdownSnapshot)
          : emmaEntry.breakdownSnapshot
      } catch (e) {
        console.error('❌ Failed to parse snapshot')
        return
      }
    }

    if (snapshot) {
      console.log('\n📊 Snapshot contents:')
      console.log('   Deduction Details:', snapshot.deductionDetails?.length || 0)
      console.log('   Attendance Deduction Details:', snapshot.attendanceDeductionDetails?.length || 0)
      console.log('   Loan Details:', snapshot.loanDetails?.length || 0)
      console.log('   Total Deductions in snapshot:', snapshot.totalDeductions)
      console.log('   Attendance Deductions:', snapshot.attendanceDeductions)
      console.log('   Database Deductions:', snapshot.databaseDeductions)
      console.log('   Loan Payments:', snapshot.loanPayments)
    }

    // Calculate correct values
    const grossSalary = Number(emmaEntry.basicSalary) + Number(emmaEntry.overtime)
    
    // Get total deductions from the stored deductions field (this should be correct)
    const totalDeductions = Number(emmaEntry.deductions)
    
    const correctNetPay = grossSalary - totalDeductions

    console.log(`\n🔧 Correction needed:`)
    console.log(`   Gross: ₱${grossSalary.toFixed(2)}`)
    console.log(`   Total Deductions: ₱${totalDeductions.toFixed(2)}`)
    console.log(`   Correct Net Pay: ₱${correctNetPay.toFixed(2)}`)

    // Update the entry
    await prisma.payroll_entries.update({
      where: { payroll_entries_id: emmaEntry.payroll_entries_id },
      data: {
        netPay: correctNetPay
      }
    })

    console.log(`✅ Updated EMMA's archived entry with correct Net Pay: ₱${correctNetPay.toFixed(2)}`)

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

fixEmmaArchived()
  .then(() => {
    console.log('✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
