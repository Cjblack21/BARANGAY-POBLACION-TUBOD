import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Function to generate a 6-digit random number
function generateSixDigitId() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Function to check if ID already exists
async function idExists(id: string) {
  const user = await prisma.users.findUnique({
    where: { users_id: id }
  })
  return !!user
}

// Function to generate unique 6-digit ID
async function generateUniqueId() {
  let id
  do {
    id = generateSixDigitId()
  } while (await idExists(id))
  return id
}

async function main() {
  const email = 'admin2@pms.com' // Changed to avoid conflict
  
  console.log('🔧 Creating new admin account...')

  // Check if email already exists
  const existingUser = await prisma.users.findUnique({
    where: { email }
  })

  if (existingUser) {
    console.log('⚠️  User with this email already exists!')
    console.log(`Email: ${email}`)
    console.log('Please use a different email or delete the existing user first.')
    return
  }

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 12)

  // Create new admin user
  const adminId = await generateUniqueId()
  const newAdmin = await prisma.users.create({
    data: {
      users_id: adminId,
      email: email,
      password: hashedPassword,
      name: 'Admin 2',
      role: 'ADMIN',
      isActive: true,
      updatedAt: new Date(),
    },
  })

  console.log('✅ New admin account created successfully!')
  console.log('\n📋 Login Credentials:')
  console.log('┌─────────────────────────────────────────────────────────┐')
  console.log('│                    NEW ADMIN ACCOUNT                    │')
  console.log('├─────────────────────────────────────────────────────────┤')
  console.log(`│ ID: ${adminId}                                           │`)
  console.log(`│ Email: ${email}                                          │`)
  console.log('│ Password: password123                                   │')
  console.log('│ Role: Admin                                             │')
  console.log('└─────────────────────────────────────────────────────────┘')
  console.log('\n🚀 You can now login with this account!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Failed to create admin account:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
