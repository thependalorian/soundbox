import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import StatusPill from '../components/ui/StatusPill';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../lib/copy/public';
import AnomalyRulesSection from '../components/Settings/AnomalyRulesSection';

/**
 * Settings.
 *
 * Grouped by who a setting affects rather than by which table it lives in:
 * the device a seller listens to, the alerts a reviewer works, the record
 * everyone is answerable for. A settings page organised around the schema
 * makes sense to whoever wrote the schema and to nobody else.
 *
 * Anything not yet wired to a real mutation says so on the control itself.
 * A toggle that appears to work and does not is worse than one that admits
 * it.
 */

const LANGUAGES = [
  { code: 'en', label: 'English', ready: true },
  { code: 'af', label: 'Afrikaans', ready: false },
  { code: 'ng', label: 'Oshiwambo', ready: false },
  { code: 'kj', label: 'Khoekhoegowab', ready: false },
];

const Section: React.FC<{ title: string; detail?: string; children: React.ReactNode }> = ({
  title,
  detail,
  children,
}) => (
  <section className="mb-32">
    <h2 className="text-subheading font-signifier text-ink">{title}</h2>
    {detail && <p className="text-caption font-sohne text-slate mt-4 mb-16 max-w-[560px]">{detail}</p>}
    {!detail && <div className="mb-16" />}
    {children}
  </section>
);

const Row: React.FC<{ label: string; hint?: string; children?: React.ReactNode }> = ({
  label,
  hint,
  children,
}) => (
  <div className="flex flex-wrap items-start justify-between gap-16 py-16 border-b border-mist last:border-0">
    <div className="min-w-0">
      <p className="text-body font-sohne text-ink">{label}</p>
      {hint && <p className="text-caption font-sohne text-slate mt-4 max-w-[420px]">{hint}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isMerchant = user?.role === 'merchant';
  const isRegulator = user?.role === 'regulator';
  const [language, setLanguage] = useState('en');

  return (
    <div className="max-w-prose">
      <h1 className="text-heading font-signifier text-ink mb-8">Settings</h1>
      <p className="text-body font-sohne text-slate mb-32">
        How this account behaves, what it announces, and what it keeps.
      </p>

      <Section title="Account">
        <Card variant="elevated" className="p-24">
          <div className="flex items-start gap-20">
            <Avatar name={user?.name ?? 'User'} />
            <div className="min-w-0">
              <p className="text-body font-sohne font-450 text-ink">{user?.name}</p>
              <div className="flex flex-wrap items-center gap-8 mt-8">
                <StatusPill label={user?.role ?? 'user'} tone="neutral" />
                {user?.merchantId && (
                  <span className="text-caption font-sohne text-slate">Business {user.merchantId}</span>
                )}
              </div>
              <p className="text-caption font-sohne text-ash mt-12">
                Your role decides which parts of the system you can reach. Ask an administrator if
                you need something that is not showing.
              </p>
            </div>
          </div>
        </Card>
      </Section>

      {(isMerchant || isAdmin) && (
      <Section
        title="Announcements"
        detail="What the box says out loud, and in which language. For most sellers this is the only setting that will ever matter."
      >
        <Card variant="elevated" className="p-24">
          <Row
            label="Announcement language"
            hint="The box plays short recorded phrases rather than reading text, so adding a language means recording it — not rebuilding anything."
          >
            <div className="flex flex-wrap gap-4 justify-end">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => l.ready && setLanguage(l.code)}
                  disabled={!l.ready}
                  title={l.ready ? undefined : 'Recording not finished yet'}
                  className={`text-caption font-sohne rounded-buttons px-12 py-8 transition-colors ${
                    language === l.code
                      ? 'bg-brand-gradient-aa text-paper'
                      : l.ready
                      ? 'bg-mist text-slate hover:text-ink'
                      : 'bg-mist/50 text-ash cursor-not-allowed'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Speak the amount" hint="Turning this off leaves only the coloured ring.">
            <StatusPill label="On" tone="success" />
          </Row>
          <Row
            label="Repeat when a payment fails"
            hint="Says a failed payment twice — it is the one a seller must not miss."
          >
            <StatusPill label="On" tone="success" />
          </Row>
        </Card>
      </Section>
      )}

      {!isMerchant && (
        <Section
          title="What gets reviewed"
          detail="How unusual a payment must be before someone is asked to look at it, and which signs count toward that. Every control here takes effect immediately, and every change is kept on the record."
        >
          <AnomalyRulesSection
            canEdit={isAdmin || isRegulator}
            actor={{ role: user?.role ?? 'unknown', name: user?.name ?? 'unknown' }}
          />
        </Section>
      )}

      {isAdmin && (
        <Section title="Organisation" detail="Applies to everyone on this deployment.">
          <Card variant="elevated" className="p-24">
            <Row label="Organisation">
              <span className="text-body font-sohne text-ink">SoundBox</span>
            </Row>
            <Row label="Currency" hint="Amounts are stored as exact figures alongside this code.">
              <span className="text-body font-sohne text-ink">NAD (N$)</span>
            </Row>
            <Row
              label="Payment rails"
              hint="Outcomes are read from here. Nothing in this system ever instructs a payment."
            >
              <StatusPill label="WayaMe" tone="neutral" />
            </Row>
            <Row
              label="Analytics assistant"
              hint="Answers questions by querying live data. Inert until an API key is configured."
            >
              <StatusPill label="Needs a key" tone="warning" />
            </Row>
          </Card>
        </Section>
      )}

      {isRegulator && (
        <Section
          title="Oversight preferences"
          detail="How this account works the national view. These affect what you see, not what anyone else does."
        >
          <Card variant="elevated" className="p-24">
            <Row
              label="Default geographic level"
              hint="Where the drill-down starts. Constituency is more useful once coverage is wide."
            >
              <StatusPill label="Region" tone="neutral" />
            </Row>
            <Row
              label="Default period"
              hint="Seven-day blocks compare cleanly because each contains one of every weekday."
            >
              <StatusPill label="30 days" tone="neutral" />
            </Row>
            <Row
              label="Include regions with no activity"
              hint="A region with no activity stays visible in the list rather than dropping out of it."
            >
              <StatusPill label="Always" tone="success" />
            </Row>
          </Card>
        </Section>
      )}

      <Section title="Data and privacy" detail="What is held about people, and for how long.">
        <Card variant="elevated" className="p-24">
          <Row
            label="Payer detail"
            hint="A masked reference only — never a full phone number, account number or identity document."
          >
            <StatusPill label="Minimised" tone="success" />
          </Row>
          <Row
            label="History"
            hint="Records are added to, never overwritten. A correction is a new entry beside the original."
          >
            <StatusPill label="Kept permanently" tone="success" />
          </Row>
          <Row label="Retention schedule" hint="Concrete durations are still being agreed.">
            <StatusPill label="Being agreed" tone="warning" />
          </Row>
          <div className="pt-16">
            <Link to="/privacy" className="text-body font-sohne text-sienna underline">
              Read the full privacy position
            </Link>
          </div>
        </Card>
      </Section>

      <Section title="Session">
        <Card variant="neutral" className="p-24">
          <div className="flex flex-wrap items-center justify-between gap-16">
            <p className="text-caption font-sohne text-slate max-w-[420px]">
              Sign-in is a demonstration only in this build. Real accounts, sessions and device
              credentials are the next piece of work.
            </p>
            <Button variant="ghost" onClick={() => window.location.assign('/login')}>
              Sign out
            </Button>
          </div>
        </Card>
      </Section>

      <p className="text-caption font-sohne text-ash">
        SoundBox listens to the {BRAND.rails} rails, operated by {BRAND.railsOperator}. Naming
        {' '}{BRAND.rails} here describes what this connects to; it does not imply endorsement.
      </p>
    </div>
  );
};

export default SettingsPage;
