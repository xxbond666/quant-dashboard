#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""在桌面创建 / 重建「量化看板」快捷方式（含自绘图标）。

行为与已有的 OpenBB.lnk 保持一致：
    目标   = pythonw.exe（无控制台窗口）
    参数   = "<项目>\\dashboard_window.pyw"
    工作目录 = 项目根
双击 → pythonw 静默拉起「确保服务在线 → 以 Edge/Chrome 应用模式打开独立窗口」。

用途：项目目录一旦移动或被克隆到别处，快捷方式里的绝对路径就失效 —— 跑这个脚本即可重建。

依赖：
    python -m pip install --user pylnk3

背景：本机安全策略禁止 COM 实例化（WScript.Shell 被拦），无法用常规方式创建 .lnk，
      所以用 pylnk3 直接写 Shell Link 二进制格式。

图标：不用上游 logo —— 它是 750x140 的白色字标，裁切后只剩字的一块且在浅色背景上不可见。
      这里自绘「深色圆角底 + 青色上升柱」，32px 下仍可辨认。
"""
import hashlib
import os
import sys

try:
    import pylnk3
    from pylnk3 import for_file
except ImportError:
    print("缺少依赖 pylnk3。请先执行：")
    print("    python -m pip install --user pylnk3")
    sys.exit(1)

try:
    from PIL import Image, ImageDraw, ImageOps
except ImportError:
    Image = None

APP_NAME = "stock-analysis"
PROJECT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DASHBOARD_PYW = os.path.join(PROJECT, "dashboard_window.pyw")
ICON = os.path.join(PROJECT, "public", "assets", "icons", "app.ico")
DESKTOP = os.path.join(os.path.expanduser("~"), "Desktop")
LNK = os.path.join(DESKTOP, f"{APP_NAME}.lnk")
DESC = "stock-analysis 本地量化看板：确保服务在线，以应用模式打开独立窗口"

# 解释器候选：与本机 OpenBB.lnk 用一致的 Python312 pythonw
PYW_CANDIDATES = [
    os.path.join(os.environ.get("LOCALAPPDATA", ""),
                 r"Programs\Python\Python312\pythonw.exe"),
    os.path.join(os.path.dirname(sys.executable), "pythonw.exe"),
    os.path.join(os.environ.get("LOCALAPPDATA", ""),
                 r"Programs\Python\Python313\pythonw.exe"),
]


def pick_pythonw():
    for p in PYW_CANDIDATES:
        if p and os.path.exists(p):
            return p
    return None




def build_icon() -> None:
    """生成应用图标。

    图标由仓库内置 public/assets/icons/app.ico 提供（scripts/make_logo.py 可再生成）；
    它是"整个应用的图标"的来源。若源图不在，退回自绘的青色柱状图标。
    处理方式：从四角对近白像素泛洪求外轮廓 → 外部作透明，保留原图自带圆角，
    不需要猜圆角半径（方块内部的白色线稿被黑边包围，不会被误伤）。
    """
    if Image is None:
        print("  ! 未安装 Pillow，跳过图标生成（快捷方式将使用默认图标）")
        return
    if os.path.exists(ICON):
        print(f"  图标已存在: {ICON}")
        return

    os.makedirs(os.path.dirname(ICON), exist_ok=True)

    # ── 回退：自绘青色柱状图标 ──
    S = 1024
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    m = int(S * 0.04)
    d.rounded_rectangle([m, m, S - m, S - m], radius=int(S * 0.22),
                        fill=(14, 14, 17, 255), outline=(250, 250, 250, 255),
                        width=int(S * 0.035))
    heights = [0.18, 0.30, 0.42, 0.54, 0.68]
    n = len(heights)
    bar_w, gap = S * 0.085, S * 0.038
    total = n * bar_w + (n - 1) * gap
    x, base_y = (S - total) / 2, S * 0.755
    for i, h in enumerate(heights):
        top = base_y - S * h
        color = (250, 250, 250, 255) if i == n - 1 else (150, 150, 158, 255)
        d.rounded_rectangle([x, top, x + bar_w, base_y],
                            radius=int(bar_w * 0.28), fill=color)
        x += bar_w + gap
    d.line([S * 0.30, S * 0.30, S * 0.70, S * 0.20], fill=(250, 250, 250, 190),
           width=int(S * 0.022))
    d.ellipse([S * 0.70 - S * 0.022, S * 0.20 - S * 0.022,
               S * 0.70 + S * 0.022, S * 0.20 + S * 0.022], fill=(94, 234, 212, 255))
    img.resize((256, 256), Image.LANCZOS).save(
        ICON, format="ICO", sizes=[(s, s) for s in (16, 24, 32, 48, 64, 128, 256)])
    print(f"  已生成图标（自绘回退）: {ICON}")


def main() -> int:
    print("=== 重建桌面快捷方式 ===")
    print(f"项目目录: {PROJECT}")
    build_icon()

    # 复制为内容哈希命名的副本：Explorer 按「图标路径+索引」缓存，
    # 文件名不变时换了内容也常沿用旧缓存 —— 换名即可根治"图标不更新"。
    src_icon = ICON
    used_icon = ICON
    if os.path.exists(src_icon):
        h = hashlib.md5(open(src_icon, "rb").read()).hexdigest()[:8]
        hashed = os.path.join(os.path.dirname(src_icon), f"app-{h}.ico")
        if not os.path.exists(hashed) or            hashlib.md5(open(hashed, "rb").read()).hexdigest() != hashlib.md5(open(src_icon, "rb").read()).hexdigest():
            import shutil
            shutil.copyfile(src_icon, hashed)
        used_icon = hashed
    # 清掉上一个哈希副本（保留当前的）
    for f in os.listdir(os.path.dirname(src_icon)):
        if f.startswith("app-") and f.endswith(".ico") and f != os.path.basename(hashed):
            try:
                os.remove(os.path.join(os.path.dirname(src_icon), f))
            except OSError:
                pass


    pyw = pick_pythonw()
    print("前置检查:")
    checks = [
        ("解释器 pythonw", pyw),
        ("窗口启动器", DASHBOARD_PYW),
        ("桌面", DESKTOP),
    ]
    bad = False
    for label, p in checks:
        ok = bool(p) and os.path.exists(p)
        print(f"  {'OK  ' if ok else '缺失'} {label}: {p}")
        bad = bad or not ok
    if bad:
        print("\n前置条件不满足，中止。")
        return 1

    args = f'"{DASHBOARD_PYW}"'
    if os.path.exists(LNK):
        os.remove(LNK)
        print("  已删除旧快捷方式")

    for_file(
        target_file=pyw,
        lnk_name=LNK,
        arguments=args,
        description=DESC,
        icon_file=used_icon,
        icon_index=0,
        work_dir=PROJECT,
        window_mode=pylnk3.WINDOW_NORMAL,
    )
    print(f"\n已创建: {LNK}  ({os.path.getsize(LNK)} B)")

    back = pylnk3.parse(LNK)
    print("\n回读验证:")
    print(f"  目标    : {back.path}")
    print(f"  参数    : {back.arguments}")
    print(f"  工作目录: {back.work_dir}")
    print(f"  图标    : {getattr(back, 'icon', '')}")
    print("完成。双击桌面图标即以桌面应用窗口打开。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
