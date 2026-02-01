import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Validation schema
const registerSchema = z.object({
  users_id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'PERSONNEL']),
  isActive: z.boolean().optional().default(true),
  personnel_types_id: z.string(),
})

// POST /api/public/register - Public registration endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Ensure email is lowercase to match login logic
    if (body.email) {
      body.email = body.email.toLowerCase()
    }
    const validatedData = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: validatedData.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Check if users_id already exists
    const existingId = await prisma.users.findUnique({
      where: { users_id: validatedData.users_id }
    })

    if (existingId) {
      return NextResponse.json(
        { error: 'Personnel ID already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Create user
    console.log('Creating user with data:', {
      users_id: validatedData.users_id,
      email: validatedData.email,
      name: validatedData.name,
      role: validatedData.role,
      isActive: validatedData.isActive,
      personnel_types_id: validatedData.personnel_types_id
    })
    
    const user = await prisma.users.create({
      data: {
        users_id: validatedData.users_id,
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword,
        role: validatedData.role,
        isActive: validatedData.isActive,
        personnel_types_id: validatedData.personnel_types_id,
        updatedAt: new Date()
      },
      select: {
        users_id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        personnel_types_id: true,
        createdAt: true,
        updatedAt: true,
        personnel_types: {
          select: {
            name: true,
            basicSalary: true,
            department: true
          }
        }
      }
    })

    console.log('User created successfully:', {
      users_id: user.users_id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register account' },
      { status: 500 }
    )
  }
}
