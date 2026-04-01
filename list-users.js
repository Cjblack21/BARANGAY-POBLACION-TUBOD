const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://postgres.vbcrqwibelcmlrqkbouv:bagsikever16@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
        }
    }
})

async function main() {
    console.log('🔍 Listing all users in the database...')
    const users = await prisma.users.findMany({
        select: {
            users_id: true,
            email: true,
            name: true,
            role: true
        }
    })
    console.log(users)
}

main()
    .catch(e => console.error('❌ Error:', e.message))
    .finally(() => prisma.$disconnect())
