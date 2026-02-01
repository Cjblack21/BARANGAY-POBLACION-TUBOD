import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixEmmaNow() {
  console.log('🔧 Fixing EMMA MAGPATAO Net Pay NOW...')

  try {
    // Find EMMA's entry with ID 880325 that has Net Pay of 6650
    const emmaEntry = await prisma.payroll_entries.findFirst({
      where: {
        users_id: '880325',
        netPay: 6650,
        status: 'ARCHIVED'
      }
    })

    if (!emmaEntry) {
      console.log('❌ Entry not found, trying with decimal...')
      
      // Try finding by approximate value
      const entries = await prisma.payroll_entries.findMany({
        where: {
          users_id: '880325',
          status: 'ARCHIVED'
        }
      })
      
      console.log(`Found ${entries.length} archived entries for EMMA:`)
      entries.forEach(e => {
        console.log(`  - ${e.payroll_entries_id}: Net Pay = ₱${Number(e.netPay).toFixed(2)}, Deductions = ₱${Number(e.deductions).toFixed(2)}`)
      })
      
      // Find the one with 6650
      const target = entries.find(e => Math.abs(Number(e.netPay) - 6650) < 1)
      if (!target) {
        console.log('❌ Could not find entry with Net Pay ≈ 6650')
        return
      }
      
      console.log(`\n📦 Found target entry: ${target.payroll_entries_id}`)
      
      // Calculate correct net pay
      const grossSalary = Number(target.basicSalary) + Number(target.overtime)
      const deductions = Number(target.deductions)
      const correctNetPay = grossSalary - deductions
      
      console.log(`   Gross: ₱${grossSalary.toFixed(2)}`)
      console.log(`   Deductions: ₱${deductions.toFixed(2)}`)
      console.log(`   Current Net Pay: ₱${Number(target.netPay).toFixed(2)}`)
      console.log(`   Correct Net Pay: ₱${correctNetPay.toFixed(2)}`)
      
      // Update it
      await prisma.payroll_entries.update({
        where: { payroll_entries_id: target.payroll_entries_id },
        data: {
          netPay: correctNetPay
        }
      })
      
      console.log(`✅ FIXED! Updated Net Pay from ₱${Number(target.netPay).toFixed(2)} to ₱${correctNetPay.toFixed(2)}`)
      return
    }

    // If found directly
    const grossSalary = Number(emmaEntry.basicSalary) + Number(emmaEntry.overtime)
    const deductions = Number(emmaEntry.deductions)
    const correctNetPay = grossSalary - deductions
    
    console.log(`📦 Found entry: ${emmaEntry.payroll_entries_id}`)
    console.log(`   Gross: ₱${grossSalary.toFixed(2)}`)
    console.log(`   Deductions: ₱${deductions.toFixed(2)}`)
    console.log(`   Current Net Pay: ₱${Number(emmaEntry.netPay).toFixed(2)}`)
    console.log(`   Correct Net Pay: ₱${correctNetPay.toFixed(2)}`)
    
    await prisma.payroll_entries.update({
      where: { payroll_entries_id: emmaEntry.payroll_entries_id },
      data: {
        netPay: correctNetPay
      }
    })
    
    console.log(`✅ FIXED! Updated Net Pay to ₱${correctNetPay.toFixed(2)}`)

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

fixEmmaNow()
  .then(() => {
    console.log('✅ Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Failed:', error)
    process.exit(1)
  })
