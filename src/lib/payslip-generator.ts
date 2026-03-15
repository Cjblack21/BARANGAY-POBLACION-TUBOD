import { prisma } from "@/lib/prisma"

export interface PayslipData {
  users_id: string
  name: string | null
  email: string
  department?: string | null
  position?: string | null
  totalHours: number
  totalSalary: number
  released: boolean
  breakdown: {
    biweeklyBasicSalary: number
    realTimeEarnings: number
    realWorkHours: number
    overtimePay: number
    attendanceDeductions: number
    nonAttendanceDeductions: number
    loanPayments: number
    grossPay: number
    totalDeductions: number
    netPay: number
    deductionDetails: any[]
    loanDetails?: any[]
    otherDeductionDetails?: any[]
    attendanceDeductionDetails?: any[]
  }
}

export interface HeaderSettings {
  schoolName: string
  schoolAddress: string
  systemName: string
  logoUrl: string
  showLogo: boolean
  headerAlignment: 'left' | 'center' | 'right'
  fontSize: 'small' | 'medium' | 'large'
  customText?: string
}

export async function getHeaderSettings(): Promise<HeaderSettings | null> {
  try {
    const settings = await prisma.header_settings.findFirst()
    if (!settings) return null

    // Type cast to match interface
    return {
      schoolName: settings.schoolName,
      schoolAddress: settings.schoolAddress,
      systemName: settings.systemName,
      logoUrl: settings.logoUrl,
      showLogo: settings.showLogo,
      headerAlignment: settings.headerAlignment as 'left' | 'center' | 'right',
      fontSize: settings.fontSize as 'small' | 'medium' | 'large',
      customText: settings.customText || undefined
    }
  } catch (error) {
    console.error('Error fetching header settings:', error)
    return null
  }
}

export function generatePayslipHTML(
  employee: PayslipData,
  period: { periodStart: string; periodEnd: string },
  headerSettings: HeaderSettings | null
): string {
  const breakdown = employee.breakdown

  // Get logo URL (use default if not configured)
  const logoUrl = headerSettings?.logoUrl || '/BRGY PICTURE LOG TUBOD.png'

  // Use biweekly salary (not monthly)
  const biweeklySalary = breakdown.biweeklyBasicSalary
  const honorarium = breakdown.overtimePay || 0

  // Separate deductions into categories
  const mandatoryDeductions = breakdown.deductionDetails?.filter((d: any) =>
    d.isMandatory ||
    d.type?.includes('PhilHealth') ||
    d.type?.includes('SSS') ||
    d.type?.includes('Pag-IBIG') ||
    d.type?.includes('Tax')
  ) || []

  const attendanceDeductions = breakdown.attendanceDeductionDetails || []
  const allLoanDeductions = breakdown.loanDetails || []
  // Separate actual loans from [DEDUCTION] custom deductions based on purpose prefix
  const loanDeductions = allLoanDeductions.filter((loan: any) =>
    !String(loan.purpose || loan.type || '').toUpperCase().startsWith('[DEDUCTION]')
  )
  const customDeductionItems = allLoanDeductions.filter((loan: any) =>
    String(loan.purpose || loan.type || '').toUpperCase().startsWith('[DEDUCTION]')
  )

  const totalMandatory = mandatoryDeductions.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
  const totalLoans = loanDeductions.reduce((sum: number, loan: any) => sum + (loan.payment || loan.amount || 0), 0)
  const totalCustomDeductions = customDeductionItems.reduce((sum: number, d: any) => sum + (d.payment || d.amount || 0), 0)

  // Calculate attendance deductions: if not explicitly provided, derive from total deductions
  let totalAttendance = breakdown.attendanceDeductions || 0
  if (totalAttendance === 0 && breakdown.totalDeductions > 0) {
    // Calculate: attendance = total - mandatory - loans
    totalAttendance = breakdown.totalDeductions - totalMandatory - totalLoans
    // Ensure it's not negative
    totalAttendance = Math.max(0, totalAttendance)
  }

  return `
    <div class="payslip" style="
      position: relative;
      width: 100%;
      height: 100%;
      border: 2px solid #000;
      margin: 0;
      padding: 8px;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.2;
      page-break-inside: avoid;
      overflow: hidden;
      background: white;
    ">
      <!-- Background Watermark Logo -->
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        opacity: 0.03;
        z-index: 0;
        pointer-events: none;
      ">
        <img src="${logoUrl}" alt="Watermark" style="
          width: 500px;
          height: 500px;
          object-fit: contain;
          filter: blur(2px);
        " onerror="this.style.display='none'">
      </div>

      <!-- Content (above watermark) -->
      <div style="position: relative; z-index: 1; padding: 0 24px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; border-bottom: 2px solid #000; padding-bottom: 4px;">
          <!-- Logo left -->
          <div style="min-width: 65px;">
            ${headerSettings?.showLogo !== false ? `
              <img src="${logoUrl}" alt="Logo" style="height: 65px; width: auto;" onerror="this.src='/BRGY PICTURE LOG TUBOD.png'">
            ` : ''}
          </div>
          <!-- Center text -->
          <div style="text-align: center; flex: 1;">
            <div style="font-weight: bold; font-size: 12px; margin-bottom: 2px;">
              ${headerSettings?.schoolName || 'BARANGAY POBLACION TUBOD'}
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 1px;">
              ${headerSettings?.schoolAddress || ''}
            </div>
            <div style="font-size: 12px; color: #666; margin-bottom: 2px;">
              ${headerSettings?.systemName || 'Payroll Management System'}
            </div>
            <div style="font-weight: bold; font-size: 12px; letter-spacing: 2px;">
              HONORARIUM
            </div>
          </div>
          <!-- QR code right -->
          <div style="min-width: 65px; text-align: right;">
            <img src="/QR CODE PMS SYSTEM.png" alt="QR Code" style="height: 65px; width: 65px; object-fit: contain;" onerror="this.style.display='none'">
            <div style="font-size: 12px; font-weight: bold; color: #555; text-align: center; margin-top: 2px; letter-spacing: 1px;">SCAN ME</div>
          </div>
        </div>
        
        <!-- Staff Information: 2-column grid -->
        <div style="margin-bottom: 3px; font-size: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 0 8px; padding-bottom: 3px;">
          <div style="margin-bottom: 2px;"><strong>Brgy Staff:</strong> ${employee.name || employee.email}</div>
          <div style="margin-bottom: 2px;"><strong>Period:</strong> ${new Date(period.periodStart).toLocaleDateString()} - ${new Date(period.periodEnd).toLocaleDateString()}</div>
          <div style="margin-bottom: 2px;"><strong>Brgy Staff ID:</strong> ${employee.users_id}</div>
          <div style="margin-bottom: 2px;"><strong>Status:</strong> RELEASED</div>
          <div style="margin-bottom: 2px;"><strong>Email:</strong> ${employee.email}</div>
          <div style="margin-bottom: 2px;"><strong>BLGU/Position:</strong> ${employee.position || 'Barangay Staff'}</div>
        </div>
        
        <!-- SALARY SECTION (no header label) -->
        <div style="margin: 3px 0; border-top: 1px solid #e5e7eb; padding-top: 3px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 12px; padding-right: 15%;">
            <span>Monthly Salary:</span>
            <span style="font-weight: bold; color: #000;">₱${biweeklySalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          ${honorarium > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 12px; padding-right: 15%;">
            <span>Additional Pay:</span>
            <span style="font-weight: bold; color: #000;">₱${honorarium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          ` : ''}
        </div>

        <!-- DEDUCTIONS SECTION -->
        <div style="margin: 4px 0; border-top: 1px solid #e5e7eb; padding-top: 4px;">
          <div style="font-weight: bold; font-size: 12px; margin-bottom: 3px; color: #dc2626;">DEDUCTIONS</div>
          
          <!-- Mandatory Deductions -->
          ${mandatoryDeductions.length > 0 || totalMandatory > 0 ? `
          <div style="margin-bottom: 2px;">
            <div style="font-size: 12px; font-weight: bold; color: #000; margin-bottom: 1px;">Mandatory Deductions:</div>
            ${mandatoryDeductions.map((d: any) => `
              <div style="display: flex; justify-content: space-between; margin-bottom: 1px; font-size: 12px; padding-left: 6px; padding-right: 15%;">
                <span style="color: #666;">${d.type || 'Deduction'}</span>
                <span style="color: #dc2626; font-weight: bold;">-₱${(d.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <!-- Attendance Deductions -->
          ${attendanceDeductions.length > 0 || totalAttendance > 0 ? `
          <div style="margin-bottom: 2px;">
            <div style="font-size: 12px; font-weight: bold; color: #000; margin-bottom: 1px;">Attendance Deductions:</div>
            ${attendanceDeductions.map((d: any) => {
    const incidentDate = d.appliedAt
      ? new Date(d.appliedAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
      : ''
    const rawNotes = (d.notes || '').trim()
    const displayNote = rawNotes || (() => {
      const totalMin = Math.round(Number(d.amount || 0))
      if (totalMin <= 0) return ''
      const h = Math.floor(totalMin / 60), m = totalMin % 60
      return h > 0 ? `Late: ${h}h ${m}m` : `Late: ${totalMin}m`
    })()
    return `
              <div style="display: flex; justify-content: space-between; font-size: 12px; padding-left: 6px; margin-bottom: 1px; padding-right: 15%;">
                <span style="color: #666;">${incidentDate}${displayNote ? ` — ${displayNote}` : ''}</span>
                <span style="color: #dc2626; font-weight: bold;">-₱${(d.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>`
  }).join('')}
            ${attendanceDeductions.length === 0 && totalAttendance > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 1px; font-size: 12px; padding-left: 6px; padding-right: 15%;">
                <span style="color: #666;">Attendance Deduction</span>
                <span style="color: #dc2626; font-weight: bold;">-₱${totalAttendance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
          </div>
          ` : ''}

          <!-- Loan Payments -->
          ${loanDeductions.length > 0 || totalLoans > 0 ? `
          <div style="margin-bottom: 2px;">
            <div style="font-size: 12px; font-weight: bold; color: #000; margin-bottom: 1px;">Loan Payments:</div>
            ${loanDeductions.map((loan: any) => `
              <div style="margin-bottom: 2px; font-size: 12px; padding-left: 6px;">
                <div style="display: flex; justify-content: space-between; padding-right: 15%;">
                  <span style="color: #666;">${loan.purpose || loan.type || 'Loan Payment'}</span>
                  <span style="color: #dc2626; font-weight: bold;">-₱${(loan.payment || loan.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                ${loan.remainingBalance ? `
                <div style="font-size: 12px; color: #666; margin-top: 1px;">
                  Balance: ₱${(loan.remainingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                ` : ''}
              </div>
            `).join('')}
            ${loanDeductions.length === 0 && totalLoans > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 1px; font-size: 12px; padding-left: 6px; padding-right: 15%;">
                <span style="color: #666;">Loan Payment</span>
                <span style="color: #dc2626; font-weight: bold;">-₱${totalLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
          </div>
          ` : ''}

          <!-- Custom Deductions (separated from loans) -->
          ${customDeductionItems.length > 0 ? `
          <div style="margin-bottom: 2px;">
            <div style="font-size: 12px; font-weight: bold; color: #000; margin-bottom: 1px;">Custom Deductions:</div>
            ${customDeductionItems.map((d: any) => {
              const rawName = String(d.purpose || d.type || 'Deduction')
              const displayName = rawName.replace(/^\[DEDUCTION\]\s*/i, '').trim() || 'Custom Deduction'
              return `
              <div style="margin-bottom: 2px; font-size: 12px; padding-left: 6px;">
                <div style="display: flex; justify-content: space-between; padding-right: 15%;">
                  <span style="color: #666;">${displayName}</span>
                  <span style="color: #dc2626; font-weight: bold;">-₱${(d.payment || d.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                ${d.remainingBalance ? `
                <div style="font-size: 12px; color: #666; margin-top: 1px;">
                  Balance: ₱${(d.remainingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                ` : ''}
              </div>
            `}).join('')}
          </div>
          ` : ''}

          <!-- Total Deductions -->
          <div style="padding: 2px 0; border-top: 1px solid #bbb; margin-top: 2px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; padding-right: 15%;">
              <span>TOTAL DEDUCTIONS:</span>
              <span style="color: #dc2626;">-₱${breakdown.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <!-- NET PAY -->
        <div style="display: flex; justify-content: space-between; margin-top: 6px; padding: 6px 15% 6px 6px; border-top: 1px solid #bbb; font-weight: bold; font-size: 12px; border-radius: 3px;">
          <span>NET PAY</span>
          <span style="color: #000;">₱${employee.totalSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <!-- Signatures -->
        <div style="margin-top: 6px; display: flex; justify-content: space-around; gap: 12px; border-top: 1px solid #ccc; padding-top: 6px;">
          <div style="flex: 1; text-align: center; font-size: 12px;">
            <div style="border-top: 1px solid #000; margin: 12px 6px 2px 6px;"></div>
            <div style="font-weight: bold; font-size: 12px;">EMMA L. MACTAO</div>
            <div style="font-size: 12px; color: #666;">Brgy Treasurer</div>
          </div>
          <div style="flex: 1; text-align: center; font-size: 12px;">
            <div style="border-top: 1px solid #000; margin: 12px 6px 2px 6px;"></div>
            <div style="font-weight: bold; font-size: 12px;">${(employee.name || employee.email).toUpperCase()}</div>
            <div style="font-size: 12px; color: #666;">Received by</div>
          </div>
        </div>
        

      </div>
    </div>
  `
}

export function generatePayslipsHTML(
  employees: PayslipData[],
  period: { periodStart: string; periodEnd: string },
  headerSettings: HeaderSettings | null,
  employeesPerPage: number = 2 // Changed from 6 to 2 for half A4 layout
): string {
  // Group personnel into pages (2 per page)
  const pages = []
  for (let i = 0; i < employees.length; i += employeesPerPage) {
    pages.push(employees.slice(i, i + employeesPerPage))
  }

  const pageContent = pages.map((pageEmployees, pageIndex) => {
    const payslips = pageEmployees.map((employee, index) => {
      return generatePayslipHTML(employee, period, headerSettings)
    }).join('')

    return `
      <div class="page" style="
        width: 210mm;
        height: 297mm;
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        ${pageIndex > 0 ? 'page-break-before: always;' : ''}
        clear: both;
      ">
        <div style="
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 0;
        ">
          ${payslips}
        </div>
      </div>
    `
  }).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <!-- Payslip Generator Version: ${Date.now()} -->
      <meta charset="utf-8">
      <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
      <meta http-equiv="Pragma" content="no-cache">
      <meta http-equiv="Expires" content="0">
      <title>Payroll Slips</title>
      <style>
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          .page {
            page-break-after: always;
            width: 210mm;
            height: 297mm;
          }
          .page:last-child {
            page-break-after: avoid;
          }
          .payslip {
            width: 100% !important;
            height: 100% !important;
            page-break-inside: avoid;
          }
        }
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background: white;
        }
        .page {
          width: 210mm;
          height: 297mm;
          margin: 0 auto;
          padding: 0;
          box-sizing: border-box;
          background: white;
        }
        .payslip {
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      ${pageContent}
    </body>
    </html>
  `
}








