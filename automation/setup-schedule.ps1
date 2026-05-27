#Requires -Version 5.1
<#
.SYNOPSIS
    配置 Windows 任务计划程序 — GlobalPulse 每日两次自动更新
.DESCRIPTION
    创建两个定时任务：
    - GlobalPulse-AM : 每天 08:00 运行
    - GlobalPulse-PM : 每天 18:00 运行
.NOTES
    需要管理员权限（因为涉及 schtasks /create）
    用法： powershell -ExecutionPolicy Bypass -File setup-schedule.ps1
#>

$ErrorActionPreference = "Stop"

$ScriptPath = Join-Path $PSScriptRoot "auto-push.ps1"
$LogDir     = "D:\Mindd\Work\news-briefing\logs"

if (-not (Test-Path $ScriptPath)) {
    Write-Error "auto-push.ps1 not found at $ScriptPath"
}

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

# 用 schtasks 创建（兼容 Windows 自带，不依赖额外模块）
$tasks = @(
    @{ Name = "GlobalPulse-AM"; Time = "08:00"; Desc = "GlobalPulse morning news update" }
    @{ Name = "GlobalPulse-PM"; Time = "18:00"; Desc = "GlobalPulse evening news update" }
)

foreach ($t in $tasks) {
    # 删除旧任务（如果存在）
    schtasks /Delete /TN $t.Name /F 2>$null | Out-Null

    $cmd = "powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$ScriptPath`""

    schtasks /Create `
        /TN $t.Name `
        /TR $cmd `
        /SC DAILY `
        /ST $t.Time `
        /RL HIGHEST `
        /F 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Task '$($t.Name)' created — runs daily at $($t.Time)" -ForegroundColor Green
    } else {
        Write-Warning "Failed to create task '$($t.Name)'. Try running as Administrator."
    }
}

Write-Host "`nDone. Check Task Scheduler (taskschd.msc) to verify." -ForegroundColor Cyan
Write-Host "To run manually: powershell -ExecutionPolicy Bypass -File `"$ScriptPath`"" -ForegroundColor Gray
