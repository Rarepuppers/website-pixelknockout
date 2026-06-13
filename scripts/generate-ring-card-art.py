from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "characters"
OUT.mkdir(parents=True, exist_ok=True)

TRANSPARENT = (0, 0, 0, 0)
INK = (245, 243, 255, 255)
OUTLINE = (12, 9, 30, 255)
GOLD = (255, 211, 77, 255)
BLUE = (77, 195, 255, 255)
RED = (255, 77, 109, 255)
PANEL = (29, 23, 69, 255)
SKIN = (205, 143, 101, 255)
SKIN2 = (224, 165, 118, 255)
DARK_HAIR = (35, 25, 34, 255)
BROWN_HAIR = (94, 52, 38, 255)
GREY_HAIR = (158, 164, 178, 255)
LIGHT_HAIR = (218, 184, 110, 255)

def rect(d, box, fill, outline=OUTLINE):
    d.rectangle(box, fill=fill, outline=outline)

def draw_presenter(path, hair, outfit, accent, skin, card_label):
    im = Image.new("RGBA", (128, 128), TRANSPARENT)
    d = ImageDraw.Draw(im)

    # blank round card
    rect(d, (38, 8, 90, 30), INK)
    d.rectangle((42, 12, 86, 26), fill=(255, 245, 190, 255))
    d.text((55, 13), card_label, fill=OUTLINE)

    # arms
    rect(d, (31, 30, 39, 65), skin)
    rect(d, (89, 30, 97, 65), skin)
    rect(d, (28, 26, 42, 34), skin)
    rect(d, (86, 26, 100, 34), skin)

    # legs and shoes
    rect(d, (51, 85, 61, 112), skin)
    rect(d, (67, 85, 77, 112), skin)
    rect(d, (45, 111, 62, 118), OUTLINE)
    rect(d, (66, 111, 83, 118), OUTLINE)

    # body, fully clothed arcade outfit
    rect(d, (45, 52, 83, 88), outfit)
    d.rectangle((45, 52, 83, 60), fill=accent)
    d.rectangle((48, 61, 80, 85), fill=outfit)
    d.rectangle((61, 52, 67, 88), fill=PANEL)

    # neck and head
    rect(d, (58, 45, 70, 55), skin)
    rect(d, (48, 25, 80, 51), skin)
    d.rectangle((56, 39, 60, 43), fill=OUTLINE)
    d.rectangle((68, 39, 72, 43), fill=OUTLINE)
    d.rectangle((59, 46, 69, 48), fill=RED)

    # hair silhouette
    d.rectangle((45, 20, 83, 31), fill=hair, outline=OUTLINE)
    d.rectangle((42, 29, 52, 58), fill=hair, outline=OUTLINE)
    d.rectangle((76, 29, 86, 58), fill=hair, outline=OUTLINE)
    d.rectangle((50, 18, 78, 24), fill=hair)

    # pixel shine/accent
    d.rectangle((49, 22, 54, 27), fill=accent)
    d.rectangle((72, 20, 77, 24), fill=(255, 255, 255, 115))

    im.save(path, "PNG", optimize=True)

def draw_broadcaster(path, hair, jacket, accent, skin, headset=False, bowtie=False, mic=False):
    im = Image.new("RGBA", (128, 128), TRANSPARENT)
    d = ImageDraw.Draw(im)

    # legs and shoes
    rect(d, (49, 88, 60, 113), (31, 33, 48, 255))
    rect(d, (68, 88, 79, 113), (31, 33, 48, 255))
    rect(d, (43, 112, 62, 119), OUTLINE)
    rect(d, (66, 112, 85, 119), OUTLINE)

    # suit / broadcast desk-ready body
    rect(d, (40, 52, 88, 91), jacket)
    d.polygon([(40, 52), (58, 52), (64, 72), (70, 52), (88, 52), (78, 91), (50, 91)], fill=jacket, outline=OUTLINE)
    d.rectangle((58, 53, 70, 88), fill=(235, 235, 225, 255))
    d.polygon([(58, 58), (64, 66), (70, 58), (70, 78), (64, 86), (58, 78)], fill=accent)
    if bowtie:
        d.polygon([(54, 58), (63, 53), (63, 64)], fill=accent, outline=OUTLINE)
        d.polygon([(74, 58), (65, 53), (65, 64)], fill=accent, outline=OUTLINE)
    # hands
    rect(d, (33, 62, 43, 78), skin)
    rect(d, (85, 62, 95, 78), skin)

    # head
    rect(d, (48, 24, 80, 51), skin)
    rect(d, (58, 45, 70, 55), skin)
    d.rectangle((56, 38, 60, 42), fill=OUTLINE)
    d.rectangle((68, 38, 72, 42), fill=OUTLINE)
    d.rectangle((59, 46, 69, 48), fill=RED)

    # hair
    d.rectangle((45, 19, 83, 31), fill=hair, outline=OUTLINE)
    d.rectangle((46, 28, 52, 42), fill=hair)
    d.rectangle((76, 28, 82, 42), fill=hair)
    d.rectangle((53, 17, 75, 23), fill=hair)

    if headset:
        d.arc((42, 20, 86, 56), 190, 350, fill=BLUE, width=3)
        d.rectangle((41, 36, 48, 48), fill=OUTLINE)
        d.rectangle((80, 36, 87, 48), fill=OUTLINE)
        d.line((82, 48, 93, 57), fill=BLUE, width=2)
    if mic:
        d.rectangle((89, 54, 94, 82), fill=OUTLINE)
        d.rectangle((84, 50, 99, 58), fill=GOLD, outline=OUTLINE)
        d.line((92, 82, 102, 94), fill=OUTLINE, width=3)

    im.save(path, "PNG", optimize=True)

def draw_referee(path, hair, accent, skin, build="medium", beard=False):
    im = Image.new("RGBA", (128, 128), TRANSPARENT)
    d = ImageDraw.Draw(im)
    wide = build == "large"
    slim = build == "slim"
    body = (38, 52, 90, 91) if wide else (42, 52, 86, 91) if slim else (40, 52, 88, 91)

    # shoes / pants
    rect(d, (48, 88, 60, 114), (28, 29, 36, 255))
    rect(d, (68, 88, 80, 114), (28, 29, 36, 255))
    rect(d, (42, 113, 61, 120), OUTLINE)
    rect(d, (67, 113, 86, 120), OUTLINE)

    # ref shirt
    rect(d, body, (16, 18, 24, 255))
    d.rectangle((body[0] + 4, 56, body[2] - 4, 64), fill=accent)
    d.rectangle((61, 53, 67, 91), fill=(235, 235, 225, 255))
    d.rectangle((56, 65, 72, 73), fill=(235, 235, 225, 255))
    d.rectangle((58, 75, 70, 83), fill=(235, 235, 225, 255))
    d.rectangle((72, 57, 81, 66), fill=(48, 52, 64, 255), outline=OUTLINE)

    # arms: one raised / one signaling
    rect(d, (30, 42, 40, 72), skin)
    rect(d, (88, 61, 98, 78), skin)
    rect(d, (24, 34, 40, 44), skin)
    rect(d, (97, 64, 108, 72), skin)

    # head
    rect(d, (48, 24, 80, 51), skin)
    rect(d, (58, 45, 70, 55), skin)
    d.rectangle((56, 38, 60, 42), fill=OUTLINE)
    d.rectangle((68, 38, 72, 42), fill=OUTLINE)
    if beard:
      d.rectangle((55, 44, 73, 51), fill=(48, 32, 28, 255))
      d.rectangle((60, 46, 68, 48), fill=RED)
    else:
      d.rectangle((59, 46, 69, 48), fill=RED)

    # hair
    d.rectangle((45, 19, 83, 31), fill=hair, outline=OUTLINE)
    d.rectangle((46, 28, 52, 39), fill=hair)
    d.rectangle((76, 28, 82, 39), fill=hair)
    d.rectangle((53, 17, 75, 23), fill=hair)

    # whistle
    d.rectangle((84, 49, 93, 55), fill=GOLD, outline=OUTLINE)
    d.line((80, 48, 88, 51), fill=GOLD, width=2)

    im.save(path, "PNG", optimize=True)

draw_presenter(OUT / "arianny-celeste.png", DARK_HAIR, (177, 38, 52, 255), GOLD, SKIN2, "1")
draw_presenter(OUT / "brittney-palmer.png", BROWN_HAIR, (54, 62, 145, 255), BLUE, SKIN, "2")
draw_presenter(OUT / "luciana-andrade.png", DARK_HAIR, (77, 132, 85, 255), GOLD, SKIN, "3")
draw_presenter(OUT / "carly-baker.png", LIGHT_HAIR, (125, 66, 158, 255), BLUE, SKIN2, "4")
draw_presenter(OUT / "generic-ring-card-host.png", (120, 65, 28, 255), (63, 156, 112, 255), GOLD, SKIN2, "PK")

draw_broadcaster(OUT / "bruce-buffer.png", GREY_HAIR, (26, 29, 54, 255), GOLD, SKIN2, bowtie=True, mic=True)
draw_broadcaster(OUT / "joe-rogan.png", (40, 35, 35, 255), (48, 48, 58, 255), RED, SKIN, headset=True)
draw_broadcaster(OUT / "mike-goldberg.png", BROWN_HAIR, (32, 52, 93, 255), BLUE, SKIN2, headset=True)
draw_broadcaster(OUT / "jon-anik.png", DARK_HAIR, (34, 38, 64, 255), GOLD, SKIN2, headset=True)
draw_broadcaster(OUT / "dana-white.png", (220, 220, 220, 255), (24, 25, 34, 255), RED, SKIN2, mic=True)
draw_broadcaster(OUT / "scott-coker.png", GREY_HAIR, (35, 44, 74, 255), BLUE, SKIN, mic=True)
draw_broadcaster(OUT / "nina-drama.png", DARK_HAIR, (92, 42, 128, 255), GOLD, SKIN2, headset=True)
draw_broadcaster(OUT / "ariel-helwani.png", DARK_HAIR, (42, 55, 70, 255), BLUE, SKIN, headset=True, mic=True)

draw_referee(OUT / "herb-dean.png", DARK_HAIR, GOLD, SKIN, build="medium", beard=True)
draw_referee(OUT / "marc-goddard.png", BROWN_HAIR, BLUE, SKIN2, build="large", beard=True)
draw_referee(OUT / "jason-herzog.png", (70, 48, 40, 255), RED, SKIN2, build="slim")
draw_referee(OUT / "dan-miragliotta.png", GREY_HAIR, GOLD, SKIN2, build="large")
draw_referee(OUT / "john-mccarthy.png", GREY_HAIR, BLUE, SKIN, build="large", beard=True)

print("Generated ring-card character art in", OUT)
