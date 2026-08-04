"""Derive every brand asset the site uses from the two supplied source files.

Run this instead of hand-editing anything in `src/assets/brand/` or the icon
files in `public/` — those are all outputs. When new source art arrives,
replace the files in SOURCE and re-run.

    cd frontend && python scripts/build_brand_assets.py

Three things this does that a manual export would not, each because of a
concrete defect in the supplied art:

1. **The supplied marks carry a blue bar.** Blue appears nowhere in the brand
   palette. The bar is recoloured to the brand gradient
   (`#F15A29 -> #E91673 -> #E6136C`, the `brand-gradient` token in
   tailwind.config.js), swept across the bar's own width so it reads as the
   same sweep the interface uses.

2. **The supplied icon is a JPEG with a black background baked in**, and JPEG
   cannot carry transparency. Used directly as a favicon it renders as a black
   square. The rounded square is cropped out and its corners restored to
   transparent. Its background tint is also a cool blue-white, which is
   recoloured to the brand's blush tint.

3. **The supplied wordmark is near-black**, so it disappears on the plum and
   gradient panels the site uses for emphasis. A reversed variant is derived
   for those surfaces.

Requires Pillow and numpy — both already in requirements-notebook.txt.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT.parent                      # soundbox/, where the supplied art sits
BRAND = ROOT / "src" / "assets" / "brand"
PUBLIC = ROOT / "public"

SRC_WORDMARK = SOURCE / "buffr_logo_new.jpg"
SRC_ICON = SOURCE / "buffr_icon.jpeg"

# The brand gradient, as stops. Mirrors `brand-gradient` in tailwind.config.js;
# if that changes, this changes.
STOPS = [(0.00, (0xF1, 0x5A, 0x29)),
         (0.55, (0xE9, 0x16, 0x73)),
         (1.00, (0xE6, 0x13, 0x6C))]

BLUSH_TINT = np.array([0xFD, 0xEE, 0xF2])   # `blush-tint`, the icon's new field
INK = np.array([0x23, 0x1F, 0x21])          # the letterform, kept near-neutral
PAPER = (255, 255, 255)


def ramp(t: np.ndarray) -> np.ndarray:
    """Gradient colour at each position t in [0, 1]."""
    t = np.clip(t, 0.0, 1.0)
    out = np.zeros(t.shape + (3,))
    for (p0, c0), (p1, c1) in zip(STOPS, STOPS[1:]):
        m = (t >= p0) & (t <= p1)
        if not m.any():
            continue
        f = ((t[m] - p0) / (p1 - p0))[:, None]
        out[m] = np.array(c0) * (1 - f) + np.array(c1) * f
    return out


def _blueness(a: np.ndarray) -> np.ndarray:
    """How far a pixel leans blue, past whichever of red/green is stronger."""
    return a[..., 2] - np.maximum(a[..., 0], a[..., 1])


def recolour_bar(a: np.ndarray, blue: np.ndarray | None = None) -> np.ndarray:
    """Replace the blue bar with the brand gradient, edges included.

    Anti-aliased edge pixels are blended rather than thresholded. A hard cut
    leaves a blue halo around the bar, which is the exact artefact that makes
    a recoloured logo look recoloured.

    `blue` may be supplied when the caller has already flattened the image's
    colour — the blend needs the *original* blueness to know where the bar
    was, but must composite over the flattened base, or the partial-weight
    edge pixels blend toward the blue they still carry and go lavender.
    """
    if blue is None:
        blue = _blueness(a)
    core = (blue > 60) & (a[..., 3] > 10)
    if not core.any():
        raise SystemExit("no blue bar found — has the source art changed?")

    ys, xs = np.where(core)
    x0, x1 = xs.min(), xs.max()

    # Anything leaning blue at all is part of the bar, its edge, or its glow.
    touched = (blue > 4) & (a[..., 3] > 10)
    ty, tx = np.where(touched)
    t = np.clip((tx - x0) / max(x1 - x0, 1), 0, 1)
    target = ramp(t)

    # Blend by how blue the pixel was: fully blue pixels take the gradient
    # outright, edge pixels take it in proportion, so the silhouette is kept.
    w = np.clip(blue[ty, tx] / 60.0, 0, 1)[:, None]
    # Keep the art's own shading, or the bar reads flat beside the lettering.
    lum = np.clip(blue[ty, tx] / 255.0 + 0.55, 0, 1)
    shade = (0.82 + 0.18 * lum)[:, None]
    a[ty, tx, :3] = np.clip(target * shade * w + a[ty, tx, :3] * (1 - w), 0, 255)
    return a


def build_wordmark() -> Image.Image:
    im = Image.open(SRC_WORDMARK).convert("RGBA")
    a = np.array(im).astype(int)

    # Trim the dead white margin so the mark can be sized by its own height in
    # the UI rather than by an arbitrary canvas.
    ink = a[..., :3].mean(axis=2) < 235
    ys, xs = np.where(ink)
    pad = 8
    a = a[max(ys.min() - pad, 0):ys.max() + 1 + pad,
          max(xs.min() - pad, 0):xs.max() + 1 + pad]

    # White to transparent, so the mark sits on the blush and paper panels.
    white = a[..., :3].mean(axis=2) > 243
    a[..., 3] = np.where(white, 0, 255)

    a = recolour_bar(a)
    out = Image.fromarray(a.astype(np.uint8), "RGBA")
    out.save(BRAND / "buffr-wordmark.png")

    # Reversed, for `bg-hero-*` and the plum footer. Only the lettering
    # inverts — the gradient bar is legible on light and dark alike.
    b = np.array(out).astype(int)
    letters = (b[..., 3] > 10) & (_blueness(b) < 6) & (b[..., :3].max(axis=2) < 140)
    b[letters, 0], b[letters, 1], b[letters, 2] = PAPER
    Image.fromarray(b.astype(np.uint8), "RGBA").save(BRAND / "buffr-wordmark-reversed.png")

    print(f"wordmark      {out.size}  + reversed variant")
    return out


def build_icon() -> tuple[Image.Image, np.ndarray, np.ndarray]:
    im = Image.open(SRC_ICON).convert("RGBA")
    a = np.array(im).astype(int)

    # Crop the rounded square out of the baked-in black frame.
    bright = a[..., :3].mean(axis=2) > 40
    ys, xs = np.where(bright)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

    # Where the bar is, and how bright each pixel started — both recorded
    # before any recolouring flattens the evidence. build_knockout needs the
    # originals; see its docstring for why the recoloured image will not do.
    blue = _blueness(a)
    orig_lum = a[..., :3].mean(axis=2)

    # Flatten the whole image through a two-point ramp on luminance, rather
    # than testing channel differences. The source is a JPEG, so its flat
    # areas carry compression noise in exactly those differences; thresholding
    # on them recolours the noise unevenly and streaks the field. Collapsing
    # to luminance discards the noise, and doing it everywhere — the bar
    # included — means the gradient below composites over a clean neutral base
    # instead of over residual blue.
    solid = a[..., 3] > 10
    lum = (a[solid, :3].mean(axis=1) / 255.0)[:, None]
    a[solid, :3] = np.clip(INK * (1 - lum) + BLUSH_TINT * lum, 0, 255)

    # The ramp stretches the source's JPEG block boundaries into visible
    # banding across the flat field. Blur, then keep the sharp original
    # wherever there is real structure — the letterform and the bar — so the
    # field smooths without softening an edge that is meant to be crisp.
    from PIL import ImageFilter
    blurred = np.array(
        Image.fromarray(a.astype(np.uint8), "RGBA").filter(ImageFilter.GaussianBlur(4))
    ).astype(int)
    field = (a[..., :3].mean(axis=2) > 205) & (blue <= 4)
    a[field, :3] = blurred[field, :3]

    a = recolour_bar(a, blue)

    # Residual black frame in the corners goes transparent, so the icon sits
    # on any background rather than carrying a black square with it.
    dark = a[..., :3].mean(axis=2) < 60
    try:
        from scipy.ndimage import label
        lbl, _ = label(dark)
        h, w = dark.shape
        corners = {lbl[0, 0], lbl[0, w - 1], lbl[h - 1, 0], lbl[h - 1, w - 1]} - {0}
        a[..., 3] = np.where(np.isin(lbl, list(corners)), 0, a[..., 3])
    except ImportError:
        print("  (scipy absent — corner black not removed)", file=sys.stderr)

    out = Image.fromarray(a.astype(np.uint8), "RGBA")
    out.save(BRAND / "buffr-icon.png")
    print(f"icon          {out.size}")
    return out, orig_lum, blue


def build_knockout(orig_lum: np.ndarray, blue: np.ndarray) -> None:
    """A white silhouette of the mark, with the rounded-square field dropped.

    The full icon is a light tile with a dark letter, which is right for a
    favicon and an avatar but wrong laid over the gradient hero panels — it
    reads as a pale rectangle rather than a mark. Those surfaces need the
    letterform alone, in white, at low opacity.

    Derived from the *original* pixels rather than the recoloured icon. After
    recolouring, the blush field carries saturation of its own and the tile's
    outline sits well inside any luminance threshold that still catches the
    letter — so a mask built from the output picks up the rounded square and
    the bar's drop shadow, which is precisely what must be excluded.
    """
    # The letterform: strongly dark, and not part of the bar. The tile's
    # outline is a light grey around 230, far above this, so it is excluded by
    # a wide margin rather than by a threshold tuned to the edge.
    letter = np.clip((132 - orig_lum) / 26.0, 0, 1) * (blue <= 8)

    # The bar: taken from blueness. The threshold sits above the bar's own
    # drop shadow, which is a soft blue smear to the lower right — included,
    # it reads as a printing error rather than a shadow once the mark is
    # white on a flat panel.
    bar = np.clip((blue - 62) / 22.0, 0, 1)

    alpha = np.clip(np.maximum(letter, bar), 0, 1)
    alpha[alpha < 0.06] = 0.0          # drop the shadow's faintest residue

    # The tile's own edge is dark where it meets the cropped-away frame, so it
    # passes the letter threshold and comes through as a rounded rectangle
    # around the mark. Rather than tune the threshold against it — which would
    # also start eating the letter — drop every region that reaches the image
    # border. The letterform and the bar are interior by construction; the
    # frame is the only thing that touches the edge.
    try:
        from scipy.ndimage import label
        lbl, n = label(alpha > 0.02)
        border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
        border.discard(0)
        if border:
            alpha[np.isin(lbl, list(border))] = 0.0
    except ImportError:
        print("  (scipy absent — tile edge may remain in the knockout)", file=sys.stderr)

    out = np.zeros(alpha.shape + (4,))
    out[..., 0], out[..., 1], out[..., 2] = PAPER
    out[..., 3] = alpha * 255

    ys, xs = np.where(alpha > 0.02)
    out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(out.astype(np.uint8), "RGBA").save(BRAND / "buffr-mark.png")
    print(f"knockout      buffr-mark.png {out.shape[1]}x{out.shape[0]} (white, for gradient panels)")


def build_icon_set(icon: Image.Image) -> None:
    s = max(icon.size)
    sq = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sq.paste(icon, ((s - icon.width) // 2, (s - icon.height) // 2), icon)

    sq.resize((192, 192), Image.LANCZOS).save(PUBLIC / "logo192.png")
    sq.resize((512, 512), Image.LANCZOS).save(PUBLIC / "logo512.png")
    sq.resize((64, 64), Image.LANCZOS).save(PUBLIC / "favicon-64.png")
    sq.resize((48, 48), Image.LANCZOS).save(
        PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

    # apple-touch-icon must be opaque: iOS composites a transparent one on
    # black, which would undo the whole point of removing the black frame.
    at = Image.new("RGB", (180, 180), PAPER)
    r = sq.resize((164, 164), Image.LANCZOS)
    at.paste(r, (8, 8), r)
    at.save(PUBLIC / "apple-touch-icon.png")

    # Maskable: Android crops to a circle, so the mark needs ~20% safe padding
    # or the rounded square's own corners get cut off.
    mask = Image.new("RGBA", (512, 512), (*PAPER, 255))
    inner = sq.resize((328, 328), Image.LANCZOS)
    mask.paste(inner, (92, 92), inner)
    mask.save(PUBLIC / "logo-maskable.png")
    print("icon set      favicon.ico, favicon-64, logo192/512, apple-touch, maskable")


def _geometric_font(size: int):
    """The nearest geometric sans available locally.

    The site sets type in Poppins, which is not vendored here. Falling back to
    PIL's bitmap default would put a 10px pixel font on a 1200px card, so a
    system geometric face is used instead and the shortfall is stated rather
    than hidden. Replace with the licensed face when it is vendored.
    """
    from PIL import ImageFont
    for path, idx in (("/System/Library/Fonts/Avenir Next.ttc", 0),
                      ("/System/Library/Fonts/Avenir.ttc", 0),
                      ("/System/Library/Fonts/Helvetica.ttc", 0)):
        try:
            return ImageFont.truetype(path, size, index=idx)
        except OSError:
            continue
    print("  (no system geometric font — og text omitted)", file=sys.stderr)
    return None


def build_social(word: Image.Image) -> None:
    """Open Graph preview. Without one, a shared link renders as a grey card —
    and links to this platform get shared into institutional mail."""
    from PIL import ImageDraw

    W, H = 1200, 630
    og = Image.new("RGB", (W, H), PAPER)

    band_h = 96
    band = ramp(np.tile(np.linspace(0, 1, W), (band_h, 1)).ravel()).reshape(band_h, W, 3)
    og.paste(Image.fromarray(band.astype(np.uint8)), (0, H - band_h))

    wm = word.resize((460, int(word.height * 460 / word.width)), Image.LANCZOS)
    top = 172
    og.paste(wm, ((W - wm.width) // 2, top), wm)

    # The mark alone does not say what this is. A card shared into a mail
    # thread has to carry the product name and what it does, or the recipient
    # sees a logo and nothing else.
    draw = ImageDraw.Draw(og)
    title = _geometric_font(58)
    sub = _geometric_font(28)
    y = top + wm.height + 40
    if title:
        t = "Intelligence"
        w = draw.textbbox((0, 0), t, font=title)[2]
        draw.text(((W - w) // 2, y), t, font=title, fill=(0x3D, 0x11, 0x52))
        y += 84
    if sub:
        t = "Analytics for Namibia's National Payment System"
        w = draw.textbbox((0, 0), t, font=sub)[2]
        draw.text(((W - w) // 2, y), t, font=sub, fill=(0x67, 0x5C, 0x62))

    og.save(PUBLIC / "og-image.png")
    print("social        og-image.png (1200x630)")


def main() -> int:
    for p in (SRC_WORDMARK, SRC_ICON):
        if not p.exists():
            print(f"Missing source art: {p}", file=sys.stderr)
            return 1
    BRAND.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)

    word = build_wordmark()
    icon, orig_lum, blue = build_icon()
    build_knockout(orig_lum, blue)
    build_icon_set(icon)
    build_social(word)
    return 0


if __name__ == "__main__":
    sys.exit(main())
