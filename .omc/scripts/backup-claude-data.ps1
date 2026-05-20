# Claude Code Data Backup Script
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File backup-claude-data.ps1
#        powershell -NoProfile -ExecutionPolicy Bypass -File backup-claude-data.ps1 -Restore -RestoreFrom full-YYYYMMDD-HHmmss

param(
    [switch]$Restore,
    [string]$RestoreFrom
)

$ErrorActionPreference = "Stop"
$CLAUDE_HOME = "$env:USERPROFILE\.claude"
$OMC_HOME = "$env:USERPROFILE\.omc"
$BACKUP_ROOT = "$CLAUDE_HOME\backups"
$DATE = Get-Date -Format "yyyyMMdd-HHmmss"

# Critical files: source -> relative backup path
$CRITICAL_FILES = @(
    @{Src = "$CLAUDE_HOME\.claude.json";       Rel = ".claude.json"},
    @{Src = "$CLAUDE_HOME\settings.json";       Rel = "settings.json"},
    @{Src = "$CLAUDE_HOME\settings.local.json"; Rel = "settings.local.json"},
    @{Src = "$CLAUDE_HOME\CLAUDE.md";           Rel = "CLAUDE.md"},
    @{Src = "$CLAUDE_HOME\history.jsonl";       Rel = "history.jsonl"}
)

# Critical directories
$CRITICAL_DIRS = @(
    @{Src = "$CLAUDE_HOME\agents";     Rel = "agents"},
    @{Src = "$CLAUDE_HOME\scripts";    Rel = "scripts"},
    @{Src = "$CLAUDE_HOME\hud";        Rel = "hud"},
    @{Src = "$OMC_HOME\scripts";       Rel = "omc-scripts"},
    @{Src = "$OMC_HOME\workflows";     Rel = "omc-workflows"}
)

# Find memory directories under projects/
$PROJECT_DIRS = Get-ChildItem "$CLAUDE_HOME\projects" -Directory -ErrorAction SilentlyContinue
foreach ($proj in $PROJECT_DIRS) {
    $memPath = Join-Path $proj.FullName "memory"
    if (Test-Path $memPath) {
        $CRITICAL_DIRS += @{Src = $memPath; Rel = "memory-$($proj.Name)"}
    }
}

function Backup-ClaudeData {
    $DEST = "$BACKUP_ROOT\full-$DATE"
    New-Item -ItemType Directory -Path $DEST -Force | Out-Null
    Write-Host "Backup -> $DEST" -ForegroundColor Cyan

    foreach ($f in $CRITICAL_FILES) {
        if (Test-Path $f.Src) {
            $destDir = Split-Path "$DEST\$($f.Rel)" -Parent
            if ($destDir) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
            Copy-Item $f.Src "$DEST\$($f.Rel)" -Force
            $size = (Get-Item $f.Src).Length
            Write-Host "  [OK] $($f.Rel) ($size bytes)" -ForegroundColor Green
        } else {
            Write-Host "  [--] $($f.Rel) (not found)" -ForegroundColor DarkGray
        }
    }

    foreach ($d in $CRITICAL_DIRS) {
        if (Test-Path $d.Src) {
            $destDir = "$DEST\$($d.Rel)"
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            Copy-Item "$($d.Src)\*" $destDir -Recurse -Force -ErrorAction SilentlyContinue
            $count = (Get-ChildItem $destDir -Recurse -File -ErrorAction SilentlyContinue).Count
            Write-Host "  [OK] $($d.Rel)\ ($count files)" -ForegroundColor Green
        } else {
            Write-Host "  [--] $($d.Rel)\ (not found)" -ForegroundColor DarkGray
        }
    }

    # Keep only last 10 full backups
    $oldBackups = Get-ChildItem $BACKUP_ROOT -Directory -Filter "full-*" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -Skip 10
    foreach ($old in $oldBackups) {
        Remove-Item $old.FullName -Recurse -Force
        Write-Host "  [DEL] Removed old: $($old.Name)" -ForegroundColor DarkYellow
    }

    Write-Host "Done: $DEST" -ForegroundColor Cyan
}

function Restore-ClaudeData {
    if (-not $RestoreFrom) {
        $backups = Get-ChildItem $BACKUP_ROOT -Directory -Filter "full-*" |
            Sort-Object LastWriteTime -Descending
        if (-not $backups) {
            Write-Host "ERROR: No backups found" -ForegroundColor Red
            return
        }
        $RestoreFrom = $backups[0].Name
        Write-Host "Using latest: $RestoreFrom" -ForegroundColor Yellow
    }

    $SRC = "$BACKUP_ROOT\$RestoreFrom"
    if (-not (Test-Path $SRC)) {
        Write-Host "ERROR: Backup not found: $SRC" -ForegroundColor Red
        return
    }

    Write-Host "WARNING: This will overwrite current files!" -ForegroundColor Red
    Write-Host "Restore from: $SRC" -ForegroundColor Red
    Write-Host "Confirm? (y/n)" -ForegroundColor Red
    $confirm = Read-Host
    if ($confirm -ne 'y') {
        Write-Host "Cancelled." -ForegroundColor Yellow
        return
    }

    # Restore files
    foreach ($f in $CRITICAL_FILES) {
        $srcFile = "$SRC\$($f.Rel)"
        if (Test-Path $srcFile) {
            Copy-Item $srcFile $f.Src -Force
            Write-Host "  [OK] $($f.Rel)" -ForegroundColor Green
        }
    }

    # Restore directories
    foreach ($d in $CRITICAL_DIRS) {
        $srcDir = "$SRC\$($d.Rel)"
        if (Test-Path $srcDir) {
            $destDir = Split-Path $d.Src -Parent
            if ($d.Rel -like "memory-*") {
                $projName = $d.Rel -replace "^memory-", ""
                $destDir = "$CLAUDE_HOME\projects\$projName\memory"
            } else {
                $destDir = $d.Src
            }
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
            Copy-Item "$srcDir\*" $destDir -Recurse -Force
            Write-Host "  [OK] $($d.Rel)\" -ForegroundColor Green
        }
    }

    Write-Host "Restore complete." -ForegroundColor Cyan
}

# Main
if ($Restore) {
    Restore-ClaudeData
} else {
    Backup-ClaudeData
}
