import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    
    console.log('Testing statistics query...');
    const data = await prisma.$queryRaw`
      SELECT 
        TO_CHAR("processedAt", 'YYYY-MM') as month,
        SUM("basicSalary") as grossPay,
        SUM(deductions) as totalDeductions,
        SUM("netPay") as netPay,
        COUNT(*) as entries
      FROM payroll_entries
      WHERE "processedAt" >= ${sixMonthsAgo}
      GROUP BY TO_CHAR("processedAt", 'YYYY-MM')
      ORDER BY month ASC
    `;
    console.log('DATA:', data);

    console.log('Testing loans trend...');
    const loanData = await prisma.$queryRaw`
      SELECT 
        TO_CHAR("createdAt", 'YYYY-MM') as month,
        COUNT(*) as loans,
        SUM(amount) as amount
      FROM loans 
      WHERE "createdAt" >= ${sixMonthsAgo}
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
      ORDER BY month
    `;
    console.log('LOAN DATA:', loanData);

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
