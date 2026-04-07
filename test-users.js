const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.users.findMany({
    where: { isActive: true, role: 'PERSONNEL' },
    select: { users_id: true, name: true, personnel_types: true }
  })
  console.log(JSON.stringify(users, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
