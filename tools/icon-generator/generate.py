#!/usr/bin/env python3
"""
Generate PWA icons and the Open Graph share image for Athletics Utilities.

Outputs, relative to web/public/:
  icons/icon-192.png          192x192, track-card mark, transparent corners   (manifest, purpose=any)
  icons/icon-512.png          512x512, same as above                          (manifest, purpose=any)
  icons/icon-192-maskable.png 192x192, full-bleed track card                  (manifest, purpose=maskable)
  icons/icon-512-maskable.png 512x512, full-bleed track card                  (manifest, purpose=maskable)
  icons/apple-touch-icon.png  180x180, full-bleed track card                  (iOS home screen)
  icons/og-default.png        1200x630, branded OG / Twitter share image      (home page)
  icons/og-pace.png           1200x630, share image for the pace calculator
  icons/og-score.png          1200x630, share image for the score calculator
  icons/og-combined.png       1200x630, share image for the combined-events calculator
  icons/og-age.png            1200x630, share image for the age calculator
  icons/og-time.png           1200x630, share image for the time calculator
  icons/github-social-preview.png
                              1280x640, GitHub repo social preview card
                              (Settings → General → Social preview). Mirrors
                              og-default.png's copy at GitHub's canvas size.

These match the current site's visual language: the dark "lane" theme — near-black
panels, a hi-vis yellow accent, and the track-card brand mark from
web/public/icons/icon.svg (dark card, yellow lane bar, white lane lines).
The share cards echo the home-page hero's concentric-lane artwork.

Regenerate with:

    python tools/icon-generator/generate.py
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
OUT_DIR = REPO_ROOT / "web" / "public" / "icons"

# ── Brand-mark palette (mirrors web/public/icons/icon.svg) ──
CARD_OUTER = (14, 17, 24)       # #0E1118 — outer card
CARD_PANEL = (23, 27, 37)       # #171B25 — inner panel
CARD_BORDER = (42, 48, 64)      # #2A3040 — inner panel hairline
LANE_YELLOW = (236, 210, 74)    # #ECD24A — lane-1 bar
LANE_LINE = (237, 237, 232)     # #EDEDE8 — lane lines

# ── Share-card palette (mirrors the dark "lane" theme in theme.css) ──
OG_BG = (10, 12, 17)            # --bg     #0a0c11
OG_INK = (238, 240, 244)        # --ink    #eef0f4
OG_INK_2 = (185, 191, 202)      # --ink-2  #b9bfca
OG_MUTED = (110, 117, 133)      # --muted  #6e7585
OG_LINE = (44, 51, 64)          # --line-2 #2c3340
OG_ACCENT = (245, 213, 71)      # --accent #f5d547


def _first_existing(paths: list[str]) -> str:
    for p in paths:
        if Path(p).exists():
            return p
    raise FileNotFoundError(
        "No usable font found. Tried:\n  " + "\n  ".join(paths)
    )


# Cross-platform fonts. Segoe UI / Consolas on Windows, DejaVu on Linux (CI),
# Arial / Menlo on macOS — picked by whichever exists first.
BOLD_FONT = _first_existing([
    r"C:\Windows\Fonts\segoeuib.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
])
MONO_FONT = _first_existing([
    r"C:\Windows\Fonts\consola.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
    "/System/Library/Fonts/Menlo.ttc",
])

SS = 4  # supersampling factor — render large, downscale for clean edges


def bold_font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(BOLD_FONT, size)


def mono_font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(MONO_FONT, size)


# ============================================================
#   Brand mark — the track card
# ============================================================

def make_track_card(size: int) -> Image.Image:
    """Render the AthleticsUtils mark at `size`x`size` with transparent corners.

    A 1:1 raster of web/public/icons/icon.svg (72-unit grid): a dark rounded
    card, a hi-vis yellow lane-1 bar, and four white lane lines, all clipped
    to the inner card so nothing pokes past the rounded corners."""
    px = size * SS
    u = px / 72.0  # one SVG unit, in pixels

    img = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Outer card
    draw.rounded_rectangle(
        (0, 0, px - 1, px - 1), radius=22 * u, fill=CARD_OUTER + (255,)
    )
    # Inner panel + hairline border
    inset = 3.25 * u
    draw.rounded_rectangle(
        (inset, inset, px - inset - 1, px - inset - 1),
        radius=18 * u,
        fill=CARD_PANEL + (255,),
        outline=CARD_BORDER + (255,),
        width=max(1, round(2.5 * u)),
    )

    # Lane stripes, drawn on their own layer then clipped to the inner card
    lanes = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    ld = ImageDraw.Draw(lanes)
    ld.rectangle((4 * u, 4 * u, 14 * u, 68 * u), fill=LANE_YELLOW + (255,))
    for x in (22.88, 34.16, 45.44, 56.72):
        ld.rectangle((x * u, 4 * u, (x + 2.4) * u, 68 * u), fill=LANE_LINE + (255,))

    clip = Image.new("L", (px, px), 0)
    ImageDraw.Draw(clip).rounded_rectangle(
        (4 * u, 4 * u, 68 * u, 68 * u), radius=14 * u, fill=255
    )
    lanes.putalpha(ImageChops.darker(lanes.getchannel("A"), clip))
    img = Image.alpha_composite(img, lanes)

    return img.resize((size, size), Image.LANCZOS)


def make_maskable_icon(size: int) -> Image.Image:
    """Full-bleed track card. Android applies its own circular/squircle mask,
    so the card content sits inside the central safe zone on a solid
    background — no transparent corners to crop."""
    base = Image.new("RGBA", (size, size), CARD_OUTER + (255,))
    inner = make_track_card(round(size * 0.84))
    off = (size - inner.width) // 2
    base.alpha_composite(inner, (off, off))
    return base


def make_apple_touch_icon(size: int = 180) -> Image.Image:
    """iOS home-screen icon — the track card flattened onto a solid card-dark
    background so iOS's rounded-square mask has no transparency to deal with."""
    base = Image.new("RGBA", (size, size), CARD_OUTER + (255,))
    base.alpha_composite(make_track_card(size))
    return base


# ============================================================
#   Open Graph / Twitter share cards
# ============================================================

def _draw_lane_art(draw: ImageDraw.ImageDraw, cx: float, cy: float) -> None:
    """Concentric track-lane 'stadium' outlines sweeping in from the right,
    echoing the home-page hero. One lane is picked out in hi-vis yellow."""
    n = 6
    w0, h0 = 980 * SS, 668 * SS
    dw, dh = 128 * SS, 96 * SS  # total shrink per ring
    for i in range(n):
        w = w0 - i * dw
        h = h0 - i * dh
        x0, y0 = cx - w / 2, cy - h / 2
        highlight = i == n - 2
        draw.rounded_rectangle(
            (x0, y0, x0 + w, y0 + h),
            radius=h / 2,
            outline=OG_ACCENT if highlight else OG_LINE,
            width=(5 if highlight else 2) * SS,
        )


def _wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont,
          max_w: float) -> list[str]:
    """Greedy word-wrap `text` to `max_w` pixels."""
    lines: list[str] = []
    cur = ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if not cur or draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def make_og_image(
    title: str,
    subtitle: str,
    canvas: tuple[int, int] = (1200, 630),
) -> Image.Image:
    """Branded share card in the dark 'lane' theme.

    Defaults to 1200x630 (Open Graph / Twitter); pass canvas=(1280, 640) for
    GitHub's repo social-preview slot. All positions are anchored to the
    canvas edges or centre, so the layout scales between the two."""
    cw, ch = canvas
    width, height = cw * SS, ch * SS
    img = Image.new("RGB", (width, height), OG_BG)
    draw = ImageDraw.Draw(img)

    # Decorative track lanes, centred just off the right edge
    _draw_lane_art(draw, cx=(cw - 10) * SS, cy=(ch // 2 + 1) * SS)

    margin = 84 * SS
    max_w = (cw // 2) * SS  # keep text clear of the lane artwork

    # ── Brand row: track-card badge + wordmark ──
    badge_size = 60 * SS
    badge_y = 66 * SS
    badge = make_track_card(badge_size)
    img.paste(badge, (margin, badge_y), badge)

    label = "ATHLETICSUTILS.COM"
    label_font = mono_font(22 * SS)
    l_bbox = draw.textbbox((0, 0), label, font=label_font)
    label_x = margin + badge_size + 22 * SS
    label_y = badge_y + badge_size / 2 - (l_bbox[3] + l_bbox[1]) / 2
    draw.text((label_x, label_y), label, font=label_font, fill=OG_MUTED)

    # ── Title (auto-shrink + wrap) ──
    title_size = 78 * SS
    while title_size > 44 * SS:
        title_font = bold_font(title_size)
        title_lines = _wrap(draw, title, title_font, max_w)
        if all(draw.textlength(ln, font=title_font) <= max_w for ln in title_lines):
            break
        title_size -= 2 * SS
    title_lh = round(title_size * 1.12)

    subtitle_font = bold_font(29 * SS)
    subtitle_lines = _wrap(draw, subtitle, subtitle_font, max_w)
    subtitle_lh = round(29 * SS * 1.34)

    accent_h = 6 * SS
    gap_accent = 30 * SS
    gap_subtitle = 28 * SS
    block_h = (
        accent_h + gap_accent
        + title_lh * len(title_lines)
        + gap_subtitle
        + subtitle_lh * len(subtitle_lines)
    )

    # Centre the block in the area below the brand row
    region_top = 168 * SS
    region_bottom = height - 70 * SS
    y = region_top + (region_bottom - region_top - block_h) / 2

    # Accent rule
    draw.rectangle((margin, y, margin + 64 * SS, y + accent_h), fill=OG_ACCENT)
    y += accent_h + gap_accent

    for ln in title_lines:
        l_bbox = draw.textbbox((0, 0), ln, font=title_font)
        draw.text((margin, y - l_bbox[1]), ln, font=title_font, fill=OG_INK)
        y += title_lh
    y += gap_subtitle

    for ln in subtitle_lines:
        s_bbox = draw.textbbox((0, 0), ln, font=subtitle_font)
        draw.text((margin, y - s_bbox[1]), ln, font=subtitle_font, fill=OG_INK_2)
        y += subtitle_lh

    return img.resize((width // SS, height // SS), Image.LANCZOS)


def save(img: Image.Image, name: str) -> None:
    out = OUT_DIR / name
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG", optimize=True)
    print(f"  wrote {out.relative_to(REPO_ROOT)}  ({out.stat().st_size:,} bytes)")


def main() -> None:
    print(f"Generating icons into {OUT_DIR.relative_to(REPO_ROOT)}/")
    save(make_track_card(192), "icon-192.png")
    save(make_track_card(512), "icon-512.png")
    save(make_maskable_icon(192), "icon-192-maskable.png")
    save(make_maskable_icon(512), "icon-512-maskable.png")
    save(make_apple_touch_icon(180), "apple-touch-icon.png")

    save(
        make_og_image(
            "Athletics Utilities",
            "Five focused calculators for pace, scoring, age and time — "
            "free, fast and offline.",
        ),
        "og-default.png",
    )
    save(
        make_og_image(
            "Pace & Speed Calculator",
            "Convert between pace and speed, with splits and finish times "
            "for any distance.",
        ),
        "og-pace.png",
    )
    save(
        make_og_image(
            "World Athletics Points",
            "Score any track or field performance using the official "
            "World Athletics tables.",
        ),
        "og-score.png",
    )
    save(
        make_og_image(
            "Combined Events Score",
            "Decathlon, heptathlon and pentathlon totals from official "
            "World Athletics scoring.",
        ),
        "og-combined.png",
    )
    save(
        make_og_image(
            "Age Calculator",
            "Years, months and days between dates — including end-of-year "
            "age for athletics age groups.",
        ),
        "og-age.png",
    )
    save(
        make_og_image(
            "Time Calculator",
            "Add, subtract, multiply and divide times — with running totals "
            "and step-by-step breakdowns.",
        ),
        "og-time.png",
    )

    # GitHub repo social preview — same brand language as the OG cards, with
    # the home-page (og-default) copy rendered at GitHub's 1280x640 canvas.
    # Content stays well inside the 40pt safe border GitHub recommends.
    save(
        make_og_image(
            "Athletics Utilities",
            "Five focused calculators for pace, scoring, age and time — "
            "free, fast and offline.",
            canvas=(1280, 640),
        ),
        "github-social-preview.png",
    )
    print("Done.")


if __name__ == "__main__":
    main()
