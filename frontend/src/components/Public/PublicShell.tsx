import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
// Transparent PNG, not the JPG the wordmark was supplied as: a JPG carries
// an opaque white box, clearly visible against the footer's tinted surface.
import wordmark from '../../assets/brand/buffr-wordmark.png';
import { BRAND, CONTACT } from '../../lib/copy/public';
import ObfuscatedEmail from '../ui/ObfuscatedEmail';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Chrome for the unauthenticated public surface.
 *
 * Separate from the app's `Layout` on purpose: that shell's sidebar links
 * into role-guarded routes, which would dead-end a logged-out visitor at
 * the login screen. The two share design tokens, not structure.
 *
 * **The reader here is an institution, not a consumer.** There is no
 * sign-up, no pricing page and no product tour, because none of those match
 * how this is actually bought — a single institutional relationship,
 * arranged in conversation. The nav reflects that: what it answers, how it
 * works, what it does with data, and who is building it.
 */

const NAV = [
  { name: 'Home', href: '/' },
  { name: 'For regulators', href: '/for-regulators' },
  { name: 'How it works', href: '/how-it-works' },
  { name: 'Privacy', href: '/privacy' },
];

const FOOTER_GROUPS: { title: string; links: { name: string; href: string }[] }[] = [
  {
    title: 'Explore',
    links: [
      { name: 'For regulators', href: '/for-regulators' },
      { name: 'How it works', href: '/how-it-works' },
    ],
  },
  {
    title: 'More',
    links: [
      { name: 'Privacy', href: '/privacy' },
          { name: 'Sign in', href: '/login' },
    ],
  },
];

const PublicShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* The gradient hairline is the brand's way of closing a header. It
          replaces a flat rule, which reads as generic beside the marks. */}
      <header className="sticky top-0 z-50 bg-paper/90 backdrop-blur-sm border-b-0 relative">
        <div className="max-w-content mx-auto px-24 h-64 flex items-center justify-between">
          <Link to="/" className="flex items-center" aria-label={BRAND.name}>
            <img
              src={wordmark}
              alt={BRAND.name}
              className="h-28 w-auto"
              width={401}
              height={106}
            />
          </Link>

          <nav className="hidden md:flex items-center gap-4">
            {NAV.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `px-16 py-8 rounded-buttons text-body font-sohne transition-colors ${
                    isActive ? 'bg-brand-gradient-aa text-paper' : 'text-slate hover:text-ink'
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-16">
            <Link to="/login" className="text-body font-sohne text-slate hover:text-ink">
              Sign in
            </Link>
          </div>

          <button
            className="md:hidden text-ink"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <XMarkIcon className="w-24 h-24" /> : <Bars3Icon className="w-24 h-24" />}
          </button>
        </div>

        {menuOpen && (
          <nav className="md:hidden border-t border-mist px-24 py-16 space-y-4">
            {[...NAV, { name: 'Sign in', href: '/login' }].map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setMenuOpen(false)}
                className="block px-16 py-12 rounded-inputs text-body font-sohne text-slate hover:bg-mist hover:text-ink"
              >
                {item.name}
              </NavLink>
            ))}
          </nav>
        )}
        <div className="h-2 bg-brand-gradient" />
      </header>

      <main className="flex-1">{children}</main>

      {/* Every page closes on a plain white section, and the footer was
          also unstyled white — the two blended into one long white run with
          nothing but a 1px border between them. The gradient hairline
          mirrors the header's own closing device, and `bg-mist` gives the
          footer a surface of its own regardless of what colour the page
          above happens to end on. */}
      <footer className="mt-96">
        <div className="h-2 bg-brand-gradient" />
        <div className="bg-mist">
        <div className="max-w-content mx-auto px-24 py-64">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-40">
            <div className="md:col-span-2">
              <img
                src={wordmark}
                alt={BRAND.name}
                className="h-28 w-auto"
                width={401}
                height={106}
              />
              <p className="text-caption font-sohne text-slate mt-4">{BRAND.tagline}</p>
              <div className="mt-16 flex flex-wrap items-center gap-x-16 gap-y-4">
                <ObfuscatedEmail
                  user={CONTACT.emailUser}
                  domain={CONTACT.emailDomain}
                  spoken={CONTACT.emailSpoken}
                  colour="#705C67"
                />
              </div>
              {/* Administrator sign-in lives here rather than in the nav.
                  Analysts are sent to their own sign-in from the page written
                  for them; this is for the handful of people who run the
                  deployment, and a footer is where they expect to find it. */}
              <Link
                to="/login?as=admin"
                className="inline-block text-caption font-sohne text-slate hover:text-ink mt-16 underline"
              >
                Administrator sign-in
              </Link>
              <p className="text-caption font-sohne text-slate mt-8 max-w-[320px]">
                Real-time analysis of the national payment rails, and the picture of the
                country&apos;s money that it builds.
              </p>
            </div>
            {FOOTER_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="text-caption font-sohne font-450 text-ink">{group.title}</p>
                <ul className="mt-12 space-y-8">
                  {group.links.map((l) => (
                    <li key={l.name}>
                      <Link to={l.href} className="text-caption font-sohne text-slate hover:text-ink">
                        {l.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-40 space-y-8">
            <p className="text-caption font-sohne text-ash">
              {BRAND.name} reads data about payments carried on the {BRAND.rails} rails. It holds
              no funds and is never in the payment path. {BRAND.rails} is the consumer-facing
              name of Namibia&rsquo;s instant payment service, operated by {BRAND.railsOperator};
              it is named here to say what {BRAND.name} observes, not to imply any endorsement,
              partnership or licence.
            </p>
            {/* Said in the footer as well as on the pages, because a reader
                who lands mid-site should not have to find the one page that
                admits it. */}
            <p className="text-caption font-sohne text-ash">
              No transaction data has been requested from, or shared by, any institution. Every
              figure on this site is computed from activity this platform generates itself and
              describes no real payment behaviour.
            </p>
          </div>
        </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicShell;
