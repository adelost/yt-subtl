from __future__ import annotations

import shutil
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "store-assets"
DOWNLOADS = Path("/mnt/c/Users/adelo/Downloads/yt-subtl-store-assets")

FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
SANS = FONT_DIR / "DejaVuSans.ttf"
BOLD = FONT_DIR / "DejaVuSans-Bold.ttf"

BG = (23, 23, 35)
BG_2 = (33, 31, 52)
SURFACE = (49, 50, 68)
SURFACE_2 = (40, 40, 58)
TEXT = (246, 247, 255)
SUBTEXT = (184, 190, 220)
MUTED = (111, 115, 145)
LINE = (82, 86, 117)
ACCENT = (180, 190, 254)
CYAN = (137, 220, 235)
YOUTUBE = (255, 20, 34)
GREEN = (166, 227, 161)
YELLOW = (249, 226, 175)


def f(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """WHAT: Loads a sized font. WHY: Keeps promo typography consistent."""
    return ImageFont.truetype(str(BOLD if bold else SANS), size)


def text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    """WHAT: Calculates text. WHY: Keeps layout from guessing glyph widths."""
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0], box[3] - box[1]


def gradient(size: tuple[int, int]) -> Image.Image:
    """WHAT: Builds a promo background. WHY: Keeps decorative artwork separate from real screenshots."""
    width, height = size
    img = Image.new("RGB", size, BG)
    pix = img.load()
    for y in range(height):
        yy = y / max(1, height - 1)
        for x in range(width):
            xx = x / max(1, width - 1)
            mix = min(1.0, 0.16 + xx * 0.12 + yy * 0.10)
            pix[x, y] = tuple(int(BG[i] * (1 - mix) + BG_2[i] * mix) for i in range(3))
    return img


def shadow_card(
    img: Image.Image,
    box: tuple[int, int, int, int],
    radius: int,
    fill: tuple[int, int, int],
    outline: tuple[int, int, int] | None = LINE,
    shadow: bool = True,
) -> None:
    """WHAT: Builds a rounded card. WHY: Keeps common promo geometry in one place."""
    if shadow:
        layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        x1, y1, x2, y2 = box
        d.rounded_rectangle((x1 + 8, y1 + 12, x2 + 8, y2 + 12), radius, fill=(0, 0, 0, 90))
        layer = layer.filter(ImageFilter.GaussianBlur(18))
        img.paste(Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB"))

    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(box, radius, fill=fill, outline=outline, width=1 if outline else 0)


def transcript_icon(size: int) -> Image.Image:
    """WHAT: Builds the legacy promo symbol. WHY: Keeps illustration scaling independent of UI rendering."""
    scale = 4
    canvas = Image.new("RGBA", (size * scale, size * scale), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)
    s = size * scale
    d.ellipse((0, 0, int(s * 0.92), int(s * 0.76)), fill=YOUTUBE)
    d.polygon(
        [
            (int(s * 0.48), int(s * 0.68)),
            (int(s * 0.38), int(s * 0.98)),
            (int(s * 0.66), int(s * 0.68)),
        ],
        fill=YOUTUBE,
    )
    for y, w in [(0.27, 0.58), (0.42, 0.72), (0.57, 0.48)]:
        d.rounded_rectangle(
            (
                int(s * 0.18),
                int(s * y),
                int(s * (0.18 + w)),
                int(s * (y + 0.055)),
            ),
            int(s * 0.02),
            fill=(255, 255, 255, 255),
        )
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def paste_icon(img: Image.Image, x: int, y: int, size: int) -> None:
    """WHAT: Maps an illustration. WHY: Keeps alpha compositing consistent."""
    icon = transcript_icon(size)
    img.paste(icon, (x, y), icon)


def wrapped_lines(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, width: int) -> list[str]:
    """WHAT: Wraps promo text. WHY: Keeps words inside the available width."""
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if text_size(draw, candidate, font)[0] <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: tuple[int, int, int],
    width: int,
    line_gap: int = 6,
    max_lines: int | None = None,
) -> int:
    """WHAT: Builds wrapped text. WHY: Keeps line placement tied to measured font height."""
    x, y = xy
    lines = wrapped_lines(draw, text, font, width)
    if max_lines is not None:
        lines = lines[:max_lines]
    for line in lines:
        draw.text((x, y), line, font=font, fill=fill)
        y += text_size(draw, line, font)[1] + line_gap
    return y


def chip(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], label: str, color: tuple[int, int, int]) -> None:
    """WHAT: Builds a promo label. WHY: Keeps promotional chips visually consistent."""
    draw.rounded_rectangle(box, 20, fill=(34, 34, 50), outline=color, width=1)
    tw, th = text_size(draw, label, f(16, True))
    x1, y1, x2, y2 = box
    draw.text((x1 + (x2 - x1 - tw) // 2, y1 + (y2 - y1 - th) // 2 - 1), label, font=f(16, True), fill=TEXT)


def video_mock(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], timeline: bool = True) -> None:
    """WHAT: Builds an illustrative video. WHY: Keeps this legacy mockup distinct from actual browser evidence."""
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, 3, fill=(12, 13, 20))
    draw.ellipse((x1 + (x2 - x1) // 2 - 32, y1 + (y2 - y1) // 2 - 32, x1 + (x2 - x1) // 2 + 32, y1 + (y2 - y1) // 2 + 32), fill=(255, 255, 255))
    if timeline:
        track_y = y2 + 26
        draw.rounded_rectangle((x1 + 18, track_y, x2 - 18, track_y + 7), 4, fill=(72, 72, 86))
        draw.rounded_rectangle((x1 + 18, track_y, x1 + int((x2 - x1) * 0.33), track_y + 7), 4, fill=YOUTUBE)


def draw_panel_detail(img: Image.Image, box: tuple[int, int, int, int]) -> None:
    """WHAT: Builds the legacy detailed mockup. WHY: Keeps artwork independent of product screenshots."""
    draw = ImageDraw.Draw(img)
    x1, y1, x2, y2 = box
    shadow_card(img, box, 16, SURFACE, LINE)
    draw = ImageDraw.Draw(img)
    draw.rectangle((x1, y1, x2, y1 + 60), fill=SURFACE)
    paste_icon(img, x1 + 22, y1 + 18, 32)
    draw.text((x1 + 58, y1 + 22), "Transcript", font=f(24, True), fill=TEXT)

    lang_y = y1 + 78
    draw.rounded_rectangle((x1 + 18, lang_y, x2 - 18, lang_y + 42), 10, fill=(34, 34, 50), outline=LINE)
    draw.text((x1 + 34, lang_y + 13), "English", font=f(15), fill=SUBTEXT)
    draw.rounded_rectangle((x2 - 144, lang_y, x2 - 18, lang_y + 42), 10, fill=ACCENT)
    draw.text((x2 - 110, lang_y + 13), "Loaded", font=f(15, True), fill=(16, 16, 24))

    search_y = y1 + 134
    draw.rounded_rectangle((x1 + 18, search_y, x2 - 18, search_y + 38), 9, fill=(22, 22, 34), outline=LINE)
    draw.text((x1 + 36, search_y + 11), "Search transcript...", font=f(14), fill=MUTED)

    rows = [
        ("00:02", "Welcome back. Today we will break down the full topic step by step."),
        ("00:18", "The important part is that you can search the transcript instantly."),
        ("00:31", "Click any timestamp to jump to that exact moment in the video."),
        ("00:48", "Copy the full transcript or only the lines that match your search."),
        ("01:04", "Save notes as plain text for research, study, and editing."),
        ("01:21", "This panel stays beside the video so you never lose your place."),
    ]
    row_y = y1 + 190
    for stamp, text in rows:
        draw.rounded_rectangle((x1 + 18, row_y, x2 - 18, row_y + 55), 8, fill=(38, 39, 58))
        draw.text((x1 + 32, row_y + 17), stamp, font=f(13), fill=CYAN)
        draw_wrapped(draw, (x1 + 86, row_y + 12), text, f(13), TEXT, x2 - x1 - 126, line_gap=2, max_lines=2)
        row_y += 64

    by = y2 - 46
    for i, label in enumerate(["Copy", "Save", "Timeline"]):
        bx = x1 + 18 + i * 84
        draw.rounded_rectangle((bx, by, bx + 76, by + 30), 7, fill=SURFACE, outline=LINE)
        draw.text((bx + 23, by + 8), label, font=f(12), fill=SUBTEXT)


def draw_panel_compact(img: Image.Image, box: tuple[int, int, int, int]) -> None:
    """WHAT: Builds a compact promo mockup. WHY: Keeps illustration geometry reusable."""
    draw = ImageDraw.Draw(img)
    x1, y1, x2, y2 = box
    shadow_card(img, box, 15, SURFACE, LINE)
    draw = ImageDraw.Draw(img)
    paste_icon(img, x1 + 20, y1 + 18, 30)
    draw.text((x1 + 58, y1 + 23), "Transcript", font=f(24, True), fill=TEXT)
    draw.line((x1, y1 + 60, x2, y1 + 60), fill=LINE, width=1)
    draw.rounded_rectangle((x1 + 20, y1 + 78, x2 - 20, y1 + 118), 9, fill=(34, 34, 50), outline=LINE)
    draw.text((x1 + 36, y1 + 91), "EN", font=f(13), fill=SUBTEXT)
    draw.rounded_rectangle((x2 - 100, y1 + 78, x2 - 20, y1 + 118), 9, fill=ACCENT)
    draw.text((x2 - 81, y1 + 91), "Loaded", font=f(12, True), fill=(16, 16, 24))
    draw.rounded_rectangle((x1 + 20, y1 + 134, x2 - 20, y1 + 172), 9, fill=(22, 22, 34), outline=LINE)
    draw.text((x1 + 36, y1 + 145), "Search transcript...", font=f(13), fill=MUTED)

    y = y1 + 194
    for stamp, widths in [
        ("00:02", [62, 78, 46]),
        ("00:18", [74, 54, 70]),
    ]:
        draw.rounded_rectangle((x1 + 20, y, x2 - 20, y + 46), 8, fill=(38, 39, 58))
        draw.text((x1 + 34, y + 15), stamp, font=f(11), fill=CYAN)
        lx = x1 + 86
        ly = y + 12
        for w in widths:
            draw.rounded_rectangle((lx, ly, lx + w, ly + 6), 3, fill=SUBTEXT if w != widths[0] else CYAN)
            ly += 12
        y += 56

    by = y2 - 42
    button_x = x1 + 20
    for label, bw in [("Copy", 43), ("Save", 43), ("Timeline", 58)]:
        bx = button_x
        draw.rounded_rectangle((bx, by, bx + bw, by + 30), 7, fill=SURFACE, outline=LINE)
        tw, th = text_size(draw, label, f(9))
        draw.text((bx + (bw - tw) // 2, by + (30 - th) // 2 - 1), label, font=f(9), fill=SUBTEXT)
        button_x += bw + 5


def render_screenshot() -> Image.Image:
    """WHAT: Builds legacy illustrative artwork. WHY: Keeps it from being mistaken for a live test receipt."""
    img = gradient((1280, 800))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((0, 0, 1280, 54), 0, fill=(18, 18, 29))
    for i, color in enumerate([(255, 95, 87), (255, 189, 46), (39, 201, 63)]):
        draw.ellipse((22 + i * 22, 21, 35 + i * 22, 34), fill=color)
    draw.rounded_rectangle((118, 14, 1245, 38), 12, fill=(39, 40, 58))
    draw.text((140, 20), "youtube.com/watch?v=lecture", font=f(14), fill=MUTED)
    draw.text((64, 78), "YouTube", font=f(24, True), fill=TEXT)

    video_mock(draw, (78, 125, 833, 545), timeline=False)
    draw.rounded_rectangle((96, 492, 803, 500), 4, fill=(70, 70, 82))
    draw.rounded_rectangle((96, 492, 326, 500), 4, fill=YOUTUBE)
    draw.text((96, 515), "0:31", font=f(16, True), fill=TEXT)
    draw.text((760, 515), "12:42", font=f(16, True), fill=TEXT)
    draw.text((64, 574), "How to learn faster with searchable transcripts", font=f(26, True), fill=TEXT)
    draw.text((64, 609), "StudyLab · 184K views · Notes, research, language learning", font=f(16), fill=SUBTEXT)
    for x, label in [(64, "Save quotes"), (254, "Review lessons"), (444, "Jump to moments")]:
        draw.rounded_rectangle((x, 650, x + 169, 707), 9, fill=SURFACE, outline=LINE)
        tw, th = text_size(draw, label, f(15, True))
        draw.text((x + (169 - tw) // 2, 650 + (57 - th) // 2 - 1), label, font=f(15, True), fill=TEXT)

    draw_panel_detail(img, (872, 92, 1218, 733))
    return img.convert("RGB")


def render_small_promo() -> Image.Image:
    """WHAT: Builds a small promo. WHY: Keeps dimensions compatible with the store artwork slot."""
    img = gradient((440, 280))
    draw = ImageDraw.Draw(img)
    paste_icon(img, 30, 34, 64)
    draw.text((104, 40), "Transcript", font=f(29, True), fill=TEXT)
    draw.text((104, 75), "Reader", font=f(29, True), fill=ACCENT)
    copy = "Search, copy and save video transcripts without leaving the player."
    draw_wrapped(draw, (30, 130), copy, f(18), SUBTEXT, 210, line_gap=4)

    shadow_card(img, (276, 43, 410, 241), 12, SURFACE_2, LINE)
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((292, 62, 394, 89), 7, fill=SURFACE, outline=LINE)
    draw.text((304, 70), "Search...", font=f(11), fill=MUTED)
    y = 112
    for stamp, widths in [("00:02", [54, 36]), ("00:14", [62, 44]), ("00:26", [56, 38]), ("00:38", [64, 46])]:
        draw.text((292, y), stamp, font=f(10), fill=CYAN)
        draw.rounded_rectangle((332, y + 2, 332 + widths[0], y + 8), 3, fill=CYAN if stamp == "00:02" else MUTED)
        draw.rounded_rectangle((332, y + 15, 332 + widths[1], y + 21), 3, fill=MUTED)
        y += 33
    return img.convert("RGB")


def render_marquee() -> Image.Image:
    """WHAT: Builds a marquee illustration. WHY: Keeps wide artwork separate from extension UI."""
    img = gradient((1400, 560))
    draw = ImageDraw.Draw(img)
    paste_icon(img, 82, 84, 70)
    draw.text((82, 190), "Read YouTube", font=f(58, True), fill=TEXT)
    draw.text((82, 260), "transcripts faster", font=f(58, True), fill=ACCENT)
    copy = "Search spoken content, copy useful lines, save notes and jump to exact moments from a clean transcript panel."
    draw_wrapped(draw, (82, 342), copy, f(27), SUBTEXT, 575, line_gap=7)
    chip(draw, (82, 454, 188, 496), "Search", CYAN)
    chip(draw, (204, 454, 300, 496), "Copy", GREEN)
    chip(draw, (316, 454, 408, 496), "Save", YELLOW)
    chip(draw, (424, 454, 612, 496), "Timestamp seek", ACCENT)

    shadow_card(img, (740, 70, 1300, 490), 22, (24, 25, 37), LINE)
    draw = ImageDraw.Draw(img)
    video_mock(draw, (770, 146, 1060, 320), timeline=False)
    draw.text((770, 354), "Better notes, faster", font=f(23, True), fill=TEXT)
    draw.text((770, 386), "Transcript panel beside the video", font=f(16), fill=SUBTEXT)
    draw.rounded_rectangle((770, 420, 1055, 430), 5, fill=(78, 78, 92))
    draw.rounded_rectangle((770, 420, 887, 430), 5, fill=YOUTUBE)
    draw.text((770, 444), "0:31", font=f(15, True), fill=TEXT)
    draw.text((1018, 444), "12:42", font=f(15, True), fill=TEXT)
    draw_panel_compact(img, (1080, 104, 1270, 448))
    return img.convert("RGB")


def render_store_icon() -> Image.Image:
    """WHAT: Builds the legacy store icon. WHY: Keeps icon export independent of screenshot capture."""
    img = Image.new("RGB", (128, 128), BG)
    icon = transcript_icon(112)
    img.paste(icon, (8, 14), icon)
    return img.convert("RGB")


def save_assets(assets: Iterable[tuple[str, Image.Image]]) -> None:
    """WHAT: Saves promo files and copies. WHY: Keeps Windows-upload assets byte-identical to local artwork."""
    OUT.mkdir(parents=True, exist_ok=True)
    DOWNLOADS.mkdir(parents=True, exist_ok=True)
    for name, img in assets:
        path = OUT / name
        img.save(path)
        shutil.copy2(path, DOWNLOADS / name)
        with Image.open(path) as saved:
            if saved.mode != "RGB":
                raise RuntimeError(f"{name} is {saved.mode}, expected RGB")


def main() -> None:
    """WHAT: Builds legacy illustrations. WHY: Keeps the old asset recipe reproducible, not a visual test."""
    save_assets(
        [
            ("screenshot-1280x800.png", render_screenshot()),
            ("small-promo-440x280.png", render_small_promo()),
            ("marquee-promo-1400x560.png", render_marquee()),
            ("store-icon-128.png", render_store_icon()),
        ]
    )


if __name__ == "__main__":
    main()
