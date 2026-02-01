import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findEmmaJuneEntry() {
  console.log('🔍 Finding EMMA entries...')

  try {
    // Get all EMMA entries
    const entries = await prisma.payroll_entries.findMany({
      where: {
        users_id: '880325'
      },
      orderBy: {
        periodStart: 'desc'
      }
    })

    console.log(`\n📋 Found ${entries.length} entries for EMMA:\n`)

    entries.forEach((entry, index) => {
      const grossPay = Number(entry.basicSalary) + Number(entry.overtime)
      const deductions = Number(entry.deductions)
      const netPay = Number(entry.netPay)
      const calculatedNetPay = grossPay - deductions

      console.log(`${index + 1}. ${entry.payroll_entries_id}`)
      console.log(`   Period: ${entry.periodStart.toISOString().split('T')[0]} to ${entry.periodEnd.toISOString().split('T')[0]}`)
      console.log(`   Status: ${entry.status}`)
      console.log(`   Basic: ₱${Number(entry.basicSalary).toFixed(2)}, Overtime: ₱${Number(entry.overtime).toFixed(2)}`)
      console.log(`   Gross: ₱${grossPay.toFixed(2)}`)
      console.log(`   Deductions: ₱${deductions.toFixed(2)}`)
      console.log(`   Stored Net Pay: ₱${netPay.toFixed(2)}`)
      console.log(`   Calculated Net Pay: ₱${calculatedNetPay.toFixed(2)}`)
      
      if (Math.abs(netPay - calculatedNetPay) > 0.01) {
        console.log(`   ⚠️  MISMATCH! Difference: ₱${(netPay - calculatedNetPay).toFixed(2)}`)
      }
      console.log('')
    })

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

findEmmaJuneEntry()
  .then(() => {
    console.log('✅ Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Failed:', error)
    process.exit(1)
  })
