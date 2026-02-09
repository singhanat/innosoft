# stop.ps1 - Stop the Org Chart Web Server
$port = 8080

Write-Host "Looking for Org Chart server on port $port..." -ForegroundColor Yellow

# Find the process ID (PID) using the port
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1

if ($process) {
    $pidToStop = $process.OwningProcess
    $processName = (Get-Process -Id $pidToStop).ProcessName
    
    Write-Host "Found process $processName (PID: $pidToStop) using port $port." -ForegroundColor Cyan
    Write-Host "Stopping server..." -ForegroundColor White
    
    Stop-Process -Id $pidToStop -Force
    
    Write-Host "Server stopped successfully." -ForegroundColor Green
}
else {
    Write-Host "No server found running on port $port." -ForegroundColor Gray
}
