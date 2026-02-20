import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    console.log("[Settings API GET] Session:", {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role
    })

    if (!session?.user?.id) {
      console.log("[Settings API GET] Unauthorized - no user ID")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get or create user settings
    let settings = await prisma.user_settings.findUnique({
      where: { users_id: session.user.id },
    })

    // Create default settings if they don't exist
    if (!settings) {
      const { randomUUID } = require('crypto')
      settings = await prisma.user_settings.create({
        data: {
          user_settings_id: randomUUID(),
          users_id: session.user.id,
          updatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    console.log("[Settings API PUT] Session:", {
      hasSession: !!session,
      userId: session?.user?.id,
      userRole: session?.user?.role
    })

    if (!session?.user?.id) {
      console.log("[Settings API PUT] Unauthorized - no user ID")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      theme,
      language,
      emailNotifications,
      payrollNotifications,
      systemNotifications,
      attendanceReminders,
    } = body

    // Update or create settings
    const { randomUUID } = require('crypto')
    const settings = await prisma.user_settings.upsert({
      where: { users_id: session.user.id },
      update: {
        theme,
        language,
        emailNotifications,
        payrollNotifications,
        systemNotifications,
        attendanceReminders,
        updatedAt: new Date(),
      },
      create: {
        user_settings_id: randomUUID(),
        users_id: session.user.id,
        theme,
        language,
        emailNotifications,
        payrollNotifications,
        systemNotifications,
        attendanceReminders,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ settings, message: "Settings updated successfully" })
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
