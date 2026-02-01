import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkEmmaPersonnelType() {
  console.log('🔍 Checking EMMA personnel type...')

  try {
    const emma = await prisma.users.findUnique({
      where: {
        users_id: '880325'
      },
      include: {
        personnel_types: true
      }
    })

    if (!emma) {
      console.log('❌ EMMA not found')
      return
    }

    console.log('\n👤 EMMA MAGPATAO:')
    console.log(`   User ID: ${emma.users_id}`)
    console.log(`   Name: ${emma.name}`)
    console.log(`   Email: ${emma.email}`)
    console.log(`   Personnel Type ID: ${emma.personnel_types_id}`)
    
    if (emma.personnel_types) {
      console.log('\n📋 Personnel Type:')
      console.log(`   Name: ${emma.personnel_types.name}`)
      console.log(`   Department: ${emma.personnel_types.department}`)
      console.log(`   Basic Salary: ₱${Number(emma.personnel_types.basicSalary).toFixed(2)}`)
      console.log(`   Type: ${emma.personnel_types.type}`)
    } else {
      console.log('\n⚠️  No personnel type assigned')
    }

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

checkEmmaPersonnelType()
  .then(() => {
    console.log('\n✅ Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Failed:', error)
    process.exit(1)
  })
