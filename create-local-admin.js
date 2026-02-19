const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
    console.log('🔧 Creating new local admin account...')

    const hashedPassword = await bcrypt.hash('localadmin123', 12)

    try {
        const user = await prisma.users.create({
            data: {
                users_id: Math.floor(100000 + Math.random() * 900000).toString(),
                email: 'localadmin@dev.com',
                password: hashedPassword,
                name: 'Local Development Admin',
                role: 'ADMIN',
                isActive: true,
                updatedAt: new Date(),
            },
        })

        console.log('✅ Local Admin Account Created Successfully!')
        console.log('┌─────────────────────────────────────────────┐')
        console.log('│         LOCAL DEVELOPMENT CREDENTIALS       │')
        console.log('├─────────────────────────────────────────────┤')
        console.log('│ Email:    localadmin@dev.com                │')
        console.log('│ Password: localadmin123                     │')
        console.log('│ Role:     ADMIN                             │')
        console.log('└─────────────────────────────────────────────┘')

    } catch (error) {
        console.error('❌ Error creating admin:', error.message)

        // If user already exists, try to update it
        if (error.code === 'P2002') {
            console.log('⚠️  Account already exists, updating password...')
            const updated = await prisma.users.update({
                where: { email: 'localadmin@dev.com' },
                data: {
                    password: hashedPassword,
                    isActive: true,
                    role: 'ADMIN'
                }
            })
            console.log('✅ Password Updated!')
            console.log('Email: localadmin@dev.com')
            console.log('Password: localadmin123')
        }
    }
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
