"""精确复刻 icon.svg → ICO（✓用填充多边形，保证尖头封口）"""
from PIL import Image, ImageDraw

SIZES = [16, 24, 32, 48, 64, 96, 128, 256]
OUT_ICO = r"D:\桌面文件\todo-appv2\opendesign\kanote.ico"
OUT_PNG = r"D:\桌面文件\todo-appv2\opendesign\kanote.png"

def draw_icon(size):
    s = size / 64.0
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 紫底
    r = int(15 * s)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=max(1, r),
                        fill=(99, 102, 241, 255))

    # 四格
    rr = max(1, int(5 * s))
    def cell(x, y, w, h, color):
        d.rounded_rectangle(
            [int(x * s), int(y * s), int((x + w) * s) - 1, int((y + h) * s) - 1],
            radius=rr, fill=color)

    cell(9, 9, 21, 21, (140, 138, 246, 255))
    cell(34, 9, 21, 21, (167, 165, 250, 255))
    cell(9, 34, 21, 21, (150, 148, 248, 255))
    cell(34, 34, 21, 21, (249, 115, 22, 255))

    # 竖线
    lw = max(1, int(4 * s))
    lx = int(20 * s)
    d.line([lx, int(12 * s), lx, int(50 * s)], fill=(255, 255, 255, 255), width=lw)

    # ✓ 勾 — 填充多边形，保证尖头闭合无缺口
    hw = lw / 2.0  # 半宽
    #   A(20,31-hw) → B(28,40+hw) → C(46+hw,20) → D(46-hw,20) → E(28,40-hw) → F(20,31+hw)
    pts = [
        (int((20 - 0.5) * s), int((31 - 0.5) * s)),   # A
        (int(28 * s), int((40 + 1) * s)),               # B
        (int((46 + 1.5) * s), int(20 * s)),             # C (tip)
        (int((46 - 1) * s), int((20 - 1) * s)),         # D
        (int(28 * s), int((40 - 1) * s)),               # E
        (int((20 + 1) * s), int((31 + 1) * s)),         # F
    ]
    d.polygon(pts, fill=(255, 255, 255, 255))

    # 圆角遮罩
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=max(1, r), fill=255)
    final = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    final.paste(img, (0, 0), mask)
    return final


master = draw_icon(256)
images = [master if sz == 256 else master.resize((sz, sz), Image.LANCZOS) for sz in SIZES]
images[0].save(OUT_ICO, format="ICO", sizes=[(s, s) for s in SIZES], append_images=images[1:])
master.save(OUT_PNG, format="PNG")
print("OK")
