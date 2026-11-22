# ==============================================================================
#  Lokify Development Server Runner (PowerShell / Windows)
# ==============================================================================
[CmdletBinding()]
param()

Write-Host "Starting Lokify Local Development Server..." -ForegroundColor Cyan
npm run dev
