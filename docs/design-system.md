# Design system

> The visual language, where it comes from, and the rules that keep it honest.
>
> Part of the SoundBox documentation set — see [README.md](README.md).

---

## 1. Where this comes from

The palette, typography and shapes are taken from the WayaMe brand assets in
[`brand/`](brand/) — the launch material and the FAQ series. SoundBox listens
to the WayaMe rails, and its own mark is drawn from the same family: plum
lettering with a coral signal arc. Using a second visual language would make
the two look like unrelated products sitting next to each other.

Colours were sampled from the assets rather than guessed. The reference
images are kept in `docs/brand/` and deliberately **not** in `src/`: they are
6.7 MB of source material, and anything under `src/` is a candidate for the
bundle.

---

## 2. Palette

| Token | Value | Use |
|---|---|---|
| `brand-magenta` | `#E6136C` | Gradient start; the "Waya" pink |
| `brand-coral` | `#F15A29` | Gradient end; the signal arc |
| `brand-crimson` | `#E91673` | Gradient midpoint |
| `plum` | `#3D1152` | All body text and headings |
| `plum-badge` | `#4C1C58` | Number badges, dense fills |
| `blush` | `#FAD5DD` | Card surfaces |
| `silver` | `#EDEBEC` | Page field behind cards |
| `paper` | `#FFFFFF` | Panels that sit above the field |

Legacy names (`ink`, `mist`, `fog`, `slate`, `ash`, `smoke`, `sienna`) are
retained and remapped onto the brand. `ink` now resolves to plum rather than
near-black, so several hundred existing class names picked up the brand
without every file being edited. They are not deprecated; they are the
neutral ramp.

### The gradient

`linear-gradient(90deg, #F15A29, #E91673, #E6136C)`, available as
`bg-brand-gradient`.

It is the most recognisable element in the identity, and it is reserved for
**brand moments**: the header hairline, primary actions, the marks. It is
deliberately absent from charts and status, because a gradient encodes
nothing — putting one on data implies a scale or a direction that does not
exist.

### Accessibility: the darkened variants

The brand hues are light. Measured against white text:

| | Ratio | WCAG AA (4.5:1 for body text) |
|---|---|---|
| White on `#E6136C` | 4.49 | just misses |
| White on `#F15A29` | 3.37 | misses |

That is not a flaw in the palette. It is what happens when a display palette
meets body copy. So there are two versions:

- **Display hues** — unchanged, for marks, large type, hairlines and brand
  surfaces, where they are correct as drawn.
- **`brand-magenta-aa` (`#CF1161`), `brand-coral-aa` (`#CC4C22`) and
  `bg-brand-gradient-aa`** — the same hues darkened until white body text
  clears AA across the whole sweep (4.54 at the coral end, 5.38 at the
  magenta end). Filled buttons and any solid fill under white body text use
  these.

### Every text pair clears AA

Once blush became a primary surface rather than a rare callout, the whole
ramp had to be re-measured against it. Two colours failed and were corrected:

- **`ash` measured 2.98 on white** — below even the 3.0 large-text bar, while
  carrying captions and metadata across the product. Now `#675C62`.
- **`sienna` measured 4.49 on white and 3.34 on blush.** Now `#B80F56`, the
  text-safe brand pink. The display magenta stays available as
  `brand-magenta` for fills and marks, where contrast is not the constraint.

| | paper | blush | blush-tint | mist | silver |
|---|---|---|---|---|---|
| `plum` `#3D1152` | 15.00 | 11.16 | 13.34 | 13.41 | 12.64 |
| `slate` `#705C67` | 6.15 | 4.57 | 5.47 | 5.50 | 5.18 |
| `ash` `#675C62` | 6.39 | 4.76 | 5.69 | 5.72 | 5.39 |
| `sienna` `#B80F56` | 6.48 | 4.82 | 5.77 | 5.80 | 5.46 |

White on the gradient button measures 4.54 at its worst point. **The worst
text pair anywhere in the system is 4.54.** Nothing fails.

### Status stays outside the brand

`status.success` `#0E9F6E`, `warning` `#D97706`, `danger` `#DC2626`, `info`
`#2563EB`.

Deliberately not brand hues. These must be distinguishable at a glance and
must never be mistaken for brand emphasis — a coral "danger" pip beside a
coral button says nothing. Green and amber also sit far enough from magenta
to survive the common colour-vision deficiencies.

---

## 3. Typography

The brand sets everything in a geometric sans. The previous system used a
serif for headlines, which reads as a different product beside the marks —
a serif headline above a geometric wordmark is the most visible way to look
off-brand.

**Poppins** carries the interface: geometric, near-circular bowls, matching
the lettering in the brand assets.

> **The exact licensed face should be confirmed against IPN's brand
> guidelines.** Poppins is a considered match, not a specified one. Changing
> it is one line in `tailwind.config.js`.

Large type is set **light (300)**. The brand lets size carry emphasis rather
than weight; at 44px and above, regular weight looks heavy beside the marks.
Tracking was tightened at display sizes, because a geometric sans reads
larger than the serif it replaced at the same nominal size.

The `signifier` and `sohne` font keys are kept — both now resolve to the
brand face — so existing class names keep working.

---

## 4. Shape

The brand's card is a generous radius with **one square corner** (bottom
right). That asymmetry is the shape signature across every asset; it is what
makes a panel read as WayaMe rather than as a generic rounded box.
Available as `Card` with `variant="brand"` — a global CSS class
(`.card-brand`) briefly duplicated this in `globals.css`, defining the same
selector twice with the same values; it was removed as dead code once found,
and the `Card` component is the only source now.

Radii otherwise: `cards` 24px, `inputs` 16px, `images` 12px, buttons full.

---

## 5. Charts

Chart colours live in `src/lib/chartTokens.ts`, not as literals at call
sites. Recharts and inline SVG take literal values, so Tailwind classes
cannot reach them — those literals had been pasted at a dozen call sites,
which is why the rebrand initially missed every chart in the product until
they were found by hand.

- One measure: `DATA` (`#E6136C`).
- Several: `SERIES`, ordered by how distinguishable the colours are from each
  other rather than by brand hierarchy. A reader has to tell series three
  from series four, and that matters more than which is more on-brand. Teal
  is included deliberately so a fifth series does not read as another shade
  of pink.
- Chrome: `AXIS`, `GRID`, `TOOLTIP_STYLE`.

---

## 6. Where the brand actually appears

A first pass had the colours right and the proportion wrong: plum text on
white, with the gradient appearing only on a button and a hairline. In the
brand assets the largest single shape on the page is a pale pink panel. The
identity comes from **area**, not from accents.

| Surface | Treatment |
|---|---|
| Public page bands | `bg-paper` / `bg-blush`, alternating down the page, with exactly one emphasis band per page (below) |
| Page heroes | `PageHero`, full-bleed — see §6a. No longer "light"; every hero now carries a tone-specific gradient or a real photo |
| Emphasis band | One per page: `bg-brand-gradient-aa` with copy reversed out, or a named `hero-*` gradient token where the default would repeat the hero directly above it (below) |
| Operator app field | `bg-blush-tint` — the brand at low intensity |
| Cards on those fields | `elevated` white, so they lift off the tint |
| Primary action | `bg-brand-gradient-aa` (buttons, urgent `PageAction`) |
| Selected nav item | `bg-brand-gradient-aa` |
| Header close | 2px `bg-brand-gradient` hairline, both shells |
| Row hover | `bg-blush-tint` |
| Seller page CTA | Sign in to their business (`/login?as=merchant`) |
| Regulator page CTA | Sign in for oversight (`/login?as=regulator`) |
| Administrator sign-in | Public footer only |

**The operator field is pitched softer than the marketing pages on purpose.**
An analyst reads those screens for hours; the brand material is marketing,
and a saturated field behind a working dashboard is fatiguing rather than
on-brand. Same language, lower volume.

**Copy on the gradient is full white, never a reduced opacity.** White at 90%
over the coral end measures 3.64:1, below AA. The saving in softness is not
worth the readability.

### 6a. `PageHero` and the six tones

Every public page opens with `PageHero` (`components/Public/PageHero.tsx`):
`size` (`medium` | `large`, home only), a `tone`, and an optional `backdrop`
for a real photograph once one exists. With no `backdrop`, the tone renders a
full-bleed gradient with the WayaMe monogram ghosted into it — six tones
(`origin`, `trader`, `oversight`, `mechanism`, `assurance`, `restraint`), one
per page, each a different gradient angle and monogram position so six
placeholder heroes do not read as one repeated panel. Copy is always full
white per the rule above; a backdrop photo gets a `bg-plum-deep/75` scrim so
that holds regardless of what the photo behind it looks like.

**A hero is not "light" anymore — mind what sits directly beneath it.**
Every tone is a saturated gradient, so the section immediately following a
hero cannot default to `bg-brand-gradient-aa` (or reuse the same tone) without
risking two visually identical panels stacked with no seam — found on the
home page (hero `origin` next to a `brand-gradient-aa` vision panel, both the
same coral/magenta family) and the sellers page (hero `trader` next to a
`brand-gradient-aa` emphasis band — nearly the same gradient by coincidence
of shared endpoints). Both were fixed by giving the section under the hero a
*different* gradient — reusing a different `hero-*` token (`bg-hero-oversight`
on the landing page, `bg-hero-assurance` on the sellers page) rather than the
generic emphasis token. Check this pairing on any new page.

**The same rule applies at the bottom of every page.** Every page's closing
section is `bg-paper`, and `PublicShell`'s footer was also unstyled white —
the two blended into one long white run with only a 1px border between them.
Fixed once, in `PublicShell`, with a `bg-brand-gradient-aa` hairline (mirrors
the header's own closing device) and a `bg-mist` footer surface, so no
individual page has to solve this itself.

**A page needs exactly one emphasis band, and an odd count of non-emphasis
sections before a fixed-`paper` closer will force a collision.** With `paper`
and `blush` strictly alternating and the closing section fixed to `paper`,
an even number of sections before it lands the section right before the
close on `paper` too — found on the privacy page, which had no emphasis band
at all and six alternating sections ahead of its closer. Fixed by giving
Privacy the emphasis band every other page already had (the "What never
happens to it" section), which also breaks the parity problem: a gradient
slot is distinct from both `paper` and `blush`, so it resets the count
without having to re-derive which page background continues which.

---

## 7. Components, and using them consistently

**Every call to action carries the gradient.** An action is the moment the
brand should be most present.

- `Button` — a `<button>`.
- `ButtonLink` — a router `<Link>` that looks and behaves identically.

Both source their styling from `buttonStyles.ts`, so they cannot drift.
`ButtonLink` exists because seven pages had pasted their own CTA classes onto
a `Link` — and every one of them missed the gradient when it landed. **Do not
style a link as a button by hand.**

`ghost` is gradient-*bordered* rather than gradient-filled. Two filled
gradients side by side leave a reader unable to tell which action is the
main one; a bordered secondary still reads as brand, at lower weight.

### Pages close where their reader acts

| Page | Closes with |
|---|---|
| For sellers | Sign in to your business |
| For regulators | Sign in for oversight |
| How it works, Demo | `AudienceSplit` — which side are you on |
| Public footer | Administrator sign-in |

How-it-works and the demo previously closed on copy describing a feature
("Ask it a question", "This is the merchant's half") which sent the reader
nowhere they had a reason to go. A closing section hands someone their next
step; on a page serving both audiences, that means asking which one they are
rather than guessing.

### The QR code

`BrandQrCode` renders a real, scannable code in the brand gradient with the
monogram at its centre, replacing a hand-drawn illustration. Two constraints
are not negotiable:

- **Error correction is forced to H (30%).** A logo destroys modules. At the
  default level a code with a logo scans *intermittently*, which is worse
  than one that plainly fails — nobody trusts it afterwards.
- **The logo covers 22% and no more.** Past roughly a quarter, even H cannot
  recover, and it fails on cheaper phone cameras first — precisely the
  segment this product serves. A code that only scans on a flagship has
  inverted its own purpose.

Corner markers stay solid and high-contrast. A gradient across a finder
pattern is where stylised codes usually become unreliable.

### The device

`SoundBoxDevice` carries the brand on its body gradient and the status bar's
glow. An earlier version's doc claimed a "waveform"; the SVG has never had
one — only the body gradient and the glow around the status bar carry the
brand. **The LED ring keeps status colours, not brand colours.** That ring is
the one part a seller reads at arm's length, in a hurry, to decide whether to
hand over goods. Recolouring it to magenta would make the device look more
on-brand and less able to do its only job, and the cost lands on the person
least able to absorb it. The driver sits on the body's true horizontal
centre — an earlier version offset it to leave room for two sound-arc
strokes that were later removed as unnecessary decoration, and the offset
driver was left looking lopsided until it was recentred.

---

## 8. Rules

1. **The gradient is for brand moments, never for data.** It encodes nothing.
2. **White body text goes on the `-aa` variants, never the display hues.**
3. **Status colours are not brand colours**, and neither substitutes for the
   other.
4. **No new colour literals in components.** Tokens in `tailwind.config.js`
   for anything Tailwind can reach; `chartTokens.ts` for anything it cannot.
5. **Large type is light.** Weight is not how this brand emphasises.
6. **Measure any new colour against every surface it can land on**, not just
   white. Blush is a primary surface now, and it is the one that catches
   failures — it is the darkest thing text sits on.
7. **No two adjacent sections share a background**, including the hero above
   the first section and the footer below the last. A hero tone and the
   generic `brand-gradient-aa` emphasis token can be close enough in hue to
   read as one panel even when their class names differ — check the actual
   rendered colours, not just that the class names differ. See §6a.
8. **A page needs exactly one emphasis band.** Besides being the visual
   rhythm the rest of the site uses, an emphasis band is also what resets
   the paper/blush alternation cleanly ahead of a closing section that is
   always `paper` — see §6a for the parity problem a missing one caused.

---

## 9. Outstanding

- **Confirm the licensed typeface** against IPN's brand guidelines.
- **Permission to use the WayaMe name and marks** is a commercial matter with
  Instant Payments Namibia, not a design one. The interface currently names
  WayaMe to say what SoundBox connects to, and says so explicitly.
