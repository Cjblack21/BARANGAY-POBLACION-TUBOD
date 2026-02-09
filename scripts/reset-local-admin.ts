import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const hashedPassword = await bcrypt.hash('password123', 12)

    console.log('🔄 Resetting local admin account...')

    try {
        const user = await prisma.users.upsert({
            where: { email: 'admin@pms.com' },
            update: {
                password: hashedPassword,
                isActive: true,
                role: 'ADMIN'
            },
            create: {
                users_id: '1',
                email: 'admin@pms.com',
                password: hashedPassword,
                name: 'Local Admin',
                role: 'ADMIN',
                isActive: true,
                updatedAt: new Date(),
            },
        })

        console.log('✅ Local Admin Reset Successful!')
        console.log('Email: admin@pms.com')
        console.log('Password: password123')
    } catch (error) {
        console.error("Error creating admin:", error)
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
