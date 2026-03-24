import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface DayData {
  date: string;
  label: string;
  sales: number;
}

async function fetchWeeklySales(): Promise<DayData[]> {
  const days: DayData[] = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 864e5);
    days.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      sales: 0,
    });
  }

  const weekAgo = days[0].date;
  const { data } = await supabase
    .from('nightly_submissions')
    .select('submission_date, sales_total')
    .eq('status', 'approved')
    .gte('submission_date', weekAgo);

  (data ?? []).forEach((row: any) => {
    const day = days.find((d) => d.date === row.submission_date);
    if (day) day.sales += parseFloat(row.sales_total) || 0;
  });

  return days;
}

export function SalesTrendChart() {
  const { data, isLoading } = useQuery({
    queryKey: ['sales-trend-chart'],
    queryFn: fetchWeeklySales,
    staleTime: 120_000,
  });

  if (isLoading || !data) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", fontSize: '0.78rem' }}>
        Loading chart…
      </div>
    );
  }

  const hasData = data.some((d) => d.sales > 0);

  if (!hasData) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace", fontSize: '0.78rem' }}>
        No sales data this week. Approve nightly submissions to see trends.
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px 4px', height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: "'DM Mono', monospace" }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: "'DM Mono', monospace" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontFamily: "'DM Mono', monospace",
              fontSize: '0.78rem',
            }}
            formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Sales']}
            labelStyle={{ color: 'var(--text-muted)' }}
          />
          <Bar dataKey="sales" fill="var(--gold)" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
