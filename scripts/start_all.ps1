<#
  OpenStock 量化看板 —— 一键启动器

  做三件事：
    1) 确保本地 Python 控制台（127.0.0.1:6901）在线 —— 复用已有的 server_watchdog 守护，不重复实现
    2) 启动本看板的 Next.js（127.0.0.1:3000），日志写入 %TEMP%\quant_dashboard_dev.log
    3) 用带代理参数的 Chrome 打开看板（原生 UI 的 TradingView 组件需要代理，直连不通）

  用法：双击桌面「量化看板」快捷方式，或在命令行：
        .\scripts\start_all.ps1              正常启动
        .\scripts\start_all.ps1 -NoBrowser   只启动、不开浏览器（自检 / 无人值守）

  兼容 Windows PowerShell 5.1（不使用 && / 三元 / ?? 等 PS7 语法）
  本文件须保存为 UTF-8 with BOM —— 5.1 会按 ANSI 解析无 BOM 的中文脚本，导致解析报错。
#>
param(
  [switch]$NoBrowser
)

$ErrorActionPreference = "SilentlyContinue"
# 关掉进度条渲染：在非交互宿主里它既刷屏又拖慢请求（曾导致健康检查超时误判）
$ProgressPreference = "SilentlyContinue"

$DashboardUrl = "http://127.0.0.1:3000"
$PythonUrl    = "http://127.0.0.1:6901"
# 正常情况下由 $PSScriptRoot 推导；若脚本被以字符串方式执行导致其为空，则退回固定路径
if ($PSScriptRoot) {
  $ProjectDir = Split-Path -Parent $PSScriptRoot
} else {
  $ProjectDir = (Get-Location).Path
}
$DevLog     = Join-Path $env:TEMP "quant_dashboard_dev.log"
# 代理与 watchdog 均为可选：需要代理直连 TradingView 的环境设 DASH_PROXY；
# watchdog 路径设 DASH_WATCHDOG_PS（未设则跳过拉起，仅提示）
$Proxy      = $env:DASH_PROXY
$WdPs1      = $env:DASH_WATCHDOG_PS
$StartupVbs = Join-Path ([Environment]::GetFolderPath("Startup")) "OpenBBWatchdog.vbs"

# 端口探活：最快，且完全不走代理
function Test-Port([int]$port) {
  try {
    $c = New-Object Net.Sockets.TcpClient
    $c.Connect("127.0.0.1", $port)
    $c.Close()
    return $true
  } catch { return $false }
}

# HTTP 探活：显式把 Proxy 置空 + 6 秒超时。
# 不置空会走系统代理（ProxyEnable=1 时），虽因 ProxyOverride 含 127.* 仍能通，
# 但多一跳且首次调用易超时，曾造成"80 秒未就绪"的误报。
function Test-Http([string]$u) {
  try {
    $req = [System.Net.HttpWebRequest]::Create($u)
    $req.Proxy = $null
    $req.Timeout = 6000
    $req.Method = "GET"
    $resp = $req.GetResponse()
    $code = [int]$resp.StatusCode
    $resp.Close()
    return ($code -ge 200 -and $code -lt 300)
  } catch { return $false }
}

Write-Host "=== 量化看板启动 ===" -ForegroundColor Green

# ── 1) Python 控制台 ─────────────────────────────────────────
Write-Host "[1/3] 检查 Python 控制台 ($PythonUrl) ..."
if (Test-Http "$PythonUrl/api/health") {
  Write-Host "      已在线。" -ForegroundColor Green
} else {
  Write-Host "      未就绪，尝试拉起 watchdog ..."
  $wd = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
        Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like "*server_watchdog.ps1*" }
  if (-not $wd) {
    if (Test-Path $StartupVbs) {
      Start-Process -FilePath "wscript.exe" -ArgumentList "`"$StartupVbs`"" -WindowStyle Hidden
    } elseif (Test-Path $WdPs1) {
      Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$WdPs1`"" -WindowStyle Hidden
    } else {
      Write-Host "      找不到 server_watchdog.ps1，请手动启动控制台。" -ForegroundColor Red
    }
  }
  # 先等端口（快），再确认健康（准）
  $ready = $false
  for ($i = 0; $i -lt 60; $i++) {
    if (Test-Port 6901) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if ($ready -and (Test-Http "$PythonUrl/api/health")) {
    Write-Host "      已就绪。" -ForegroundColor Green
  } elseif ($ready) {
    Write-Host "      端口 6901 已监听，但 /api/health 未通过 —— 控制台可能仍在启动。" -ForegroundColor Yellow
  } else {
    Write-Host "      60 秒内端口未监听 —— 看板仍会启动，但数据页会显示连接失败。" -ForegroundColor Yellow
  }
}

# ── 2) Next.js 看板 ─────────────────────────────────────────
Write-Host "[2/3] 启动看板 ($DashboardUrl) ..."
if (Test-Port 3000) {
  Write-Host "      3000 端口已在监听，视为看板已启动。" -ForegroundColor Green
} else {
  $npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
  if (-not $npm) { $npm = (Get-Command npm -ErrorAction SilentlyContinue).Source }
  if (-not $npm) {
    Write-Host "      找不到 npm，请确认 Node 已安装并在 PATH 中。" -ForegroundColor Red
  } else {
    if (Test-Path $DevLog) { Remove-Item $DevLog -Force }
    # 与 dashboard_window.pyw 同一策略：有生产构建就用 next start（快、省内存），
    # 没有才退回 next dev（按需编译、仅适合改代码时使用）
    if (Test-Path (Join-Path $ProjectDir ".next\BUILD_ID")) {
      $mode = "start"
    } else {
      $mode = "dev"
    }
    Start-Process -FilePath $npm -ArgumentList "run","$mode" -WorkingDirectory $ProjectDir `
      -WindowStyle Hidden -RedirectStandardOutput $DevLog -RedirectStandardError "$DevLog.err"
    Write-Host "      已以 $mode 模式启动，日志：$DevLog"
    $up = $false
    for ($i = 0; $i -lt 60; $i++) {
      if (Test-Port 3000) { $up = $true; break }
      Start-Sleep -Seconds 2
    }
    if ($up) { Write-Host "      看板已就绪。" -ForegroundColor Green }
    else { Write-Host "      120 秒内未监听 3000，请看日志排查。" -ForegroundColor Yellow }
  }
}

# ── 3) 交给窗口启动器（单一代码路径：应用模式窗口的逻辑只在 dashboard_window.pyw 里维护）──
if ($NoBrowser) {
  Write-Host "[3/3] 已指定 -NoBrowser，跳过打开窗口。" -ForegroundColor Gray
} else {
  Write-Host "[3/3] 打开桌面应用窗口 ..."
  $pywCandidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\pythonw.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Python\Python313\pythonw.exe")
  )
  $pyw = $null
  foreach ($p in $pywCandidates) { if (Test-Path $p) { $pyw = $p; break } }
  $launcher = Join-Path $ProjectDir "dashboard_window.pyw"
  if ($pyw -and (Test-Path $launcher)) {
    Start-Process -FilePath $pyw -ArgumentList "`"$launcher`"" -WorkingDirectory $ProjectDir
    Write-Host "      已拉起应用窗口（若首次启动会新建独立 profile，稍等几秒）。" -ForegroundColor Green
  } else {
    Write-Host "      找不到 pythonw 或 dashboard_window.pyw，退回浏览器打开。" -ForegroundColor Yellow
    Start-Process $DashboardUrl
  }
}

Write-Host ""
Write-Host "看板：$DashboardUrl        Python 控制台：$PythonUrl" -ForegroundColor Gray
Write-Host "停止看板：.\scripts\stop_all.ps1" -ForegroundColor Gray
