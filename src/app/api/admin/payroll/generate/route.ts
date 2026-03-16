import { NextRequest, NextResponse } from "next/server"
import { generatePayroll } from "@/lib/actions/payroll"

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  // 🚫🚫🚫 FORCE BLOCK AUTO-GENERATION 🚫🚫🚫
  // This endpoint will ONLY work if called with explicit user confirmation
  console.log('🔒 Generate payroll endpoint called - checking authorization...')

  try {
    const body = await request.json()

    // STRICT CHECK: Must have userConfirmed flag set to true
    if (body.userConfirmed !== true) {
      console.error('❌ BLOCKED: Auto-generation attempt detected!')
      console.error('❌ Missing userConfirmed flag in request body')
      console.error('❌ Request body:', JSON.stringify(body))
      return NextResponse.json({
        success: false,
        error: '🚫 AUTO-GENERATION BLOCKED: You must click the "Generate Payroll" button to generate payroll. Automatic generation is disabled.'
      }, { status: 403 })
    }

    console.log('✅ User confirmation verified - proceeding with generation')

    const periodStart = body.periodStart
    const periodEnd = body.periodEnd
    const blgu = body.blgu as string | undefined // "Barangay Officials" | "Barangay Staff" | undefined (all)
    console.log('📅 Generating payroll for period:', { periodStart, periodEnd, blgu })

    const result = await generatePayroll(periodStart, periodEnd, blgu)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "Failed to generate payroll" }, { status: 500 })
    }
    return NextResponse.json({ success: true, message: result.message || "Payroll generated" })
  } catch (error) {
    console.error('❌ Error in generate endpoint:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate payroll'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
