import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { MonthSwitcher } from '../components/MonthSwitcher';
import { Toast } from '../components/Toast';
import { useLiveQuery } from '../data/hooks/useLiveQuery';
import { listCategories } from '../data/repositories/categories';
import {
  deleteTransaction,
  listTransactionsByMonth,
  restoreTransaction,
  upsertTransaction,
} from '../data/repositories/transactions';
import { addMonths, formatMonthLabel, monthKeyOf, today } from '../domain/dates';
import { sumCents } from '../domain/money';
import { BusquedaConcepto, matchesConcept } from '../features/movimientos/BusquedaConcepto';
import { EditarDialog, type MovimientoValues } from '../features/movimientos/EditarDialog';
import { FiltroCategoria } from '../features/movimientos/FiltroCategoria';
import { GrupoDia } from '../features/movimientos/GrupoDia';
import { movimientoFilaId } from '../features/movimientos/MovimientoFila';
import { PieTotales } from '../features/movimientos/PieTotales';
import type { Category, LocalDate, MonthKey, Transaction } from '../domain/types';

/** Bloque de filas que se renderiza de una vez (criterio 3 de SPEC-05). */
export const PAGE_SIZE = 200;

interface ToastState {
  open: boolean;
  message: string;
  undo: Transaction | null;
}

const emptyToast: ToastState = { open: false, message: '', undo: null };

function getMonthFromQuery(search: string, fallback: MonthKey): MonthKey {
  const month = new URLSearchParams(search).get('mes');
  return /^\d{4}-\d{2}$/.test(month ?? '') ? (month as MonthKey) : fallback;
}

function getCategoryFromQuery(search: string): string | null {
  const categoria = new URLSearchParams(search).get('categoria');
  return categoria && categoria.length > 0 ? categoria : null;
}

export function groupByDay(
  transactions: Transaction[],
): Array<{ date: LocalDate; items: Transaction[] }> {
  const groups: Array<{ date: LocalDate; items: Transaction[] }> = [];
  for (const transaction of transactions) {
    const last = groups[groups.length - 1];
    if (last && last.date === transaction.date) {
      last.items.push(transaction);
    } else {
      groups.push({ date: transaction.date, items: [transaction] });
    }
  }
  return groups;
}

export default function Movimientos() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentMonth = monthKeyOf(today());

  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(() =>
    getMonthFromQuery(location.search, currentMonth),
  );
  const [categoryFilter, setCategoryFilter] = useState<string | null>(() =>
    getCategoryFromQuery(location.search),
  );
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [toast, setToast] = useState<ToastState>(emptyToast);

  const openerIdRef = useRef<string | null>(null);

  useEffect(() => {
    setSelectedMonth(getMonthFromQuery(location.search, currentMonth));
    setCategoryFilter(getCategoryFromQuery(location.search));
  }, [location.search, currentMonth]);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('mes', selectedMonth);
    if (categoryFilter) params.set('categoria', categoryFilter);
    const next = `?${params.toString()}`;
    if (location.search !== next) {
      navigate(`${location.pathname}${next}`, { replace: true });
    }
  }, [selectedMonth, categoryFilter, location.pathname, location.search, navigate]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedMonth, categoryFilter, search]);

  const categoriesQuery = useLiveQuery(() => listCategories());
  // SPEC-01: `listByMonth` resuelve el rango con `where('date').between(...)`.
  const transactionsQuery = useLiveQuery(
    () => listTransactionsByMonth(selectedMonth),
    [selectedMonth],
  );

  const categories: Category[] = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const monthTransactions = useMemo(() => transactionsQuery.data ?? [], [transactionsQuery.data]);

  const categoryIdsWithMovements = useMemo(
    () => Array.from(new Set(monthTransactions.map((item) => item.categoryId))),
    [monthTransactions],
  );

  const filtered = useMemo(() => {
    const rows = monthTransactions.filter(
      (item) =>
        (!categoryFilter || item.categoryId === categoryFilter) &&
        matchesConcept(item.concept, search),
    );
    return rows.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
      return a.id < b.id ? 1 : -1;
    });
  }, [monthTransactions, categoryFilter, search]);

  const totalCents = useMemo(() => sumCents(filtered.map((item) => item.amountCents)), [filtered]);
  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const groups = useMemo(() => groupByDay(visible), [visible]);
  const remaining = filtered.length - visible.length;

  const restoreFocus = useCallback((fallbackToSearch = false) => {
    const openerId = openerIdRef.current;
    openerIdRef.current = null;
    const opener = openerId ? document.getElementById(openerId) : null;
    if (opener && !fallbackToSearch) {
      opener.focus();
      return;
    }
    document.getElementById('movimientos-busqueda')?.focus();
  }, []);

  const handleSelect = useCallback((transaction: Transaction) => {
    openerIdRef.current = movimientoFilaId(transaction.id);
    setEditing(transaction);
  }, []);

  const handleClose = useCallback(() => {
    setEditing(null);
    restoreFocus();
  }, [restoreFocus]);

  const handleSave = useCallback(
    async (values: MovimientoValues) => {
      if (!editing) return;
      try {
        await upsertTransaction({ id: editing.id, ...values });
        const nextMonth = monthKeyOf(values.date);
        const message =
          nextMonth === selectedMonth
            ? 'Movimiento actualizado'
            : `Movido a ${formatMonthLabel(nextMonth)}`;
        setToast({ open: true, message, undo: null });
        setEditing(null);
        restoreFocus(nextMonth !== selectedMonth);
      } catch (error) {
        console.error('No se pudo guardar el movimiento', error);
        setToast({
          open: true,
          message: 'No se pudo guardar el cambio. Intenta de nuevo.',
          undo: null,
        });
      }
    },
    [editing, restoreFocus, selectedMonth],
  );

  const handleDelete = useCallback(
    async (transaction: Transaction) => {
      try {
        await deleteTransaction(transaction.id);
        setToast({ open: true, message: 'Gasto eliminado', undo: transaction });
        setEditing(null);
        restoreFocus(true);
      } catch (error) {
        console.error('No se pudo eliminar el movimiento', error);
        setToast({
          open: true,
          message: 'No se pudo eliminar el gasto. Intenta de nuevo.',
          undo: null,
        });
      }
    },
    [restoreFocus],
  );

  const handleUndo = useCallback(async () => {
    const record = toast.undo;
    if (!record) return;
    try {
      await restoreTransaction(record);
      setToast({ open: true, message: 'Movimiento restaurado', undo: null });
    } catch (error) {
      console.error('No se pudo restaurar el movimiento', error);
      setToast({
        open: true,
        message: 'No se pudo restaurar el gasto. Intenta de nuevo.',
        undo: null,
      });
    }
  }, [toast.undo]);

  const clearFilters = useCallback(() => {
    setCategoryFilter(null);
    setSearch('');
  }, []);

  const changeMonth = (direction: 'prev' | 'next') => {
    const nextKey = addMonths(selectedMonth, direction === 'prev' ? -1 : 1);
    if (direction === 'next' && nextKey > currentMonth) return;
    setSelectedMonth(nextKey);
  };

  const monthLabel = formatMonthLabel(selectedMonth);
  const loading = categoriesQuery.loading || transactionsQuery.loading;
  const hasFilters = Boolean(categoryFilter) || search.trim().length > 0;

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>Movimientos</h1>
        <MonthSwitcher
          label="Seleccionar mes"
          value={monthLabel}
          onChange={changeMonth}
          disableNext={selectedMonth >= currentMonth}
        />
      </header>

      <div className="stack" style={{ maxWidth: 'var(--content-width)' }}>
        <section className="card" style={{ padding: 'var(--space-5)' }}>
          <div
            style={{
              display: 'grid',
              gap: 'var(--space-4)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
            }}
          >
            <FiltroCategoria
              categories={categories}
              categoryIdsWithMovements={categoryIdsWithMovements}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />
            <BusquedaConcepto value={search} onChange={setSearch} />
          </div>
        </section>

        <section
          className="card"
          style={{ padding: 'var(--space-5)' }}
          aria-label="Lista de movimientos"
        >
          {loading ? (
            <p className="muted" style={{ margin: 0 }}>
              Cargando movimientos...
            </p>
          ) : monthTransactions.length === 0 ? (
            <EmptyState
              title={`Aún no hay movimientos en ${monthLabel}`}
              description="Registra un gasto para empezar a seguir el mes."
              action={
                <Link className="button button--primary" to="/">
                  Ir a Captura
                </Link>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No encontramos movimientos con esos filtros"
              action={<Button onClick={clearFilters}>Limpiar filtros</Button>}
            />
          ) : (
            <div className="stack">
              {groups.map((group) => (
                <GrupoDia
                  key={group.date}
                  date={group.date}
                  transactions={group.items}
                  categoriesById={categoriesById}
                  onSelect={handleSelect}
                />
              ))}

              {remaining > 0 ? (
                <div className="row" style={{ justifyContent: 'center' }}>
                  <Button
                    variant="secondary"
                    onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  >
                    {`Mostrar más (${remaining} restantes)`}
                  </Button>
                </div>
              ) : null}

              <PieTotales count={filtered.length} totalCents={totalCents} />

              {hasFilters ? (
                <div className="row" style={{ justifyContent: 'flex-start' }}>
                  <Button variant="ghost" onClick={clearFilters}>
                    Limpiar filtros
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>

      <EditarDialog
        open={editing !== null}
        transaction={editing}
        categories={categories}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={handleClose}
      />

      <Toast
        message={toast.message}
        open={toast.open}
        onClose={() => setToast(emptyToast)}
        {...(toast.undo ? { action: { label: 'Deshacer', onAction: handleUndo } } : {})}
      />
    </div>
  );
}
