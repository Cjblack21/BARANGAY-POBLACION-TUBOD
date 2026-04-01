const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://postgres.vbcrqwibelcmlrqkbouv:bagsikever16@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
        }
    }
})

async function main() {
    console.log('🔧 Fixing admin email case...')

    await prisma.users.update({
        where: { users_id: '00001' },
        data: {
            email: 'adminpob@pms.com' // Set to lowercase exactly!
        }
    })

    console.log('✅ Admin email successfully converted to lowercase: adminpob@pms.com')
}

main()
    .catch(e => console.error('❌ Error:', e.message))
    .finally(() => prisma.$disconnect())
