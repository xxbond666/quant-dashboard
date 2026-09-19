<#
  停止看板的 Next.js 开发服务器（只动看板，不动 Python 控制台 —— 它由 server_watchdog 管理）。
  兼容 Windows PowerShell 5.1
#>
$ErrorActionPreference = "SilentlyContinue"

Write-Host "=== 停止量化看板 ===" -ForegroundColor Green

$killed = 0
# 1) 监听 3000 的进程（Next.js dev server）
$conns = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
foreach ($c in $conns) {
  $p = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
  if ($p) {
    Write-Host ("  结束进程 {0} ({1})" -f $p.Id, $p.ProcessName)
    Stop-Process -Id $p.Id -Force
    $killed++
  }
}

# 2) 兜底：命令行里带 next dev 的 node 进程
$nodes = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
         Where-Object { $_.CommandLine -like "*next*dev*" }
foreach ($n in $nodes) {
  Write-Host ("  结束 node {0}（next dev）" -f $n.ProcessId)
  Stop-Process -Id $n.ProcessId -Force
  $killed++
}

if ($killed -eq 0) { Write-Host "  没有发现运行中的看板进程。" -ForegroundColor Yellow }
else { Write-Host "  已停止 $killed 个进程。" -ForegroundColor Green }

Write-Host "  Python 控制台（127.0.0.1:6901）未受影响。" -ForegroundColor Gray
