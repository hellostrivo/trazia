import { formatMXN } from '../../domain/money';
import type { Cents, ChartColorKey } from '../../domain/types';

interface ChartDataTableProps {
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

export function ChartDataTable({ data, totalCents }: ChartDataTableProps) {
  if (totalCents === 0 || data.length === 0) {
    return null;
  }

  const sortedData = [...data].sort((a, b) => b.amountCents - a.amountCents);

  return (
    // Con nombres largos la tabla supera los 240px de la tarjeta a 320px; el
    // scroll vive aquí para que no empuje la página (criterio 3 de SPEC-00).
    <div className="chart-data-table-wrap">
      <table className="chart-data-table">
        <caption>Distribución del presupuesto</caption>
        <thead>
          <tr>
            <th scope="col">Categoría</th>
            <th scope="col" style={{ textAlign: 'right' }}>
              Monto
            </th>
            <th scope="col" style={{ textAlign: 'right' }}>
              Porcentaje
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item) => {
            const percentage = Math.round((item.amountCents / totalCents) * 100);
            return (
              <tr key={item.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '12px',
                        height: '12px',
                        backgroundColor: colorMap[item.colorKey],
                        borderRadius: '2px',
                      }}
                      aria-hidden="true"
                    ></span>
                    {item.name}
                  </div>
                </td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {formatMXN(item.amountCents)}
                </td>
                <td style={{ textAlign: 'right' }}>{percentage}%</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td
              style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
            >
              {formatMXN(totalCents)}
            </td>
            <td style={{ textAlign: 'right', fontWeight: 'bold' }}>100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
