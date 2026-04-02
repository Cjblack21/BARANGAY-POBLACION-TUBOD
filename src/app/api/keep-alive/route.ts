import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// This endpoint is designed to be pinged by UptimeRobot or Cron-job.org
// It keeps both the Vercel Serverless environment warm and the Supabase Database awake!
export async function GET() {
  try {
    // A very lightweight query just to poke the database
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({ 
      status: 'ok', 
      message: 'System is awake!',
      time: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: 'Failed to wake database' },
      { status: 500 }
    )
  }
}
