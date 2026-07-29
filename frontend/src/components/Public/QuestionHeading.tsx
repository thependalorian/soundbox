import React from 'react';

interface QuestionHeadingProps {
  /** The model doing the work, e.g. "Anomaly scoring". Rendered as a small
   *  label above the question. */
  label: string;
  /** What a regulator actually wants answered. The dominant line. */
  question: string;
  /** `onGradient` for the emphasis band, which needs light-on-dark type. */
  tone?: 'light' | 'onGradient';
  className?: string;
}

/**
 * The section heading on the regulator page: a capability label above the
 * business question it answers.
 *
 * Extracted rather than pasted at each of the seven sections — the same
 * duplication `TitleDetailCardGrid` exists to solve. Seven copies of an
 * eyebrow-plus-heading pair is exactly how the eyebrow ends up tracked
 * differently on section five than on section one.
 *
 * The eyebrow treatment is not new: it follows the existing label on
 * `ForMerchantsPage` (caption, ash, uppercase, tracked), with the
 * light-on-dark variant taken from `PageHero`'s own eyebrow. No new tokens.
 */
const QuestionHeading: React.FC<QuestionHeadingProps> = ({
  label,
  question,
  tone = 'light',
  className = '',
}) => {
  const onGradient = tone === 'onGradient';

  return (
    <div className={className}>
      <p
        className={`text-caption font-sohne uppercase tracking-[0.1em] mb-16 ${
          onGradient ? 'text-paper/80' : 'text-ash'
        }`}
      >
        {label}
      </p>
      <h2
        className={`text-heading font-signifier max-w-[680px] ${
          onGradient ? 'text-paper' : 'text-ink'
        }`}
      >
        {question}
      </h2>
    </div>
  );
};

export default QuestionHeading;
