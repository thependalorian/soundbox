import React, { useCallback, useEffect, useRef, useState } from 'react';
import SoundBoxDevice, { DeviceState } from './SoundBoxDevice';
import { MoneyLane, ObserverLane, RailStage, RailVariant } from './PaymentRailDiagram';
import PaymentSequenceDiagram from './PaymentSequenceDiagram';
import Card from '../ui/Card';
import Button from '../ui/Button';
import StatusPill from '../ui/StatusPill';
import EmptyState from '../ui/EmptyState';
import { speak, whenVoicesReady } from '../../lib/speech';

/**
 * The interactive payment demo: rail diagram, the live device, the sequence
 * diagram, and the resulting ledger — four sections sharing one run of
 * scripted state.
 *
 * Runs entirely in the browser with no backend. That is a requirement, not
 * a shortcut: this lives on a page meant to be shared as a link, and a demo
 * that depends on someone having started a FastAPI process is not shareable.
 *
 * Timings and outcomes are scripted rather than random so the same link
 * shows the same story every time — including the failure path, which is
 * the more interesting half.
 */

interface DemoTxn {
  ref: string;
  amount: number;
  outcome: 'success' | 'pending' | 'duplicate';
  retries: number;
  at: string;
}

const SCENARIOS = [
  {
    id: 'happy',
    label: 'Normal payment',
    description: 'A customer scans, pays, and the merchant hears confirmation.',
  },
  {
    id: 'offline',
    label: 'Network drops mid-payment',
    description: 'The box keeps checking, says it is still waiting, and announces the result once it can reach WayaMe again.',
  },
  {
    id: 'duplicate',
    label: 'The same payment is reported twice',
    description: 'A retry that actually succeeded reports again. It is announced once and counted once.',
  },
] as const;

type ScenarioId = (typeof SCENARIOS)[number]['id'];

/**
 * Announcement languages. Namibia's largest first-language group speaks
 * Oshiwambo; an English-only box excludes much of the target market, so
 * language is shown here as a first-class control rather than a setting.
 * The firmware already reserves this (firmware/src/audio.h `language_code`).
 */
const LANGUAGES = [
  { code: 'en', tag: 'en-ZA', label: 'English', say: (a: string) => `${a} received` },
  { code: 'af', tag: 'af-ZA', label: 'Afrikaans', say: (a: string) => `${a} ontvang` },
  // No speech engine anywhere supports Oshiwambo — it is a low-resource
  // language absent from every major TTS platform, despite being spoken in
  // roughly half of Namibian households. The browser will approximate it
  // with whatever voice it has; the real device plays a human recording,
  // which is the only honest way to serve this language at all.
  { code: 'ng', tag: 'en-ZA', label: 'Oshiwambo', say: (a: string) => `${a} ya monika`, recorded: true },
] as const;

/** Connection quality. 2G is not a rounding error here — it is the last mile. */
const NETWORKS = [
  { id: '4g', label: '4G', factor: 1 },
  { id: '2g', label: '2G', factor: 2.6 },
] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nad = (n: number) => `N$${n.toFixed(2)}`;

const PaymentDemo: React.FC = () => {
  const [state, setState] = useState<DeviceState>('idle');
  const [caption, setCaption] = useState<string>();
  const [log, setLog] = useState<string[]>([]);
  const [txns, setTxns] = useState<DemoTxn[]>([]);
  const [running, setRunning] = useState(false);
  const [voice, setVoice] = useState(false);
  const [stage, setStage] = useState<RailStage>('idle');
  // Which concrete story the sequence diagram tells (the rail diagram shows
  // both at once, split screen, and needs no toggle). The observer
  // architecture is identical either way — that is the point of offering
  // both — so this only relabels PaymentSequenceDiagram; it does not change
  // the scripted run below, which stays the shop-sale story throughout.
  const [variant, setVariant] = useState<RailVariant>('p2b');
  const [lang, setLang] = useState<typeof LANGUAGES[number]>(LANGUAGES[0]);
  const [network, setNetwork] = useState<typeof NETWORKS[number]>(NETWORKS[0]);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Voice lists populate asynchronously in every browser, so load once up
  // front rather than discovering an empty list mid-announcement.
  useEffect(() => {
    let alive = true;
    whenVoicesReady().then((v) => alive && setVoices(v));
    return () => {
      alive = false;
    };
  }, []);
  const counter = useRef(1);

  const say = useCallback(
    (line: string) => {
      setCaption(line);
      // Off by default — an unsolicited voice on a shared link is hostile,
      // and autoplay policy would block it anyway.
      if (voice) speak(line, { lang: lang.tag, voices });
    },
    [voice, lang, voices]
  );

  const step = useCallback((line: string) => setLog((prev) => [...prev, line]), []);

  const run = useCallback(
    async (scenario: ScenarioId) => {
      if (running) return;
      setRunning(true);
      setLog([]);
      setCaption(undefined);
      setStage('idle');

      const amount = Math.round((45 + counter.current * 17.35) * 100) / 100;
      const ref = `TXN-${String(1000 + counter.current).padStart(5, '0')}`;
      // Everything is slower on 2G. The same script, stretched, is the
      // clearest way to show why the last mile drives the design.
      const wait = (ms: number) => sleep(ms * network.factor);
      const spoken = lang.say(nad(amount));

      setState('processing');
      setStage('scan');
      step('Customer scans the seller’s code');
      await wait(700);

      // The payment itself happens between the customer's app, their bank
      // and WayaMe. This device is not in that path — it is waiting to
      // be told the outcome, which is why every line is observation.
      setStage('customer_bank');
      step(`Customer approves ${nad(amount)} in their own app`);
      await wait(600);
      setStage('switch');
      step('Their bank sends it onto the WayaMe rails');
      await wait(600);
      setStage('seller_bank');
      step('WayaMe routes it to the seller’s bank, bank to bank');
      await wait(600);
      setStage('settled');
      step('Money has moved. The seller has been paid.');
      await wait(400);

      if (scenario === 'happy') {
        setStage('observed');
        step('WayaMe tells us the outcome');
        await wait(400);
        setStage('announced');
        setState('success');
        say(spoken);
        step(`SoundBox announces it — “${spoken}”`);
        setTxns((p) => [{ ref, amount, outcome: 'success', retries: 0, at: new Date().toLocaleTimeString() }, ...p]);
      }

      if (scenario === 'offline') {
        for (let attempt = 1; attempt <= 3; attempt++) {
          setState('processing');
          step(`Cannot reach WayaMe — checking again (${attempt} of 3)`);
          await wait(500 * attempt);
        }
        setState('pending');
        say('Payment pending. Please check your network.');
        step('Says pending rather than going silent, so nothing is handed over yet');
        await wait(1200);
        setState('processing');
        setStage('observed');
        step('Network back — asking WayaMe what happened');
        await wait(700);
        setStage('announced');
        setState('success');
        say(spoken);
        step('It had already gone through. The money was never at risk — only the announcement was late.');
        setTxns((p) => [{ ref, amount, outcome: 'pending', retries: 3, at: new Date().toLocaleTimeString() }, ...p]);
      }

      if (scenario === 'duplicate') {
        setStage('observed');
        await wait(300);
        setStage('announced');
        setState('success');
        say(spoken);
        step('Announced once');
        setTxns((p) => [{ ref, amount, outcome: 'success', retries: 0, at: new Date().toLocaleTimeString() }, ...p]);
        await wait(900);
        step(`The same payment ${ref} is reported a second time`);
        await wait(500);
        step('Recognised as the same payment — not announced again, not counted again');
        setTxns((p) => [{ ref, amount, outcome: 'duplicate', retries: 0, at: new Date().toLocaleTimeString() }, ...p]);
      }

      counter.current += 1;
      await sleep(1200);
      setState('idle');
      setCaption(undefined);
      setStage('idle');
      setRunning(false);
    },
    [running, say, step, network, lang]
  );

  const totalConfirmed = txns.filter((t) => t.outcome !== 'duplicate').reduce((s, t) => s + t.amount, 0);

  return (
    <>
      {/* The rail, summarised — both payers side by side rather than behind
          a toggle. Both columns share `stage`, so running a scenario below
          animates them together: the clearest way to show the architecture
          is genuinely identical, not just described as such.
          `MoneyLane` stacks vertically rather than the single-diagram
          version's horizontal row — two horizontal rows side by side need
          real width each, which forces a scrollbar the moment they sit in a
          half-width column; a vertical stack costs height instead, which
          the page has to spare. `ObserverLane` renders once, below both —
          it does not change based on who paid, so showing it twice was
          repeating the same six lines of text verbatim. */}
      <section className="bg-blush py-96">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-subheading font-signifier text-ink mb-4">The journey a payment takes</h2>
          <p className="text-caption font-sohne text-ash mb-24 max-w-prose">
            Everything below happens on the WayaMe rails — we only listen and announce, whether the
            money began with a customer or a government grant. Run a scenario below and both sides
            update together, in step.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <p className="text-caption font-sohne font-500 text-ink mb-8">A shop sale</p>
              <MoneyLane stage={stage} variant="p2b" />
            </div>
            <div>
              <p className="text-caption font-sohne font-500 text-ink mb-8">A grant payment</p>
              <MoneyLane stage={stage} variant="g2p" />
            </div>
          </div>
          <ObserverLane stage={stage} className="mt-24" />
        </div>
      </section>

      {/* The live device, the reason this page exists. */}
      <section id="run-it" className="bg-paper py-96">
        <div className="max-w-content mx-auto px-24">
          <h2 className="text-subheading font-signifier text-ink mb-4">Hear it for yourself</h2>
          <p className="text-caption font-sohne text-slate mb-24 max-w-prose">
            Runs entirely in your browser — nothing to install, no account, no backend. Choose a
            scenario and follow it through the rail and sequence diagrams on this page.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-40 items-start">
            {/* Device */}
            <Card variant="neutral" className="p-32 flex flex-col items-center">
              <SoundBoxDevice state={state} caption={caption} />
              <div className="mt-24 w-full max-w-[280px]">
                <p className="text-caption font-sohne text-ash mb-8">Announcement language</p>
                <div className="flex gap-4">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLang(l)}
                      disabled={running}
                      className={`flex-1 text-caption font-sohne rounded-buttons px-8 py-8 transition-colors disabled:opacity-50 ${
                        lang.code === l.code ? 'bg-brand-gradient-aa text-paper' : 'bg-paper text-slate hover:text-ink'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>

                <p className="text-caption font-sohne text-ash mt-16 mb-8">Connection</p>
                <div className="flex gap-4">
                  {NETWORKS.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => setNetwork(n)}
                      disabled={running}
                      className={`flex-1 text-caption font-sohne rounded-buttons px-8 py-8 transition-colors disabled:opacity-50 ${
                        network.id === n.id ? 'bg-brand-gradient-aa text-paper' : 'bg-paper text-slate hover:text-ink'
                      }`}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>

                <label className="flex items-center gap-8 mt-16 text-caption font-sohne text-slate cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voice}
                    onChange={(e) => setVoice(e.target.checked)}
                    className="accent-ink"
                  />
                  Speak confirmations aloud
                </label>
                <p className="text-caption font-sohne text-ash mt-4">
                  Off by default. The real device always speaks; a shared web page should not.
                </p>
                {(lang as { recorded?: boolean }).recorded && (
                  <p className="text-caption font-sohne text-sienna mt-8">
                    No speech engine anywhere supports Oshiwambo, so your browser will approximate it.
                    The real device plays a recording of a person — which is why it can serve a
                    language the software industry has skipped.
                  </p>
                )}
              </div>
            </Card>

            {/* Controls + log */}
            <div>
              <div className="space-y-12">
                {SCENARIOS.map((s) => (
                  <Card key={s.id} variant="elevated" className="p-20">
                    <div className="flex items-start justify-between gap-16">
                      <div className="min-w-0">
                        <h3 className="text-body font-sohne font-450 text-ink">{s.label}</h3>
                        <p className="text-caption font-sohne text-slate mt-4">{s.description}</p>
                      </div>
                      <Button variant="filled" disabled={running} onClick={() => run(s.id)}>
                        Run
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {log.length > 0 && (
                <Card variant="neutral" className="p-20 mt-16">
                  <h3 className="text-caption font-sohne text-ash mb-8">Device log</h3>
                  <ol className="space-y-4">
                    {log.map((l, i) => (
                      <li key={i} className="text-caption font-sohne text-ink">
                        {l}
                      </li>
                    ))}
                  </ol>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* The same journey, every hop — the emphasis band on this page. Too
          wide (min-w-[880px]) to put both payers side by side without
          forcing horizontal scroll, so this one keeps a toggle rather than
          the rail diagram's split screen. */}
      <section className="bg-brand-gradient-aa py-128">
        <div className="max-w-content mx-auto px-24">
          <div className="flex flex-wrap items-baseline justify-between gap-16 mb-4">
            <h2 className="text-subheading font-signifier text-paper">Every step, in order</h2>
            <div className="flex gap-4" role="group" aria-label="Illustrate the sequence as">
              {(
                [
                  { id: 'p2b' as const, label: 'A shop sale' },
                  { id: 'g2p' as const, label: 'A grant payment' },
                ]
              ).map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariant(v.id)}
                  className={`text-caption font-sohne rounded-buttons px-12 py-6 transition-colors ${
                    variant === v.id ? 'bg-paper text-ink' : 'bg-paper/10 text-paper hover:bg-paper/20'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-caption font-sohne text-paper opacity-90 mb-16 max-w-prose">
            {variant === 'g2p' ? (
              <>
                Eleven steps from a paymaster&apos;s scan to a settled payout — the agent&apos;s
                account for cash, or the beneficiary&apos;s own wallet — across the WayaMe rails
                operated by Instant Payment Namibia. Steps 9 to 11 are ours, and they are the only
                dashed lines on the diagram — a notification, never an instruction.
              </>
            ) : (
              <>
                Eleven steps from the customer&apos;s thumb to the seller&apos;s account, across the
                WayaMe rails operated by Instant Payment Namibia. Steps 9 to 11 are ours, and they
                are the only dashed lines on the diagram — a notification, never an instruction.
              </>
            )}
          </p>
          <div className="bg-paper border border-mist rounded-cards p-16">
            <PaymentSequenceDiagram stage={stage} variant={variant} />
          </div>
        </div>
      </section>

      {/* Ledger — always rendered, so the section count never depends on
          whether a visitor has pressed Run yet. */}
      <section className="bg-blush py-96">
        <div className="max-w-content mx-auto px-24">
          <div className="flex items-baseline justify-between mb-16">
            <h2 className="text-subheading font-signifier text-ink">What the platform recorded</h2>
            {txns.length > 0 && (
              <span className="text-caption font-sohne text-slate tabular-nums">
                {nad(totalConfirmed)} confirmed
              </span>
            )}
          </div>
          {txns.length > 0 ? (
            <>
              <Card variant="elevated" className="overflow-hidden">
                <ul className="divide-y divide-mist">
                  {txns.map((t, i) => (
                    <li key={`${t.ref}-${i}`} className="flex items-center justify-between px-20 py-16">
                      <div>
                        <p className="text-body font-sohne text-ink">{t.ref}</p>
                        <p className="text-caption font-sohne text-slate">
                          {t.at}
                          {t.retries > 0 && ` · ${t.retries} retries`}
                        </p>
                      </div>
                      <div className="flex items-center gap-16">
                        <span className="text-body font-sohne text-ink tabular-nums">{nad(t.amount)}</span>
                        <StatusPill
                          label={t.outcome === 'duplicate' ? 'replay ignored' : t.outcome}
                          tone={t.outcome === 'success' ? 'success' : t.outcome === 'pending' ? 'warning' : 'neutral'}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
              <p className="text-caption font-sohne text-ash mt-16 max-w-prose">
                A payment that arrives twice shows up in the log but is only ever counted once. Each
                payment carries its own reference, so a device retrying on a bad connection cannot
                charge a customer twice or overstate what a seller took.
              </p>
            </>
          ) : (
            <EmptyState
              title="No payments recorded yet"
              detail="Run a scenario above and its outcome will appear here."
            />
          )}
        </div>
      </section>
    </>
  );
};

export default PaymentDemo;
