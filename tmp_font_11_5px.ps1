$f = 'src\lib\payslip-generator.ts'
$c = Get-Content $f -Raw

# Replace every font-size: 12px; with font-size: 11.5px;
$c = $c -replace 'font-size: 12px;', 'font-size: 11.5px;'

Set-Content $f $c
Write-Host "Done setting all fonts to 11.5px"
