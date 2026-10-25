"""Grade the found photos into one family and export WebP at two widths.

Raw files live in src/assets/raw (with credits.json); output goes to public/img.
Grade: partial desaturation, crushed blacks, shadows pulled toward the club's
carbon-plum so photos from different sources read as one set.
"""
from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "src/assets/raw"
OUT = ROOT / "public/img"
OUT.mkdir(parents=True, exist_ok=True)

PHOTOS = {
    "hall": "2020-03-08-10-25-33-pc.jpg",
    "hall-rows": "2020-03-08-08-24-45-pc.jpg",
    "seat": "2020-03-08-08-21-39-pc.jpg",
    "corner": "2020-03-08-08-21-18-pc.jpg",
    "bar": "2020-03-08-10-25-45-pc.jpg",
    "pro": "lvlupexpo-2019-esports.jpg",
    "player": "coast-guard-gaming-shines-in-first-international.jpg",
    "pad": "inclusivegamelab-person-with-ps5-controller-5-cc.jpg",
    "rig": "informatique-gaming-pc.jpg",
    "case": "gaming-computer-with-bat-decals.jpg",
    "keys": "mechanical-keyboard.jpg",
    "dualsense": "playstation-dualsense-controller.jpg",
    "stage": "iskandar-investment-esports-carnival-2019.jpg",
    "lan": "winter-2004-dreamhack-lan-party.jpg",
}

SHADOW = (24, 12, 22)   # carbon-plum
HIGHLIGHT = (246, 238, 232)


def grade(im: Image.Image) -> Image.Image:
    colour = ImageEnhance.Color(im.convert("RGB")).enhance(0.55)
    colour = ImageEnhance.Contrast(colour).enhance(1.12)
    # Duotone blended with half the original colour: screens keep their glow,
    # walls and floors fall into one palette.
    mono = ImageOps.colorize(ImageOps.grayscale(colour), SHADOW, HIGHLIGHT)
    return ImageEnhance.Brightness(Image.blend(mono, colour, 0.5)).enhance(0.92)


for name, raw in PHOTOS.items():
    im = grade(Image.open(RAW / raw))
    for width in (1600, 800):
        copy = im.copy()
        copy.thumbnail((width, width * 2))
        copy.save(OUT / f"{name}-{width}.webp", "WEBP", quality=78, method=6)
    print(name, im.size)
