$f = 'src\lib\payslip-generator.ts'
$c = Get-Content $f -Raw

# Replace every font-size with 10px
$c = $c -replace 'font-size: \d+px;', 'font-size: 10px;'

Set-Content $f $c
Write-Host "Done setting all fonts to 10px"
