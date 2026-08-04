/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // WayaMe brand palette, sampled from the brand assets.
        //
        // SoundBox listens to the WayaMe rails, and its own mark is drawn
        // from this family — plum lettering with a coral signal arc — so the
        // interface uses the same language rather than a second one.
        //
        // The gradient runs magenta to coral and is the single most
        // recognisable brand element. It is reserved for brand surfaces:
        // headers, primary actions, the marks themselves. Charts and status
        // never use it, because a gradient encodes nothing and would imply a
        // scale that does not exist.
        brand: {
          magenta: '#E6136C',   // gradient start; the "Waya" pink
          crimson: '#E91673',
          rose: '#F04D7C',
          coral: '#F15A29',     // gradient end; the signal arc
          ember: '#ED5240',

          // Darkened variants for anything carrying white text at body size.
          //
          // Measured: white on #E6136C is 4.49:1 and white on #F15A29 is
          // 3.37:1, against the 4.5:1 that WCAG AA requires for normal text.
          // The brand hues are simply light — that is not a flaw in them,
          // it is what happens when a display palette meets body copy.
          //
          // These are the same hues darkened until they pass (5.4:1 and
          // 4.5:1). They are for filled buttons and any solid fill under
          // white body text; the display hues above stay unchanged for large
          // type, marks and brand surfaces, where they are correct.
          'magenta-aa': '#CF1161',
          'coral-aa': '#CC4C22',
        },

        // Deep plum carries every piece of text. Near-black would be legible
        // and off-brand; this is the colour the brand actually sets copy in.
        plum: {
          DEFAULT: '#3D1152',
          deep: '#2E1A47',
          badge: '#4C1C58',
        },

        // Surfaces. Blush is the brand's card colour — the FAQ panels sit on
        // it — and silver is the page field behind them.
        blush: '#FAD5DD',
        'blush-tint': '#FDEEF2',
        silver: '#EDEBEC',
        paper: '#ffffff',

        // Retained so the whole interface does not have to change at once.
        // `ink` resolves to plum rather than near-black, matching the brand,
        // which sets body copy in plum and not in black.
        //
        // The neutral ramp is warmed *towards the coral end* rather than the
        // magenta end. An earlier pass tinted these purple, which made an
        // interface where plum text sits on purple-grey surfaces — the whole
        // screen leaning one way. Warm neutrals let the pink read as pink
        // instead of as more of the same.
        ink: '#3D1152',
        mist: '#F6F1F2',
        fog: '#FCFAFA',
        slate: '#705C67',
        ash: '#675C62',
        smoke: '#C0B2B8',
        peach: '#FDEEF2',
        // Text-safe brand pink: clears AA on every surface including
        // blush. The display magenta stays available as `brand-magenta` for
        // fills and marks, where contrast is not the constraint.
        sienna: '#B80F56',

        // Status stays outside the brand palette on purpose. These must be
        // distinguishable at a glance and must not be confused with brand
        // emphasis — a coral "danger" beside a coral button says nothing.
        // Green and amber are also far enough from magenta to survive the
        // most common colour-vision deficiencies.
        status: {
          success: '#0E9F6E',
          warning: '#D97706',
          danger: '#DC2626',
          info: '#2563EB',
        },
      },
      backgroundImage: {
        // The brand gradient, as a token rather than a literal at each use.
        'brand-gradient': 'linear-gradient(90deg, #F15A29 0%, #E91673 55%, #E6136C 100%)',
        // The accessible gradient: same direction and hues, darkened so white
        // body text clears AA across the whole sweep, not just at one end.
        'brand-gradient-aa': 'linear-gradient(90deg, #CC4C22 0%, #D01364 55%, #CF1161 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, #FDEEF2 0%, #FAD5DD 100%)',

        // Per-page hero placeholder surfaces (PageHero `tone` prop). Each
        // hero has to look different from the others until real photography
        // lands, or six heroes read as one repeated panel. Named here rather
        // than as arbitrary values at the call site — the same rule the rest
        // of the palette follows: a colour or gradient used more than once
        // is a token, not a literal pasted into a component.
        'hero-origin': 'linear-gradient(90deg, #F15A29 0%, #E91673 55%, #E6136C 100%)',
        'hero-trader': 'linear-gradient(120deg, #CC4C22 0%, #D01364 70%)',
        'hero-oversight': 'linear-gradient(200deg, #3D1152 0%, #CF1161 85%)',
        'hero-mechanism': 'linear-gradient(90deg, #CF1161 0%, #CC4C22 100%)',
        'hero-assurance': 'linear-gradient(160deg, #2E1A47 0%, #4C1C58 60%, #B80F56 100%)',
        'hero-restraint': 'linear-gradient(180deg, #3D1152 0%, #2E1A47 100%)',

        // Sheen overlays for the same six tones — a soft light source so the
        // placeholder has depth rather than reading as a flat colour fill.
        'hero-sheen-origin': 'radial-gradient(circle at 20% 120%, rgba(255,255,255,0.28), transparent 60%)',
        'hero-sheen-trader': 'radial-gradient(circle at 85% 15%, rgba(255,255,255,0.22), transparent 55%)',
        'hero-sheen-oversight': 'radial-gradient(circle at 15% 10%, rgba(255,255,255,0.16), transparent 50%)',
        'hero-sheen-mechanism': 'radial-gradient(ellipse at 50% 120%, rgba(255,255,255,0.24), transparent 60%)',
        'hero-sheen-assurance': 'radial-gradient(circle at 75% 25%, rgba(255,255,255,0.14), transparent 55%)',
        'hero-sheen-restraint': 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.10), transparent 45%)',
      },
      fontFamily: {
        // The brand sets everything in a geometric sans. The previous system
        // used a serif for headlines, which reads as a different product
        // beside the marks — a serif headline above a geometric wordmark is
        // the most visible way to look off-brand.
        //
        // Poppins is the closest widely-available match to the lettering in
        // the brand assets: geometric, near-circular bowls, single-storey a.
        // **The exact licensed face should be confirmed against IPN's brand
        // guidelines** — this is a considered match, not a specified one, and
        // swapping it later is one line here.
        //
        // The `signifier` and `sohne` keys are kept so several hundred
        // existing class names keep working; both now resolve to the brand
        // face, with `signifier` carrying headline treatment.
        signifier: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sohne: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        430: '430',
        450: '450',
        480: '480',
      },
      fontSize: {
        caption: ['15px', { lineHeight: '1.5' }],
        body: ['17px', { lineHeight: '1.35' }],
        'body-lg': ['20px', { lineHeight: '1.35' }],
        subheading: ['22px', { lineHeight: '1.5' }],
        'heading-sm': ['26px', { lineHeight: '1.18', letterSpacing: '-0.23px' }],
        heading: ['44px', { lineHeight: '1.22', letterSpacing: '-0.9px' }],
        'heading-lg': ['64px', { lineHeight: '1.14', letterSpacing: '-1.4px' }],
        display: ['90px', { lineHeight: '1.08', letterSpacing: '-2.6px' }],
      },
      spacing: {
        4: '4px',
        8: '8px',
        12: '12px',
        16: '16px',
        20: '20px',
        24: '24px',
        28: '28px',
        32: '32px',
        40: '40px',
        64: '64px',
        80: '80px',
        96: '96px',
        124: '124px',
        128: '128px',
        160: '160px',
      },
      minHeight: {
        // Heroes have a floor rather than only padding: a page whose opening
        // is as tall as its body sections does not announce itself, which is
        // what every hero on the site did before this.
        hero: '440px',
        'hero-lg': '620px',
      },
      transitionTimingFunction: {
        // One easing curve for the whole system. A decelerating curve with a
        // long tail reads as mass — the element arrives and settles rather
        // than stopping dead. `ease-in-out` is symmetric and reads as
        // mechanical, which is why nothing here uses it.
        brand: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
      borderRadius: {
        full: '9999px',
        cards: '24px',
        // Concentric radii for nested surfaces. An inner panel sharing its
        // shell's radius reads as a mistake: the curves have to differ by the
        // padding between them or the two edges fight.
        shell: '32px',
        shellInner: '26px',
        images: '12px',
        inputs: '16px',
        buttons: '9999px',
        smallCards: '16px',
        elevatedCards: '20px',
      },
      maxWidth: {
        // The single content column width used by every page shell. Was
        // repeated as an arbitrary [1200px] in six places.
        content: '1200px',
        prose: '640px',
      },
      height: {
        // Meter/progress bar weights. Named so a bar's meaning drives its
        // size rather than a number picked per call site.
        meter: '4px',
        'meter-lg': '8px',
      },
      keyframes: {
        // Softer than Tailwind's default pulse, which dips far enough to
        // read as a flashing element rather than loading content.
        shimmer: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        // The dialog arrives rather than appearing. Transform and opacity
        // only, so it composites on the GPU.
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        // A highlight sliding left to right across an active connector, so
        // the payment rail and sequence diagrams read as something moving
        // rather than a colour that was simply switched on.
        flow: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        // Same idea, top to bottom — the money lane runs vertically when two
        // payers sit side by side, so its connectors need the same sweep
        // rotated rather than a second unrelated effect.
        'flow-vertical': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        flow: 'flow 1.1s linear infinite',
        'flow-vertical': 'flow-vertical 1.1s linear infinite',
      },
      boxShadow: {
        subtle: '0px 0px 0px 1px rgba(0,0,0,0.05), 0px 4px 24px 0px rgba(0,0,0,0.08)',
        'subtle-2': '0px 0px 0px 1px rgba(0,0,0,0.05), 0px 8px 40px 0px rgba(0,0,0,0.1)',
        'subtle-3': '0px 0px 0px 1px rgba(4,23,43,0.05), 0px 20px 25px -5px rgba(0,0,0,0.1), 0px 8px 10px -6px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
}
