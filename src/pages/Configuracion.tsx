import { useState } from 'react';
import { MonthBudgetSelector } from '../features/configuracion/MonthBudgetSelector';
import { CategoriaForm } from '../features/configuracion/CategoriaForm';
import { CategoriasLista } from '../features/configuracion/CategoriasLista';
import { ArchivadaSection } from '../features/configuracion/ArchivadaSection';
import { TotalesCard } from '../features/configuracion/TotalesCard';
import { DonaChart } from '../features/configuracion/DonaChart';
import { BarrasChart } from '../features/configuracion/BarrasChart';
import { ChartDataTable } from '../features/configuracion/ChartDataTable';
import { PlanPdfSection } from '../features/configuracion/PlanPdfSection';
import { RespaldoSection } from '../features/configuracion/RespaldoSection';
import { BorrarDatosSection } from '../features/configuracion/BorrarDatosSection';
import { RecordatorioRespaldo } from '../features/configuracion/RecordatorioRespaldo';
import { PrivacidadSection, PRIVACIDAD_SECTION_ID } from '../features/configuracion/PrivacidadSection';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { Toast } from '../components/Toast';
import { EmptyState } from '../components/EmptyState';
import { today, monthKeyOf } from '../domain/dates';
import { isSameCategoryName } from '../domain/categories';
import { resolveBudget } from '../domain/budget';
import { useLiveQuery } from '../data/hooks/useLiveQuery';
import {
  listCategories,
  upsertCategory,
  removeCategory,
  CategoryInUseError,
} from '../data/repositories/categories';
import {
  setBudgetForMonth,
  listBudgets,
} from '../data/repositories/budgets';
import type { Category, ChartColorKey, MonthKey } from '../domain/types';

export function Configuracion() {
  const [selectedMonth, setSelectedMonth] = useState<MonthKey>(monthKeyOf(today()));
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [showTable, setShowTable] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const categoriesQuery = useLiveQuery(() => listCategories());
  const budgetsQuery = useLiveQuery(() => listBudgets());

  const activeCategories = (categoriesQuery.data ?? []).filter((cat) => !cat.archivedAt);
  const archivedCategories = (categoriesQuery.data ?? []).filter((cat) => cat.archivedAt);

  // Calcular presupuestos por categoría para el mes seleccionado
  const budgetsByCategory: Record<string, number> = {};
  const allBudgets = budgetsQuery.data ?? [];

  activeCategories.forEach((cat) => {
    const budgetCents = resolveBudget(allBudgets, cat.id, selectedMonth);
    budgetsByCategory[cat.id] = budgetCents;
  });

  const totalBudgetCents = Object.values(budgetsByCategory).reduce((sum, val) => sum + val, 0);
  const categoriesWithBudget = Object.values(budgetsByCategory).filter((b) => b > 0).length;

  const hasNoBudgets = totalBudgetCents === 0;

  const chartData = activeCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    colorKey: cat.colorKey,
    amountCents: budgetsByCategory[cat.id] ?? 0,
  }));

  const handleAddCategory = () => {
    setFormMode('create');
    setEditingCategory(undefined);
    setFormError('');
    setFormOpen(true);
  };

  const handleEditCategory = (id: string) => {
    const category = activeCategories.find((c) => c.id === id);
    if (category) {
      setFormMode('edit');
      setEditingCategory(category);
      setFormError('');
      setFormOpen(true);
    }
  };

  const handleDeleteCategory = (id: string) => {
    setDeletingCategoryId(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingCategoryId) return;

    try {
      await removeCategory(deletingCategoryId);
      showToast('Categoría eliminada');
      setDeleteDialogOpen(false);
      setDeletingCategoryId(null);
    } catch (err) {
      if (err instanceof CategoryInUseError) {
        const category = activeCategories.find((c) => c.id === deletingCategoryId);
        if (category) {
          // Ofrecer archivar
          await handleArchiveCategory(deletingCategoryId);
        }
        setDeleteDialogOpen(false);
      } else {
        showToast('No se pudo eliminar la categoría. Tus datos anteriores están intactos.');
        setDeleteDialogOpen(false);
      }
    }
  };


  const handleArchiveCategory = async (id: string) => {
    const category = activeCategories.find((c) => c.id === id);
    if (!category) return;

    try {
      const now = new Date().toISOString();
      await upsertCategory({
        id: category.id,
        name: category.name,
        colorKey: category.colorKey,
        order: category.order,
        archivedAt: now,
      });
      showToast('Categoría archivada');
    } catch {
      showToast('No se pudo archivar la categoría. Tus datos anteriores están intactos.');
    }
  };

  const handleMoveUp = async (id: string) => {
    const index = activeCategories.findIndex((c) => c.id === id);
    if (index <= 0) return;

    const currentCat = activeCategories[index];
    const prevCat = activeCategories[index - 1];

    if (!currentCat || !prevCat) return;

    try {
      await upsertCategory({
        id: currentCat.id,
        name: currentCat.name,
        colorKey: currentCat.colorKey,
        order: prevCat.order,
        archivedAt: currentCat.archivedAt,
      });

      await upsertCategory({
        id: prevCat.id,
        name: prevCat.name,
        colorKey: prevCat.colorKey,
        order: currentCat.order,
        archivedAt: prevCat.archivedAt,
      });

      showToast('Orden actualizado');
    } catch {
      showToast('No se pudo actualizar el orden. Tus datos anteriores están intactos.');
    }
  };

  const handleMoveDown = async (id: string) => {
    const index = activeCategories.findIndex((c) => c.id === id);
    if (index >= activeCategories.length - 1) return;

    const currentCat = activeCategories[index];
    const nextCat = activeCategories[index + 1];

    if (!currentCat || !nextCat) return;

    try {
      await upsertCategory({
        id: currentCat.id,
        name: currentCat.name,
        colorKey: currentCat.colorKey,
        order: nextCat.order,
        archivedAt: currentCat.archivedAt,
      });

      await upsertCategory({
        id: nextCat.id,
        name: nextCat.name,
        colorKey: nextCat.colorKey,
        order: currentCat.order,
        archivedAt: nextCat.archivedAt,
      });

      showToast('Orden actualizado');
    } catch {
      showToast('No se pudo actualizar el orden. Tus datos anteriores están intactos.');
    }
  };

  const handleRestoreCategory = async (id: string, name: string, colorKey: ChartColorKey) => {
    try {
      await upsertCategory({
        id,
        name,
        colorKey,
        order: Math.max(...activeCategories.map((c) => c.order), -1) + 1,
        archivedAt: null,
      });
      showToast('Categoría restaurada');
    } catch {
      showToast('No se pudo restaurar la categoría. Tus datos anteriores están intactos.');
    }
  };

  const handleSaveCategory = async (data: { name: string; colorKey: ChartColorKey; id?: string; budgetCents?: number }) => {
    try {
      setFormError('');

      // Validar nombre duplicado
      const isDuplicate = (categoriesQuery.data ?? []).some(
        (cat) => cat.id !== data.id && isSameCategoryName(cat.name, data.name),
      );

      if (isDuplicate) {
        const archivedDuplicate = archivedCategories.find((cat) => isSameCategoryName(cat.name, data.name));
        if (archivedDuplicate) {
          setFormError(`Ya tienes una categoría llamada "${data.name}", está archivada. ¿Quieres restaurarla?`);
          // Ofrecer restaurar
          if (window.confirm(`Ya tienes una categoría llamada "${data.name}", está archivada. ¿Quieres restaurarla?`)) {
            await handleRestoreCategory(archivedDuplicate.id, archivedDuplicate.name, archivedDuplicate.colorKey);
            setFormOpen(false);
          }
          return;
        }
        setFormError(`Ya tienes una categoría llamada "${data.name}".`);
        return;
      }

      const category = await upsertCategory({
        id: data.id,
        name: data.name,
        colorKey: data.colorKey,
        order: data.id ? (activeCategories.find((c) => c.id === data.id)?.order ?? 0) : Math.max(...activeCategories.map((c) => c.order), -1) + 1,
        archivedAt: null,
      });

      // Guardar presupuesto si se proporcionó
      if (data.budgetCents !== undefined) {
        await setBudgetForMonth({
          categoryId: category.id,
          effectiveFrom: selectedMonth,
          amountCents: data.budgetCents,
        });
      }

      showToast('Categoría guardada');
      setFormOpen(false);
    } catch {
      showToast('No se pudo guardar la categoría. Tus datos anteriores están intactos.');
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 3000);
  };

  if (categoriesQuery.loading || budgetsQuery.loading) {
    return <div className="page-shell"><p>Cargando...</p></div>;
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <h1>Configuración</h1>
        <MonthBudgetSelector value={selectedMonth} onChange={setSelectedMonth} />
      </header>

      <div className="stack">
        {/* Recordatorio de respaldo (SPEC-07, punto 4): sólo cuando toca */}
        <RecordatorioRespaldo />

        {/* Totales */}
        {activeCategories.length > 0 && <TotalesCard totalBudgetCents={totalBudgetCents} categoriesWithBudgetCount={categoriesWithBudget} />}

        {/* Categorías */}
        <section className="card" style={{ padding: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Categorías y presupuestos</h2>
          <CategoriasLista
            categories={activeCategories}
            budgetsByCategory={budgetsByCategory}
            totalBudget={totalBudgetCents}
            onEdit={handleEditCategory}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onDelete={handleDeleteCategory}
            onAddNew={handleAddCategory}
          />
        </section>

        {/* Gráficas */}
        {hasNoBudgets ? (
          <EmptyState title="Asigna un monto a tus categorías para ver cómo se distribuye tu plan" />
        ) : (
          <>
            <section className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <h2>Distribución</h2>
                <Button variant="secondary" onClick={() => setShowTable(!showTable)}>
                  {showTable ? 'Ver gráfica' : 'Ver como tabla'}
                </Button>
              </div>

              {showTable ? <ChartDataTable data={chartData} totalCents={totalBudgetCents} /> : <DonaChart data={chartData} totalCents={totalBudgetCents} />}
            </section>

            <section className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ marginBottom: '1rem' }}>Análisis</h2>
              <BarrasChart data={chartData} totalCents={totalBudgetCents} />
            </section>
          </>
        )}

        {/* Plan en PDF */}
        <PlanPdfSection categories={activeCategories} versions={allBudgets} />

        {/* Archivadas */}
        {archivedCategories.length > 0 && (
          <section className="card" style={{ padding: '1.5rem' }}>
            <ArchivadaSection archivedCategories={archivedCategories} onRestore={handleRestoreCategory} />
          </section>
        )}

        {/* Datos y respaldo (SPEC-07) */}
        <RespaldoSection />

        {/* Borrar todos los datos (SPEC-07) */}
        <BorrarDatosSection />

        {/* Privacidad (SPEC-07) */}
        <PrivacidadSection />

        {/* Acerca de (SPEC-02): versión y enlace a Privacidad */}
        <section className="card" style={{ padding: '1.5rem' }} aria-labelledby="acerca-title">
          <h2 id="acerca-title" style={{ marginBottom: '0.5rem' }}>
            Acerca de
          </h2>
          <p style={{ margin: 0 }}>TRAZIA, versión {__APP_VERSION__}.</p>
          <p className="muted" style={{ marginBottom: 0 }}>
            <a href={`#${PRIVACIDAD_SECTION_ID}`}>Cómo se protegen tus datos (Privacidad)</a>
          </p>
        </section>
      </div>

      {/* Formulario */}
      <CategoriaForm
        open={formOpen}
        mode={formMode}
        monthKey={selectedMonth}
        existingCategory={editingCategory}
        allCategories={categoriesQuery.data ?? []}
        onSave={handleSaveCategory}
        onClose={() => setFormOpen(false)}
        error={formError}
      />

      {/* Diálogo de eliminación */}
      <Dialog open={deleteDialogOpen} title="Confirmar eliminación" onClose={() => setDeleteDialogOpen(false)}>
        <div className="dialog-body stack">
          <p>¿Quieres eliminar esta categoría? Si tiene movimientos o presupuestos, la operación fallará.</p>
          <div className="dialog-footer row" style={{ justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="secondary" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmDelete}>Eliminar</Button>
          </div>
        </div>
      </Dialog>

      {/* Toast */}
      <Toast message={toastMessage} open={toastOpen} onClose={() => setToastOpen(false)} />
    </div>
  );
}
