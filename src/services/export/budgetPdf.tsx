import { Document, Page, Path, StyleSheet, Svg, Text, View, pdf } from '@react-pdf/renderer';
import { formatMXN } from '../../domain/money';
import type { BudgetPdfData, BudgetPdfRow } from './budgetPdfData';

export const PDF_MIME = 'application/pdf';

/**
 * Tokens del tema claro (`src/styles/tokens.css`). El PDF respeta el tema
 * claro aunque el sistema esté en oscuro, así que se fijan aquí.
 */
const ink900 = '#1b2533';
const ink600 = '#4a5668';
const surfaceAlt = '#f2ede4';
const border = '#e3dcd0';
const accent = '#4f7a65';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: ink900,
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: border,
    paddingBottom: 12,
    marginBottom: 20,
  },
  brand: { fontFamily: 'Helvetica-Bold', fontSize: 20, color: accent, letterSpacing: 2 },
  title: { fontSize: 14, marginTop: 4 },
  generated: { fontSize: 9, color: ink600 },
  card: {
    backgroundColor: surfaceAlt,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  cardLabel: { fontSize: 9, color: ink600, marginBottom: 4 },
  cardValue: { fontFamily: 'Helvetica-Bold', fontSize: 22 },
  cardMeta: { fontSize: 9, color: ink600, marginTop: 6 },
  section: { marginBottom: 20 },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 10 },
  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  legend: { flexGrow: 1, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendName: { flexGrow: 1 },
  legendPercent: { color: ink600, width: 32, textAlign: 'right' },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: ink900,
    paddingBottom: 4,
    marginBottom: 2,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: border,
    paddingVertical: 5,
  },
  tableTotal: {
    flexDirection: 'row',
    paddingVertical: 6,
    fontFamily: 'Helvetica-Bold',
    borderTopWidth: 1,
    borderTopColor: ink900,
  },
  colCategory: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  colAmount: { width: 110, textAlign: 'right' },
  colPercent: { width: 70, textAlign: 'right' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  barLabel: { width: 120 },
  barTrack: { flexGrow: 1, height: 10, backgroundColor: surfaceAlt, borderRadius: 5 },
  barFill: { height: 10, borderRadius: 5 },
  barAmount: { width: 80, textAlign: 'right', color: ink600 },
  unbudgeted: { color: ink600, lineHeight: 1.5 },
  footer: {
    position: 'absolute',
    left: 48,
    right: 48,
    bottom: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: ink600,
    borderTopWidth: 0.5,
    borderTopColor: border,
    paddingTop: 6,
  },
});

const DONUT_SIZE = 140;
const DONUT_OUTER = 66;
const DONUT_INNER = 40;

function polar(cx: number, cy: number, radius: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
}

function arcPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  start: number,
  end: number,
): string {
  const [ox1, oy1] = polar(cx, cy, outer, start);
  const [ox2, oy2] = polar(cx, cy, outer, end);
  const [ix1, iy1] = polar(cx, cy, inner, end);
  const [ix2, iy2] = polar(cx, cy, inner, start);
  const large = end - start > 180 ? 1 : 0;
  return [
    `M ${ox1} ${oy1}`,
    `A ${outer} ${outer} 0 ${large} 1 ${ox2} ${oy2}`,
    `L ${ix1} ${iy1}`,
    `A ${inner} ${inner} 0 ${large} 0 ${ix2} ${iy2}`,
    'Z',
  ].join(' ');
}

/** Rebanadas de la dona como trazos vectoriales; una rebanada completa se parte en dos arcos. */
function donutSlices(
  rows: BudgetPdfRow[],
  totalCents: number,
): Array<{ d: string; color: string }> {
  const cx = DONUT_SIZE / 2;
  const cy = DONUT_SIZE / 2;
  let angle = 0;
  const slices: Array<{ d: string; color: string }> = [];

  rows.forEach((row) => {
    const sweep = totalCents === 0 ? 0 : (row.budgetCents / totalCents) * 360;
    if (sweep <= 0) return;
    if (sweep >= 359.999) {
      slices.push({ d: arcPath(cx, cy, DONUT_OUTER, DONUT_INNER, 0, 180), color: row.color });
      slices.push({ d: arcPath(cx, cy, DONUT_OUTER, DONUT_INNER, 180, 360), color: row.color });
    } else {
      slices.push({
        d: arcPath(cx, cy, DONUT_OUTER, DONUT_INNER, angle, angle + sweep),
        color: row.color,
      });
    }
    angle += sweep;
  });

  return slices;
}

function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

export function BudgetPdfDocument({ data }: { data: BudgetPdfData }) {
  const maxBar = data.bars[0]?.budgetCents ?? 0;

  return (
    <Document title={`TRAZIA — Plan de gastos ${data.monthLabel}`} language="es-MX">
      <Page size="LETTER" orientation="portrait" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>TRAZIA</Text>
            <Text style={styles.title}>Plan de gastos · {data.monthLabel}</Text>
          </View>
          <Text style={styles.generated}>Generado el {data.generatedOn}</Text>
        </View>

        <View style={styles.card} wrap={false}>
          <Text style={styles.cardLabel}>Plan mensual total</Text>
          <Text style={styles.cardValue}>{formatMXN(data.totalBudgetCents)}</Text>
          <Text style={styles.cardMeta}>
            {data.categoriesWithBudget === 1
              ? '1 categoría con presupuesto'
              : `${data.categoriesWithBudget} categorías con presupuesto`}
          </Text>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Distribución del plan</Text>
          <View style={styles.donutRow}>
            <Svg width={DONUT_SIZE} height={DONUT_SIZE} viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}>
              {donutSlices(data.donut, data.totalBudgetCents).map((slice, index) => (
                <Path key={index} d={slice.d} fill={slice.color} />
              ))}
            </Svg>
            <View style={styles.legend}>
              {data.donut.map((row) => (
                <View key={row.name} style={styles.legendItem}>
                  <Dot color={row.color} />
                  <Text style={styles.legendName}>{row.name}</Text>
                  <Text style={styles.legendPercent}>{row.sharePercent}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Los títulos van sueltos bajo Page: dentro de su sección serían el primer hijo y
            react-pdf nunca salta de página por el primer hijo, así que `minPresenceAhead`
            no evitaría un título huérfano al pie. */}
        <Text style={styles.sectionTitle} minPresenceAhead={120}>
          Presupuesto por categoría
        </Text>
        <View style={styles.section}>
          <View style={styles.tableHead}>
            <Text style={styles.colCategory}>Categoría</Text>
            <Text style={styles.colAmount}>Presupuesto</Text>
            <Text style={styles.colPercent}>% del plan</Text>
          </View>
          {data.table.map((row) => (
            <View key={row.name} style={styles.tableRow} wrap={false}>
              <View style={styles.colCategory}>
                <Dot color={row.color} />
                <Text>{row.name}</Text>
              </View>
              <Text style={styles.colAmount}>{formatMXN(row.budgetCents)}</Text>
              <Text style={styles.colPercent}>{row.sharePercent}%</Text>
            </View>
          ))}
          <View style={styles.tableTotal} wrap={false}>
            <Text style={styles.colCategory}>Total</Text>
            <Text style={styles.colAmount}>{formatMXN(data.totalBudgetCents)}</Text>
            <Text style={styles.colPercent}>100%</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle} minPresenceAhead={120}>
          De mayor a menor
        </Text>
        <View style={styles.section}>
          {data.bars.map((row) => (
            <View key={row.name} style={styles.barRow} wrap={false}>
              <Text style={styles.barLabel}>{row.name}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: row.color,
                      width: `${maxBar === 0 ? 0 : (row.budgetCents / maxBar) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barAmount}>{formatMXN(row.budgetCents)}</Text>
            </View>
          ))}
        </View>

        {data.unbudgeted.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Sin presupuesto asignado</Text>
            <Text style={styles.unbudgeted}>{data.unbudgeted.join(' · ')}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>Generado en tu dispositivo con TRAZIA</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function buildBudgetPdf(data: BudgetPdfData): Promise<Blob> {
  const blob = await pdf(<BudgetPdfDocument data={data} />).toBlob();
  return blob.type === PDF_MIME ? blob : new Blob([blob], { type: PDF_MIME });
}
