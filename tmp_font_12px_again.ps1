$f = 'src\lib\payslip-generator.ts'
$c = Get-Content $f -Raw

# Replace every font-size: 11.5px; with font-size: 12px;
$c = $c -replace 'font-size: 11.5px;', 'font-size: 12px;'

Set-Content $f $c
Write-Host "Done setting all fonts to 12px from 11.5px"
