import React from 'react';

interface AvatarProps {
  name: string;
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

const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

/** 40px circular monogram bubble — user/reviewer presence indicator. */
const Avatar: React.FC<AvatarProps> = ({ name, tint = 'peach', className = '' }) => (
  <span
    className={`inline-flex items-center justify-center w-40 h-40 rounded-full text-caption font-sohne font-medium ${TINTS[tint]} ${className}`}
    title={name}
  >
    {initials(name)}
  </span>
);

export default Avatar;
