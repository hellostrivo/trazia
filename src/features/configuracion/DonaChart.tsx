import { formatMXN } from '../../domain/money';
import { groupDonutSlices, OTHERS_LABEL } from '../../domain/distribution';
import type { Cents, ChartColorKey } from '../../domain/types';

interface DonaChartProps {
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

const OTHERS_ID = 'otras-categorias';

/** El grupo agregado usa su propio token para no coincidir con ninguna categoría (p. ej. "Otros" = stone). */
function colorOf(item: { id: string; colorKey: ChartColorKey }): string {
  return item.id === OTHERS_ID ? 'var(--color-graph-otros)' : colorMap[item.colorKey];
}

export function DonaChart({ data, totalCents }: DonaChartProps) {
  if (totalCents === 0 || data.length === 0) {
    return null;
  }

  // Regla compartida con el PDF del plan (SPEC-06): 6 principales por monto + agregado, sin las de $0.
  const { main: topCategories, othersCents: otherTotal } = groupDonutSlices(data);

  const chartData = [
    ...topCategories,
    ...(otherTotal > 0
      ? [
          {
            id: OTHERS_ID,
            name: OTHERS_LABEL,
            colorKey: 'stone' as ChartColorKey,
            amountCents: otherTotal,
          },
        ]
      : []),
  ];

  // Calcular ángulos para la dona
  const radius = 100;
  const innerRadius = 60;
  const centerX = 120;
  const centerY = 120;

  let currentAngle = -90; // Empezar en la parte superior
  const slices = chartData.map((item) => {
    const percentage = item.amountCents / totalCents;
    const sliceAngle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    const startRadians = (startAngle * Math.PI) / 180;
    const endRadians = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRadians);
    const y1 = centerY + radius * Math.sin(startRadians);
    const x2 = centerX + radius * Math.cos(endRadians);
    const y2 = centerY + radius * Math.sin(endRadians);

    const ix1 = centerX + innerRadius * Math.cos(startRadians);
    const iy1 = centerY + innerRadius * Math.sin(startRadians);
    const ix2 = centerX + innerRadius * Math.cos(endRadians);
    const iy2 = centerY + innerRadius * Math.sin(endRadians);

    const largeArc = sliceAngle > 180 ? 1 : 0;

    const pathData = [
      `M ${ix1} ${iy1}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      'Z',
    ].join(' ');

    currentAngle = endAngle;

    return {
      path: pathData,
      color: colorOf(item),
      label: item.name,
      percentage: Math.round(percentage * 100),
    };
  });

  return (
    <figure className="dona-chart">
      <svg
        viewBox="0 0 240 240"
        role="img"
        aria-label="Distribución del presupuesto"
        style={{ width: '100%', height: 'auto', maxWidth: '300px' }}
      >
        {slices.map((slice, index) => (
          <g key={index}>
            <path d={slice.path} fill={slice.color} stroke="var(--color-bg)" strokeWidth="2" />
          </g>
        ))}
        <text
          x={centerX}
          y={centerY - 10}
          textAnchor="middle"
          className="dona-chart-center-text"
          style={{ fontSize: '12px', fontWeight: 'bold' }}
        >
          {formatMXN(totalCents)}
        </text>
      </svg>
      <figcaption className="dona-chart-legend">
        {chartData.map((item) => (
          <div key={item.id} className="dona-legend-item">
            <span
              className="dona-legend-color"
              style={{ backgroundColor: colorOf(item) }}
              aria-hidden="true"
            ></span>
            <span className="dona-legend-label">{item.name}</span>
            <span className="dona-legend-percentage">
              {Math.round((item.amountCents / totalCents) * 100)}%
            </span>
          </div>
        ))}
        <div
          className="dona-legend-note"
          style={{ fontSize: '12px', marginTop: '0.5rem', color: 'var(--color-ink-600)' }}
        >
          Los porcentajes están redondeados
        </div>
      </figcaption>
    </figure>
  );
}
