$f = 'src\lib\payslip-generator.ts'
$c = Get-Content $f -Raw
$c = $c -replace 'justify-content: space-between; margin-bottom: 1px; font-size: 10px; padding-left: 6px;', 'justify-content: space-between; margin-bottom: 1px; font-size: 10px; padding-left: 6px; max-width: 55%;'
$c = $c -replace 'justify-content: space-between; font-size: 9px; padding-left: 6px; margin-bottom: 1px;', 'justify-content: space-between; font-size: 9px; padding-left: 6px; margin-bottom: 1px; max-width: 55%;'
$c = $c -replace 'justify-content: space-between; margin-bottom: 1px; font-size: 9px; padding-left: 6px;', 'justify-content: space-between; margin-bottom: 1px; font-size: 9px; padding-left: 6px; max-width: 55%;'
$c = $c -replace 'justify-content: space-between; font-size: 11px; font-weight: bold;', 'justify-content: space-between; font-size: 11px; font-weight: bold; max-width: 55%;'
$c = $c -replace 'justify-content: space-between; margin-top: 6px; padding: 6px; border-top: 1px solid #bbb; font-weight: bold; font-size: 14px; border-radius: 3px;', 'justify-content: space-between; margin-top: 6px; padding: 6px 0; border-top: 1px solid #bbb; font-weight: bold; font-size: 14px; border-radius: 3px; max-width: 55%;'
Set-Content $f $c
Write-Host "Done"
