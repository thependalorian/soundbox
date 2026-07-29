import React, { useCallback, useEffect, useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Meter from '../ui/Meter';
import StatusPill from '../ui/StatusPill';
import Skeleton from '../ui/Skeleton';
import Timeline from '../ui/Timeline';
import EmptyState from '../ui/EmptyState';
import {
  AnomalyRule,
  AnomalyRuleConfig,
  RuleChange,
  RulePreview,
  fetchAnomalyRules,
  fetchRuleHistory,
  fetchRulePreview,
  updateAnomalyPolicy,
  updateAnomalyRule,
} from '../../api/api';
import { logger } from '../../lib/logger';

/**
 * The rules that decide what a person is asked to look at.
 *
 * Three commitments this screen keeps, because a settings page about risk
 * scoring is not an ordinary settings page:
 *
 * 1. **Nothing here is decorative.** Every control writes to the backend and
 *    every value shown was read from it. A threshold slider that appears to
 *    save and does not would be worse than no slider — an operator would
 *    believe the queue was tuned when it was not.
 * 2. **A change is stated in its own consequence.** Each control says what
 *    moving it costs, not just what it is. Raising a bar always trades
 *    fewer alerts for more that goes unexamined; the copy says so rather
 *    than implying the setting is free.
 * 3. **Every change is attributed.** The history below is append-only, so
 *    "the queue went quiet last month" always has an answer.
 *
 * The fingerprint is shown deliberately. Scores are only comparable within
 * one configuration, and a visible identifier is how an analyst knows
 * whether last quarter's alerts were scored on the same basis as today's.
 */

interface Props {
  /** Writes are limited to oversight and administrator roles. */
  canEdit: boolean;
  actor: { role: string; name: string };
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

const AnomalyRulesSection: React.FC<Props> = ({ canEdit, actor }) => {
  const [config, setConfig] = useState<AnomalyRuleConfig | null>(null);
  const [history, setHistory] = useState<RuleChange[]>([]);
  const [preview, setPreview] = useState<RulePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [cfg, hist, prev] = await Promise.all([
        fetchAnomalyRules(),
        fetchRuleHistory(8),
        fetchRulePreview(),
      ]);
      setConfig(cfg);
      setHistory(hist);
      setPreview(prev);
      setError(null);
    } catch (e) {
      logger.error('Could not load anomaly rule configuration', e);
      setError('These settings could not be loaded. Payments are still being checked using the values already in effect.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveRule = async (code: string, changes: Partial<AnomalyRule>) => {
    setSaving(code);
    setError(null);
    try {
      await updateAnomalyRule(
        code,
        {
          enabled: changes.enabled,
          contribution: changes.contribution,
          threshold: changes.threshold ?? undefined,
        },
        actor
      );
      await load();
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      logger.error(`Could not update rule ${code}`, e);
      setError(detail ?? 'That change was not accepted. The previous value is still in effect.');
    } finally {
      setSaving(null);
    }
  };

  const savePolicy = async (code: string, value: number) => {
    setSaving(code);
    setError(null);
    try {
      await updateAnomalyPolicy(code, value, actor);
      await load();
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      logger.error(`Could not update policy ${code}`, e);
      setError(detail ?? 'That change was not accepted. The previous value is still in effect.');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card variant="elevated" className="p-24">
        <Skeleton className="h-[20px] w-[240px]" />
        <Skeleton className="h-[80px] mt-16" />
        <Skeleton className="h-[80px] mt-12" />
      </Card>
    );
  }

  if (!config) {
    return (
      <EmptyState
        title="Settings could not be loaded"
        detail={error ?? 'Payments are still being checked using the values already in effect.'}
      />
    );
  }

  const activeCount = config.rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-16">
      {error && (
        <Card className="p-16 bg-peach">
          <p className="text-caption font-sohne text-sienna">{error}</p>
        </Card>
      )}

      {/* What the current settings do to the queue. A threshold is abstract
          until it is a number of alerts a person has to work through. */}
      {preview && (
        <Card variant="elevated" className="p-24">
          <div className="flex flex-wrap items-start justify-between gap-16">
            <div>
              <h3 className="text-body font-sohne font-450 text-ink">What these settings do now</h3>
              <p className="text-caption font-sohne text-slate mt-4 max-w-[460px]">
                Counted from every payment checked so far. Not a projection.
              </p>
            </div>
            <span className="text-caption font-sohne text-ash tabular-nums" title="Identifies the exact settings a score was produced under">
              Settings version {config.fingerprint}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-16 mt-20">
            <div>
              <p className="text-heading font-signifier text-ink tabular-nums">{preview.wouldQueue}</p>
              <p className="text-caption font-sohne text-slate mt-4">reach a reviewer</p>
            </div>
            <div>
              <p className="text-heading font-signifier text-ink tabular-nums">{preview.belowThreshold}</p>
              <p className="text-caption font-sohne text-slate mt-4">recorded, not queued</p>
            </div>
            <div>
              <p className="text-heading font-signifier text-ink tabular-nums">{activeCount}/{config.rules.length}</p>
              <p className="text-caption font-sohne text-slate mt-4">rules switched on</p>
            </div>
          </div>

          {preview.scoredTotal > 0 && (
            <Meter
              className="mt-20"
              value={(preview.wouldQueue / preview.scoredTotal) * 100}
              tone="accent"
              remainder
              label="Share of scored payments that reach the queue"
            />
          )}
        </Card>
      )}

      {/* Policy: the bar the queue is governed by. */}
      {config.policy.map((p) => (
        <Card key={p.code} variant="elevated" className="p-24">
          <div className="flex flex-wrap items-start justify-between gap-16">
            <div className="min-w-0">
              <h3 className="text-body font-sohne font-450 text-ink">{p.label}</h3>
              <p className="text-caption font-sohne text-slate mt-4 max-w-[480px]">{p.description}</p>
            </div>
            <span className="text-subheading font-signifier text-ink tabular-nums">{pct(p.value)}</span>
          </div>
          <input
            type="range"
            min={p.valueMin * 100}
            max={p.valueMax * 100}
            step={5}
            defaultValue={p.value * 100}
            disabled={!canEdit || saving === p.code}
            onMouseUp={(e) => savePolicy(p.code, Number((e.target as HTMLInputElement).value) / 100)}
            onTouchEnd={(e) => savePolicy(p.code, Number((e.target as HTMLInputElement).value) / 100)}
            onKeyUp={(e) => savePolicy(p.code, Number((e.target as HTMLInputElement).value) / 100)}
            className="w-full accent-ink mt-16 disabled:opacity-40"
            aria-label={p.label}
          />
          {!canEdit && (
            <p className="text-caption font-sohne text-ash mt-8">
              Visible to everyone working the queue; changed by oversight and administrators.
            </p>
          )}
        </Card>
      ))}

      {/* The rules themselves. */}
      <Card variant="elevated" className="p-24">
        <h3 className="text-body font-sohne font-450 text-ink">Rules</h3>
        <p className="text-caption font-sohne text-slate mt-4 max-w-[520px]">
          Each rule adds to a payment&rsquo;s score when it applies, and the alert says which ones
          did. Switching one off removes it from the score and from the explanation.
        </p>

        <div className="mt-20 divide-y divide-mist">
          {config.rules.map((r) => (
            <div key={r.code} className="py-20 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-16">
                <div className="min-w-0">
                  <div className="flex items-center gap-8">
                    <p className="text-body font-sohne text-ink">{r.label}</p>
                    <StatusPill
                      label={r.enabled ? 'on' : 'off'}
                      tone={r.enabled ? 'success' : 'neutral'}
                    />
                  </div>
                  <p className="text-caption font-sohne text-slate mt-4 max-w-[480px]">
                    {r.description}
                  </p>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    disabled={saving === r.code}
                    onClick={() => saveRule(r.code, { enabled: !r.enabled })}
                  >
                    {r.enabled ? 'Switch off' : 'Switch on'}
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-24 mt-16">
                <div className="min-w-[200px]">
                  <p className="text-caption font-sohne text-ash">How much this adds</p>
                  <p className="text-body font-sohne text-ink tabular-nums">{pct(r.contribution)}</p>
                  <Meter className="mt-8" value={r.contribution * 100} tone={r.enabled ? 'accent' : 'neutral'} />
                </div>

                {r.threshold !== null && (
                  <div className="min-w-[240px] flex-1">
                    <p className="text-caption font-sohne text-ash">
                      Applies above {r.threshold}
                      {r.thresholdLabel ? ` ${r.thresholdLabel}` : ''}
                    </p>
                    <input
                      type="range"
                      min={r.thresholdMin}
                      max={r.thresholdMax}
                      step={r.thresholdMax && r.thresholdMax > 50 ? 10 : 0.5}
                      defaultValue={r.threshold}
                      disabled={!canEdit || !r.enabled || saving === r.code}
                      onMouseUp={(e) => saveRule(r.code, { threshold: Number((e.target as HTMLInputElement).value) })}
                      onTouchEnd={(e) => saveRule(r.code, { threshold: Number((e.target as HTMLInputElement).value) })}
                      onKeyUp={(e) => saveRule(r.code, { threshold: Number((e.target as HTMLInputElement).value) })}
                      className="w-full accent-ink mt-8 disabled:opacity-40"
                      aria-label={`${r.label} level`}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Append-only. This is the half of the bargain that makes the rest
          safe to change. */}
      <Card variant="elevated" className="p-24">
        <h3 className="text-body font-sohne font-450 text-ink">Change history</h3>
        <p className="text-caption font-sohne text-slate mt-4 max-w-[520px]">
          Every change to a rule or a level, kept permanently. Payments checked under different
          settings cannot be compared directly, so this is what explains a shift in the queue.
        </p>
        <div className="mt-16">
          {history.length === 0 ? (
            <EmptyState
              title="No changes yet"
              detail="Everything is running on the values it started with."
            />
          ) : (
            <Timeline
              entries={history.map((h) => ({
                id: h.id,
                title: `${h.label}: ${h.from ?? 'unset'} to ${h.to ?? 'unset'}`,
                detail: h.note ?? undefined,
                meta: `${h.changedBy} · ${new Date(h.at).toLocaleString()}`,
              }))}
            />
          )}
        </div>
      </Card>
    </div>
  );
};

export default AnomalyRulesSection;
