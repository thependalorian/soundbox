import React from 'react';
import { ACCESS, CONTACT } from '../../lib/copy/public';

/**
 * The way in for a reader who does not have an account.
 *
 * Every public page closed on "Sign in", which is the wrong last word for the
 * audience each page is written for — a supervisor who has just finished the
 * oversight argument, or a seller who does not own a box. Both were invited to
 * sign in to something they have no account for.
 *
 * **This is deliberately not a sign-up.** Accounts are issued by an
 * administrator and never self-created (see the README's Account lifecycle
 * section), because on an oversight platform an account someone can create for
 * themselves is a defect. So this opens a mail to the team with the audience
 * already in the subject line, which is also what lets a regulator get a
 * different reply from a market trader.
 *
 * The address is assembled from character codes in the click handler and never
 * appears in the DOM, the bundle or this file — the same standard
 * `ui/ObfuscatedEmail.tsx` sets, and for the same reason: a published address
 * on a payments product is a credible pretexting target, not just a spam
 * magnet. Unlike that component this renders its own label rather than
 * painting the address, so the address is not even shown, which is strictly
 * less exposure for a call to action.
 */

interface RequestAccessProps {
  /** Which audience is asking. Sets the prompt, the label and the subject. */
  audience?: keyof Omit<typeof ACCESS, 'note'>;
  /** Light text for placing on the brand gradient rather than on paper. */
  tone?: 'light' | 'onGradient';
  className?: string;
}

const RequestAccess: React.FC<RequestAccessProps> = ({
  audience = 'general',
  tone = 'light',
  className = '',
}) => {
  const copy = ACCESS[audience];
  const promptColour = tone === 'onGradient' ? 'text-paper/80' : 'text-slate';
  const linkColour = tone === 'onGradient' ? 'text-paper' : 'text-sienna';

  const open = () => {
    // Assembled here, never held in module scope where a scraper could read it.
    const address =
      String.fromCharCode(...CONTACT.emailUser) +
      String.fromCharCode(64) +
      String.fromCharCode(...CONTACT.emailDomain);
    window.location.href =
      String.fromCharCode(109, 97, 105, 108, 116, 111, 58) +
      address +
      '?subject=' +
      encodeURIComponent(copy.subject);
  };

  return (
    <p className={`text-caption font-sohne ${promptColour} ${className}`}>
      {copy.prompt}{' '}
      <button
        type="button"
        onClick={open}
        aria-label={`${copy.action} — email ${CONTACT.emailSpoken}`}
        className={`${linkColour} underline hover:opacity-70 transition-opacity`}
      >
        {copy.action}
      </button>
    </p>
  );
};

export default RequestAccess;
