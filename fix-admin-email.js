const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixAdminEmail() {
  try {
    // Find admin with capital A email
    const admin = await prisma.users.findFirst({
      where: { role: 'ADMIN' }
    })

    if (!admin) {
      console.log('No admin found!')
      return
    }

    console.log('Found admin:', admin.email)

    // Update to lowercase
    const updated = await prisma.users.update({
      where: { users_id: admin.users_id },
      data: { email: admin.email.toLowerCase() }
    })

    console.log('Updated email to:', updated.email)
    console.log('Login with: adminpoblacion@pms.com / admin123')
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

fixAdminEmail()
