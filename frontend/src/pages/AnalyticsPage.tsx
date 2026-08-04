import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchSystemHealth, fetchTransactionTrends, fetchMerchants, fetchGeoDistribution, fetchWalletShare } from '../api/api';
import { MERCHANT_TYPE_LABEL, MerchantType } from '../types/domain';
import Card from '../components/ui/Card';
import PageAction from '../components/ui/PageAction';
import GeoDrilldown from '../components/Analytics/GeoDrilldown';
import MarketStructure from '../components/Analytics/MarketStructure';
import SegmentScatter from '../components/Analytics/SegmentScatter';
import { fetchMerchantSegments } from '../api/api';
import Meter from '../components/ui/Meter';

const AnalyticsPage: React.FC = () => {
  const { data: health } = useQuery({ queryKey: ['systemHealth'], queryFn: fetchSystemHealth });
  const { data: trends } = useQuery({ queryKey: ['transactionTrends'], queryFn: () => fetchTransactionTrends() });
  const { data: merchants } = useQuery({ queryKey: ['merchants'], queryFn: () => fetchMerchants() });
  const { data: geo } = useQuery({ queryKey: ['geoDistribution'], queryFn: fetchGeoDistribution });
  const { data: walletShare } = useQuery({ queryKey: ['walletShare'], queryFn: fetchWalletShare });
  const { data: segments } = useQuery({ queryKey: ['merchantSegments'], queryFn: () => fetchMerchantSegments() });

  const byType = (merchants ?? []).reduce<Record<string, number>>((acc, m) => {
    acc[m.merchantType] = (acc[m.merchantType] ?? 0) + 1;
    return acc;
  }, {});
  const byTypeData = Object.entries(byType).map(([type, count]) => ({
    type: MERCHANT_TYPE_LABEL[type as MerchantType],
    count,
  }));

  const byRegion = (geo ?? []).reduce<Record<string, number>>((acc, g) => {
    const label = g.regionLabel ?? 'Unknown';
    acc[label] = (acc[label] ?? 0) + g.transactionCount;
    return acc;
  }, {});
  const byRegionData = Object.entries(byRegion)
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);


  return (
    <div>
      <h1 className="text-heading font-signifier text-ink mb-8">Analytics</h1>
      <p className="text-body font-sohne text-slate mb-24">
        Where activity is, where it is not, and whether that needs acting on.
      </p>
      <PageAction className="mb-24" to="/reports" label="Generate this month's return" />

      {(
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24">
          <Card variant="elevated" className="p-24">
            <h3 className="text-subheading font-signifier text-ink mb-16">Payment system health</h3>
            <div className="space-y-8 text-body font-sohne">
              <div className="flex justify-between"><span className="text-slate">Health score</span><span className="text-ink font-500">{((health?.healthScore ?? 0) * 100).toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-slate">Status</span><span className={`font-500 ${health?.status === 'HEALTHY' ? 'text-status-success' : health?.status === 'MONITOR' ? 'text-status-warning' : 'text-status-danger'}`}>{health?.status}</span></div>
              <div className="flex justify-between"><span className="text-slate">Payments that went through</span><span className="text-ink">{health?.metrics?.transaction_success_rate?.toFixed(1)}%</span></div>
              <div className="flex justify-between"><span className="text-slate">Typical response</span><span className="text-ink">{health?.metrics?.response_latency}ms</span></div>
              <div className="flex justify-between"><span className="text-slate">Flagged for review</span><span className="text-ink">{health?.metrics?.flag_rate?.toFixed(2)}%</span></div>
            </div>
          </Card>

          <Card variant="elevated" className="p-24">
            <h3 className="text-subheading font-signifier text-ink mb-16">Kinds of business</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byTypeData} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" stroke="#675C62" fontSize={12} />
                <YAxis type="category" dataKey="type" stroke="#675C62" fontSize={12} width={140} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #F6F1F2' }} />
                <Bar dataKey="count" fill="#E6136C" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {byRegionData.length > 0 && (
        <Card variant="elevated" className="p-24 mb-24">
          <h3 className="text-subheading font-signifier text-ink mb-16">Where payments are happening</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byRegionData}>
              <XAxis dataKey="region" stroke="#675C62" fontSize={11} angle={-30} textAnchor="end" height={70} />
              <YAxis stroke="#675C62" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #F6F1F2' }} />
              <Bar dataKey="count" fill="#E6136C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <GeoDrilldown className="mb-24" />

      {/* Oversight measures. Kept below the operational view because an
          analyst arrives asking what happened today; market structure is
          the question they turn to next, not first. */}
      {(
        <>
          <h2 className="text-subheading font-signifier text-ink mb-4 mt-32">
            Structure, reach and reliability
          </h2>
          <p className="text-body font-sohne text-slate mb-16 max-w-[620px]">
            How the network is shaped, how far it reaches, and whether it holds up.
          </p>
          <MarketStructure />

          <h2 className="text-subheading font-signifier text-ink mb-4 mt-32">
            Business segments
          </h2>
          <p className="text-body font-sohne text-slate mb-16 max-w-[620px]">
            Businesses grouped by how they actually trade, rather than by the category chosen
            when they signed up. How a business trades keeps itself current; a chosen category
            does not.
          </p>
          {segments && <SegmentScatter data={segments} />}
        </>
      )}

      {(walletShare ?? []).length > 0 && (
        <Card variant="elevated" className="p-24 mb-24">
          <h3 className="text-subheading font-signifier text-ink mb-4">
            Paid from a wallet, by region
          </h3>
          <p className="text-caption font-sohne text-slate mb-16 max-w-[560px]">
            A payment funded from a mobile wallet usually means someone transacting without a bank
            account. This is the clearest measure available of who the shift off cash is actually
            reaching.
          </p>
          <div className="space-y-12">
            {(walletShare ?? []).map((r) => (
              <div key={r.region}>
                <div className="flex items-baseline justify-between gap-16">
                  <span className="text-caption font-sohne text-ink">{r.region}</span>
                  <span className="text-caption font-sohne text-slate tabular-nums">
                    {r.walletShare.toFixed(0)}% wallet &middot; {(r.wallet + r.bank).toLocaleString()} payments
                  </span>
                </div>
                <Meter className="mt-4" size="lg" value={r.walletShare} remainder label={`${r.region}: ${r.walletShare.toFixed(0)} percent wallet-funded`} />
              </div>
            ))}
          </div>
          <p className="text-caption font-sohne text-ash mt-16">
            Sienna is wallet-funded; grey is bank-funded.
          </p>
        </Card>
      )}

      <Card variant="elevated" className="p-24 mb-24">
        <h3 className="text-subheading font-signifier text-ink mb-16">Payments over time</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trends}>
            <XAxis dataKey="date" stroke="#675C62" fontSize={12} />
            <YAxis stroke="#675C62" fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #F6F1F2' }} />
            <Line type="monotone" dataKey="count" stroke="#E6136C" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card variant="elevated" className="p-24">
        <h3 className="text-subheading font-signifier text-ink mb-16">How people are paying</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trends}>
            <XAxis dataKey="date" stroke="#675C62" fontSize={12} />
            <YAxis stroke="#675C62" fontSize={12} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #F6F1F2' }} />
            <Legend />
            {/* All six types WayaMe carries. Three of them were being
                computed and then discarded by the chart. */}
            <Bar dataKey="p2b" stackId="t" fill="#3D1152" name="Customer paying a business" />
            <Bar dataKey="p2p" stackId="t" fill="#E6136C" name="Person to person" />
            <Bar dataKey="g2p" stackId="t" fill="#705C67" name="Government payment" />
            <Bar dataKey="b2b" stackId="t" fill="#675C62" name="Business payment" />
            <Bar dataKey="cash_out_merchant" stackId="t" fill="#FDEEF2" name="Wallet cash-out" />
            <Bar dataKey="p2g" stackId="t" fill="#979799" name="Payment to government" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
