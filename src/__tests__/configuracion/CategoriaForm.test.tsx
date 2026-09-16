import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoriaForm } from '../../features/configuracion/CategoriaForm';

describe('CategoriaForm', () => {
  const mockCategories = [
    {
      id: '1',
      name: 'Hogar',
      colorKey: 'slate' as const,
      order: 0,
      archivedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockOnSave = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
    mockOnClose.mockClear();
  });

  it('renders form in create mode', () => {
    render(
      <CategoriaForm
        open={true}
        mode="create"
        monthKey="2026-09"
        allCategories={mockCategories}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Agregar categoría')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ej. Hogar')).toBeInTheDocument();
  });

  it('validates empty name', async () => {
    const user = userEvent.setup();
    render(
      <CategoriaForm
        open={true}
        mode="create"
        monthKey="2026-09"
        allCategories={mockCategories}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    const button = screen.getByRole('button', { name: 'Guardar' });
    await user.click(button);

    expect(screen.getByText('Escribe un nombre de hasta 40 caracteres.')).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('validates duplicate name', async () => {
    const user = userEvent.setup();
    render(
      <CategoriaForm
        open={true}
        mode="create"
        monthKey="2026-09"
        allCategories={mockCategories}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    const input = screen.getByPlaceholderText('Ej. Hogar');
    await user.type(input, 'Hogar');

    const button = screen.getByRole('button', { name: 'Guardar' });
    await user.click(button);

    expect(screen.getByText(/Ya tienes una categoría llamada "Hogar"/)).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('accepts valid name and calls onSave', async () => {
    const user = userEvent.setup();
    render(
      <CategoriaForm
        open={true}
        mode="create"
        monthKey="2026-09"
        allCategories={mockCategories}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    const input = screen.getByPlaceholderText('Ej. Hogar');
    await user.type(input, 'Supermercado');

    const button = screen.getByRole('button', { name: 'Guardar' });
    await user.click(button);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Supermercado',
        })
      );
    });
  });

  it('does not render when open is false', () => {
    render(
      <CategoriaForm
        open={false}
        mode="create"
        monthKey="2026-09"
        allCategories={mockCategories}
        onSave={mockOnSave}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Agregar categoría')).not.toBeInTheDocument();
  });
});
