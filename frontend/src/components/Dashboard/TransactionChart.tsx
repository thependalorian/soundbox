import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TransactionTrendPoint } from '../../types/soundbox';

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
        <XAxis dataKey="date" stroke="#675C62" fontSize={13} tickLine={false} axisLine={{ stroke: '#F6F1F2' }} />
        <YAxis stroke="#675C62" fontSize={13} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #F6F1F2' }} />
        <Legend />
        <Line type="monotone" dataKey="count" stroke="#E6136C" strokeWidth={2} dot={false} name="Transactions" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TransactionChart;
