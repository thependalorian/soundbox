import React from 'react';
import { RailStage, RailVariant } from './PaymentRailDiagram';
import { AXIS, GRID, DATA, PLUM } from '../../lib/chartTokens';

/**
 * The complete payment sequence, drawn as a proper sequence diagram.
 *
 * Five lifelines, every hop shown. Nothing is collapsed into "the payment
 * happens" — the point of this diagram is that a reader can follow the money
 * from the customer's thumb to the seller's account and see that our lane
 * only ever *asks*.
 *
 * Hand-drawn SVG rather than a diagramming library: it animates with the
 * live demo state, needs no dependency, and stays crisp at any density.
 */

type ByVariant = Record<RailVariant, string>;

interface Lane {
  id: string;
  label: ByVariant;
  sub: ByVariant;
  observer?: boolean;
}

/**
 * Two label sets over one structural diagram — see PaymentRailDiagram for
 * why. `n`, `from`, `to`, `at`, `dashed` and `self` never change between
 * variants: the sequence of hops is identical whichever payer is on the
 * other end, only who they are changes.
 */
const LANES: Lane[] = [
  { id: 'customer', label: { p2b: 'Customer', g2p: 'Paymaster' }, sub: { p2b: 'their own bank’s app', g2p: 'or a cash agent — POS terminal' } },
  { id: 'payer_bank', label: { p2b: 'Their bank', g2p: 'Paying institution' }, sub: { p2b: 'holds the money', g2p: 'NamPost, a bank, or a till' } },
  { id: 'switch', label: { p2b: 'WayaMe', g2p: 'WayaMe' }, sub: { p2b: 'the national rails', g2p: 'the national rails' } },
  { id: 'payee_bank', label: { p2b: 'Seller’s bank', g2p: 'Agent or beneficiary' }, sub: { p2b: 'receives it', g2p: 'agent for cash, or their wallet' } },
  { id: 'box', label: { p2b: 'SoundBox', g2p: 'SoundBox' }, sub: { p2b: 'listens only', g2p: 'listens only' }, observer: true },
];

interface Step {
  n: number;
  from: string;
  to: string;
  label: ByVariant;
  /** Earliest rail stage at which this step has happened. */
  at: RailStage;
  dashed?: boolean;
  self?: boolean;
}

/** Every hop. Deliberately not abbreviated. */
const STEPS: Step[] = [
  { n: 1, from: 'customer', to: 'customer', label: { p2b: 'Scans the seller’s printed code', g2p: 'Scans the grant card QR on a POS terminal' }, at: 'scan', self: true },
  { n: 2, from: 'customer', to: 'customer', label: { p2b: 'Types the amount, approves with PIN', g2p: 'Verifies with biometrics and ID' }, at: 'scan', self: true },
  { n: 3, from: 'customer', to: 'payer_bank', label: { p2b: 'Payment instruction', g2p: 'Disbursement instruction' }, at: 'customer_bank' },
  { n: 4, from: 'payer_bank', to: 'payer_bank', label: { p2b: 'Checks funds, debits the payer', g2p: 'Checks funds, debits the disbursement account' }, at: 'customer_bank', self: true },
  { n: 5, from: 'payer_bank', to: 'switch', label: { p2b: 'Sends it onto the WayaMe rails', g2p: 'Sends it onto the WayaMe rails' }, at: 'switch' },
  { n: 6, from: 'switch', to: 'payee_bank', label: { p2b: 'Routes to the seller’s bank', g2p: 'Routes to the agent or the beneficiary’s wallet' }, at: 'seller_bank' },
  { n: 7, from: 'payee_bank', to: 'payee_bank', label: { p2b: 'Credits the seller', g2p: 'Credits the agent for cash, or the beneficiary directly' }, at: 'seller_bank', self: true },
  { n: 8, from: 'payee_bank', to: 'switch', label: { p2b: 'Confirms the credit', g2p: 'Confirms the credit' }, at: 'settled' },
  // Push, not poll. The device holds an outbound connection open to the
  // broker, so confirmations arrive in real time and NAT is never an issue.
  // Proven at scale on the Indian instant-payment rails that Namibia's own
  // platform is derived from; it matters most on exactly the weak networks
  // where polling costs the most.
  { n: 9, from: 'switch', to: 'box', label: { p2b: 'Pushes the outcome to the device', g2p: 'Pushes the outcome to the device' }, at: 'observed', dashed: true },
  { n: 10, from: 'box', to: 'switch', label: { p2b: 'If the push was missed, asks WayaMe for status', g2p: 'If the push was missed, asks WayaMe for status' }, at: 'observed', dashed: true },
  { n: 11, from: 'box', to: 'box', label: { p2b: 'Says the amount out loud, records it', g2p: 'Says the amount out loud, records it' }, at: 'announced', self: true },
];

const ORDER: RailStage[] = [
  'idle', 'scan', 'customer_bank', 'switch', 'seller_bank', 'settled', 'observed', 'announced',
];
const done = (current: RailStage, at: RailStage) => ORDER.indexOf(current) >= ORDER.indexOf(at);

/** Checked once per render rather than watched — this practically never
 *  changes mid-session, and the cost of asking is one matchMedia call. */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const SELF_LOOP_W = 40;

const LANE_W = 176;
const HEAD_H = 64;
const STEP_H = 46;
const PAD_X = 16;
const WIDTH = PAD_X * 2 + LANE_W * LANES.length;
const HEIGHT = HEAD_H + STEP_H * STEPS.length + 32;

const laneX = (id: string) => {
  const i = LANES.findIndex((l) => l.id === id);
  return PAD_X + LANE_W * i + LANE_W / 2;
};

const PaymentSequenceDiagram: React.FC<{ stage: RailStage; variant?: RailVariant; className?: string }> = ({
  stage,
  variant = 'p2b',
  className = '',
}) => {
  const reduceMotion = prefersReducedMotion();

  return (
  <div className={`overflow-x-auto ${className}`}>
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH}
      className="min-w-[880px]"
      role="img"
      aria-label={
        variant === 'g2p'
          ? 'Sequence diagram of a WayaMe grant disbursement, settling to the agent for cash or to the beneficiary’s wallet, with the SoundBox listening'
          : 'Sequence diagram of a WayaMe payment from customer to seller, with the SoundBox listening'
      }
    >
      <defs>
        <marker id="arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={PLUM} />
        </marker>
        <marker id="arrow-off" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={AXIS} />
        </marker>
        <marker id="arrow-obs" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={DATA} />
        </marker>
      </defs>

      {/* Separator marking where our lane begins */}
      <line
        x1={PAD_X + LANE_W * 4} y1={8}
        x2={PAD_X + LANE_W * 4} y2={HEIGHT - 8}
        stroke={GRID} strokeWidth={2} strokeDasharray="2 6"
      />

      {/* Lane headers + lifelines */}
      {LANES.map((lane) => {
        const x = laneX(lane.id);
        return (
          <g key={lane.id}>
            <rect
              x={x - LANE_W / 2 + 8} y={8}
              width={LANE_W - 16} height={44} rx={12}
              fill={lane.observer ? '#FDEEF2' : '#F6F1F2'}
            />
            <text x={x} y={26} textAnchor="middle" fontSize="13" fontWeight="500"
                  fill={lane.observer ? DATA : PLUM} fontFamily="Inter, sans-serif">
              {lane.label[variant]}
            </text>
            <text x={x} y={42} textAnchor="middle" fontSize="11"
                  fill={lane.observer ? DATA : '#705C67'} fontFamily="Inter, sans-serif">
              {lane.sub[variant]}
            </text>
            <line x1={x} y1={HEAD_H - 8} x2={x} y2={HEIGHT - 12}
                  stroke={lane.observer ? '#FDEEF2' : '#F6F1F2'} strokeWidth={2} />
          </g>
        );
      })}

      {/* Steps */}
      {STEPS.map((s, i) => {
        const y = HEAD_H + STEP_H * i + 18;
        const on = done(stage, s.at);
        const observer = s.from === 'box' || s.to === 'box';
        const stroke = !on ? AXIS : observer ? DATA : PLUM;
        const marker = !on ? 'arrow-off' : observer ? 'arrow-obs' : 'arrow-on';
        const x1 = laneX(s.from);
        const x2 = laneX(s.to);

        // A second, undirected path traced on top of the real one — a
        // short bright dash animated along `stroke-dashoffset` so it reads
        // as a pulse travelling from start to end rather than a static
        // colour change. Coincident with the base path, so it only ever
        // draws over the line's own route, never onto the blank canvas.
        const showFlow = on && !reduceMotion;

        if (s.self) {
          const w = SELF_LOOP_W;
          const d = `M${x1},${y} h${w} v18 h-${w}`;
          const length = w + 18 + w;
          return (
            <g key={s.n} opacity={on ? 1 : 0.45}>
              <path
                d={d}
                fill="none" stroke={stroke} strokeWidth={1.5}
                strokeDasharray={s.dashed ? '4 3' : undefined}
                markerEnd={`url(#${marker})`}
              />
              {showFlow && (
                <path
                  d={d} fill="none" stroke="#FFFFFF" strokeOpacity={0.9}
                  strokeWidth={2.4} strokeLinecap="round" strokeDasharray="14 400"
                >
                  <animate attributeName="stroke-dashoffset" from="0" to={-(length + 14)} dur="1s" repeatCount="indefinite" />
                </path>
              )}
              <text x={x1 + w + 10} y={y + 4} fontSize="11.5" fill={stroke} fontFamily="Inter, sans-serif">
                {s.n}. {s.label[variant]}
              </text>
            </g>
          );
        }

        const dir = x2 > x1 ? 1 : -1;
        const lx1 = x1 + 6 * dir;
        const lx2 = x2 - 8 * dir;
        const length = Math.abs(lx2 - lx1);
        return (
          <g key={s.n} opacity={on ? 1 : 0.45}>
            <line
              x1={lx1} y1={y} x2={lx2} y2={y}
              stroke={stroke} strokeWidth={1.5}
              strokeDasharray={s.dashed ? '4 3' : undefined}
              markerEnd={`url(#${marker})`}
            />
            {showFlow && (
              <line
                x1={lx1} y1={y} x2={lx2} y2={y}
                stroke="#FFFFFF" strokeOpacity={0.9}
                strokeWidth={2.4} strokeLinecap="round" strokeDasharray="14 400"
              >
                <animate attributeName="stroke-dashoffset" from="0" to={-(length + 14)} dur="1s" repeatCount="indefinite" />
              </line>
            )}
            <text
              x={(x1 + x2) / 2} y={y - 7} textAnchor="middle"
              fontSize="11.5" fill={stroke} fontFamily="Inter, sans-serif"
            >
              {s.n}. {s.label[variant]}
            </text>
          </g>
        );
      })}
    </svg>
  </div>
  );
};

export default PaymentSequenceDiagram;
