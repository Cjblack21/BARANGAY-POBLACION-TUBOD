$f = 'src\lib\payslip-generator.ts'
$c = Get-Content $f -Raw

# Replace every font-size: 10px; with font-size: 12px;
$c = $c -replace 'font-size: 10px;', 'font-size: 12px;'

Set-Content $f $c
Write-Host "Done setting all fonts to 12px"
