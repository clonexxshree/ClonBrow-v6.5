from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).parent
ext = root / "shree-extension"
icons = ext / "icons"
icons.mkdir(exist_ok=True)

font_path = Path(r"C:\Windows\Fonts\georgiai.ttf")
if not font_path.exists():
    font_path = Path(r"C:\Windows\Fonts\georgia.ttf")

def mark(size):
    scale = 4
    image = Image.new("RGBA", (size * scale, size * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    s = size * scale
    draw.rounded_rectangle((0, 0, s - 1, s - 1), radius=int(s * .25), fill="#1E9BF0")
    draw.rounded_rectangle((int(s * .08), int(s * .08), int(s * .92), int(s * .92)), radius=int(s * .2), outline="#52B8FA", width=max(1, int(s * .018)))
    try:
        font = ImageFont.truetype(str(font_path), int(s * .78))
    except OSError:
        font = ImageFont.load_default()
    draw.text((s * .5, s * .47), "c", font=font, fill="white", anchor="mm", stroke_width=0)
    return image.resize((size, size), Image.Resampling.LANCZOS)

for size in (16, 48, 128):
    mark(size).save(icons / f"icon{size}.png", optimize=True)
mark(128).save(ext / "store-icon-128.png", optimize=True)

scale = 2
w, h = 440 * scale, 280 * scale
tile = Image.new("RGB", (w, h), "#FAFAF7")
d = ImageDraw.Draw(tile)
d.rectangle((0, 0, w, int(9 * scale)), fill="#1E9BF0")
logo = mark(72 * scale)
tile.paste(logo, (int(42 * scale), int(44 * scale)), logo)
try:
    title = ImageFont.truetype(str(font_path), 50 * scale)
    subtitle = ImageFont.truetype(str(Path(r"C:\Windows\Fonts\georgia.ttf")), 19 * scale)
except OSError:
    title = subtitle = ImageFont.load_default()
d.text((int(42 * scale), int(139 * scale)), "clonbrow", font=title, fill="#16140E")
d.text((int(46 * scale), int(218 * scale)), "A calmer place to begin browsing.", font=subtitle, fill="#746F63")
d.rounded_rectangle((int(298 * scale), int(61 * scale), int(400 * scale), int(163 * scale)), radius=int(18 * scale), outline="#D9D5C8", width=int(2 * scale))
d.ellipse((int(326 * scale), int(89 * scale), int(372 * scale), int(135 * scale)), fill="#1E9BF0")
d.line((int(350 * scale), int(100 * scale), int(350 * scale), int(124 * scale)), fill="white", width=int(3 * scale))
d.line((int(338 * scale), int(112 * scale), int(362 * scale), int(112 * scale)), fill="white", width=int(3 * scale))
tile.resize((440, 280), Image.Resampling.LANCZOS).save(root / "chrome-store-promo-440x280.png", optimize=True)
