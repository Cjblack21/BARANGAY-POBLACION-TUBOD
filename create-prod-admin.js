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
    console.log('🗑️  Deleting old admin accounts...')

    // Delete old accounts by email
    const deleted = await prisma.users.deleteMany({
        where: {
            email: {
                in: ['adminpoblacion@gmail.com', 'Adminpoblacion@pms.com', 'adminpoblacion@pms.com']
            }
        }
    })
    console.log(`✅ Deleted ${deleted.count} old account(s)`)

    // Also clean up any account with ID 1
    await prisma.users.deleteMany({
        where: { users_id: '1' }
    }).catch(() => {}) // ignore if not found

    console.log('🔧 Creating fresh admin account...')
    const hashedPassword = await bcrypt.hash('admin123', 12)

    const admin = await prisma.users.create({
        data: {
            users_id: '1',
            email: 'Adminpoblacion@pms.com',
            password: hashedPassword,
            name: 'Admin Poblacion',
            role: 'ADMIN',
            isActive: true,
            updatedAt: new Date(),
        }
    })

    console.log('✅ Admin account created!')
    console.log('   Email:    Adminpoblacion@pms.com')
    console.log('   Password: admin123')
    console.log('   ID:       1')
    console.log('   Name:     Admin Poblacion')
}

main()
    .catch(e => console.error('❌ Error:', e.message))
    .finally(() => prisma.$disconnect())
