import React from 'react';
import { Link } from 'react-router-dom';

interface PageActionProps {
  /** What the operator should do, phrased as the action itself. */
  label: string;
  to?: string;
  onClick?: () => void;
  /** Why now — a count, an amount, a deadline. Omitted when there is nothing pressing. */
  context?: string;
  /** Draws attention when the queue is non-empty. */
  urgent?: boolean;
  className?: string;
}

/**
 * The one thing to do on this page.
 *
 * Every operator screen previously displayed data and stopped, leaving
 * "what should I do now?" unanswered. This sits under the page heading and
 * answers it — with the reason attached, because an action without a count
 * behind it is a guess.
 *
 * Deliberately singular. A page offering four equally-weighted buttons has
 * not decided what matters, and pushes that decision onto someone with less
 * context than the page has.
 */
const PageAction: React.FC<PageActionProps> = ({
  label,
  to,
  onClick,
  context,
  urgent = false,
  className = '',
}) => {
  const body = (
    <>
      <span className="text-body font-sohne">{label}</span>
      {context && (
        <span className={`text-caption font-sohne ${urgent ? 'opacity-80' : 'text-ash'}`}>
          {context}
        </span>
      )}
    </>
  );

  const shell = `inline-flex items-center gap-12 rounded-buttons px-20 py-12 transition-colors ${
    urgent
      ? 'bg-brand-gradient-aa text-paper hover:opacity-90'
      : 'bg-blush text-ink hover:bg-blush/70'
  } ${className}`;

  if (to) {
    return (
      <Link to={to} className={shell}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={shell}>
      {body}
    </button>
  );
};

export default PageAction;
