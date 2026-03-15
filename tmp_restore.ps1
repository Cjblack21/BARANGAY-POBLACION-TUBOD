$f = 'src\lib\payslip-generator.ts'
$c = Get-Content $f -Raw

# 1. Fix stray brace in custom deductions closing
$c = $c -replace [regex]::Escape("` : ''}}"), "`` : ''}"

# 2. Section labels to black
$c = $c -replace 'color: #3b82f6; margin-bottom: 1px;">Mandatory Deductions:', 'color: #000; margin-bottom: 1px;">Mandatory Deductions:'
$c = $c -replace 'color: #dc2626; margin-bottom: 1px;">Attendance Deductions:', 'color: #000; margin-bottom: 1px;">Attendance Deductions:'
$c = $c -replace 'color: #d97706; margin-bottom: 1px;">Loan Payments:', 'color: #000; margin-bottom: 1px;">Loan Payments:'
$c = $c -replace 'color: #b45309; margin-bottom: 1px;">Custom Deductions:', 'color: #000; margin-bottom: 1px;">Custom Deductions:'

# 3. All deduction amounts to red
$c = $c -replace 'color: #d97706; font-weight: bold;', 'color: #dc2626; font-weight: bold;'
$c = $c -replace 'color: #b45309; font-weight: bold;', 'color: #dc2626; font-weight: bold;'

# 4. Subtle gray divider lines
$c = $c -replace 'border-top: 1px solid #ccc; padding-top: 4px;', 'border-top: 1px solid #e5e7eb; padding-top: 4px;'
$c = $c -replace 'border-top: 2px solid #000; border-bottom: 2px solid #000;', 'border-top: 1px solid #bbb; border-bottom: 1px solid #bbb;'
$c = $c -replace 'border-top: 2px solid #000; font-weight: bold; font-size: 14px;', 'border-top: 1px solid #bbb; font-weight: bold; font-size: 14px;'

Set-Content $f $c
Write-Host "Done"
