$f = 'src\lib\payslip-generator.ts'
$c = Get-Content $f -Raw

# Scale up all font sizes by +2px for better readability in print
$c = $c -replace 'font-size: 7px;', 'font-size: 9px;'
$c = $c -replace 'font-size: 8px;', 'font-size: 10px;'
$c = $c -replace 'font-size: 9px;', 'font-size: 11px;'
$c = $c -replace 'font-size: 10px;', 'font-size: 12px;'
$c = $c -replace 'font-size: 11px;', 'font-size: 13px;'
$c = $c -replace 'font-size: 13px;', 'font-size: 15px;'
$c = $c -replace 'font-size: 14px;', 'font-size: 16px;'
$c = $c -replace 'font-size: 16px;', 'font-size: 18px;'

Set-Content $f $c
Write-Host "Done font scaling"
