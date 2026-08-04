import React, { useEffect, useRef } from 'react';
import { ShareBars, TrendChart, BRAND } from '../charts/primitives';

/**
 * The panel that opens when a region is selected.
 *
 * **Four figures in a row was not a summary, it was a caption.** A supervisor
 * selecting a region wants to know what is happening inside it — which use
 * cases carry the volume, whether activity is rising, how many of its
 * constituencies are actually reached. Those are charts, not numbers.
 *
 * A dialog rather than an inline panel, because the inline version pushed the
 * map down the page: selecting a region moved the thing you had just clicked.
 * The dialog holds still, dims the page behind it, and returns focus to the
 * region when it closes.
 *
 * Focus handling is deliberate and not decorative — a keyboard user who opens
 * this and cannot get out of it has been trapped by a marketing page.
 */

export interface RegionStats {
  name: string;
  activity: number | null;
  share?: string;
  constituencies?: number;
  constituenciesReached?: number;
  rank?: number;
  /** Volume by use case, largest first. */
  useCases?: { label: string; value: number }[];
  /** Daily payment counts, oldest first. */
  trend?: number[];
  note?: string;
}

const RegionModal: React.FC<{
  stats: RegionStats | null;
  onClose: () => void;
}> = ({ stats, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!stats) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    // The page behind must not scroll while a dialog is open, or dismissing it
    // returns the reader somewhere they did not navigate to.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [stats, onClose]);

  if (!stats) return null;
  const reached = stats.constituenciesReached;
  const total = stats.constituencies;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-24"
      role="dialog"
      aria-modal="true"
      aria-label={`${stats.name} detail`}
    >
      <button
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 bg-plum-deep/45 backdrop-blur-sm cursor-default"
      />

      <div
        className="relative w-full sm:max-w-[720px] max-h-[92vh] overflow-y-auto
                   rounded-t-shell sm:rounded-shell bg-mist/70 p-6
                   animate-[fadeUp_.45s_cubic-bezier(0.32,0.72,0,1)]
                   motion-reduce:animate-none"
      >
        <div className="rounded-t-shellInner sm:rounded-shellInner bg-paper p-24 sm:p-32">
          <div className="flex items-start justify-between gap-16">
            <div>
              <p className="text-caption font-sohne uppercase tracking-[0.1em] text-ash">
                Region
              </p>
              <h3 className="text-heading-sm font-signifier text-ink mt-4">{stats.name}</h3>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="shrink-0 inline-flex items-center justify-center w-36 h-36 rounded-full
                         bg-mist text-slate hover:text-ink transition-colors duration-300
                         ease-brand motion-reduce:transition-none"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="1.8"
                  strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {stats.activity === null ? (
            <div className="mt-24 rounded-shellInner bg-blush-tint p-24">
              <p className="text-body font-sohne text-ink">No activity has been recorded here.</p>
              <p className="text-caption font-sohne text-slate mt-8">
                That is an absence of data, not a measurement of zero. The two are reported
                differently throughout: a region never reached and a region that has gone quiet
                are different findings, and a coverage figure that merges them overstates reach.
              </p>
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-24 gap-y-16 mt-24">
                <div>
                  <dt className="text-caption font-sohne text-ash">Activity index</dt>
                  <dd className="text-heading-sm font-signifier text-ink tabular-nums">
                    {stats.activity}
                  </dd>
                </div>
                {stats.share && (
                  <div>
                    <dt className="text-caption font-sohne text-ash">Share of value</dt>
                    <dd className="text-heading-sm font-signifier text-ink tabular-nums">
                      {stats.share}
                    </dd>
                  </div>
                )}
                {reached !== undefined && total !== undefined && (
                  <div>
                    <dt className="text-caption font-sohne text-ash">Constituencies</dt>
                    <dd className="text-heading-sm font-signifier text-ink tabular-nums">
                      {reached} / {total}
                    </dd>
                  </div>
                )}
                {stats.rank !== undefined && (
                  <div>
                    <dt className="text-caption font-sohne text-ash">Rank</dt>
                    <dd className="text-heading-sm font-signifier text-ink tabular-nums">
                      {stats.rank} of 14
                    </dd>
                  </div>
                )}
              </dl>

              {reached !== undefined && total !== undefined && (
                <div className="mt-24">
                  <div className="flex items-baseline justify-between gap-16">
                    <span className="text-caption font-sohne text-ink">
                      Constituencies with recorded activity
                    </span>
                    <span className="text-caption font-sohne text-ash tabular-nums">
                      {Math.round((reached / total) * 100)}%
                    </span>
                  </div>
                  {/* Segmented rather than a single bar: each segment is one
                      constituency, so "7 of 10" is countable instead of
                      estimated from a length. */}
                  <div className="flex gap-4 mt-8" aria-hidden="true">
                    {Array.from({ length: total }).map((_, i) => (
                      <span
                        key={i}
                        className="h-12 flex-1 rounded-[3px]"
                        style={{ background: i < reached ? BRAND : '#EDEBEC' }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {stats.trend && stats.trend.length > 2 && (
                <div className="mt-32">
                  <p className="text-caption font-sohne text-ink mb-8">Payments per day</p>
                  <TrendChart history={stats.trend} label={`${stats.name} daily payments`} />
                </div>
              )}

              {stats.useCases && stats.useCases.length > 0 && (
                <div className="mt-32">
                  <p className="text-caption font-sohne text-ink mb-16">
                    Where the volume sits, by use case
                  </p>
                  <ShareBars data={stats.useCases} />
                </div>
              )}
            </>
          )}

          <p className="text-caption font-sohne text-ash mt-32 pt-16 border-t border-mist">
            {stats.note ??
              'Illustrative figures from generated data. In the console this drills to constituency level against the real record.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegionModal;
