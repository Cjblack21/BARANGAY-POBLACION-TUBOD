import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkEmmaLiveDeductions() {
  console.log('🔍 Checking EMMA live deductions...')

  try {
    // Get all deductions for EMMA
    const deductions = await prisma.deductions.findMany({
      where: {
        users_id: '880325'
      },
      include: {
        deduction_types: true
      },
      orderBy: {
        appliedAt: 'desc'
      }
    })

    console.log(`\n📋 Found ${deductions.length} deductions for EMMA:\n`)

    let totalActive = 0
    let totalArchived = 0

    deductions.forEach((d, index) => {
      const isArchived = d.archivedAt !== null
      const amount = Number(d.amount)
      
      if (isArchived) {
        totalArchived += amount
      } else {
        totalActive += amount
      }

      console.log(`${index + 1}. ${d.deduction_types.name}`)
      console.log(`   Amount: ₱${amount.toFixed(2)}`)
      console.log(`   Applied: ${d.appliedAt.toISOString()}`)
      console.log(`   Archived: ${isArchived ? d.archivedAt?.toISOString() : 'NO (ACTIVE)'}`)
      console.log(`   Mandatory: ${d.deduction_types.isMandatory}`)
      console.log(`   Notes: ${d.notes || 'N/A'}`)
      console.log('')
    })

    console.log(`💰 Total Active Deductions: ₱${totalActive.toFixed(2)}`)
    console.log(`📦 Total Archived Deductions: ₱${totalArchived.toFixed(2)}`)

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkEmmaLiveDeductions()
  .then(() => {
    console.log('\n✅ Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Failed:', error)
    process.exit(1)
  })
