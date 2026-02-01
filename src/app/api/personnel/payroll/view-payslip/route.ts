import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { periodStart, periodEnd } = await request.json()

    // Get the payroll entry for this user and period (from archived payroll)
    const payrollEntry = await prisma.payrollEntry.findFirst({
      where: {
        users_id: session.user.id,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        status: {
          in: ['RELEASED', 'ARCHIVED']
        }
      },
      include: {
        user: {
          include: {
            personnelType: true
          }
        }
      }
    })

    if (!payrollEntry) {
      return new NextResponse('Payroll not found', { status: 404 })
    }

    // Parse the breakdown snapshot (already saved when admin released/archived)
    let snapshot = null
    try {
      snapshot = payrollEntry.breakdownSnapshot ?
        (typeof payrollEntry.breakdownSnapshot === 'string' ?
          JSON.parse(payrollEntry.breakdownSnapshot) :
          payrollEntry.breakdownSnapshot) : null
    } catch (e) {
      console.error('Failed to parse snapshot:', e)
    }

    // Get values directly from snapshot
    // IMPORTANT: snapshot.periodSalary is GROSS PAY (basicSalary + overload)
    // To get actual basic salary, subtract additional pay from gross pay
    const overloadPay = snapshot?.totalAdditions || 0
    const grossPay = snapshot?.periodSalary || 0
    const monthlyBasicSalary = grossPay - overloadPay // Actual basic salary
    const semiMonthlyBase = monthlyBasicSalary / 2
    const overloadPayDetails = snapshot?.overloadPayDetails || []
    const attendanceDeductions = snapshot?.attendanceDeductions || 0
    const totalDeductions = snapshot?.totalDeductions || 0
    const netPay = snapshot?.netPay || 0

    // Format dates
    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    }

    // Generate simple HTML payslip (same format as admin's)
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payslip</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f5f5f5;
    }
    .payslip {
      width: 500px;
      background: white;
      border: 3px solid #000;
      padding: 30px;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .logo {
      width: 80px;
      height: 80px;
      margin: 0 auto 10px;
      background: #e74c3c;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 40px;
      font-weight: bold;
    }
    .school-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .school-address {
      font-size: 14px;
      color: #666;
      margin-bottom: 3px;
    }
    .title {
      font-size: 20px;
      font-weight: bold;
      margin-top: 12px;
      border-top: 2px solid #ccc;
      padding-top: 10px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
      border-bottom: 1px solid #eee;
    }
    .label {
      font-weight: bold;
    }
    .section-title {
      font-size: 15px;
      font-weight: bold;
      font-style: italic;
      margin: 18px 0 10px 0;
    }
    .amount-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      font-size: 14px;
      border-bottom: 1px solid #eee;
    }
    .gross-row {
      background: #e3f2fd;
      font-weight: bold;
      border: 2px solid #2196f3;
      margin-top: 5px;
    }
    .deduction-row {
      background: #ffebee;
      color: #c62828;
    }
    .net-row {
      background: #e8f5e9;
      font-weight: bold;
      border: 2px solid #4caf50;
      margin-top: 10px;
      font-size: 16px;
    }
    .status {
      text-align: center;
      margin-top: 15px;
      padding: 12px;
      background: #e8f5e9;
      border: 2px solid #4caf50;
      border-radius: 5px;
      font-weight: bold;
      font-size: 14px;
      color: #2e7d32;
    }
    .signatures {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      border-top: 2px solid #ccc;
      padding-top: 15px;
    }
    .sig-box {
      flex: 1;
      text-align: center;
    }
    .sig-line {
      border-top: 2px solid #000;
      margin: 30px 5px 5px 5px;
    }
    .sig-label {
      font-weight: bold;
      font-size: 13px;
      margin-top: 5px;
    }
    .sig-sublabel {
      font-size: 11px;
      color: #666;
      margin-top: 2px;
    }
    .sig-date {
      font-size: 11px;
      color: #666;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="payslip">
    <div class="header">
      <div class="logo">C</div>
      <div class="school-name">TUBOD BARANGAY POBLACION</div>
      <div class="school-address">Tubod, Lanao del Norte</div>
      <div class="school-address">POBLACION - PMS</div>
      <div class="title">PAYSLIP</div>
    </div>

    <div class="info-row">
      <span class="label">Staff:</span>
      <span>${payrollEntry.user?.name || 'N/A'}</span>
    </div>
    <div class="info-row">
      <span class="label">Email:</span>
      <span>${payrollEntry.user?.email || 'N/A'}</span>
    </div>
    <div class="info-row">
      <span class="label">ID Number:</span>
      <span>${payrollEntry.users_id}</span>
    </div>
    <div class="info-row">
      <span class="label">Period:</span>
      <span>${formatDate(periodStart)} - ${formatDate(periodEnd)}</span>
    </div>
    <div class="info-row">
      <span class="label">Status:</span>
      <span>Released</span>
    </div>

    <div class="section-title">Monthly Basic Salary (Reference):</div>
    <div class="amount-row">
      <span>Monthly Rate</span>
      <span>₱${monthlyBasicSalary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
    </div>

    <div class="amount-row">
      <span>Basic Salary (Semi-Monthly):</span>
      <span>₱${semiMonthlyBase.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
    </div>
    ${overloadPayDetails.length > 0 ? overloadPayDetails.map((detail: any) => `
    <div class="amount-row">
      <span>+ ${detail.type === 'POSITION_PAY' ? 'Position Pay' :
        detail.type === 'BONUS' ? 'Bonus' :
          detail.type === '13TH_MONTH' ? '13th Month Pay' :
            detail.type === 'OVERTIME' ? 'Overtime' :
              detail.type}:</span>
      <span style="color: #2e7d32;">₱${Number(detail.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
    </div>
    `).join('') : (overloadPay > 0 ? `
    <div class="amount-row">
      <span>+ Additional Pay:</span>
      <span style="color: #2e7d32;">₱${overloadPay.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
    </div>
    ` : '')}
    <div class="amount-row gross-row">
      <span>GROSS PAY:</span>
      <span>₱${grossPay.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
    </div>

    ${totalDeductions > 0 ? `
    <div class="section-title">Attendance Deductions:</div>
    ${snapshot?.attendanceRecords?.map((record: any) => `
    <div class="amount-row deduction-row">
      <span>${record.date} ${record.status}</span>
      <span>-₱${Number(record.deductions || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
    </div>
    `).join('') || ''}
    ` : ''}

    <div class="amount-row net-row">
      <span>NET PAY:</span>
      <span>₱${netPay.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
    </div>

    <div class="status">Status: ${payrollEntry.status}</div>

    <div class="signatures">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Brgy Treasurer</div>
        <div class="sig-sublabel">Prepared by</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Punong Barangay</div>
        <div class="sig-sublabel">Approved by</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-label">Staff Signature</div>
        <div class="sig-sublabel">Received by</div>
        <div class="sig-date">Date: ______________</div>
      </div>
    </div>
  </div>
</body>
</html>
    `

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    })

  } catch (error) {
    console.error('Error fetching payslip:', error)
    return NextResponse.json({ error: 'Failed to fetch payslip' }, { status: 500 })
  }
}
