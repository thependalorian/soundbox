/**
 * TypeScript interfaces mirroring the redesigned backend entities
 * (backend/app/db/models.py). Field names are camelCase per this
 * project's existing API/mock convention (see src/api/api.ts);
 * the backend serializes snake_case -> these shapes at the API boundary.
 */

/**
 * `faulty` and `retired` were missing, so two states the backend can produce
 * had no representation here. `retired` in particular is what a soft-deleted
 * device carries — the row survives so old payments still resolve it.
 */
export type DeviceStatus = 'active' | 'inactive' | 'offline' | 'faulty' | 'retired';
export type MerchantStatus = 'pending_kyc' | 'active' | 'suspended' | 'closed';
export type MerchantType =
  | 'informal_vendor'
  | 'taxi_driver'
  | 'small_retailer'
  | 'fuel_station'
  | 'agent'
  | 'government_service';
export type TransactionStatus = 'pending' | 'verified' | 'success' | 'failed' | 'reversed';
/**
 * The use cases the national rails carry.
 *
 * Codes follow the Bank of Namibia Instant Payment Programme's own naming.
 * The merchant-facing case is **P2B** (Person-to-Business), not "p2m" — a
 * regulator reading our returns should not have to translate our vocabulary
 * into theirs.
 *
 * The first seven are enabled for go-live. P2G, B2G and B2B are listed as
 * not enabled at launch, and are kept here because payments of those kinds
 * will appear once they are, not because we expect them now.
 */
export type PaymentType =
  | 'p2p'
  | 'p2b'
  | 'b2p'
  | 'g2p'
  | 'cash_in_merchant'
  | 'cash_out_merchant'
  | 'atm_withdrawal'
  | 'p2g'
  | 'b2g'
  | 'b2b';

/** Whether the rails carry this use case at launch. */
export const PAYMENT_TYPE_LIVE_AT_LAUNCH: Record<PaymentType, boolean> = {
  p2p: true,
  p2b: true,
  b2p: true,
  g2p: true,
  cash_in_merchant: true,
  cash_out_merchant: true,
  atm_withdrawal: true,
  p2g: false,
  b2g: false,
  b2b: false,
};

/** How the payer funded it. Wallet-funded volume is the financial-inclusion
 *  signal — it counts people transacting without a bank account. */
export type PayerInstrument = 'bank_account' | 'wallet';

/** Plain wording for people who do not think in acronyms. */
export const PAYMENT_TYPE_LABEL: Record<PaymentType, string> = {
  p2p: 'Person to person',
  p2b: 'Customer paying a business',
  b2p: 'Business paying a person',
  g2p: 'Government payment',
  cash_in_merchant: 'Cash deposited at a business',
  cash_out_merchant: 'Cash withdrawn at a business',
  atm_withdrawal: 'ATM withdrawal',
  p2g: 'Person paying government',
  b2g: 'Business paying government',
  b2b: 'Business to business',
};

export const PAYER_INSTRUMENT_LABEL: Record<PayerInstrument, string> = {
  bank_account: 'Bank account',
  wallet: 'Mobile wallet',
};
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type AnomalyAlertStatus = 'open' | 'under_review' | 'resolved' | 'escalated';
export type WalletStatus = 'active' | 'dormant' | 'suspended';
export type SettlementStatus = 'pending' | 'settled' | 'failed';

export const MERCHANT_TYPE_LABEL: Record<MerchantType, string> = {
  informal_vendor: 'Informal Vendor',
  taxi_driver: 'Taxi Driver',
  small_retailer: 'Small Retailer',
  fuel_station: 'Fuel Station',
  agent: 'Cash-in/Cash-out Agent',
  government_service: 'Government Service (G2P)',
};

/**
 * A beneficial owner as the console sees them.
 *
 * `idNumber` is deliberately absent. The national identifier is held on the
 * backend because ownership transparency requires identifying a specific
 * person, but a reviewer needs to know that an owner *was* verified, not to
 * read the number again — so the API returns `hasIdOnFile` and never the
 * value. See docs/privacy.md: it is the most sensitive field in the schema,
 * and the cheapest place to protect it is by not sending it.
 */
export interface BeneficialOwner {
  id: string;
  fullName: string;
  ownershipPercent: number;
  isPep: boolean;
  hasIdOnFile: boolean;
  verifiedAt?: string;
}

/** Generic append-only status-log row shape — device/transaction/anomaly
 * alert/merchant status log tables all share this shape on the backend. */
export interface StatusLogEntry {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note?: string;
  actorName?: string;
  createdAt: string;
}

export interface Merchant {
  id: string;
  merchantCode: string;
  legalName: string;
  tradingName?: string;
  registrationNumber?: string;
  merchantType: MerchantType;
  status: MerchantStatus;
  idVerificationStatus: 'pending' | 'verified' | 'rejected';
  contactPhone?: string;
  contactEmail?: string;
  lat?: number;
  lng?: number;
  regionCode?: string;
  regionLabel?: string;
  constituencyLabel?: string;
  localAuthorityLabel?: string;
  createdAt: string;
  beneficialOwners: BeneficialOwner[];
}

/**
 * One point for a merchant-activity map/heatmap (docs/device.md's
 * "Geographic Distribution" / "Merchant Activity Heatmaps" analytics
 * product). Backed by GET /analytics/geo-distribution.
 */
export interface GeoDistributionPoint {
  merchantId: string;
  merchantCode: string;
  legalName: string;
  lat: number | null;
  lng: number | null;
  regionCode: string | null;
  regionLabel: string | null;
  deviceCount: number;
  transactionCount: number;
}

export interface Device {
  id: string;
  deviceCode: string;
  merchantId: string;
  status: DeviceStatus;
  firmwareVersion: string;
  batteryLevel: number;
  signalStrength: number;
  registeredAt: string;
  lastHeartbeatAt: string;
}

export interface DeviceHeartbeatPoint {
  recordedAt: string;
  batteryLevel: number;
  signalStrength: number;
}

export interface Transaction {
  id: string;
  transactionRef: string;
  deviceId?: string;
  merchantId: string;
  amount: number;
  currencyCode: string;
  status: TransactionStatus;
  paymentType: PaymentType;
  payerInstrument?: PayerInstrument;
  anomalyScore?: number;
  createdAt: string;
}

export interface Settlement {
  id: string;
  merchantId: string;
  amount: number;
  currencyCode: string;
  status: SettlementStatus;
  settlementDate: string;
  reference?: string;
}

/** One rule that fired, with the real numbers behind it. Mirrors the
 *  `reasons[]` entries produced by backend AnomalyScoringEngine.predict(). */
export interface AnomalyReason {
  code: string;
  label: string;
  detail: string;
  contribution: number;
}

export type ConfidenceBand = 'low' | 'medium' | 'high';

export interface AnomalyAlert {
  id: string;
  transactionId?: string;
  merchantId: string;
  deviceId?: string;
  amount: number;
  currencyCode: string;
  riskLevel: RiskLevel;
  anomalyScore: number;
  /** Categorical band, shown ahead of the raw probability. */
  confidenceBand: ConfidenceBand;
  /** anomalyScore x amount — what the triage queue sorts by. */
  expectedLoss: number;
  reasons: AnomalyReason[];
  signalType?: string;
  status: AnomalyAlertStatus;
  modelName?: string;
  modelVersion?: string;
  detectedAt: string;
}

export interface EMoneyWallet {
  id: string;
  walletCode: string;
  merchantId: string;
  balance: number;
  currencyCode: string;
  status: WalletStatus;
  lastTransactionAt?: string;
}

export interface TransactionTrendPoint {
  date: string;
  count: number;
  p2p: number;
  p2b: number;
  g2p: number;
  b2b: number;
  p2g: number;
  cash_out: number;
}

export interface TransactionSummary {
  activeDevices: number;
  todayCount: number;
  totalVolume: number;
  flagRate: number;
}

export interface SystemHealthMetrics {
  transaction_success_rate: number;
  device_availability: number;
  response_latency: number;
  flag_rate: number;
  merchant_coverage: number;
  settlement_compliance: number;
}

export interface SystemHealth {
  healthScore: number;
  status: 'HEALTHY' | 'MONITOR' | 'ATTENTION' | 'CRITICAL';
  metrics: SystemHealthMetrics;
  normalized_scores?: Record<string, number>;
  timestamp: string;
}

export interface Psd6PaymentTypeBreakdown {
  payment_type: PaymentType;
  count: number;
  value: number;
}

export interface Psd6Report {
  report_type: 'PSD-6';
  period: string;
  generated_at: string;
  transaction_summary: {
    total_count: number;
    total_value: number;
    by_type: Psd6PaymentTypeBreakdown[];
  };
}

export interface Psd3Report {
  report_type: 'PSD-3';
  period: string;
  generated_at: string;
  wallet_summary: {
    total_wallets: number;
    active_wallets: number;
    dormant_wallets: number;
    total_balance: number;
    avg_balance: number;
  };
}
