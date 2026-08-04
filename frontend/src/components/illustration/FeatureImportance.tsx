import React from 'react';

/**
 * Mean absolute SHAP value per feature: what the model actually leans on.
 *
 * **This is the one chart that proves the claim.** "Every score is
 * explainable" is a sentence any vendor can write. A ranked feature-importance
 * plot is the artefact that sentence refers to — and putting it on a public
 * page says the explanation exists and can be inspected, rather than asking a
 * supervisor to take it on faith.
 *
 * Bars are grouped by feature family, because the finding is not really which
 * single column won — it is that **counterparty-relative timing outranks the
 * payment amount**. That result is what justifies asking a rails operator for
 * an identifier on both sides of a payment rather than only the receiving
 * business, so the chart is also the evidence behind the data request.
 *
 * Figures come from a run of `backend/notebooks/anomaly_detection.ipynb` on
 * generated data. They move between runs, which is why the caption says so.
 */

export interface Feature {
  name: string;
  /** Mean |SHAP|. */
  value: number;
  family: 'intraday' | 'basic' | 'timestamp';
}

const FAMILY_COLOUR: Record<Feature['family'], string> = {
  intraday: '#E6136C',
  basic: '#F15A29',
  timestamp: '#3D1152',
};

const FAMILY_LABEL: Record<Feature['family'], string> = {
  intraday: 'Counterparty timing',
  basic: 'Payment attributes',
  timestamp: 'Calendar',
};

export const DEFAULT_FEATURES: Feature[] = [
  { name: 'Time since this payee was last paid', value: 1.307, family: 'intraday' },
  { name: 'Payer is an individual', value: 1.258, family: 'basic' },
  { name: 'Time since this payer last paid', value: 0.825, family: 'intraday' },
  { name: 'Use case is person-to-business', value: 0.571, family: 'basic' },
  { name: 'Time since same payer, same use case', value: 0.336, family: 'intraday' },
  { name: 'Amount', value: 0.214, family: 'basic' },
  { name: 'Use case is person-to-person', value: 0.144, family: 'basic' },
  { name: 'Response time', value: 0.120, family: 'basic' },
];

const FeatureImportance: React.FC<{
  features?: Feature[];
  className?: string;
  caption?: string;
}> = ({ features = DEFAULT_FEATURES, className = '', caption }) => {
  const max = Math.max(...features.map((f) => f.value));
  const families = Array.from(new Set(features.map((f) => f.family)));

  return (
    <figure className={className}>
      <div className="flex flex-wrap gap-x-24 gap-y-8 mb-24">
        {families.map((fam) => (
          <span key={fam} className="inline-flex items-center gap-8 text-caption font-sohne">
            <span
              aria-hidden="true"
              className="w-12 h-12 rounded-[3px] shrink-0"
              style={{ background: FAMILY_COLOUR[fam] }}
            />
            <span className="text-slate">{FAMILY_LABEL[fam]}</span>
          </span>
        ))}
      </div>

      <ul className="space-y-16">
        {features.map((f) => (
          <li key={f.name}>
            <div className="flex items-baseline justify-between gap-16">
              <span className="text-caption font-sohne text-ink">{f.name}</span>
              <span className="text-caption font-mono text-ash tabular-nums shrink-0">
                {f.value.toFixed(2)}
              </span>
            </div>
            {/* A track behind every bar, so a short bar still reads as a
                measured value against a scale rather than as a stub. */}
            <div className="mt-6 h-10 rounded-full bg-mist/70 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-brand
                           motion-reduce:transition-none"
                style={{ width: `${(f.value / max) * 100}%`, background: FAMILY_COLOUR[f.family] }}
              />
            </div>
          </li>
        ))}
      </ul>

      <figcaption className="text-caption font-sohne text-ash mt-24 max-w-prose">
        {caption ??
          'Mean absolute SHAP value per feature, from a run on generated data. The top signal is how long it has been since this counterparty was last paid — ahead of the amount. That ordering is why an identifier on both sides of a payment is worth asking for.'}
      </figcaption>
    </figure>
  );
};

export default FeatureImportance;
