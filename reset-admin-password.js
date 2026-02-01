// Reset Admin Password Script
// Run this with: node reset-admin-password.js

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function resetAdminPassword() {
    try {
        console.log('🔍 Looking for admin accounts...')

        // Find all admin accounts
        const admins = await prisma.users.findMany({
            where: { role: 'ADMIN' },
            select: { users_id: true, email: true, name: true }
        })

        if (admins.length === 0) {
            console.log('❌ No admin accounts found!')
            console.log('Creating a new admin account...')

            // Create a new admin account
            const hashedPassword = await bcrypt.hash('admin123', 10)
            const newAdmin = await prisma.users.create({
                data: {
                    email: 'admin@poblacion.com',
                    password: hashedPassword,
                    name: 'Admin',
                    role: 'ADMIN',
                    isActive: true
                }
            })

            console.log('✅ New admin account created!')
            console.log('📧 Email: admin@poblacion.com')
            console.log('🔑 Password: admin123')
            console.log('⚠️  Please change this password after logging in!')
        } else {
            console.log(`✅ Found ${admins.length} admin account(s):`)
            admins.forEach((admin, index) => {
                console.log(`${index + 1}. ${admin.name} (${admin.email})`)
            })

            // Reset the first admin's password
            const adminToReset = admins[0]
            const newPassword = 'admin123'
            const hashedPassword = await bcrypt.hash(newPassword, 10)

            await prisma.users.update({
                where: { users_id: adminToReset.users_id },
                data: { password: hashedPassword }
            })

            console.log('\n✅ Password reset successful!')
            console.log(`📧 Email: ${adminToReset.email}`)
            console.log(`🔑 New Password: ${newPassword}`)
            console.log('⚠️  Please change this password after logging in!')
        }

    } catch (error) {
        console.error('❌ Error:', error.message)
    } finally {
        await prisma.$disconnect()
    }
}

resetAdminPassword()
