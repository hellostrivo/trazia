import { formatMXN } from '../../domain/money';
import type { Cents, ChartColorKey } from '../../domain/types';

interface BarrasChartProps {
  data: Array<{
    id: string;
    name: string;
    colorKey: ChartColorKey;
    amountCents: Cents;
  }>;
  totalCents: Cents;
}

const colorMap: Record<ChartColorKey, string> = {
  slate: '#3E5C76',
  sage: '#6B9080',
  ochre: '#C08A3E',
  clay: '#B5654A',
  plum: '#7A5C7E',
  teal: '#3F7F83',
  olive: '#8A8B4F',
  stone: '#8C8279',
  denim: '#5B7DB1',
  rose: '#A86A7B',
};

export function BarrasChart({ data, totalCents }: BarrasChartProps) {
  if (totalCents === 0 || data.length === 0) {
    return null;
  }

  const sortedData = [...data].sort((a, b) => b.amountCents - a.amountCents);

  return (
    <figure className="barras-chart">
      <figcaption className="sr-only">Distribución del presupuesto por categoría</figcaption>
      <div className="barras-chart-container">
        {sortedData.map((item) => {
          const percentage = Math.round((item.amountCents / totalCents) * 100);
          return (
            <div key={item.id} className="barras-chart-row">
              <div className="barras-chart-label" style={{ minWidth: '120px' }}>
                <span>{item.name}</span>
              </div>
              <div className="barras-chart-bar-container">
                <div
                  className="barras-chart-bar"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: colorMap[item.colorKey],
                    minWidth: percentage > 0 ? '4px' : '0px',
                  }}
                  role="progressbar"
                  aria-valuenow={percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${item.name}: ${formatMXN(item.amountCents)} (${percentage}%)`}
                />
              </div>
              <div className="barras-chart-value">
                <span>{formatMXN(item.amountCents)}</span>
                <span className="barras-chart-percentage">{percentage}%</span>
              </div>
            </div>
          );
        })}
      </div>
      <div
        className="barras-chart-note"
        style={{ fontSize: '12px', marginTop: '1rem', color: 'var(--color-ink-600)' }}
      >
        Los porcentajes están redondeados
      </div>
    </figure>
  );
}
