# OMC Notification Sound Player
# 根据通知类型播放 Windows 系统音效
# 用法: powershell -NoProfile -File play-notification-sound.ps1 -Type <type>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("complete", "warning", "approval", "blocked", "p0_review", "pipeline_done", "info")]
    [string]$Type
)

$SoundMap = @{
    "complete"       = "$env:SystemRoot\Media\tada.wav"
    "warning"        = "$env:SystemRoot\Media\Windows Error.wav"
    "approval"       = "$env:SystemRoot\Media\Windows Exclamation.wav"
    "blocked"        = "$env:SystemRoot\Media\Windows Critical Stop.wav"
    "p0_review"      = "$env:SystemRoot\Media\Windows Critical Stop.wav"
    "pipeline_done"  = "$env:SystemRoot\Media\chimes.wav"
    "info"           = "$env:SystemRoot\Media\notify.wav"
}

$SoundFile = $SoundMap[$Type]

if (-not (Test-Path $SoundFile)) {
    # fallback to ding
    $SoundFile = "$env:SystemRoot\Media\Windows Ding.wav"
}

# Play sound asynchronously using Media.SoundPlayer
Add-Type -AssemblyName System.Windows.Forms
$player = New-Object System.Media.SoundPlayer
$player.SoundLocation = $SoundFile
$player.LoadAsync()
$player.PlaySync()
