import React, { useState } from 'react';

/**
 * Five classifiers, scored on the two measures that disagree.
 *
 * **The disagreement is the content.** A single "97% accurate" number is what
 * a vendor publishes; a table where the most accurate model is not the best
 * detector is what someone who actually ran the comparison publishes. Showing
 * the ranking flip — and the rule used to break it — is more persuasive to a
 * supervisor than any single figure, because it demonstrates a method for
 * choosing rather than a claim about an outcome.
 *
 * `lift` is detection divided by the model's own error rate on ordinary
 * payments. Without it a weaker model wins on raw detection simply by being
 * wrong more often, which is the trap the sortable columns let a reader find
 * for themselves.
 *
 * Figures are from a run of `backend/notebooks/anomaly_detection.ipynb` on
 * generated data and move between runs.
 */

export interface ModelRow {
  model: string;
  accuracy: number;
  detection: number;
  lift: number;
  auc: number;
}

export const DEFAULT_MODELS: ModelRow[] = [
  { model: 'LightGBM', accuracy: 85.7, detection: 33.0, lift: 2.31, auc: 0.926 },
  { model: 'Random forest', accuracy: 84.3, detection: 35.8, lift: 2.28, auc: 0.905 },
  { model: 'Decision tree', accuracy: 82.0, detection: 40.5, lift: 2.26, auc: 0.833 },
  { model: 'Gradient boosting', accuracy: 85.8, detection: 31.8, lift: 2.24, auc: 0.925 },
  { model: 'Logistic regression', accuracy: 81.9, detection: 35.5, lift: 1.96, auc: 0.868 },
];

type SortKey = 'accuracy' | 'detection' | 'lift';

const COLUMNS: { key: SortKey; label: string; hint: string }[] = [
  { key: 'accuracy', label: 'Accuracy', hint: 'on ordinary payments' },
  { key: 'detection', label: 'Detection', hint: 'of manipulated payments' },
  { key: 'lift', label: 'Lift', hint: 'detection over its own error rate' },
];

const ModelComparison: React.FC<{ rows?: ModelRow[]; className?: string }> = ({
  rows = DEFAULT_MODELS,
  className = '',
}) => {
  const [sort, setSort] = useState<SortKey>('lift');
  const sorted = [...rows].sort((a, b) => b[sort] - a[sort]);
  const max = Math.max(...rows.map((r) => r[sort]));
  const winner = sorted[0].model;

  return (
    <figure className={className}>
      <div className="flex flex-wrap gap-8 mb-24">
        {COLUMNS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setSort(c.key)}
            aria-pressed={sort === c.key}
            className={`rounded-full px-16 py-8 text-caption font-sohne transition-colors
                        duration-300 ease-brand motion-reduce:transition-none ${
                          sort === c.key
                            ? 'bg-brand-gradient-aa text-paper'
                            : 'bg-mist text-slate hover:text-ink'
                        }`}
          >
            Rank by {c.label.toLowerCase()}
          </button>
        ))}
      </div>

      <ul className="space-y-16">
        {sorted.map((r) => {
          const v = r[sort];
          const top = r.model === winner;
          return (
            <li key={r.model}>
              <div className="flex items-baseline justify-between gap-16">
                <span
                  className={`text-body font-sohne ${top ? 'text-ink font-450' : 'text-slate'}`}
                >
                  {r.model}
                </span>
                <span className="text-caption font-mono text-ash tabular-nums shrink-0">
                  {sort === 'lift' ? `${v.toFixed(2)}x` : `${v.toFixed(1)}%`}
                </span>
              </div>
              <div className="mt-6 h-12 rounded-full bg-mist/70 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ease-brand
                              motion-reduce:transition-none ${
                                top ? 'bg-brand-gradient-aa' : 'bg-blush'
                              }`}
                  style={{ width: `${(v / max) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-caption font-sohne text-ash mt-24 max-w-prose">
        Rank by each column in turn: the most accurate model is not the best detector, and the
        best raw detector is the least accurate one. Selecting on lift resolves that — it asks
        whether a manipulated payment is <em>more</em> likely to be caught than an ordinary one,
        rather than rewarding a model for being wrong more often. Figures from a run on generated
        data.
      </p>
    </figure>
  );
};

export default ModelComparison;
