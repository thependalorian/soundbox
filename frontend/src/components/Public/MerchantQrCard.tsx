import React from 'react';
import BrandQrCode from '../ui/BrandQrCode';

/**
 * A representative NAMQR payload. Real codes are issued per business by the
 * rails; this encodes a readable stand-in so the demo code scans to something
 * meaningful rather than to noise a curious visitor cannot interpret.
 */
const NAMQR_SAMPLE = 'https://justasoundbox.com/demo';

/**
 * The seller's printed NAMQR code.
 *
 * NAMQR is Namibia's national QR payment standard, which is what makes one
 * printed code work across every participating bank and wallet rather than
 * tying the seller to a single provider.
 *
 * Deliberately *static* — it encodes the seller's payment alias and
 * nothing else. No amount, no transaction reference, no expiry. That single
 * choice is what makes onboarding a printed sticker rather than a terminal:
 * there is nothing to generate per sale, nothing to power, and nothing to
 * break. The same decision is what let this model reach twenty million
 * sellers on the Indian rails Namibia's platform is derived from.
 *
 * Rendered through `BrandQrCode` — a real, scannable code in the brand
 * gradient with the mark at its centre — not the drawn illustration this
 * component used before. On a page whose argument is "raise your phone to
 * this", a code that cannot actually be scanned would undercut its own point.
 */

/** Doubled from 168: at the smaller size the mark in the centre was a
 *  smudge, and this code is meant to be raised a phone to. */
const QR_SIZE = 336;

const MerchantQrCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-paper border border-mist rounded-cards p-24 ${className}`}>
      <div className="flex flex-col sm:flex-row gap-24 items-start">
        {/* A real, scannable code rather than the drawing that was here.
            On a page whose whole claim is that a customer can raise their
            phone to it, an illustration undercuts the point. */}
        <BrandQrCode
          value={NAMQR_SAMPLE}
          size={QR_SIZE}
          label="A payment code for this business, with the WayaMe mark at its centre"
          className="shrink-0"
        />

        <div className="min-w-0">
          <h3 className="text-subheading font-signifier text-ink">One printed code, forever</h3>
          <p className="text-caption font-sohne text-slate mt-8">
            One code, printed once, in Namibia&apos;s national QR standard — so any
            customer&apos;s banking app can pay it, whoever they bank with. It does not change
            between sales, so there is nothing to generate, nothing to power, and nothing that
            can go out of date.
          </p>
          <dl className="mt-16 space-y-8">
            {[
              ['What it holds', 'The seller’s payment alias, and nothing else'],
              ['Why it never goes stale', 'It carries no amount, no reference and no expiry'],
              ['Who types the amount', 'The customer, in whichever banking app they already use'],
              ['What it costs to replace', 'A printed sticker'],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-col sm:flex-row sm:gap-8">
                <dt className="text-caption font-sohne text-ash sm:w-[168px] shrink-0">{k}</dt>
                <dd className="text-caption font-sohne text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default MerchantQrCard;
