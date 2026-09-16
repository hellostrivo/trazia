import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoriaRow } from '../../features/configuracion/CategoriaRow';

describe('CategoriaRow', () => {
  const mockHandlers = {
    onEdit: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    onDelete: vi.fn(),
  };

  it('renders category name and budget', () => {
    render(
      <CategoriaRow
        id="1"
        name="Hogar"
        colorKey="slate"
        budgetCents={150000}
        percentage={50}
        isFirst={false}
        isLast={false}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Hogar')).toBeInTheDocument();
    expect(screen.getByText(/\$1,500.00/)).toBeInTheDocument();
  });

  it('disables up button when first', () => {
    render(
      <CategoriaRow
        id="1"
        name="Hogar"
        colorKey="slate"
        budgetCents={150000}
        percentage={50}
        isFirst={true}
        isLast={false}
        {...mockHandlers}
      />
    );

    const upButton = screen.getByLabelText(/Subir Hogar/);
    expect(upButton).toBeDisabled();
  });

  it('disables down button when last', () => {
    render(
      <CategoriaRow
        id="1"
        name="Hogar"
        colorKey="slate"
        budgetCents={150000}
        percentage={50}
        isFirst={false}
        isLast={true}
        {...mockHandlers}
      />
    );

    const downButton = screen.getByLabelText(/Bajar Hogar/);
    expect(downButton).toBeDisabled();
  });

  it('calls handlers on button click', async () => {
    const user = userEvent.setup();
    render(
      <CategoriaRow
        id="1"
        name="Hogar"
        colorKey="slate"
        budgetCents={150000}
        percentage={50}
        isFirst={false}
        isLast={false}
        {...mockHandlers}
      />
    );

    await user.click(screen.getByLabelText(/Editar Hogar/));
    expect(mockHandlers.onEdit).toHaveBeenCalledWith('1');

    await user.click(screen.getByLabelText(/Subir Hogar/));
    expect(mockHandlers.onMoveUp).toHaveBeenCalledWith('1');

    await user.click(screen.getByLabelText(/Bajar Hogar/));
    expect(mockHandlers.onMoveDown).toHaveBeenCalledWith('1');

    await user.click(screen.getByLabelText(/Eliminar Hogar/));
    expect(mockHandlers.onDelete).toHaveBeenCalledWith('1');
  });
});
