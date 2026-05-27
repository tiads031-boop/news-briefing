#Requires -Version 5.1
<#
.SYNOPSIS
    GlobalPulse — 本地新闻更新 + 自动推送脚本
.DESCRIPTION
    1. 进入项目目录
    2. 执行 npm run update-news（抓取→分析→写入 public/）
    3. 检测 public/ 是否有变更
    4. 有变更则 git commit + push，触发 Actions 构建
    5. Telegram 通知结果（如果配置了 TELEGRAM_BOT_TOKEN）
.PARAMETER Force
    强制更新，跳过"今天已有归档则不重复运行"的防御
.NOTES
    用法： powershell -ExecutionPolicy Bypass -File auto-push.ps1
    定时： Windows 任务计划程序 → 每天 08:00 / 18:00 执行
#>

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$ProjectDir = "D:\Mindd\Work\news-briefing"
$EnvFile  = Join-Path $ProjectDir ".env"
$LogFile  = Join-Path $ProjectDir "logs\auto-push-$(Get-Date -Format 'yyyyMMdd-HHmm').log"

# ── 加载 .env ────────────────────────────────────────────────────────
function Load-Env {
    if (Test-Path $EnvFile) {
        Get-Content $EnvFile | ForEach-Object {
            if ($_ -match '^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
                $name  = $Matches[1]
                $value = $Matches[2] -replace '^["\x27]|["\x27]$'
                [Environment]::SetEnvironmentVariable($name, $value, "Process")
            }
        }
    }
}

# ── Telegram 通知 ─────────────────────────────────────────────────────
function Send-Telegram {
    param([string]$Text)
    $token = $env:TELEGRAM_BOT_TOKEN
    $chat  = $env:TELEGRAM_CHAT_ID
    if (-not $token -or -not $chat) { return }
    $body = @{ chat_id = $chat; text = $Text; parse_mode = "Markdown" }
    try {
        Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/sendMessage" -Method POST -Body $body | Out-Null
    } catch {
        Write-Warning "Telegram send failed: $($_.Exception.Message)"
    }
}

# ── 主逻辑 ────────────────────────────────────────────────────────────
Load-Env

# 创建日志目录
$logDir = Split-Path $LogFile -Parent
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

Start-Transcript -Path $LogFile -Force | Out-Null

try {
    Set-Location $ProjectDir

    # 防御：检查今天是否已有归档（避免重复运行）
    $today = (Get-Date -Format "yyyy-MM-dd")
    $todayArchive = Join-Path $ProjectDir "public\archive\$today.json"
    if ((Test-Path $todayArchive) -and -not $Force) {
        Write-Host "[SKIP] Archive for $today already exists. Use -Force to override." -ForegroundColor Yellow
        Send-Telegram "⏭️ GlobalPulse `$today`: archive already exists, skipped. Use -Force to override."
        exit 0
    }

    Write-Host "[STEP 1] npm run update-news ..." -ForegroundColor Cyan
    $proc = Start-Process -FilePath "npm" -ArgumentList "run","update-news" -NoNewWindow -Wait -PassThru
    if ($proc.ExitCode -ne 0) {
        throw "update-news failed with exit code $($proc.ExitCode)"
    }

    Write-Host "[STEP 2] Check for changes ..." -ForegroundColor Cyan
    $diff = git diff --name-only
    $untracked = git ls-files --others --exclude-standard
    $hasChanges = ($diff + $untracked) | Where-Object { $_ -match '^public/' }

    if (-not $hasChanges) {
        Write-Host "[SKIP] No changes in public/, nothing to commit." -ForegroundColor Yellow
        Send-Telegram "⚠️ GlobalPulse `$today`: update-news ran but no new content."
        exit 0
    }

    Write-Host "[STEP 3] Git commit + push ..." -ForegroundColor Cyan
    git add public/
    git commit -m "auto: $today — news update ($(Get-Date -Format 'HH:mm'))"
    git push origin main

    Write-Host "[OK] Done. Changes pushed to GitHub." -ForegroundColor Green
    Send-Telegram "✅ GlobalPulse `$today`: news updated & pushed to GitHub."

} catch {
    $msg = $_.Exception.Message
    Write-Host "[ERROR] $msg" -ForegroundColor Red
    Send-Telegram "❌ GlobalPulse `$today`: auto-push failed — ``$msg``"
    exit 1
} finally {
    Stop-Transcript | Out-Null
}
