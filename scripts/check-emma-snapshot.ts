import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkEmmaSnapshot() {
  console.log('🔍 Checking EMMA MAGPATAO snapshot...')

  try {
    const emmaEntry = await prisma.payroll_entries.findFirst({
      where: {
        users_id: '880325',
        status: 'ARCHIVED',
        netPay: 6650
      }
    })

    if (!emmaEntry) {
      console.log('❌ Entry not found')
      return
    }

    console.log(`📦 Entry: ${emmaEntry.payroll_entries_id}`)
    console.log(`   Period: ${emmaEntry.periodStart} to ${emmaEntry.periodEnd}`)
    console.log(`   Gross: ₱${(Number(emmaEntry.basicSalary) + Number(emmaEntry.overtime)).toFixed(2)}`)
    console.log(`   Deductions (stored): ₱${Number(emmaEntry.deductions).toFixed(2)}`)
    console.log(`   Net Pay (stored): ₱${Number(emmaEntry.netPay).toFixed(2)}`)

    if (emmaEntry.breakdownSnapshot) {
      let snapshot: any
      try {
        snapshot = typeof emmaEntry.breakdownSnapshot === 'string'
          ? JSON.parse(emmaEntry.breakdownSnapshot)
          : emmaEntry.breakdownSnapshot
      } catch (e) {
        console.error('❌ Failed to parse snapshot')
        return
      }

      console.log('\n📊 Breakdown Snapshot:')
      console.log('   Total Deductions:', snapshot.totalDeductions)
      console.log('   Attendance Deductions:', snapshot.attendanceDeductions)
      console.log('   Database Deductions:', snapshot.databaseDeductions)
      console.log('   Loan Payments:', snapshot.loanPayments)
      
      console.log('\n📋 Deduction Details:')
      if (snapshot.deductionDetails && snapshot.deductionDetails.length > 0) {
        snapshot.deductionDetails.forEach((d: any) => {
          console.log(`   - ${d.type}: ₱${Number(d.amount).toFixed(2)}`)
        })
      } else {
        console.log('   (none)')
      }
      
      console.log('\n📋 Attendance Deduction Details:')
      if (snapshot.attendanceDeductionDetails && snapshot.attendanceDeductionDetails.length > 0) {
        snapshot.attendanceDeductionDetails.forEach((d: any) => {
          console.log(`   - ${d.type}: ₱${Number(d.amount).toFixed(2)}`)
        })
      } else {
        console.log('   (none)')
      }
      
      console.log('\n📋 Loan Details:')
      if (snapshot.loanDetails && snapshot.loanDetails.length > 0) {
        snapshot.loanDetails.forEach((l: any) => {
          console.log(`   - ${l.purpose || 'Loan'}: ₱${Number(l.payment || l.amount).toFixed(2)}`)
        })
      } else {
        console.log('   (none)')
      }

      // Calculate what the correct values should be
      const snapshotTotalDeductions = Number(snapshot.totalDeductions || 0)
      const grossSalary = Number(emmaEntry.basicSalary) + Number(emmaEntry.overtime)
      const correctNetPay = grossSalary - snapshotTotalDeductions

      console.log('\n🔧 Correction Analysis:')
      console.log(`   Snapshot says Total Deductions: ₱${snapshotTotalDeductions.toFixed(2)}`)
      console.log(`   Database has Deductions: ₱${Number(emmaEntry.deductions).toFixed(2)}`)
      console.log(`   Difference: ₱${(snapshotTotalDeductions - Number(emmaEntry.deductions)).toFixed(2)}`)
      console.log(`   Correct Net Pay should be: ₱${correctNetPay.toFixed(2)}`)
      console.log(`   Current Net Pay is: ₱${Number(emmaEntry.netPay).toFixed(2)}`)

      if (Math.abs(correctNetPay - Number(emmaEntry.netPay)) > 0.01) {
        console.log('\n⚠️  NET PAY NEEDS CORRECTION!')
        console.log(`   Should update to: ₱${correctNetPay.toFixed(2)}`)
        console.log(`   Should update deductions to: ₱${snapshotTotalDeductions.toFixed(2)}`)
        
        // Update it
        await prisma.payroll_entries.update({
          where: { payroll_entries_id: emmaEntry.payroll_entries_id },
          data: {
            deductions: snapshotTotalDeductions,
            netPay: correctNetPay
          }
        })
        
        console.log('\n✅ UPDATED!')
      } else {
        console.log('\n✅ Net Pay is already correct')
      }
    } else {
      console.log('\n⚠️  No breakdown snapshot found')
    }

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkEmmaSnapshot()
  .then(() => {
    console.log('\n✅ Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Failed:', error)
    process.exit(1)
  })
