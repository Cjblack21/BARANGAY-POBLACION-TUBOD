import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function listArchivedEntries() {
  console.log('📋 Listing all archived entries...')

  try {
    const entries = await prisma.payroll_entries.findMany({
      where: {
        status: 'ARCHIVED'
      },
      include: {
        users: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        periodStart: 'desc'
      }
    })

    console.log(`\n📦 Found ${entries.length} archived entries:\n`)

    entries.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.users?.name || 'Unknown'} (${entry.users_id})`)
      console.log(`   ID: ${entry.payroll_entries_id}`)
      console.log(`   Period: ${entry.periodStart.toISOString()} to ${entry.periodEnd.toISOString()}`)
      console.log(`   Gross: ₱${Number(entry.basicSalary).toFixed(2)} + ₱${Number(entry.overtime).toFixed(2)} = ₱${(Number(entry.basicSalary) + Number(entry.overtime)).toFixed(2)}`)
      console.log(`   Deductions: ₱${Number(entry.deductions).toFixed(2)}`)
      console.log(`   Net Pay: ₱${Number(entry.netPay).toFixed(2)}`)
      console.log(`   Status: ${entry.status}`)
      console.log(`   Created: ${entry.createdAt.toISOString()}`)
      console.log('')
    })

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

listArchivedEntries()
  .then(() => {
    console.log('✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
