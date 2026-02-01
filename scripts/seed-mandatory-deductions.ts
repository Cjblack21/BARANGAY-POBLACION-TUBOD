import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function generateUniqueId(): Promise<string> {
  return randomBytes(12).toString('hex')
}

async function main() {
  console.log('🌱 Seeding mandatory deduction types...')

  const mandatoryTypes = [
    { 
      name: 'PHILHEALTH', 
      description: 'Philippine Health Insurance Corporation', 
      amount: 200, 
      calculationType: 'FIXED' as const,
      isMandatory: true,
      isActive: true
    },
    { 
      name: 'TAX', 
      description: 'Withholding Tax', 
      amount: 10, 
      calculationType: 'PERCENTAGE' as const,
      percentageValue: 10,
      isMandatory: true,
      isActive: true
    },
    { 
      name: 'SSS', 
      description: 'Social Security System', 
      amount: 900, 
      calculationType: 'FIXED' as const,
      isMandatory: true,
      isActive: true
    },
    { 
      name: 'Pag-IBIG', 
      description: 'Home Development Mutual Fund', 
      amount: 100, 
      calculationType: 'FIXED' as const,
      isMandatory: true,
      isActive: true
    },
  ]

  for (const type of mandatoryTypes) {
    const existing = await prisma.deduction_types.findFirst({
      where: { name: type.name }
    })

    if (existing) {
      console.log(`✓ ${type.name} already exists, skipping...`)
    } else {
      const deductionTypeId = await generateUniqueId()
      await prisma.deduction_types.create({
        data: {
          deduction_types_id: deductionTypeId,
          ...type,
          updatedAt: new Date()
        }
      })
      console.log(`✓ Created ${type.name}`)
    }
  }

  console.log('✅ Mandatory deduction types seeded successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
