# -*- coding: utf-8 -*-
"""量化看板 桌面应用窗口启动器。

双击桌面「量化看板」图标 → 本脚本（pythonw，无控制台黑框）：
  1. 确保本地 Python 量化控制台（127.0.0.1:6901）在跑
  2. 确保看板 Next.js（127.0.0.1:3000）在跑，不在则后台拉起
  3. 以**应用模式(app-mode)**打开独立窗口承载看板 UI：
     用 Edge/Chrome 的 --app 参数 + 独立 user-data-dir，得到无地址栏、
     无标签栏、独立任务栏图标的"应用窗口"，而不是普通浏览器标签页。
     （pywebview/WebView2 在本机创建窗口会 hang，故不用 —— 与
       E:\\agent文件\\openbb_studio\\app_window.pyw 保持同一套做法。）

任何异常写 %TEMP%\\quant_dashboard_appwindow.log 并弹系统消息框，绝不静默失败。

命令行：
    pythonw dashboard_window.pyw            正常启动
    pythonw dashboard_window.pyw --check    只做检查/启动服务，不开窗口（自检用）
"""
import os
import subprocess
import sys
import time
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
TEMP = os.environ.get("TEMP", ".")
LOG = os.path.join(TEMP, "quant_dashboard_appwindow.log")
DEV_LOG = os.path.join(TEMP, "quant_dashboard_dev.log")

DASH_URL = "http://127.0.0.1:3000"
PY_URL = "http://127.0.0.1:6901"
# 代理可选：需要代理才能直连 TradingView 的环境设置 DASH_PROXY（如 http://127.0.0.1:7897）；
# 未设置则不传 --proxy-server，开源用户零配置可用
PROXY = os.environ.get("DASH_PROXY", "")
# 独立 profile：与日常浏览器隔离，获得独立任务栏图标、无标签栏
APP_PROFILE = os.path.join(os.environ.get("LOCALAPPDATA", "."), "QuantDashboardAppProfile")
WATCHDOG_VBS = os.path.join(
    os.environ.get("APPDATA", ""),
    r"Microsoft\Windows\Start Menu\Programs\Startup\OpenBBWatchdog.vbs",
)
WATCHDOG_PS = os.environ.get("DASH_WATCHDOG_PS", "")

BROWSERS = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    os.path.join(os.environ.get("LOCALAPPDATA", ""), "Google", "Chrome", "Application", "chrome.exe"),
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]

CHECK_ONLY = "--check" in sys.argv


def log(msg):
    try:
        with open(LOG, "a", encoding="utf-8", buffering=1) as f:
            f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')}  {msg}\n")
    except Exception:
        pass


_OPENER = None


def _opener():
    """惰性构建「不走代理」的 opener。

    urllib 默认读 HTTP_PROXY/HTTPS_PROXY 环境变量；一旦注入代理，指向
    127.0.0.1 的请求会被发给代理，而代理几乎必然黑洞回环地址 —— 探测就永远失败。
    （app_window.pyw 里有实测记录：环境带 HTTP_PROXY 时健康检查 10 次全超时。）
    """
    global _OPENER
    if _OPENER is None:
        import urllib.request
        _OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    return _OPENER


def http_ok(url, timeout=3):
    try:
        with _opener().open(url, timeout=timeout) as r:
            return 200 <= r.status < 300
    except Exception:
        return False


def port_open(port, timeout=0.6):
    import socket
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=timeout):
            return True
    except Exception:
        return False


def wait_port(port, seconds=90):
    t0 = time.time()
    while time.time() - t0 < seconds:
        if port_open(port):
            return True
        time.sleep(1)
    return False


def find_npm():
    for name in ("npm.cmd", "npm"):
        p = None
        try:
            from shutil import which
            p = which(name)
        except Exception:
            pass
        if p:
            return p
    for c in (
        r"C:\Program Files\nodejs\npm.cmd",
        os.path.join(os.environ.get("APPDATA", ""), r"npm\npm.cmd"),
        r"C:\Program Files (x86)\nodejs\npm.cmd",
    ):
        if os.path.exists(c):
            return c
    return None


def ensure_python_console():
    """确保 6901 在线；不在则拉起已有 watchdog（不重复实现守护逻辑）"""
    if http_ok(f"{PY_URL}/api/health"):
        log("Python 控制台已在线")
        return True
    log("Python 控制台未就绪，尝试拉起 watchdog")
    try:
        if os.path.exists(WATCHDOG_VBS):
            subprocess.Popen(["wscript.exe", WATCHDOG_VBS], close_fds=True)
        elif os.path.exists(WATCHDOG_PS):
            subprocess.Popen(
                ["powershell.exe", "-ExecutionPolicy", "Bypass", "-NoProfile",
                 "-WindowStyle", "Hidden", "-File", WATCHDOG_PS],
                close_fds=True,
            )
        else:
            log("找不到 watchdog，跳过")
            return False
    except Exception as e:  # noqa: BLE001
        log(f"拉起 watchdog 失败: {e}")
        return False
    if wait_port(6901, 90) and http_ok(f"{PY_URL}/api/health"):
        log("Python 控制台已就绪")
        return True
    log("Python 控制台 90 秒内未就绪")
    return False


def ensure_dashboard():
    """确保 3000 在线；不在则后台启动。

    优先用生产构建（next start）：dev 模式每次导航都要按需编译，切换明显更慢。
    只要存在 .next/BUILD_ID 就用 start，否则退回 dev。
    改了代码后跑一次 `npm run build` 即可让新构建生效。
    """
    if port_open(3000):
        log("看板已在监听 3000")
        return True
    npm = find_npm()
    if not npm:
        log("找不到 npm，无法启动看板")
        return False

    has_build = os.path.exists(os.path.join(HERE, ".next", "BUILD_ID"))
    script = "start" if has_build else "dev"
    log(f"启动看板: {npm} run {script} (cwd={HERE})")
    creationflags = 0
    if hasattr(subprocess, "CREATE_NO_WINDOW"):
        creationflags = subprocess.CREATE_NO_WINDOW
    try:
        out = open(DEV_LOG, "a", encoding="utf-8", buffering=1)
        subprocess.Popen(
            [npm, "run", script],
            cwd=HERE,
            stdout=out,
            stderr=out,
            stdin=subprocess.DEVNULL,
            creationflags=creationflags,
            close_fds=True,
        )
    except Exception as e:  # noqa: BLE001
        log(f"启动看板失败: {e}")
        return False
    ok = wait_port(3000, 120)
    log(f"看板监听 3000: {ok}（模式 {script}）")
    return ok


def pick_browser():
    for b in BROWSERS:
        if b and os.path.exists(b):
            return b
    return None


def open_app_window():
    br = pick_browser()
    if not br:
        log("找不到 Edge/Chrome，退回默认浏览器")
        os.startfile(DASH_URL)  # noqa: S606
        return
    args = [
        br,
        f"--app={DASH_URL}",
        f"--user-data-dir={APP_PROFILE}",
        "--no-first-run",
        "--no-default-browser-check",
    ]
    if PROXY:
        # 显式指定代理并排除本地回环：系统代理关掉时 TradingView 组件仍能加载；
        # 少了 bypass 里 127.0.0.1 会把本地 :3000 也送进代理，页面直接打不开。
        args += [
            f"--proxy-server={PROXY}",
            "--proxy-bypass-list=127.0.0.1;localhost;<local>",
        ]
    args += ["--window-size=1500,920"]
    log(f"打开应用窗口: {br}")
    subprocess.Popen(args, close_fds=True)


def main():
    log("===== 启动量化看板 =====")
    ensure_python_console()
    dash_ok = ensure_dashboard()

    if CHECK_ONLY:
        log("--check：跳过打开窗口")
        print(f"py_console={http_ok(f'{PY_URL}/api/health')} dashboard={dash_ok} "
              f"browser={pick_browser()}")
        return 0

    if not dash_ok and not port_open(3000):
        raise RuntimeError("看板未能在 120 秒内启动，见日志 " + DEV_LOG)
    open_app_window()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception:
        detail = traceback.format_exc()
        log("异常:\n" + detail)
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(
                0,
                f"量化看板启动失败，详见：\n{LOG}\n\n{detail[-600:]}",
                "量化看板",
                0x10,
            )
        except Exception:
            pass
        sys.exit(1)
