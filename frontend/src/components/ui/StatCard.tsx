import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import Card from './Card';

interface StatCardProps {
  title: string;
  value: string;
  delta?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  trend?: number[];
  deltaTone?: 'up' | 'down' | 'neutral';
}

/**
 * Floating-artifact stat fragment: bold metric, delta line, and a
 * gestural sparkline (no axes, no gridlines — a line, not a dashboard
 * chart) in the sienna ink used for chart strokes throughout the system.
 */
const StatCard: React.FC<StatCardProps> = ({ title, value, delta, icon: Icon, trend, deltaTone = 'neutral' }) => {
  const deltaColor =
    deltaTone === 'up' ? 'text-status-success' : deltaTone === 'down' ? 'text-status-danger' : 'text-slate';
  const data = (trend ?? []).map((v, i) => ({ i, v }));

  return (
    <Card variant="elevated" className="p-20">
      <div className="flex items-start justify-between">
        <span className="text-caption font-sohne text-slate">{title}</span>
        {Icon && <Icon className="w-20 h-20 text-ash" />}
      </div>
      <div className="text-body-lg font-sohne font-500 text-ink mt-8">{value}</div>
      {delta && <div className={`text-caption font-sohne mt-4 ${deltaColor}`}>{delta}</div>}
      {data.length > 1 && (
        <div className="h-40 mt-12 -mx-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line type="monotone" dataKey="v" stroke="#E6136C" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

export default StatCard;
