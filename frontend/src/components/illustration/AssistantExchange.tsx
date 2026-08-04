import React from 'react';
import { ShareBars } from '../charts/primitives';

/**
 * A question, the query it resolved to, and the answer as a chart.
 *
 * **The middle step is the reason this exists.** Every product with a chat box
 * shows a question and an answer; showing the *named function it called* is
 * what separates a system that queries a reviewed calculation from one that
 * generates prose. A supervisor reading this can see there is a fixed surface
 * between the question and the number, which is the security, audit and
 * reconciliation argument in a single frame.
 *
 * The refusal beneath it matters as much as the answer. A system that always
 * produces something is a system that will eventually produce something
 * wrong, and being able to point at a question it declines is stronger
 * evidence of discipline than any accuracy figure.
 */
const AssistantExchange: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`rounded-shell bg-mist/60 p-6 ${className}`}>
    <div className="rounded-shellInner bg-paper p-24 sm:p-32">
      {/* The question. */}
      <div className="flex justify-end">
        <p className="text-body font-sohne text-ink bg-mist rounded-cards px-20 py-12 max-w-prose">
          Which region has the highest share of wallet-funded payments this month?
        </p>
      </div>

      {/* The named call. Monospace, because this is the one part of the page
          that is literally an identifier in the codebase. */}
      <div className="mt-24 flex flex-wrap items-center gap-8">
        <span className="inline-flex items-center gap-8 rounded-full bg-blush px-12 py-6">
          <span className="w-8 h-8 rounded-full bg-status-success" aria-hidden="true" />
          <code className="text-caption font-mono text-sienna">get_inclusion_metrics</code>
        </span>
        <span className="text-caption font-sohne text-ash">
          one of a fixed set of reviewed functions — never generated SQL
        </span>
      </div>

      {/* The answer, as the chart it actually is. */}
      <div className="mt-24">
        <p className="text-body font-sohne text-ink max-w-prose">
          Kavango East, at 78% wallet-funded, against a national average of 41%. Based on 1,240
          payments in the last 30 days.
        </p>
        <ShareBars
          className="mt-20"
          data={[
            { label: 'Kavango East', value: 78 },
            { label: 'Ohangwena', value: 66 },
            { label: 'Omusati', value: 59 },
            { label: 'National average', value: 41 },
            { label: 'Khomas', value: 32 },
          ]}
        />
        <p className="text-caption font-sohne text-ash mt-16">
          Every answer carries the count it was computed over. A share quoted without its
          denominator is arithmetic, not evidence.
        </p>
      </div>

      {/* The refusal. */}
      <div className="mt-32 pt-24 border-t border-mist">
        <div className="flex justify-end">
          <p className="text-body font-sohne text-ink bg-mist rounded-cards px-20 py-12 max-w-prose">
            Which agents are about to run out of float?
          </p>
        </div>
        <div className="mt-20 flex flex-wrap items-center gap-8">
          <span className="inline-flex items-center gap-8 rounded-full bg-mist px-12 py-6">
            <span className="w-8 h-8 rounded-full bg-status-warning" aria-hidden="true" />
            <code className="text-caption font-mono text-slate">no matching function</code>
          </span>
        </div>
        <p className="text-body font-sohne text-slate mt-16 max-w-prose">
          That cannot be answered from payment-rail data alone — it needs agent balances held by
          the institutions themselves. The assistant says so rather than estimating, because a
          plausible number here would be indistinguishable from a real one.
        </p>
      </div>
    </div>
  </div>
);

export default AssistantExchange;
