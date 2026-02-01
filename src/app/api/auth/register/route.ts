import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { registerSchema } from "@/lib/validations/auth"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // Validate request body
    const validation = registerSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, email, password } = validation.data

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with PERSONNEL role by default
    const { randomBytes } = await import('crypto')
    const userId = randomBytes(12).toString('hex')
    const user = await prisma.users.create({
      data: {
        users_id: userId,
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: "PERSONNEL",
        isActive: true,
        updatedAt: new Date()
      },
      select: {
        users_id: true,
        email: true,
        name: true,
        role: true,
      }
    })

    return NextResponse.json(
      { 
        message: "Account created successfully! You can now log in.",
        user: {
          id: user.users_id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
      { status: 201 }
    )

  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "An error occurred during registration. Please try again." },
      { status: 500 }
    )
  }
}
