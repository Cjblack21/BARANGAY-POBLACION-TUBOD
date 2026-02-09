import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

// Ensure this route is always dynamically rendered
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Validation schema
const createUserSchema = z.object({
  users_id: z.string().optional(),
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'PERSONNEL']),
  isActive: z.boolean().optional().default(true),
  personnel_types_id: z.string().optional(),
  streetAddress: z.string().optional(),
  barangay: z.string().optional(),
  purok: z.string().optional(),
  zipCode: z.string().optional(),
  avatar: z.string().optional().nullable(),
})

// GET /api/admin/users - Get all users with optional search
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get search query parameter
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('q')

    // Build where clause for search
    const whereClause = searchQuery ? {
      OR: [
        {
          name: {
            contains: searchQuery,
            mode: 'insensitive' as const
          }
        },
        {
          email: {
            contains: searchQuery,
            mode: 'insensitive' as const
          }
        }
      ]
    } : {}

    const users = await prisma.users.findMany({
      where: whereClause,
      select: {
        users_id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        avatar: true,
        personnel_types_id: true,
        streetAddress: true,
        barangay: true,
        purok: true,
        zipCode: true,
        createdAt: true,
        updatedAt: true,
        personnel_types: {
          select: {
            name: true,
            basicSalary: true,
            department: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createUserSchema.parse(body)

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

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    // Generate users_id if not provided
    const userId = validatedData.users_id || Math.floor(100000 + Math.random() * 900000).toString()

    // Create user
    const user = await prisma.users.create({
      data: {
        users_id: userId,
        email: validatedData.email.toLowerCase(),
        name: validatedData.name,
        password: hashedPassword,
        role: validatedData.role,
        isActive: validatedData.isActive,
        personnel_types_id: validatedData.personnel_types_id || null,
        streetAddress: validatedData.streetAddress || null,
        barangay: validatedData.barangay || null,
        purok: validatedData.purok || null,
        zipCode: validatedData.zipCode || null,
        avatar: validatedData.avatar || null,
        updatedAt: new Date()
      },
      select: {
        users_id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        avatar: true,
        personnel_types_id: true,
        streetAddress: true,
        barangay: true,
        purok: true,
        zipCode: true,
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

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
