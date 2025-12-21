$file = Get-Content '..\src\lib\api-client.ts' -Raw
$file = $file -replace "'https://api\.playadoradarp\.xyz/port/25617'", "''"
Set-Content '..\src\lib\api-client.ts' -Value $file -NoNewline
Write-Host "Updated API_BASE_URL fallback"
