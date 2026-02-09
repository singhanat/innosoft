# Run local server using npx http-server
Write-Host "Starting Org Chart Web Server on http://localhost:8080 ..." -ForegroundColor Cyan

# Check if npx is available
if (Get-Command npx -ErrorAction SilentlyContinue) {
    npx -y http-server -p 8080 .
} else {
    Write-Error "npx is not installed. Please install Node.js to run this script."
}
