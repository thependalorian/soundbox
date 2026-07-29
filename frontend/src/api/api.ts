import axios from 'axios';
import { logger } from '../lib/logger';
import {
  AskAnalyticsResponse,
  BeneficialOwner,
  Device,
  DeviceHeartbeatPoint,
  AnomalyAlert,
  GeoDistributionPoint,
  Merchant,
  PayerInstrument,
  PaymentType,
  Psd3Report,
  Psd6Report,
  Settlement,
  StatusLogEntry,
  SystemHealth,
  Transaction,
  TransactionSummary,
  TransactionTrendPoint,
} from '../types/soundbox';
// Fixtures are re-exported for the demo page only — it is explicitly a
// demonstration and says so. No live read in this file touches them.
import {
  mockDevices,
  mockAnomalyAlerts,
  mockGeoDistribution,
  mockMerchants,
  mockSettlements,
  mockTransactions,
} from './mockData';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A 401 from /auth/login means "wrong password", not "your session
    // expired" -- forcing a redirect here would blow away the login form's
    // own error message before the user could read it.
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { mockDevices, mockTransactions, mockAnomalyAlerts, mockMerchants, mockGeoDistribution, mockSettlements };

interface ListFilters {
  merchantId?: string;
  status?: string;
  search?: string;
}

// Rows store the merchant's internal UUID, but callers — the signed-in
// merchant user's AuthContext.merchantId, for instance — may hold the
// human-readable code ("M-101") instead. The backend accepts either and
// resolves it, so this is a pass-through. It used to translate the two
// using the fixture list, which is what tied every filtered read to
// mockData; the translation belongs where the merchant list actually lives.
const resolveMerchantId = (idOrCode?: string): string | undefined => idOrCode || undefined;

/**
 * Historically sent X-User-Role/X-User-Name so the backend could record who
 * made a change. The backend now derives that identity itself from the
 * verified JWT (see AuthContext -- the Authorization header is added
 * automatically by the request interceptor above), so these are no longer
 * read for anything. Kept as a no-op so call sites -- which still pass an
 * `actor` for UI purposes (e.g. optimistic-update messaging) -- don't all
 * need to change in the same pass as the auth model.
 */
const actorHeaders = (_role: string, _name: string) => ({});

/**
 * Live reads.
 *
 * These call the backend. They do **not** fall back to fixtures when the
 * database is empty, and that is deliberate: this product's whole argument
 * is that its numbers are real, so an empty deployment must look empty. A
 * console that quietly shows sample rows when the API returns nothing is the
 * same defect as the invented growth figures removed earlier, only harder to
 * notice.
 *
 * The fixtures remain in mockData.ts and are used by the demo page, which is
 * explicitly a demonstration and says so.
 */

/** Errors are logged and rethrown; pages render their own empty and error states. */
const live = async <T>(label: string, call: () => Promise<T>): Promise<T> => {
  try {
    return await call();
  } catch (e) {
    logger.error(`Request failed: ${label}`, e);
    throw e;
  }
};

export const fetchDevices = async (filters?: ListFilters): Promise<Device[]> =>
  live('devices', async () => {
    const res = await api.get('/devices', {
      params: {
        merchant_id: resolveMerchantId(filters?.merchantId),
        status: filters?.status,
        search: filters?.search,
      },
    });
    return res.data.devices as Device[];
  });

export interface DeviceDetail extends Device {
  statusLog: StatusLogEntry[];
  heartbeats: DeviceHeartbeatPoint[];
  recentTransactions: Transaction[];
}

export const fetchDeviceById = async (id: string): Promise<DeviceDetail | undefined> =>
  live('device detail', async () => {
    const res = await api.get(`/devices/${id}`);
    return res.data as DeviceDetail;
  });

export const fetchDeviceHeartbeats = async (deviceId: string): Promise<DeviceHeartbeatPoint[]> =>
  live('device heartbeats', async () => {
    const res = await api.get(`/devices/${deviceId}`);
    return res.data.heartbeats as DeviceHeartbeatPoint[];
  });

/** Moving a device to another business. Recorded in the device's status log. */
export const assignDevice = async (
  deviceId: string,
  merchantId: string,
  actor: { role: string; name: string },
  note?: string
): Promise<Device> =>
  live('assign device', async () => {
    const res = await api.put(
      `/devices/${deviceId}/assign`,
      { merchant_id: merchantId, note },
      actorHeaders(actor.role, actor.name)
    );
    return res.data as Device;
  });

export const setDeviceStatus = async (
  deviceId: string,
  status: string,
  actor: { role: string; name: string },
  note?: string
): Promise<Device> =>
  live('set device status', async () => {
    const res = await api.put(
      `/devices/${deviceId}/status`,
      { status, note },
      actorHeaders(actor.role, actor.name)
    );
    return res.data as Device;
  });

export const fetchTransactions = async (
  filters?: ListFilters & { deviceId?: string; paymentType?: string; payerInstrument?: string }
): Promise<Transaction[]> =>
  live('transactions', async () => {
    const res = await api.get('/transactions', {
      params: {
        merchant_id: resolveMerchantId(filters?.merchantId),
        device_id: filters?.deviceId,
        status: filters?.status,
        payment_type: filters?.paymentType,
        payer_instrument: filters?.payerInstrument,
        search: filters?.search,
      },
    });
    return res.data.transactions as Transaction[];
  });

export const fetchTransactionById = async (id: string): Promise<Transaction | undefined> =>
  live('transaction detail', async () => {
    const res = await api.get(`/transactions/${id}`);
    return res.data as Transaction;
  });

export const fetchTransactionStatusLog = async (transactionId: string): Promise<StatusLogEntry[]> =>
  live('transaction status log', async () => {
    const res = await api.get(`/transactions/${transactionId}`);
    return res.data.statusLog as StatusLogEntry[];
  });

export const fetchAnomalyAlerts = async (filters?: ListFilters): Promise<AnomalyAlert[]> =>
  live('anomaly alerts', async () => {
    const res = await api.get('/anomaly-alerts', {
      params: {
        merchant_id: resolveMerchantId(filters?.merchantId),
        status: filters?.status,
      },
    });
    // Ordered by exposure, not recency: the queue's job is to put the most
    // money at risk in front of the analyst first. The backend already sorts
    // this way; sorting again keeps the guarantee local to the caller.
    const rows = (res.data.alerts ?? res.data) as AnomalyAlert[];
    return [...rows].sort((a, b) => b.expectedLoss - a.expectedLoss);
  });

export const fetchAnomalyAlertById = async (id: string): Promise<AnomalyAlert | undefined> =>
  live('alert detail', async () => {
    const res = await api.get(`/anomaly-alerts/${id}`);
    return res.data as AnomalyAlert;
  });

export const fetchAnomalyAlertStatusLog = async (alertId: string): Promise<StatusLogEntry[]> =>
  live('alert status log', async () => {
    const res = await api.get(`/anomaly-alerts/${alertId}`);
    return res.data.statusLog as StatusLogEntry[];
  });

export const fetchMerchants = async (filters?: ListFilters): Promise<Merchant[]> =>
  live('merchants', async () => {
    const res = await api.get('/merchants', {
      params: { status: filters?.status, search: filters?.search },
    });
    return res.data.merchants as Merchant[];
  });

/** Count of applications still awaiting a decision, for the nav badge. */
export const fetchPendingMerchantCount = async (): Promise<number> =>
  live('pending merchant count', async () => {
    const res = await api.get('/merchants', { params: { limit: 1 } });
    return Number(res.data.pendingReview ?? 0);
  });

export interface MerchantDetail extends Merchant {
  address: Record<string, unknown>;
  beneficialOwners: BeneficialOwner[];
  statusLog: StatusLogEntry[];
  devices: Device[];
}

export const fetchMerchantById = async (id: string): Promise<MerchantDetail | undefined> =>
  live('merchant detail', async () => {
    const res = await api.get(`/merchants/${id}`);
    return res.data as MerchantDetail;
  });

/** Approve, suspend, or close an application. Adverse outcomes require a note. */
export const setMerchantStatus = async (
  merchantId: string,
  status: string,
  actor: { role: string; name: string },
  note?: string
): Promise<Merchant> =>
  live('set merchant status', async () => {
    const res = await api.put(
      `/merchants/${merchantId}/status`,
      { status, note },
      actorHeaders(actor.role, actor.name)
    );
    return res.data as Merchant;
  });

export const fetchSettlements = async (idOrCode?: string): Promise<Settlement[]> =>
  live('settlements', async () => {
    const res = await api.get('/settlements', {
      params: { merchant_id: resolveMerchantId(idOrCode) },
    });
    return res.data.settlements as Settlement[];
  });
export const fetchTransactionSummary = async (idOrCode?: string): Promise<TransactionSummary> =>
  live('transaction summary', async () => {
    const res = await api.get('/transaction-summary', {
      params: { merchant_id: resolveMerchantId(idOrCode) },
    });
    return res.data as TransactionSummary;
  });
/**
 * Wallet versus bank, by region.
 *
 * The question behind it is who is being paid without a bank account — the
 * segment the whole programme exists to reach. The backend counts an
 * `unknown` instrument separately rather than folding it into `bank`, so a
 * gap in the data cannot read as a finding.
 */
export const fetchWalletShare = async (): Promise<
  { region: string; wallet: number; bank: number; walletShare: number }[]
> =>
  live('wallet share', async () => {
    const res = await api.get('/wallet-share');
    return res.data.regions ?? res.data;
  });
/**
 * Period-over-period change, actually computed.
 *
 * The dashboard once displayed hardcoded strings ("+12% vs last period")
 * that nothing calculated. In a product whose argument is that its figures
 * are real, an invented growth number on the first screen is the most
 * damaging thing on the page. Returns null where there is no prior period
 * to compare against — no baseline means no claim.
 */
export const fetchPeriodDeltas = async (
  idOrCode?: string,
  days = 7
): Promise<{ transactions: number | null; volume: number | null; devices: number | null }> =>
  live('period deltas', async () => {
    const rows = await fetchTransactions({ merchantId: idOrCode });
    const now = Date.now();
    const windowMs = days * 24 * 60 * 60 * 1000;
    const inWindow = (t: Transaction, from: number, to: number) => {
      const at = new Date(t.createdAt).getTime();
      return at >= from && at < to;
    };
    const current = rows.filter((t) => inWindow(t, now - windowMs, now));
    const prior = rows.filter((t) => inWindow(t, now - 2 * windowMs, now - windowMs));

    const pctChange = (a: number, b: number): number | null =>
      b === 0 ? null : ((a - b) / b) * 100;
    const sum = (list: Transaction[]) => list.reduce((acc, t) => acc + t.amount, 0);

    return {
      transactions: pctChange(current.length, prior.length),
      volume: pctChange(sum(current), sum(prior)),
      // Device count is a stock, not a flow: there is no prior-period
      // snapshot to difference against, so no figure is claimed.
      devices: null,
    };
  });
export type GeoLevel = 'region' | 'constituency' | 'local_authority';

export interface GeoFilters {
  paymentType?: PaymentType | '';
  payerInstrument?: PayerInstrument | '';
  /** Rolling window in days. 0 or undefined means all history. */
  days?: number;
}

export interface GeoBreakdownRow {
  level: GeoLevel;
  label: string;
  /** Parent region, so a child row can be traced upward. */
  parent?: string;
  merchantCount: number;
  transactionCount: number;
  volume: number;
  walletCount: number;
  walletShare: number;
  flagged: number;
}

/**
 * Activity at any level of the geographic hierarchy, filtered.
 *
 * Namibia is 14 regions, 121 constituencies and 57 local authorities.
 * National totals conceal the thing worth knowing — a region can look
 * healthy while several of its constituencies have no activity at all — so
 * every level is queryable rather than only the top one.
 *
 * Mirrors `AnalyticsService.get_geo_breakdown` so the client and server
 * implementations cannot drift.
 */
export const fetchGeoBreakdown = async (
  level: GeoLevel = 'region',
  parentLabel?: string,
  filters: GeoFilters = {}
): Promise<GeoBreakdownRow[]> =>
  live('geographic breakdown', async () => {
    const res = await api.get('/geo-breakdown', {
      params: {
        level,
        parent_code: parentLabel,
        payment_type: filters.paymentType,
        payer_instrument: filters.payerInstrument,
        days: filters.days,
      },
    });
    return (res.data.rows ?? res.data) as GeoBreakdownRow[];
  });
export const fetchSystemHealth = async (): Promise<SystemHealth> =>
  live('system health', async () => {
    const res = await api.get('/system-health');
    return res.data as SystemHealth;
  });
export const fetchTransactionTrends = async (idOrCode?: string): Promise<TransactionTrendPoint[]> =>
  live('transaction trends', async () => {
    const res = await api.get('/transaction-trends', {
      params: { merchant_id: resolveMerchantId(idOrCode) },
    });
    return (res.data.trends ?? res.data) as TransactionTrendPoint[];
  });
export const fetchPSD6Report = async (month: number, year: number): Promise<Psd6Report> =>
  live('PSD-6 return', async () => {
    const res = await api.get('/psd-6', { params: { month, year } });
    return res.data as Psd6Report;
  });
export interface FraudTrendMonth {
  month: string;
  totalAlerts: number;
  highRiskAlerts: number;
  avgProbability: number;
}

export interface FlagTrendReport {
  report_type: 'FRAUD_TREND';
  generated_at: string;
  monthly_trends: FraudTrendMonth[];
  by_type: { type: string; count: number; value: number }[];
}

export const fetchFlagTrendReport = async (): Promise<FlagTrendReport> =>
  live('flagged trend report', async () => {
    const res = await api.get('/flag-trends');
    return res.data as FlagTrendReport;
  });
export const fetchGeoDistribution = async (): Promise<GeoDistributionPoint[]> =>
  live('geographic distribution', async () => {
    const res = await api.get('/geo-distribution');
    return (res.data.points ?? res.data) as GeoDistributionPoint[];
  });
export const fetchPSD3Report = async (): Promise<Psd3Report> =>
  live('PSD-3 return', async () => {
    const res = await api.get('/psd-3');
    return res.data as Psd3Report;
  });
/**
 * A KYC decision on an application.
 *
 * Approval moves the business to `active`; rejection to `suspended`, which
 * is the adverse state in the configured taxonomy and requires a reason —
 * a business turned away is owed one, and the backend refuses the change
 * without it.
 */
export const reviewMerchantKyc = async (
  merchantId: string,
  decision: 'approve' | 'reject',
  note: string,
  actor: { role: string; name: string }
): Promise<Merchant> =>
  setMerchantStatus(
    merchantId,
    decision === 'approve' ? 'active' : 'suspended',
    actor,
    note
  );
export const setAnomalyAlertStatus = async (
  alertId: string,
  newStatus: AnomalyAlert['status'],
  note: string,
  actor: { role: string; name: string }
): Promise<{ id: string; status: string }> =>
  live('set alert status', async () => {
    const res = await api.put(
      `/anomaly-alerts/${alertId}/status`,
      { status: newStatus, note: note || undefined },
      actorHeaders(actor.role, actor.name)
    );
    return res.data;
  });
export const recordAnomalyFeedback = async (
  alertId: string,
  verdict: 'confirmed_fraud' | 'not_fraud' | 'need_more_info',
  note: string,
  actor: { role: string; name: string }
): Promise<{ id: string; status: string }> =>
  live('record verdict', async () => {
    const res = await api.post(
      `/anomaly-alerts/${alertId}/verdict`,
      { verdict, note: note || undefined },
      actorHeaders(actor.role, actor.name)
    );
    return res.data;
  });

export const fetchMerchantStatusLog = async (merchantId: string): Promise<StatusLogEntry[]> =>
  live('business status log', async () => {
    const res = await api.get(`/merchants/${merchantId}`);
    return res.data.statusLog as StatusLogEntry[];
  });
export const fetchDeviceStatusLog = async (deviceId: string): Promise<StatusLogEntry[]> =>
  live('device status log', async () => {
    const res = await api.get(`/devices/${deviceId}`);
    return res.data.statusLog as StatusLogEntry[];
  });
export interface AnomalyRule {
  code: string;
  label: string;
  description: string;
  enabled: boolean;
  contribution: number;
  threshold: number | null;
  thresholdLabel: string | null;
  thresholdMin?: number;
  thresholdMax?: number;
}

export interface AnomalyPolicySetting {
  code: string;
  label: string;
  description: string;
  value: number;
  valueMin: number;
  valueMax: number;
}

export interface AnomalyRuleConfig {
  rules: AnomalyRule[];
  policy: AnomalyPolicySetting[];
  /** Identifies the exact configuration a score was produced under. */
  fingerprint: string;
}

export interface RuleChange {
  id: string;
  code: string;
  label: string;
  field: string;
  from: string | null;
  to: string | null;
  changedBy: string;
  note: string | null;
  at: string;
}

/**
 * Wire shapes.
 *
 * The API speaks snake_case; the console speaks camelCase. These describe
 * the boundary explicitly rather than casting through `any` — a mapper typed
 * `any` silently accepts a field that has been renamed on the backend, which
 * is exactly the break it exists to catch.
 */
interface RuleWire {
  code: string;
  label: string;
  description: string;
  enabled: boolean;
  contribution: number;
  threshold: number | null;
  threshold_label: string | null;
  threshold_min?: number;
  threshold_max?: number;
}

interface PolicyWire {
  code: string;
  label: string;
  description: string;
  value: number;
  value_min: number;
  value_max: number;
}

interface RuleChangeWire {
  id: string;
  code: string;
  label: string;
  field: string;
  from: string | null;
  to: string | null;
  changed_by: string;
  note: string | null;
  at: string;
}

const toRule = (r: RuleWire): AnomalyRule => ({
  code: r.code,
  label: r.label,
  description: r.description,
  enabled: Boolean(r.enabled),
  contribution: Number(r.contribution),
  threshold: r.threshold === null || r.threshold === undefined ? null : Number(r.threshold),
  thresholdLabel: r.threshold_label ?? null,
  thresholdMin: r.threshold_min === undefined ? undefined : Number(r.threshold_min),
  thresholdMax: r.threshold_max === undefined ? undefined : Number(r.threshold_max),
});

const toPolicy = (p: PolicyWire): AnomalyPolicySetting => ({
  code: p.code,
  label: p.label,
  description: p.description,
  value: Number(p.value),
  valueMin: Number(p.value_min),
  valueMax: Number(p.value_max),
});

export const fetchAnomalyRules = async (): Promise<AnomalyRuleConfig> => {
  const res = await api.get('/settings/anomaly-rules');
  return {
    rules: res.data.rules.map(toRule),
    policy: res.data.policy.map(toPolicy),
    fingerprint: res.data.fingerprint,
  };
};

export const updateAnomalyRule = async (
  code: string,
  changes: { enabled?: boolean; contribution?: number; threshold?: number; note?: string },
  actor: { role: string; name: string }
): Promise<{ rule: AnomalyRule; fingerprint: string }> => {
  const res = await api.put(
    `/settings/anomaly-rules/${code}`,
    changes,
    actorHeaders(actor.role, actor.name)
  );
  return { rule: toRule(res.data.rule), fingerprint: res.data.fingerprint };
};

export const updateAnomalyPolicy = async (
  code: string,
  value: number,
  actor: { role: string; name: string },
  note?: string
): Promise<{ policy: AnomalyPolicySetting; fingerprint: string }> => {
  const res = await api.put(
    `/settings/anomaly-policy/${code}`,
    { value, note },
    actorHeaders(actor.role, actor.name)
  );
  return { policy: toPolicy(res.data.policy), fingerprint: res.data.fingerprint };
};

export const fetchRuleHistory = async (limit = 25): Promise<RuleChange[]> => {
  const res = await api.get('/settings/anomaly-rules/history', { params: { limit } });
  return res.data.changes.map((c: RuleChangeWire) => ({
    id: c.id,
    code: c.code,
    label: c.label,
    field: c.field,
    from: c.from,
    to: c.to,
    changedBy: c.changed_by,
    note: c.note,
    at: c.at,
  }));
};

export interface RulePreview {
  reviewThreshold: number;
  scoredTotal: number;
  wouldQueue: number;
  belowThreshold: number;
}

export const fetchRulePreview = async (): Promise<RulePreview> => {
  const res = await api.post('/settings/anomaly-rules/preview');
  return {
    reviewThreshold: Number(res.data.review_threshold),
    scoredTotal: Number(res.data.scored_total),
    wouldQueue: Number(res.data.would_queue),
    belowThreshold: Number(res.data.below_threshold),
  };
};

/** Record what firmware a device is believed to be running. */
export const updateDevice = async (
  deviceId: string,
  changes: { firmwareVersion?: string; note?: string },
  actor: { role: string; name: string }
): Promise<Device> =>
  live('update device', async () => {
    const res = await api.put(
      `/devices/${deviceId}`,
      { firmware_version: changes.firmwareVersion, note: changes.note },
      actorHeaders(actor.role, actor.name)
    );
    return res.data as Device;
  });

/** Add a device to the estate before it has ever reported in. */
export const createDevice = async (
  input: { deviceCode: string; firmwareVersion?: string; merchantId?: string; note?: string },
  actor: { role: string; name: string }
): Promise<Device> =>
  live('create device', async () => {
    const res = await api.post(
      '/devices',
      {
        device_code: input.deviceCode,
        firmware_version: input.firmwareVersion || '0.0.0',
        merchant_id: input.merchantId || undefined,
        note: input.note,
      },
      actorHeaders(actor.role, actor.name)
    );
    return res.data as Device;
  });

/**
 * Retire a device.
 *
 * Soft: the row survives, so a payment taken through this device last year
 * still resolves it. It simply leaves every list.
 */
export const retireDevice = async (
  deviceId: string,
  actor: { role: string; name: string },
  note?: string
): Promise<{ id: string; retired: boolean }> =>
  live('retire device', async () => {
    const res = await api.delete(`/devices/${deviceId}`, {
      params: { note },
      ...actorHeaders(actor.role, actor.name),
    });
    return res.data;
  });

/** Register a business application. Always starts pending review. */
export const createMerchant = async (
  input: {
    merchantCode: string;
    legalName: string;
    tradingName?: string;
    registrationNumber?: string;
    contactPhone?: string;
    contactEmail?: string;
    regionId?: string;
  },
  actor: { role: string; name: string }
): Promise<Merchant> =>
  live('create business', async () => {
    const res = await api.post(
      '/merchants',
      {
        merchant_code: input.merchantCode,
        legal_name: input.legalName,
        trading_name: input.tradingName || undefined,
        registration_number: input.registrationNumber || undefined,
        contact_phone: input.contactPhone || undefined,
        contact_email: input.contactEmail || undefined,
        region_id: input.regionId || undefined,
      },
      actorHeaders(actor.role, actor.name)
    );
    return res.data as Merchant;
  });

/** Update a business profile. Status moves only through a decision. */
export const updateMerchant = async (
  merchantId: string,
  changes: Record<string, string | number | undefined>,
  actor: { role: string; name: string }
): Promise<Merchant> =>
  live('update business', async () => {
    const res = await api.put(`/merchants/${merchantId}`, changes, actorHeaders(actor.role, actor.name));
    return res.data as Merchant;
  });

/**
 * Close a business. The reason is required, and its devices are released.
 *
 * A device still assigned to a business that no longer trades would count
 * toward coverage as reach that does not exist.
 */
export const closeMerchant = async (
  merchantId: string,
  note: string,
  actor: { role: string; name: string }
): Promise<{ id: string; devicesReleased: number }> =>
  live('close business', async () => {
    const res = await api.delete(`/merchants/${merchantId}`, {
      params: { note },
      ...actorHeaders(actor.role, actor.name),
    });
    return res.data;
  });

/** Record a beneficial owner. The identifier is written and never read back. */
export const addBeneficialOwner = async (
  merchantId: string,
  input: { fullName: string; idNumber: string; ownershipPercent: number; isPep: boolean },
  actor: { role: string; name: string }
): Promise<BeneficialOwner> =>
  live('add beneficial owner', async () => {
    const res = await api.post(
      `/merchants/${merchantId}/beneficial-owners`,
      {
        full_name: input.fullName,
        id_number: input.idNumber,
        ownership_percent: input.ownershipPercent,
        is_pep: input.isPep,
      },
      actorHeaders(actor.role, actor.name)
    );
    return res.data as BeneficialOwner;
  });

export const removeBeneficialOwner = async (
  merchantId: string,
  ownerId: string,
  actor: { role: string; name: string }
): Promise<{ id: string; removed: boolean }> =>
  live('remove beneficial owner', async () => {
    const res = await api.delete(
      `/merchants/${merchantId}/beneficial-owners/${ownerId}`,
      actorHeaders(actor.role, actor.name)
    );
    return res.data;
  });

/**
 * The configured values for one taxonomy.
 *
 * Status options are read rather than hardcoded. A UI holding its own copy
 * of a list that lives in configuration will eventually offer a value the
 * API rejects — which is precisely what a hardcoded "faulty" device status
 * did before this existed.
 */
export const fetchTypeDefinitions = async (
  domain: string
): Promise<{ code: string; label: string }[]> =>
  live(`type definitions: ${domain}`, async () => {
    const res = await api.get(`/type-definitions/${domain}`);
    return res.data.values as { code: string; label: string }[];
  });

/* ---------------------------------------------------------------------- *
 * Oversight analytics
 *
 * Market structure, distribution, inclusion, retention, availability and
 * behavioural segmentation. These answer what a payment system department
 * asks, which is not what an operations dashboard answers.
 * ---------------------------------------------------------------------- */

export interface Concentration {
  status: string;
  observationDays: number;
  merchants: number;
  transactions: number;
  totalValue: number;
  /** 0-10,000. Under 1,500 unconcentrated; over 2,500 highly concentrated. */
  merchantHhi: number | null;
  merchantConcentrationBand: string;
  regionHhi: number | null;
  top3MerchantShare: number;
  top10MerchantShare: number;
  valueGini: number | null;
  regionShares: { region: string; sharePct: number; value: number }[];
  belowEvidenceFloor: boolean;
  detail?: string;
}

export interface ValueDistribution {
  status: string;
  transactions: number;
  median: number;
  mean: number;
  meanExceedsMedianBy: number;
  p25: number;
  p75: number;
  p90: number;
  p99: number;
  histogram: { label: string; count: number; sharePct: number }[];
  belowEvidenceFloor: boolean;
  detail?: string;
}

export interface InclusionMetrics {
  status: string;
  walletPayments: number;
  bankPayments: number;
  instrumentNotRecorded: number;
  walletSharePct: number | null;
  walletShareBasis: number;
  businessesRegistered: number;
  businessesAccepting: number;
  acceptanceRatePct: number | null;
  businessesOnboardedInWindow: number;
  regionsWithNoBusiness: string[];
  regionsCovered: number;
  regionsTotal: number;
  belowEvidenceFloor: boolean;
  detail?: string;
}

export interface CohortRetention {
  status: string;
  months: number;
  cohorts: {
    cohort: string;
    size: number;
    periods: { monthOffset: number; month: string; active: number; retentionPct: number }[];
  }[];
  detail?: string;
}

export interface Availability {
  status: string;
  transactions: number;
  successRatePct: number;
  worstDay: { date: string; successRatePct: number; transactions: number } | null;
  worstHour: { hour: string; successRatePct: number; transactions: number } | null;
  daysMeasured: number;
  failuresByStatus: { status: string; count: number }[];
  medianResponseMs: number | null;
  p95ResponseMs: number | null;
  belowEvidenceFloor: boolean;
  detail?: string;
}

export interface MerchantSegmentation {
  status: 'ok' | 'insufficient_data';
  observationDays: number;
  merchantsConsidered: number;
  merchantsRequired?: number;
  k: number;
  /** How well-separated the groups are. Reported, never hidden. */
  silhouette: number;
  segments: {
    segment: number;
    label: string;
    merchants: number;
    share: number;
    medianAmount: number;
    totalTransactions: number;
  }[];
  assignments: {
    merchantId: string;
    displayName: string;
    segment: number;
    transactions: number;
    paymentsPerActiveDay: number;
    medianAmount: number;
  }[];
  detail?: string;
}

export const fetchConcentration = async (days = 90): Promise<Concentration> =>
  live('concentration', async () => (await api.get('/market/concentration', { params: { days } })).data);

export const fetchValueDistribution = async (days = 90): Promise<ValueDistribution> =>
  live('value distribution', async () => (await api.get('/market/value-distribution', { params: { days } })).data);

export const fetchInclusionMetrics = async (days = 90): Promise<InclusionMetrics> =>
  live('inclusion metrics', async () => (await api.get('/market/inclusion', { params: { days } })).data);

export const fetchCohortRetention = async (months = 6): Promise<CohortRetention> =>
  live('cohort retention', async () => (await api.get('/market/retention', { params: { months } })).data);

export const fetchAvailability = async (days = 30): Promise<Availability> =>
  live('availability', async () => (await api.get('/market/availability', { params: { days } })).data);

export const fetchMerchantSegments = async (days = 90): Promise<MerchantSegmentation> =>
  live('merchant segments', async () => (await api.get('/market/segments', { params: { days } })).data);

export const askAnalytics = async (question: string): Promise<AskAnalyticsResponse> => {
  const res = await api.post('/analytics/ask', { question });
  return res.data;
};

export default api;
