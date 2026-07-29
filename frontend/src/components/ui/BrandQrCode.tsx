import React, { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import monogram from '../../assets/brand/wayame-monogram.png';

/**
 * A real, scannable QR code in the brand's colours, with the monogram at its
 * centre.
 *
 * This replaces a hand-drawn illustration of a QR code. An illustration is
 * honest on a marketing page and useless on a demo, where the point is that
 * a customer can actually raise their phone to it.
 *
 * Two technical decisions carry real consequences:
 *
 * **Error correction is forced to H (30%).** Placing a logo over the centre
 * destroys modules. At the default level a code with a logo on it scans
 * inconsistently — worse than a code that plainly does not work, because the
 * failure is intermittent and nobody trusts it afterwards. H sacrifices data
 * density for the redundancy that makes the covered area recoverable.
 *
 * **The logo is set to 0.32, below the library's own default of 0.4.** The
 * mark has to be large enough to read — at 0.22 it was a smudge — while
 * leaving H-level correction enough intact modules to recover from. Pushing
 * past the default is where branded codes start failing on cheaper phone
 * cameras first, which is precisely the segment this product exists to
 * serve: a code that only scans on a flagship has inverted its own purpose.
 *
 * The gradient runs across the modules on the diagonal, matching the mark.
 * The display hues are correct here rather than the darkened ones: contrast
 * is against the light background, not against overlaid text, and a scanner
 * needs the modules dark against white — which both hues satisfy comfortably.
 *
 * **The mark must be a transparent PNG.** It was briefly a JPG, which cannot
 * carry transparency, so it painted an opaque grey rectangle over the middle
 * of the code — technically scannable, visibly wrong. The PNG is keyed from
 * the source art on saturation rather than luminance: the mark is a
 * saturated pink-to-orange line on a near-neutral field, and a luminance key
 * would have eaten the darker magenta end.
 */

interface BrandQrCodeProps {
  /** What the code encodes. A payment string in production; any URL in demos. */
  value: string;
  size?: number;
  /** Set false for a plain brand-coloured code with no monogram. */
  withLogo?: boolean;
  className?: string;
  /** Describes the code for assistive technology. Required — a bare canvas
   *  tells a screen reader nothing at all. */
  label: string;
}

const BrandQrCode: React.FC<BrandQrCodeProps> = ({
  value,
  size = 320,
  withLogo = true,
  className = '',
  label,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const instance = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    const options = {
      width: size,
      height: size,
      type: 'svg' as const,
      data: value,
      image: withLogo ? monogram : undefined,
      margin: 8,
      qrOptions: {
        // See above: mandatory when anything covers the centre.
        errorCorrectionLevel: 'H' as const,
      },
      imageOptions: {
        crossOrigin: 'anonymous',
        // Clears modules behind the logo rather than painting over them, so
        // the decoder is not fed half-covered modules it might misread.
        hideBackgroundDots: true,
        imageSize: 0.32,
        margin: 6,
      },
      dotsOptions: {
        type: 'rounded' as const,
        gradient: {
          type: 'linear' as const,
          rotation: Math.PI / 4,
          colorStops: [
            { offset: 0, color: '#F15A29' },
            { offset: 1, color: '#E6136C' },
          ],
        },
      },
      // Corner markers are what a scanner locks onto first. They stay solid
      // and high-contrast: a gradient across a finder pattern is where
      // stylised codes usually become unreliable.
      cornersSquareOptions: { type: 'extra-rounded' as const, color: '#E6136C' },
      cornersDotOptions: { type: 'dot' as const, color: '#F15A29' },
      backgroundOptions: { color: '#FFFFFF' },
    };

    if (!instance.current) {
      instance.current = new QRCodeStyling(options);
      if (ref.current) {
        ref.current.innerHTML = '';
        instance.current.append(ref.current);
      }
    } else {
      instance.current.update(options);
    }
  }, [value, size, withLogo]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export default BrandQrCode;
