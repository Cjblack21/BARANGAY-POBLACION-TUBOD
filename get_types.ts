import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const types = await prisma.personnel_types.findMany()
  console.log(types.map(t => t.name))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
