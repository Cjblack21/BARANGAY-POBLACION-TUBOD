const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const entries = await prisma.payroll_entries.findMany({ include: { users: { select: { personnel_types: true } } } }); 
  console.log('Total entries:', entries.length); 
  const nonArchived = entries.filter(e => e.status !== 'ARCHIVED'); 
  console.log('Non-archived entries:', nonArchived.length); 
  if (nonArchived.length > 0) { 
    console.log('Sample entry:', JSON.stringify({ 
      id: nonArchived[0].payroll_entries_id, 
      status: nonArchived[0].status, 
      department: nonArchived[0].users?.personnel_types?.department,
      periodStart: nonArchived[0].periodStart,
      periodEnd: nonArchived[0].periodEnd
    }, null, 2)); 
  } 
} 
main().catch(console.error).finally(() => prisma.$disconnect());
