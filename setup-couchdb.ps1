# HealthChain CouchDB Quick Setup Script
# Run this in PowerShell as Administrator

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  HealthChain CouchDB Quick Setup   " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if CouchDB is installed
Write-Host "🔍 Checking CouchDB installation..." -ForegroundColor Yellow

$couchdbPath = "C:\Program Files\Apache CouchDB\bin\couchdb.cmd"
$couchdbInstalled = Test-Path $couchdbPath

if (-not $couchdbInstalled) {
    Write-Host "❌ CouchDB not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 Please install CouchDB first:" -ForegroundColor Yellow
    Write-Host "   1. Download from: https://couchdb.apache.org/" -ForegroundColor White
    Write-Host "   2. Run installer" -ForegroundColor White
    Write-Host "   3. Set admin password: password" -ForegroundColor White
    Write-Host "   4. Run this script again" -ForegroundColor White
    Write-Host ""
    Start-Process "https://couchdb.apache.org/"
    exit
}

Write-Host "✅ CouchDB is installed" -ForegroundColor Green

# Check if CouchDB service is running
Write-Host "🔍 Checking CouchDB service..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:5984/" -UseBasicParsing -ErrorAction Stop
    $couchInfo = $response.Content | ConvertFrom-Json
    Write-Host "✅ CouchDB is running" -ForegroundColor Green
    Write-Host "   Version: $($couchInfo.version)" -ForegroundColor Gray
} catch {
    Write-Host "❌ CouchDB service is not running" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Starting CouchDB service..." -ForegroundColor Yellow
    
    try {
        Start-Service -Name "Apache CouchDB" -ErrorAction Stop
        Start-Sleep -Seconds 3
        Write-Host "✅ CouchDB service started" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to start CouchDB service" -ForegroundColor Red
        Write-Host "   Please start it manually from Services" -ForegroundColor Yellow
        exit
    }
}

# Create database
Write-Host ""
Write-Host "🔧 Setting up HealthChain database..." -ForegroundColor Yellow

$dbUrl = "http://admin:password@127.0.0.1:5984/healthchain-pro"

try {
    # Check if database exists
    $response = Invoke-WebRequest -Uri $dbUrl -Method GET -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Database already exists" -ForegroundColor Green
} catch {
    # Create database
    try {
        $response = Invoke-WebRequest -Uri $dbUrl -Method PUT -UseBasicParsing -ErrorAction Stop
        Write-Host "✅ Database created successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to create database" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Try these steps:" -ForegroundColor Yellow
        Write-Host "   1. Open Fauxton: http://127.0.0.1:5984/_utils" -ForegroundColor White
        Write-Host "   2. Login with admin:password" -ForegroundColor White
        Write-Host "   3. Create database: healthchain-pro" -ForegroundColor White
        exit
    }
}

# Enable CORS
Write-Host ""
Write-Host "🔧 Enabling CORS..." -ForegroundColor Yellow

$corsConfig = @{
    "httpd" = @{
        "enable_cors" = "true"
    }
    "cors" = @{
        "origins" = "*"
        "credentials" = "true"
        "methods" = "GET, PUT, POST, HEAD, DELETE"
        "headers" = "accept, authorization, content-type, origin, referer"
    }
}

try {
    $configUrl = "http://admin:password@127.0.0.1:5984/_node/_local/_config/cors/origins"
    Invoke-WebRequest -Uri $configUrl -Method PUT -Body '"*"' -ContentType "application/json" -UseBasicParsing -ErrorAction Stop | Out-Null
    
    $configUrl = "http://admin:password@127.0.0.1:5984/_node/_local/_config/httpd/enable_cors"
    Invoke-WebRequest -Uri $configUrl -Method PUT -Body '"true"' -ContentType "application/json" -UseBasicParsing -ErrorAction Stop | Out-Null
    
    Write-Host "✅ CORS enabled successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️ CORS configuration failed (may need manual setup)" -ForegroundColor Yellow
    Write-Host "   You can enable it in Fauxton UI" -ForegroundColor Gray
}

# Test connection
Write-Host ""
Write-Host "🧪 Testing database connection..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $dbUrl -UseBasicParsing -ErrorAction Stop
    $dbInfo = $response.Content | ConvertFrom-Json
    Write-Host "✅ Database connection successful" -ForegroundColor Green
    Write-Host "   Document count: $($dbInfo.doc_count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Database connection failed" -ForegroundColor Red
    exit
}

# Summary
Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  Setup Complete! ✅                " -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 CouchDB Information:" -ForegroundColor Yellow
Write-Host "   URL: http://127.0.0.1:5984" -ForegroundColor White
Write-Host "   Database: healthchain-pro" -ForegroundColor White
Write-Host "   Fauxton UI: http://127.0.0.1:5984/_utils" -ForegroundColor White
Write-Host "   Username: admin" -ForegroundColor White
Write-Host "   Password: password" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Start your HealthChain app" -ForegroundColor White
Write-Host "   2. Open on mobile: http://YOUR_IP:8000" -ForegroundColor White
Write-Host "   3. Open on computer: http://localhost:8000" -ForegroundColor White
Write-Host "   4. Add patient on mobile" -ForegroundColor White
Write-Host "   5. See it sync to computer automatically! ✨" -ForegroundColor White
Write-Host ""
Write-Host "📱 Find your IP address:" -ForegroundColor Yellow
Write-Host ""

# Show IP addresses
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -ne "127.0.0.1" } | Select-Object -ExpandProperty IPAddress

foreach ($ip in $ipAddresses) {
    Write-Host "   http://$($ip):8000" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "✅ Multi-device sync is now ENABLED!" -ForegroundColor Green
Write-Host ""
