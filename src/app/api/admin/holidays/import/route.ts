import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// 2025-2026 Philippine National Holidays
const philippineHolidays2025 = [
  // 2025 Holidays
  { name: "New Year's Day", date: "2025-01-01", type: "NATIONAL", description: "Start of the new calendar year" },
  { name: "Chinese New Year", date: "2025-01-29", type: "NATIONAL", description: "Lunar New Year celebration" },
  { name: "EDSA People Power Revolution Anniversary", date: "2025-02-25", type: "NATIONAL", description: "Commemoration of the 1986 peaceful revolution" },
  { name: "Araw ng Kagitingan (Day of Valor)", date: "2025-04-09", type: "NATIONAL", description: "Honors Filipino and American soldiers who fought in WWII" },
  { name: "Maundy Thursday", date: "2025-04-17", type: "RELIGIOUS", description: "Christian observance during Holy Week" },
  { name: "Good Friday", date: "2025-04-18", type: "RELIGIOUS", description: "Crucifixion of Jesus Christ" },
  { name: "Black Saturday", date: "2025-04-19", type: "RELIGIOUS", description: "Day before Easter Sunday" },
  { name: "Labor Day", date: "2025-05-01", type: "NATIONAL", description: "International Workers' Day" },
  { name: "Independence Day", date: "2025-06-12", type: "NATIONAL", description: "Philippine Independence from Spain (1898)" },
  { name: "Eid al-Adha (Feast of Sacrifice)", date: "2025-06-07", type: "RELIGIOUS", description: "Islamic holiday honoring Ibrahim's willingness to sacrifice" },
  { name: "Ninoy Aquino Day", date: "2025-08-21", type: "NATIONAL", description: "Assassination anniversary of Senator Benigno Aquino Jr." },
  { name: "National Heroes Day", date: "2025-08-25", type: "NATIONAL", description: "Honoring Filipino heroes" },
  { name: "All Saints' Day", date: "2025-11-01", type: "RELIGIOUS", description: "Christian feast honoring all saints" },
  { name: "All Souls' Day", date: "2025-11-02", type: "RELIGIOUS", description: "Day of prayer for the departed" },
  { name: "Bonifacio Day", date: "2025-11-30", type: "NATIONAL", description: "Birth anniversary of Andres Bonifacio" },
  { name: "Feast of the Immaculate Conception", date: "2025-12-08", type: "RELIGIOUS", description: "Catholic holy day" },
  { name: "Christmas Eve", date: "2025-12-24", type: "RELIGIOUS", description: "Day before Christmas" },
  { name: "Christmas Day", date: "2025-12-25", type: "RELIGIOUS", description: "Birth of Jesus Christ" },
  { name: "Rizal Day", date: "2025-12-30", type: "NATIONAL", description: "Execution anniversary of Dr. Jose Rizal" },
  { name: "New Year's Eve", date: "2025-12-31", type: "NATIONAL", description: "Last day of the year" },
  
  // 2026 Holidays
  { name: "New Year's Day", date: "2026-01-01", type: "NATIONAL", description: "Start of the new calendar year" },
  { name: "Chinese New Year", date: "2026-02-17", type: "NATIONAL", description: "Lunar New Year celebration" },
  { name: "EDSA People Power Revolution Anniversary", date: "2026-02-25", type: "NATIONAL", description: "Commemoration of the 1986 peaceful revolution" },
  { name: "Maundy Thursday", date: "2026-04-02", type: "RELIGIOUS", description: "Christian observance during Holy Week" },
  { name: "Good Friday", date: "2026-04-03", type: "RELIGIOUS", description: "Crucifixion of Jesus Christ" },
  { name: "Black Saturday", date: "2026-04-04", type: "RELIGIOUS", description: "Day before Easter Sunday" },
  { name: "Araw ng Kagitingan (Day of Valor)", date: "2026-04-09", type: "NATIONAL", description: "Honors Filipino and American soldiers who fought in WWII" },
  { name: "Labor Day", date: "2026-05-01", type: "NATIONAL", description: "International Workers' Day" },
  { name: "Eid al-Fitr", date: "2026-05-24", type: "RELIGIOUS", description: "End of Ramadan" },
  { name: "Independence Day", date: "2026-06-12", type: "NATIONAL", description: "Philippine Independence from Spain (1898)" },
  { name: "Eid al-Adha (Feast of Sacrifice)", date: "2026-07-31", type: "RELIGIOUS", description: "Islamic holiday honoring Ibrahim's willingness to sacrifice" },
  { name: "Ninoy Aquino Day", date: "2026-08-21", type: "NATIONAL", description: "Assassination anniversary of Senator Benigno Aquino Jr." },
  { name: "National Heroes Day", date: "2026-08-31", type: "NATIONAL", description: "Honoring Filipino heroes" },
  { name: "All Saints' Day", date: "2026-11-01", type: "RELIGIOUS", description: "Christian feast honoring all saints" },
  { name: "All Souls' Day", date: "2026-11-02", type: "RELIGIOUS", description: "Day of prayer for the departed" },
  { name: "Bonifacio Day", date: "2026-11-30", type: "NATIONAL", description: "Birth anniversary of Andres Bonifacio" },
  { name: "Feast of the Immaculate Conception", date: "2026-12-08", type: "RELIGIOUS", description: "Catholic holy day" },
  { name: "Christmas Eve", date: "2026-12-24", type: "RELIGIOUS", description: "Day before Christmas" },
  { name: "Christmas Day", date: "2026-12-25", type: "RELIGIOUS", description: "Birth of Jesus Christ" },
  { name: "Rizal Day", date: "2026-12-30", type: "NATIONAL", description: "Execution anniversary of Dr. Jose Rizal" },
  { name: "New Year's Eve", date: "2026-12-31", type: "NATIONAL", description: "Last day of the year" }
]

// Optional Company Observances 2025 (Not official holidays, for awareness/celebration only)
const internationalHolidays2025 = [
  { name: "International Women's Day", date: "2025-03-08", type: "COMPANY", description: "UN observance celebrating women's achievements" },
  { name: "Earth Day", date: "2025-04-22", type: "COMPANY", description: "Environmental awareness day" }
]

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting holiday import...')
    
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      console.log('❌ Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authorized:', session.user.email)

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'philippine' or 'international'

    console.log('📥 Import type:', type)

    let holidaysToImport = type === 'international' ? internationalHolidays2025 : philippineHolidays2025
    console.log(`📋 Total holidays to process: ${holidaysToImport.length}`)

    // Check for existing holidays to avoid duplicates
    console.log('🔍 Checking for existing holidays...')
    const existingHolidays = await prisma.holidays.findMany({
      where: {
        date: {
          in: holidaysToImport.map(h => new Date(h.date))
        }
      }
    })

    console.log(`📊 Found ${existingHolidays.length} existing holidays`)

    const existingDates = new Set(
      existingHolidays.map(h => h.date.toISOString().split('T')[0])
    )

    // Filter out holidays that already exist
    const newHolidays = holidaysToImport.filter(
      h => !existingDates.has(h.date)
    )

    console.log(`✨ New holidays to import: ${newHolidays.length}`)

    if (newHolidays.length === 0) {
      console.log('ℹ️ All holidays already exist')
      return NextResponse.json({ 
        message: 'All holidays already exist in the system',
        imported: 0,
        skipped: holidaysToImport.length
      })
    }

    // Bulk create new holidays
    console.log('💾 Creating holidays in database...')
    const { randomBytes } = await import('crypto')
    const created = await prisma.holidays.createMany({
      data: newHolidays.map(h => ({
        holidays_id: randomBytes(12).toString('hex'),
        name: h.name,
        date: new Date(h.date),
        type: h.type as any,
        description: h.description,
        updatedAt: new Date()
      }))
    })

    console.log(`✅ Successfully imported ${created.count} holidays`)
    return NextResponse.json({ 
      message: `Successfully imported ${created.count} holidays`,
      imported: created.count,
      skipped: holidaysToImport.length - created.count
    })
  } catch (error) {
    console.error('❌ Error importing holidays:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Failed to import holidays',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
