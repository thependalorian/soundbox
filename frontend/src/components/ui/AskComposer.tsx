import React, { useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { askAnalytics } from '../../api/api';
import { AskAnalyticsResponse } from '../../types/soundbox';

/**
 * Natural-language analytics composer, backed by the real
 * POST /analytics/ask endpoint (backend/app/services/ask_service.py) — a
 * Claude tool-calling loop over the existing AnalyticsService /
 * RegulatoryReportingEngine methods. This is the one non-mocked network
 * call in the frontend.
 *
 * The placeholder deliberately does NOT say "Ask anything". Kore
 * (Designing Human-Centric AI Experiences, p126) names that exact phrasing
 * as an anti-pattern: it "sets the wrong expectations about the system's
 * capabilities". This composer can answer questions about transactions,
 * devices, flagged payments, regional coverage and regulatory returns — and nothing
 * else — so it says so, and offers real examples drawn from the actual
 * backend tool set.
 *
 * Answers render the tools that produced them, so an operator can see the
 * answer came from queries against real data rather than from the model's
 * memory (Kore: "be transparent", "build cause-and-effect relationships").
 */

const EXAMPLES = [
  'What was total transaction volume in the last 7 days?',
  'Which regions have the highest exposure?',
  'How many devices are offline right now?',
  'Generate the PSD-6 return for last month',
];

/** Human labels for the backend tool names returned in `toolsUsed`. */
const TOOL_LABEL: Record<string, string> = {
  get_transaction_summary: 'Transaction summary',
  get_transaction_trends: 'Transaction trends',
  get_system_health: 'System health',
  get_anomaly_alerts: 'Flagged payments',
  get_geo_distribution: 'Regional distribution',
  get_geo_breakdown: 'Geographic breakdown',
  get_wallet_share: 'Wallet share',
  generate_psd6_report: 'PSD-6 return',
  generate_psd3_report: 'PSD-3 return',
};

const AskComposer: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AskAnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (q?: string) => {
    const text = (q ?? question).trim();
    if (!text || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await askAnalytics(text));
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 503) {
        setError('The analytics assistant is not configured yet — ask your administrator to set an API key.');
      } else if (status === 500) {
        setError('The analytics assistant could not complete that request. Try rephrasing it.');
      } else {
        setError('Could not reach the analytics assistant. Check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-prose">
      <div className="bg-paper border border-mist rounded-inputs p-16">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Ask about payments, devices, flagged activity, or regional coverage"
          aria-label="Ask about payments, devices, flagged activity, or regional coverage"
          className="w-full text-body font-sohne text-ink placeholder:text-smoke outline-none bg-transparent"
        />
        <div className="flex items-center justify-between mt-16">
          <p className="text-caption font-sohne text-ash">
            Answers come from live queries, not from memory.
          </p>
          <button
            onClick={() => submit()}
            disabled={loading || !question.trim()}
            aria-label="Ask"
            className="inline-flex items-center justify-center w-40 h-40 rounded-full bg-brand-gradient-aa text-paper disabled:opacity-40"
          >
            <PaperAirplaneIcon className="w-16 h-16" />
          </button>
        </div>
      </div>

      {!result && !loading && !error && (
        <div className="flex flex-wrap gap-8 mt-12">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setQuestion(ex);
                submit(ex);
              }}
              className="text-caption font-sohne text-slate bg-mist hover:bg-smoke/20 rounded-buttons px-12 py-8 text-left"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="text-caption font-sohne text-slate mt-12">Querying...</p>}
      {error && <p className="text-caption font-sohne text-status-danger mt-12">{error}</p>}

      {result && (
        <div className="mt-12 p-20 bg-mist rounded-cards">
          <p className="text-body font-sohne text-ink whitespace-pre-line">{result.answer}</p>
          {result.toolsUsed?.length > 0 && (
            <p className="text-caption font-sohne text-ash mt-12">
              Answered using:{' '}
              {Array.from(new Set(result.toolsUsed)).map((t) => TOOL_LABEL[t] ?? t).join(', ')}
            </p>
          )}
          <button
            onClick={() => {
              setResult(null);
              setQuestion('');
            }}
            className="text-caption font-sohne text-slate underline mt-8"
          >
            Ask another question
          </button>
        </div>
      )}
    </div>
  );
};

export default AskComposer;
