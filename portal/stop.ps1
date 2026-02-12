$port = 3000

# Find process ID (PID) listening on the port
$tcpConnection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($tcpConnection) {
    $pidToKill = $tcpConnection.OwningProcess
    
    # Get process details for confirmation (optional, but good for logging)
    $process = Get-Process -Id $pidToKill -ErrorAction SilentlyContinue
    
    if ($process) {
        Write-Host "🛑 Stopping Portal (PID: $pidToKill)..."
        Stop-Process -Id $pidToKill -Force
        Write-Host "✅ Portal stopped."
    } else {
        Write-Host "⚠️  Port $port is in use, but process could not be found."
    }
} else {
    Write-Host "ℹ️  Portal is not running (Port $port is free)."
}
