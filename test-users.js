const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.users.findMany({
    select: { name: true, email: true, avatar: true }
  });
  console.log(users.filter(u => u.name && (u.name.includes('JESSICA ') || u.name.includes('JUVILYN') || u.name.includes('ROGER') || u.name.includes('ALMA'))));
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
