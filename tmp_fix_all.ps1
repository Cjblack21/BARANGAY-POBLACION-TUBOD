$f = 'src\lib\payslip-generator.ts'
$c = Get-Content $f -Raw

# 1. Fix MAGTAO -> MACTAO
$c = $c -replace 'MAGTAO', 'MACTAO'

# 2. Section labels to black
$c = $c -replace 'color: #3b82f6; margin-bottom: 3px;">Mandatory Deductions:', 'color: #000; margin-bottom: 3px;">Mandatory Deductions:'
$c = $c -replace 'color: #dc2626; margin-bottom: 3px;">Attendance Deductions:', 'color: #000; margin-bottom: 3px;">Attendance Deductions:'
$c = $c -replace 'color: #d97706; margin-bottom: 3px;">Loan Payments:', 'color: #000; margin-bottom: 3px;">Loan Payments:'
$c = $c -replace 'color: #b45309; margin-bottom: 3px;">Custom Deductions:', 'color: #000; margin-bottom: 3px;">Custom Deductions:'

# 3. Loan subtotal amount amber -> red
$c = $c -replace 'color: #d97706;">-', 'color: #dc2626;">-'
# 4. Custom subtotal amount brown -> red
$c = $c -replace 'color: #b45309;">-', 'color: #dc2626;">-'

# 5. Remove max-width: 55% from deduction rows (shouldn't be there)
$c = $c -replace '; max-width: 55%;', ''

# 6. Remove all 4 subtotal blocks (Mandatory, Attendance, Loan, Custom)
# Remove subtotal div blocks - each one looks like:
#             <div style="border-top: 1px solid #ddd; ...">
#               <div ...><span>Subtotal:</span><span ...>...</span></div>
#             </div>
$c = $c -replace '(?s)\s*<div style="border-top: 1px solid #ddd; margin-top: 3px; padding-top: 3px;">\s*<div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold;">\s*<span>Subtotal:</span>\s*<span[^>]*>-[^<]*</span>\s*</div>\s*</div>', ''

Set-Content $f $c
Write-Host "Done"
