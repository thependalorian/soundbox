import React from 'react';

export type DeviceState = 'idle' | 'processing' | 'success' | 'failed' | 'pending';

interface SoundBoxDeviceProps {
  state: DeviceState;
  /** The line the device is speaking, shown as an on-screen caption. */
  caption?: string;
  className?: string;
}

/**
 * The physical device, drawn rather than photographed.
 *
 * The seller-facing experience is audible: an LED ring and a spoken amount.
 * Neither survives a screenshot, so the device is rendered live — the ring
 * moves through real states and the spoken line appears as a caption.
 *
 * Drawn in SVG rather than nested divs. An earlier version wrapped a dark
 * square in a thick gradient border, which read as a crude app icon: the
 * frame competed with the ring, and a grid of dark dots on a dark face was
 * invisible. Vector gives control over grille density and ring weight, which
 * are the two things that make this read as hardware.
 *
 * **Drawn as an icon, not a rendering.** Earlier attempts added sheens,
 * hairline edges and a perforated grille of several hundred dots; the result
 * looked like a render that had not quite come off. An icon states the object
 * in as few shapes as it can and survives being shown at 40px. The body is
 * the brand gradient, the face is white, the grille is three rings.
 *
 * **The driver sits on the body's true centre line.** An earlier version
 * offset it left to leave clearance for two sound-arc strokes on the right,
 * which made the device look lopsided the instant you noticed the arcs were
 * decoration rather than the object itself. Removing the arcs and centring
 * the driver fixed both: the icon now reads as a speaker centred in its own
 * case, not as a shape with an ornament bolted to one side.
 *
 * **The ring keeps status colours, never brand colours.** It is the one part
 * a seller reads at arm's length, in a hurry, to decide whether to hand over
 * goods. Green means paid. Recolouring it to magenta would make the device
 * look more on-brand and less able to do its only job, and that cost lands on
 * the person least able to absorb it.
 *
 * The brand appears where it carries no meaning: the body gradient and the
 * status bar's glow.
 */

const RING_COLOUR: Record<DeviceState, string> = {
  idle: '#FFFFFF',
  processing: '#D97706',
  success: '#0E9F6E',
  failed: '#DC2626',
  pending: '#D97706',
};

const LABEL: Record<DeviceState, string> = {
  idle: 'Ready',
  processing: 'Processing',
  success: 'Payment received',
  failed: 'Payment failed',
  pending: 'Holding — no network',
};

const SoundBoxDevice: React.FC<SoundBoxDeviceProps> = ({ state, caption, className = '' }) => {
  const ring = RING_COLOUR[state];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        width={220}
        height={220}
        viewBox="0 0 220 220"
        role="img"
        aria-label={`SoundBox device, ${LABEL[state].toLowerCase()}`}
      >
        <defs>
          <linearGradient id="sb-body" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#F15A29" />
            <stop offset="100%" stopColor="#E6136C" />
          </linearGradient>
          <radialGradient id="sb-glow">
            <stop offset="0%" stopColor={ring} stopOpacity="0.5" />
            <stop offset="100%" stopColor={ring} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Body: one gradient shape. */}
        <rect x="18" y="14" width="184" height="192" rx="40" fill="url(#sb-body)" />

        {/* Status light along the top edge. A bar rather than a ring around
            the driver: concentric circles read as a target, which is what the
            previous attempt looked like. This reads as a device with a light
            on it, which is what it is. */}
        {state !== 'idle' && <rect x="72" y="30" width="76" height="18" rx="9" fill="url(#sb-glow)" />}
        <rect
          x="86"
          y="34"
          width="48"
          height="8"
          rx="4"
          fill={ring}
          className={state === 'processing' ? 'animate-shimmer' : undefined}
          style={{ transition: 'fill 300ms ease' }}
        />

        {/* Driver: a speaker cone, not a bullseye. One outer cone, one inner
            dome, and that is the whole shape. Centred at x=110, the true
            midpoint of the body rect (x=18, width=184). */}
        <circle cx="110" cy="122" r="46" fill="#FFFFFF" />
        <circle cx="110" cy="122" r="46" fill="none" stroke="#EED9E1" strokeWidth="2" />
        <circle cx="110" cy="122" r="17" fill="url(#sb-body)" />
      </svg>

      <p className="text-caption font-sohne text-ash mt-16">{LABEL[state]}</p>
      {caption && (
        <p
          className="text-body font-sohne text-ink mt-4 text-center max-w-[260px]"
          role="status"
          aria-live="polite"
        >
          &ldquo;{caption}&rdquo;
        </p>
      )}
    </div>
  );
};

export default SoundBoxDevice;
