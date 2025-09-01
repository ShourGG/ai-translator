# AI Translator Cloudflare Pages Deploy Script
# PowerShell Version

Write-Host "AI Translator Cloudflare Pages Deploy Script" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 检查必要的工具
function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Check Node.js
if (-not (Test-Command "node")) {
    Write-Host "Node.js not found, please install Node.js first" -ForegroundColor Red
    Write-Host "Download: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check npm
if (-not (Test-Command "npm")) {
    Write-Host "npm not found" -ForegroundColor Red
    exit 1
}

Write-Host "Node.js and npm are installed" -ForegroundColor Green

# Install wrangler
Write-Host "Checking Wrangler CLI..." -ForegroundColor Blue
if (-not (Test-Command "wrangler")) {
    Write-Host "Installing Wrangler CLI..." -ForegroundColor Blue
    npm install -g wrangler
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Wrangler CLI installation failed" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Wrangler CLI is ready" -ForegroundColor Green

# Check login status
Write-Host "Checking Cloudflare login status..." -ForegroundColor Blue
$loginCheck = wrangler whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please login to Cloudflare account..." -ForegroundColor Yellow
    wrangler login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Cloudflare login failed" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Cloudflare account logged in" -ForegroundColor Green

# Install project dependencies
Write-Host "Installing project dependencies..." -ForegroundColor Blue
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Dependencies installation failed" -ForegroundColor Red
    exit 1
}

# Check .env file
if (-not (Test-Path ".env")) {
    Write-Host "Warning: .env file not found" -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Write-Host "Copying .env.example to .env..." -ForegroundColor Blue
        Copy-Item ".env.example" ".env"
        Write-Host "Please edit .env file and add your API keys" -ForegroundColor Yellow
        Write-Host "After editing, please run this script again" -ForegroundColor Yellow

        # Open file on Windows
        if (Test-Command "notepad") {
            $choice = Read-Host "Do you want to open .env file for editing now? (y/n)"
            if ($choice -eq "y" -or $choice -eq "Y") {
                notepad ".env"
            }
        }
        exit 0
    } else {
        Write-Host ".env.example file not found" -ForegroundColor Red
        exit 1
    }
}

Write-Host "Environment configuration file is ready" -ForegroundColor Green

# Create Pages project
Write-Host "Creating Cloudflare Pages project..." -ForegroundColor Blue
$projectName = "ai-translator"

# Check if project already exists
$existingProjects = wrangler pages project list 2>&1
if ($existingProjects -match $projectName) {
    Write-Host "Pages project already exists: $projectName" -ForegroundColor Green
} else {
    wrangler pages project create $projectName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Pages project creation failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "Pages project created successfully: $projectName" -ForegroundColor Green
}

# Set environment variables
Write-Host "Setting environment variables..." -ForegroundColor Blue
node setup-secrets.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Environment variables setup may have issues, but continuing deployment..." -ForegroundColor Yellow
}

# Deploy application
Write-Host "Deploying application to Cloudflare Pages..." -ForegroundColor Blue
npm run deploy
if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "" -ForegroundColor Green
Write-Host "Deployment successful!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Your app has been deployed to Cloudflare Pages" -ForegroundColor Green
Write-Host "The access URL will be shown above" -ForegroundColor Green
Write-Host "Monitor logs: npm run tail" -ForegroundColor Yellow
Write-Host "Local development: npm run dev" -ForegroundColor Yellow
Write-Host "" -ForegroundColor Green

# Ask if user wants to open browser
$openBrowser = Read-Host "Do you want to get the deployment URL? (y/n)"
if ($openBrowser -eq "y" -or $openBrowser -eq "Y") {
    # Get deployment URL
    Write-Host "Getting deployment info..." -ForegroundColor Blue
    wrangler pages deployment list --project-name=$projectName
}

Write-Host "Deployment completed!" -ForegroundColor Green
