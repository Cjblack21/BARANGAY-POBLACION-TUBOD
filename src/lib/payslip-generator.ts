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
  const loanDeductions = breakdown.loanDetails || []

  const totalMandatory = mandatoryDeductions.reduce((sum: number, d: any) => sum + (d.amount || 0), 0)
  const totalLoans = breakdown.loanPayments || 0

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
      font-size: 10px;
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
      <div style="position: relative; z-index: 1;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; border-bottom: 2px solid #000; padding-bottom: 4px;">
          <!-- Logo left -->
          <div style="min-width: 50px;">
            ${headerSettings?.showLogo !== false ? `
              <img src="${logoUrl}" alt="Logo" style="height: 50px; width: auto;" onerror="this.src='/BRGY PICTURE LOG TUBOD.png'">
            ` : ''}
          </div>
          <!-- Center text -->
          <div style="text-align: center; flex: 1;">
            <div style="font-weight: bold; font-size: 13px; margin-bottom: 2px;">
              ${headerSettings?.schoolName || 'BARANGAY POBLACION TUBOD'}
            </div>
            <div style="font-size: 9px; color: #666; margin-bottom: 1px;">
              ${headerSettings?.schoolAddress || ''}
            </div>
            <div style="font-size: 9px; color: #666; margin-bottom: 2px;">
              ${headerSettings?.systemName || 'Payroll Management System'}
            </div>
            <div style="font-weight: bold; font-size: 16px; letter-spacing: 2px;">
              PAYSLIP
            </div>
          </div>
          <!-- QR code right -->
          <div style="min-width: 50px; text-align: right;">
            <img src="/QR CODE PMS SYSTEM.png" alt="QR Code" style="height: 50px; width: 50px; object-fit: contain;" onerror="this.style.display='none'">
            <div style="font-size: 7px; font-weight: bold; color: #555; text-align: center; margin-top: 2px; letter-spacing: 1px;">SCAN ME</div>
          </div>
        </div>
        
        <!-- Staff Information -->
        <div style="margin-bottom: 4px; font-size: 10px; line-height: 1.3;">
          <div style="margin-bottom: 3px;">
            <strong>Brgy Staff:</strong> ${employee.name || employee.email}
          </div>
          <div style="margin-bottom: 3px;">
            <strong>Brgy Staff ID:</strong> ${employee.users_id}
          </div>
          <div style="margin-bottom: 3px;">
            <strong>Email:</strong> ${employee.email}
          </div>
          <div style="margin-bottom: 3px;">
            <strong>BLGU/Position:</strong> ${employee.department || 'BLGU'} / ${employee.position || 'Barangay Staff'}
          </div>
          <div>
            <strong>Period:</strong> ${new Date(period.periodStart).toLocaleDateString()} - ${new Date(period.periodEnd).toLocaleDateString()}
          </div>
        </div>
        
        <!-- HONORARIUM SECTION -->
        <div style="margin: 6px 0; border-top: 1px solid #ccc; padding-top: 6px;">
          <div style="font-weight: bold; font-size: 13px; margin-bottom: 3px; color: #16a34a;">HONORARIUM</div>
          <div style="padding: 5px; border-radius: 3px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px;">
              <span>Monthly Salary:</span>
              <span style="font-weight: bold; color: #16a34a;">₱${biweeklySalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            ${honorarium > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px;">
              <span>Additional Pay:</span>
              <span style="font-weight: bold; color: #16a34a;">₱${honorarium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- DEDUCTIONS SECTION -->
        <div style="margin: 4px 0; border-top: 1px solid #ccc; padding-top: 4px;">
          <div style="font-weight: bold; font-size: 13px; margin-bottom: 3px; color: #dc2626;">DEDUCTIONS</div>
          
          <!-- Mandatory Deductions -->
          ${mandatoryDeductions.length > 0 || totalMandatory > 0 ? `
          <div style="padding: 5px; border-radius: 3px; margin-bottom: 4px;">
            <div style="font-size: 10px; font-weight: bold; color: #3b82f6; margin-bottom: 3px;">Mandatory Deductions:</div>
            ${mandatoryDeductions.map((d: any) => `
              <div style="display: flex; justify-content: space-between; margin-bottom: 1px; font-size: 9px; padding-left: 6px;">
                <span style="color: #666;">${d.type || 'Deduction'}</span>
                <span style="color: #dc2626; font-weight: bold;">-₱${(d.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            `).join('')}
            <div style="border-top: 1px solid #ddd; margin-top: 3px; padding-top: 3px;">
              <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold;">
                <span>Subtotal:</span>
                <span style="color: #dc2626;">-₱${totalMandatory.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Attendance Deductions -->
          ${attendanceDeductions.length > 0 || totalAttendance > 0 ? `
          <div style="padding: 5px; border-radius: 3px; margin-bottom: 4px;">
            <div style="font-size: 10px; font-weight: bold; color: #dc2626; margin-bottom: 3px;">Attendance Deductions:</div>
            ${attendanceDeductions.map((d: any) => `
              <div style="margin-bottom: 3px; padding-left: 6px;">
                <div style="display: flex; justify-content: space-between; font-size: 9px;">
                  <span style="color: #666;">${d.description || d.type || 'Attendance Deduction'}</span>
                  <span style="color: #dc2626; font-weight: bold;">-₱${(d.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            `).join('')}
            ${attendanceDeductions.length === 0 && totalAttendance > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 1px; font-size: 9px; padding-left: 6px;">
                <span style="color: #666;">Attendance Deduction</span>
                <span style="color: #dc2626; font-weight: bold;">-₱${totalAttendance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
            <div style="border-top: 1px solid #ddd; margin-top: 3px; padding-top: 3px;">
              <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold;">
                <span>Subtotal:</span>
                <span style="color: #dc2626;">-₱${totalAttendance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Loan Payments -->
          ${loanDeductions.length > 0 || totalLoans > 0 ? `
          <div style="padding: 5px; border-radius: 3px; margin-bottom: 4px;">
            <div style="font-size: 10px; font-weight: bold; color: #d97706; margin-bottom: 3px;">Loan Payments:</div>
            ${loanDeductions.map((loan: any) => `
              <div style="margin-bottom: 2px; font-size: 9px; padding-left: 6px;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #666;">${loan.purpose || 'Loan Payment'}</span>
                  <span style="color: #d97706; font-weight: bold;">-₱${(loan.payment || loan.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                ${loan.remainingBalance ? `
                <div style="font-size: 8px; color: #666; margin-top: 1px;">
                  Balance: ₱${(loan.remainingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                ` : ''}
              </div>
            `).join('')}
            ${loanDeductions.length === 0 && totalLoans > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 1px; font-size: 9px; padding-left: 6px;">
                <span style="color: #666;">Loan Payment</span>
                <span style="color: #d97706; font-weight: bold;">-₱${totalLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ''}
            <div style="border-top: 1px solid #ddd; margin-top: 3px; padding-top: 3px;">
              <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold;">
                <span>Subtotal:</span>
                <span style="color: #d97706;">-₱${totalLoans.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          ` : ''}

          <!-- Total Deductions -->
          <div style="padding: 5px; border-radius: 3px; border-top: 2px solid #000; border-bottom: 2px solid #000;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold;">
              <span>TOTAL DEDUCTIONS:</span>
              <span style="color: #dc2626;">-₱${breakdown.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <!-- NET PAY -->
        <div style="display: flex; justify-content: space-between; margin-top: 6px; padding: 6px; border-top: 2px solid #000; font-weight: bold; font-size: 14px; border-radius: 3px;">
          <span>NET PAY</span>
          <span style="color: #16a34a;">₱${employee.totalSalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <!-- Signatures -->
        <div style="margin-top: 6px; display: flex; justify-content: space-around; gap: 12px; border-top: 1px solid #ccc; padding-top: 6px;">
          <div style="flex: 1; text-align: center; font-size: 9px;">
            <div style="border-top: 1px solid #000; margin: 12px 6px 2px 6px;"></div>
            <div style="font-weight: bold; font-size: 10px;">EMMA L. MAGTAO</div>
            <div style="font-size: 8px; color: #666;">Brgy Treasurer</div>
          </div>
          <div style="flex: 1; text-align: center; font-size: 9px;">
            <div style="border-top: 1px solid #000; margin: 12px 6px 2px 6px;"></div>
            <div style="font-weight: bold; font-size: 10px;">${employee.name || employee.email}</div>
            <div style="font-size: 8px; color: #666;">Received by</div>
          </div>
        </div>
        
        <div style="margin-top: 2px; font-size: 8px; text-align: center; color: #666;">
          Status: ${employee.released ? 'RELEASED' : 'PENDING'}
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
