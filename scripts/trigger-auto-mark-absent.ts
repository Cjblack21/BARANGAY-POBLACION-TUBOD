import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'
import { getTodayRangeInPhilippines, getNowInPhilippines } from '../src/lib/timezone'
import { calculateAbsenceDeduction } from '../src/lib/attendance-calculations'

const prisma = new PrismaClient()

async function triggerAutoMarkAbsent() {
  try {
    console.log('🔧 Manually triggering auto-mark-absent logic...\n')
    
    // Get attendance settings
    const settings = await prisma.attendance_settings.findFirst()
    if (!settings || !settings.timeOutEnd) {
      console.log('❌ No attendance settings or timeOutEnd found')
      return
    }
    
    console.log(`✅ Cutoff time: ${settings.timeOutEnd}`)
    
    // Get current time in Philippines
    const nowPH = getNowInPhilippines()
    const nowHH = nowPH.getHours().toString().padStart(2, '0')
    const nowMM = nowPH.getMinutes().toString().padStart(2, '0')
    const nowHHmm = `${nowHH}:${nowMM}`
    
    console.log(`⏰ Current time (PH): ${nowHHmm}`)
    
    // Check if we're past cutoff
    const isPastCutoff = nowHHmm > settings.timeOutEnd
    
    if (!isPastCutoff) {
      console.log('✅ Current time is BEFORE cutoff, no action needed')
      return
    }
    
    console.log('⚠️  Current time is AFTER cutoff - marking absent...\n')
    
    // Get today's date range
    const { start: startOfToday, end: endOfToday } = getTodayRangeInPhilippines()
    
    console.log(`📅 Today: ${startOfToday.toISOString().split('T')[0]}`)
    
    // Get all active personnel
    const users = await prisma.users.findMany({
      where: { isActive: true, role: 'PERSONNEL' },
      include: { personnel_types: true }
    })
    
    // Get attendances records for today
    const todayRecords = await prisma.attendances.findMany({
      where: {
        date: { gte: startOfToday, lte: endOfToday }
      }
    })
    
    const recordMap = new Map(todayRecords.map(r => [r.users_id, r]))
    
    let markedCount = 0
    
    for (const user of users) {
      const record = recordMap.get(user.users_id)
      const basicSalary = Number(user.personnel_types?.basicSalary || 0)
      
      if (!record || record.status === 'PENDING') {
        // Mark as absent
        if (record) {
          await prisma.attendances.update({
            where: { attendances_id: record.attendances_id },
            data: { status: 'ABSENT' }
          })
          console.log(`✅ Updated ${user.name}: PENDING → ABSENT`)
        } else {
          const attendanceId = randomBytes(12).toString('hex')
          await prisma.attendances.create({
            data: {
              attendances_id: attendanceId,
              users_id: user.users_id,
              date: new Date(startOfToday),
              status: 'ABSENT',
              updatedAt: new Date()
            }
          })
          console.log(`✅ Created ABSENT record for ${user.name}`)
        }
        
        markedCount++
      }
    }
    
    console.log(`\n✅ Marked ${markedCount} user(s) as ABSENT`)
    console.log('💡 Refresh your pages to see the updated status')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

triggerAutoMarkAbsent()
