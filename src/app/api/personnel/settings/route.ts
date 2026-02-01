import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get or create user settings
    let settings = await prisma.user_settings.findUnique({
      where: { users_id: session.user.id },
    })

    // Create default settings if they don't exist
    if (!settings) {
      const { randomBytes } = await import('crypto')
      const settingsId = randomBytes(12).toString('hex')
      settings = await prisma.user_settings.create({
        data: {
          user_settings_id: settingsId,
          users_id: session.user.id,
          updatedAt: new Date()
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

    if (!session?.user?.id) {
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
    const settings = await prisma.user_settings.upsert({
      where: { users_id: session.user.id },
      update: {
        theme,
        language,
        emailNotifications,
        payrollNotifications,
        systemNotifications,
        attendanceReminders,
      },
      create: {
        user_settings_id: (() => { const { randomBytes } = require('crypto'); return randomBytes(12).toString('hex'); })(),
        users_id: session.user.id,
        theme,
        language,
        emailNotifications,
        payrollNotifications,
        systemNotifications,
        attendanceReminders,
        updatedAt: new Date()
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
