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

  return `
    <div class="payslip" style="
      width: 100%;
      height: 100%;
      border: 1px solid #000;
      margin: 0;
      padding: 8px;
      box-sizing: border-box;
      font-family: Arial, sans-serif;
      font-size: 9px;
      line-height: 1.2;
      page-break-inside: avoid;
      overflow: hidden;
    ">
      ${headerSettings ? `
        <div style="text-align: ${headerSettings.headerAlignment}; margin-bottom: 4px; border-bottom: 1px solid #000; padding-bottom: 2px;">
          ${headerSettings.showLogo ? `
            <div style="margin-bottom: 2px;">
              <img src="${headerSettings.logoUrl}" alt="Logo" style="height: 24px; width: auto;" onerror="this.src='/BRGY PICTURE LOG TUBOD.png'">
            </div>
          ` : ''}
          <div style="font-weight: bold; font-size: 10px; margin-bottom: 1px; line-height: 1.1;">
            ${headerSettings.schoolName}
          </div>
          <div style="font-size: 8px; color: #666; margin-bottom: 1px; line-height: 1.1;">
            ${headerSettings.schoolAddress}
          </div>
          <div style="font-size: 8px; color: #666; margin-bottom: 1px; line-height: 1.1;">
            ${headerSettings.systemName}
          </div>
          ${headerSettings.customText ? `
            <div style="font-size: 8px; color: #666; margin-bottom: 1px; line-height: 1.1;">
              ${headerSettings.customText}
            </div>
          ` : ''}
          <div style="font-weight: bold; margin-top: 1px; border-top: 1px solid #ccc; padding-top: 1px; font-size: 9px;">
            PAYSLIP
          </div>
        </div>
      ` : `
        <div style="text-align: center; font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #000; padding-bottom: 2px; font-size: 10px;">
          PAYSLIP
        </div>
      `}
      
      <div style="margin-bottom: 2px; font-size: 8px;">
        <div style="margin-bottom: 1px;">
          <strong>Staff:</strong> ${employee.name || employee.email}
        </div>
        <div style="margin-bottom: 1px;">
          <strong>Staff ID:</strong> ${employee.users_id}
        </div>
        <div style="margin-bottom: 1px;">
          <strong>Email:</strong> ${employee.email}
        </div>
        <div style="margin-bottom: 1px;">
          <strong>Department:</strong> BLGU
        </div>
        ${employee.position ? `
        <div style="margin-bottom: 1px;">
          <strong>Position:</strong> ${employee.position}
        </div>
        ` : ''}
        <div>
          <strong>Period:</strong> ${new Date(period.periodStart).toLocaleDateString()} - ${new Date(period.periodEnd).toLocaleDateString()}
        </div>
      </div>
      
      <div style="margin: 4px 0; border-top: 1px solid #ccc; padding-top: 3px;">
        ${breakdown ? `
          <div style="font-weight: bold; font-size: 9px; margin-bottom: 2px; color: #16a34a;">EARNINGS</div>
          ${(breakdown.overtimePay || 0) > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 8px;">
              <span>Additional Pay:</span>
              <span style="color: #16a34a;">₱${(breakdown.overtimePay || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          ` : ''}
          <div style="font-weight: bold; font-size: 9px; margin: 3px 0 2px 0; color: #dc2626;">DEDUCTIONS</div>
          ${breakdown.attendanceDeductionDetails && breakdown.attendanceDeductionDetails.length > 0 ? `
            <div style="margin-bottom: 2px; padding: 2px; background: #fee2e2; border-radius: 2px;">
              <div style="font-size: 7px; font-weight: bold; color: #dc2626; margin-bottom: 1px;">Attendance Deductions:</div>
              ${breakdown.attendanceDeductionDetails.map((deduction: any) => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5px; font-size: 6px; padding-left: 4px;">
                  <span style="color: #666;">${deduction.type || 'Attendance Deduction'}</span>
                  <span style="color: #dc2626; font-weight: bold;">-₱${(deduction.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              `).join('')}
              <div style="display: flex; justify-content: space-between; margin-top: 1px; padding-top: 1px; border-top: 1px solid #fecaca; font-size: 7px; font-weight: bold;">
                <span>Total:</span>
                <span style="color: #dc2626;">-₱${(breakdown.attendanceDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          ` : (breakdown.attendanceDeductions || 0) > 0 ? `
            <div style="margin-bottom: 2px; padding: 2px; background: #fee2e2; border-radius: 2px;">
              <div style="font-size: 7px; font-weight: bold; color: #dc2626; margin-bottom: 1px;">Attendance Deductions:</div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5px; font-size: 6px; padding-left: 4px;">
                <span style="color: #666;">Attendance Deduction</span>
                <span style="color: #dc2626; font-weight: bold;">-₱${(breakdown.attendanceDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 1px; padding-top: 1px; border-top: 1px solid #fecaca; font-size: 7px; font-weight: bold;">
                <span>Total:</span>
                <span style="color: #dc2626;">-₱${(breakdown.attendanceDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          ` : ''}
          ${breakdown.deductionDetails && breakdown.deductionDetails.length > 0 ? `
            <div style="margin-bottom: 2px; padding: 2px; background: #f3f4f6; border-radius: 2px;">
              <div style="font-size: 7px; font-weight: bold; color: #374151; margin-bottom: 1px;">Mandatory Deductions:</div>
              ${breakdown.deductionDetails.map((deduction: any) => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5px; font-size: 6px; padding-left: 4px;">
                  <span style="color: #666;">${deduction.type || 'Deduction'}</span>
                  <span style="color: #dc2626; font-weight: bold;">-₱${(deduction.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              `).join('')}
              <div style="display: flex; justify-content: space-between; margin-top: 1px; padding-top: 1px; border-top: 1px solid #d1d5db; font-size: 7px; font-weight: bold;">
                <span>Total:</span>
                <span style="color: #dc2626;">-₱${breakdown.deductionDetails.reduce((sum: number, d: any) => sum + (d.amount || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          ` : (breakdown.nonAttendanceDeductions || 0) > 0 ? `
            <div style="margin-bottom: 2px; padding: 2px; background: #f3f4f6; border-radius: 2px;">
              <div style="font-size: 7px; font-weight: bold; color: #374151; margin-bottom: 1px;">Mandatory Deductions:</div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5px; font-size: 6px; padding-left: 4px;">
                <span style="color: #666;">Other Deductions</span>
                <span style="color: #dc2626; font-weight: bold;">-₱${(breakdown.nonAttendanceDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 1px; padding-top: 1px; border-top: 1px solid #d1d5db; font-size: 7px; font-weight: bold;">
                <span>Total:</span>
                <span style="color: #dc2626;">-₱${(breakdown.nonAttendanceDeductions || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          ` : ''}
          ${breakdown.loanDetails && breakdown.loanDetails.length > 0 ? `
            <div style="margin-bottom: 2px; padding: 2px; background: #fef3c7; border-radius: 2px;">
              <div style="font-size: 7px; font-weight: bold; color: #d97706; margin-bottom: 1px;">Loan Payments:</div>
              ${breakdown.loanDetails.map((loan: any) => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5px; font-size: 6px; padding-left: 4px;">
                  <span style="color: #666;">${loan.purpose || 'Loan Payment'}</span>
                  <span style="color: #d97706; font-weight: bold;">-₱${(loan.payment || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              `).join('')}
              <div style="display: flex; justify-content: space-between; margin-top: 1px; padding-top: 1px; border-top: 1px solid #fde68a; font-size: 7px; font-weight: bold;">
                <span>Total:</span>
                <span style="color: #d97706;">-₱${(breakdown.loanPayments || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          ` : (breakdown.loanPayments || 0) > 0 ? `
            <div style="margin-bottom: 2px; padding: 2px; background: #fef3c7; border-radius: 2px;">
              <div style="font-size: 7px; font-weight: bold; color: #d97706; margin-bottom: 1px;">Loan Payments:</div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5px; font-size: 6px; padding-left: 4px;">
                <span style="color: #666;">Loan Payment</span>
                <span style="color: #d97706; font-weight: bold;">-₱${(breakdown.loanPayments || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 1px; padding-top: 1px; border-top: 1px solid #fde68a; font-size: 7px; font-weight: bold;">
                <span>Total:</span>
                <span style="color: #d97706;">-₱${(breakdown.loanPayments || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          ` : ''}
        ` : ''}

        <div style="display: flex; justify-content: space-between; margin-top: 4px; padding-top: 3px; border-top: 2px solid #000; font-weight: bold; font-size: 10px;">
          <span>NET PAY</span>
          <span>₱${employee.totalSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div style="margin-top: 6px; display: flex; justify-content: space-around; gap: 8px; border-top: 1px solid #ccc; padding-top: 6px;">
        <div style="flex: 1; text-align: center; font-size: 7px;">
          <div style="border-top: 1px solid #000; margin: 18px 4px 2px 4px;"></div>
          <div style="font-weight: bold; font-size: 8px;">Emma L. Mactao</div>
          <div style="font-size: 7px; color: #666;">Brgy Treasurer</div>
        </div>
        <div style="flex: 1; text-align: center; font-size: 7px;">
          <div style="border-top: 1px solid #000; margin: 18px 4px 2px 4px;"></div>
          <div style="font-weight: bold; font-size: 8px;">${employee.name || employee.email}</div>
          <div style="font-size: 7px; color: #666;">Received by</div>
        </div>
      </div>
      
      <div style="margin-top: 2px; font-size: 7px; text-align: center; color: #666;">
        Status: ${employee.released ? 'RELEASED' : 'PENDING'}
      </div>
    </div>
  `
}

export function generatePayslipsHTML(
  employees: PayslipData[],
  period: { periodStart: string; periodEnd: string },
  headerSettings: HeaderSettings | null,
  employeesPerPage: number = 6
): string {
  // Group personnel into pages
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
        width: 8.4in;
        height: 12.7in;
        margin: 0;
        padding: 0.05in;
        box-sizing: border-box;
        ${pageIndex > 0 ? 'page-break-before: always;' : ''}
        clear: both;
      ">
        <div style="
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr 1fr;
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
            size: 8.5in 13in;
            margin: 0.15in;
          }
          .page {
            page-break-after: always;
            width: 8.2in;
            height: 12.7in;
          }
          .page:last-child {
            page-break-after: avoid;
          }
          .payslip {
            width: 100% !important;
            height: 100% !important;
            float: none !important;
          }
        }
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          background: white;
        }
        .page {
          width: 8.2in;
          height: 12.7in;
          margin: 0;
          padding: 0.05in;
          box-sizing: border-box;
        }
        .payslip {
          width: 100%;
          height: 100%;
          border: 1px solid #000;
          margin: 0;
          padding: 8px;
          box-sizing: border-box;
          font-family: Arial, sans-serif;
          font-size: 9px;
          line-height: 1.2;
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
