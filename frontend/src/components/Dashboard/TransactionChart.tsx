import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TransactionTrendPoint } from '../../types/domain';
import { AXIS, GRID, DATA } from '../../lib/chartTokens';

interface TransactionChartProps {
  data?: TransactionTrendPoint[];
}

const TransactionChart: React.FC<TransactionChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center py-32 text-body text-slate">No data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="date" stroke={AXIS} fontSize={13} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis stroke={AXIS} fontSize={13} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${GRID}` }} />
        <Legend />
        <Line type="monotone" dataKey="count" stroke={DATA} strokeWidth={2} dot={false} name="Transactions" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TransactionChart;
