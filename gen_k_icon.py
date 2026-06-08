import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

from PIL import Image, ImageDraw

BIG = 1024
img = Image.new('RGBA', (BIG, BIG), (255, 255, 255, 255))
d = ImageDraw.Draw(img)

# K 左竖 — 橙色
d.rounded_rectangle([160, 80, 340, 944], radius=60, fill='#f39c12')

# K 右上叉 — 绿色（用多边形，高分渲染再缩小）
d.polygon([
    (360, 96),
    (880, 96),
    (500, 480),
    (920, 928),
    (440, 928),
    (360, 520),
], fill='#27ae60')

# K 右下叉 — 翠绿
d.polygon([
    (360, 928),
    (16, 928),
    (280, 512),
    (340, 512),
], fill='#2ecc71')

# 降采样到 256，抗锯齿
out = img.resize((256, 256), Image.LANCZOS)

# 圆角遮罩（在缩小后的图上做）
mask = Image.new('L', (256, 256), 0)
md = ImageDraw.Draw(mask)
md.rounded_rectangle([0, 0, 256, 256], radius=40, fill=255)
# 白底
final = Image.new('RGBA', (256, 256), (255, 255, 255, 255))
final.paste(out, (0, 0), mask)

final.save('assets/k-icon-preview.png')
print('Done')
