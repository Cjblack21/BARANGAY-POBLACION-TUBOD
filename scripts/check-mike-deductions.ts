import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const deductions = await prisma.deductions.findMany({
    where: {
      users: { name: 'Mike Johnson' },
      archivedAt: null
    },
    include: {
      deduction_types: {
        select: {
          name: true,
          isMandatory: true
        }
      }
    }
  })

  console.log('\n📋 Mike Johnson\'s Deductions:')
  deductions.forEach(d => {
    console.log(`  ✓ ${d.deduction_types.name}: isMandatory=${d.deduction_types.isMandatory} (amount: ₱${d.amount})`)
  })
  console.log('')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
