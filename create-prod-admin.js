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
    console.log('🗑️  Cleaning up old admin accounts...')

    // Delete old admin accounts
    await prisma.users.deleteMany({
        where: {
            email: {
                in: [
                    'adminpoblacion@gmail.com',
                    'Adminpoblacion@pms.com',
                    'adminpoblacion@pms.com',
                    'Adminpob@pms.com',
                    'adminpob@pms.com',
                ]
            }
        }
    }).catch(() => {})

    await prisma.users.deleteMany({
        where: { users_id: '00001' }
    }).catch(() => {})

    await prisma.users.deleteMany({
        where: { users_id: '1' }
    }).catch(() => {})

    console.log('🔧 Creating new admin account...')
    const hashedPassword = await bcrypt.hash('admin123', 12)

    await prisma.users.create({
        data: {
            users_id: '00001',
            email: 'Adminpob@pms.com',
            password: hashedPassword,
            name: 'Admin Poblacion',
            role: 'ADMIN',
            isActive: true,
            updatedAt: new Date(),
        }
    })

    console.log('✅ Admin account created!')
    console.log('   Email:    Adminpob@pms.com')
    console.log('   Password: admin123')
    console.log('   ID:       00001')
}

main()
    .catch(e => console.error('❌ Error:', e.message))
    .finally(() => prisma.$disconnect())
