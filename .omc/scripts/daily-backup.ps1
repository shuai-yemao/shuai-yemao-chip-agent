# Daily backup wrapper - only runs once per day
# Called from SessionStart hook

$MARKER_FILE = "$env:USERPROFILE\.claude\backups\.last-daily-backup"
$today = Get-Date -Format "yyyyMMdd"

# Check if already backed up today
if (Test-Path $MARKER_FILE) {
    $lastDate = Get-Content $MARKER_FILE -Raw
    if ($lastDate.Trim() -eq $today) {
        exit 0  # Already done today
    }
}

# Run full backup
$backupScript = "$PSScriptRoot\backup-claude-data.ps1"
& $backupScript

# Mark today as done
$today | Out-File -FilePath $MARKER_FILE -Encoding ascii -NoNewline
