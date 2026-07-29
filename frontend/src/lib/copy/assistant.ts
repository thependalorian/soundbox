/**
 * Copy for the analytics assistant.
 *
 * Centralised here rather than inline on the page, like every other surface in
 * this product.
 *
 * The placeholder deliberately does not say "Ask anything". Kore (Designing
 * Human-Centric AI Experiences, p126) names that exact phrasing as an
 * anti-pattern — it "sets the wrong expectations about the system's
 * capabilities". This assistant answers questions about payments, businesses,
 * coverage, alerts and regulatory returns, and nothing else, so it says so.
 */

export const ASSISTANT = {
  title: 'Ask the data',
  intro:
    'Questions in plain language, answered from live queries against the same views the dashboards use. The assistant cannot write its own queries and cannot answer with a number the data does not contain.',
  placeholder: 'Ask about payments, businesses, coverage, alerts or returns',
  send: 'Ask',
  thinking: 'Working...',
  newThread: 'New conversation',
  /** Shown under the composer, every time. The claim the surface has to earn. */
  provenance: 'Answers come from live queries, not from memory.',
  emptyHeading: 'What would you like to know?',
} as const;

/**
 * Openers. Drawn from the questions the models actually answer (see the
 * regulator page), not invented to look impressive — an example that returns
 * "I cannot answer that" on the first click destroys trust immediately.
 */
export const ASSISTANT_EXAMPLES = [
  'How many payments were there in the last 7 days, and what was the total value?',
  'Which regions have no activity at all this month?',
  'Is the network too dependent on a small number of businesses?',
  'What share of payments were funded from a wallet rather than a bank account?',
  'Which alerts deserve a person’s time first, and why?',
  'Generate the PSD-6 return for last month',
] as const;

/**
 * Human labels for backend tool names, shown while a query runs and in the
 * provenance line under an answer.
 *
 * Every tool in backend/app/agents/tools.py ALL_TOOLS has an entry. A missing
 * one falls back to the raw name, which is ugly but honest — better than
 * hiding which query produced a figure.
 */
export const TOOL_LABEL: Record<string, string> = {
  get_transaction_summary: 'Transaction summary',
  get_transaction_trends: 'Payment trends',
  get_system_health: 'System health',
  get_availability: 'Availability',
  get_settlement_lag: 'Settlement timing',
  get_anomaly_alerts: 'Flagged payments',
  get_concentration: 'Market concentration',
  get_value_distribution: 'Value distribution',
  get_inclusion_metrics: 'Inclusion measures',
  get_wallet_share: 'Wallet share',
  get_cohort_retention: 'Cohort retention',
  get_activation_and_dormancy: 'Activation and dormancy',
  get_geo_distribution: 'Business locations',
  get_geo_breakdown: 'Geographic breakdown',
  get_cash_flow: 'Agent cash position',
  forecast_activity: 'Activity forecast',
  generate_psd6_report: 'PSD-6 return',
  generate_psd3_report: 'PSD-3 return',
  generate_flag_trend_report: 'Flag trend report',
};

export const ASSISTANT_ERRORS = {
  unauthorized: 'Your session has expired. Sign in again to continue.',
  unavailable:
    'The analytics assistant is not configured on this deployment. Ask your administrator to set an API key.',
  generic: 'Could not reach the analytics assistant. Check your connection and try again.',
} as const;
