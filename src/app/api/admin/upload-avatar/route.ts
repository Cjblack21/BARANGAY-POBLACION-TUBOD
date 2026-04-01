import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import path from "path"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("avatar") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    if (file.size > 35 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 35MB" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const timestamp = Date.now()
    const ext = path.extname(file.name)
    const filename = `avatar_${timestamp}_${Math.random().toString(36).substring(7)}${ext}`
    const storagePath = `avatars/${filename}`

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    // Upload via Supabase Storage REST API
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/uploads/${storagePath}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceKey}`,
          "Content-Type": file.type,
          "x-upsert": "true",
        },
        body: bytes,
      }
    )

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      console.error("Supabase upload error:", err)
      return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/uploads/${storagePath}`

    await prisma.users.update({
      where: { users_id: session.user.id },
      data: { avatar: publicUrl }
    })

    return NextResponse.json({ message: "Avatar uploaded successfully", avatarUrl: publicUrl })
  } catch (error) {
    console.error("Error uploading avatar:", error)
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 })
  }
}
