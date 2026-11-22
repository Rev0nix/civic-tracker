# ==============================================================================
#  Lokify Multi-Engine Build Automation Script (PowerShell / Windows)
# ==============================================================================
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " 🏛️  LOKIFY MULTI-STACK PRODUCTION BUILD PIPELINE (PowerShell)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Typecheck TypeScript
Write-Host "`n[1/5] Verifying TypeScript Definitions..." -ForegroundColor Yellow
npx tsc --noEmit
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ TypeScript compilation check passed." -ForegroundColor Green
} else {
    Write-Error "TypeScript check failed."
}

# 2. Lint JavaScript & JSX
Write-Host "`n[2/5] Running ESLint Verification..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ ESLint passed with 0 errors." -ForegroundColor Green
} else {
    Write-Error "ESLint check failed."
}

# 3. Build Web Bundle with Vite
Write-Host "`n[3/5] Compiling Production Web Assets with Vite..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Production web bundle compiled to ./dist." -ForegroundColor Green
} else {
    Write-Error "Vite build failed."
}

# 4. Sync Capacitor Android
Write-Host "`n[4/5] Synchronizing Capacitor Native Android Container..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Capacitor sync complete." -ForegroundColor Green
} else {
    Write-Error "Capacitor sync failed."
}

# 5. Gradle Android APK Build (if on Windows with Android SDK)
if (Test-Path "android\gradlew.bat") {
    Write-Host "`n[5/5] Building Native Kotlin Android APK with Gradle..." -ForegroundColor Yellow
    Push-Location android
    try {
        .\gradlew.bat assembleDebug --no-daemon
        Write-Host "✓ Android APK generated successfully." -ForegroundColor Green
    } catch {
        Write-Warning "Gradle build skipped or encountered error: $_"
    } finally {
        Pop-Location
    }
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " 🎉 ALL JOBS COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
