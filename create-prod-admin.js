const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://postgres.vbcrqwibelcmlrqkbouv:bagsikever16@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
        }
    }
})

async function main() {
    console.log('🔧 Creating/updating admin account...')
    const hashedPassword = await bcrypt.hash('admin123', 12)

    // Upsert by users_id - will create if not exists, update if exists
    const admin = await prisma.users.upsert({
        where: { users_id: '1' },
        update: {
            email: 'Adminpoblacion@pms.com',
            password: hashedPassword,
            name: 'Admin Poblacion',
            role: 'ADMIN',
            isActive: true,
        },
        create: {
            users_id: '1',
            email: 'Adminpoblacion@pms.com',
            password: hashedPassword,
            name: 'Admin Poblacion',
            role: 'ADMIN',
            isActive: true,
            updatedAt: new Date(),
        },
    })

    console.log('✅ Admin account ready!')
    console.log('Email:    Adminpoblacion@pms.com')
    console.log('Password: admin123')
    console.log('ID:       1')
}

main()
    .catch(e => console.error('❌ Error:', e.message))
    .finally(() => prisma.$disconnect())
