import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { CategoriaRow } from './CategoriaRow';
import type { Category, Cents } from '../../domain/types';

interface CategoriasListaProps {
  categories: Category[];
  budgetsByCategory: Record<string, Cents>;
  totalBudget: Cents;
  onEdit: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

export function CategoriasLista({
  categories,
  budgetsByCategory,
  totalBudget,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
  onAddNew,
}: CategoriasListaProps) {
  if (categories.length === 0) {
    return (
      <EmptyState
        title="Crea tu primera categoría para empezar a organizar tus gastos"
        action={<Button onClick={onAddNew}>Agregar categoría</Button>}
      />
    );
  }

  return (
    <div className="categorias-lista">
      <div className="categorias-header">
        <Button onClick={onAddNew} variant="primary">
          Agregar categoría
        </Button>
      </div>

      <div className="categorias-list-container" role="table" aria-label="Lista de categorías">
        {categories.map((category, index) => {
          const budgetCents = budgetsByCategory[category.id] ?? 0;
          const percentage = totalBudget > 0 ? (budgetCents / totalBudget) * 100 : null;

          return (
            <CategoriaRow
              key={category.id}
              id={category.id}
              name={category.name}
              colorKey={category.colorKey}
              budgetCents={budgetCents}
              percentage={percentage}
              isFirst={index === 0}
              isLast={index === categories.length - 1}
              onEdit={onEdit}
              onMoveUp={onMoveUp}
              onMoveDown={onMoveDown}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </div>
  );
}
