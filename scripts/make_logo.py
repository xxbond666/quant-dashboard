"""原创 logo 生成器（开源合规：替换肖像照片图标）。
设计：深色圆角方底 + 白色三蜡烛图（中烛空心）+ 上升折线，纯几何原创图形。
输出：public/assets/icons/app.ico 与 app/favicon.ico（多尺寸合一）。
"""
import os
from PIL import Image, ImageDraw

PROJ = r"E:\quant-suite\stock-analysis"
BG = (14, 14, 17, 255)          # #0e0e11 与 UI 面板同色
FG = (250, 250, 250, 255)       # 白


def draw_mark(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 圆角方底
    r = int(size * 0.22)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=BG)

    u = size / 64.0  # 设计网格 64px

    # 三根蜡烛：(x, wick_top, wick_bot, body_top, body_bot, hollow)
    candles = [
        (18, 20, 44, 28, 40, False),
        (32, 12, 40, 18, 34, True),
        (46, 16, 50, 24, 44, False),
    ]
    lw = max(1, int(2 * u))
    for x, wt, wb, bt, bb, hollow in candles:
        cx = x * u
        d.line([cx, wt * u, cx, wb * u], fill=FG, width=lw)  # 影线
        bw = 8 * u
        rect = [cx - bw / 2, bt * u, cx + bw / 2, bb * u]
        if hollow:
            d.rectangle(rect, outline=FG, width=lw)
        else:
            d.rectangle(rect, fill=FG)

    # 上升折线（穿过蜡烛上方）
    pts = [(12 * u, 30 * u), (24 * u, 22 * u), (36 * u, 26 * u), (52 * u, 10 * u)]
    d.line(pts, fill=FG, width=lw, joint="curve")
    # 折线端点箭头小三角
    d.polygon([(52 * u, 6 * u), (56 * u, 14 * u), (48 * u, 14 * u)], fill=FG)
    return img


def main():
    sizes = [16, 24, 32, 48, 64, 128, 256]
    imgs = [draw_mark(s) for s in sizes]
    out_icon = os.path.join(PROJ, "public", "assets", "icons", "app.ico")
    out_fav = os.path.join(PROJ, "app", "favicon.ico")
    imgs[-1].save(out_icon, format="ICO", sizes=[(s, s) for s in sizes], append_images=imgs[:-1])
    imgs[-1].save(out_fav, format="ICO", sizes=[(s, s) for s in sizes], append_images=imgs[:-1])
    # 预览图供目检
    prev = os.path.join(PROJ, "public", "assets", "icons", "app.icon-preview.png")
    draw_mark(256).save(prev)
    print("written:", out_icon, out_fav, prev)


if __name__ == "__main__":
    main()
