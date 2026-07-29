import React from 'react';

interface BrowserFrameProps {
  label?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Chrome around a live-rendered slice of the real product UI.
 *
 * These artifacts are built from the same tokens and components as the app
 * rather than being screenshots, so they cannot drift out of date, add no
 * binary assets, and stay crisp at any density. `shadow-subtle-3` is the
 * system's one shadow and is reserved for exactly this — a floating product
 * artifact.
 */
const BrowserFrame: React.FC<BrowserFrameProps> = ({ label, children, className = '' }) => (
  <div className={`bg-paper rounded-elevatedCards shadow-subtle-3 overflow-hidden ${className}`}>
    <div className="flex items-center gap-8 px-16 h-40 border-b border-mist bg-blush-tint">
      <span className="w-8 h-8 rounded-full bg-mist" />
      <span className="w-8 h-8 rounded-full bg-mist" />
      <span className="w-8 h-8 rounded-full bg-mist" />
      {label && <span className="ml-8 text-caption font-sohne text-ash truncate">{label}</span>}
    </div>
    <div className="p-20">{children}</div>
  </div>
);

export default BrowserFrame;
