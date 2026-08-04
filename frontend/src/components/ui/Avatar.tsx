import React from 'react';
import buffrMark from '../../assets/brand/buffr-icon.png';

interface AvatarProps {
  name: string;
  /** The account's address, used only to recognise the shared team account. */
  email?: string;
  tint?: 'green' | 'blue' | 'peach';
  className?: string;
}

// Design-system tints only. This previously reached for Tailwind's default
// green/blue palette, which sits outside the near-monochrome system and
// showed up as the only saturated colour on an otherwise achromatic page.
const TINTS: Record<string, string> = {
  green: 'bg-status-success/10 text-status-success',
  blue: 'bg-mist text-slate',
  peach: 'bg-peach text-sienna',
};

/**
 * The shared team account carries the mark rather than initials.
 *
 * It is not a person, so initials misrepresent it: "TB" beside an entry in a
 * status log reads as a named reviewer, and on an audit trail the difference
 * between a person and a shared mailbox is exactly what a reader needs to be
 * able to tell at a glance.
 */
const TEAM_ACCOUNT = 'team@buffranalytics.com';

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

/** 40px circular presence indicator — initials, or the mark for the team account. */
const Avatar: React.FC<AvatarProps> = ({ name, email, tint = 'peach', className = '' }) => {
  if (email?.trim().toLowerCase() === TEAM_ACCOUNT) {
    return (
      <img
        src={buffrMark}
        alt={name}
        title={name}
        width={40}
        height={40}
        className={`inline-block w-40 h-40 rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center w-40 h-40 rounded-full text-caption font-sohne font-medium ${TINTS[tint]} ${className}`}
      title={name}
    >
      {initials(name)}
    </span>
  );
};

export default Avatar;
