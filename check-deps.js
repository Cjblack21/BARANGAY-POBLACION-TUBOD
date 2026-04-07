const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const types = await prisma.personnel_types.findMany({
    select: { department: true, type: true, name: true }
  })
  console.log("Personnel Types:", JSON.stringify(types, null, 2))

  const users = await prisma.users.findMany({
    where: { isActive: true, role: 'PERSONNEL' },
    select: { 
      name: true, 
      personnel_types: {
         select: { department: true }
      }
    }
  })
  console.log("Users:", JSON.stringify(users, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
