import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const users = await prisma.users.findMany({
    select: {
      name: true,
      personnel_types: { select: { department: true } }
    }
  })
  return NextResponse.json(users)
}
