import React from 'react';
import PageHero from '../../components/Public/PageHero';
import ButtonLink from '../../components/ui/ButtonLink';
import PublicShell from '../../components/Public/PublicShell';
import {
  AUDIENCES,
  PROPOSITION,
  CUSTOMER_CHANNELS,
  PAYMENT_KINDS,
  SELLER_ROADMAP,
} from '../../lib/copy/public';
import SoundBoxDevice from '../../components/Public/SoundBoxDevice';
import ImageSlot from '../../components/ui/ImageSlot';
import Card from '../../components/ui/Card';
import Roadmap from '../../components/Public/Roadmap';

/**
 * The seller-facing page.
 *
 * Written for people who run a stall, drive a taxi, or move cash for a
 * living — not for a procurement committee. Short sentences, concrete
 * nouns, no product vocabulary. If a sentence here needs a second reading,
 * it is wrong for this audience.
 *
 * Nine sections, one action: sign in, in the closing section only.
 */

const USAGE_STEPS = [
  { n: '1', t: 'Switch it on', d: 'It arrives charged. Press the button once. It finds the network by itself.' },
  { n: '2', t: 'Customer pays', d: 'They scan your code in their own banking app and pay the way they already do. There is nothing new for them to install.' },
  { n: '3', t: 'You hear it', d: '“N$45.50 received.” The ring turns green at the same time.' },
  { n: '4', t: 'Hand over the goods', d: 'The money is already yours. Nothing to check.' },
] as const;

/** Specs from docs/device.md, framed as what they mean at the counter —
 *  not the raw table, which answers a question this reader never asked. */
const DEVICE_OUTCOMES = [
  { t: 'Loud enough to hear over a crowd', d: '85+ dB — built to carry over a market, a road, or a running taxi engine.' },
  { t: 'Works outdoors, as standard', d: 'Rain, dust or a dropped charge: IP65 sealed, no case needed.' },
  { t: 'A full day on one charge', d: '2000mAh, charges from any USB-C cable — the same one as a modern phone.' },
  { t: 'Finds a signal where your stall is', d: '4G with automatic 2G fallback, so a weak signal slows it down instead of stopping it.' },
  { t: 'Cannot be tricked into announcing a fake payment', d: 'A secure element and tamper detection sit between the network and the speaker.' },
  { t: 'Sits on a counter or clips to a belt', d: '85mm x 50mm x 25mm, 120g.' },
] as const;

const ForMerchantsPage: React.FC = () => (
  <PublicShell>
    <PageHero
      tone="trader"
      title="You hear the waya"
      lead="A small speaker on your counter says the amount out loud the moment a customer pays you. You know it is real before you hand anything over."
    />

    {/* The problem, in their words — the page's one emphasis band.
        Plum-and-sienna rather than the site's default brand-gradient-aa:
        the hero directly above is already the warm CC4C22→D01364 sweep
        (tone="trader"), and brand-gradient-aa is nearly that same gradient,
        which produced the identical "hero and the section under it look
        like one panel" bug found on the home page. */}
    <section className="bg-hero-assurance py-128">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-paper max-w-[560px]">
          &ldquo;They showed me the screen. The money never came.&rdquo;
        </h2>
        <p className="text-body font-sohne text-paper opacity-90 mt-16 max-w-[560px]">
          A screen can be faked. A message can be old. And in a busy market you cannot hear your
          phone anyway. So you either hold up the queue to check, or you take the risk. Most
          people take the risk, and some of them lose.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mt-40">
          {PROPOSITION.slice(0, 3).map((c) => (
            <Card key={c.title} variant="elevated" className="p-24">
              <h3 className="text-subheading font-signifier text-ink">{c.title}</h3>
              <p className="text-caption font-sohne text-slate mt-8">{c.detail}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>

    {/* How you use it */}
    <section className="bg-paper py-96">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink text-center">How you use it</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mt-40">
          {USAGE_STEPS.map((s) => (
            <Card key={s.n} variant="neutral" className="p-24">
              <p className="text-heading-sm font-signifier text-sienna">{s.n}</p>
              <h3 className="text-body font-sohne font-450 text-ink mt-8">{s.t}</h3>
              <p className="text-caption font-sohne text-slate mt-4">{s.d}</p>
            </Card>
          ))}
        </div>
        <p className="text-body font-sohne text-slate text-center mt-40 max-w-[520px] mx-auto">
          There is no app to install, nothing to log into, and no password to forget.
        </p>
      </div>
    </section>

    {/* How the customer pays. It is the fact that decides whether half the
        country can buy from you. */}
    <section className="bg-blush py-96">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink text-center">
          Your customer does not need a smartphone
        </h2>
        <p className="text-body font-sohne text-slate text-center mt-16 max-w-[620px] mx-auto">
          There are two ways to pay you, and only one of them needs a modern phone.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-40">
          {CUSTOMER_CHANNELS.map((c) => (
            <Card key={c.title} variant="elevated" className="p-32">
              <h3 className="text-subheading font-signifier text-ink">{c.title}</h3>
              <p className="text-body font-sohne text-slate mt-12">{c.detail}</p>
            </Card>
          ))}
        </div>
        <div className="mt-40 max-w-[680px] mx-auto">
          <ImageSlot
            ratio="16:9"
            slot="Paying from a basic phone"
            brief="A customer at a market stall paying by dialling a short code on a basic feature phone, while the seller's box confirms it."
            direction="The phone is deliberately an inexpensive handset, not a smartphone. Both faces visible: the customer concentrating on the keypad, the seller already reacting to the announcement. The point is that the seller trusts the sound, not the customer's screen."
          />
        </div>
      </div>
    </section>

    {/* Every kind of payment, not just till payments */}
    <section className="bg-paper py-96">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink text-center">Every payment you receive</h2>
        <p className="text-body font-sohne text-slate text-center mt-16 max-w-[560px] mx-auto">
          Not only customers at the counter. If money reaches your business on the national rails,
          the box says so.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mt-40">
          {PAYMENT_KINDS.map((c) => (
            <Card key={c.title} variant="neutral" className="p-24">
              <h3 className="text-body font-sohne font-450 text-ink">{c.title}</h3>
              <p className="text-caption font-sohne text-slate mt-8">{c.detail}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>

    {/* What is actually in it — specs, framed as what they mean to a seller,
        with the language roadmap folded in as a closing line. */}
    <section className="bg-blush py-96">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink text-center">What is inside it</h2>
        <p className="text-body font-sohne text-slate text-center mt-16 max-w-[560px] mx-auto">
          A speaker, a light, its own connection and a battery. Nothing that can reach your money.
        </p>
        <div className="mt-40 max-w-[680px] mx-auto">
          <ImageSlot
            ratio="16:9"
            slot="Device anatomy"
            brief="The device photographed from above with its parts laid out beside it — speaker, light ring, SIM, battery."
            direction="Flat lay on a plain surface, even light, labelled in post. The point is that it is simple, not that it is sophisticated."
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mt-40">
          {DEVICE_OUTCOMES.map((o) => (
            <Card key={o.t} variant="elevated" className="p-20">
              <h3 className="text-body font-sohne font-450 text-ink">{o.t}</h3>
              <p className="text-caption font-sohne text-slate mt-4">{o.d}</p>
            </Card>
          ))}
        </div>
        <div className="mt-40">
          <p className="text-caption font-sohne text-ash uppercase tracking-[0.1em] mb-16">
            What&apos;s coming
          </p>
          <Roadmap items={SELLER_ROADMAP.map((r) => ({ ...r }))} />
        </div>
      </div>
    </section>

    {/* When things go wrong, including the three connection states merged
        in — this is the answer to "how good does my signal need to be", not
        a separate topic. */}
    <section className="bg-paper py-96">
      <div className="max-w-content mx-auto px-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-64 items-center">
          <div>
            <h2 className="text-heading font-signifier text-ink">When the network drops</h2>
            <p className="text-body font-sohne text-slate mt-16">
              It happens. The box keeps checking, and tells you it is still waiting instead of
              going quiet. The light stays orange so you know not to hand anything over yet. When
              the network comes back, it checks again and tells you the result.
            </p>
            <p className="text-body font-sohne text-slate mt-16">
              Your customer&apos;s payment is not affected by any of this. It goes through the same
              way it always does. The only thing waiting is the box finding out about it.
            </p>
          </div>
          <Card variant="neutral" className="p-32 flex flex-col items-center">
            <SoundBoxDevice state="pending" caption="Payment pending. Please check your network." />
          </Card>
        </div>
        <div className="mt-64">
          <p className="text-body font-sohne text-slate text-center max-w-[520px] mx-auto">
            However good the signal is, a weak one only makes it slower — never less certain.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mt-24">
            <ImageSlot ratio="1:1" slot="Good signal" brief="Ring green, amount announced." direction="Close crop on the device." />
            <ImageSlot ratio="1:1" slot="Weak signal" brief="Same green ring, a beat slower." direction="Identical framing to the first, so only the state differs." />
            <ImageSlot ratio="1:1" slot="No signal" brief="Ring amber, holding." direction="Identical framing again. Amber must read clearly as 'wait', not 'error'." />
          </div>
        </div>
      </div>
    </section>

    {/* Who it is for. Five entries, deliberately not a 4-column grid: a
        fifth card in a four-across row leaves one alone on its own line. */}
    <section className="bg-blush py-96">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink text-center">Who it is for</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-16 mt-40">
          {AUDIENCES.map((w) => (
            <Card key={w.title} variant="neutral" className="p-24">
              <h3 className="text-body font-sohne font-450 text-ink">{w.title}</h3>
              <p className="text-caption font-sohne text-slate mt-8">{w.detail}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>

    {/* Closing — the page's one action */}
    <section className="bg-paper py-96 text-center">
      <div className="max-w-content mx-auto px-24">
        <h2 className="text-heading font-signifier text-ink">Already have a box?</h2>
        <p className="text-body font-sohne text-slate mt-16 max-w-[480px] mx-auto">
          Sign in to see your payments, check your box, and look at what you have taken.
        </p>
        <ButtonLink to="/login?as=merchant" className="mt-32">Sign in to your business</ButtonLink>
      </div>
    </section>
  </PublicShell>
);

export default ForMerchantsPage;
