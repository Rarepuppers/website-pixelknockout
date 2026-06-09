from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "ui"
OUT.mkdir(parents=True, exist_ok=True)

BG = (13, 11, 31, 255)
PANEL = (29, 23, 69, 255)
PANEL2 = (44, 33, 80, 255)
INK = (245, 243, 255, 255)
MUTED = (154, 147, 201, 255)
GOLD = (255, 211, 77, 255)
BLUE = (77, 195, 255, 255)
GREEN = (77, 255, 163, 255)
RED = (255, 77, 109, 255)
SHADOW = (5, 3, 20, 255)

def font(size, bold=False):
    names = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/consolab.ttf" if bold else "C:/Windows/Fonts/consola.ttf",
    ]
    for name in names:
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()

def pixel_text(draw, xy, text, fill, size, bold=False, anchor=None):
    draw.text(xy, text, font=font(size, bold), fill=fill, anchor=anchor)

def save_scaled(base, path, scale=4):
    img = base.resize((base.width * scale, base.height * scale), Image.Resampling.NEAREST)
    img.save(path, "PNG", optimize=True)

def center_text(draw, box, text, fill, size, bold=False):
    x1, y1, x2, y2 = box
    draw.text(((x1+x2)//2, (y1+y2)//2), text, font=font(size, bold), fill=fill, anchor="mm")

def draw_belt(draw, cx, cy, color=GOLD, plate=(255, 239, 150, 255), strap=(27, 18, 48, 255), label="PKO"):
    draw.rectangle((cx-24, cy-6, cx+24, cy+6), fill=strap, outline=GOLD)
    draw.rectangle((cx-16, cy-12, cx+16, cy+12), fill=color, outline=INK)
    draw.rectangle((cx-8, cy-8, cx+8, cy+8), fill=plate, outline=SHADOW)
    draw.rectangle((cx-34, cy-3, cx-24, cy+3), fill=color)
    draw.rectangle((cx+24, cy-3, cx+34, cy+3), fill=color)
    center_text(draw, (cx-9, cy-5, cx+9, cy+6), label, SHADOW, 5, True)

def icon_canvas(size=64):
    return Image.new("RGBA", (size, size), (0, 0, 0, 0))

def belt_icon(name, color, plate, label):
    im = icon_canvas()
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((5, 10, 59, 54), radius=4, fill=PANEL, outline=GOLD, width=2)
    draw_belt(d, 32, 31, color=color, plate=plate, label=label)
    im.save(OUT / f"{name}.png", "PNG", optimize=True)

def badge_icon(name, color, label):
    im = icon_canvas()
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((7, 7, 57, 57), radius=5, fill=PANEL, outline=color, width=3)
    d.polygon([(32, 12), (50, 22), (50, 42), (32, 52), (14, 42), (14, 22)], fill=color, outline=INK)
    d.rectangle((24, 22, 40, 38), fill=(255, 255, 255, 70), outline=SHADOW)
    center_text(d, (19, 20, 45, 41), label, SHADOW, 11, True)
    im.save(OUT / f"{name}.png", "PNG", optimize=True)

def app_icon(size):
    im = Image.new("RGBA", (size, size), BG)
    d = ImageDraw.Draw(im)
    s = size / 128
    def sc(v): return int(round(v * s))
    d.rounded_rectangle((sc(8), sc(8), sc(120), sc(120)), radius=sc(10), fill=PANEL, outline=GOLD, width=sc(4))
    d.rectangle((sc(18), sc(24), sc(110), sc(92)), outline=BLUE, width=sc(3))
    d.rectangle((sc(26), sc(32), sc(102), sc(84)), outline=RED, width=sc(2))
    draw_belt(d, sc(64), sc(76), color=GOLD, plate=(255, 244, 170, 255), label="PKO")
    center_text(d, (sc(22), sc(20), sc(106), sc(58)), "PKO", INK, sc(28), True)
    return im

for sz in (32, 192, 512):
    app_icon(sz).save(OUT / f"pko-icon-{sz}.png", "PNG", optimize=True)
app_icon(32).save(ROOT / "favicon.png", "PNG", optimize=True)

belt_icon("belt-undisputed", GOLD, (255, 244, 170, 255), "1")
belt_icon("belt-interim", (210, 218, 232, 255), (248, 250, 252, 255), "2")
belt_icon("belt-contender", (205, 127, 50, 255), (247, 180, 105, 255), "3")
belt_icon("belt-top-contender", BLUE, (185, 235, 255, 255), "4")
belt_icon("belt-ranked-contender", MUTED, (223, 218, 255, 255), "5")
belt_icon("belt-division", (255, 138, 77, 255), (255, 220, 140, 255), "DIV")

badge_icon("badge-participation", BLUE, "PKO")
badge_icon("badge-gold", GOLD, "1")
badge_icon("badge-silver", (210, 218, 232, 255), "2")
badge_icon("badge-bronze", (205, 127, 50, 255), "3")
badge_icon("badge-copper", (184, 115, 51, 255), "4")
badge_icon("badge-iron", (138, 150, 165, 255), "5")

def arena_bg(w, h, title=False):
    im = Image.new("RGBA", (w, h), BG)
    d = ImageDraw.Draw(im)
    for y in range(0, h, 12):
        col = (20, 15, 43, 255) if (y // 12) % 2 else (14, 12, 35, 255)
        d.rectangle((0, y, w, y+11), fill=col)
    d.rectangle((0, 0, w-1, h-1), outline=GOLD, width=max(2, w//200))
    # cage/grid
    for x in range(-h, w+h, 34):
        d.line((x, 0, x+h, h), fill=(77, 195, 255, 50), width=2)
        d.line((x, h, x+h, 0), fill=(255, 77, 109, 35), width=2)
    # pixel floor
    floor_y = int(h * 0.72)
    d.polygon([(0, h), (w, h), (int(w*.78), floor_y), (int(w*.22), floor_y)], fill=(24, 21, 55, 255), outline=BLUE)
    for i in range(7):
        y = floor_y + i * max(6, h//38)
        d.line((int(w*.22)-i*30, y, int(w*.78)+i*30, y), fill=(154, 147, 201, 90), width=1)
    return im

share = arena_bg(600, 320)
sd = ImageDraw.Draw(share)
sd.rectangle((22, 22, 578, 298), outline=GOLD, width=4)
sd.rectangle((34, 36, 330, 58), fill=(5, 3, 20, 180))
pixel_text(sd, (42, 52), "PKO", GOLD, 22, True)
pixel_text(sd, (112, 52), "PIXEL KNOCKOUT", MUTED, 10, True)
share.save(OUT / "share-card-bg.png", "PNG", optimize=True)

empty = arena_bg(256, 160)
ed = ImageDraw.Draw(empty)
ed.rectangle((78, 36, 178, 92), fill=PANEL, outline=GOLD, width=3)
draw_belt(ed, 128, 65, label="PKO")
ed.rectangle((58, 104, 198, 116), fill=SHADOW, outline=BLUE)
center_text(ed, (50, 118, 206, 146), "INSERT PICKS", GREEN, 13, True)
empty.save(OUT / "empty-state-arcade.png", "PNG", optimize=True)

og = arena_bg(1200, 630)
od = ImageDraw.Draw(og)
od.rectangle((44, 44, 1156, 586), outline=GOLD, width=8)
pixel_text(od, (80, 150), "PKO", GOLD, 84, True)
pixel_text(od, (82, 218), "PIXEL KNOCKOUT", INK, 38, True)
pixel_text(od, (84, 280), "Free MMA prediction game", GREEN, 34, True)
pixel_text(od, (84, 332), "Glory Points. Virtual belts. Zero cash-out.", MUTED, 28, True)
draw_belt(od, 900, 285, color=GOLD, plate=(255, 244, 170, 255), label="PKO")
draw_belt(od, 980, 360, color=BLUE, plate=(185, 235, 255, 255), label="PKO")
for i, col in enumerate([GOLD, (210,218,232,255), (205,127,50,255), BLUE, RED]):
    x = 820 + i * 58
    od.rounded_rectangle((x, 438, x+42, 480), radius=4, fill=PANEL, outline=col, width=3)
    center_text(od, (x, 438, x+42, 480), str(i+1), col, 22, True)
pixel_text(od, (84, 535), "pixelknockout.com", BLUE, 27, True)
og.save(OUT / "og-preview.png", "PNG", optimize=True)

print("Generated UI art in", OUT)
