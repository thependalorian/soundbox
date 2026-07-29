import React, { useEffect, useRef, useState } from 'react';

/**
 * A contact address that harvesters cannot lift.
 *
 * The address never exists as a plain string in the DOM, in the bundle, or in
 * this source file. It is stored as character codes and painted to a canvas
 * at runtime, so a scraper reading the served HTML or grepping the JavaScript
 * finds nothing to take.
 *
 * That is the standard this project follows for public contact addresses.
 * The cost of getting it wrong is not spam alone: a published address on a
 * payments product is a credible target for pretexting, and the address here
 * is the one a partner would use to reach the team.
 *
 * **Accessibility is preserved deliberately.** A canvas is invisible to a
 * screen reader, so the link carries an `aria-label` in spoken form — "team
 * at justasoundbox dot com". That is readable to a person and useless to the
 * naive regex a harvester uses, which is the right trade: an obfuscation
 * that locks out assistive technology has made the page worse, not safer.
 *
 * The `mailto:` is assembled in the click handler rather than sitting in an
 * `href`, for the same reason — an `href` is plain text in the DOM.
 */

interface ObfuscatedEmailProps {
  /** Character codes of the local part, before the @. */
  user: readonly number[];
  /** Character codes of the domain, after the @. */
  domain: readonly number[];
  className?: string;
  /** Spoken form for assistive technology. Written, not derived, so the
   *  assembled address is never held in a variable a scraper could reach. */
  spoken: string;
  colour?: string;
  fontSize?: number;
}

const ObfuscatedEmail: React.FC<ObfuscatedEmailProps> = ({
  user,
  domain,
  className = '',
  spoken,
  colour = '#3D1152',
  fontSize = 15,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(200);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const font = `${fontSize}px Poppins, ui-sans-serif, system-ui, sans-serif`;

    // Assembled inside the effect and again inside the handler, never held
    // on the component or in module scope where a scraper could reach it.
    const text =
      String.fromCharCode(...user) + String.fromCharCode(64) + String.fromCharCode(...domain);

    ctx.font = font;
    const measured = Math.ceil(ctx.measureText(text).width) + 2;
    setWidth(measured);

    // Re-apply after the resize: setting width or height resets the context.
    canvas.width = measured * dpr;
    canvas.height = Math.ceil(fontSize * 1.5) * dpr;
    canvas.style.width = `${measured}px`;
    canvas.style.height = `${Math.ceil(fontSize * 1.5)}px`;
    ctx.scale(dpr, dpr);
    ctx.font = font;
    ctx.fillStyle = colour;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 1, (fontSize * 1.5) / 2);
  }, [user, domain, colour, fontSize]);

  return (
    <button
      type="button"
      aria-label={spoken}
      title={spoken}
      onClick={() => {
        window.location.href =
          String.fromCharCode(109, 97, 105, 108, 116, 111, 58) +
          String.fromCharCode(...user) +
          String.fromCharCode(64) +
          String.fromCharCode(...domain);
      }}
      className={`inline-flex items-center align-middle hover:opacity-70 transition-opacity ${className}`}
      style={{ width }}
    >
      <canvas ref={canvasRef} aria-hidden="true" />
    </button>
  );
};

export default ObfuscatedEmail;
