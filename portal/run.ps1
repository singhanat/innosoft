$port = 3000

# Check if port is already in use
if (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue) {
    Write-Host "⚠️  Portal is already running at http://localhost:$port"
} else {
    # Start npx serve in a hidden window
    Write-Host "🚀 Starting Portal..."
    Start-Process -FilePath "npx.cmd" -ArgumentList "serve", "." -WindowStyle Hidden
    
    # Wait a moment for server to spin up
    Start-Sleep -Seconds 2
    
    Write-Host "✅ Portal started!"
    Write-Host "👉 Opening http://localhost:$port"
    
    # Open default browser
    Start-Process "http://localhost:$port"
}
