const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDatabase() {
    console.log('🔍 Checking database connection and users...\n')

    try {
        // Test connection
        await prisma.$connect()
        console.log('✅ Database connected successfully\n')

        // Count total users
        const userCount = await prisma.users.count()
        console.log(`📊 Total users in database: ${userCount}\n`)

        // Get all admin users
        const admins = await prisma.users.findMany({
            where: { role: 'ADMIN' },
            select: {
                users_id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                password: true
            }
        })

        console.log('👑 Admin accounts found:')
        console.log('='.repeat(60))

        if (admins.length === 0) {
            console.log('❌ NO ADMIN ACCOUNTS FOUND!\n')
            console.log('This is why you cannot login.')
        } else {
            admins.forEach((admin, index) => {
                console.log(`\nAdmin #${index + 1}:`)
                console.log(`  ID: ${admin.users_id}`)
                console.log(`  Email: ${admin.email}`)
                console.log(`  Name: ${admin.name}`)
                console.log(`  Active: ${admin.isActive ? 'Yes' : 'No'}`)
                console.log(`  Has Password: ${admin.password ? 'Yes' : 'No'}`)
                console.log(`  Password Hash: ${admin.password ? admin.password.substring(0, 20) + '...' : 'NONE'}`)
            })
        }

        console.log('\n' + '='.repeat(60))

    } catch (error) {
        console.error('❌ Database Error:', error.message)

        if (error.code === 'P1001') {
            console.log('\n⚠️  Cannot connect to database server.')
            console.log('Make sure MySQL is running in XAMPP.')
        } else if (error.code === 'P2021') {
            console.log('\n⚠️  The users table does not exist.')
            console.log('Run: npx prisma db push')
        }
    } finally {
        await prisma.$disconnect()
    }
}

checkDatabase()
