# Chip System — Windows PowerShell Setup Script
# Usage: powershell -ExecutionPolicy Bypass -File scripts\setup.ps1

$ErrorActionPreference = "Stop"
$RepoDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Target = if ($args[0]) { $args[0] } else { "$env:USERPROFILE\.claude" }

Write-Host "========================================"
Write-Host "  Chip System Setup"
Write-Host "  Target: $Target"
Write-Host "========================================"
Write-Host ""

# Create target directory
New-Item -ItemType Directory -Force -Path $Target | Out-Null

# Backup existing config
if (Test-Path "$Target\CLAUDE.md") {
    Copy-Item "$Target\CLAUDE.md" "$Target\CLAUDE.md.bak.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Write-Host "  [backup] Existing CLAUDE.md backed up"
}

# Copy core files
Write-Host "  [install] Core configuration..."
Copy-Item "$RepoDir\CLAUDE.md" $Target -Force
Copy-Item "$RepoDir\SOUL.md" $Target -Force
Copy-Item "$RepoDir\AGENTS.md" $Target -Force
Copy-Item "$RepoDir\USER.md" $Target -Force
Copy-Item "$RepoDir\config.json" $Target -Force

# Copy workflows
Write-Host "  [install] Workflow engine..."
New-Item -ItemType Directory -Force -Path "$Target\workflows\domains" | Out-Null
Copy-Item "$RepoDir\workflows\*.js" "$Target\workflows\" -Force
Copy-Item "$RepoDir\domains\*.js" "$Target\workflows\domains\" -Force

# Copy hooks
Write-Host "  [install] Hooks system..."
New-Item -ItemType Directory -Force -Path "$Target\hooks" | Out-Null
Copy-Item "$RepoDir\hooks\session-start" "$Target\hooks\" -Force

# Copy proxy
Write-Host "  [install] DeepSeek proxy..."
New-Item -ItemType Directory -Force -Path "$Target\bin" | Out-Null
Copy-Item "$RepoDir\bin\deepseek-proxy.js" "$Target\bin\" -Force -ErrorAction SilentlyContinue

# Memory directory
New-Item -ItemType Directory -Force -Path "$Target\projects" | Out-Null

Write-Host ""
Write-Host "========================================"
Write-Host "  Chip System installed successfully!"
Write-Host "========================================"
Write-Host ""
Write-Host "  Next steps:"
Write-Host "  1. Install skills: See skills/README.md"
Write-Host "  2. Set API key: Edit $Target\settings.json"
Write-Host "  3. Start Claude Code: claude"
Write-Host ""
