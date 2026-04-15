#!/usr/bin/env python3
"""
Generate PWA icons and the Open Graph share image for Athletics Utilities.

Outputs, relative to web/public/:
  icons/icon-192.png          192x192, full-bleed blue circle with white "A"   (manifest, purpose=any)
  icons/icon-512.png          512x512, same as above                             (manifest, purpose=any)
  icons/icon-192-maskable.png 192x192, solid blue square with inner "A"          (manifest, purpose=maskable)
  icons/icon-512-maskable.png 512x512, solid blue square with inner "A"          (manifest, purpose=maskable)
  icons/apple-touch-icon.png  180x180, rounded-square blue with white "A"        (iOS home screen)
  icons/og-default.png        1200x630, branded OG / Twitter share image        (home page)
  icons/og-pace.png           1200x630, share image for the pace calculator
  icons/og-score.png          1200x630, share image for the score calculator
  icons/og-combined.png       1200x630, share image for the combined-events calculator

These match the visual language of web/public/icons/favicon.svg (blue circle,
bold white "A"). Regenerate with:

    python3 tools/icon-generator/generate.py
"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
OUT_DIR = REPO_ROOT / "web" / "public" / "icons"

BRAND_BLUE = (26, 115, 232)       # --color-primary
BRAND_BLUE_DARK = (20, 90, 180)
WHITE = (255, 255, 255)

FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def load_font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(FONT_PATH, size)


def draw_letter_centered(draw: ImageDraw.ImageDraw, letter: str, box: tuple[int, int, int, int], font: ImageFont.FreeTypeFont, fill=WHITE) -> None:
    """Draw `letter` optically centered inside `box` (left, top, right, bottom)."""
    left, top, right, bottom = box
    bbox = draw.textbbox((0, 0), letter, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    cx = (left + right) / 2 - (bbox[0] + text_w / 2)
    cy = (top + bottom) / 2 - (bbox[1] + text_h / 2)
    draw.text((cx, cy), letter, font=font, fill=fill)


def make_circle_icon(size: int) -> Image.Image:
    """Blue circle on transparent background, white "A" in the middle.
    Matches favicon.svg exactly."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # 96% diameter so the circle has a 2px margin like the SVG (r=48 on 100 viewBox)
    inset = round(size * 0.02)
    draw.ellipse((inset, inset, size - inset - 1, size - inset - 1), fill=BRAND_BLUE)
    # Font size ~60% of icon like the SVG (font-size 60 on 100 viewBox)
    font = load_font(round(size * 0.62))
    draw_letter_centered(draw, "A", (0, 0, size, size), font)
    return img


def make_maskable_icon(size: int) -> Image.Image:
    """Full-bleed blue square with the "A" inside the central 80% safe zone.
    Android applies a circular/squircle mask, so everything outside the safe
    zone may be cropped. A solid background guarantees no transparent corners."""
    img = Image.new("RGBA", (size, size), BRAND_BLUE + (255,))
    draw = ImageDraw.Draw(img)
    # Safe zone = central 80%. Letter sized to ~50% of the icon so it comfortably
    # sits inside the mask regardless of the mask shape.
    font = load_font(round(size * 0.50))
    draw_letter_centered(draw, "A", (0, 0, size, size), font)
    return img


def make_apple_touch_icon(size: int = 180) -> Image.Image:
    """iOS home-screen icon. iOS auto-applies a rounded-square mask, but we
    draw a rounded square manually so it looks right on older iOS too."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = round(size * 0.22)  # ~22% corner radius — Apple superellipse-ish
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=BRAND_BLUE)
    font = load_font(round(size * 0.62))
    draw_letter_centered(draw, "A", (0, 0, size, size), font)
    return img


def make_og_image(title: str = "Athletics Utilities", subtitle_lines: list[str] | None = None) -> Image.Image:
    """1200x630 Open Graph / Twitter share card."""
    if subtitle_lines is None:
        subtitle_lines = [
            "Free calculators for pace, World",
            "Athletics points, and combined events.",
        ]
    width, height = 1200, 630
    img = Image.new("RGB", (width, height), BRAND_BLUE_DARK)
    draw = ImageDraw.Draw(img)

    # Vertical gradient from dark blue to primary blue
    for y in range(height):
        t = y / height
        r = round(BRAND_BLUE_DARK[0] * (1 - t) + BRAND_BLUE[0] * t)
        g = round(BRAND_BLUE_DARK[1] * (1 - t) + BRAND_BLUE[1] * t)
        b = round(BRAND_BLUE_DARK[2] * (1 - t) + BRAND_BLUE[2] * t)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Brand mark — circle badge on the left
    badge_size = 260
    badge_x = 80
    badge_y = (height - badge_size) // 2
    draw.ellipse(
        (badge_x, badge_y, badge_x + badge_size, badge_y + badge_size),
        fill=WHITE,
    )
    badge_font = load_font(round(badge_size * 0.62))
    draw_letter_centered(
        draw,
        "A",
        (badge_x, badge_y, badge_x + badge_size, badge_y + badge_size),
        badge_font,
        fill=BRAND_BLUE,
    )

    # Title and subtitle on the right, sized to fit the remaining width
    text_x = badge_x + badge_size + 60
    right_padding = 80
    max_text_width = width - text_x - right_padding  # ~800 px

    # Auto-shrink the title font until it fits
    title_size = 96
    while title_size > 40:
        title_font = load_font(title_size)
        t_bbox = draw.textbbox((0, 0), title, font=title_font)
        if t_bbox[2] - t_bbox[0] <= max_text_width:
            break
        title_size -= 2
    title_w = t_bbox[2] - t_bbox[0]
    title_h = t_bbox[3] - t_bbox[1]

    # Auto-shrink subtitle so the widest line also fits
    subtitle_size = 40
    while subtitle_size > 20:
        subtitle_font = load_font(subtitle_size)
        widest = max(
            draw.textbbox((0, 0), line, font=subtitle_font)[2]
            - draw.textbbox((0, 0), line, font=subtitle_font)[0]
            for line in subtitle_lines
        )
        if widest <= max_text_width:
            break
        subtitle_size -= 2
    s_bbox = draw.textbbox((0, 0), "Ag", font=subtitle_font)
    line_h = s_bbox[3] - s_bbox[1]

    total_h = title_h + 24 + line_h * len(subtitle_lines) + 8 * (len(subtitle_lines) - 1)
    start_y = (height - total_h) // 2

    draw.text((text_x, start_y - t_bbox[1]), title, font=title_font, fill=WHITE)
    y = start_y + title_h + 24
    for line in subtitle_lines:
        draw.text((text_x, y - s_bbox[1]), line, font=subtitle_font, fill=(220, 232, 252))
        y += line_h + 8

    return img


def save(img: Image.Image, name: str) -> None:
    out = OUT_DIR / name
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG", optimize=True)
    print(f"  wrote {out.relative_to(REPO_ROOT)}  ({out.stat().st_size:,} bytes)")


def main() -> None:
    print(f"Generating icons into {OUT_DIR.relative_to(REPO_ROOT)}/")
    save(make_circle_icon(192), "icon-192.png")
    save(make_circle_icon(512), "icon-512.png")
    save(make_maskable_icon(192), "icon-192-maskable.png")
    save(make_maskable_icon(512), "icon-512-maskable.png")
    save(make_apple_touch_icon(180), "apple-touch-icon.png")
    save(make_og_image(), "og-default.png")
    save(
        make_og_image(
            title="Pace & Speed Calculator",
            subtitle_lines=[
                "Convert between pace and speed, see splits",
                "and finish times for any distance.",
            ],
        ),
        "og-pace.png",
    )
    save(
        make_og_image(
            title="World Athletics Points",
            subtitle_lines=[
                "Score any track or field performance using",
                "the official 2025 World Athletics tables.",
            ],
        ),
        "og-score.png",
    )
    save(
        make_og_image(
            title="Combined Events Score",
            subtitle_lines=[
                "Decathlon, heptathlon, and pentathlon totals",
                "from official World Athletics scoring.",
            ],
        ),
        "og-combined.png",
    )
    print("Done.")


if __name__ == "__main__":
    main()
