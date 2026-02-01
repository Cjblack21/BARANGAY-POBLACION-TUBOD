import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixEmmaDirect() {
  console.log('🔧 Fixing EMMA entry with Net Pay 6650...')

  try {
    // Update EMMA's entry where Net Pay is 6650
    const result = await prisma.payroll_entries.updateMany({
      where: {
        users_id: '880325',
        netPay: 6650,
        status: 'ARCHIVED'
      },
      data: {
        netPay: 5650  // Correct value: 6000 - 350 = 5650
      }
    })

    console.log(`✅ Updated ${result.count} entry/entries`)
    console.log(`   Changed Net Pay from ₱6,650.00 to ₱5,650.00`)

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

fixEmmaDirect()
  .then(() => {
    console.log('✅ Done! Refresh the page to see the corrected Net Pay.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Failed:', error)
    process.exit(1)
  })
