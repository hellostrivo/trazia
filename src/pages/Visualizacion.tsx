import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listBudgets } from '../data/repositories/budgets';
import { listCategories } from '../data/repositories/categories';
import { listTransactionsByMonth } from '../data/repositories/transactions';
import { buildMonthSummary } from '../domain/summary';
import { addMonths, formatMonthLabel, monthKeyOf, today } from '../domain/dates';
import { useLiveQuery } from '../data/hooks/useLiveQuery';
import { Button } from '../components/Button';
import { MonthSwitcher } from '../components/MonthSwitcher';
import { EmptyState } from '../components/EmptyState';
import { TarjetaPrincipal } from '../features/visualizacion/TarjetaPrincipal';
import { DonaGasto } from '../features/visualizacion/DonaGasto';
import { BarrasPlanVsGasto } from '../features/visualizacion/BarrasPlanVsGasto';
import { TablaDetalle } from '../features/visualizacion/TablaDetalle';
import type { MonthKey } from '../domain/types';

function getMonthFromQuery(search: string, fallback: MonthKey): MonthKey {
  const params = new URLSearchParams(search);
  const month = params.get('mes');
  if (/^\d{4}-\d{2}$/.test(month ?? '')) {
    return month as MonthKey;
  }
  return fallback;
}

export default function Visualizacion() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentMonth = monthKeyOf(today());
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(getMonthFromQuery(location.search, currentMonth));

  useEffect(() => {
    const next = getMonthFromQuery(location.search, currentMonth);
    setSelectedMonth(next);
  }, [location.search, currentMonth]);

  const categoriesQuery = useLiveQuery(() => listCategories());
  const budgetsQuery = useLiveQuery(() => listBudgets());
  const transactionsQuery = useLiveQuery(() => listTransactionsByMonth(selectedMonth), [selectedMonth]);

  const changeMonth = (direction: 'prev' | 'next') => {
    const nextKey = addMonths(selectedMonth, direction === 'prev' ? -1 : 1);
    if (direction === 'next' && nextKey > currentMonth) return;
    // El estado es la fuente de verdad y el efecto de abajo sincroniza la URL.
    // Navegar aquí hacía que ambos efectos se pelearan y el mes oscilara.
    setSelectedMonth(nextKey);
  };

  const summary = useMemo(() => {
    if (!categoriesQuery.data || !budgetsQuery.data || !transactionsQuery.data) {
      return null;
    }
    return buildMonthSummary({
      categories: categoriesQuery.data,
      versions: budgetsQuery.data,
      transactions: transactionsQuery.data,
      monthKey: selectedMonth,
    });
  }, [categoriesQuery.data, budgetsQuery.data, transactionsQuery.data, selectedMonth]);

  useEffect(() => {
    const next = `${location.pathname}?mes=${selectedMonth}`;
    if (location.search !== `?mes=${selectedMonth}`) {
      navigate(next, { replace: true });
    }
  }, [selectedMonth, location.pathname, location.search, navigate]);

  const [order, setOrder] = useState<'mayor-gasto' | 'configurado'>('mayor-gasto');

  if (categoriesQuery.loading || budgetsQuery.loading || transactionsQuery.loading || !summary) {
    return <div className="page-shell"><p>Cargando visualización...</p></div>;
  }

  if (summary.rows.length === 0 && summary.totalSpentCents === 0) {
    return (
      <div className="page-shell">
        <header className="page-header">
          <h1>Visualización</h1>
          <MonthSwitcher
            label="Seleccionar mes"
            value={formatMonthLabel(selectedMonth)}
            onChange={changeMonth}
            disableNext={selectedMonth >= currentMonth}
          />
        </header>
        <EmptyState
          title={`Aún no hay movimientos en ${selectedMonth}`}
          description="Registra un gasto para empezar a seguir el mes."
          action={<Button onClick={() => navigate('/')}>Registrar un gasto</Button>}
        />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>Visualización</h1>
        <MonthSwitcher
          label="Seleccionar mes"
          value={formatMonthLabel(selectedMonth)}
          onChange={changeMonth}
          disableNext={selectedMonth >= currentMonth}
        />
      </header>

      <div className="stack" style={{ maxWidth: '72rem' }}>
        <TarjetaPrincipal summary={summary} monthKey={selectedMonth} />

        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <section className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ margin: '0 0 1rem' }}>Distribución del gasto</h2>
            <DonaGasto rows={summary.rows} />
          </section>

          <section className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ margin: '0 0 1rem' }}>Plan vs gasto</h2>
            <BarrasPlanVsGasto rows={summary.rows} />
          </section>
        </div>

        <section className="card" style={{ padding: '1.25rem' }}>
          <TablaDetalle summary={summary} monthKey={selectedMonth} order={order} onOrderChange={setOrder} />
        </section>
      </div>
    </div>
  );
}
