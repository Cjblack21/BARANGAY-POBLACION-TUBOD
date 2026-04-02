const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    
    console.log('Testing statistics query...');
    const data = await prisma.$queryRaw\
      SELECT 
        TO_CHAR("processedAt", 'YYYY-MM') as month,
        SUM("basicSalary") as grossPay,
        SUM("deductions") as totalDeductions,
        SUM("netPay") as netPay,
        COUNT(*) as entries
      FROM payroll_entries
      WHERE "processedAt" >= \
      GROUP BY TO_CHAR("processedAt", 'YYYY-MM')
      ORDER BY month ASC
    \;
    console.log('DATA:', data);
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
