import React from 'react';

/**
 * The national payment rail, drawn as two lanes.
 *
 * The top lane is where money actually moves — customer, their bank, the
 * WayaMe rails operated by Instant Payment Namibia, the seller's bank. The
 * bottom lane is this system, which is only ever told the outcome.
 *
 * The two-lane layout is the whole point. Every other way of drawing this
 * puts the sound box in the chain and implies it handles money. It does
 * not, and for a regulator that distinction is the first question asked.
 *
 * Split into two pieces rather than one component. `MoneyLane` is the part
 * that actually differs between a shop sale and a grant payment, so the
 * how-it-works page renders it twice, side by side. `ObserverLane` is
 * identical regardless of who paid — this system only ever listens — so it
 * renders once beneath both, rather than being duplicated verbatim in each
 * column. An earlier version bundled both into one component and rendering
 * it twice for the split view repeated the entire observer section word for
 * word, which read as a mistake rather than a comparison.
 */

export type RailStage =
  | 'idle'
  | 'scan'
  | 'customer_bank'
  | 'switch'
  | 'seller_bank'
  | 'settled'
  | 'observed'
  | 'announced';

const ORDER: RailStage[] = [
  'idle', 'scan', 'customer_bank', 'switch', 'seller_bank', 'settled', 'observed', 'announced',
];

/**
 * Two illustrations of the same architecture. The rails do not care whether
 * the payer is a customer or a government programme — the observation
 * position is identical either way — but a reader benefits from seeing that
 * stated concretely rather than taking it on faith. G2P is not a hypothetical
 * here: it is the single largest segment in the business plan at 100,000+
 * recipients (docs/business-plan.md §1.4), already a live use case on the
 * rails (docs/regulatory.md, `g2p` — social grant disbursement).
 */
export type RailVariant = 'p2b' | 'g2p';

const RAIL_NODES: Record<RailVariant, { id: RailStage; label: string; sub: string }[]> = {
  p2b: [
    { id: 'scan', label: 'Customer', sub: 'scans the printed code, approves in their app' },
    { id: 'customer_bank', label: 'Their bank', sub: 'debits the payer' },
    { id: 'switch', label: 'WayaMe', sub: 'routes bank to bank' },
    { id: 'seller_bank', label: 'Seller’s bank', sub: 'credits the seller' },
  ],
  // Government does not pay a beneficiary directly — it outsources
  // disbursement to institutions like NamPost or a commercial bank, and the
  // money moves from their account or till, not from a "government bank".
  // Verification is a paymaster or a cash agent, either one, scanning the
  // grant card's QR on a POS terminal plus a biometric and ID check.
  //
  // Two real settlement destinations, not one path plus an off-rails
  // exception, and not a 50/50 choice either — most beneficiaries do not
  // have a store of value today and rely on cash. Both destinations are the
  // same WayaMe bank-to-bank leg this device hears; only who receives it
  // changes:
  //   - Cash (the default for most beneficiaries today): WayaMe settles to
  //     the *agent's* account, reimbursing the till for the cash just
  //     handed over. This is `cash_out_merchant` in our own taxonomy (see
  //     `PAYMENT_KINDS`, "Cash paid out") — a recognised, logged payment
  //     kind, not something happening outside the rails.
  //   - Store of value, for those who have one: WayaMe settles straight to
  //     the beneficiary's own wallet or bank account, no agent account in
  //     between.
  // An earlier version of this node showed only the second case, and framed
  // it as an even choice; neither was accurate.
  g2p: [
    { id: 'scan', label: 'Paymaster', sub: 'Or agent — verifies biometrics and ID, scans the grant card QR on a POS terminal' },
    { id: 'customer_bank', label: 'Paying institution', sub: 'NamPost, a bank, or the agent’s own till' },
    { id: 'switch', label: 'WayaMe', sub: 'routes bank to bank' },
    { id: 'seller_bank', label: 'Agent or beneficiary', sub: 'Credits the agent for cash, or the beneficiary’s own wallet where they have one' },
  ],
};

const SETTLED_TEXT: Record<RailVariant, string> = {
  p2b: 'Money has moved. The seller has been paid.',
  // Not phrased as a 50/50 choice: most beneficiaries do not have a store of
  // value today and rely on cash, which is why cash-out is written as the
  // default rather than one option among equals — a wallet or bank account
  // is available to those who have one, not assumed of everyone.
  g2p: 'Money has moved — to the agent for cash, or to the beneficiary’s wallet where they have one.',
};

const reached = (current: RailStage, node: RailStage) =>
  ORDER.indexOf(current) >= ORDER.indexOf(node);

/**
 * A connector that reads as carrying something, not just coloured in.
 *
 * The sliding highlight is a `translateX`/`translateY` sweep rather than a
 * background animation — cheaper for the browser, and it reads unambiguously
 * as motion in one direction, which is the point on a diagram whose whole
 * argument is a direction of flow. `motion-reduce:animate-none` turns it off
 * for anyone who has asked their system for less motion; the connector still
 * shows its active colour either way.
 */
const FlowBar: React.FC<{
  active: boolean;
  className: string;
  activeClassName?: string;
  orientation?: 'horizontal' | 'vertical';
}> = ({ active, className, activeClassName = 'bg-brand-gradient-aa', orientation = 'horizontal' }) => (
  <span className={`relative block overflow-hidden transition-colors duration-300 ${className} ${active ? activeClassName : 'bg-mist'}`}>
    {active && (
      <span
        className={`absolute bg-paper/60 motion-reduce:animate-none ${
          orientation === 'vertical' ? 'inset-x-0 top-0 h-1/2 animate-flow-vertical' : 'inset-y-0 left-0 w-1/2 animate-flow'
        }`}
        aria-hidden="true"
      />
    )}
  </span>
);

/**
 * The four money-lane nodes for one payer, stacked vertically rather than
 * in the horizontal row the single-diagram version used. Two horizontal
 * rows side by side need real width each — enough to force a scrollbar the
 * moment the pair sits in a half-width column — while a vertical stack costs
 * only height, which the page has to spare.
 */
export const MoneyLane: React.FC<{ stage: RailStage; variant?: RailVariant; className?: string }> = ({
  stage,
  variant = 'p2b',
  className = '',
}) => {
  const settled = reached(stage, 'settled');
  const nodes = RAIL_NODES[variant];

  return (
    <div className={`bg-paper border border-mist rounded-cards p-16 ${className}`}>
      <div className="space-y-8">
        {nodes.map((n, i) => {
          const on = reached(stage, n.id);
          return (
            <React.Fragment key={n.id}>
              <div
                className={`rounded-inputs p-12 transition-colors duration-300 ${
                  on ? 'bg-brand-gradient-aa text-paper' : 'bg-mist text-ash'
                }`}
              >
                <p className="text-caption font-sohne font-450">{n.label}</p>
                <p className={`text-caption font-sohne mt-4 ${on ? 'opacity-70' : ''}`}>{n.sub}</p>
              </div>
              {i < nodes.length - 1 && (
                <div className="flex justify-center" aria-hidden="true">
                  <FlowBar
                    active={reached(stage, nodes[i + 1].id)}
                    className="w-2 h-16 rounded-full"
                    orientation="vertical"
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* Silent until something has actually happened, rather than a
          permanent "Awaiting settlement" placeholder in both columns at
          once — with two lanes sharing one stage, that line said the same
          nothing twice, simultaneously, for as long as the demo sat idle. */}
      {settled && (
        <p className="text-caption font-sohne mt-12 text-status-success transition-colors">
          {SETTLED_TEXT[variant]}
        </p>
      )}
    </div>
  );
};

/**
 * What this system does with the outcome — identical regardless of who
 * paid, so it renders once beneath however many `MoneyLane`s are showing.
 */
export const ObserverLane: React.FC<{ stage: RailStage; className?: string }> = ({
  stage,
  className = '',
}) => {
  const observed = reached(stage, 'observed');
  const announced = reached(stage, 'announced');

  return (
    <div className={className}>
      {/* Silent until observed, rather than a permanent "we can only listen,
          never instruct" sitting above a section already titled "What we
          do" that says the same thing — the page states this position
          elsewhere too (the hero, "Why a box, when a phone already has a
          screen"), so it did not need saying a third time at rest. */}
      <div className="flex items-center gap-12 mb-12 pl-16">
        {observed && <span className="text-caption font-sohne text-ash">WayaMe tells us the outcome</span>}
        <FlowBar active={observed} className="flex-1 h-px" activeClassName="bg-sienna" />
      </div>

      <p className="text-caption font-sohne text-ash mb-8">What we do</p>
      <div className="bg-blush-tint border border-mist rounded-cards p-16">
        <div className="flex items-stretch gap-8">
          <div
            className={`flex-1 rounded-inputs p-12 transition-colors duration-300 ${
              observed ? 'bg-sienna text-paper' : 'bg-mist text-ash'
            }`}
          >
            <p className="text-caption font-sohne font-450">Receive the outcome</p>
            <p className={`text-caption font-sohne mt-4 ${observed ? 'opacity-70' : ''}`}>
              a notification, not an instruction
            </p>
          </div>
          <div className="flex items-center shrink-0" aria-hidden="true">
            <FlowBar active={announced} className="w-16 h-2 rounded-full" activeClassName="bg-sienna" />
          </div>
          <div
            className={`flex-1 rounded-inputs p-12 transition-colors duration-300 ${
              announced ? 'bg-sienna text-paper' : 'bg-mist text-ash'
            }`}
          >
            <p className="text-caption font-sohne font-450">Say it out loud</p>
            <p className={`text-caption font-sohne mt-4 ${announced ? 'opacity-70' : ''}`}>
              and record what was heard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
