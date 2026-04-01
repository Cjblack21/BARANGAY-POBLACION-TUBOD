const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://postgres.vbcrqwibelcmlrqkbouv:bagsikever16@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
        }
    }
})

async function main() {
    console.log('🔍 Checking payroll_entries table columns...')

    // Check if archivedAt column exists
    const result = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'payroll_entries'
        ORDER BY ordinal_position
    `
    console.log('📋 payroll_entries columns:')
    console.log(result)

    console.log('\n🔍 Checking existing payroll entries...')
    const entries = await prisma.payroll_entries.findMany({
        select: {
            payroll_entries_id: true,
            users_id: true,
            status: true,
            periodStart: true,
            periodEnd: true,
        }
    })
    console.log('📋 Payroll entries:')
    console.log(entries)
}

main()
    .catch(e => {
        console.error('❌ Error:', e.message)
        console.error(e)
    })
    .finally(() => prisma.$disconnect())
