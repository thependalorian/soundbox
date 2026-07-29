/**
 * Realistic fixture data for the mocked API layer (api.ts).
 *
 * Modeled the way a Bank of Namibia National Payment System (NPS) policy
 * analyst would expect real SoundBox data to look: merchants
 * spread across most (not all — Kavango West has zero coverage, a
 * deliberate financial-inclusion gap worth flagging) of Namibia's 14
 * regions, spanning the target-market segments in docs/business-plan.md
 * (informal vendors, taxi drivers, small retailers, fuel stations,
 * cash-in/cash-out agents, G2P disbursement points), with transaction
 * volume/value patterns and a flagging footprint concentrated on the
 * segment regulators actually worry about — cash agents — rather than
 * spread evenly across everyone.
 *
 * All names/registration numbers/ID numbers are invented, not real
 * businesses or people.
 */

import {
  Device,
  DeviceHeartbeatPoint,
  AnomalyAlert,
  AnomalyReason,
  GeoDistributionPoint,
  Merchant,
  MerchantType,
  PaymentType,
  Settlement,
  StatusLogEntry,
  Transaction,
} from '../types/soundbox';

// Deterministic PRNG (mulberry32) so the fixture set is stable across
// reloads instead of regenerating differently every render.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260727);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const between = (min: number, max: number): number => min + rng() * (max - min);
const daysAgoIso = (days: number, hour = 8): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, Math.floor(rng() * 60), 0, 0);
  return d.toISOString();
};

interface MerchantSeed {
  code: string;
  legalName: string;
  tradingName?: string;
  type: MerchantType;
  status: Merchant['status'];
  idVerificationStatus: Merchant['idVerificationStatus'];
  regionCode: string;
  regionLabel: string;
  localAuthorityLabel: string;
  constituencyLabel: string;
  lat: number;
  lng: number;
  hasBeneficialOwners?: boolean;
}

const MERCHANT_SEEDS: MerchantSeed[] = [
  { code: 'M-101', legalName: 'Katutura Fresh Market Traders', type: 'informal_vendor', status: 'active', idVerificationStatus: 'verified', regionCode: 'khomas', regionLabel: 'Khomas', localAuthorityLabel: 'Windhoek', constituencyLabel: 'Katutura Central', lat: -22.5384, lng: 17.0658 },
  { code: 'M-102', legalName: 'Walvis Bay Harbour Taxi Co-op', type: 'taxi_driver', status: 'active', idVerificationStatus: 'verified', regionCode: 'erongo', regionLabel: 'Erongo', localAuthorityLabel: 'Walvis Bay', constituencyLabel: 'Walvis Bay Urban', lat: -22.9576, lng: 14.5053 },
  { code: 'M-103', legalName: 'Oshakati Corner Spaza', type: 'small_retailer', status: 'active', idVerificationStatus: 'verified', regionCode: 'oshana', regionLabel: 'Oshana', localAuthorityLabel: 'Oshakati', constituencyLabel: 'Oshakati West', lat: -17.7833, lng: 15.7000 },
  { code: 'M-104', legalName: 'Cimas Fuel & Convenience Windhoek East', tradingName: 'Cimas Fuel Windhoek East', type: 'fuel_station', status: 'active', idVerificationStatus: 'verified', regionCode: 'khomas', regionLabel: 'Khomas', localAuthorityLabel: 'Windhoek', constituencyLabel: 'Windhoek East', lat: -22.5700, lng: 17.1000, hasBeneficialOwners: true },
  { code: 'M-105', legalName: 'Swakopmund Cash Point Services', type: 'agent', status: 'active', idVerificationStatus: 'verified', regionCode: 'erongo', regionLabel: 'Erongo', localAuthorityLabel: 'Swakopmund', constituencyLabel: 'Swakopmund', lat: -22.6784, lng: 14.5266, hasBeneficialOwners: true },
  { code: 'M-106', legalName: 'Eenhana Pension Payout Point', type: 'government_service', status: 'active', idVerificationStatus: 'verified', regionCode: 'ohangwena', regionLabel: 'Ohangwena', localAuthorityLabel: 'Eenhana', constituencyLabel: 'Eenhana', lat: -17.4667, lng: 16.3333 },
  { code: 'M-107', legalName: 'Zambezi Riverside Traders', type: 'small_retailer', status: 'pending_kyc', idVerificationStatus: 'pending', regionCode: 'zambezi', regionLabel: 'Zambezi', localAuthorityLabel: 'Katima Mulilo', constituencyLabel: 'Katima Mulilo Urban', lat: -17.4986, lng: 24.2743 },
  { code: 'M-108', legalName: 'Rundu Taxi Rank Association', type: 'taxi_driver', status: 'active', idVerificationStatus: 'verified', regionCode: 'kavango_east', regionLabel: 'Kavango East', localAuthorityLabel: 'Rundu', constituencyLabel: 'Rundu Urban', lat: -17.9333, lng: 19.7667 },
  { code: 'M-109', legalName: 'Mariental Grain & Grocery', type: 'small_retailer', status: 'active', idVerificationStatus: 'verified', regionCode: 'hardap', regionLabel: 'Hardap', localAuthorityLabel: 'Mariental', constituencyLabel: 'Mariental Urban', lat: -24.6333, lng: 17.9667 },
  { code: 'M-110', legalName: 'Keetmanshoop Fuel Stop', type: 'fuel_station', status: 'active', idVerificationStatus: 'verified', regionCode: 'karas', regionLabel: '–Karas', localAuthorityLabel: 'Keetmanshoop', constituencyLabel: 'Keetmanshoop Urban', lat: -26.5833, lng: 18.1333, hasBeneficialOwners: true },
  { code: 'M-111', legalName: 'Otjiwarongo Open Market Vendor', type: 'informal_vendor', status: 'active', idVerificationStatus: 'verified', regionCode: 'otjozondjupa', regionLabel: 'Otjozondjupa', localAuthorityLabel: 'Otjiwarongo', constituencyLabel: 'Otjiwarongo', lat: -20.4637, lng: 16.6477 },
  { code: 'M-112', legalName: 'Outapi Cash Agent Services', type: 'agent', status: 'suspended', idVerificationStatus: 'rejected', regionCode: 'omusati', regionLabel: 'Omusati', localAuthorityLabel: 'Outapi', constituencyLabel: 'Outapi', lat: -17.5000, lng: 15.0333, hasBeneficialOwners: true },
  { code: 'M-113', legalName: 'Opuwo Crafts & Trade Cooperative', type: 'informal_vendor', status: 'active', idVerificationStatus: 'verified', regionCode: 'kunene', regionLabel: 'Kunene', localAuthorityLabel: 'Opuwo', constituencyLabel: 'Opuwo Urban', lat: -18.0607, lng: 13.8400 },
  { code: 'M-114', legalName: 'Tsumeb Copper Belt Retail', type: 'small_retailer', status: 'active', idVerificationStatus: 'verified', regionCode: 'oshikoto', regionLabel: 'Oshikoto', localAuthorityLabel: 'Tsumeb', constituencyLabel: 'Tsumeb', lat: -19.2333, lng: 17.7167 },
  { code: 'M-115', legalName: 'Gobabis Cattle Market Vendor', type: 'informal_vendor', status: 'active', idVerificationStatus: 'verified', regionCode: 'omaheke', regionLabel: 'Omaheke', localAuthorityLabel: 'Gobabis', constituencyLabel: 'Gobabis', lat: -22.4500, lng: 18.9667 },
  { code: 'M-116', legalName: 'Ministry of Gender Equality G2P Disbursement', type: 'government_service', status: 'active', idVerificationStatus: 'verified', regionCode: 'khomas', regionLabel: 'Khomas', localAuthorityLabel: 'Windhoek', constituencyLabel: 'Windhoek West', lat: -22.5750, lng: 17.0850 },
];

const FIRST_NAMES = ['Johanna', 'Petrus', 'Ndapewa', 'Frieda', 'Immanuel', 'Selma', 'Gideon', 'Ndeshi'];
const LAST_NAMES = ['Shikongo', 'Amutenya', 'Nangolo', 'Kadhikwa', 'Haufiku', 'Iyambo', 'Mbango', 'Katjivena'];
const fakeName = () => `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;

export const mockMerchants: Merchant[] = MERCHANT_SEEDS.map((seed, idx) => ({
  id: `merchant-${idx + 1}`,
  merchantCode: seed.code,
  legalName: seed.legalName,
  tradingName: seed.tradingName,
  registrationNumber: `CC/${2019 + (idx % 6)}/${String(1000 + idx * 37).padStart(5, '0')}`,
  merchantType: seed.type,
  status: seed.status,
  idVerificationStatus: seed.idVerificationStatus,
  contactPhone: `+264 81 ${Math.floor(between(2000000, 9999999))}`,
  contactEmail: `${seed.code.toLowerCase()}@example.com.na`,
  lat: seed.lat,
  lng: seed.lng,
  regionCode: seed.regionCode,
  regionLabel: seed.regionLabel,
  localAuthorityLabel: seed.localAuthorityLabel,
  constituencyLabel: seed.constituencyLabel,
  createdAt: daysAgoIso(Math.floor(between(60, 400))),
  beneficialOwners: seed.hasBeneficialOwners
    ? [
        {
          id: `${seed.code}-bo-1`,
          fullName: fakeName(),
          hasIdOnFile: true,
          ownershipPercent: 60,
          isPep: false,
          verifiedAt: daysAgoIso(Math.floor(between(30, 300))),
        },
        {
          id: `${seed.code}-bo-2`,
          fullName: fakeName(),
          hasIdOnFile: true,
          ownershipPercent: 40,
          isPep: false,
          verifiedAt: daysAgoIso(Math.floor(between(30, 300))),
        },
      ]
    : [],
}));

const DEVICES_PER_TYPE: Record<MerchantType, number> = {
  informal_vendor: 1,
  taxi_driver: 1,
  small_retailer: 1,
  fuel_station: 2,
  agent: 1,
  government_service: 2,
};

export const mockDevices: Device[] = [];
{
  let n = 1;
  for (const m of mockMerchants) {
    const count = DEVICES_PER_TYPE[m.merchantType];
    for (let i = 0; i < count; i++) {
      const status: Device['status'] = m.status === 'suspended' ? 'offline' : rng() < 0.08 ? 'inactive' : 'active';
      mockDevices.push({
        id: `device-${n}`,
        deviceCode: `SB-${String(100 + n).padStart(3, '0')}`,
        merchantId: m.id,
        status,
        firmwareVersion: pick(['v2.1.0', 'v2.1.0', 'v2.0.0', 'v1.9.0']),
        batteryLevel: status === 'offline' ? 0 : Math.floor(between(15, 100)),
        signalStrength: status === 'offline' ? 0 : Math.floor(between(1, 5)),
        registeredAt: m.createdAt,
        lastHeartbeatAt: status === 'offline' ? daysAgoIso(Math.floor(between(2, 10))) : daysAgoIso(0, Math.floor(between(0, 23))),
      });
      n += 1;
    }
  }
}

const AMOUNT_RANGE: Record<MerchantType, [number, number]> = {
  informal_vendor: [20, 300],
  taxi_driver: [15, 80],
  small_retailer: [30, 500],
  fuel_station: [200, 1500],
  agent: [100, 3000],
  government_service: [1000, 2500],
};
const TXNS_PER_DAY: Record<MerchantType, [number, number]> = {
  informal_vendor: [3, 8],
  taxi_driver: [5, 12],
  small_retailer: [4, 10],
  fuel_station: [2, 5],
  agent: [3, 6],
  government_service: [1, 2],
};
// A sound box sits at a business and hears everything credited to it, not
// only till payments: a supplier settling an invoice, a grant landing, a
// relative sending money. Cash agents additionally handle wallet cash-out,
// the counter equivalent of an ATM withdrawal.
const PAYMENT_TYPE_FOR: Record<MerchantType, () => PaymentType> = {
  informal_vendor: () => (rng() < 0.88 ? 'p2b' : 'p2p'),
  taxi_driver: () => 'p2b',
  small_retailer: () => {
    const r = rng();
    return r < 0.86 ? 'p2b' : r < 0.94 ? 'p2p' : 'b2b';
  },
  fuel_station: () => {
    const r = rng();
    return r < 0.8 ? 'p2b' : r < 0.95 ? 'b2b' : 'p2p';
  },
  agent: () => {
    const r = rng();
    return r < 0.42 ? 'cash_out_merchant' : r < 0.72 ? 'p2p' : 'p2b';
  },
  government_service: () => (rng() < 0.9 ? 'g2p' : 'p2g'),
};

// Wallet-funded share by segment. Deliberately highest for informal vendors,
// taxis and agents: those are the counters where people without bank
// accounts transact, and that share is the inclusion figure worth watching.
const WALLET_SHARE: Record<MerchantType, number> = {
  informal_vendor: 0.72,
  taxi_driver: 0.68,
  agent: 0.81,
  small_retailer: 0.44,
  fuel_station: 0.21,
  government_service: 0.58,
};
// Elevated flagging footprint on the two agent merchants — matches real
// regulatory concern about cash-in/cash-out agents as an AML vector
// (docs/regulatory.md's AML framing), rather than flags spread evenly.
const FRAUD_PRONE_MERCHANT_CODES = new Set(['M-105', 'M-112']);

export const mockTransactions: Transaction[] = [];
export const mockAnomalyAlerts: AnomalyAlert[] = [];
export const mockDeviceHeartbeats: Record<string, DeviceHeartbeatPoint[]> = {};
export const mockTransactionStatusLog: Record<string, StatusLogEntry[]> = {};
export const mockAnomalyAlertStatusLog: Record<string, StatusLogEntry[]> = {};

{
  let txnN = 1;
  let alertN = 1;
  const DAYS = 30;

  for (const m of mockMerchants) {
    if (m.status === 'pending_kyc') continue; // not onboarded yet, no activity
    const device = mockDevices.find((d) => d.merchantId === m.id);
    const [amtMin, amtMax] = AMOUNT_RANGE[m.merchantType];
    const [perDayMin, perDayMax] = TXNS_PER_DAY[m.merchantType];
    const isFraudProne = FRAUD_PRONE_MERCHANT_CODES.has(m.merchantCode);

    for (let day = DAYS; day >= 0; day--) {
      // Weekends: quieter for government disbursement, busier for informal vendors/taxis
      const isWeekend = new Date(daysAgoIso(day)).getDay() % 6 === 0;
      let count = Math.round(between(perDayMin, perDayMax));
      if (m.merchantType === 'government_service' && isWeekend) count = 0;
      if ((m.merchantType === 'informal_vendor' || m.merchantType === 'taxi_driver') && isWeekend) {
        count = Math.round(count * 1.3);
      }

      for (let i = 0; i < count; i++) {
        const statusRoll = rng();
        const status: Transaction['status'] =
          statusRoll < 0.9 ? 'success' : statusRoll < 0.95 ? 'pending' : statusRoll < 0.98 ? 'failed' : 'reversed';
        const amount = Math.round(between(amtMin, amtMax) * 100) / 100;
        const isSuspicious = isFraudProne && rng() < 0.18;

        // Suspicious transactions sometimes land outside trading hours, so
        // the off-hours rule has a chance to fire honestly rather than
        // being asserted.
        const hour = isSuspicious && rng() < 0.35
          ? Math.floor(between(23, 24.99)) % 24
          : Math.floor(between(6, 21));
        const createdAt = daysAgoIso(day, hour);

        // Score is DERIVED from the rules that fire, using the same weights
        // as backend FraudDetectionEngine._evaluate_rules. Generating a
        // random score and unrelated reasons would let the fixtures show a
        // "0.9" next to reasons summing to 0.3 — the exact incoherence this
        // whole feature exists to remove.
        const reasons: AnomalyReason[] = [];
        if (isSuspicious) {
          const avg = (amtMin + amtMax) / 2;
          // Mirrors the backend rules, which compare a merchant against
          // their own same-weekday history rather than a fixed threshold.
          const weekdayName = new Date(createdAt).toLocaleDateString('en-NA', { weekday: 'long' });
          if (rng() < 0.7) {
            const norm = Math.floor(between(3, 9));
            const v = Math.floor(norm * between(3.2, 8));
            reasons.push({
              code: 'velocity_1h',
              label: 'Sudden burst of payments',
              detail: `${v} payments in one hour, against a busy ${weekdayName} hour of about ${norm} for this business.`,
              contribution: 0.3,
            });
          }
          if (rng() < 0.6) {
            const norm = Math.floor(between(12, 45));
            const v = Math.floor(norm * between(3.1, 6));
            reasons.push({
              code: 'velocity_24h',
              label: `Unusual for this business on a ${weekdayName}`,
              detail: `${v} payments today. This business normally takes about ${norm} on a ${weekdayName}.`,
              contribution: 0.3,
            });
          }
          if (amount > avg * 3 || rng() < 0.5) {
            const ratio = Math.max(amount / avg, 3.1);
            reasons.push({
              code: 'amount_anomaly',
              label: 'Unusual transaction amount',
              detail: `N$${amount.toLocaleString('en-NA', { minimumFractionDigits: 2 })} is ${ratio.toFixed(1)}x this merchant's average of N$${avg.toLocaleString('en-NA', { minimumFractionDigits: 2 })}`,
              contribution: 0.2,
            });
          }
          if (hour < 6 || hour > 22) {
            reasons.push({
              code: 'off_hours',
              label: 'Outside normal trading hours',
              detail: `Transaction at ${String(hour).padStart(2, '0')}:00, outside the 06:00-22:00 window`,
              contribution: 0.1,
            });
          }
          // Never raise an alert with nothing behind it.
          if (!reasons.length) {
            reasons.push({
              code: 'velocity_1h',
              label: 'Sudden burst of payments',
              detail: `${Math.floor(between(18, 40))} payments in one hour, against a busy hour of about 5 for this business.`,
              contribution: 0.3,
            });
          }
        }

        const anomalyScore = isSuspicious
          ? Math.min(reasons.reduce((s, r) => s + r.contribution, 0), 1)
          : between(0, 0.2);
        const txnId = `txn-${txnN}`;

        mockTransactions.push({
          id: txnId,
          transactionRef: `TXN-${String(1000 + txnN).padStart(5, '0')}`,
          deviceId: device?.id,
          merchantId: m.id,
          amount,
          currencyCode: 'NAD',
          status,
          paymentType: PAYMENT_TYPE_FOR[m.merchantType](),
          payerInstrument: rng() < WALLET_SHARE[m.merchantType] ? 'wallet' : 'bank_account',
          anomalyScore: Math.round(anomalyScore * 100) / 100,
          createdAt,
        });

        if (txnN % 47 === 0) {
          mockTransactionStatusLog[txnId] = [
            { id: `${txnId}-log-1`, fromStatus: null, toStatus: 'pending', createdAt },
            { id: `${txnId}-log-2`, fromStatus: 'pending', toStatus: status, note: 'WayaMe API confirmation', createdAt },
          ];
        }

        if (isSuspicious) {
          // Same band thresholds as the backend scorer (_BAND_MEDIUM 0.3,
          // _BAND_HIGH 0.6), so a fixture alert lands in the band the real
          // engine would have given it.
          const riskLevel: AnomalyAlert['riskLevel'] =
            anomalyScore >= 0.6 ? 'HIGH' : anomalyScore >= 0.3 ? 'MEDIUM' : 'LOW';
          const alertId = `alert-${alertN}`;
          const alertStatus: AnomalyAlert['status'] = alertN % 4 === 0 ? 'resolved' : alertN % 3 === 0 ? 'under_review' : 'open';
          // Alert type reflects the heaviest signal rather than a coin flip.
          const dominant = [...reasons].sort((a, b) => b.contribution - a.contribution)[0];
          const FRAUD_TYPE_FOR: Record<string, string> = {
            velocity_1h: 'velocity_abuse',
            velocity_24h: 'velocity_abuse',
            amount_anomaly: 'amount_anomaly',
            off_hours: 'suspicious_pattern',
          };
          mockAnomalyAlerts.push({
            id: alertId,
            transactionId: txnId,
            merchantId: m.id,
            deviceId: device?.id,
            amount,
            currencyCode: 'NAD',
            riskLevel,
            anomalyScore: Math.round(anomalyScore * 100) / 100,
            confidenceBand: riskLevel.toLowerCase() as AnomalyAlert['confidenceBand'],
            expectedLoss: Math.round(anomalyScore * amount * 100) / 100,
            reasons,
            signalType: FRAUD_TYPE_FOR[dominant.code] ?? 'suspicious_pattern',
            status: alertStatus,
            modelName: 'rule_based_anomaly_scorer',
            modelVersion: '1.1.0',
            detectedAt: createdAt,
          });
          mockAnomalyAlertStatusLog[alertId] = [
            { id: `${alertId}-log-1`, fromStatus: null, toStatus: 'open', note: 'Fraud alert created.', createdAt },
            ...(alertStatus !== 'open'
              ? [
                  {
                    id: `${alertId}-log-2`,
                    fromStatus: 'open',
                    toStatus: alertStatus,
                    note: alertStatus === 'resolved' ? 'Reviewed — confirmed legitimate high-volume trading day.' : 'Escalated to compliance for review.',
                    actorName: 'Admin User',
                    createdAt: daysAgoIso(Math.max(day - 1, 0)),
                  } as StatusLogEntry,
                ]
              : []),
          ];
          alertN += 1;
        }
        txnN += 1;
      }
    }

    // Occasional single low-level false-positive elsewhere, so flags aren't
    // *exclusively* on the two flagged agents (more realistic noise floor).
    if (!isFraudProne && rng() < 0.3) {
      const txn = mockTransactions.filter((t) => t.merchantId === m.id).slice(-1)[0];
      if (txn) {
        const alertId = `alert-${alertN}`;
        // A single weak signal: off-hours alone (0.1) plus a marginal
        // amount flag (0.2) = 0.3, the bottom of the MEDIUM band. This is
        // what a genuine false positive looks like — enough to raise, not
        // enough to act on — which is exactly why it resolves as such.
        const noiseReasons: AnomalyReason[] = [
          {
            code: 'off_hours',
            label: 'Outside normal trading hours',
            detail: `Transaction at ${String(new Date(txn.createdAt).getHours()).padStart(2, '0')}:00, outside the 06:00-22:00 window`,
            contribution: 0.1,
          },
          {
            code: 'amount_anomaly',
            label: 'Unusual transaction amount',
            detail: `N$${txn.amount.toLocaleString('en-NA', { minimumFractionDigits: 2 })} is 3.2x this merchant's recent average`,
            contribution: 0.2,
          },
        ];
        const noiseScore = noiseReasons.reduce((s, r) => s + r.contribution, 0);
        mockAnomalyAlerts.push({
          id: alertId,
          transactionId: txn.id,
          merchantId: m.id,
          deviceId: device?.id,
          amount: txn.amount,
          currencyCode: 'NAD',
          riskLevel: 'MEDIUM',
          anomalyScore: Math.round(noiseScore * 100) / 100,
          confidenceBand: 'medium',
          expectedLoss: Math.round(noiseScore * txn.amount * 100) / 100,
          reasons: noiseReasons,
          signalType: 'suspicious_pattern',
          status: 'resolved',
          modelName: 'rule_based_anomaly_scorer',
          modelVersion: '1.1.0',
          detectedAt: txn.createdAt,
        });
        alertN += 1;
      }
    }

    // Device heartbeat history (last 14 days, twice a day)
    if (device) {
      const points: DeviceHeartbeatPoint[] = [];
      let battery = 100;
      for (let day = 14; day >= 0; day--) {
        battery = Math.max(10, battery - Math.round(between(2, 9)));
        if (rng() < 0.15) battery = Math.min(100, battery + Math.round(between(40, 60))); // recharge event
        points.push({ recordedAt: daysAgoIso(day, 8), batteryLevel: battery, signalStrength: Math.floor(between(1, 5)) });
      }
      mockDeviceHeartbeats[device.id] = points;
    }
  }
}

export const mockSettlements: Settlement[] = mockMerchants
  .filter((m) => m.status === 'active')
  .flatMap((m, idx) => {
    const merchantTxns = mockTransactions.filter((t) => t.merchantId === m.id && t.status === 'success');
    const weeks = [0, 7, 14, 21];
    return weeks.map((weekStart, wIdx) => {
      const weekTxns = merchantTxns.filter((t) => {
        const days = (Date.now() - new Date(t.createdAt).getTime()) / 86400000;
        return days >= weekStart && days < weekStart + 7;
      });
      const amount = Math.round(weekTxns.reduce((sum, t) => sum + t.amount, 0) * 100) / 100;
      return {
        id: `settlement-${idx}-${wIdx}`,
        merchantId: m.id,
        amount,
        currencyCode: 'NAD',
        status: (wIdx === 0 ? 'pending' : 'settled') as Settlement['status'],
        settlementDate: daysAgoIso(weekStart),
        reference: `STL-${m.merchantCode}-${wIdx + 1}`,
      };
    });
  });

// Onboarding/KYB history — the merchant_status_log shape, seeded so the
// KYC review workflow on MerchantDetailPage has a real timeline to show,
// not just the current status.
export const mockMerchantStatusLog: Record<string, StatusLogEntry[]> = {};
for (const m of mockMerchants) {
  const entries: StatusLogEntry[] = [
    { id: `${m.id}-mlog-1`, fromStatus: null, toStatus: 'pending_kyc', note: 'Merchant registration submitted.', createdAt: m.createdAt },
  ];
  if (m.status !== 'pending_kyc') {
    entries.push({
      id: `${m.id}-mlog-2`,
      fromStatus: 'pending_kyc',
      toStatus: m.status === 'suspended' ? 'active' : m.status,
      note: 'KYC/KYB documents verified — registration certificate, beneficial ownership declaration, and ID copies on file.',
      actorName: 'Admin User',
      createdAt: daysAgoIso(Math.floor(between(40, 380))),
    });
  }
  if (m.status === 'suspended') {
    entries.push({
      id: `${m.id}-mlog-3`,
      fromStatus: 'active',
      toStatus: 'suspended',
      note: 'Suspended pending compliance review — elevated anomaly alert velocity on this account.',
      actorName: 'Admin User',
      createdAt: daysAgoIso(Math.floor(between(2, 20))),
    });
  }
  mockMerchantStatusLog[m.id] = entries;
}

export const mockDeviceStatusLog: Record<string, StatusLogEntry[]> = {};
for (const d of mockDevices) {
  const entries: StatusLogEntry[] = [
    { id: `${d.id}-dlog-1`, fromStatus: null, toStatus: 'active', note: 'Device registered.', createdAt: d.registeredAt },
  ];
  if (d.status === 'offline' || d.status === 'inactive') {
    entries.push({
      id: `${d.id}-dlog-2`,
      fromStatus: 'active',
      toStatus: d.status,
      note: d.status === 'offline' ? 'No heartbeat received — device unreachable.' : 'Marked inactive by merchant.',
      createdAt: d.lastHeartbeatAt,
    });
  }
  mockDeviceStatusLog[d.id] = entries;
}

export const mockGeoDistribution: GeoDistributionPoint[] = mockMerchants.map((m) => ({
  merchantId: m.merchantCode,
  merchantCode: m.merchantCode,
  legalName: m.legalName,
  lat: m.lat ?? null,
  lng: m.lng ?? null,
  regionCode: m.regionCode ?? null,
  regionLabel: m.regionLabel ?? null,
  deviceCount: mockDevices.filter((d) => d.merchantId === m.id).length,
  transactionCount: mockTransactions.filter((t) => t.merchantId === m.id).length,
}));
